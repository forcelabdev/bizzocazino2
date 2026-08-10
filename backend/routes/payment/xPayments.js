const express = require("express");
const axios = require("axios");

const User = require("../../database/models/User");
const XPaymentTransaction = require("../../database/models/XPaymentTransaction");
const { authorizeUser } = require("../../middleware/auth");
const { getActiveWallet } = require("../../utils/wallet");
const {
	FINAL_XPAYMENTS_STATUSES,
	XPAYMENTS_ENDPOINTS,
	buildXPaymentsStatusRequest,
	createXPaymentsHeaders,
	formatXPaymentsAmount,
	generateXPaymentsDepositHash,
	generateXPaymentsTransactionId,
	getXPaymentsDepositResponseMismatch,
	getXPaymentsErrorMessage,
	hasAtMostTwoDecimals,
	isExistingXPaymentsTransactionResponse,
	isDefinitiveXPaymentsHttpFailure,
	isValidTurkishIban,
	mapXPaymentsStatus,
	normalizeCallbackBoolean,
	normalizeTurkishIban,
	normalizeXPaymentsProviderAmount,
	verifyXPaymentsCallbackHash,
} = require("../../utils/xPayments");
const {
	XPaymentsServiceError,
	applyXPaymentsStatus,
	createPendingXPaymentsWithdraw,
	getXPaymentsSettings,
} = require("../../services/xPaymentsService");

const router = express.Router();

const createClient = (settings) =>
	axios.create({
		baseURL: settings.apiUrl,
		headers: createXPaymentsHeaders(settings.apiKey),
		timeout: 30000,
	});

const getProviderCustomer = (user) => {
	const providerUserId = String(user.numericId || user._id);
	const username = String(user.username || `user_${providerUserId}`).trim();
	const fullname = String(user.name || username).trim();
	return { providerUserId, username, fullname };
};

const normalizeAccount = (account = {}) => ({
	bankName: String(account.bank_name || ""),
	accountHolderName: String(account.account_holder_name || ""),
	iban: normalizeTurkishIban(account.iban),
	methodType: String(account.method_type || ""),
});

const serializeTransaction = (transaction, extra = {}) => ({
	transactionId: transaction._id,
	externalTransactionId: transaction.externalTransactionId,
	financeId: transaction.financeId || null,
	type: transaction.type,
	status: transaction.status,
	providerStatus: transaction.providerStatus || null,
	isProcessing: Boolean(transaction.isProcessing),
	amount: transaction.amount,
	requestedAmount: transaction.requestedAmount ?? transaction.amount,
	providerAmount: transaction.providerAmount ?? null,
	currency: transaction.currency,
	account:
		transaction.type === "deposit"
			? {
				bankName: transaction.account?.bankName || "",
				accountHolderName: transaction.account?.accountHolderName || "",
				iban: transaction.account?.iban || "",
				methodType: transaction.account?.methodType || "",
			}
			: undefined,
	withdrawal:
		transaction.type === "withdraw"
			? {
				accountHolder: transaction.withdrawal?.accountHolder || "",
				iban: transaction.withdrawal?.iban || "",
			}
			: undefined,
	createdAt: transaction.createdAt,
	updatedAt: transaction.updatedAt,
	...extra,
});

const sendError = (res, error, fallback) => {
	const statusCode =
		error instanceof XPaymentsServiceError
			? error.statusCode
			: error?.response?.status >= 400 && error?.response?.status < 500
				? error.response.status
				: error?.response
					? 502
					: 500;
	return res.status(statusCode).json({
		success: false,
		error: getXPaymentsErrorMessage(error, fallback),
	});
};

