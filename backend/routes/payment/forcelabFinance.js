const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const router = express.Router();

const User = require("../../database/models/User");
const SiteSettings = require("../../database/models/SiteSettings");
const ForcelabFinanceTransaction = require("../../database/models/ForcelabFinanceTransaction");
const { authorizeUser } = require("../../middleware/auth");
const { updateUserBalance, getActiveWallet, emitUserBalance } = require("../../utils/wallet");
const {
	createAuthHeaders,
	fromSmallestUnit,
	generateExternalTransactionId,
	mapForcelabStatus,
	toSmallestUnit,
	verifyWebhookSignature,
} = require("../../utils/forcelabFinance");

const getSettings = async (requireActive = true) => {
	let siteSettings = await SiteSettings.findOne();
	if (!siteSettings) {
		siteSettings = new SiteSettings();
		await siteSettings.save();
	}

	const settings = siteSettings.forcelabFinance || {};
	if (requireActive && !settings.isActive) {
		throw new Error("Forcelab Finance şu anda aktif değil.");
	}

	if (requireActive && !settings.apiKey) {
		throw new Error("Forcelab Finance API anahtarı yapılandırılmamış.");
	}

	if (requireActive && !settings.webhookSecret) {
		throw new Error("Forcelab Finance webhook secret yapılandırılmamış.");
	}

	return {
		name: "Forcelab Finance",
		logo: "https://financeforcalabs.com/favicon.ico",
		minAmount: 100,
		maxAmount: 100000,
		currency: "TRY",
		apiUrl: "https://financeforcalabs.com/api/v1",
		...settings,
	};
};

const createClient = (settings) =>
	axios.create({
		baseURL: settings.apiUrl,
		headers: createAuthHeaders(settings.apiKey),
		timeout: 30000,
	});

const sanitizeProvider = (provider, currency) => ({
	slug: provider.slug,
	name: provider.name,
	type: provider.type,
	minAmount:
		typeof provider.min_amount === "number"
			? fromSmallestUnit(provider.min_amount, currency)
			: null,
	maxAmount:
		typeof provider.max_amount === "number"
			? fromSmallestUnit(provider.max_amount, currency)
			: null,
	isActive: provider.is_active !== false,
});

const getProviderKind = (providerSlug = "") => {
	const normalizedSlug = String(providerSlug).trim().toLowerCase();
	if (normalizedSlug.includes("crypto")) return "manual-crypto";
	if (normalizedSlug.includes("bank") || normalizedSlug.includes("havale")) return "bank-transfer";
	return "generic";
};

const normalizeManualAccount = (account, currency) => ({
	kind: account.address || account.wallet_name || account.network ? "manual-crypto" : "bank-transfer",
	accountName: account.account_name || "",
	iban: account.iban || "",
	bankName: account.bank_name || "",
	walletName: account.wallet_name || "",
	address: account.address || "",
	network: account.network || "",
	type: account.type || "deposit",
	minAmount:
		typeof account.min_amount === "number"
			? fromSmallestUnit(account.min_amount, currency)
			: null,
	maxAmount:
		typeof account.max_amount === "number"
			? fromSmallestUnit(account.max_amount, currency)
			: null,
	note: account.note || "",
	isActive: account.is_active !== false,
	accountHash: account.account_hash || "",
});

const resolveProviderList = async (settings) => {
	const client = createClient(settings);
	const response = await client.get("/providers");
	// Laravel wraps collections in { data: [...] }, axios puts HTTP body in response.data
	const raw = response.data;
	const providers = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];

	return providers
		.filter((provider) => provider && provider.is_active !== false)
		.map((provider) => sanitizeProvider(provider, settings.currency));
};

const PENDING_WITHDRAW_UUID_PREFIX = "pending-withdraw:";

const createPendingWithdrawUuid = (externalTransactionId) =>
	`${PENDING_WITHDRAW_UUID_PREFIX}${externalTransactionId}`;

const isPendingWithdrawUuid = (uuid) =>
	typeof uuid === "string" && uuid.startsWith(PENDING_WITHDRAW_UUID_PREFIX);

const getPublicTransactionUuid = (transaction) => {
	if (!transaction?.uuid) return null;

	if (
		transaction.providerType === "withdraw" &&
		(transaction.status === "pending" || isPendingWithdrawUuid(transaction.uuid))
	) {
		return null;
	}

	return transaction.uuid;
};

const FINAL_TRANSACTION_STATUSES = new Set([
	"approved",
	"rejected",
	"cancelled",
	"failed",
	"expired",
]);

