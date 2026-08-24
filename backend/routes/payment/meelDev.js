const express = require("express");
const axios = require("axios");
const router = express.Router();

const User = require("../../database/models/User");
const SiteSettings = require("../../database/models/SiteSettings");
const MeelDevTransaction = require("../../database/models/MeelDevTransaction");
const { authorizeUser } = require("../../middleware/auth");
const { updateUserBalance, getActiveWallet } = require("../../utils/wallet");
const {
	createMeelDevHeaders,
	generateMeelDevTransactionId,
	verifyMeelDevCallbackHash,
	mapMeelDevStatus,
} = require("../../utils/meelDev");
const { createAdminNotification } = require("../../utils/adminNotification");
const { assertWithdrawalNotBlocked } = require("../../utils/bonusLock");

// ─── Settings Helper ───────────────────────────────────────────────────────
const getSettings = async (requireActive = true) => {
	let siteSettings = await SiteSettings.findOne();
	if (!siteSettings) {
		siteSettings = new SiteSettings();
		await siteSettings.save();
	}

	const settings = siteSettings.meelDev || {};
	if (requireActive && !settings.isActive) {
		throw new Error("MeelDev şu anda aktif değil.");
	}
	if (requireActive && !settings.apiKey) {
		throw new Error("MeelDev API anahtarı yapılandırılmamış.");
	}
	if (requireActive && !settings.apiSecret) {
		throw new Error("MeelDev API Secret yapılandırılmamış.");
	}

	return {
		name: "MeelDev",
		logo: "",
		minAmount: 100,
		maxAmount: 100000,
		currency: "TRY",
		apiUrl: "https://gateway.meeldev.com",
		apiKey: "",
		apiSecret: "",
		cbSecretKey: "",
		...settings,
	};
};

const createClient = (settings) =>
	axios.create({
		baseURL: settings.apiUrl,
		headers: createMeelDevHeaders(settings.apiKey, settings.apiSecret, settings.cbSecretKey),
		timeout: 30000,
	});

