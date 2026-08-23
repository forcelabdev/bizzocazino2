const express = require("express");
const axios = require("axios");
const router = express.Router();
const mongoose = require("mongoose");
const Game = require("../database/models/Game"); // Güncellenmiş model
const User = require("../database/models/User"); // User modelini içe aktar
const Transaction = require("../database/models/Transaction"); // Transaction modelini içe aktarın
const { launchGame } = require("./drakonLaunch");
const logEvent = require("../services/logEvent");
const { updateMissionProgress } = require("../services/MissionEngine");
const BalanceTransaction = require("../database/models/BalanceTransaction");
const { settingGet } = require("../utils/setting");
const {
	getActiveWallet,
	updateUserBalance,
	emitUserBalance,
} = require("../utils/wallet");
const { getMaxAccountBalance } = require("../config");
const {
	BET_ACCESS_BLOCKED_CODE,
	BET_ACCESS_BLOCKED_MESSAGE,
	CATEGORY_BET_LIMIT_EXCEEDED_CODE,
	getProviderVisibleBalance,
	isUserBetAccessBlocked,
	evaluateCategoryBetLimit,
} = require("../utils/userBetAccess");
const SiteSettings = require("../database/models/SiteSettings");
const { onBetSettled } = require("../utils/wagerHooks");

// Drakon API Kimlik Bilgileri
const DRAKON_BASE_URL = process.env.DRAKON_API_URL;
const AGENT_TOKEN = process.env.DRAKON_AGENT_TOKEN;
const AGENT_SECRET_KEY = process.env.DRAKON_AGENT_SECRET;
const AGENT_CODE = process.env.DRAKON_AGENT_CODE;

let drakonAccessToken = null; // Alınan token burada saklanacak

// Base64 ile kimlik doğrulama token oluşturma
const generateAuthToken = () => {
	return Buffer.from(`${AGENT_TOKEN}:${AGENT_SECRET_KEY}`).toString("base64");
};

// Drakon Kimlik Doğrulama İşlemi
const authenticateDrakon = async () => {
	const token = generateAuthToken();
	try {
		// console.log("Sending Authentication Request...");
		const response = await axios.post(
			`${DRAKON_BASE_URL}/auth/authentication`,
			{},
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		);

		if (response.data && response.data.access_token) {
			drakonAccessToken = response.data.access_token; // Token saklanıyor
			// console.log("Drakon Access Token Retrieved:", drakonAccessToken);
			return drakonAccessToken;
		} else {
			console.error(
				"Authentication Failed: No access_token in response",
				response.data
			);
			throw new Error("Authentication failed. No access_token received.");
		}
	} catch (error) {
		console.error("Drakon Authentication Error:", error.message);
		throw error;
	}
};

// Middleware: Token Kontrolü ve Yenileme
const ensureDrakonToken = async () => {
	if (!drakonAccessToken) {
		await authenticateDrakon();
	}
	return drakonAccessToken;
};