const validateAmount = (amount, settings) => {
	const numericAmount = Number(amount);
	if (
		!Number.isFinite(numericAmount) ||
		numericAmount <= 0 ||
		!hasAtMostTwoDecimals(amount)
	) {
		throw new XPaymentsServiceError(
			"Tutar pozitif ve en fazla iki ondalıklı olmalıdır.",
			400,
			"INVALID_AMOUNT",
		);
	}
	if (numericAmount < Number(settings.minAmount)) {
		throw new XPaymentsServiceError(
			`Minimum işlem tutarı: ${settings.minAmount} TRY`,
			400,
			"AMOUNT_BELOW_MINIMUM",
		);
	}
	if (numericAmount > Number(settings.maxAmount)) {
		throw new XPaymentsServiceError(
			`Maksimum işlem tutarı: ${settings.maxAmount} TRY`,
			400,
			"AMOUNT_ABOVE_MAXIMUM",
		);
	}
	return numericAmount;
};

const markPendingDepositFailed = async (
	transaction,
	error,
	rawResponse = {},
	{ ambiguous = false } = {},
) => {
	if (!transaction?._id) return;
	const update = {
		status: ambiguous ? "processing" : "failed",
		submissionState: ambiguous ? "unknown" : "failed",
		providerStatus: ambiguous ? "unknown" : "failed",
		providerResponse: rawResponse || {},
	};
	if (!ambiguous) {
		update.rejectionReason = String(
			error || "XPayment deposit request failed.",
		);
		update.failedAt = new Date();
	}
	await XPaymentTransaction.updateOne(
		{ _id: transaction._id, status: "pending" },
		{ $set: update },
	).catch(() => {});
};

router.get("/methods", async (req, res) => {
	try {
		const settings = await getXPaymentsSettings();
		const configured = Boolean(settings.apiKey && settings.secretKey);
		const available = Boolean(
			settings.isActive &&
				configured &&
				(settings.methods.deposit || settings.methods.withdraw),
		);

		return res.json({
			success: true,
			data: {
				available,
				name: settings.name,
				logo: settings.logo,
				currency: "TRY",
				minAmount: settings.minAmount,
				maxAmount: settings.maxAmount,
				methods: {
					deposit: available && Boolean(settings.methods.deposit),
					withdraw: available && Boolean(settings.methods.withdraw),
				},
			},
		});
	} catch (error) {
		console.error("XPayment methods error:", error.message);
		return sendError(res, error, "XPayment yöntemleri alınamadı.");
	}
});

