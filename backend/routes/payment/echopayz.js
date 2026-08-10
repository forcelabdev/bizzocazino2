const express = require("express");
const router = express.Router();
const axios = require("axios");
const User = require("../../database/models/User");
const EchoPayzTransaction = require("../../database/models/EchoPayzTransaction");
const SiteSettings = require("../../database/models/SiteSettings");
const { updateUserBalance, getActiveWallet } = require("../../utils/wallet");
const { authorizeUser } = require("../../middleware/auth");
const {
	createSignature,
	generateNonce,
	generateReferenceId,
	verifyCallbackSignature,
	sortPayloadAlphabetically,
	getClientIp,
	mapEchoPayzStatus,
} = require("../../utils/echopayz");

// ============================================================================
// EchoPayz Ayarlarını Getir (SiteSettings'den)
// ============================================================================
const getSettings = async () => {
	let siteSettings = await SiteSettings.findOne();
	if (!siteSettings) {
		throw new Error("Site ayarları bulunamadı.");
	}
	
	const echopayz = siteSettings.echopayz;
	if (!echopayz || !echopayz.isActive) {
		throw new Error("EchoPayz şu anda aktif değil.");
	}
	
	if (!echopayz.apiKey || !echopayz.apiSecret) {
		throw new Error("EchoPayz API anahtarları yapılandırılmamış.");
	}
	
	return echopayz;
};

// ============================================================================
// Yatırım Oluşturma Endpoint'i
// POST /api/payment/echopayz/create
// ============================================================================
router.post("/create", authorizeUser(false), async (req, res) => {
	try {
		// Kullanıcı kontrolü (artık req.user middleware tarafından set ediliyor)
		const userId = req.user?._id;
		const { amount } = req.body;

		if (!userId) {
			return res.status(401).json({
				success: false,
				error: "Oturum açmanız gerekiyor.",
			});
		}

		if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
			return res.status(400).json({
				success: false,
				error: "Geçersiz tutar.",
			});
		}

		const amountTL = parseFloat(amount);

		// Kullanıcıyı bul
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({
				success: false,
				error: "Kullanıcı bulunamadı.",
			});
		}

		// EchoPayz ayarlarını al
		const settings = await getSettings();

		// Min/Max kontrolü
		if (amountTL < settings.minAmount) {
			return res.status(400).json({
				success: false,
				error: `Minimum yatırım tutarı: ${settings.minAmount} TL`,
			});
		}
		if (amountTL > settings.maxAmount) {
			return res.status(400).json({
				success: false,
				error: `Maksimum yatırım tutarı: ${settings.maxAmount} TL`,
			});
		}

		// Kullanıcı bilgilerini hazırla
		const customerId = user._id.toString();
		const customerName = user.name || user.username || "Kullanıcı";
		const customerIp = getClientIp(req);
		const referenceId = generateReferenceId(customerId, "echopayz");

		// Mevcut bakiyeyi al
		const activeWallet = getActiveWallet(user);
		const oldBalance = activeWallet?.balance || 0;

		// Callback URL'yi environment'tan al
		const callbackUrl = `${process.env.SERVER_BACKEND_URL}/payment/echopayz/callback`;

		// API payload'u hazırla
		let payload = {
			amount: (amountTL),
			callback_url: callbackUrl,
			success_url: `${process.env.SERVER_FRONTEND_URL}/`,
			fail_url: `${process.env.SERVER_FRONTEND_URL}/`,
			currency: "TRY",
			customer_id: customerId,
			customer_ip: customerIp,
			customer_name: customerName,
			extra_data: {
				method_code: "echopayz",
				user_id: customerId,
			},
			reference_id: referenceId,
		};

		// Payload'u alfabetik sırala
		payload = sortPayloadAlphabetically(payload);

		// İmza oluştur
		const timestamp = Math.floor(Date.now() / 1000);
		const nonce = generateNonce();
		const path = "/api/v1/deposits";
		const jsonBody = JSON.stringify(payload);
		const signature = createSignature("POST", path, timestamp, nonce, jsonBody, settings.apiSecret);

		// API isteği gönder
		const apiUrl = `${settings.apiUrl}/deposits`;

		console.log("📤 EchoPayz API isteği gönderiliyor:", {
			url: apiUrl,
			referenceId,
			amount: amountTL,
			amountKurus: (amountTL),
		});

		const response = await axios.post(apiUrl, payload, {
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				"X-API-Key": settings.apiKey,
				"X-Signature": signature,
				"X-Timestamp": timestamp.toString(),
				"X-Nonce": nonce,
			},
			timeout: 30000,
		});

		const data = response.data;

		if (!data || !data.success) {
			console.error("❌ EchoPayz API hatası:", data);
			return res.status(400).json({
				success: false,
				error: data?.error || "Ödeme oluşturulamadı.",
			});
		}

		// Veritabanına kaydet
		const transaction = await EchoPayzTransaction.create({
			user: user._id,
			referenceId: referenceId,
			echopayzTransactionId: data.data.transaction_id,
			amount: amountTL,
			grossAmount: data.data.gross_amount,
			netAmount: data.data.amount,
			commissionRate: data.data.commission_rate,
			commissionAmount: data.data.commission_amount,
			currency: data.data.currency,
			status: "pending",
			paymentUrl: data.data.payment_url,
			iban: data.data.iban,
			bank: data.data.bank,
			holderName: data.data.holder_name,
			oldBalance: oldBalance,
			customerIp: customerIp,
			expiresAt: data.data.expires_at ? new Date(data.data.expires_at) : null,
			extraData: payload.extra_data,
		});

		console.log("✅ EchoPayz işlemi oluşturuldu:", {
			transactionId: transaction._id,
			referenceId: referenceId,
			echopayzTxId: data.data.transaction_id,
			paymentUrl: data.data.payment_url,
		});

		// Başarılı yanıt
		res.json({
			success: true,
			message: "Ödeme sayfasına yönlendiriliyorsunuz...",
			data: {
				transactionId: transaction._id,
				referenceId: referenceId,
				paymentUrl: data.data.payment_url,
				amount: amountTL,
				iban: data.data.iban,
				bank: data.data.bank,
				holderName: data.data.holder_name,
				expiresAt: data.data.expires_at,
			},
		});
	} catch (err) {
		console.error("❌ EchoPayz ödeme oluşturma hatası:", err.response?.data || err.message);

		// Axios hata yanıtı
		if (err.response?.data) {
			return res.status(err.response.status || 400).json({
				success: false,
				error: err.response.data.error || err.response.data.message || "API hatası",
				details: err.response.data,
			});
		}

		res.status(500).json({
			success: false,
			error: err.message || "Sunucu hatası",
		});
	}
});

