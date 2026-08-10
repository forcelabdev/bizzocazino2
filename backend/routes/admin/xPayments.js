const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");

const User = require("../../database/models/User");
const SiteSettings = require("../../database/models/SiteSettings");
const XPaymentTransaction = require("../../database/models/XPaymentTransaction");
const { checkPermission } = require("../../middleware/permission");
const {
	XPAYMENTS_ENDPOINTS,
	classifyXPaymentsCancelResponse,
	createXPaymentsHeaders,
	formatXPaymentsAmount,
	generateXPaymentsCancelHash,
	generateXPaymentsWithdrawHash,
	getXPaymentsErrorMessage,
	isDefinitiveXPaymentsHttpFailure,
	normalizeXPaymentsSettings,
} = require("../../utils/xPayments");
const {
	XPaymentsServiceError,
	applyXPaymentsStatus,
	getXPaymentsSettings,
	sanitizeXPaymentsSettings,
} = require("../../services/xPaymentsService");

const router = express.Router();

const getCallbackUrl = () => {
	const baseUrl = String(process.env.SERVER_BACKEND_URL || "").replace(/\/+$/, "");
	return baseUrl ? `${baseUrl}/payment/xpayments/callback` : "/payment/xpayments/callback";
};

const sendError = (res, error, fallback) => {
	const statusCode =
		error instanceof XPaymentsServiceError
			? error.statusCode
			: error?.response?.status >= 400 && error?.response?.status < 500
				? error.response.status
				: error?.response
					? 502
					: 500;
	const response = {
		success: false,
		error: getXPaymentsErrorMessage(error, fallback),
	};
	if (error instanceof XPaymentsServiceError && error.code) {
		response.code = error.code;
	}
	return res.status(statusCode).json(response);
};

const serializeAction = (transaction, extra = {}) => ({
	transactionId: transaction._id,
	externalTransactionId: transaction.externalTransactionId,
	financeId: transaction.financeId || null,
	status: transaction.status,
	isProcessing: Boolean(transaction.isProcessing),
	...extra,
});

const escapeRegex = (value) =>
	String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const requireBoolean = (value, fieldName) => {
	if (typeof value !== "boolean") {
		throw new XPaymentsServiceError(fieldName + " boolean olmalıdır.");
	}
	return value;
};

const validateSettingsUpdate = (currentSettings, body = {}) => {
	const next = normalizeXPaymentsSettings(currentSettings);

	if (body.name !== undefined) next.name = String(body.name).trim();
	if (body.logo !== undefined) next.logo = String(body.logo).trim();
	if (body.isActive !== undefined) {
		next.isActive = requireBoolean(body.isActive, "isActive");
	}
	if (body.minAmount !== undefined) next.minAmount = Number(body.minAmount);
	if (body.maxAmount !== undefined) next.maxAmount = Number(body.maxAmount);
	if (body.apiUrl !== undefined) {
		next.apiUrl = String(body.apiUrl).trim().replace(/\/+$/, "");
	}
	if (body.methods !== undefined) {
		if (!body.methods || typeof body.methods !== "object") {
			throw new XPaymentsServiceError("methods bir nesne olmalıdır.");
		}
		next.methods = {
			...next.methods,
			...(body.methods.deposit !== undefined
				? {
					deposit: requireBoolean(
						body.methods.deposit,
						"methods.deposit",
					),
				}
				: {}),
			...(body.methods.withdraw !== undefined
				? {
					withdraw: requireBoolean(
						body.methods.withdraw,
						"methods.withdraw",
					),
				}
				: {}),
		};
	}
	if (typeof body.apiKey === "string" && body.apiKey.trim()) {
		next.apiKey = body.apiKey.trim();
	}
	if (typeof body.secretKey === "string" && body.secretKey.trim()) {
		next.secretKey = body.secretKey.trim();
	}

	if (!next.name) {
		throw new XPaymentsServiceError("Sağlayıcı adı zorunludur.");
	}
	if (
		!Number.isFinite(next.minAmount) ||
		next.minAmount <= 0 ||
		!Number.isFinite(next.maxAmount) ||
		next.maxAmount < next.minAmount
	) {
		throw new XPaymentsServiceError(
			"Minimum ve maksimum tutar aralığı geçersiz.",
		);
	}
	try {
		const parsedUrl = new URL(next.apiUrl);
		if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
	} catch {
		throw new XPaymentsServiceError("API URL geçerli bir HTTP(S) adresi olmalıdır.");
	}
	if (next.isActive && (!next.apiKey || !next.secretKey)) {
		throw new XPaymentsServiceError(
			"Aktifleştirmek için API key ve secret key gereklidir.",
		);
	}

	return { ...next, currency: "TRY" };
};