router.post("/deposit", authorizeUser(true), async (req, res) => {
	try {
		const settings = await getXPaymentsSettings({
			requireActive: true,
			requireCredentials: true,
		});
		if (!settings.methods.deposit) {
			throw new XPaymentsServiceError(
				"XPayment yatırma yöntemi aktif değil.",
				400,
				"METHOD_INACTIVE",
			);
		}

		const amount = validateAmount(req.body.amount, settings);
		const user = await User.findById(req.user._id);
		if (!user) {
			throw new XPaymentsServiceError(
				"Kullanıcı bulunamadı.",
				404,
				"USER_NOT_FOUND",
			);
		}

		const customer = getProviderCustomer(user);
		const requestedTransactionId = generateXPaymentsTransactionId(
			user._id.toString(),
			"deposit",
		);
		const activeWallet = getActiveWallet(user);
		let transaction = await XPaymentTransaction.create({
			user: user._id,
			providerUserId: customer.providerUserId,
			externalTransactionId: requestedTransactionId,
			type: "deposit",
			amount,
			requestedAmount: amount,
			providerAmount: null,
			currency: "TRY",
			status: "pending",
			oldBalance: Number(activeWallet?.balance || 0),
			newBalance: Number(activeWallet?.balance || 0),
			metadata: { customer },
			submissionState: "submitting",
			submissionAttemptedAt: new Date(),
		});
		const formattedAmount = formatXPaymentsAmount(amount);
		const payload = {
			transaction: {
				transaction_id: requestedTransactionId,
				user_id: customer.providerUserId,
				username: customer.username,
				fullname: customer.fullname,
				amount: Number(formattedAmount),
				hash: generateXPaymentsDepositHash({
					transactionId: requestedTransactionId,
					userId: customer.providerUserId,
					amount,
					secretKey: settings.secretKey,
				}),
			},
		};

		let rawResponse;
		let reusedExisting = false;
		try {
			const response = await createClient(settings).post(
				XPAYMENTS_ENDPOINTS.deposit,
				payload,
			);
			rawResponse = response.data || {};
		} catch (error) {
			if (
				isExistingXPaymentsTransactionResponse(
					error.response?.status,
					error.response?.data,
				)
			) {
				rawResponse = error.response.data;
				reusedExisting = true;
			} else {
				const upstreamStatus = Number(error.response?.status || 0);
				const ambiguous =
					!error.response ||
					!isDefinitiveXPaymentsHttpFailure(upstreamStatus);
				await markPendingDepositFailed(
					transaction,
					getXPaymentsErrorMessage(
						error,
						"XPayment deposit request failed.",
					),
					error.response?.data || {},
					{ ambiguous },
				);
				throw error;
			}
		}

		if (!rawResponse.status && !reusedExisting) {
			await markPendingDepositFailed(
				transaction,
				rawResponse.message ||
					rawResponse.error ||
					"XPayment deposit request failed.",
				rawResponse,
			);
			throw new XPaymentsServiceError(
				rawResponse.message ||
					rawResponse.error ||
					"XPayment yatırma işlemi oluşturulamadı.",
				400,
				"UPSTREAM_REJECTED",
			);
		}
		if (!rawResponse.data) {
			await markPendingDepositFailed(
				transaction,
				"XPayment accepted the request but returned no transaction data.",
				rawResponse,
				{ ambiguous: true },
			);
			throw new XPaymentsServiceError(
				"XPayment işlem verilerini eksik döndürdü.",
				502,
				"INVALID_UPSTREAM_RESPONSE",
			);
		}

		const providerData = rawResponse.data;
		const externalTransactionId = String(
			providerData.transaction_id || "",
		).trim();
		let providerAmount;
		try {
			providerAmount = normalizeXPaymentsProviderAmount(
				providerData.amount ?? amount,
			);
		} catch {
			providerAmount = null;
		}
		if (!externalTransactionId) {
			await markPendingDepositFailed(
				transaction,
				"XPayment returned no transaction ID.",
				rawResponse,
				{ ambiguous: true },
			);
			throw new XPaymentsServiceError(
				"XPayment işlem kimliğini eksik döndürdü.",
				502,
				"INVALID_UPSTREAM_RESPONSE",
			);
		}
		if (providerAmount === null) {
			await markPendingDepositFailed(
				transaction,
				"XPayment returned an invalid amount.",
				rawResponse,
				{ ambiguous: true },
			);
			throw new XPaymentsServiceError(
				"XPayment geçersiz işlem tutarı döndürdü.",
				502,
				"INVALID_UPSTREAM_RESPONSE",
			);
		}
		const responseMismatch = getXPaymentsDepositResponseMismatch({
			requestedTransactionId,
			requestedAmount: amount,
			providerTransactionId: externalTransactionId,
			providerAmount,
			reusedExisting,
		});
		if (responseMismatch) {
			await markPendingDepositFailed(
				transaction,
				"XPayment returned deposit data that does not match the request.",
				rawResponse,
				{ ambiguous: true },
			);
			throw new XPaymentsServiceError(
				responseMismatch === "transaction_id"
					? "XPayment normal create yanıtında farklı işlem kimliği döndürdü."
					: "XPayment işlem tutarı istekle eşleşmiyor.",
				502,
				responseMismatch === "transaction_id"
					? "TRANSACTION_ID_MISMATCH"
					: "AMOUNT_MISMATCH",
			);
		}

		if (externalTransactionId !== requestedTransactionId) {
			const existingTransaction = await XPaymentTransaction.findOne({
				externalTransactionId,
			});
			if (existingTransaction) {
				if (
					existingTransaction.type !== "deposit" ||
					existingTransaction.user.toString() !== user._id.toString() ||
					formatXPaymentsAmount(existingTransaction.amount) !==
						formatXPaymentsAmount(providerAmount)
				) {
					await markPendingDepositFailed(
						transaction,
						"Existing XPayment transaction does not match this deposit.",
						rawResponse,
					);
					throw new XPaymentsServiceError(
						"Mevcut XPayment işlemi bu yatırma talebiyle eşleşmiyor.",
						409,
						"TRANSACTION_MISMATCH",
					);
				}
				await markPendingDepositFailed(
					transaction,
					"Superseded by existing transaction " + externalTransactionId + ".",
					rawResponse,
				);
				transaction = existingTransaction;
			} else {
				try {
					if (transaction.requestedAmount == null) {
						transaction.requestedAmount = transaction.amount;
					}
					transaction.externalTransactionId = externalTransactionId;
					transaction.providerAmount = providerAmount;
					transaction.amount = providerAmount;
					await transaction.save();
				} catch (error) {
					if (error?.code !== 11000) throw error;
					const concurrentExisting = await XPaymentTransaction.findOne({
						externalTransactionId,
					});
					if (
						!concurrentExisting ||
						concurrentExisting.type !== "deposit" ||
						concurrentExisting.user.toString() !== user._id.toString() ||
						formatXPaymentsAmount(concurrentExisting.amount) !==
							formatXPaymentsAmount(providerAmount)
					) {
						throw error;
					}
					await markPendingDepositFailed(
						transaction,
						"Superseded by existing transaction " + externalTransactionId + ".",
						rawResponse,
					);
					transaction = concurrentExisting;
				}
			}
		}

		if (
			reusedExisting &&
			transaction._id &&
			transaction.externalTransactionId === externalTransactionId &&
			transaction.status === "pending" &&
			formatXPaymentsAmount(transaction.amount) !==
				formatXPaymentsAmount(providerAmount)
		) {
			if (transaction.requestedAmount == null) {
				transaction.requestedAmount = transaction.amount;
			}
			transaction.providerAmount = providerAmount;
			transaction.amount = providerAmount;
			await transaction.save();
		}

		if (
			transaction.type !== "deposit" ||
			transaction.user.toString() !== user._id.toString() ||
			formatXPaymentsAmount(transaction.amount) !==
				formatXPaymentsAmount(providerAmount)
		) {
			throw new XPaymentsServiceError(
				"Mevcut XPayment işlemi bu yatırma talebiyle eşleşmiyor.",
				409,
				"TRANSACTION_MISMATCH",
			);
		}

		const account = normalizeAccount(providerData.account);
		if (
			!account.bankName ||
			!account.accountHolderName ||
			!isValidTurkishIban(account.iban) ||
			!account.methodType ||
			providerData.finance_id === null ||
			providerData.finance_id === undefined
		) {
			await markPendingDepositFailed(
				transaction,
				"XPayment returned incomplete account details.",
				rawResponse,
				{ ambiguous: true },
			);
			throw new XPaymentsServiceError(
				"XPayment hesap bilgilerini eksik döndürdü.",
				502,
				"INVALID_UPSTREAM_RESPONSE",
			);
		}

		await XPaymentTransaction.updateOne(
			{ _id: transaction._id },
			{
				$set: {
					requestedAmount:
						transaction.requestedAmount ?? transaction.amount,
					providerAmount,
					financeId:
						providerData.finance_id !== undefined
							? String(providerData.finance_id)
							: transaction.financeId,
					account,
					providerResponse: rawResponse,
					submissionState: "submitted",
					submittedAt: transaction.submittedAt || new Date(),
				},
			},
		);
		await XPaymentTransaction.updateOne(
			{
				_id: transaction._id,
				status: { $nin: [...FINAL_XPAYMENTS_STATUSES] },
			},
			{
				$set: {
					status: "processing",
					providerStatus: "waiting",
				},
			},
		);
		transaction = await XPaymentTransaction.findById(transaction._id);

		return res.json({
			success: true,
			data: serializeTransaction(transaction, { reusedExisting }),
		});
	} catch (error) {
		console.error(
			"XPayment deposit error:",
			error.response?.data || error.message,
		);
		return sendError(res, error, "XPayment yatırma işlemi başlatılamadı.");
	}
});

