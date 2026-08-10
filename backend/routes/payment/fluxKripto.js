const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");

const User = require("../../database/models/User");
const SiteSettings = require("../../database/models/SiteSettings");
const FluxKriptoTransaction = require("../../database/models/FluxKriptoTransaction");
const { authorizeUser } = require("../../middleware/auth");
const {
	emitUserBalance,
	getActiveWallet,
	getActiveWalletIndex,
	updateUserBalance,
} = require("../../utils/wallet");
const {
	createFluxHeaders,
	formatTryAmount,
	generateFluxDepositHash,
	generateFluxTransactionId,
	getFluxCredentialFingerprint,
	getFluxUpstreamErrorDetails,
	isDefinitiveFluxDepositFailure,
	isSupportedFluxCurrency,
	isValidTronAddress,
	mergeFluxSettings,
	normalizeCallbackStatus,
	normalizeFluxCurrency,
	normalizeFluxNativeDepositData,
	normalizeFluxProviderTryAmount,
	verifyFluxCallbackHash,
} = require("../../utils/fluxKripto");
const { createAdminNotification } = require("../../utils/adminNotification");
const { assertWithdrawalNotBlocked } = require("../../utils/bonusLock");

const router = express.Router();

const FINAL_TRANSACTION_STATUSES = new Set([
	"approved",
	"rejected",
	"cancelled",
	"failed",
]);
const FINAL_TRANSACTION_STATUS_LIST = [...FINAL_TRANSACTION_STATUSES];

class RouteError extends Error {
	constructor(message, statusCode = 400, details = {}) {
		super(message);
		this.statusCode = statusCode;
		Object.assign(this, details);
	}
}

const getSettingsDocument = async () => {
	let siteSettings = await SiteSettings.findOne();
	if (!siteSettings) {
		siteSettings = new SiteSettings();
		await siteSettings.save();
	}
	return siteSettings;
};

const getFluxSettings = async ({
	requireActive = false,
	requireCredentials = false,
	method = null,
} = {}) => {
	const siteSettings = await getSettingsDocument();
	const storedSettings = siteSettings.fluxKripto?.toObject
		? siteSettings.fluxKripto.toObject()
		: siteSettings.fluxKripto || {};
	const settings = mergeFluxSettings(storedSettings);

	if (requireActive && !settings.isActive) {
		throw new RouteError("FluxKripto şu anda aktif değil.", 503);
	}

	if (method && settings.methods?.[method] !== true) {
		throw new RouteError(`FluxKripto ${method} işlemleri aktif değil.`, 503);
	}

	if (
		requireCredentials &&
		(!String(settings.apiKey || "").trim() ||
			!String(settings.secretKey || "").trim())
	) {
		throw new RouteError("FluxKripto API bilgileri yapılandırılmamış.", 503);
	}

	if (method === "deposit" && !String(settings.siteUrl || "").trim()) {
		throw new RouteError("FluxKripto site URL bilgisi yapılandırılmamış.", 503);
	}

	return settings;
};

const createClient = (settings) =>
	axios.create({
		baseURL: String(settings.apiUrl || "").replace(/\/+$/, ""),
		headers: createFluxHeaders(settings.apiKey),
		timeout: 30000,
	});

const parseTryAmount = (value) => {
	if (value === null || value === undefined || value === "") {
		throw new RouteError("Geçersiz tutar.");
	}

	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new RouteError("Geçersiz tutar.");
	}

	const rounded = Number(formatTryAmount(parsed));
	if (Math.abs(parsed - rounded) > 1e-9) {
		throw new RouteError("Tutar en fazla iki ondalık basamak içerebilir.");
	}

	return rounded;
};

const validateAmountLimits = (amount, settings, type) => {
	const action = type === "withdraw" ? "çekim" : "yatırım";
	if (amount < Number(settings.minAmount)) {
		throw new RouteError(
			`Minimum ${action} tutarı: ${settings.minAmount} TRY`,
		);
	}
	if (amount > Number(settings.maxAmount)) {
		throw new RouteError(
			`Maksimum ${action} tutarı: ${settings.maxAmount} TRY`,
		);
	}
};

const validateCurrency = (value, settings) => {
	const currency = normalizeFluxCurrency(value);
	if (!isSupportedFluxCurrency(currency)) {
		throw new RouteError("Para birimi TRX veya USDT olmalıdır.");
	}

	if (settings.currencies?.[currency.toLowerCase()] !== true) {
		throw new RouteError(`${currency} işlemleri aktif değil.`, 503);
	}

	return currency;
};