// ─── Public Info ────────────────────────────────────────────────────────────
router.get("/methods", async (req, res) => {
	try {
		const settings = await getSettings(false);
		if (!settings.isActive || !settings.apiKey || !settings.apiSecret) {
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

		// MeelDev bank listesi
		let banks = [];
		try {
			const client = createClient(settings);
			const bankRes = await client.post("/api/banks.php", { status: 1 });
			const bankData = bankRes.data;
			if (bankData.status === "success" && Array.isArray(bankData.data)) {
				banks = bankData.data.map((b) => ({
					id: b.id,
					name: b.bank_name,
					isActive: b.status === 1,
				}));
			}
		} catch (bankErr) {
			console.error("MeelDev bank list hatası:", bankErr.response?.data || bankErr.message);
		}

		res.json({
			success: true,
			data: {
				available: true,
				name: settings.name,
				logo: settings.logo,
				currency: settings.currency,
				minAmount: settings.minAmount,
				maxAmount: settings.maxAmount,
				banks,
			},
		});
	} catch (error) {
		console.error("❌ MeelDev methods hatası:", error.message);
		res.status(500).json({ success: false, error: "MeelDev ödeme bilgileri alınamadı." });
	}
});

// ─── Deposit Create ─────────────────────────────────────────────────────────
router.post("/deposit", authorizeUser(true), async (req, res) => {
	try {
		const userId = req.user?._id;
		const { amount, directAccount } = req.body;

		if (!userId) {
			return res.status(401).json({ success: false, error: "Oturum açmanız gerekiyor." });
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

		const activeWallet = getActiveWallet(user);
		const oldBalance = activeWallet?.balance || 0;
		const txId = generateMeelDevTransactionId(user._id.toString(), "deposit");

		const client = createClient(settings);
		const payload = {
			price: amountValue.toFixed(2),
			transaction_id: txId,
			customer_parent: user._id.toString(),
			customer_nick: user.username || "",
			customer_name: user.name || user.username || "",
			direct_account: directAccount === 1 || directAccount === "1" ? "1" : "0",
		};

		const response = await client.post("/api/depositAdd.php", payload);
		const rawData = response.data || {};

		if (rawData.status !== "success" || !rawData.data) {
			console.error("MeelDev deposit başarısız:", rawData);
			return res.status(400).json({
				success: false,
				error: rawData.message || "MeelDev yatırım işlemi oluşturulamadı.",
			});
		}

		const data = rawData.data;

		const transaction = await MeelDevTransaction.create({
			user: user._id,
			processNo: data.process_no || null,
			transactionId: txId,
			type: "deposit",
			amount: amountValue,
			currency: settings.currency,
			status: mapMeelDevStatus(data.status),
			paymentUrl: data.payment_url || "",
			paymentType: data.payment_type || "",
			accountInfo: data.account || null,
			oldBalance,
			metadata: {
				customerParent: user._id.toString(),
				customerNick: user.username || "",
				customerName: user.name || user.username || "",
				directAccount: payload.direct_account,
			},
			providerResponse: data,
		});

		const responseData = {
			transactionId: transaction._id,
			processNo: transaction.processNo,
			status: transaction.status,
			amount: transaction.amount,
			currency: transaction.currency,
		};

		if (data.payment_type === "link" && data.payment_url) {
			responseData.paymentUrl = data.payment_url;
		}

		if (data.payment_type === "iban" && data.account) {
			responseData.account = {
				accountHolder: data.account.account_holder_name || "",
				iban: data.account.account_no || "",
				bankName: data.account.platform_option?.name || "",
				minAmount: data.account.min_amount || null,
				maxAmount: data.account.max_amount || null,
			};
		}

		res.json({
			success: true,
			message: "MeelDev yatırım işlemi oluşturuldu.",
			data: responseData,
		});
	} catch (error) {
		console.error("❌ MeelDev deposit hatası:", error.response?.data || error.message);
		const upstreamMessage = error.response?.data?.message || error.message;
		res.status(error.response?.status || 500).json({
			success: false,
			error: upstreamMessage || "MeelDev yatırım işlemi başlatılamadı.",
		});
	}
});

// ─── Withdraw Create (bakiye anında düşer, admin onayı ile MeelDev'e gönderilir) ──
router.post("/withdraw", authorizeUser(true), async (req, res) => {
	try {
		const userId = req.user?._id;
		const { amount, iban, accountHolder, bankName } = req.body;

		if (!userId) {
			return res.status(401).json({ success: false, error: "Oturum açmanız gerekiyor." });
		}

		if (!amount || isNaN(amount) || Number(amount) <= 0) {
			return res.status(400).json({ success: false, error: "Geçersiz tutar." });
		}

		if (!iban || typeof iban !== "string" || iban.trim().length < 20) {
			return res.status(400).json({ success: false, error: "Geçerli bir IBAN giriniz." });
		}

		if (!accountHolder || typeof accountHolder !== "string" || accountHolder.trim().length < 2) {
			return res.status(400).json({ success: false, error: "Hesap sahibi adı giriniz." });
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

		try {
			await assertWithdrawalNotBlocked(user);
		} catch (lockErr) {
			if (lockErr.code === "WAGERING_REQUIREMENT_NOT_MET") {
				return res.status(400).json({
					success: false,
					error: lockErr.message,
					code: lockErr.code,
					wagering: lockErr.wagering,
				});
			}
			throw lockErr;
		}

		const activeWallet = getActiveWallet(user);
		if (!activeWallet) {
			console.error("MeelDev withdraw: aktif cüzdan bulunamadı", {
				userId: user._id,
				currency: user.currency,
			});
			return res.status(400).json({ success: false, error: "Aktif cüzdan bulunamadı." });
		}

		const currentBalance = Number(activeWallet.balance || 0);

		if (currentBalance < amountValue) {
			return res.status(400).json({ success: false, error: "Yetersiz bakiye." });
		}

		// Bakiyeyi anında düş
		const newBalance = await updateUserBalance(user, -amountValue, { emitSocket: true });

		if (newBalance === false) {
			console.error("MeelDev withdraw: bakiye düşülemedi", {
				userId: user._id,
				amount: amountValue,
				activeWallet: {
					coinType: activeWallet.coinType,
					chain: activeWallet.chain,
					type: activeWallet.type,
					balance: activeWallet.balance,
				},
			});
			return res.status(500).json({
				success: false,
				error: "Bakiye güncellenemedi. Lütfen tekrar deneyin.",
			});
		}

		const txId = generateMeelDevTransactionId(user._id.toString(), "withdraw");

		// Admin panelden onaylandıktan sonra MeelDev'e gönderilecek
		const transaction = await MeelDevTransaction.create({
			user: user._id,
			transactionId: txId,
			type: "withdraw",
			amount: amountValue,
			currency: settings.currency,
			status: "pending",
			bankInfo: {
				iban: iban.trim(),
				accountHolder: accountHolder.trim(),
				bankName: (bankName || "").trim(),
			},
			oldBalance: currentBalance,
			newBalance: newBalance || 0,
			metadata: {
				userId: user._id.toString(),
				username: user.username || "",
				name: user.name || user.username || "",
			},
		});

		createAdminNotification(
			"withdraw",
			"Yeni Çekim Talebi",
			`${user.username} kullanıcısı ${amountValue} ₺ tutarında MeelDev çekim talebi oluşturdu.`,
			"/apps/finance/withdraw",
			{ provider: "MeelDev", amount: amountValue, username: user.username, userId: user._id },
		);

		res.json({
			success: true,
			message: "Çekim talebi oluşturuldu. Admin onayı bekleniyor.",
			data: {
				transactionId: transaction._id,
				status: transaction.status,
				amount: transaction.amount,
				currency: transaction.currency,
			},
		});
	} catch (error) {
		console.error("❌ MeelDev withdraw hatası:", error.response?.data || error.message);
		res.status(error.response?.status || 500).json({
			success: false,
			error: error.message || "MeelDev çekim işlemi başlatılamadı.",
		});
	}
});

// ─── Transaction Status ─────────────────────────────────────────────────────
router.get("/status/:id", authorizeUser(false), async (req, res) => {
	try {
		const transaction = await MeelDevTransaction.findById(req.params.id);

		if (!transaction) {
			return res.status(404).json({ success: false, error: "İşlem bulunamadı." });
		}

		// Aktif işlemlerde MeelDev'den durum sorgulama
		if (["pending", "processing"].includes(transaction.status) && transaction.processNo) {
			try {
				const settings = await getSettings(true);
				const client = createClient(settings);
				const statusRes = await client.post("/api/tx_status.php", {
					type: transaction.type,
					transaction_id: transaction.transactionId,
				});

				const statusData = statusRes.data;
				if (statusData.status === "success" && statusData.data) {
					const newStatus = mapMeelDevStatus(statusData.data.status_code);
					if (newStatus !== transaction.status) {
						const previousStatus = transaction.status;
						transaction.status = newStatus;
						transaction.providerResponse = statusData.data;

						if (newStatus === "approved" && previousStatus !== "approved") {
							if (transaction.type === "deposit") {
								const txUser = await User.findById(transaction.user);
								if (txUser) {
									const nb = await updateUserBalance(txUser, transaction.amount, {
										emitSocket: true,
									});
									transaction.newBalance = nb || 0;
									if (txUser.stats) {
										txUser.stats.deposit = (txUser.stats.deposit || 0) + transaction.amount;
										await txUser.save();
									}
									require("../../utils/depositEvents").notifyRealDepositCredited(
										txUser,
										transaction.amount,
										"MeelDev"
									);
								}
							}
						}
						transaction.approvedAt = new Date();
						}

						if (newStatus === "rejected" && previousStatus !== "rejected") {
							if (transaction.type === "withdraw") {
								const txUser = await User.findById(transaction.user);
								if (txUser) {
									const nb = await updateUserBalance(txUser, transaction.amount, {
										emitSocket: true,
									});
									transaction.newBalance = nb || 0;
								}
							}
							transaction.rejectedAt = new Date();
						}

						await transaction.save();
					}
				}
			} catch (statusErr) {
				console.warn("⚠️ MeelDev status sorgu hatası:", statusErr.response?.data || statusErr.message);
			}
		}

		res.json({
			success: true,
			data: {
				transactionId: transaction._id,
				processNo: transaction.processNo,
				type: transaction.type,
				status: transaction.status,
				amount: transaction.amount,
				currency: transaction.currency,
				paymentUrl: transaction.paymentUrl || null,
				paymentType: transaction.paymentType || null,
				accountInfo: transaction.accountInfo || null,
				createdAt: transaction.createdAt,
				updatedAt: transaction.updatedAt,
			},
		});
	} catch (error) {
		console.error("❌ MeelDev status hatası:", error.message);
		res.status(500).json({ success: false, error: "İşlem durumu alınamadı." });
	}
});

// ─── Callback (Deposit & Withdraw) ─────────────────��───────────────────────
// MeelDev sends form-urlencoded, but we accept both
router.post(
	"/callback",
	express.urlencoded({ extended: true }),
	express.json(),
	async (req, res) => {
		try {
			const body = req.body || {};

			console.log("🔍 MeelDev callback raw payload:", JSON.stringify(body, null, 2));

			const {
				process_no: processNo,
				transaction_id: transactionId,
				status: statusCode,
				price,
				customer_parent: customerParent,
				user_id: userId,
				hash: receivedHash,
			} = body;

			if (!processNo || !transactionId || !receivedHash) {
				console.error("❌ MeelDev callback: Eksik alan", { processNo, transactionId, hash: !!receivedHash });
				return res.status(400).json({ success: false, error: "Eksik callback alanları." });
			}

			const settings = await getSettings(true);

			// Transaction bul önce — tip bilgisi için
			const transaction = await MeelDevTransaction.findOne({ transactionId });

			if (!transaction) {
				console.error("❌ MeelDev callback: İşlem bulunamadı", { transactionId, processNo });
				return res.status(404).json({ success: false, error: "İşlem bulunamadı." });
			}

			// Kayıtlı tipe göre identifier belirle
			const isDeposit = transaction.type === "deposit";
			const identifier = isDeposit ? (customerParent || userId) : (userId || customerParent);

			// Hash doğrulama
			const hashValid = verifyMeelDevCallbackHash({
				processNo,
				transactionId,
				status: statusCode,
				apiSecretKey: settings.apiSecret,
				cbSecretKey: settings.cbSecretKey,
				price,
				identifier,
				receivedHash,
			});

			if (!hashValid) {
				console.error("❌ MeelDev callback: Hash doğrulama başarısız", {
					processNo,
					transactionId,
					receivedHash,
				});
				return res.status(401).json({ success: false, error: "Geçersiz hash." });
			}

			const previousStatus = transaction.status;
			const newStatus = mapMeelDevStatus(statusCode);

			// Zaten son durumda ise tekrar işleme
			if (["approved", "rejected"].includes(previousStatus)) {
				return res.json({ success: true, message: "İşlem zaten tamamlanmış." });
			}

			transaction.processNo = processNo;
			transaction.status = newStatus;
			transaction.callbackRawData = body;

			// Deposit onaylandığında bakiye ekle
			if (
				newStatus === "approved" &&
				previousStatus !== "approved" &&
				transaction.type === "deposit"
			) {
				const txUser = await User.findById(transaction.user);
				if (txUser) {
					const nb = await updateUserBalance(txUser, transaction.amount, {
						emitSocket: true,
					});
					transaction.newBalance = nb || 0;

					if (txUser.stats) {
						txUser.stats.deposit = (txUser.stats.deposit || 0) + transaction.amount;
						await txUser.save();
					}
				}
				transaction.approvedAt = new Date();
			}

			// Withdraw reddedilirse bakiye iade et
			if (
				newStatus === "rejected" &&
				previousStatus !== "rejected" &&
				transaction.type === "withdraw"
			) {
				const txUser = await User.findById(transaction.user);
				if (txUser) {
					const nb = await updateUserBalance(txUser, transaction.amount, {
						emitSocket: true,
					});
					transaction.newBalance = nb || 0;
				}
				transaction.rejectedAt = new Date();
				transaction.rejectionReason = "MeelDev tarafından reddedildi.";
			}

			// Deposit reddedildiğinde
			if (
				newStatus === "rejected" &&
				previousStatus !== "rejected" &&
				transaction.type === "deposit"
			) {
				transaction.rejectedAt = new Date();
				transaction.rejectionReason = "MeelDev tarafından reddedildi.";
			}

			await transaction.save();

			res.json({ success: true, message: "Callback işlendi." });
		} catch (error) {
			console.error("❌ MeelDev callback hatası:", error.message);
			res.status(500).json({ success: false, error: "Callback işlenirken hata oluştu." });
		}
	},
);

module.exports = router;