// /drakon_api Endpoint'i
router.post("/", async (req, res) => {
	const { method } = req.body;

	if (!method) {
		return res.status(400).json({
			status: 0,
			msg: "INVALID_REQUEST",
			details: "Method is required.",
		});
	}

	try {
		switch (method) {
			case "authenticate": {
				// Drakon Kimlik Doğrulama
				try {
					const token = await authenticateDrakon();
					return res.status(200).json({
						status: 1,
						msg: "Authentication successful",
						access_token: token,
					});
				} catch (error) {
					return res.status(500).json({
						status: 0,
						msg: "Authentication failed",
						error: error.message,
					});
				}
			}

			case "fetch_all_games": {
				try {
					const token = await ensureDrakonToken();

					const response = await axios.get(
						`${DRAKON_BASE_URL}/games/all`,
						{
							headers: {
								Authorization: `Bearer ${token}`,
							},
						}
					);

					const data = response.data;

					if (data.status) {
						return res.status(200).json({
							status: 1,
							msg: "Games fetched successfully",
							games: data.games || data.result || [], // Oyun listesi farklı anahtarlarla dönebilir
						});
					} else {
						return res.status(400).json({
							status: 0,
							msg: "Failed to fetch games",
							response: data,
						});
					}
				} catch (error) {
					console.error("Error fetching games:", error.message);
					return res.status(500).json({
						status: 0,
						msg: "INTERNAL_ERROR",
						error: error.response?.data || error.message,
					});
				}
			}

			case "game_launch": {
				try {
					// Drakon provider açık mı kontrol et
					const drakonSettings = await SiteSettings.findOne().lean();
					if (drakonSettings?.providerSettings?.drakonEnabled === false) {
						const disabledMsg = drakonSettings.providerSettings.drakonDisabledMessage || "Şu anda bu oyuna erişilemiyor.";
						return res.status(403).json({
							status: 0,
							msg: "PROVIDER_DISABLED",
							details: disabledMsg,
						});
					}

					const {
						user_id,
						game_id,
						type = "CHARGED",
						lang = "tr",
						currency = "TRY",
					} = req.body;
					if (!user_id || !game_id)
						return res.status(400).json({
							status: 0,
							msg: "INVALID_REQUEST",
							details: "Missing user_id or game_id",
						});

					const user = await User.findById(user_id);
					if (!user)
						return res
							.status(200)
							.json({ status: 0, msg: "USER_NOT_FOUND" });

					if (isUserBetAccessBlocked(user)) {
						return res.status(403).json({
							status: 0,
							msg: BET_ACCESS_BLOCKED_CODE,
							details: BET_ACCESS_BLOCKED_MESSAGE,
						});
					}

					const game = await Game.findOne({ game_code: game_id });
					if (!game)
						return res.status(404).json({
							status: 0,
							msg: "GAME_NOT_FOUND",
							details: "Invalid game_id",
						});

					const activeWallet = getActiveWallet(user);
					if (!activeWallet) {
						return res.status(400).json({
							status: 0,
							msg: "Failed to launch game",
							details: "Aktif cüzdan bulunamadı.",
						});
					}

					const maxBalance = await getMaxAccountBalance();
					if (activeWallet.balance >= maxBalance) {
						return res.status(400).json({
							status: 0,
							msg: "INVALID_BALANCE",
							details: `Bakiyeniz ${maxBalance}₺ bonus şartına ulaştı. Oyunlara katılmak için lütfen destek ekibimizle iletişime geçin.`,
						});
					}

					const token = await ensureDrakonToken();
					const response = await axios.get(
						`${DRAKON_BASE_URL}/games/game_launch`,
						{
							headers: { Authorization: `Bearer ${token}` },
							params: {
								agent_code: AGENT_CODE,
								agent_token: AGENT_TOKEN,
								game_id,
								type,
								currency,
								lang,
								user_id: user.numericId,
								user_name: user.username || "guest",
								// agent_secret: AGENT_SECRET_KEY,
							},
						}
					);

					if (response.data && response.data.game_url) {
						await logEvent("game_start", {
							userId: user._id,
							gameId: game_id,
						});

						await updateMissionProgress("game_start", {
							userId: user._id,
							gameId: game_id,
						});

						return res.status(200).json({
							status: 1,
							msg: "Game launched successfully",
							game_url: response.data.game_url,
						});
					}

					console.error("Drakon API Response Error:", response.data);
					return res.status(400).json({
						status: 0,
						msg: "Failed to launch game",
						details: response.data,
					});
				} catch (error) {
					console.error(
						"Error launching game:",
						error.response ? error.response.data : error.message
					);
					return res.status(500).json({
						status: 0,
						msg: "Error launching game",
						error: error.response
							? error.response.data
							: error.message,
					});
				}
			}

			case "account_details": {
				try {
					const { user_id } = req.body;

					// Gerekli alanların kontrolü
					if (!user_id) {
						return res.status(400).json({
							status: 0,
							msg: "INVALID_REQUEST",
							details: "Missing required field: user_id",
						});
					}

					// Kullanıcıyı numericId'ye göre veritabanında bul
					const user = await User.findOne({ numericId: user_id });
					if (!user) {
						return res.status(404).json({
							status: 0,
							msg: "USER_NOT_FOUND",
							details: `No user found with ID: ${user_id}`,
						});
					}

					// Kullanıcı bilgilerini döndür
					return res.status(200).json({
						status: 1,
						msg: "Account details retrieved successfully",
						user_id: user.numericId,
						email: user.local?.email || "N/A", // Kullanıcının e-posta adresi
						name_jogador: user.username || user.name || "guest", // Kullanıcının adı
					});
				} catch (error) {
					console.error(
						"Error fetching account details:",
						error.message
					);
					return res.status(500).json({
						status: 0,
						msg: "Error retrieving account details",
						error: error.message,
					});
				}
			}

			// "user_balance"
			case "user_balance": {
				try {
					const { user_id } = req.body;

					// Gerekli alanların kontrolü
					if (!user_id) {
						return res.status(400).json({
							status: 0,
							msg: "INVALID_REQUEST",
							details: "Missing required field: user_id",
						});
					}

					// Kullanıcıyı veritabanında numericId'ye göre bul
					const user = await User.findOne({ numericId: user_id });
					if (!user) {
						return res.status(404).json({
							status: 0,
							msg: "USER_NOT_FOUND",
							details: `No user found with ID: ${user_id}`,
						});
					}
					const activeWallet = getActiveWallet(user);
					if (!activeWallet) {
						return res.status(404).json({
							status: 0,
							msg: "WALLET_NOT_FOUND",
							details:
								"Active wallet could not be determined from currency.",
						});
					}

					// Kullanıcı durumunu ve bakiyesini döndür
					// Drakon Balance Sync kapalıysa 0 gönder
					const siteSettings = await SiteSettings.findOne().lean();
					const balanceSyncEnabled = siteSettings?.providerSettings?.drakonBalanceSync !== false;

					return res.status(200).json({
						status: 1,
						msg: "User balance retrieved successfully",
						user_id: user.numericId,
						balance: balanceSyncEnabled
							? getProviderVisibleBalance(user, activeWallet.balance)
							: 0,
					});
				} catch (error) {
					console.error(
						"Error retrieving user balance:",
						error.message
					);

					return res.status(500).json({
						status: 0,
						msg: "Error retrieving user balance",
						error: error.message,
					});
				}
			}

			case "transaction_bet": {
				try {
					const {
						transaction_id,
						user_id,
						game,
						bet,
						win,
						round_id,
						type,
					} = req.body;

					if (
						!transaction_id ||
						!user_id ||
						!bet ||
						!type ||
						!round_id
					) {
						return res.status(400).json({
							status: 0,
							error: "INVALID_REQUEST",
							details:
								"Missing required fields: transaction_id, user_id, bet, round_id, or type",
						});
					}

					const user = await User.findOne({ numericId: user_id });
					if (!user) {
						return res.status(404).json({
							status: 0,
							error: "USER_NOT_FOUND",
							details: `No user found with ID: ${user_id}`,
						});
					}
					const activeWallet = getActiveWallet(user);
					if (!activeWallet) {
						return res.status(404).json({
							status: 0,
							error: "WALLET_NOT_FOUND",
							details:
								"Active wallet could not be determined from currency.",
						});
					}

					const existingTransaction = await Transaction.findOne({
						txn_id: transaction_id,
					});
					if (existingTransaction) {
						return res.status(400).json({
							status: 0,
							error: "DUPLICATE_TRANSACTION",
							details: "Transaction with this ID already exists.",
						});
					}

					if (isUserBetAccessBlocked(user)) {
						return res.status(403).json({
							status: 0,
							error: BET_ACCESS_BLOCKED_CODE,
							details: BET_ACCESS_BLOCKED_MESSAGE,
							balance: 0,
						});
					}

					// 🎯 Bet Limitleme: kategori bazlı tam blokaj / maksimum tutar kontrolü.
					const limitCheck = evaluateCategoryBetLimit(user, "slots", bet);
					if (!limitCheck.allowed) {
						return res.status(403).json({
							status: 0,
							error: limitCheck.reason,
							details:
								limitCheck.reason === CATEGORY_BET_LIMIT_EXCEEDED_CODE
									? `Bu kategori için maksimum bahis tutarı ${limitCheck.max} ile sınırlıdır.`
									: "Bu oyun kategorisine erişiminiz kısıtlanmıştır.",
							balance: 0,
						});
					}

					const balanceBefore = activeWallet.balance || 0;
					if (balanceBefore < bet) {
						return res.status(400).json({
							status: 0,
							error: "INSUFFICIENT_FUNDS",
							details: "User does not have enough balance.",
							balance: balanceBefore,
						});
					}

					const balanceAfter = await updateUserBalance(user, -bet, {
						emitSocket: true,
					});

					// 🎯 Bilet çevrimi + Race puanı hook'u (Drakon bahsi konuldu)
					onBetSettled({
						userId: user._id,
						amount: bet,
						category: "casino",
						providerCode: "drakon",
					});
					user.xp = (user.xp || 0) + Math.floor(bet / 5);
					user.currency = user.currency || {};
					user.currency.coins =
						(user.currency.coins || 0) + bet / 500;
					user.affiliates.generated =
						(user.affiliates.generated || 0) + Number(bet);
					await user.save();
					emitUserBalance(null, user);

					await Transaction.create({
						txn_id: transaction_id,
						user_code: user._id.toString(),
						game_type: type,
						provider_code: "drakon",
						game_code: game,
						round_id: round_id,
						bet_money: bet,
						win_money: win,
						txn_type: "bet",
						balance_before: balanceBefore,
						balance_after: balanceAfter,
					});

					const settings = settingGet();
					const affiliateLevels = settings.general
						.affiliateLevels || {
						level1: 0.07,
						level2: 0.03,
						level3: 0.01,
					};

					const ref1 = user?.affiliates?.referrer;
					let ref2 = null;
					let ref3 = null;

					if (ref1) {
						const user1 = await User.findById(ref1).select(
							"affiliates.referrer"
						);
						ref2 = user1?.affiliates?.referrer;

						if (ref2) {
							const user2 = await User.findById(ref2).select(
								"affiliates.referrer"
							);
							ref3 = user2?.affiliates?.referrer;
						}
					}

					const distributions = [];
					if (ref1)
						distributions.push({
							id: ref1,
							level: 1,
							amount: Math.floor(bet * affiliateLevels.level1),
						});
					if (ref2)
						distributions.push({
							id: ref2,
							level: 2,
							amount: Math.floor(bet * affiliateLevels.level2),
						});
					if (ref3)
						distributions.push({
							id: ref3,
							level: 3,
							amount: Math.floor(bet * affiliateLevels.level3),
						});

					for (const dist of distributions) {
						if (dist.amount > 0) {
							await User.findByIdAndUpdate(dist.id, {
								$inc: {
									"affiliates.earned": dist.amount,
									"affiliates.available": dist.amount,
								},
								updatedAt: Date.now(),
							});

							await BalanceTransaction.create({
								amount: dist.amount,
								type: "affiliateCommission",
								user: dist.id,
								fromUser: user._id,
								state: "completed",
							});
						}
					}

					await logEvent("bet", {
						userId: user._id,
						gameId: game,
						betAmount: bet,
						winAmount: win,
					});

					await updateMissionProgress("bet", {
						userId: user._id,
						gameId: game,
						amount: bet,
					});

					await logEvent("spin", {
						userId: user._id,
						gameId: game,
						amount: 1,
					});

					return res.status(200).json({
						status: 1,
						balance: balanceAfter,
					});
				} catch (error) {
					console.error(
						"Error processing transaction bet:",
						error.message
					);
					return res.status(500).json({
						status: 0,
						error: "INTERNAL_ERROR",
						details: error.message,
					});
				}
			}

			case "transaction_win": {
				try {
					const {
						transaction_id,
						user_id,
						game,
						win,
						round_id,
						type,
					} = req.body;

					// Gerekli alanların kontrolü
					if (
						!transaction_id ||
						!user_id ||
						!win ||
						!round_id ||
						!type
					) {
						return res.status(400).json({
							status: 0,
							error: "INVALID_REQUEST",
							details:
								"Missing required fields: transaction_id, user_id, win, round_id, or type",
						});
					}

					// Kullanıcıyı numericId'ye göre bul
					const user = await User.findOne({ numericId: user_id });
					if (!user) {
						return res.status(404).json({
							status: 0,
							error: "USER_NOT_FOUND",
							details: `No user found with ID: ${user_id}`,
						});
					}
					const activeWallet = getActiveWallet(user);
					if (!activeWallet) {
						return res.status(404).json({
							status: 0,
							error: "WALLET_NOT_FOUND",
							details:
								"Active wallet could not be determined from currency.",
						});
					}

					// Tekrarlanan işlem kontrolü: Aynı transaction ID ile işlem varsa hata döndür
					const existingTransaction = await Transaction.findOne({
						txn_id: transaction_id,
						txn_type: "win",
					});
					if (existingTransaction) {
						return res.status(400).json({
							status: 0,
							error: "DUPLICATE_TRANSACTION",
							details: "Transaction with this ID already exists.",
						});
					}

					if (isUserBetAccessBlocked(user)) {
						const linkedBet = await Transaction.exists({
							user_code: user._id.toString(),
							round_id,
							txn_type: "bet",
						});
						if (!linkedBet) {
							return res.status(403).json({
								status: 0,
								error: BET_ACCESS_BLOCKED_CODE,
								details: BET_ACCESS_BLOCKED_MESSAGE,
								balance: 0,
							});
						}
					}

					// Kullanıcının mevcut bakiyesini alın
					const balanceBefore = activeWallet.balance || 0;

					// Kazanç miktarını ekle ve yeni bakiye oluştur
					const balanceAfter = await updateUserBalance(user, win, {
						emitSocket: true,
					});

					// İşlemi Transaction tablosuna kaydet
					const transaction = new Transaction({
						txn_id: transaction_id,
						user_code: user._id.toString(),
						game_type: type,
						provider_code: "drakon",
						game_code: game,
						round_id: round_id, // round_id kaydediliyor
						bet_money: 0,
						win_money: win,
						txn_type: "win",
						balance_before: balanceBefore,
						balance_after: balanceAfter,
					});

					await transaction.save();

					await logEvent("win", {
						userId: user._id,
						gameId: game,
						winAmount: win,
					});

					// Başarılı yanıt
					return res.status(200).json({
						status: 1,
						balance: balanceAfter,
					});
				} catch (error) {
					console.error(
						"Error processing transaction win:",
						error.message
					);
					return res.status(500).json({
						status: 0,
						error: "INTERNAL_ERROR",
						details: error.message,
					});
				}
			}

			case "refund": {
				try {
					const {
						user_id,
						refund_amount,
						txn_id,
						txn_type = "refund",
						game_type = "slot",
					} = req.body;

					// Gerekli alanların kontrolü
					if (!user_id || !refund_amount || !txn_id) {
						return res.status(400).json({
							status: 0,
							msg: "INVALID_REQUEST",
							details:
								"Missing required fields: user_id, refund_amount, or txn_id",
						});
					}

					// Kullanıcıyı veritabanında numericId'ye göre bul
					const user = await User.findOne({ numericId: user_id });
					if (!user) {
						return res.status(404).json({
							status: 0,
							msg: "USER_NOT_FOUND",
							details: `No user found with ID: ${user_id}`,
						});
					}

					const activeWallet = getActiveWallet(user);
					if (!activeWallet) {
						return res.status(404).json({
							status: 0,
							msg: "WALLET_NOT_FOUND",
							details:
								"Active wallet could not be determined from currency.",
						});
					}

					// İşlem daha önce kaydedilmiş mi?
					const existingTxn = await Transaction.findOne({ txn_id });
					if (existingTxn) {
						return res.status(400).json({
							status: 0,
							msg: "DUPLICATE_TRANSACTION",
							balance: activeWallet.balance || 0,
						});
					}

					// Kullanıcı bakiyesini güncelle
					const balanceBefore = activeWallet.balance || 0;
					const balanceAfter = await updateUserBalance(
						user,
						refund_amount,
						{ emitSocket: true }
					);

					// İşlemi veritabanına kaydet
					const transaction = new Transaction({
						txn_id,
						user_code: user._id.toString(),
						txn_type, // İşlem türü
						game_type, // Oyun türü
						refund_amount,
						balance_before: balanceBefore,
						balance_after: balanceAfter,
					});
					await transaction.save();

					// Yanıt döndür
					return res.status(200).json({
						status: 1,
						msg: "Refund processed successfully",
						balance: balanceAfter,
					});
				} catch (error) {
					console.error("Error processing refund:", error.message);
					return res.status(500).json({
						status: 0,
						msg: "Error processing refund",
						error: error.message,
					});
				}
			}

			default: {
				return res.status(400).json({
					status: 0,
					msg: "UNKNOWN_METHOD",
				});
			}
		}
	} catch (error) {
		console.error("Unexpected Error:", error.message);
		return res.status(500).json({
			status: 0,
			msg: "INTERNAL_ERROR",
			error: error.message,
		});
	}
});

module.exports = router;
