const mongoose = require("mongoose");

const User = require("../database/models/User");
const SiteSettings = require("../database/models/SiteSettings");
const XPaymentTransaction = require("../database/models/XPaymentTransaction");
const {
	FINAL_XPAYMENTS_STATUSES,
	formatXPaymentsAmount,
	mapXPaymentsStatus,
	normalizeXPaymentsProviderAmount,
	normalizeXPaymentsSettings,
} = require("../utils/xPayments");
const {
	emitUserBalance,
	getActiveWallet,
	updateUserBalance,
} = require("../utils/wallet");

class XPaymentsServiceError extends Error {
	constructor(message, statusCode = 400, code = "XPAYMENTS_ERROR") {
		super(message);
		this.name = "XPaymentsServiceError";
		this.statusCode = statusCode;
		this.code = code;
	}
}

const getStoredSettings = (siteSettings) => {
	const stored = siteSettings?.xPayments;
	if (!stored) return {};
	return typeof stored.toObject === "function" ? stored.toObject() : stored;
};

const getXPaymentsSettings = async ({
	requireActive = false,
	requireCredentials = false,
} = {}) => {
	const siteSettings = await SiteSettings.findOne();
	const settings = normalizeXPaymentsSettings(getStoredSettings(siteSettings));

	if (requireActive && !settings.isActive) {
		throw new XPaymentsServiceError(
			"XPayment şu anda aktif değil.",
			400,
			"PROVIDER_INACTIVE",
		);
	}

	if (requireCredentials && (!settings.apiKey || !settings.secretKey)) {
		throw new XPaymentsServiceError(
			"XPayment API bilgileri yapılandırılmamış.",
			400,
			"PROVIDER_NOT_CONFIGURED",
		);
	}

	return settings;
};

const sanitizeXPaymentsSettings = (settings, callbackUrl = "") => {
	const normalized = normalizeXPaymentsSettings(settings);
	return {
		isActive: normalized.isActive,
		name: normalized.name,
		logo: normalized.logo,
		minAmount: normalized.minAmount,
		maxAmount: normalized.maxAmount,
		currency: "TRY",
		apiUrl: normalized.apiUrl,
		methods: normalized.methods,
		apiKeyConfigured: Boolean(normalized.apiKey),
		secretKeyConfigured: Boolean(normalized.secretKey),
		callbackUrl,
	};
};

const createPendingXPaymentsWithdraw = async ({
	userId,
	providerUserId,
	externalTransactionId,
	amount,
	accountHolder,
	iban,
	metadata,
}) => {
	const session = await mongoose.startSession();
	let createdTransaction = null;
	let userToEmit = null;

	try {
		await session.withTransaction(async () => {
			userToEmit = null;
			const user = await User.findById(userId).session(session);
			if (!user) {
				throw new XPaymentsServiceError(
					"Kullanıcı bulunamadı.",
					404,
					"USER_NOT_FOUND",
				);
			}

			const activeWallet = getActiveWallet(user);
			const currentBalance = Number(activeWallet?.balance || 0);
			if (!activeWallet || currentBalance < amount) {
				throw new XPaymentsServiceError(
					"Yetersiz bakiye.",
					400,
					"INSUFFICIENT_BALANCE",
				);
			}

			const transaction = new XPaymentTransaction({
				user: user._id,
				providerUserId,
				externalTransactionId,
				type: "withdraw",
				amount,
				requestedAmount: amount,
				providerAmount: null,
				currency: "TRY",
				status: "pending",
				providerStatus: "",
				withdrawal: { accountHolder, iban },
				oldBalance: currentBalance,
				newBalance: currentBalance,
				metadata,
			});
			await transaction.save({ session });

			const newBalance = await updateUserBalance(user, -amount, {
				emitSocket: false,
				session,
			});
			if (newBalance === false) {
				throw new XPaymentsServiceError(
					"Bakiye güncellenemedi.",
					500,
					"BALANCE_UPDATE_FAILED",
				);
			}

			transaction.newBalance = newBalance;
			transaction.balanceDebitedAt = new Date();
			createdTransaction = await transaction.save({ session });
			userToEmit = user;
		});

		if (userToEmit) emitUserBalance(null, userToEmit);
		return createdTransaction;
	} finally {
		await session.endSession();
	}
};