router.post("/withdraw", authorizeUser(true), async (req, res) => {
	try {
		const settings = await getXPaymentsSettings({
			requireActive: true,
			requireCredentials: true,
		});
		if (!settings.methods.withdraw) {
			throw new XPaymentsServiceError(
				"XPayment çekim yöntemi aktif değil.",
				400,
				"METHOD_INACTIVE",
			);
		}

		const amount = validateAmount(req.body.amount, settings);
		const accountHolder = String(req.body.accountHolder || "").trim();
		const iban = normalizeTurkishIban(req.body.iban);
		if (accountHolder.length < 2) {
			throw new XPaymentsServiceError(
				"Hesap sahibi adı zorunludur.",
				400,
				"INVALID_ACCOUNT_HOLDER",
			);
		}
		if (!isValidTurkishIban(iban)) {
			throw new XPaymentsServiceError(
				"IBAN, TR ile başlayan 26 karakterlik geçerli bir değer olmalıdır.",
				400,
				"INVALID_IBAN",
			);
		}

		const user = await User.findById(req.user._id);
		if (!user) {
			throw new XPaymentsServiceError(
				"Kullanıcı bulunamadı.",
				404,
				"USER_NOT_FOUND",
			);
		}
		const customer = getProviderCustomer(user);
		const externalTransactionId = generateXPaymentsTransactionId(
			user._id.toString(),
			"withdraw",
		);
		const transaction = await createPendingXPaymentsWithdraw({
			userId: user._id,
			providerUserId: customer.providerUserId,
			externalTransactionId,
			amount,
			accountHolder,
			iban,
			metadata: { customer },
		});

		return res.json({
			success: true,
			message:
				"Çekim talebi oluşturuldu. Tutar bakiyenizden düşüldü ve admin onayı bekleniyor.",
			data: serializeTransaction(transaction),
		});
	} catch (error) {
		console.error("XPayment withdraw error:", error.message);
		return sendError(res, error, "XPayment çekim talebi oluşturulamadı.");
	}
});