const getCustomerIdentity = (user) => {
	const providerUserId = String(user.numericId ?? user._id);
	const username = String(
		user.username || user.local?.email || `user_${providerUserId}`,
	).trim();
	const fullname = String(user.name || username).trim();
	return { providerUserId, username, fullname };
};

const getUrlHost = (value) => {
	try {
		return new URL(String(value || "")).host;
	} catch {
		return "";
	}
};

const redactDiagnosticText = (value, sensitiveValues = []) =>
	sensitiveValues.reduce((text, sensitiveValue) => {
		const normalized = String(sensitiveValue || "");
		return normalized ? text.split(normalized).join("[REDACTED]") : text;
	}, String(value || ""));

const serializeTransaction = (transaction) => ({
	transactionId: transaction._id,
	externalTransactionId: transaction.externalTransactionId,
	orderId: transaction.orderId || null,
	financeId: transaction.financeId || null,
	type: transaction.type,
	status: transaction.status,
	amount: transaction.amount,
	amountTRY: transaction.amount,
	requestedAmount: transaction.requestedAmount ?? transaction.amount,
	providerAmount: transaction.providerAmount ?? null,
	currency: transaction.currency,
	cryptoAmount: transaction.cryptoAmount || null,
	rate: transaction.rate || null,
	walletAddress: transaction.walletAddress || null,
	receiverWallet: transaction.receiverWallet || null,
	expiresAt: transaction.expiresAt || null,
	createdAt: transaction.createdAt,
	updatedAt: transaction.updatedAt,
});

router.get("/methods", async (req, res) => {
	try {
		const settings = await getFluxSettings();
		const credentialsConfigured = Boolean(
			String(settings.apiKey || "").trim() &&
				String(settings.secretKey || "").trim(),
		);
		const available = Boolean(
			settings.isActive &&
				credentialsConfigured &&
				((settings.methods.deposit && String(settings.siteUrl || "").trim()) ||
					settings.methods.withdraw),
		);

		res.json({
			success: true,
			data: {
				available,
				name: settings.name,
				logo: settings.logo,
				minAmount: settings.minAmount,
				maxAmount: settings.maxAmount,
				currency: "TRY",
				methods: {
					deposit: settings.methods.deposit === true,
					withdraw: settings.methods.withdraw === true,
				},
				currencies: {
					trx: settings.currencies.trx === true,
					usdt: settings.currencies.usdt === true,
				},
			},
		});
	} catch (error) {
		console.error("FluxKripto methods hatası:", error.message);
		res.status(500).json({
			success: false,
			error: "FluxKripto ödeme bilgileri alınamadı.",
		});
	}
});

