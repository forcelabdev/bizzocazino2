const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");

const User = require("../../database/models/User");
const SiteSettings = require("../../database/models/SiteSettings");
const FluxKriptoTransaction = require("../../database/models/FluxKriptoTransaction");
const { checkPermission } = require("../../middleware/permission");
const { emitUserBalance, updateUserBalance } = require("../../utils/wallet");
const {
	createFluxHeaders,
	formatTryAmount,
	generateFluxWithdrawHash,
	mergeFluxSettings,
	normalizeFluxWithdrawData,
} = require("../../utils/fluxKripto");

const router = express.Router();

class FluxAdminError extends Error {
	constructor(message, statusCode = 400, code = "FLUX_ADMIN_ERROR") {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
	}
}

const getSettingsDocument = async () => {
	let siteSettings = await SiteSettings.findOne();
	if (!siteSettings) siteSettings = new SiteSettings();
	return siteSettings;
};

const getStoredFluxSettings = (siteSettings) => {
	const storedSettings = siteSettings.fluxKripto?.toObject
		? siteSettings.fluxKripto.toObject()
		: siteSettings.fluxKripto || {};
	return mergeFluxSettings(storedSettings);
};

const getCallbackUrl = () => {
	const backendUrl = String(process.env.SERVER_BACKEND_URL || "").replace(
		/\/+$/,
		"",
	);
	return backendUrl
		? `${backendUrl}/payment/fluxkripto/callback`
		: "/payment/fluxkripto/callback";
};

const sanitizeSettings = (settings) => ({
	isActive: settings.isActive === true,
	name: settings.name,
	logo: settings.logo,
	minAmount: settings.minAmount,
	maxAmount: settings.maxAmount,
	currency: "TRY",
	apiUrl: settings.apiUrl,
	siteUrl: settings.siteUrl,
	methods: {
		deposit: settings.methods?.deposit === true,
		withdraw: settings.methods?.withdraw === true,
	},
	currencies: {
		trx: settings.currencies?.trx === true,
		usdt: settings.currencies?.usdt === true,
	},
	apiKeyConfigured: Boolean(String(settings.apiKey || "").trim()),
	secretKeyConfigured: Boolean(String(settings.secretKey || "").trim()),
	callbackUrl: getCallbackUrl(),
});

const normalizeHttpUrl = (value, fieldName, allowEmpty = false) => {
	const normalized = String(value ?? "").trim();
	if (!normalized && allowEmpty) return "";

	let parsed;
	try {
		parsed = new URL(normalized);
	} catch {
		throw new Error(`${fieldName} geçerli bir URL olmalıdır.`);
	}

	if (!["http:", "https:"].includes(parsed.protocol)) {
		throw new Error(`${fieldName} HTTP veya HTTPS kullanmalıdır.`);
	}

	return normalized.replace(/\/+$/, "");
};

const parseSettingAmount = (value, fieldName) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`${fieldName} pozitif bir sayı olmalıdır.`);
	}
	return parsed;
};

const escapeRegex = (value) =>
	String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const serializeAdminTransaction = (transaction) => ({
	_id: transaction._id,
	user: transaction.user,
	externalTransactionId: transaction.externalTransactionId,
	orderId: transaction.orderId || null,
	financeId: transaction.financeId || null,
	type: transaction.type,
	amount: transaction.amount,
	requestedAmount: transaction.requestedAmount ?? transaction.amount,
	providerAmount: transaction.providerAmount ?? null,
	currency: transaction.currency,
	cryptoAmount: transaction.cryptoAmount || null,
	rate: transaction.rate || null,
	walletAddress: transaction.walletAddress || null,
	receiverWallet: transaction.receiverWallet || null,
	status: transaction.status,
	providerStatus: transaction.providerStatus || null,
	upstreamDiagnostic: transaction.upstreamDiagnostic || {},
	oldBalance: transaction.oldBalance,
	newBalance: transaction.newBalance,
	rejectionReason: transaction.rejectionReason || "",
	expiresAt: transaction.expiresAt || null,
	processedAt: transaction.processedAt || null,
	approvedAt: transaction.approvedAt || null,
	rejectedAt: transaction.rejectedAt || null,
	balanceDebitedAt: transaction.balanceDebitedAt || null,
	balanceRefundedAt: transaction.balanceRefundedAt || null,
	createdAt: transaction.createdAt,
	updatedAt: transaction.updatedAt,
});