router.get("/status/:id", authorizeUser(true), async (req, res) => {
	try {
		let transaction = await XPaymentTransaction.findById(req.params.id);
		if (!transaction) {
			throw new XPaymentsServiceError(
				"İşlem bulunamadı.",
				404,
				"TRANSACTION_NOT_FOUND",
			);
		}
		if (transaction.user.toString() !== req.user._id.toString()) {
			throw new XPaymentsServiceError(
				"Bu işlemi görüntüleme yetkiniz yok.",
				403,
				"TRANSACTION_FORBIDDEN",
			);
		}

		const shouldReconcile =
			!FINAL_XPAYMENTS_STATUSES.has(transaction.status) &&
			(transaction.type === "deposit" || transaction.status === "processing");
		if (shouldReconcile) {
			const settings = await getXPaymentsSettings({ requireCredentials: true });
			const request = buildXPaymentsStatusRequest({
				transactionId: transaction.externalTransactionId,
				apiKey: settings.apiKey,
			});
			const response = await axios.post(
				`${settings.apiUrl}${request.endpoint}`,
				request.data,
				{ headers: request.headers, timeout: 30000 },
			);
			const rawResponse = response.data || {};
			const providerData = rawResponse.data || {};
			if (!rawResponse.status || !mapXPaymentsStatus(providerData.status)) {
				throw new XPaymentsServiceError(
					rawResponse.message ||
						rawResponse.error ||
						"XPayment işlem durumu alınamadı.",
					502,
					"INVALID_UPSTREAM_RESPONSE",
				);
			}
			if (String(providerData.transaction_id) !== transaction.externalTransactionId) {
				throw new XPaymentsServiceError(
					"XPayment farklı bir işlem kimliği döndürdü.",
					502,
					"TRANSACTION_ID_MISMATCH",
				);
			}
			let providerAmount;
			try {
				providerAmount = normalizeXPaymentsProviderAmount(
					providerData.amount,
				);
			} catch {
				throw new XPaymentsServiceError(
					"XPayment geçersiz işlem tutarı döndürdü.",
					502,
					"INVALID_PROVIDER_AMOUNT",
				);
			}
			if (
				transaction.type === "withdraw" &&
				formatXPaymentsAmount(providerData.amount) !==
					formatXPaymentsAmount(transaction.amount)
			) {
				throw new XPaymentsServiceError(
					"XPayment işlem tutarı yerel kayıtla eşleşmiyor.",
					502,
					"AMOUNT_MISMATCH",
				);
			}

			const result = await applyXPaymentsStatus(
				transaction._id,
				providerData.status,
				rawResponse,
				{
					lastCheckedAt: new Date(),
					...(transaction.type === "deposit"
						? { providerAmount, amountSource: "status" }
						: {}),
				},
			);
			transaction = result.transaction;
		}

		return res.json({
			success: true,
			data: serializeTransaction(transaction),
		});
	} catch (error) {
		console.error(
			"XPayment status error:",
			error.response?.data || error.message,
		);
		return sendError(res, error, "XPayment işlem durumu alınamadı.");
	}
});