const WITHDRAW_REVERT_STATUSES = new Set([
	"rejected",
	"cancelled",
	"failed",
	"expired",
]);

const toDateOrNull = (value) => {
	if (!value) return null;
	const dateValue = new Date(value);
	return Number.isNaN(dateValue.getTime()) ? null : dateValue;
};

const applyTransactionStatus = async (
	transactionId,
	nextStatus,
	payload = {},
	options = {}
) => {
	const { persistCallbackRawData = true, lastCheckedAt = null } = options;
	const mappedStatus = mapForcelabStatus(nextStatus);
	const session = await mongoose.startSession();
	let userToEmit = null;
	let updatedTransaction = null;

	try {
		await session.withTransaction(async () => {
			const transaction = await ForcelabFinanceTransaction.findById(transactionId).session(session);

			if (!transaction) {
				throw new Error("İşlem bulunamadı.");
			}

			const previousStatus = transaction.status;

			if (FINAL_TRANSACTION_STATUSES.has(previousStatus)) {
				updatedTransaction = transaction;
				return;
			}

			transaction.status = mappedStatus;
			transaction.providerResponse = payload;

			if (persistCallbackRawData) {
				transaction.callbackRawData = payload;
			}

			if (lastCheckedAt) {
				transaction.lastCheckedAt = lastCheckedAt;
			}

			if (payload.provider_slug) {
				transaction.providerSlug = payload.provider_slug;
			}

			if (payload.metadata) {
				transaction.metadata = { ...transaction.metadata, ...payload.metadata };
			}

			if (payload.external_transaction_id) {
				transaction.externalTransactionId = payload.external_transaction_id;
			}

			if (payload.uuid && !transaction.uuid) {
				transaction.uuid = payload.uuid;
			}

			const processedAt = toDateOrNull(payload.processed_at);
			if (processedAt) {
				transaction.processedAt = processedAt;
			}

			if (mappedStatus === "approved") {
				if (transaction.providerType !== "withdraw") {
					const user = await User.findById(transaction.user).session(session);
					if (!user) {
						throw new Error("Kullanıcı bulunamadı.");
					}

					const newBalance = await updateUserBalance(user, transaction.amount, {
						emitSocket: false,
						session,
					});

					await User.updateOne(
						{ _id: user._id },
						{ $inc: { "stats.deposit": transaction.amount } },
						{ session }
					);

					transaction.newBalance = newBalance || 0;
					userToEmit = user;
				}

				transaction.approvedAt = toDateOrNull(payload.approved_at) || processedAt || new Date();
			}

			if (WITHDRAW_REVERT_STATUSES.has(mappedStatus)) {
				if (transaction.providerType === "withdraw") {
					const user = await User.findById(transaction.user).session(session);
					if (!user) {
						throw new Error("Kullanıcı bulunamadı.");
					}

					const newBalance = await updateUserBalance(user, transaction.amount, {
						emitSocket: false,
						session,
					});
					transaction.newBalance = newBalance || 0;
					userToEmit = user;
				}

				transaction.rejectedAt =
					toDateOrNull(payload.rejected_at) || processedAt || new Date();
				transaction.rejectionReason =
					payload.reason || payload.message || payload.error || transaction.rejectionReason;
			}

			updatedTransaction = await transaction.save({ session });
		});

		if (userToEmit) {
			emitUserBalance(null, userToEmit);
		}

		return updatedTransaction;
	} finally {
		await session.endSession();
	}
};

router.get("/methods", async (req, res) => {
	try {
		const settings = await getSettings(false);
		if (!settings.isActive || !settings.apiKey) {
			return res.json({
				success: true,
				data: {
					available: false,
					name: settings.name,
					currency: settings.currency,
					methods: [],
				},
			});
		}

		const methods = await resolveProviderList(settings);

		res.json({
			success: true,
			data: {
				available: methods.length > 0,
				name: settings.name,
				logo: settings.logo,
				currency: settings.currency,
				minAmount: settings.minAmount,
				maxAmount: settings.maxAmount,
				methods,
			},
		});
	} catch (error) {
		console.error("❌ Forcelab Finance methods hatası:", error.response?.data || error.message);
		res.status(500).json({
			success: false,
			error: "Forcelab Finance ödeme yöntemleri alınamadı.",
		});
	}
});