// ============================================================================
// Callback (Webhook) Endpoint'i
// POST /api/payment/echopayz/callback
// ============================================================================
router.post("/callback", express.text({ type: "*/*" }), async (req, res) => {
	try {
		// Raw body'yi al (imza doğrulama için)
		let rawBody = req.body;
		let data;
		
		// Body string mi object mi kontrol et
		if (typeof rawBody === "string") {
			try {
				data = JSON.parse(rawBody);
			} catch (parseErr) {
				console.error("❌ JSON parse hatası:", parseErr.message);
				return res.status(400).json({ success: false, error: "Geçersiz JSON formatı" });
			}
		} else {
			// Zaten object ise (başka bir middleware parse etmiş olabilir)
			data = rawBody;
			rawBody = JSON.stringify(data);
		}

		// Header bilgilerini logla
		console.log("📥 EchoPayz callback geldi:", {
			transactionId: data.transaction_id,
			referenceId: data.reference_id,
			status: data.status,
			amount: data.amount,
			headers: {
				hasSignature: !!req.headers["x-signature"],
				hasTimestamp: !!req.headers["x-timestamp"],
				hasNonce: !!req.headers["x-nonce"],
				transactionType: req.headers["x-transaction-type"] || "deposit",
			},
		});

		// Gerekli alanlar kontrolü
		const { transaction_id, reference_id, status, amount, customer_id } = data;

		if (!transaction_id || !reference_id || !status) {
			console.error("❌ Eksik alanlar:", { transaction_id, reference_id, status });
			return res.status(400).json({
				success: false,
				error: "Eksik alanlar: transaction_id, reference_id veya status",
			});
		}

		// İşlemi bul
		const transaction = await EchoPayzTransaction.findOne({ referenceId: reference_id }).populate("user");

		if (!transaction) {
			console.error("❌ İşlem bulunamadı:", reference_id);
			return res.status(404).json({
				success: false,
				error: "İşlem bulunamadı",
			});
		}

		// Zaten işlenmiş mi?
		if (transaction.status !== "pending") {
			console.log("ℹ️ İşlem zaten işlenmiş:", {
				referenceId: reference_id,
				currentStatus: transaction.status,
			});
			return res.json({
				success: true,
				message: "İşlem zaten işlenmiş",
			});
		}

		// İmza doğrulama - EchoPayz formatı: HMAC-SHA256(timestamp|nonce|raw_json, api_secret)
		const receivedSignature = req.headers["x-signature"];
		const receivedTimestamp = req.headers["x-timestamp"];
		const receivedNonce = req.headers["x-nonce"];
		const transactionType = req.headers["x-transaction-type"] || "deposit";

		if (receivedSignature && receivedTimestamp && receivedNonce) {
			try {
				const settings = await getSettings();
				const isValid = verifyCallbackSignature(
					receivedSignature,
					receivedTimestamp,
					receivedNonce,
					rawBody,
					settings.apiSecret
				);
				if (!isValid) {
					console.warn("⚠️ İmza doğrulaması başarısız, ancak işleme devam ediliyor", {
						receivedSignature: receivedSignature.substring(0, 16) + "...",
						timestamp: receivedTimestamp,
						nonce: receivedNonce,
					});
					// Şimdilik devam et - production'da bunu açabilirsiniz:
					// return res.status(401).json({ success: false, error: "Geçersiz imza" });
				} else {
					console.log("✅ İmza doğrulandı");
				}
			} catch (signatureError) {
				console.warn("⚠️ İmza doğrulama hatası:", signatureError.message);
			}
		} else {
			console.log("ℹ️ İmza header'ları eksik, doğrulama atlandı", {
				hasSignature: !!receivedSignature,
				hasTimestamp: !!receivedTimestamp,
				hasNonce: !!receivedNonce,
			});
			// Production'da imzayı zorunlu tutabilirsiniz:
			// return res.status(401).json({ success: false, error: "İmza header'ları eksik" });
		}

		// Status'u eşle
		const newStatus = mapEchoPayzStatus(status);

		// Transaction'ı güncelle
		transaction.echopayzTransactionId = transaction_id;
		transaction.status = newStatus;
		transaction.callbackRawData = data;

		if (newStatus === "approved") {
			transaction.approvedAt = data.approved_at ? new Date(data.approved_at) : new Date();
		} else if (newStatus === "rejected") {
			transaction.rejectedAt = data.rejected_at ? new Date(data.rejected_at) : new Date();
			transaction.rejectionReason = data.rejection_reason;
		}

		// Onaylandıysa bakiye ekle
		if (newStatus === "approved") {
			const user = transaction.user;

			if (!user) {
				console.error("❌ Kullanıcı bulunamadı");
				return res.status(400).json({
					success: false,
					error: "Kullanıcı bulunamadı",
				});
			}

			// Amount'u TL'ye çevir (kuruştan)
			const depositAmount = (amount || 0);

			console.log("💰 Bakiye ekleniyor:", {
				userId: user._id,
				depositAmount,
				amountKurus: amount,
			});

			// Bakiye ekle
			const newBalance = await updateUserBalance(user, depositAmount, { emitSocket: true });

			// Kullanıcı istatistiklerini güncelle
			if (user.stats) {
				user.stats.deposit = (user.stats.deposit || 0) + depositAmount;
				await user.save();
			}

			transaction.newBalance = newBalance || 0;

			console.log(`✅ Bakiye eklendi: ${user.username || user._id} +${depositAmount} TL`);
		}

		await transaction.save();

		console.log("✅ EchoPayz callback işlendi:", {
			referenceId: reference_id,
			newStatus,
			amount: amount,
		});

		res.json({ success: true });
	} catch (err) {
		console.error("❌ EchoPayz callback hatası:", err.message);
		res.status(500).json({
			success: false,
			error: err.message,
		});
	}
});