const applyXPaymentsStatus = async (
	transactionObjectId,
	providerStatus,
	payload = {},
	options = {},
) => {
	const mappedStatus =
		options.normalizedStatus || mapXPaymentsStatus(providerStatus);
	if (!mappedStatus) {
		throw new XPaymentsServiceError(
			"XPayment işlem durumu tanınmıyor.",
			400,
			"UNKNOWN_PROVIDER_STATUS",
		);
	}

	const session = await mongoose.startSession();
	let updatedTransaction = null;
	let userToEmit = null;
	let alreadyFinal = false;
	let amountAdjustment = null;

	try {
		await session.withTransaction(async () => {
			userToEmit = null;
			amountAdjustment = null;
			const transaction = await XPaymentTransaction.findById(
				transactionObjectId,
			).session(session);
			if (!transaction) {
				throw new XPaymentsServiceError(
					"İşlem bulunamadı.",
					404,
					"TRANSACTION_NOT_FOUND",
				);
			}

			const hasProviderAmount = Object.prototype.hasOwnProperty.call(
				options,
				"providerAmount",
			);
			let providerAmount = null;
			if (hasProviderAmount) {
				if (transaction.type !== "deposit") {
					throw new XPaymentsServiceError(
						"Provider tutarı yalnızca XPayment yatırımlarında uygulanabilir.",
						400,
						"INVALID_PROVIDER_AMOUNT_TARGET",
					);
				}
				try {
					providerAmount = normalizeXPaymentsProviderAmount(
						options.providerAmount,
					);
				} catch {
					throw new XPaymentsServiceError(
						"XPayment provider tutarı geçersiz.",
						400,
						"INVALID_PROVIDER_AMOUNT",
					);
				}
			}

			const isFinalWithdrawTransition =
				transaction.type === "withdraw" &&
				["approved", "rejected", "cancelled", "failed"].includes(
					mappedStatus,
				);
			if (isFinalWithdrawTransition && !transaction.balanceDebitedAt) {
				throw new XPaymentsServiceError(
					"XPayment çekim bakiyesi talep sırasında rezerve edilmemiş.",
					409,
					"WITHDRAW_BALANCE_NOT_RESERVED",
				);
			}
			if (
				isFinalWithdrawTransition &&
				mappedStatus === "approved" &&
				transaction.balanceRefundedAt
			) {
				throw new XPaymentsServiceError(
					"İade edilmiş XPayment çekimi onaylanamaz.",
					409,
					"WITHDRAW_BALANCE_ALREADY_REFUNDED",
				);
			}

			if (FINAL_XPAYMENTS_STATUSES.has(transaction.status)) {
				if (
					hasProviderAmount &&
					formatXPaymentsAmount(
						transaction.providerAmount ?? transaction.amount,
					) !== formatXPaymentsAmount(providerAmount)
				) {
					throw new XPaymentsServiceError(
						"Final XPayment işlem tutarı provider tutarıyla eşleşmiyor.",
						409,
						"FINAL_AMOUNT_MISMATCH",
					);
				}
				alreadyFinal = true;
				const finalResponseData = payload?.data || payload || {};
				let shouldSaveFinal = false;
				if (hasProviderAmount && transaction.providerAmount == null) {
					if (transaction.requestedAmount == null) {
						transaction.requestedAmount = transaction.amount;
					}
					transaction.providerAmount = providerAmount;
					shouldSaveFinal = true;
				}
				if (transaction.isProcessing) {
					transaction.isProcessing = false;
					shouldSaveFinal = true;
				}
				if (options.persistCallbackRawData) {
					transaction.callbackRawData =
						options.callbackRawData || payload || {};
					shouldSaveFinal = true;
				}
				if (
					!transaction.financeId &&
					finalResponseData.finance_id !== undefined
				) {
					transaction.financeId = String(finalResponseData.finance_id);
					shouldSaveFinal = true;
				}
				updatedTransaction = shouldSaveFinal
					? await transaction.save({ session })
					: transaction;
				return;
			}

			if (
				Array.isArray(options.allowedCurrentStatuses) &&
				!options.allowedCurrentStatuses.includes(transaction.status)
			) {
				throw new XPaymentsServiceError(
					`İşlem "${transaction.status}" durumunda güncellenemez.`,
					409,
					"INVALID_STATUS_TRANSITION",
				);
			}

			const responseData = payload?.data || payload || {};
			if (hasProviderAmount) {
				const previousAmount = transaction.amount;
				if (transaction.requestedAmount == null) {
					transaction.requestedAmount = previousAmount;
				}
				transaction.providerAmount = providerAmount;
				transaction.amount = providerAmount;
				if (
					formatXPaymentsAmount(previousAmount) !==
					formatXPaymentsAmount(providerAmount)
				) {
					amountAdjustment = {
						externalTransactionId: transaction.externalTransactionId,
						source: String(options.amountSource || "provider"),
						requestedAmount: transaction.requestedAmount,
						providerAmount,
					};
				}
			}
			transaction.status = mappedStatus;
			transaction.providerStatus = String(providerStatus || "").toLowerCase();
			transaction.providerResponse = payload || {};
			if (options.submissionState) {
				transaction.submissionState = options.submissionState;
			}
			if (options.persistCallbackRawData) {
				transaction.callbackRawData = options.callbackRawData || payload || {};
			}
			if (responseData.finance_id !== undefined) {
				transaction.financeId = String(responseData.finance_id);
			}
			transaction.isProcessing =
				mappedStatus === "processing" &&
				responseData.is_processing !== undefined
					? Boolean(responseData.is_processing)
					: false;
			if (options.lastCheckedAt) {
				transaction.lastCheckedAt = options.lastCheckedAt;
			}

			if (mappedStatus === "approved" && transaction.type === "deposit") {
				const user = await User.findById(transaction.user).session(session);
				if (!user) {
					throw new XPaymentsServiceError(
						"Kullanıcı bulunamadı.",
						404,
						"USER_NOT_FOUND",
					);
				}

				if (!transaction.balanceCreditedAt) {
					const newBalance = await updateUserBalance(user, transaction.amount, {
						emitSocket: false,
						session,
					});
					if (newBalance === false) {
						throw new XPaymentsServiceError(
							"Bakiye güncellenemedi.",
							500,
							"BALANCE_UPDATE_FAILED",
						);
					}
					transaction.newBalance = newBalance;
					transaction.balanceCreditedAt = new Date();
					userToEmit = user;
				}

				if (!transaction.statsAppliedAt) {
					await User.updateOne(
						{ _id: transaction.user },
						{ $inc: { "stats.deposit": transaction.amount } },
						{ session },
					);
					transaction.statsAppliedAt = new Date();
				}
			}

			if (mappedStatus === "approved" && transaction.type === "withdraw") {
				if (!transaction.statsAppliedAt) {
					await User.updateOne(
						{ _id: transaction.user },
						{ $inc: { "stats.withdraw": transaction.amount } },
						{ session },
					);
					transaction.statsAppliedAt = new Date();
				}
			}

			if (
				["rejected", "cancelled", "failed"].includes(mappedStatus) &&
				transaction.type === "withdraw" &&
				!transaction.balanceRefundedAt
			) {
				const user = await User.findById(transaction.user).session(session);
				if (!user) {
					throw new XPaymentsServiceError(
						"Kullanıcı bulunamadı.",
						404,
						"USER_NOT_FOUND",
					);
				}

				const newBalance = await updateUserBalance(user, transaction.amount, {
					emitSocket: false,
					session,
				});
				if (newBalance === false) {
					throw new XPaymentsServiceError(
						"Bakiye iade edilemedi.",
						500,
						"BALANCE_REFUND_FAILED",
					);
				}
				transaction.newBalance = newBalance;
				transaction.balanceRefundedAt = new Date();
				userToEmit = user;
			}

			const now = new Date();
			if (mappedStatus === "approved") transaction.approvedAt = now;
			if (mappedStatus === "rejected") transaction.rejectedAt = now;
			if (mappedStatus === "cancelled") transaction.cancelledAt = now;
			if (mappedStatus === "failed") transaction.failedAt = now;
			if (["rejected", "cancelled", "failed"].includes(mappedStatus)) {
				transaction.rejectionReason =
					options.rejectionReason ||
					payload?.message ||
					payload?.error ||
					transaction.rejectionReason;
			}

			updatedTransaction = await transaction.save({ session });
		});

		if (amountAdjustment) {
			console.info(
				"XPayment deposit amount adjusted:",
				JSON.stringify(amountAdjustment),
			);
		}
		if (userToEmit) emitUserBalance(null, userToEmit);
		return { transaction: updatedTransaction, alreadyFinal };
	} finally {
		await session.endSession();
	}
};

module.exports = {
	XPaymentsServiceError,
	applyXPaymentsStatus,
	createPendingXPaymentsWithdraw,
	getXPaymentsSettings,
	sanitizeXPaymentsSettings,
};