// Bank transfer deposit prepare — hesap listesi al
router.post("/prepare", authorizeUser(true), async (req, res) => {
	try {
		const userId = req.user?._id;
		const { amount, providerSlug } = req.body;

		if (!userId) {
			return res.status(401).json({ success: false, error: "Oturum açmanız gerekiyor." });
		}

		if (!providerSlug || typeof providerSlug !== "string") {
			return res.status(400).json({ success: false, error: "providerSlug gerekli." });
		}

		if (!amount || isNaN(amount) || Number(amount) <= 0) {
			return res.status(400).json({ success: false, error: "Geçersiz tutar." });
		}

		const settings = await getSettings(true);
		const amountValue = Number(amount);
		const providerAmount = toSmallestUnit(amountValue, settings.currency);

		const client = createClient(settings);
		const response = await client.post("/deposit/prepare", {
			provider_slug: providerSlug,
			amount: providerAmount,
			currency: settings.currency,
		});

		// Laravel may wrap response in { data: {...} }
		const rawData = response.data || {};
		const data = rawData.provider_slug ? rawData : rawData.data || rawData;

		console.log("🔍 Forcelab prepare raw response:", JSON.stringify(rawData, null, 2));

		const accounts = Array.isArray(data.accounts) ? data.accounts : [];

		res.json({
			success: true,
			data: {
				providerSlug: data.provider_slug || providerSlug,
				preparationHash: data.preparation_hash || "",
				accounts: accounts.map((acc) => normalizeManualAccount(acc, settings.currency)),
			},
		});
	} catch (error) {
		console.error("❌ Forcelab Finance prepare hatası:", error.response?.data || error.message);
		const upstreamMessage =
			error.response?.data?.message || error.response?.data?.error || error.message;

		const friendlyMessages = {
			"No active bank account matched this transaction criteria.":
				"Bu işlem için uygun aktif banka hesabı bulunamadı.",
		};
		const displayMessage = friendlyMessages[upstreamMessage] || "Forcelab Finance hesap bilgileri alınamadı.";

		res.status(error.response?.status || 500).json({
			success: false,
			error: displayMessage,
		});
	}
});

router.post("/create", authorizeUser(true), async (req, res) => {
	try {
		const userId = req.user?._id;
		const { amount, providerSlug, preparationHash } = req.body;

		if (!userId) {
			return res.status(401).json({ success: false, error: "Oturum açmanız gerekiyor." });
		}

		if (!providerSlug || typeof providerSlug !== "string") {
			return res.status(400).json({ success: false, error: "providerSlug gerekli." });
		}

		if (!amount || isNaN(amount) || Number(amount) <= 0) {
			return res.status(400).json({ success: false, error: "Geçersiz tutar." });
		}

		const settings = await getSettings(true);
		const amountValue = Number(amount);

		if (amountValue < settings.minAmount) {
			return res.status(400).json({
				success: false,
				error: `Minimum yatırım tutarı: ${settings.minAmount} ${settings.currency}`,
			});
		}

		if (amountValue > settings.maxAmount) {
			return res.status(400).json({
				success: false,
				error: `Maksimum yatırım tutarı: ${settings.maxAmount} ${settings.currency}`,
			});
		}

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ success: false, error: "Kullanıcı bulunamadı." });
		}

		const providers = await resolveProviderList(settings);
		const selectedProvider = providers.find(
			(provider) => provider.slug === providerSlug && provider.isActive
		);

		if (!selectedProvider) {
			return res.status(400).json({
				success: false,
				error: "Seçilen ödeme yöntemi kullanılamıyor.",
			});
		}

		if (
			typeof selectedProvider.minAmount === "number" &&
			amountValue < selectedProvider.minAmount
		) {
			return res.status(400).json({
				success: false,
				error: `Bu yöntem için minimum tutar: ${selectedProvider.minAmount} ${settings.currency}`,
			});
		}

		if (
			typeof selectedProvider.maxAmount === "number" &&
			amountValue > selectedProvider.maxAmount
		) {
			return res.status(400).json({
				success: false,
				error: `Bu yöntem için maksimum tutar: ${selectedProvider.maxAmount} ${settings.currency}`,
			});
		}

		const externalTransactionId = generateExternalTransactionId(user._id.toString());
		const providerAmount = toSmallestUnit(amountValue, settings.currency);
		const activeWallet = getActiveWallet(user);
		const oldBalance = activeWallet?.balance || 0;

		const client = createClient(settings);
		const payload = {
			provider_slug: providerSlug,
			amount: providerAmount,
			currency: settings.currency,
			external_transaction_id: externalTransactionId,
			customer: {
				reference: user._id.toString(),
				name: user.name || user.username || "",
				username: user.username || "",
			},
			metadata: {},
		};

		// Bank transfer yöntemlerinde preparation_hash zorunlu
		if (preparationHash) {
			payload.preparation_hash = preparationHash;
		}

		const response = await client.post("/deposit", payload);
		// Laravel may wrap response in { data: {...} }
		const rawData = response.data || {};
		const data = rawData.uuid ? rawData : rawData.data || rawData;

		if (!data.uuid) {
			return res.status(400).json({
				success: false,
				error: "Forcelab Finance işlem oluşturamadı.",
			});
		}

		// metadata icinde banka hesap bilgileri gelebilir (bank transfer yontemleri icin)
		const providerMetadata = data.metadata || {};

		const transaction = await ForcelabFinanceTransaction.create({
			user: user._id,
			uuid: data.uuid,
			externalTransactionId: data.external_transaction_id || externalTransactionId,
			providerSlug: data.provider_slug || providerSlug,
			providerName: selectedProvider.name,
			providerType: data.type || selectedProvider.type || "deposit",
			amount: amountValue,
			providerAmount: data.amount || providerAmount,
			currency: data.currency || settings.currency,
			status: mapForcelabStatus(data.status),
			oldBalance,
			metadata: { customer: payload.customer, ...providerMetadata },
			providerResponse: data,
			processedAt: data.processed_at || null,
		});

		// Bank transfer yontemlerinde metadata icinde banka bilgileri doner
		const responseData = {
			transactionId: transaction._id,
			uuid: transaction.uuid,
			providerSlug: transaction.providerSlug,
			status: transaction.status,
			amount: transaction.amount,
			currency: transaction.currency,
		};

		if (providerMetadata.gateway_message) {
			responseData.gatewayMessage = providerMetadata.gateway_message;
		}

		if (providerMetadata.bank_account) {
			responseData.bankAccount = providerMetadata.bank_account;
		}

		if (providerMetadata.wallet_address) {
			responseData.walletAddress = providerMetadata.wallet_address;
		}

		res.json({
			success: true,
			message: "Forcelab Finance işlemi oluşturuldu.",
			data: responseData,
		});
	} catch (error) {
		console.error("❌ Forcelab Finance create hatası:", error.response?.data || error.message);
		const upstreamMessage =
			error.response?.data?.message || error.response?.data?.error || error.message;
		res.status(error.response?.status || 500).json({
			success: false,
			error: upstreamMessage || "Forcelab Finance işlemi başlatılamadı.",
		});
	}
});