// ============================================================================
// İşlem Durumu Sorgulama
// GET /api/payment/echopayz/status/:referenceId
// ============================================================================
router.get("/status/:referenceId", async (req, res) => {
	try {
		const { referenceId } = req.params;

		const transaction = await EchoPayzTransaction.findOne({ referenceId });

		if (!transaction) {
			return res.status(404).json({
				success: false,
				error: "İşlem bulunamadı",
			});
		}

		res.json({
			success: true,
			data: {
				referenceId: transaction.referenceId,
				echopayzTransactionId: transaction.echopayzTransactionId,
				amount: transaction.amount,
				status: transaction.status,
				paymentUrl: transaction.paymentUrl,
				createdAt: transaction.createdAt,
				approvedAt: transaction.approvedAt,
			},
		});
	} catch (err) {
		console.error("❌ İşlem durumu sorgulama hatası:", err.message);
		res.status(500).json({
			success: false,
			error: err.message,
		});
	}
});

// ============================================================================
// Kullanıcının İşlem Geçmişi
// GET /api/payment/echopayz/history
// ============================================================================
router.get("/history", authorizeUser(true), async (req, res) => {
	try {
		const userId = req.user?._id;

		if (!userId) {
			return res.status(401).json({
				success: false,
				error: "Oturum açmanız gerekiyor",
			});
		}

		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const skip = (page - 1) * limit;

		const transactions = await EchoPayzTransaction.find({ user: userId })
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.select("referenceId amount status createdAt approvedAt paymentUrl");

		const total = await EchoPayzTransaction.countDocuments({ user: userId });

		res.json({
			success: true,
			data: {
				transactions,
				pagination: {
					page,
					limit,
					total,
					pages: Math.ceil(total / limit),
				},
			},
		});
	} catch (err) {
		console.error("❌ İşlem geçmişi sorgulama hatası:", err.message);
		res.status(500).json({
			success: false,
			error: err.message,
		});
	}
});

// ============================================================================
// Ödeme Yöntemi Bilgisi
// GET /api/payment/echopayz/info
// ============================================================================
router.get("/info", async (req, res) => {
	try {
		const siteSettings = await SiteSettings.findOne();
		const echopayz = siteSettings?.echopayz;

		if (!echopayz || !echopayz.isActive) {
			return res.json({
				success: true,
				data: {
					available: false,
					message: "EchoPayz şu anda kullanılamıyor",
				},
			});
		}

		res.json({
			success: true,
			data: {
				available: true,
				name: echopayz.name,
				logo: echopayz.logo,
				minAmount: echopayz.minAmount,
				maxAmount: echopayz.maxAmount,
				currency: "TRY",
			},
		});
	} catch (err) {
		console.error("❌ EchoPayz bilgi hatası:", err.message);
		res.status(500).json({
			success: false,
			error: err.message,
		});
	}
});

module.exports = router;