const rejectAndRefundFluxWithdraw = async ({
	transactionId,
	allowedStatuses,
	providerStatus,
	rejectionReason,
	providerResponse,
}) => {
	const session = await mongoose.startSession();
	let transaction = null;
	let userToEmit = null;
	let alreadyFinal = false;

	try {
		await session.withTransaction(async () => {
			userToEmit = null;
			transaction = await FluxKriptoTransaction.findById(
				transactionId,
			).session(session);
			if (!transaction) {
				throw new FluxAdminError("İşlem bulunamadı.", 404, "TRANSACTION_NOT_FOUND");
			}
			if (transaction.type !== "withdraw") {
				throw new FluxAdminError(
					"Bu bir çekim işlemi değil.",
					400,
					"INVALID_TRANSACTION_TYPE",
				);
			}
			if (
				transaction.status === "rejected" &&
				transaction.balanceRefundedAt
			) {
				alreadyFinal = true;
				return;
			}
			if (
				Array.isArray(allowedStatuses) &&
				!allowedStatuses.includes(transaction.status)
			) {
				throw new FluxAdminError(
					"İşlem mevcut durumunda reddedilemez.",
					409,
					"INVALID_STATUS_TRANSITION",
				);
			}
			if (!transaction.balanceDebitedAt) {
				throw new FluxAdminError(
					"Çekim bakiyesi talep sırasında rezerve edilmemiş.",
					409,
					"WITHDRAW_BALANCE_NOT_RESERVED",
				);
			}
			if (transaction.balanceRefundedAt) {
				throw new FluxAdminError(
					"Çekim bakiyesi daha önce iade edilmiş.",
					409,
					"WITHDRAW_BALANCE_ALREADY_REFUNDED",
				);
			}

			const user = await User.findById(transaction.user).session(session);
			if (!user) {
				throw new FluxAdminError("Kullanıcı bulunamadı.", 404, "USER_NOT_FOUND");
			}
			const newBalance = await updateUserBalance(user, transaction.amount, {
				emitSocket: false,
				session,
			});
			if (newBalance === false) {
				throw new FluxAdminError(
					"Bakiye iade edilemedi.",
					500,
					"BALANCE_REFUND_FAILED",
				);
			}

			transaction.status = "rejected";
			transaction.providerStatus = providerStatus;
			transaction.newBalance = Number(newBalance);
			transaction.rejectedAt = new Date();
			transaction.balanceRefundedAt = new Date();
			transaction.rejectionReason = rejectionReason;
			if (providerResponse !== undefined) {
				transaction.providerResponse = providerResponse || {};
			}
			transaction = await transaction.save({ session });
			userToEmit = user;
		});

		if (userToEmit) emitUserBalance(null, userToEmit);
		return { transaction, alreadyFinal };
	} finally {
		await session.endSession();
	}
};

router.get(
	"/settings",
	checkPermission("platform.read"),
	async (req, res) => {
		try {
			const siteSettings = await getSettingsDocument();
			if (siteSettings.isNew) await siteSettings.save();

			res.json({
				success: true,
				data: sanitizeSettings(getStoredFluxSettings(siteSettings)),
			});
		} catch (error) {
			console.error("FluxKripto ayarları getirilirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Ayarlar getirilirken bir hata oluştu.",
			});
		}
	},
);