router.get("/status/:uuid", authorizeUser(false), async (req, res) => {
	try {
		const { uuid } = req.params;
		const transaction = await ForcelabFinanceTransaction.findOne({ uuid });

		if (!transaction) {
			return res.status(404).json({ success: false, error: "İşlem bulunamadı." });
		}

		const providerUuid = getPublicTransactionUuid(transaction);

		if (
			providerUuid &&
			["pending", "processing"].includes(transaction.status) &&
			!(transaction.providerType === "withdraw" && transaction.status === "pending")
		) {
			try {
				const settings = await getSettings(true);
				const client = createClient(settings);
				const response = await client.get(`/transactions/${providerUuid}`);
				// Laravel may wrap response in { data: {...} }
				const rawStatusData = response.data || {};
				const providerData = rawStatusData.uuid ? rawStatusData : rawStatusData.data || rawStatusData;

				const refreshedTransaction = await applyTransactionStatus(
					transaction._id,
					providerData.status,
					providerData,
					{
						persistCallbackRawData: false,
						lastCheckedAt: new Date(),
					}
				);

				if (refreshedTransaction) {
					transaction.status = refreshedTransaction.status;
					transaction.metadata = refreshedTransaction.metadata;
					transaction.newBalance = refreshedTransaction.newBalance;
					transaction.processedAt = refreshedTransaction.processedAt;
					transaction.updatedAt = refreshedTransaction.updatedAt;
				}
			} catch (statusError) {
				console.warn(
					"⚠️ Forcelab Finance status upstream kontrol hatası:",
					statusError.response?.data || statusError.message
				);
			}
		}

		const statusData = {
			uuid: providerUuid,
			externalTransactionId: transaction.externalTransactionId,
			providerSlug: transaction.providerSlug,
			status: transaction.status,
			amount: transaction.amount,
			currency: transaction.currency,
			createdAt: transaction.createdAt,
			updatedAt: transaction.updatedAt,
			processedAt: transaction.processedAt || null,
		};

		if (transaction.metadata?.bank_account) {
			statusData.bankAccount = transaction.metadata.bank_account;
		}

		if (transaction.metadata?.wallet_address) {
			statusData.walletAddress = transaction.metadata.wallet_address;
		}

		if (transaction.metadata?.gateway_message) {
			statusData.gatewayMessage = transaction.metadata.gateway_message;
		}

		res.json({
			success: true,
			data: statusData,
		});
	} catch (error) {
		console.error("❌ Forcelab Finance status hatası:", error.message);
		res.status(500).json({ success: false, error: "İşlem durumu alınamadı." });
	}
});