router.get("/settings", checkPermission("platform.read"), async (req, res) => {
	try {
		const settings = await getXPaymentsSettings();
		return res.json({
			success: true,
			data: sanitizeXPaymentsSettings(settings, getCallbackUrl()),
		});
	} catch (error) {
		console.error("XPayment admin settings GET error:", error.message);
		return sendError(res, error, "XPayment ayarları alınamadı.");
	}
});

router.put("/settings", checkPermission("platform.update"), async (req, res) => {
	try {
		let siteSettings = await SiteSettings.findOne();
		if (!siteSettings) siteSettings = new SiteSettings();
		const stored = siteSettings.xPayments?.toObject
			? siteSettings.xPayments.toObject()
			: siteSettings.xPayments || {};
		const settings = validateSettingsUpdate(stored, req.body || {});

		siteSettings.xPayments = settings;
		siteSettings.markModified("xPayments");
		await siteSettings.save();

		return res.json({
			success: true,
			message: "XPayment ayarları güncellendi.",
			data: sanitizeXPaymentsSettings(settings, getCallbackUrl()),
		});
	} catch (error) {
		console.error("XPayment admin settings PUT error:", error.message);
		return sendError(res, error, "XPayment ayarları güncellenemedi.");
	}
});

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
					{ financeId: regex },
					{ "account.bankName": regex },
					{ "account.iban": regex },
					{ "withdrawal.accountHolder": regex },
					{ "withdrawal.iban": regex },
					...(users.length ? [{ user: { $in: users.map((user) => user._id) } }] : []),
				];
			}

			const skip = (page - 1) * itemsPerPage;
			const monthStart = new Date(
				new Date().getFullYear(),
				new Date().getMonth(),
				1,
			);
			const [transactions, total, statsRows] = await Promise.all([
				XPaymentTransaction.find(query)
					.populate("user", "username local.email phone avatar")
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(itemsPerPage)
					.lean(),
				XPaymentTransaction.countDocuments(query),
				XPaymentTransaction.aggregate([
					{ $match: query },
					{
						$facet: {
							totalAmount: [
								{ $match: { status: "approved" } },
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							last24hAmount: [
								{
									$match: {
										status: "approved",
										createdAt: {
											$gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
										},
									},
								},
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							monthlyAmount: [
								{ $match: { status: "approved", createdAt: { $gte: monthStart } } },
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
			const stats = statsRows[0] || {};

			return res.json({
				success: true,
				data: {
					transactions,
					total,
					page,
					itemsPerPage,
					totalPages: Math.ceil(total / itemsPerPage),
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
			console.error("XPayment admin transactions error:", error.message);
			return sendError(res, error, "XPayment işlemleri alınamadı.");
		}
	},
);

router.post(
	"/withdraw/:id/approve",
	checkPermission("finance.withdraws.manage"),
	async (req, res) => {
		let transaction;
		try {
			if (!mongoose.isValidObjectId(req.params.id)) {
				throw new XPaymentsServiceError("Geçersiz işlem kimliği.", 400);
			}
			const settings = await getXPaymentsSettings({
				requireActive: true,
				requireCredentials: true,
			});
			if (!settings.methods.withdraw) {
				throw new XPaymentsServiceError("XPayment çekim yöntemi aktif değil.");
			}

			transaction = await XPaymentTransaction.findOneAndUpdate(
				{
					_id: req.params.id,
					type: "withdraw",
					status: "pending",
					submissionState: { $in: ["not_submitted", "failed"] },
					balanceDebitedAt: { $ne: null },
					balanceRefundedAt: null,
				},
				{
					$set: {
						status: "processing",
						providerStatus: "submitting",
						submissionState: "submitting",
						submissionAttemptedAt: new Date(),
					},
				},
				{ new: true },
			);
			if (!transaction) {
				const current = await XPaymentTransaction.findById(req.params.id);
				if (!current) {
					throw new XPaymentsServiceError("İşlem bulunamadı.", 404);
				}
				if (!current.balanceDebitedAt) {
					throw new XPaymentsServiceError(
						"Çekim bakiyesi talep sırasında rezerve edilmemiş.",
						409,
						"WITHDRAW_BALANCE_NOT_RESERVED",
					);
				}
				if (current.balanceRefundedAt) {
					throw new XPaymentsServiceError(
						"İade edilmiş çekim talebi onaylanamaz.",
						409,
						"WITHDRAW_BALANCE_ALREADY_REFUNDED",
					);
				}
				throw new XPaymentsServiceError(
					`İşlem "${current.status}" durumunda onaylanamaz.`,
					409,
				);
			}

			const customer = transaction.metadata?.customer || {};
			const providerUserId = String(
				transaction.providerUserId ||
					customer.providerUserId ||
					transaction.user,
			);
			const formattedAmount = formatXPaymentsAmount(transaction.amount);
			const payload = {
				transaction: {
					transaction_id: transaction.externalTransactionId,
					user_id: providerUserId,
					username: String(customer.username || ""),
					fullname: String(customer.fullname || customer.username || ""),
					receiver_account_holder_name:
						transaction.withdrawal?.accountHolder || "",
					receiver_iban: transaction.withdrawal?.iban || "",
					amount: Number(formattedAmount),
					hash: generateXPaymentsWithdrawHash({
						transactionId: transaction.externalTransactionId,
						userId: providerUserId,
						iban: transaction.withdrawal?.iban,
						amount: transaction.amount,
						secretKey: settings.secretKey,
					}),
				},
			};

			let rawResponse;
			try {
				const response = await axios.post(
					`${settings.apiUrl}${XPAYMENTS_ENDPOINTS.withdraw}`,
					payload,
					{
						headers: createXPaymentsHeaders(settings.apiKey),
						timeout: 30000,
					},
				);
				rawResponse = response.data || {};
				if (!rawResponse.status) {
					throw new XPaymentsServiceError(
						rawResponse.message || rawResponse.error || "XPayment çekimi reddetti.",
						400,
					);
				}
				if (
					!rawResponse.data ||
					rawResponse.data.finance_id === null ||
					rawResponse.data.finance_id === undefined
				) {
					throw new XPaymentsServiceError(
						"XPayment başarılı cevap verip işlem verilerini eksik döndürdü.",
						502,
						"UPSTREAM_RESPONSE_MISMATCH",
					);
				}
				if (
					String(rawResponse.data.transaction_id || "") !==
					transaction.externalTransactionId
				) {
					throw new XPaymentsServiceError(
						"XPayment farklı bir işlem kimliği döndürdü.",
						502,
						"UPSTREAM_RESPONSE_MISMATCH",
					);
				}
			} catch (error) {
				const definitiveFailure =
					(error instanceof XPaymentsServiceError &&
						error.code !== "UPSTREAM_RESPONSE_MISMATCH") ||
					isDefinitiveXPaymentsHttpFailure(error.response?.status);
				if (definitiveFailure) {
					const providerResponse =
						error.response?.data || rawResponse || {
							error: error.message,
						};
					await applyXPaymentsStatus(
						transaction._id,
						"reject",
						providerResponse,
						{
							normalizedStatus: "rejected",
							allowedCurrentStatuses: ["processing"],
							rejectionReason: getXPaymentsErrorMessage(
								error,
								"XPayment çekim talebini reddetti.",
							),
							submissionState: "failed",
						},
					);
					throw error;
				}
				await XPaymentTransaction.updateOne(
					{
						_id: transaction._id,
						status: "processing",
						submissionState: "submitting",
					},
					{
						$set: {
							status: "processing",
							providerStatus: "unknown",
							submissionState: "unknown",
							providerResponse:
								error.response?.data || rawResponse || {},
						},
					},
				);
				throw error;
			}

			await XPaymentTransaction.updateOne(
				{ _id: transaction._id },
				{
					$set: {
						financeId:
							rawResponse.data.finance_id !== undefined
								? String(rawResponse.data.finance_id)
								: transaction.financeId,
						providerResponse: rawResponse,
						submissionState: "submitted",
						submittedAt: transaction.submittedAt || new Date(),
					},
				},
			);
			await XPaymentTransaction.updateOne(
				{
					_id: transaction._id,
					status: { $nin: ["approved", "rejected", "cancelled", "failed"] },
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
				message: "Çekim talebi onaylandı ve XPayment'e iletildi.",
				data: serializeAction(transaction),
			});
		} catch (error) {
			console.error(
				"XPayment admin approve error:",
				error.response?.data || error.message,
			);
			return sendError(res, error, "XPayment çekimi onaylanamadı.");
		}
	},
);

router.post(
	"/withdraw/:id/reject",
	checkPermission("finance.withdraws.manage"),
	async (req, res) => {
		try {
			const current = await XPaymentTransaction.findById(req.params.id);
			if (!current) {
				throw new XPaymentsServiceError("İşlem bulunamadı.", 404);
			}
			if (
				current.type !== "withdraw" ||
				current.status !== "pending" ||
				!["not_submitted", "failed"].includes(current.submissionState)
			) {
				throw new XPaymentsServiceError(
					`İşlem "${current.status}" durumunda reddedilemez.`,
					409,
				);
			}
			const result = await applyXPaymentsStatus(
				current._id,
				"reject",
				{ message: req.body?.reason || "Admin tarafından reddedildi." },
				{
					normalizedStatus: "rejected",
					allowedCurrentStatuses: ["pending"],
					rejectionReason: req.body?.reason || "Admin tarafından reddedildi.",
				},
			);
			if (result.alreadyFinal) {
				throw new XPaymentsServiceError("İşlem artık reddedilebilir durumda değil.", 409);
			}
			return res.json({
				success: true,
				message: "Çekim talebi reddedildi ve bakiye iade edildi.",
				data: serializeAction(result.transaction),
			});
		} catch (error) {
			console.error("XPayment admin reject error:", error.message);
			return sendError(res, error, "XPayment çekimi reddedilemedi.");
		}
	},
);

router.post(
	"/withdraw/:id/cancel",
	checkPermission("finance.withdraws.manage"),
	async (req, res) => {
		try {
			const transaction = await XPaymentTransaction.findById(req.params.id);
			if (!transaction) {
				throw new XPaymentsServiceError("İşlem bulunamadı.", 404);
			}
			if (transaction.type !== "withdraw") {
				throw new XPaymentsServiceError("Bu işlem bir çekim değildir.");
			}
			if (transaction.status === "cancelled") {
				return res.json({
					success: true,
					message: "Çekim talebi zaten iptal edilmiş.",
					data: serializeAction(transaction, { alreadyCancelled: true }),
				});
			}
			if (transaction.status !== "processing") {
				throw new XPaymentsServiceError(
					`İşlem "${transaction.status}" durumunda iptal edilemez.`,
					409,
				);
			}

			const settings = await getXPaymentsSettings({ requireCredentials: true });
			const payload = {
				transaction_id: transaction.externalTransactionId,
				hash: generateXPaymentsCancelHash({
					transactionId: transaction.externalTransactionId,
					secretKey: settings.secretKey,
				}),
			};
			let rawResponse;
			try {
				const response = await axios.post(
					`${settings.apiUrl}${XPAYMENTS_ENDPOINTS.cancelWithdraw}`,
					payload,
					{
						headers: createXPaymentsHeaders(settings.apiKey),
						timeout: 30000,
					},
				);
				rawResponse = response.data || {};
			} catch (error) {
				if (error.response?.status === 409) {
					const outcome = classifyXPaymentsCancelResponse(
						error.response.status,
						error.response.data,
					);
					return res.status(409).json({
						success: false,
						error:
							error.response.data?.error ||
							error.response.data?.message ||
							"XPayment çekimi şu anda iptal edilemiyor.",
						data: {
							isProcessing: outcome.isProcessing,
						},
					});
				}
				throw error;
			}

			const cancelOutcome = classifyXPaymentsCancelResponse(200, rawResponse);
			if (!cancelOutcome.canApply) {
				return res.status(409).json({
					success: false,
					error:
						rawResponse.error ||
						rawResponse.message ||
						"XPayment çekimi şu anda iptal edilemiyor.",
					data: { isProcessing: cancelOutcome.isProcessing },
				});
			}

			const result = await applyXPaymentsStatus(
				transaction._id,
				"cancelled",
				rawResponse,
				{
					normalizedStatus: "cancelled",
					allowedCurrentStatuses: ["processing"],
					rejectionReason: rawResponse.message || "XPayment çekimi iptal edildi.",
				},
			);
			if (
				result.alreadyFinal &&
				result.transaction.status !== "cancelled"
			) {
				throw new XPaymentsServiceError(
					`İşlem "${result.transaction.status}" durumuna geçti; iptal uygulanmadı.`,
					409,
				);
			}

			return res.json({
				success: true,
				message: rawResponse.message || "Çekim talebi iptal edildi ve bakiye iade edildi.",
				data: serializeAction(result.transaction, {
					alreadyCancelled: cancelOutcome.alreadyCancelled,
				}),
			});
		} catch (error) {
			console.error(
				"XPayment admin cancel error:",
				error.response?.data || error.message,
			);
			return sendError(res, error, "XPayment çekimi iptal edilemedi.");
		}
	},
);

module.exports = router;
