const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

// Load database models
const User = require("../../database/models/User");
const BankTransfer = require("../../database/models/BankTransfer");
const BankAccount = require("../../database/models/BankAccount");
const Campaign = require("../../database/models/Campaign");
const CampaignCategory = require("../../database/models/CampaignCategory");
const Promotion = require("../../database/models/Promotion");
const PromotionCategory = require("../../database/models/PromotionCategory");
const CampaignTransaction = require("../../database/models/CampaignTransaction");
const SportsBet = require("../../database/models/SportsBet");
const SportsBetEvent = require("../../database/models/SportsBetEvent");

// Load middleware
const { authorizeUser } = require("../../middleware/auth");
const { rateLimiterMiddleware } = require("../../middleware/rateLimiter");
const { default: mongoose } = require("mongoose");

// Load utils
const { processUserAvatar } = require("../../utils/avatar");
const { getClientIp } = require("../../utils/ip");
const {
	buildChallengePayload,
	createMfaError,
	getOtpChallenge,
	getUserMfaSummary,
	issueOtp,
	resendOtp,
	validateOtp,
} = require("../../services/mfaService");
const {
	createAdminSessionPayload,
	finalizeUserLoginSession,
} = require("../../services/authSessionService");
const {
	ACCOUNT_SUSPENDED_CODE,
	assertUserNotSuspended,
	sendUserSuspensionResponse,
} = require("../../utils/userSuspension");

// Load services
const {
	canUserClaimCampaign,
	isWithinDateRange,
} = require("../../services/campaignRequirementEngine");
const { updateWalletBalance } = require("../../utils/wallet");