router.post("/withdraw", authorizeUser(true), async (req, res) => {
	try {
		const userId = req.user?._id;
		const { amount, providerSlug, metadata: userMetadata } = req.body;

		if (!userId) {
			return res.status(401).json({ success: false, error: "Oturum açmanız gerekiyor." });
		}

		if (!providerSlug || typeof providerSlug !== "string") {
			return res.status(400).json({ success: false, error: "providerSlug gerekli." });
		}

		if (!amount || isNaN(amount) || Number(amount) <= 0) {
			return res.status(400).json({ success: false, error: "Geçersiz tutar." });
		}

		const settings = await getSettings(true);
		const amountValue = Number(amount);

		if (amountValue < settings.minAmount) {
			return res.status(400).json({
				success: false,
				error: `Minimum çekim tutarı: ${settings.minAmount} ${settings.currency}`,
			});
		}

		if (amountValue > settings.maxAmount) {
			return res.status(400).json({
				success: false,
				error: `Maksimum çekim tutarı: ${settings.maxAmount} ${settings.currency}`,
			});
		}

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ success: false, error: "Kullanıcı bulunamadı." });
		}

		const providers = await resolveProviderList(settings);
		const selectedProvider = providers.find(
			(provider) => provider.slug === providerSlug && provider.isActive
		);
		const providerKind = getProviderKind(providerSlug);

		if (!selectedProvider) {
			return res.status(400).json({
				success: false,
				error: "Seçilen çekim yöntemi kullanılamıyor.",
			});
		}

		if (
			typeof selectedProvider.minAmount === "number" &&
			amountValue < selectedProvider.minAmount
		) {
			return res.status(400).json({
				success: false,
				error: `Bu yöntem için minimum tutar: ${selectedProvider.minAmount} ${settings.currency}`,
			});
		}

		if (
			typeof selectedProvider.maxAmount === "number" &&
			amountValue > selectedProvider.maxAmount
		) {
			return res.status(400).json({
				success: false,
				error: `Bu yöntem için maksimum tutar: ${selectedProvider.maxAmount} ${settings.currency}`,
			});
		}

		const activeWallet = getActiveWallet(user);
		if (!activeWallet) {
			console.error("Forcelab withdraw: aktif cüzdan bulunamadı", { userId: user._id, currency: user.currency });
			return res.status(400).json({
				success: false,
				error: "Aktif cüzdan bulunamadı.",
			});
		}

		const currentBalance = Number(activeWallet.balance || 0);

		if (currentBalance < amountValue) {
			return res.status(400).json({
				success: false,
				error: "Yetersiz bakiye.",
			});
		}

		const externalTransactionId = generateExternalTransactionId(user._id.toString());
		const providerAmount = toSmallestUnit(amountValue, settings.currency);
		const metadata = userMetadata && typeof userMetadata === "object" ? userMetadata : {};

		if (providerKind === "bank-transfer") {
			const beneficiaryIban = metadata.beneficiary_iban || metadata.iban;
			const beneficiaryName = metadata.beneficiary_name || metadata.accountName;

			if (!beneficiaryIban || !beneficiaryName) {
				return res.status(400).json({
					success: false,
					error: "IBAN ve hesap sahibi bilgisi gerekli.",
				});
			}
		}

		if (providerKind === "manual-crypto") {
			const destinationAddress =
				metadata.destination_address ||
				metadata.destinationAddress ||
				metadata.walletAddress ||
				metadata.address;

			if (!destinationAddress) {
				return res.status(400).json({
					success: false,
					error: "Cüzdan adresi gerekli.",
				});
			}
		}

		// Bakiyeyi düş
		const newBalance = await updateUserBalance(user, -amountValue, {
			emitSocket: true,
		});

		if (newBalance === false) {
			console.error("Forcelab withdraw: bakiye düşülemedi", {
				userId: user._id,
				amount: amountValue,
				activeWallet: { coinType: activeWallet.coinType, chain: activeWallet.chain, type: activeWallet.type, balance: activeWallet.balance },
			});
			return res.status(500).json({
				success: false,
				error: "Bakiye güncellenemedi. Lütfen tekrar deneyin.",
			});
		}

		// Manuel onay gerektiği için Forcelab'e henüz göndermiyoruz.
		// Admin panelden onaylandıktan sonra Forcelab'e iletilecek.
		const transaction = await ForcelabFinanceTransaction.create({
			user: user._id,
			uuid: createPendingWithdrawUuid(externalTransactionId),
			externalTransactionId,
			providerSlug,
			providerName: selectedProvider.name,
			providerType: "withdraw",
			amount: amountValue,
			providerAmount,
			currency: settings.currency,
			status: "pending",
			oldBalance: currentBalance,
			newBalance: newBalance || 0,
			metadata: {
				customer: {
					reference: user._id.toString(),
					name: user.name || user.username || "",
					username: user.username || "",
				},
				...metadata,
				// Forcelab API field mapping
				...(metadata?.iban ? { beneficiary_iban: metadata.iban } : {}),
				...(metadata?.accountName ? { beneficiary_name: metadata.accountName } : {}),
				...(metadata?.destinationAddress ? { destination_address: metadata.destinationAddress } : {}),
				...(metadata?.walletAddress ? { destination_address: metadata.walletAddress } : {}),
				...(metadata?.address ? { destination_address: metadata.address } : {}),
				...(metadata?.destinationNetwork ? { destination_network: metadata.destinationNetwork } : {}),
				...(metadata?.network ? { destination_network: metadata.network } : {}),
			},
		});

		res.json({
			success: true,
			message: "Çekim talebi oluşturuldu. Admin onayı bekleniyor.",
			data: {
				transactionId: transaction._id,
				providerSlug: transaction.providerSlug,
				status: transaction.status,
				amount: transaction.amount,
				currency: transaction.currency,
			},
		});
	} catch (error) {
		console.error("❌ Forcelab Finance withdraw hatası:", error.response?.data || error.message);
		const upstreamMessage =
			error.response?.data?.message || error.response?.data?.error || error.message;
		res.status(error.response?.status || 500).json({
			success: false,
			error: upstreamMessage || "Forcelab Finance çekim işlemi başlatılamadı.",
		});
	}
});