router.post("/deposit", authorizeUser(true), async (req, res) => {
	let transaction = null;

	try {
		const settings = await getFluxSettings({
			requireActive: true,
			requireCredentials: true,
			method: "deposit",
		});
		const amount = parseTryAmount(req.body.amount);
		validateAmountLimits(amount, settings, "deposit");
		const currency = validateCurrency(req.body.currency, settings);

		const user = await User.findById(req.user._id);
		if (!user) throw new RouteError("Kullanıcı bulunamadı.", 404);

		const { providerUserId, username, fullname } = getCustomerIdentity(user);
		const externalTransactionId = generateFluxTransactionId(
			user._id.toString(),
			"deposit",
		);
		const activeWallet = getActiveWallet(user);
		const oldBalance = Number(activeWallet?.balance || 0);

		transaction = await FluxKriptoTransaction.create({
			user: user._id,
			externalTransactionId,
			providerUserId,
			type: "deposit",
			amount,
			requestedAmount: amount,
			providerAmount: null,
			currency,
			status: "pending",
			oldBalance,
			newBalance: oldBalance,
			metadata: { username, fullname, siteUrl: settings.siteUrl },
		});

		const requestHash = generateFluxDepositHash({
			transactionId: externalTransactionId,
			userId: providerUserId,
			amount,
			currency,
			secretKey: settings.secretKey,
		});
		const payload = {
			transaction: {
				transaction_id: externalTransactionId,
				user_id: providerUserId,
				username,
				fullname,
				amountTRY: Number(formatTryAmount(amount)),
				currency,
				url: settings.siteUrl,
				hash: requestHash,
			},
		};

		let upstreamResponse;
		try {
			upstreamResponse = await createClient(settings).post(
				"/deposit/native",
				payload,
			);
		} catch (upstreamError) {
			const upstreamDetails = getFluxUpstreamErrorDetails(upstreamError);
			const upstreamStatus = upstreamDetails.status;
			const definitelyRejected = isDefinitiveFluxDepositFailure(
				upstreamStatus,
				upstreamError.response?.data,
			);
			const accessBlocked =
				upstreamDetails.code === "FLUX_UPSTREAM_ACCESS_BLOCKED";
			const providerStatus = accessBlocked
				? "access_blocked"
				: upstreamDetails.code === "FLUX_UPSTREAM_UNAUTHORIZED"
					? "unauthorized"
					: upstreamDetails.code === "FLUX_UPSTREAM_FORBIDDEN"
						? "forbidden"
						: definitelyRejected
							? "request_failed"
							: "request_unknown";
			const upstreamDiagnostic = {
				code: upstreamDetails.code,
				status: upstreamDetails.status,
				cfRay: accessBlocked ? upstreamDetails.requestId : "",
				contentType: upstreamDetails.contentType,
				server: upstreamDetails.server,
				apiHost: getUrlHost(settings.apiUrl),
				siteHost: getUrlHost(settings.siteUrl),
				apiKeyFingerprint: getFluxCredentialFingerprint(settings.apiKey),
				proxyConfigured: Boolean(
					process.env.HTTPS_PROXY ||
						process.env.HTTP_PROXY ||
						process.env.ALL_PROXY,
				),
			};
			const safeProviderRejection =
				[400, 422].includes(upstreamStatus) &&
				upstreamDetails.responseType === "json" &&
				Boolean(upstreamDetails.providerMessage);
			const providerMessage = redactDiagnosticText(
				upstreamDetails.providerMessage,
				[settings.apiKey, settings.secretKey, requestHash],
			);
			const publicMessage = safeProviderRejection
				? providerMessage
				: "FluxKripto şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.";
			const publicStatus = safeProviderRejection ? 400 : 502;

			console.error(
				"FluxKripto deposit upstream hatası:",
				JSON.stringify({
					externalTransactionId,
					...upstreamDiagnostic,
					responseType: upstreamDetails.responseType,
					providerMessage,
				}),
			);
			await FluxKriptoTransaction.updateOne(
				{
					_id: transaction._id,
					status: { $nin: FINAL_TRANSACTION_STATUS_LIST },
				},
				{
					$set: {
						status: definitelyRejected ? "failed" : "processing",
						providerStatus,
						upstreamDiagnostic,
						...(definitelyRejected ? { rejectionReason: publicMessage } : {}),
					},
				},
			);
			throw new RouteError(
				publicMessage,
				publicStatus,
				{
					code: upstreamDetails.code,
					retryable: false,
					alreadyLogged: true,
				},
			);
		}

		const rawResponse = upstreamResponse.data || {};
		const data = rawResponse.data || {};
		const localTransactionId = transaction._id;
		if (rawResponse.status !== true) {
			const rejectionReason =
				rawResponse.message || rawResponse.error || "FluxKripto işlemi reddetti.";
			await FluxKriptoTransaction.updateOne(
				{
					_id: localTransactionId,
					status: { $nin: FINAL_TRANSACTION_STATUS_LIST },
				},
				{
					$set: {
						status: "failed",
						providerStatus: "rejected",
						providerResponse: rawResponse,
						rejectionReason,
					},
				},
			);
			throw new RouteError(rejectionReason);
		}

		let normalizedProviderData;
		try {
			normalizedProviderData = normalizeFluxNativeDepositData(data, {
				transactionId: externalTransactionId,
				amount,
				currency,
			});
		} catch (responseError) {
			await FluxKriptoTransaction.updateOne(
				{
					_id: localTransactionId,
					status: { $nin: FINAL_TRANSACTION_STATUS_LIST },
				},
				{
					$set: {
						status: "processing",
						providerStatus: "response_unknown",
						providerResponse: rawResponse,
					},
				},
			);
			throw new RouteError(responseError.message, 502);
		}

		const providerFields = {
			...normalizedProviderData,
			providerStatus: "created",
			providerResponse: rawResponse,
			processedAt: new Date(),
		};
		transaction = await FluxKriptoTransaction.findOneAndUpdate(
			{
				_id: localTransactionId,
				status: { $nin: FINAL_TRANSACTION_STATUS_LIST },
			},
			{ $set: { ...providerFields, status: "processing" } },
			{ new: true },
		);

		if (!transaction) {
			const finalProviderFields = { ...providerFields };
			delete finalProviderFields.providerStatus;
			delete finalProviderFields.processedAt;
			transaction = await FluxKriptoTransaction.findByIdAndUpdate(
				localTransactionId,
				{ $set: finalProviderFields },
				{ new: true },
			);
		}

		res.json({
			success: true,
			data: serializeTransaction(transaction),
		});
	} catch (error) {
		if (!error.alreadyLogged) {
			console.error(
				"FluxKripto deposit hatası:",
				error.response?.data || error.message,
			);
		}
		const response = {
			success: false,
			error: error.statusCode
				? error.message
				: "FluxKripto yatırım işlemi başlatılamadı.",
		};
		if (error instanceof RouteError && error.code) response.code = error.code;
		if (
			error instanceof RouteError &&
			typeof error.retryable === "boolean"
		) {
			response.retryable = error.retryable;
		}
		res.status(error.statusCode || 500).json(response);
	}
});