module.exports = () => {
	// @desc    Login user (Admin Panel)
	// @route   POST /auth/login
	// @access  Public
	router.post("/login", async (req, res) => {
		const { email, password } = req.body;

		try {
			const user = await User.findOne({ "local.email": email }).populate({
				path: "adminRole",
				populate: {
					path: "permissions",
					select: "code name resource action",
				},
			});

			if (!user) {
				return res.status(401).json({
					errors: { email: ["Email not found"] },
				});
			}

			if (user.rank !== "admin") {
				return res.status(403).json({
					errors: {
						email: ["You are not authorized to access this panel"],
					},
				});
			}

			const isPasswordValid = await bcrypt.compare(
				password,
				user.local.password
			);
			if (!isPasswordValid) {
				return res.status(401).json({
					errors: { password: ["Incorrect password"] },
				});
			}

			assertUserNotSuspended(user);

			const mfaSummary = getUserMfaSummary(user);
			if (mfaSummary.enabled) {
				const challenge = await issueOtp({
					user,
					scope: "admin-login",
					methodType: mfaSummary.preferredMethodType,
					phone: mfaSummary.phone,
					email: mfaSummary.email,
					metadata: {
						loginIdentifier: "email",
					},
				});

				return res.json({
					success: true,
					...buildChallengePayload(challenge),
				});
			}

			return res.json(await createAdminSessionPayload({ userId: user._id }));
		} catch (err) {
			console.error(err);
			if (err.code === ACCOUNT_SUSPENDED_CODE) {
				return sendUserSuspensionResponse(res);
			}
			return res.status(err.status || 500).json({
				success: false,
				message: err.message || "Internal Server Error",
				code: err.code,
				...(err.metadata ? { metadata: err.metadata } : {}),
			});
		}
	});

	const assertLoginChallengeScope = (challenge) => {
		if (!["user-login", "admin-login"].includes(challenge.scope)) {
			throw createMfaError(
				"OTP challenge scope is not valid for auth",
				"OTP_INVALID_SCOPE",
				400
			);
		}
	};

	router.post("/mfa/send-otp", async (req, res) => {
		try {
			const { challengeId } = req.body || {};
			const challenge = await getOtpChallenge({ challengeId });
			assertLoginChallengeScope(challenge);

			const nextChallenge = await resendOtp({ challengeId });

			return res.status(200).json({
				success: true,
				...buildChallengePayload(nextChallenge),
			});
		} catch (err) {
			if (err.code === ACCOUNT_SUSPENDED_CODE) {
				return sendUserSuspensionResponse(res);
			}
			return res.status(err.status || 500).json({
				success: false,
				message: err.message,
				code: err.code,
				...(err.metadata ? { metadata: err.metadata } : {}),
			});
		}
	});

	router.post("/mfa/resend-otp", async (req, res) => {
		try {
			const { challengeId } = req.body || {};
			const challenge = await getOtpChallenge({ challengeId });
			assertLoginChallengeScope(challenge);

			const nextChallenge = await resendOtp({ challengeId });

			return res.status(200).json({
				success: true,
				...buildChallengePayload(nextChallenge),
			});
		} catch (err) {
			if (err.code === ACCOUNT_SUSPENDED_CODE) {
				return sendUserSuspensionResponse(res);
			}
			return res.status(err.status || 500).json({
				success: false,
				message: err.message,
				code: err.code,
				...(err.metadata ? { metadata: err.metadata } : {}),
			});
		}
	});

	router.post("/mfa/validate-otp", async (req, res) => {
		try {
			const { challengeId, code } = req.body || {};
			const challenge = await validateOtp({ challengeId, code });
			assertLoginChallengeScope(challenge);

			if (challenge.scope === "admin-login") {
				return res.status(200).json({
					success: true,
					...(await createAdminSessionPayload({ userId: challenge.user })),
				});
			}

			return res.status(200).json(
				await finalizeUserLoginSession({
					userId: challenge.user,
					req,
				})
			);
		} catch (err) {
			if (err.code === ACCOUNT_SUSPENDED_CODE) {
				return sendUserSuspensionResponse(res);
			}
			return res.status(err.status || 500).json({
				success: false,
				message: err.message,
				code: err.code,
				...(err.metadata ? { metadata: err.metadata } : {}),
			});
		}
	});

	// @desc    Get authorized user
	// @route   GET /auth/me
	// @access  Private
	router.get(
		"/me",
		[rateLimiterMiddleware, authorizeUser(true)],
		async (req, res) => {
			try {
				const userDatabase = await User.findById(req.user._id)
					.select(
						"local.email local.emailVerified roblox.id discord.id username numericId avatar rank balance xp vault phone name identity.idNumber birthday stats rakeback fair anonymous mute ban betAccess verifiedAt updatedAt createdAt wallets currency mfa"
					)
					.lean();

				// Process avatar - ensure valid avatar with fallback
				const userWithAvatar = await processUserAvatar(userDatabase);
				const accountNumber =
					userWithAvatar?.numericId === null ||
					userWithAvatar?.numericId === undefined
						? null
						: String(userWithAvatar.numericId);

				res.status(200).json({
					success: true,
					user: { ...userWithAvatar, accountNumber },
				});
			} catch (err) {
				res.status(500).json({
					success: false,
					error: { type: "error", message: err.message },
				});
			}
		}
	);

	// Kampanya kategorilerini getir (public)
	router.get("/campaign-categories", async (req, res) => {
		try {
			const categories = await CampaignCategory.find({ active: true })
				.sort({ order: 1, createdAt: -1 })
				.select("slug label icon order")
				.lean();
			res.status(200).json({ success: true, categories });
		} catch (err) {
			res.status(500).json({ success: false, message: err.message });
		}
	});

	// Promosyon kategorilerini getir (public)
	router.get("/promotion-categories", async (req, res) => {
		try {
			const categories = await PromotionCategory.find({ active: true })
				.sort({ order: 1, createdAt: -1 })
				.select("slug label icon order")
				.lean();
			res.status(200).json({ success: true, categories });
		} catch (err) {
			res.status(500).json({ success: false, message: err.message });
		}
	});

	// Promosyonları getir (public)
	router.get("/promotions", async (req, res) => {
		try {
			const promotions = await Promotion.find({ active: { $ne: false } })
				.sort({ order: 1, createdAt: -1 })
				.select("title subtitle banner category content order active")
				.lean();

			const filtered = promotions.filter((p) => p.active !== false);

			const response = filtered.map((p) => ({
				id: p._id.toString(),
				title: p.title,
				subtitle: p.subtitle || "",
				banner: p.banner,
				category: p.category || null,
				content: p.content || "",
			}));

			res.status(200).json({ success: true, promotions: response });
		} catch (err) {
			res.status(500).json({ success: false, message: err.message });
		}
	});

	router.get("/campaigns", [authorizeUser(false)], async (req, res) => {
		try {
			const allCampaigns = await Campaign.find({ active: { $ne: false } })
				.sort({ order: 1, createdAt: -1 })
				.lean();

			// Tarih aralığı dışındaki ve pasif kampanyaları filtrele
			const validCampaigns = allCampaigns.filter((c) => c.active !== false && isWithinDateRange(c));

			// Kullanıcı bilgisi (varsa)
			let user = null;
			const rawUserId = req.user?._id;
			if (
				rawUserId &&
				mongoose.Types.ObjectId.isValid(rawUserId.toString())
			) {
				user = await User.findById(rawUserId)
					.select("createdAt")
					.lean();
			}

			const response = validCampaigns.map((campaign) => {
				// Kullanıcı bu kampanyayı daha önce almış mı?
				const claimedByIds = (campaign.claimedBy || []).map((id) =>
					id.toString()
				);
				const alreadyClaimed = user
					? claimedByIds.includes(user._id.toString())
					: false;

				// claimable hesapla
				let claimable = false;
				if (
					!alreadyClaimed &&
					campaign.active &&
					isWithinDateRange(campaign)
				) {
					if (campaign.mode === "auto") {
						const check = canUserClaimCampaign(user, campaign);
						claimable = check.claimable;
					}
					// manual mod → claimable: false kalır
				}

				return {
					id: campaign._id.toString(),
					title: campaign.title,
					description: campaign.description,
					banner: campaign.banner,
					category: campaign.category || "ozel",
					mode: campaign.mode,
					rewardAmount: campaign.rewardAmount || 0,
					startDate: campaign.startDate,
					endDate: campaign.endDate,
					terms: campaign.terms || null,
					active: campaign.active,
					claimable,
					claimed: alreadyClaimed,
				};
			});

			res.status(200).json({ success: true, campaigns: response });
		} catch (err) {
			res.status(500).json({
				success: false,
				error: { type: "error", message: err.message },
			});
		}
	});

	router.get("/campaign/claim", authorizeUser(true), async (req, res) => {
		try {
			const campaignId = req.query?.id;
			if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId)) {
				return res
					.status(400)
					.json({ success: false, message: "CAMPAIGN_NOT_FOUND" });
			}

			// Kampanyayı DB'den çek
			const campaign = await Campaign.findById(campaignId);
			if (!campaign) {
				return res
					.status(404)
					.json({ success: false, message: "CAMPAIGN_NOT_FOUND" });
			}

			// Kullanıcıyı çek
			const user = await User.findById(req.user._id);
			if (!user) {
				return res
					.status(404)
					.json({ success: false, message: "USER_NOT_FOUND" });
			}

			// canUserClaimCampaign kontrolü
			const claimCheck = canUserClaimCampaign(user, campaign);
			if (!claimCheck.claimable) {
				return res
					.status(400)
					.json({ success: false, message: claimCheck.reason });
			}

			// Rivo cüzdanını bul ve bakiye ekle
			const rivoWallet = (user.wallets || []).find(
				(wallet) => wallet.coinType === "Rivo"
			);
			if (!rivoWallet) {
				return res
					.status(400)
					.json({ success: false, message: "WALLET_NOT_FOUND" });
			}

			const rewardAmount = campaign.rewardAmount || 0;
			const newBalance = await updateWalletBalance(
				user,
				rivoWallet,
				rewardAmount,
				{
					emitSocket: true,
				}
			);

			// Kampanyaya kullanıcıyı ekle
			campaign.claimedBy = campaign.claimedBy || [];
			campaign.claimedBy.push(user._id);
			await campaign.save();

			// CampaignTransaction kaydı oluştur
			await CampaignTransaction.create({
				user: user._id,
				campaign: campaign._id,
				campaignTitle: campaign.title,
				rewardAmount: rewardAmount,
				mode: campaign.mode,
				requirements: campaign.requirements || [],
				terms: campaign.terms || null,
				assignedByAdmin: null,
				status: "completed",
			});

			res.status(200).json({
				success: true,
				campaignId: campaign._id.toString(),
				rewardAmount,
				newBalance,
			});
		} catch (err) {
			res.status(500).json({
				success: false,
				error: { type: "error", message: err.message },
			});
		}
	});

	router.all(["/bank-transfer", "/bank-withdraw", "/bank-accounts"], (req, res) => {
		return res.status(410).json({
			success: false,
			message: "Banka transfer sistemi kapatıldı. Lütfen Forcelab Finance kullanın.",
		});
	});

	router.post("/bank-transfer", authorizeUser(true), async (req, res) => {
		try {
			// 🔒 User null kontrolü
			if (!req.user || !req.user._id) {
				return res.status(401).json({
					success: false,
					message: "Kullanıcı doğrulanamadı",
				});
			}

			const { amount: rawAmount, bankId: rawBankId } = req.body || {};
			const amount = Number(rawAmount);
			const bankId =
				typeof rawBankId === "string" ? rawBankId.trim() : "";

			// 🔒 Limit: user can have max 2 pending deposits
			const pendingDepositCount = await BankTransfer.countDocuments({
				user: req.user._id,
				type: "deposit",
				status: "pending",
			});
			if (pendingDepositCount >= 2) {
				return res.status(400).json({
					success: false,
					message:
						"Şu anda işlem bekleyen transfer istekleriniz bulunmakta, lütfen onların bitmesini bekleyin ya da destek ekibimizle iletişime geçin.",
				});
			}

			if (!amount || Number.isNaN(amount) || amount <= 0) {
				return res
					.status(400)
					.json({ success: false, message: "INVALID_AMOUNT" });
			}

			if (!bankId || !mongoose.Types.ObjectId.isValid(bankId)) {
				return res
					.status(400)
					.json({ success: false, message: "BANK_NOT_FOUND" });
			}

			const bank = await BankAccount.findById(bankId);
			if (!bank || !bank.active) {
				return res
					.status(400)
					.json({ success: false, message: "BANK_NOT_FOUND" });
			}

			// Validate minAmount and maxAmount
			if (bank.minAmount && amount < bank.minAmount) {
				return res.status(400).json({
					success: false,
					message: `Minimum yatırım tutarı: ${bank.minAmount} TL`,
				});
			}
			if (bank.maxAmount && amount > bank.maxAmount) {
				return res.status(400).json({
					success: false,
					message: `Maksimum yatırım tutarı: ${bank.maxAmount} TL`,
				});
			}

			const metadata = {
				ip: getClientIp(req),
				userAgent: req.headers["user-agent"],
			};

			const transfer = await BankTransfer.create({
				user: req.user._id,
				amount,
				bankId,
				bankName: bank.bankName,
				accountName: bank.accountName,
				accountNumber: bank.accountNumber,
				iban: bank.iban,
				note: bank.note,
				type: "deposit",
				metadata,
			});

			return res
				.status(201)
				.json({ success: true, transferId: transfer._id });
		} catch (err) {
			return res.status(500).json({
				success: false,
				message: err.message || "INTERNAL_ERROR",
			});
		}
	});

	// Banka ile çekim talebi oluşturma
	router.post("/bank-withdraw", authorizeUser(true), async (req, res) => {
		try {
			// 🔒 User null kontrolü
			if (!req.user || !req.user._id) {
				return res.status(401).json({
					success: false,
					message: "Kullanıcı doğrulanamadı",
				});
			}

			const {
				amount: rawAmount,
				bankName,
				accountName,
				accountNumber,
				iban,
			} = req.body || {};
			const amount = Number(rawAmount);

			// 🔒 Limit: user can have max 2 pending withdrawals
			const pendingWithdrawCount = await BankTransfer.countDocuments({
				user: req.user._id,
				type: "withdraw",
				status: "pending",
			});
			if (pendingWithdrawCount >= 2) {
				return res.status(400).json({
					success: false,
					message:
						"Şu anda işlem bekleyen transfer istekleriniz bulunmakta, lütfen onların bitmesini bekleyin ya da destek ekibimizle iletişime geçin.",
				});
			}

			// Validasyonlar
			if (!amount || Number.isNaN(amount) || amount <= 0) {
				return res
					.status(400)
					.json({ success: false, message: "Geçersiz tutar" });
			}

			if (amount < 100) {
				return res.status(400).json({
					success: false,
					message: "Minimum çekim tutarı 100 TL'dir",
				});
			}

			if (
				!bankName ||
				typeof bankName !== "string" ||
				bankName.trim().length < 2
			) {
				return res.status(400).json({
					success: false,
					message: "Geçerli bir banka adı giriniz",
				});
			}

			if (!iban || typeof iban !== "string" || iban.trim().length < 20) {
				return res.status(400).json({
					success: false,
					message: "Geçerli bir IBAN giriniz",
				});
			}

			// Kullanıcının bakiyesini kontrol et
			const user = await User.findById(req.user._id).select(
				"currency wallets"
			);
			if (!user) {
				return res
					.status(404)
					.json({ success: false, message: "Kullanıcı bulunamadı" });
			}

			const { coinType, chain, type } = user.currency || {};
			const activeWallet =
				user.wallets.find(
					(wallet) =>
						wallet.coinType === coinType &&
						wallet.chain === chain &&
						wallet.type === type
				) || user.wallets[0];

			if (!activeWallet) {
				return res.status(400).json({
					success: false,
					message: "Aktif cüzdan bulunamadı",
				});
			}

			const currentBalance = Number(activeWallet.balance || 0);
			if (currentBalance < amount) {
				return res.status(400).json({
					success: false,
					message: `Yetersiz bakiye. Mevcut bakiyeniz: ₺${currentBalance.toFixed(
						2
					)}`,
				});
			}

			const metadata = {
				ip: getClientIp(req),
				userAgent: req.headers["user-agent"],
				requestedAt: new Date().toISOString(),
			};

			// IBAN'ı temizle ve formatla
			const cleanIban = iban.replace(/\s/g, "").toUpperCase();

			const transfer = await BankTransfer.create({
				user: req.user._id,
				amount,
				bankId: `withdraw-${Date.now()}`,
				bankName: bankName.trim(),
				accountName:
					accountName?.trim() || req.user.username || "Belirtilmedi",
				accountNumber: cleanIban.slice(-4) || "****",
				iban: cleanIban,
				note: `Kullanıcı çekim talebi - ${new Date().toLocaleString(
					"tr-TR"
				)}`,
				type: "withdraw",
				status: "pending",
				metadata,
			});

			return res.status(201).json({
				success: true,
				message: "Çekim talebiniz başarıyla oluşturuldu",
				transferId: transfer._id,
			});
		} catch (err) {
			console.error("Bank withdraw error:", err);
			return res.status(500).json({
				success: false,
				message: err.message || "Bir hata oluştu",
			});
		}
	});

	router.get("/bank-accounts", authorizeUser(false), async (req, res) => {
		try {
			const bankAccounts = await BankAccount.find({ active: true }).sort({
				order: 1,
			});
			res.status(200).json({ success: true, banks: bankAccounts });
		} catch (err) {
			res.status(500).json({
				success: false,
				message: err.message || "INTERNAL_ERROR",
			});
		}
	});

	// ==================== SPORTS BETS ENDPOINTS ====================

	// Get user's sports bets history
	router.get("/sports-bets", authorizeUser(true), async (req, res) => {
		try {
			const { status, page = 1, limit = 20 } = req.query;

			const query = { user: req.user._id };
			if (
				status &&
				["pending", "won", "lost", "cancelled"].includes(status)
			) {
				query.status = status;
			}

			const skip = (parseInt(page) - 1) * parseInt(limit);
			const [bets, total] = await Promise.all([
				SportsBet.find(query)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(parseInt(limit))
					.lean(),
				SportsBet.countDocuments(query),
			]);

			// Get events for each bet
			const betIds = bets.map((b) => b._id);
			const allEvents = await SportsBetEvent.find({
				bet: { $in: betIds },
			})
				.sort({ createdAt: 1 })
				.lean();

			// Group events by bet
			const eventsByBet = {};
			allEvents.forEach((ev) => {
				const betId = ev.bet.toString();
				if (!eventsByBet[betId]) eventsByBet[betId] = [];
				eventsByBet[betId].push(ev);
			});

			// Attach events to bets
			const betsWithEvents = bets.map((bet) => ({
				...bet,
				details: eventsByBet[bet._id.toString()] || [],
			}));

			res.status(200).json({
				success: true,
				bets: betsWithEvents,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total,
					totalPages: Math.ceil(total / parseInt(limit)),
				},
			});
		} catch (err) {
			res.status(500).json({
				success: false,
				message: err.message || "INTERNAL_ERROR",
			});
		}
	});

	// Get single bet detail
	router.get("/sports-bets/:betId", authorizeUser(true), async (req, res) => {
		try {
			const { betId } = req.params;

			const bet = await SportsBet.findOne({
				_id: betId,
				user: req.user._id,
			}).lean();

			if (!bet) {
				return res.status(404).json({
					success: false,
					message: "BET_NOT_FOUND",
				});
			}

			const events = await SportsBetEvent.find({ bet: bet._id })
				.sort({ createdAt: 1 })
				.lean();

			res.status(200).json({
				success: true,
				bet: {
					...bet,
					details: events,
				},
			});
		} catch (err) {
			res.status(500).json({
				success: false,
				message: err.message || "INTERNAL_ERROR",
			});
		}
	});

	// Get user's sports bet statistics
	router.get("/sports-bets-stats", authorizeUser(true), async (req, res) => {
		try {
			const userId = new mongoose.Types.ObjectId(req.user._id);

			const [stats] = await SportsBet.aggregate([
				{ $match: { user: userId } },
				{
					$group: {
						_id: null,
						totalBets: { $sum: 1 },
						totalAmount: { $sum: "$amount" },
						totalWon: {
							$sum: {
								$cond: [{ $eq: ["$status", "won"] }, 1, 0],
							},
						},
						totalLost: {
							$sum: {
								$cond: [{ $eq: ["$status", "lost"] }, 1, 0],
							},
						},
						totalPending: {
							$sum: {
								$cond: [{ $eq: ["$status", "pending"] }, 1, 0],
							},
						},
						totalWinAmount: { $sum: "$actualWin" },
						avgOdds: { $avg: "$totalOdds" },
					},
				},
			]);

			res.status(200).json({
				success: true,
				stats: stats || {
					totalBets: 0,
					totalAmount: 0,
					totalWon: 0,
					totalLost: 0,
					totalPending: 0,
					totalWinAmount: 0,
					avgOdds: 0,
				},
			});
		} catch (err) {
			res.status(500).json({
				success: false,
				message: err.message || "INTERNAL_ERROR",
			});
		}
	});

	// Mount credentials, roblox, discord, social routes
	router.use("/credentials", require("./credentials")());
	router.use("/roblox", require("./roblox")());
	router.use("/discord", require("./discord")());
	router.use("/social", require("./social")); // ✅ burayı ekledik

	return router;
};