router.post("/callback", async (req, res) => {
	try {
		const settings = await getXPaymentsSettings({ requireCredentials: true });
		const callback = req.body || {};
		const data = callback.data || {};
		const callbackStatus = normalizeCallbackBoolean(callback.status);

		if (
			callbackStatus === null ||
			!["deposit", "withdraw"].includes(data.transaction_type) ||
			!data.transaction_id ||
			!data.user_id ||
			data.amount === undefined ||
			!data.hash
		) {
			return res.status(400).json({
				success: false,
				error: "Geçersiz XPayment callback gövdesi.",
			});
		}

		if (
			!verifyXPaymentsCallbackHash({
				transactionId: data.transaction_id,
				userId: data.user_id,
				amount: data.amount,
				status: callbackStatus,
				secretKey: settings.secretKey,
				receivedHash: data.hash,
			})
		) {
			return res.status(401).json({
				success: false,
				error: "XPayment callback imzası geçersiz.",
			});
		}

		let providerAmount;
		try {
			providerAmount = normalizeXPaymentsProviderAmount(data.amount);
		} catch {
			return res.status(400).json({
				success: false,
				error: "Geçersiz XPayment callback tutarı.",
			});
		}

		const transaction = await XPaymentTransaction.findOne({
			externalTransactionId: String(data.transaction_id),
		});
		if (!transaction) {
			return res.status(404).json({
				success: false,
				error: "XPayment işlemi bulunamadı.",
			});
		}

		const storedProviderUserId = String(
			transaction.providerUserId ||
				transaction.metadata?.customer?.providerUserId ||
				"",
		);
		if (
			transaction.type !== data.transaction_type ||
			storedProviderUserId !== String(data.user_id) ||
			(transaction.type === "withdraw" &&
				formatXPaymentsAmount(transaction.amount) !==
					formatXPaymentsAmount(providerAmount)) ||
			(transaction.financeId &&
				data.finance_id !== undefined &&
				transaction.financeId !== String(data.finance_id))
		) {
			return res.status(409).json({
				success: false,
				error: "XPayment callback verileri yerel işlemle eşleşmiyor.",
			});
		}

		const result = await applyXPaymentsStatus(
			transaction._id,
			callbackStatus ? "success" : "reject",
			callback,
			{
				persistCallbackRawData: true,
				callbackRawData: callback,
				normalizedStatus: callbackStatus ? "approved" : "rejected",
				...(transaction.type === "deposit"
					? { providerAmount, amountSource: "callback" }
					: {}),
				rejectionReason: callbackStatus
					? ""
					: callback.message || "XPayment tarafından reddedildi.",
			},
		);

		return res.status(200).json({
			success: true,
			data: {
				transactionId: result.transaction._id,
				externalTransactionId: result.transaction.externalTransactionId,
				status: result.transaction.status,
				alreadyProcessed: result.alreadyFinal,
			},
		});
	} catch (error) {
		console.error("XPayment callback error:", error.message);
		return sendError(res, error, "XPayment callback işlenemedi.");
	}
});

module.exports = router;