router.post("/withdraw", authorizeUser(true), async (req, res) => {
	const session = await mongoose.startSession();
	let transaction = null;
	let userToEmit = null;

	try {
		const settings = await getFluxSettings({
			requireActive: true,
			requireCredentials: true,
			method: "withdraw",
		});
		const amount = parseTryAmount(req.body.amount);
		validateAmountLimits(amount, settings, "withdraw");
		const currency = validateCurrency(req.body.currency, settings);
		const receiverWallet = String(req.body.receiverWallet || "").trim();
		if (!isValidTronAddress(receiverWallet)) {
			throw new RouteError("Geçerli bir TRON cüzdan adresi giriniz.");
		}

		await session.withTransaction(async () => {
			transaction = null;
			userToEmit = null;

			const user = await User.findById(req.user._id).session(session);
			if (!user) throw new RouteError("Kullanıcı bulunamadı.", 404);

			try {
				await assertWithdrawalNotBlocked(user);
			} catch (lockErr) {
				if (lockErr.code === "WAGERING_REQUIREMENT_NOT_MET") {
					throw new RouteError(lockErr.message, 400, {
						code: lockErr.code,
						wagering: lockErr.wagering,
					});
				}
				throw lockErr;
			}

			const walletIndex = getActiveWalletIndex(user);
			if (walletIndex < 0) {
				throw new RouteError("Aktif cüzdan bulunamadı.");
			}

			const walletPath = `wallets.${walletIndex}.balance`;
			const oldBalance = Number(user.wallets[walletIndex]?.balance || 0);
			const updatedUser = await User.findOneAndUpdate(
				{ _id: user._id, [walletPath]: { $gte: amount } },
				{ $inc: { [walletPath]: -amount } },
				{ new: true, session },
			);

			if (!updatedUser) throw new RouteError("Yetersiz bakiye.");

			const { providerUserId, username, fullname } = getCustomerIdentity(user);
			const externalTransactionId = generateFluxTransactionId(
				user._id.toString(),
				"withdraw",
			);
			const newBalance = Number(
				updatedUser.wallets[walletIndex]?.balance || 0,
			);

			[transaction] = await FluxKriptoTransaction.create(
				[
					{
						user: user._id,
						externalTransactionId,
						providerUserId,
						type: "withdraw",
						amount,
						requestedAmount: amount,
						providerAmount: null,
						currency,
						receiverWallet,
						status: "pending",
						oldBalance,
						newBalance,
						balanceDebitedAt: new Date(),
						metadata: { username, fullname },
					},
				],
				{ session },
			);
			userToEmit = updatedUser;
		});

		if (userToEmit) emitUserBalance(null, userToEmit);

		createAdminNotification(
			"withdraw",
			"Yeni Çekim Talebi",
			`${userToEmit?.username || "Kullanıcı"} kullanıcısı ${transaction?.amount} ₺ tutarında FluxKripto çekim talebi oluşturdu.`,
			"/apps/finance/withdraw",
			{
				provider: "FluxKripto",
				amount: transaction?.amount,
				username: userToEmit?.username,
				userId: userToEmit?._id,
			},
		);

		res.json({
			success: true,
			message:
				"Çekim talebi oluşturuldu. Tutar bakiyenizden düşüldü ve admin onayı bekleniyor.",
			data: serializeTransaction(transaction),
		});
	} catch (error) {
		console.error("FluxKripto withdraw hatası:", error.message);
		res.status(error.statusCode || 500).json({
			success: false,
			error: error.statusCode
				? error.message
				: "FluxKripto çekim talebi oluşturulamadı.",
		});
	} finally {
		await session.endSession();
	}
});