router.put(
	"/settings",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const siteSettings = await getSettingsDocument();
			const current = getStoredFluxSettings(siteSettings);
			const next = {
				...current,
				methods: { ...current.methods },
				currencies: { ...current.currencies },
			};

			if (req.body.name !== undefined) {
				const name = String(req.body.name).trim();
				if (!name) throw new Error("Görünen ad boş olamaz.");
				next.name = name;
			}
			if (req.body.logo !== undefined) next.logo = String(req.body.logo).trim();
			if (req.body.minAmount !== undefined) {
				next.minAmount = parseSettingAmount(
					req.body.minAmount,
					"Minimum tutar",
				);
			}
			if (req.body.maxAmount !== undefined) {
				next.maxAmount = parseSettingAmount(
					req.body.maxAmount,
					"Maksimum tutar",
				);
			}
			if (next.minAmount > next.maxAmount) {
				throw new Error("Minimum tutar maksimum tutardan büyük olamaz.");
			}
			if (
				req.body.currency !== undefined &&
				String(req.body.currency).trim().toUpperCase() !== "TRY"
			) {
				throw new Error("FluxKripto hesap para birimi TRY olmalıdır.");
			}
			next.currency = "TRY";

			if (req.body.apiUrl !== undefined) {
				next.apiUrl = normalizeHttpUrl(req.body.apiUrl, "API URL");
			}
			if (req.body.siteUrl !== undefined) {
				next.siteUrl = normalizeHttpUrl(req.body.siteUrl, "Site URL", true);
			}
			if (
				req.body.apiKey !== undefined &&
				String(req.body.apiKey ?? "").trim()
			) {
				next.apiKey = String(req.body.apiKey ?? "").trim();
			}
			if (
				req.body.secretKey !== undefined &&
				String(req.body.secretKey ?? "").trim()
			) {
				next.secretKey = String(req.body.secretKey ?? "").trim();
			}

			if (req.body.methods !== undefined) {
				if (!req.body.methods || typeof req.body.methods !== "object") {
					throw new Error("Method ayarları nesne olmalıdır.");
				}
				for (const key of ["deposit", "withdraw"]) {
					if (req.body.methods[key] !== undefined) {
						if (typeof req.body.methods[key] !== "boolean") {
							throw new Error(`${key} ayarı boolean olmalıdır.`);
						}
						next.methods[key] = req.body.methods[key];
					}
				}
			}

			if (req.body.currencies !== undefined) {
				if (!req.body.currencies || typeof req.body.currencies !== "object") {
					throw new Error("Para birimi ayarları nesne olmalıdır.");
				}
				for (const key of ["trx", "usdt"]) {
					if (req.body.currencies[key] !== undefined) {
						if (typeof req.body.currencies[key] !== "boolean") {
							throw new Error(`${key} ayarı boolean olmalıdır.`);
						}
						next.currencies[key] = req.body.currencies[key];
					}
				}
			}

			if (req.body.isActive !== undefined) {
				if (typeof req.body.isActive !== "boolean") {
					throw new Error("Aktiflik ayarı boolean olmalıdır.");
				}
				next.isActive = req.body.isActive;
			}

			if (
				next.isActive &&
				(!String(next.apiKey || "").trim() ||
					!String(next.secretKey || "").trim() ||
					(next.methods.deposit &&
						!String(next.siteUrl || "").trim()))
			) {
				throw new Error(
					"API key ve secret key; aktif deposit için ayrıca site URL gereklidir.",
				);
			}

			siteSettings.fluxKripto = next;
			siteSettings.markModified("fluxKripto");
			await siteSettings.save();

			res.json({
				success: true,
				message: "FluxKripto ayarları güncellendi.",
				data: sanitizeSettings(getStoredFluxSettings(siteSettings)),
			});
		} catch (error) {
			console.error("FluxKripto ayarları kaydedilirken hata:", error.message);
			res.status(400).json({
				success: false,
				error: error.message || "Ayarlar kaydedilemedi.",
			});
		}
	},
);