router.post("/callback", express.text({ type: "*/*" }), async (req, res) => {
	try {
		const settings = await getSettings(true);
		const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
		const receivedSignature = req.headers["x-signature"];

		if (!verifyWebhookSignature(rawBody, settings.webhookSecret, receivedSignature)) {
			return res.status(401).json({ success: false, error: "Geçersiz imza." });
		}

		const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
		console.log("🔍 Forcelab callback raw payload:", JSON.stringify(payload, null, 2));

		// Laravel may wrap callback payload in { data: {...} }
		const callbackData = payload.transaction_uuid ? payload : payload.data || payload;

		const lookupUuid = callbackData.uuid || callbackData.transaction_uuid || (callbackData.payload && callbackData.payload.transaction_uuid);
		const lookupConditions = [
			...(lookupUuid ? [{ uuid: lookupUuid }] : []),
			...(callbackData.external_transaction_id ? [{ externalTransactionId: callbackData.external_transaction_id }] : []),
		].filter(Boolean);

		if (!lookupConditions.length) {
			console.error("❌ Forcelab callback: İşlem tanımlayıcısı eksik. Payload keys:", Object.keys(callbackData));
			return res.status(400).json({ success: false, error: "İşlem tanımlayıcısı eksik." });
		}

		const transaction = await ForcelabFinanceTransaction.findOne({
			$or: lookupConditions,
		});

		if (!transaction) {
			return res.status(404).json({ success: false, error: "İşlem bulunamadı." });
		}

		const previousStatus = transaction.status;
		const updatedTransaction = await applyTransactionStatus(
			transaction._id,
			callbackData.status,
			callbackData
		);

		if (
			previousStatus === "approved" ||
			(previousStatus === updatedTransaction?.status &&
				FINAL_TRANSACTION_STATUSES.has(updatedTransaction.status))
		) {
			return res.json({ success: true, message: "İşlem zaten tamamlanmış." });
		}

		res.json({ success: true });
	} catch (error) {
		console.error("❌ Forcelab Finance callback hatası:", error.message);
		res.status(500).json({ success: false, error: error.message || "Callback işlenemedi." });
	}
});

module.exports = router;