router.get("/status/:id", authorizeUser(true), async (req, res) => {
	try {
		const transaction = await FluxKriptoTransaction.findOne({
			_id: req.params.id,
			user: req.user._id,
		});
		if (!transaction) {
			return res
				.status(404)
				.json({ success: false, error: "İşlem bulunamadı." });
		}

		res.json({ success: true, data: serializeTransaction(transaction) });
	} catch (error) {
		console.error("FluxKripto status hatası:", error.message);
		res.status(500).json({
			success: false,
			error: "İşlem durumu alınamadı.",
		});
	}
});

router.post("/callback", async (req, res) => {
	let session = null;

	try {
		const settings = await getFluxSettings({ requireCredentials: true });
		const payload = req.body || {};
		const data = payload.data || {};
		const callbackStatus = normalizeCallbackStatus(payload.status);
		const transactionType = String(data.transaction_type || "")
			.trim()
			.toLowerCase();
		const externalTransactionId = String(data.transaction_id || "").trim();
		const providerUserId = String(data.user_id || "").trim();
		const rawAmount = data.amountTRY;
		const receivedHash = String(data.hash || "").trim();

		if (
			callbackStatus === null ||
			!["deposit", "withdraw"].includes(transactionType) ||
			!externalTransactionId ||
			!providerUserId ||
			rawAmount === undefined ||
			rawAmount === null ||
			!receivedHash
		) {
			throw new RouteError("Geçersiz callback verisi.");
		}

		if (
			!verifyFluxCallbackHash({
				transactionId: externalTransactionId,
				userId: providerUserId,
				rawAmount,
				status: callbackStatus,
				secretKey: settings.secretKey,
				receivedHash,
			})
		) {
			throw new RouteError("Callback imzası doğrulanamadı.", 401);
		}

		let providerAmount;
		try {
			providerAmount = normalizeFluxProviderTryAmount(rawAmount);
		} catch {
			throw new RouteError("Geçersiz callback tutarı.");
		}
		session = await mongoose.startSession();
		let updatedTransaction = null;
		let userToEmit = null;
		let alreadyProcessed = false;
		let amountAdjustment = null;

		await session.withTransaction(async () => {
			updatedTransaction = null;
			userToEmit = null;
			alreadyProcessed = false;
			amountAdjustment = null;

			const transaction = await FluxKriptoTransaction.findOne({
				externalTransactionId,
			}).session(session);

			if (!transaction) throw new RouteError("İşlem bulunamadı.", 404);
			if (transaction.type !== transactionType) {
				throw new RouteError("Callback işlem türü eşleşmiyor.");
			}
			if (String(transaction.providerUserId) !== providerUserId) {
				throw new RouteError("Callback kullanıcı bilgisi eşleşmiyor.");
			}
			if (
				transaction.type === "withdraw" &&
				formatTryAmount(transaction.amount) !== formatTryAmount(providerAmount)
			) {
				throw new RouteError("Callback tutarı eşleşmiyor.");
			}

			const callbackFinanceId =
				data.finance_id !== undefined && data.finance_id !== null
					? String(data.finance_id)
					: "";
			if (
				transaction.financeId &&
				callbackFinanceId &&
				transaction.financeId !== callbackFinanceId
			) {
				throw new RouteError("Callback finance ID bilgisi eşleşmiyor.");
			}

			if (transaction.type === "withdraw" && !transaction.balanceDebitedAt) {
				throw new RouteError(
					"FluxKripto çekim bakiyesi talep sırasında rezerve edilmemiş.",
					409,
					{ code: "WITHDRAW_BALANCE_NOT_RESERVED" },
				);
			}
			if (
				transaction.type === "withdraw" &&
				callbackStatus &&
				transaction.balanceRefundedAt
			) {
				throw new RouteError(
					"İade edilmiş FluxKripto çekimi onaylanamaz.",
					409,
					{ code: "WITHDRAW_BALANCE_ALREADY_REFUNDED" },
				);
			}

			if (FINAL_TRANSACTION_STATUSES.has(transaction.status)) {
				if (transaction.type === "deposit") {
					const finalAmount = transaction.providerAmount ?? transaction.amount;
					if (formatTryAmount(finalAmount) !== formatTryAmount(providerAmount)) {
						throw new RouteError(
							"Final FluxKripto işlem tutarı provider tutarıyla eşleşmiyor.",
							409,
							{ code: "FINAL_AMOUNT_MISMATCH" },
						);
					}
					if (transaction.providerAmount == null) {
						if (transaction.requestedAmount == null) {
							transaction.requestedAmount = transaction.amount;
						}
						transaction.providerAmount = providerAmount;
						updatedTransaction = await transaction.save({ session });
					} else {
						updatedTransaction = transaction;
					}
				} else {
					updatedTransaction = transaction;
				}
				alreadyProcessed = true;
				return;
			}

			if (transaction.type === "deposit") {
				const previousAmount = transaction.amount;
				if (transaction.requestedAmount == null) {
					transaction.requestedAmount = previousAmount;
				}
				transaction.providerAmount = providerAmount;
				transaction.amount = providerAmount;
				if (formatTryAmount(previousAmount) !== formatTryAmount(providerAmount)) {
					amountAdjustment = {
						externalTransactionId: transaction.externalTransactionId,
						source: "callback",
						requestedAmount: transaction.requestedAmount,
						providerAmount,
					};
				}
			}

			transaction.financeId = callbackFinanceId || transaction.financeId;
			transaction.providerStatus = String(callbackStatus);
			transaction.callbackRawData = payload;
			transaction.processedAt = new Date();

			if (callbackStatus) {
				transaction.status = "approved";
				transaction.approvedAt = new Date();

				if (transaction.type === "deposit") {
					const user = await User.findById(transaction.user).session(session);
					if (!user) throw new RouteError("Kullanıcı bulunamadı.", 404);

					const newBalance = await updateUserBalance(user, transaction.amount, {
						emitSocket: false,
						session,
					});
					if (newBalance === false) {
						throw new Error("Kullanıcı bakiyesi güncellenemedi.");
					}
					await User.updateOne(
						{ _id: user._id },
						{ $inc: { "stats.deposit": transaction.amount } },
						{ session },
					);
					transaction.newBalance = Number(newBalance);
					transaction.balanceCreditedAt = new Date();
					userToEmit = user;
				} else {
					const result = await User.updateOne(
						{ _id: transaction.user },
						{ $inc: { "stats.withdraw": transaction.amount } },
						{ session },
					);
					if ((result.matchedCount ?? result.n) !== 1) {
						throw new RouteError("Kullanıcı bulunamadı.", 404);
					}
				}
			} else {
				transaction.status = "rejected";
				transaction.rejectedAt = new Date();
				transaction.rejectionReason =
					payload.message || "FluxKripto işlemi reddetti.";

				if (transaction.type === "withdraw") {
					const user = await User.findById(transaction.user).session(session);
					if (!user) throw new RouteError("Kullanıcı bulunamadı.", 404);

					const newBalance = await updateUserBalance(user, transaction.amount, {
						emitSocket: false,
						session,
					});
					if (newBalance === false) {
						throw new Error("Kullanıcı bakiyesi iade edilemedi.");
					}
					transaction.newBalance = Number(newBalance);
					transaction.balanceRefundedAt = new Date();
					userToEmit = user;
				}
			}

			updatedTransaction = await transaction.save({ session });
		});

		if (amountAdjustment) {
			console.info(
				"FluxKripto deposit amount adjusted:",
				JSON.stringify(amountAdjustment),
			);
		}
		if (userToEmit) emitUserBalance(null, userToEmit);

		res.status(200).json({
			success: true,
			data: {
				transactionId: updatedTransaction._id,
				externalTransactionId: updatedTransaction.externalTransactionId,
				status: updatedTransaction.status,
				alreadyProcessed,
			},
		});
	} catch (error) {
		console.error("FluxKripto callback hatası:", error.message);
		const response = {
			success: false,
			error: error.statusCode ? error.message : "Callback işlenemedi.",
		};
		if (error instanceof RouteError && error.code) response.code = error.code;
		res.status(error.statusCode || 500).json(response);
	} finally {
		if (session) await session.endSession();
	}
});

module.exports = router;