router.get(
	"/transactions",
	checkPermission("finance.read"),
	async (req, res) => {
		try {
			const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
			const itemsPerPage = Math.min(
				100,
				Math.max(1, Number.parseInt(req.query.itemsPerPage, 10) || 20),
			);
			const query = {};

			if (["deposit", "withdraw"].includes(req.query.type)) {
				query.type = req.query.type;
			}
			if (["TRX", "USDT"].includes(String(req.query.currency).toUpperCase())) {
				query.currency = String(req.query.currency).toUpperCase();
			}
			if (
				[
					"pending",
					"processing",
					"approved",
					"rejected",
					"cancelled",
					"failed",
				].includes(req.query.status)
			) {
				query.status = req.query.status;
			}

			const search = String(req.query.q || "").trim();
			if (search) {
				const regex = new RegExp(escapeRegex(search), "i");
				const users = await User.find({
					$or: [
						{ username: regex },
						{ "local.email": regex },
						{ phone: regex },
					],
				})
					.select("_id")
					.limit(100)
					.lean();
				query.$or = [
					{ externalTransactionId: regex },
					{ orderId: regex },
					{ financeId: regex },
				];
				if (users.length) {
					query.$or.push({ user: { $in: users.map((user) => user._id) } });
				}
			}

			const skip = (page - 1) * itemsPerPage;
			const monthStart = new Date(
				new Date().getFullYear(),
				new Date().getMonth(),
				1,
			);
			const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

			const [transactions, total, aggregate] = await Promise.all([
				FluxKriptoTransaction.find(query)
					.populate("user", "username local.email phone avatar")
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(itemsPerPage)
					.lean(),
				FluxKriptoTransaction.countDocuments(query),
				FluxKriptoTransaction.aggregate([
					{ $match: query },
					{
						$facet: {
							totalAmount: [
								{ $match: { status: "approved" } },
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							last24hAmount: [
								{ $match: { status: "approved", createdAt: { $gte: last24h } } },
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							monthlyAmount: [
								{
									$match: {
										status: "approved",
										createdAt: { $gte: monthStart },
									},
								},
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							pendingCount: [
								{ $match: { status: "pending" } },
								{ $count: "count" },
							],
							processingCount: [
								{ $match: { status: "processing" } },
								{ $count: "count" },
							],
						},
					},
				]),
			]);

			const stats = aggregate[0] || {};
			res.json({
				success: true,
				data: {
					transactions: transactions.map(serializeAdminTransaction),
					total,
					page,
					itemsPerPage,
					stats: {
						totalAmount: stats.totalAmount?.[0]?.sum || 0,
						last24hAmount: stats.last24hAmount?.[0]?.sum || 0,
						monthlyAmount: stats.monthlyAmount?.[0]?.sum || 0,
						pendingCount: stats.pendingCount?.[0]?.count || 0,
						processingCount: stats.processingCount?.[0]?.count || 0,
					},
				},
			});
		} catch (error) {
			console.error("FluxKripto admin işlem listesi hatası:", error);
			res.status(500).json({
				success: false,
				error: "İşlemler listelenirken hata oluştu.",
			});
		}
	},
);

router.post(
	"/withdraw/:id/approve",
	checkPermission("finance.withdraws.manage"),
	async (req, res) => {
		let transaction = null;

		try {
			const current = await FluxKriptoTransaction.findById(req.params.id);
			if (!current) {
				return res
					.status(404)
					.json({ success: false, error: "İşlem bulunamadı." });
			}
			if (current.type !== "withdraw") {
				return res.status(400).json({
					success: false,
					error: "Bu bir çekim işlemi değil.",
				});
			}
			if (!current.balanceDebitedAt) {
				return res.status(409).json({
					success: false,
					error: "Çekim bakiyesi talep sırasında rezerve edilmemiş.",
					code: "WITHDRAW_BALANCE_NOT_RESERVED",
				});
			}
			if (current.balanceRefundedAt) {
				return res.status(409).json({
					success: false,
					error: "İade edilmiş çekim talebi onaylanamaz.",
					code: "WITHDRAW_BALANCE_ALREADY_REFUNDED",
				});
			}
			if (current.status !== "pending") {
				return res.status(400).json({
					success: false,
					error: `İşlem zaten "${current.status}" durumunda.`,
				});
			}

			const siteSettings = await getSettingsDocument();
			const settings = getStoredFluxSettings(siteSettings);
			if (
				!settings.isActive ||
				!settings.methods.withdraw ||
				!String(settings.apiKey || "").trim() ||
				!String(settings.secretKey || "").trim()
			) {
				return res.status(400).json({
					success: false,
					error: "FluxKripto yapılandırması eksik veya aktif değil.",
				});
			}

			transaction = await FluxKriptoTransaction.findOneAndUpdate(
				{
					_id: current._id,
					type: "withdraw",
					status: "pending",
					balanceDebitedAt: { $ne: null },
					balanceRefundedAt: null,
				},
				{
					$set: {
						status: "processing",
						providerStatus: "submitting",
						processedAt: new Date(),
					},
				},
				{ new: true },
			);

			if (!transaction) {
				return res.status(409).json({
					success: false,
					error: "İşlem başka bir istek tarafından işleniyor.",
				});
			}

			const username = String(transaction.metadata?.username || "").trim();
			const fullname = String(
				transaction.metadata?.fullname || username,
			).trim();
			const payload = {
				transaction: {
					transaction_id: transaction.externalTransactionId,
					user_id: transaction.providerUserId,
					username,
					fullname,
					currency: transaction.currency,
					amountTRY: Number(formatTryAmount(transaction.amount)),
					receiver_wallet: transaction.receiverWallet,
					hash: generateFluxWithdrawHash({
						transactionId: transaction.externalTransactionId,
						userId: transaction.providerUserId,
						currency: transaction.currency,
						amount: transaction.amount,
						receiverWallet: transaction.receiverWallet,
						secretKey: settings.secretKey,
					}),
				},
			};

			let upstreamResponse;
			try {
				upstreamResponse = await axios.post(
					`${String(settings.apiUrl).replace(/\/+$/, "")}/withdraw`,
					payload,
					{
						headers: createFluxHeaders(settings.apiKey),
						timeout: 30000,
					},
				);
			} catch (upstreamError) {
				const statusCode = upstreamError.response?.status;
				const definitiveFailure = [400, 401, 403, 404, 422].includes(
					statusCode,
				);
				const providerResponse =
					upstreamError.response?.data || {
						message: upstreamError.message,
					};
				const rejectionReason =
					upstreamError.response?.data?.message ||
					upstreamError.response?.data?.error ||
					"FluxKripto çekim talebini reddetti.";
				if (definitiveFailure) {
					const result = await rejectAndRefundFluxWithdraw({
						transactionId: transaction._id,
						allowedStatuses: ["processing"],
						providerStatus: "submission_rejected",
						rejectionReason,
						providerResponse,
					});
					return res.status(400).json({
						success: false,
						error: rejectionReason,
						code: "UPSTREAM_REJECTED",
						data: {
							transactionId: result.transaction._id,
							status: result.transaction.status,
							balanceRefunded: Boolean(
								result.transaction.balanceRefundedAt,
							),
						},
					});
				}
				await FluxKriptoTransaction.updateOne(
					{ _id: transaction._id, status: "processing" },
					{
						$set: {
							providerStatus: "submission_unknown",
							providerResponse,
						},
					},
				);
				return res.status(502).json({
					success: false,
					error: "FluxKripto çekim isteğine yanıt alınamadı.",
				});
			}

			const rawResponse = upstreamResponse.data || {};
			const data = rawResponse.data || {};
			if (rawResponse.status !== true) {
				const rejectionReason =
					rawResponse.message ||
					rawResponse.error ||
					"FluxKripto çekim isteğini reddetti.";
				const result = await rejectAndRefundFluxWithdraw({
					transactionId: transaction._id,
					allowedStatuses: ["processing"],
					providerStatus: "submission_rejected",
					rejectionReason,
					providerResponse: rawResponse,
				});
				return res.status(400).json({
					success: false,
					error: rejectionReason,
					code: "UPSTREAM_REJECTED",
					data: {
						transactionId: result.transaction._id,
						status: result.transaction.status,
						balanceRefunded: Boolean(
							result.transaction.balanceRefundedAt,
						),
					},
				});
			}
			let normalizedProviderData;
			try {
				normalizedProviderData = normalizeFluxWithdrawData(data, {
					transactionId: transaction.externalTransactionId,
					amount: transaction.amount,
					currency: transaction.currency,
					receiverWallet: transaction.receiverWallet,
				});
			} catch (responseError) {
				await FluxKriptoTransaction.updateOne(
					{ _id: transaction._id, status: "processing" },
					{
						$set: {
							providerStatus: "submission_unknown",
							providerResponse: rawResponse,
						},
					},
				);
				return res.status(502).json({
					success: false,
					error: responseError.message,
				});
			}

			const localTransactionId = transaction._id;
			const providerFields = {
				...normalizedProviderData,
				providerResponse: rawResponse,
			};
			transaction = await FluxKriptoTransaction.findOneAndUpdate(
				{ _id: localTransactionId, status: "processing" },
				{
					$set: providerFields,
				},
				{ new: true },
			);
			if (!transaction) {
				const finalProviderFields = { ...providerFields };
				delete finalProviderFields.providerStatus;
				transaction = await FluxKriptoTransaction.findByIdAndUpdate(
					localTransactionId,
					{ $set: finalProviderFields },
					{ new: true },
				);
			}

			res.json({
				success: true,
				message: "Çekim talebi onaylandı ve FluxKripto'ya iletildi.",
				data: {
					_id: transaction._id,
					externalTransactionId: transaction.externalTransactionId,
					financeId: transaction.financeId || null,
					status: transaction.status,
				},
			});
		} catch (error) {
			console.error("FluxKripto withdraw approve hatası:", error);
			res.status(500).json({
				success: false,
				error: "Çekim onaylanırken hata oluştu.",
			});
		}
	},
);

router.post(
	"/withdraw/:id/reject",
	checkPermission("finance.withdraws.manage"),
	async (req, res) => {
		const session = await mongoose.startSession();
		let transaction = null;
		let userToEmit = null;

		try {
			await session.withTransaction(async () => {
				transaction = await FluxKriptoTransaction.findById(
					req.params.id,
				).session(session);
				userToEmit = null;

				if (!transaction) throw Object.assign(new Error("İşlem bulunamadı."), { statusCode: 404 });
				if (transaction.type !== "withdraw") {
					throw Object.assign(new Error("Bu bir çekim işlemi değil."), { statusCode: 400 });
				}
				if (transaction.status !== "pending") {
					throw Object.assign(
						new Error(`İşlem "${transaction.status}" durumunda reddedilemez.`),
						{ statusCode: 400 },
					);
				}
				if (!transaction.balanceDebitedAt) {
					throw new FluxAdminError(
						"Çekim bakiyesi talep sırasında rezerve edilmemiş.",
						409,
						"WITHDRAW_BALANCE_NOT_RESERVED",
					);
				}
				if (transaction.balanceRefundedAt) {
					throw new FluxAdminError(
						"Çekim bakiyesi daha önce iade edilmiş.",
						409,
						"WITHDRAW_BALANCE_ALREADY_REFUNDED",
					);
				}

				const user = await User.findById(transaction.user).session(session);
				if (!user) throw Object.assign(new Error("Kullanıcı bulunamadı."), { statusCode: 404 });

				const newBalance = await updateUserBalance(user, transaction.amount, {
					emitSocket: false,
					session,
				});
				if (newBalance === false) throw new Error("Bakiye iade edilemedi.");

				transaction.status = "rejected";
				transaction.providerStatus = "admin_rejected";
				transaction.newBalance = Number(newBalance);
				transaction.rejectedAt = new Date();
				transaction.balanceRefundedAt = new Date();
				transaction.rejectionReason =
					String(req.body.reason || "").trim().slice(0, 500) ||
					"Admin tarafından reddedildi.";
				await transaction.save({ session });
				userToEmit = user;
			});

			if (userToEmit) emitUserBalance(null, userToEmit);
			res.json({
				success: true,
				message: "Çekim talebi reddedildi ve bakiye iade edildi.",
				data: {
					_id: transaction._id,
					externalTransactionId: transaction.externalTransactionId,
					status: transaction.status,
				},
			});
		} catch (error) {
			console.error("FluxKripto withdraw reject hatası:", error.message);
			const response = {
				success: false,
				error: error.statusCode
					? error.message
					: "Çekim reddedilirken hata oluştu.",
			};
			if (error instanceof FluxAdminError && error.code) {
				response.code = error.code;
			}
			res.status(error.statusCode || 500).json(response);
		} finally {
			await session.endSession();
		}
	},
);

module.exports = router;
