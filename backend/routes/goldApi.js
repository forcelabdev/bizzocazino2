const express = require("express");
const axios = require("axios");
const User = require("../database/models/User");
const Game = require("../database/models/Game");
const Transaction = require("../database/models/Transaction");
const SportsBet = require("../database/models/SportsBet");
const SportsBetEvent = require("../database/models/SportsBetEvent");
const BalanceTransaction = require("../database/models/BalanceTransaction");
const logEvent = require("../services/logEvent");
const { settingGet } = require("../utils/setting");
const {
	generalUserGetRakeback,
	generalUserGetFormated,
} = require("../utils/general/user");
const { getActiveWallet, updateUserBalance, emitUserBalance } = require("../utils/wallet");
const { getClientIp } = require("../utils/ip");
const { getMaxAccountBalance } = require("../config");
const {
	BET_ACCESS_BLOCKED_CODE,
	BET_ACCESS_BLOCKED_MESSAGE,
	CATEGORY_BET_LIMIT_EXCEEDED_CODE,
	getProviderVisibleBalance,
	isUserBetAccessBlocked,
	evaluateCategoryBetLimit,
} = require("../utils/userBetAccess");
const { onBetSettled } = require("../utils/wagerHooks");

const router = express.Router();

const BASE_URL = process.env.NEXUS_API_ENDPOINT;
const AGENT_CODE = process.env.NEXUS_AGENT_CODE;
const AGENT_TOKEN = process.env.NEXUS_AGENT_TOKEN;

router.post("/fetch-games", async (req, res) => {
	const { provider_code } = req.body;

	if (!provider_code) {
		return res.status(400).json({
			success: false,
			message: "provider_code parametresi gereklidir.",
		});
	}

	try {
		const response = await axios.post(BASE_URL, {
			method: "game_list",
			agent_code: AGENT_CODE,
			agent_token: AGENT_TOKEN,
			provider_code: provider_code,
		});

		const { status, msg, games } = response.data;

		if (status !== 1) {
			return res.status(500).json({
				success: false,
				message: `ShinoAPI hatası: ${msg}`,
			});
		}

		const promises = games.map(async (game) => {
			try {
				const banner = (game.banner || "").replaceAll(
					"assets.bd34fgabh.com",
					"assets.wkuytxcg8.com"
				);
				await Game.updateOne(
					{ game_code: game.game_code },
					{
						provider_code,
						game_code: game.game_code,
						game_name: game.game_name,
						banner,
						status: game.status,
						distribution: "nexus",
						game_type: "gameshow",
					},
					{ upsert: true }
				);
			} catch (err) {
				console.error(
					`Oyun kaydedilirken hata oluştu: ${game.game_code}`,
					err
				);
			}
		});

		await Promise.all(promises);

		res.status(200).json({
			success: true,
			message: "Oyunlar başarıyla kaydedildi.",
		});
	} catch (error) {
		console.error("ShinoAPI isteği sırasında hata oluştu:", error);
		res.status(500).json({
			success: false,
			message: "Oyunlar alınırken bir hata oluştu.",
		});
	}
});

router.post("/", async (req, res) => {
	const {
		method,
		user_code,
		provider_code,
		game_code,
		lang,
		game_type,
		slot,
		live,
		SB,
	} = req.body;

	if (!method) {
		return res.status(400).json({
			status: 0,
			msg: "INVALID_REQUEST",
			details: "Method is required.",
		});
	}

	try {
		switch (method) {
			case "game_launch": {
				if (!user_code || !provider_code) {
					return res.status(200).json({
						status: 0,
						msg: "INVALID_REQUEST",
						details: "User code and provider code are required.",
					});
				}

				const user = await User.findOne({ _id: user_code });
				if (!user) {
					return res
						.status(200)
						.json({ status: 0, msg: "USER_NOT_FOUND" });
				}

				if (isUserBetAccessBlocked(user)) {
					return res.status(403).json({
						status: 0,
						msg: BET_ACCESS_BLOCKED_CODE,
						details: BET_ACCESS_BLOCKED_MESSAGE,
					});
				}

				// SPORTSBOOK için game_code boş olabilir
				let game = null;
				if (game_code) {
					game = await Game.findOne({
						provider_code,
						game_code,
					});

					if (!game) {
						return res.status(200).json({
							status: 0,
							msg: "GAME_NOT_FOUND",
						});
					}
				}

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

				const response = await axios.post(BASE_URL, {
					method: "game_launch",
					agent_code: AGENT_CODE,
					agent_token: AGENT_TOKEN,
					user_code: user._id.toString(),
					provider_code,
					game_code: game_code || "",
					lang: lang || "tr",
				});

				return res.status(200).json(response.data);
			}

			case "sportsbook_launch": {
				if (!user_code) {
					return res.status(200).json({
						status: 0,
						msg: "INVALID_REQUEST",
						details: "User code is required.",
					});
				}

				const user = await User.findOne({ _id: user_code });
				if (!user) {
					return res.status(200).json({ status: 0, msg: "USER_NOT_FOUND" });
				}

				if (isUserBetAccessBlocked(user)) {
					return res.status(403).json({
						status: 0,
						msg: BET_ACCESS_BLOCKED_CODE,
						details: BET_ACCESS_BLOCKED_MESSAGE,
					});
				}

				const activeWallet = getActiveWallet(user);
				if (!activeWallet) {
					return res.status(400).json({
						status: 0,
						msg: "Failed to launch sportsbook",
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

				await logEvent("game_start", {
					userId: user._id,
					gameId: "nexus_sportsbook",
				});

				return res.status(200).json({
					status: 1,
					msg: "SUCCESS",
					widget: {
						cid: AGENT_TOKEN,
						token: user._id.toString(),
						region: "europe",
						locale: lang || "tr",
					},
				});
			}

			case "money_info": {
				const response = await axios.post(BASE_URL, {
					method: "money_info",
					agent_code: AGENT_CODE,
					agent_token: AGENT_TOKEN,
				});

				return res.status(200).json(response.data);
			}

			case "user_balance": {
				if (!user_code) {
					return res.status(400).json({
						status: 0,
						msg: "INVALID_REQUEST",
						details: "User code is required.",
					});
				}

				const user = await User.findOne({ _id: user_code });
				if (!user) {
					return res.status(404).json({
						status: 0,
						msg: "USER_NOT_FOUND",
						user_balance: 0,
					});
				}

				const { coinType, chain, type } = user.currency;
				const activeWallet = user.wallets.find(
					(wallet) =>
						wallet.coinType === coinType &&
						wallet.chain === chain &&
						wallet.type === type
				);
				const userBalance = activeWallet ? activeWallet.balance : 0;

				return res.status(200).json({
					status: 1,
					user_balance: getProviderVisibleBalance(user, userBalance),
				});
			}

			case "transaction": {
				// ============================================================
				// 1) Log the entire incoming request for debugging
				// ============================================================
				console.log("============== NEXUS TRANSACTION ==============");
				console.log(JSON.stringify(req.body, null, 2));
				console.log("===============================================");

				const {
					method,
					agent_code,
					agent_secret,
					agent_balance,
					user_code,
					user_balance,
					game_type,
					slot,
					live,
					SB,
					// ÖNEMLİ: Nexus, spor bahisi maç/market detaylarını ("betslips")
					// "SB" objesinin İÇİNDE değil, request body'nin KÖK seviyesinde
					// "info" adlı ayrı bir alanda (JSON string olarak) gönderiyor.
					// Örn: { "SB": {...}, "info": "{\"couponCode\":...,\"betslips\":[...]}" }
					info,
				} = req.body;

				// ============================================================
				// 2) Get gameDetails with proper fallback for SB
				// ============================================================
				let gameDetails;
				if (game_type === "SB") {
					gameDetails = SB;
				} else if (game_type === "slot") {
					gameDetails = slot;
				} else if (game_type === "live") {
					gameDetails = live;
				} else {
					gameDetails = null;
				}

				// ============================================================
				// 3) Extract fields with proper fallbacks for SB
				// ============================================================
				let provider_code = gameDetails?.provider_code || null;
				let game_code = gameDetails?.game_code || null;
				let bet_money = gameDetails?.bet_money || gameDetails?.betMoney || gameDetails?.amount || gameDetails?.stake || 0;
				let win_money = gameDetails?.win_money || gameDetails?.winMoney || gameDetails?.winAmount || gameDetails?.profit || gameDetails?.payout || 0;
				let txn_id = gameDetails?.txn_id || gameDetails?.transactionId || gameDetails?.txnId || null;
				let txn_type = gameDetails?.txn_type || gameDetails?.transactionType || gameDetails?.txnType || null;
				let round_id = gameDetails?.round_id || gameDetails?.roundId || null;

				// ============================================================
				// 4) VALIDATION - FIXED: SB support added
				// ============================================================
				const betMoneyNum = parseFloat(bet_money) || 0;
				const winMoneyNum = parseFloat(win_money) || 0;

				if (
					!txn_id ||
					!txn_type ||
					!user_code ||
					!game_type ||
					!gameDetails
				) {
					console.error("Invalid Request: Missing required fields.", {
						txn_id,
						txn_type,
						user_code,
						game_type,
						hasGameDetails: !!gameDetails,
						gameDetailsKeys: gameDetails ? Object.keys(gameDetails) : [],
					});
					return res.status(400).json({
						status: 0,
						msg: "INVALID_REQUEST",
						details: "Required fields are missing.",
					});
				}

				// ============================================================
				// 5) Process transaction
				// ============================================================
				try {
					const user = await User.findOne({ _id: user_code });
					if (!user) {
						console.error("User Not Found:", user_code);
						return res.status(404).json({
							status: 0,
							msg: "USER_NOT_FOUND",
							user_balance: 0,
						});
					}

					const { coinType, chain, type } = user.currency;
					const activeWallet = user.wallets.find(
						(wallet) =>
							wallet.coinType === coinType &&
							wallet.chain === chain &&
							wallet.type === type
					);

					if (!activeWallet) {
						console.error(
							"Active Wallet Not Found:",
							user.currency
						);
						return res.status(404).json({
							status: 0,
							msg: "WALLET_NOT_FOUND",
							user_balance: 0,
						});
					}

					const userLevelData = generalUserGetRakeback(user);
					const rakebackPercentage = userLevelData.percentage;

					// ============================================================
					// 6) Check for duplicate transaction
					// ============================================================
					const existingTxn = await Transaction.findOne({ txn_id });
					if (existingTxn) {
						console.log("Existing txn found, attempting merge:", {
							txn_id,
							incoming_type: txn_type,
							existing_type: existingTxn.txn_type,
						});
						
						if (txn_type === "credit" || txn_type === "win" || txn_type === "payout") {
							if (
								existingTxn.win_money &&
								existingTxn.win_money > 0
							) {
								console.log(
									"Duplicate credit ignored for txn_id:",
									txn_id
								);
								return res.status(400).json({
									status: 0,
									msg: "DUPLICATE_CREDIT",
									user_balance: activeWallet.balance,
								});
							}
							const balanceChange = winMoneyNum;
							const updatedUserCredit =
								await User.findByIdAndUpdate(
									user._id,
									{
										$inc: {
											"wallets.$[elem].balance":
												balanceChange,
											"stats.won": winMoneyNum,
										},
									},
									{
										arrayFilters: [
											{
												"elem.coinType":
													activeWallet.coinType,
												"elem.chain":
													activeWallet.chain,
												"elem.type": activeWallet.type,
											},
										],
										new: true,
									}
								).select("wallets");

							const balanceAfterMerge =
								updatedUserCredit.wallets.find(
									(w) =>
										w.coinType === activeWallet.coinType &&
										w.chain === activeWallet.chain &&
										w.type === activeWallet.type
								).balance;

							await Transaction.updateOne(
								{ _id: existingTxn._id },
								{
									$set: {
										win_money: winMoneyNum,
										txn_type:
											existingTxn.txn_type === "debit" || existingTxn.txn_type === "bet"
												? "debit_credit"
												: existingTxn.txn_type,
										balance_after: balanceAfterMerge,
									},
								}
							);

							emitUserBalance(null, {
								_id: user._id,
								wallets: updatedUserCredit.wallets,
								currency: user.currency,
							});

							return res.status(200).json({
								status: 1,
								user_balance: balanceAfterMerge,
								msg: "TRANSACTION_MERGED_CREDIT",
							});
						} else if (txn_type === "debit" || txn_type === "bet") {
							return res.status(400).json({
								status: 0,
								msg: "DUPLICATE_DEBIT",
								user_balance: activeWallet.balance,
							});
						} else if (txn_type === "debit_credit") {
							if (
								existingTxn.win_money &&
								existingTxn.win_money > 0
							) {
								return res.status(400).json({
									status: 0,
									msg: "DUPLICATE_DEBIT_CREDIT",
									user_balance: activeWallet.balance,
								});
							}
							const netChange = winMoneyNum;
							const updatedUserDebitCredit =
								await User.findByIdAndUpdate(
									user._id,
									{
										$inc: {
											"wallets.$[elem].balance":
												netChange,
											"stats.won": winMoneyNum,
										},
									},
									{
										arrayFilters: [
											{
												"elem.coinType":
													activeWallet.coinType,
												"elem.chain":
													activeWallet.chain,
												"elem.type": activeWallet.type,
											},
										],
										new: true,
									}
								).select("wallets");
							const balanceAfterMerge =
								updatedUserDebitCredit.wallets.find(
									(w) =>
										w.coinType === activeWallet.coinType &&
										w.chain === activeWallet.chain &&
										w.type === activeWallet.type
								).balance;
							await Transaction.updateOne(
								{ _id: existingTxn._id },
								{
									$set: {
										win_money: winMoneyNum,
										txn_type: "debit_credit",
										balance_after: balanceAfterMerge,
									},
								}
							);

							emitUserBalance(null, {
								_id: user._id,
								wallets: updatedUserDebitCredit.wallets,
								currency: user.currency,
							});

							return res.status(200).json({
								status: 1,
								user_balance: balanceAfterMerge,
								msg: "TRANSACTION_MERGED_DEBIT_CREDIT",
							});
						}
					}

					if (
						["debit", "bet", "debit_credit"].includes(txn_type) &&
						isUserBetAccessBlocked(user)
					) {
						return res.status(403).json({
							status: 0,
							msg: BET_ACCESS_BLOCKED_CODE,
							details: BET_ACCESS_BLOCKED_MESSAGE,
							user_balance: 0,
						});
					}

					// 🎯 Bet Limitleme: kategori bazlı tam blokaj / maksimum tutar kontrolü.
					if (["debit", "bet", "debit_credit"].includes(txn_type) && betMoneyNum > 0) {
						const betCategory =
							game_type === "SB"
								? "sportsBook"
								: game_type === "live" || game_type === "gameshow"
									? "liveCasino"
									: "slots";
						const limitCheck = evaluateCategoryBetLimit(user, betCategory, betMoneyNum);
						if (!limitCheck.allowed) {
							return res.status(403).json({
								status: 0,
								msg: limitCheck.reason,
								details:
									limitCheck.reason === CATEGORY_BET_LIMIT_EXCEEDED_CODE
										? `Bu kategori için maksimum bahis tutarı ${limitCheck.max} ile sınırlıdır.`
										: "Bu oyun kategorisine erişiminiz kısıtlanmıştır.",
								user_balance: 0,
							});
						}
					}

					// A credit for a bet accepted before the block is merged above.
					// Do not credit an orphan settlement created after a rejected bet.
					if (
						["credit", "win", "payout"].includes(txn_type) &&
						isUserBetAccessBlocked(user)
					) {
						return res.status(403).json({
							status: 0,
							msg: BET_ACCESS_BLOCKED_CODE,
							details: BET_ACCESS_BLOCKED_MESSAGE,
							user_balance: 0,
						});
					}

					// ============================================================
					// 7) Calculate balance change
					// ============================================================
					const balanceBefore = activeWallet.balance;
					let balanceChange = 0;
					let rakebackAmount = 0;
					let affiliateAmount = 0;
					let statsUpdate = {};

					if (txn_type === "debit" || txn_type === "bet") {
						if (balanceBefore < betMoneyNum) {
							console.error("Insufficient Funds:", {
								balanceBefore,
								bet_money: betMoneyNum,
							});
							return res.status(400).json({
								status: 0,
								msg: "INSUFFICIENT_USER_FUNDS",
								user_balance: balanceBefore,
							});
						}
						balanceChange = -betMoneyNum;
						statsUpdate["stats.bet"] = betMoneyNum;
						statsUpdate["xp"] = Math.floor(betMoneyNum / 5);
						statsUpdate["currency.coins"] = betMoneyNum / 500;
						rakebackAmount = Math.floor(
							betMoneyNum * rakebackPercentage
						);
					} else if (txn_type === "credit" || txn_type === "win" || txn_type === "payout") {
						balanceChange = winMoneyNum;
						statsUpdate["stats.won"] = winMoneyNum;
					} else if (txn_type === "debit_credit") {
						if (balanceBefore < betMoneyNum) {
							console.error("Insufficient Funds:", {
								balanceBefore,
								bet_money: betMoneyNum,
							});
							return res.status(400).json({
								status: 0,
								msg: "INSUFFICIENT_USER_FUNDS",
								user_balance: balanceBefore,
							});
						}
						balanceChange = -betMoneyNum + winMoneyNum;
						rakebackAmount = Math.floor(
							betMoneyNum * rakebackPercentage
						);
						statsUpdate["stats.bet"] = betMoneyNum;
						statsUpdate["stats.won"] = winMoneyNum;
						statsUpdate["xp"] = Math.floor(betMoneyNum / 5);
						statsUpdate["currency.coins"] = betMoneyNum / 500;
					}

					if (user.affiliates && user.affiliates.referrer) {
						affiliateAmount = Math.floor(betMoneyNum * 0.05);
						await User.findByIdAndUpdate(user.affiliates.referrer, {
							$inc: {
								"affiliates.earned": affiliateAmount,
								"affiliates.available": affiliateAmount,
							},
						});
					}

					// ============================================================
					// 8) Update user balance
					// ============================================================
					const updateQuery = {
						$inc: {
							"wallets.$[elem].balance": balanceChange,
							"rakeback.earned": rakebackAmount,
							"rakeback.available": rakebackAmount,
							...statsUpdate,
						},
					};

					const updatedUser = await User.findByIdAndUpdate(
						user._id,
						updateQuery,
						{
							arrayFilters: [
								{
									"elem.coinType": activeWallet.coinType,
									"elem.chain": activeWallet.chain,
									"elem.type": activeWallet.type,
								},
							],
							new: true,
						}
					).select("wallets currency");

					const balanceAfter = updatedUser.wallets.find(
						(w) =>
							w.coinType === activeWallet.coinType &&
							w.chain === activeWallet.chain &&
							w.type === activeWallet.type
					).balance;

					// ============================================================
					// 9) Save transaction
					// ============================================================
					const transaction = new Transaction({
						txn_id,
						user_code,
						game_type,
						provider_code,
						game_code,
						bet_money: betMoneyNum,
						win_money: winMoneyNum,
						txn_type,
						round_id:
							round_id ||
							Date.now() +
								Math.floor(Math.random() * (999_999 - 1) + 1),
						balance_before: balanceBefore,
						balance_after: balanceAfter,
						rakeback: rakebackAmount,
						affiliate: affiliateAmount,
						// SB (sportsbook) kuponlarının maç/market detaylarını (info) daha
						// sonra referans/debug için Transaction kaydında da saklıyoruz.
						// NOT: "info" request body'nin kök seviyesinden geliyor (SB'nin içinden değil).
						// ÖNEMLİ: Daha önce bu alan sadece "info" DOLU geldiğinde
						// yazılıyordu; "info" boş geldiğinde hiçbir iz kalmıyordu ve
						// sonradan hangi alanın eksik geldiğini teşhis etmek
						// imkansız oluyordu. Artık SB işlemlerinde "info" boş olsa
						// bile ham request body'sini saklıyoruz.
						extra:
							game_type === "SB"
								? { info: info || null, rawWebhook: req.body }
								: undefined,
					});

					await transaction.save();

					// 🎯 Bilet çevrimi + Race puanı hook'u (debit/debit_credit = bahis konuldu)
					if (
						(txn_type === "debit" || txn_type === "bet" || txn_type === "debit_credit") &&
						betMoneyNum > 0
					) {
						onBetSettled({
							userId: user._id,
							amount: betMoneyNum,
							category: game_type === "SB" ? "sportsBook" : "casino",
							providerCode: provider_code,
						});
					}

					emitUserBalance(null, {
						_id: user._id,
						wallets: updatedUser.wallets,
						currency: updatedUser.currency,
					});

					// ============================================================
					// 10) Handle nexus sportsbook bet tracking
					// ============================================================
					// ÖNEMLİ: Daha önce bu blok yalnızca kök seviyede "info" alanı
					// DOLU geldiğinde çalışıyordu (if (... && info)). Gerçek Nexus
					// trafiğinde bu alan hiç gelmediği için (bkz. üretim verisi)
					// spor bahisleri hiçbir zaman SportsBet/SportsBetEvent kaydına
					// dönüşmüyordu — panelde "Maç detayı bulunamadı" görünmesinin
					// asıl sebebi buydu. Artık "info" olmasa da bahsi takip
					// kaydına alıyoruz, olası alternatif alan adlarını da deniyoruz
					// ve ham webhook body'sini "extra.rawWebhook" içine kaydederek
					// sağlayıcının gerçek alan adını sonraki canlı bahiste
					// doğrulayabilmemizi sağlıyoruz.
					if (game_type === "SB") {
						try {
							const rawInfo =
								info ??
								gameDetails?.info ??
								req.body.betInfo ??
								req.body.bet_info ??
								req.body.Info ??
								SB?.info ??
								null;

							let betInfo = {};
							if (rawInfo) {
								try {
									betInfo =
										typeof rawInfo === "string"
											? JSON.parse(rawInfo)
											: rawInfo;
								} catch (parseErr) {
									console.error(
										"SB info alanı parse edilemedi:",
										parseErr.message,
										rawInfo
									);
									betInfo = {};
								}
							}

							const couponCode = betInfo.couponCode || txn_id;
							const betStatus = betInfo.status || "pending";

							// Nexus'tan gelen maç/market seçim (betslip) durumunu bizim
							// SportsBetEvent.status enum'una çeviriyoruz.
							const mapSlipStatus = (rawStatus) => {
								const map = {
									won: "won",
									win: "won",
									lost: "lost",
									lose: "lost",
									void: "void",
									cancelled: "cancelled",
									canceled: "cancelled",
									push: "void",
									postponed: "postponed",
									pending: "pending",
								};
								return map[String(rawStatus || "").toLowerCase()] || "pending";
							};

							// "0:1" veya "2-1" gibi skorları homeScore/awayScore'a ayırır.
							const parseScore = (scoreStr) => {
								if (!scoreStr || typeof scoreStr !== "string") return null;
								const match = scoreStr.match(/^(\d+)\s*[:\-]\s*(\d+)$/);
								if (!match) return null;
								return {
									homeScore: parseInt(match[1], 10),
									awayScore: parseInt(match[2], 10),
								};
							};

							if (txn_type === "debit" || txn_type === "bet") {
								const existingBet = await SportsBet.findOne({
									provider: "nexusggr",
									externalCouponId: couponCode,
								});

								if (!existingBet) {
									const betslips = betInfo.betslips || [];
									const eventCount = betslips.length || 1;
									const betType = eventCount === 1 ? "single" : "multiple";
									const hasLiveSlip = betslips.some((slip) => slip.type === "live");

									const sportsBet = await SportsBet.create({
										user: user._id,
										userNumericId: user.numericId,
										provider: "nexusggr",
										externalBetId: txn_id,
										externalCouponId: couponCode,
										amount: betMoneyNum,
										totalOdds: parseFloat(betInfo.totalOdds) || 1,
										potentialWin: parseFloat(betInfo.potentialWin) || 0,
										status: "pending",
										balanceBefore,
										balanceAfter,
										rakeback: rakebackAmount,
										affiliateCommission: affiliateAmount,
										betType,
										eventCount,
										isLive: hasLiveSlip,
										ipAddress: getClientIp(req),
										// rawWebhook: Nexus'un gerçek payload şeklini teyit
										// edebilmek için ham request body'sini saklıyoruz.
										extra: { betInfo, rawWebhook: req.body },
									});

									if (betslips.length > 0) {
										const eventDocs = betslips.map((slip) => {
											const startTimestamp = slip.startsAt
												? new Date(slip.startsAt).getTime()
												: undefined;
											const liveScore = parseScore(slip.betScore);

											return {
												bet: sportsBet._id,
												user: user._id,
												externalEventId: (slip.id || slip.oddPoint || "").toString(),
												externalGameId: (slip.matchId || "").toString(),
												matchTitle: slip.matchName || "",
												homeTeam: slip.homeTeam || "",
												awayTeam: slip.awayTeam || "",
												sportType: slip.sportName || "",
												leagueName: slip.leagueName || "",
												countryCode: slip.countryName || slip.countryId || "",
												marketType: slip.marketName || "",
												marketName: slip.marketName || "",
												pick: slip.oddName || "",
												// "1x2 - 1" gibi daha açıklayıcı etiket varsa onu kullan,
												// yoksa ham seçim adına (oddName) düş.
												displayText: slip.labelName || slip.oddName || "",
												odds: parseFloat(slip.oddRate) || 1,
												status: mapSlipStatus(slip.status),
												startTimestamp,
												startDate: startTimestamp ? new Date(startTimestamp) : undefined,
												isLive: slip.type === "live",
												homeScore: liveScore?.homeScore,
												awayScore: liveScore?.awayScore,
												finalScore: slip.resultScore || slip.betScore || undefined,
												extra: slip,
											};
										});
										await SportsBetEvent.insertMany(eventDocs);
									}

									if (user.affiliates && user.affiliates.referrer) {
										const settings = settingGet();
										const affiliateLevels = settings.general?.affiliateLevels || {
											level1: 0.07, level2: 0.03, level3: 0.01,
										};

										const ref1 = user.affiliates.referrer;
										let ref2 = null, ref3 = null;

										if (ref1) {
											const user1 = await User.findById(ref1).select("affiliates.referrer");
											ref2 = user1?.affiliates?.referrer;
											if (ref2) {
												const user2 = await User.findById(ref2).select("affiliates.referrer");
												ref3 = user2?.affiliates?.referrer;
											}
										}

										const distributions = [];
										if (ref1) distributions.push({ id: ref1, level: 1, amount: Math.floor(betMoneyNum * affiliateLevels.level1) });
										if (ref2) distributions.push({ id: ref2, level: 2, amount: Math.floor(betMoneyNum * affiliateLevels.level2) });
										if (ref3) distributions.push({ id: ref3, level: 3, amount: Math.floor(betMoneyNum * affiliateLevels.level3) });

										for (const dist of distributions) {
											if (dist.amount > 0) {
												await User.findByIdAndUpdate(dist.id, {
													$inc: {
														"affiliates.earned": dist.amount,
														"affiliates.available": dist.amount,
													},
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
									}

									await logEvent("bet", {
										userId: user._id,
										gameId: "nexus_sportsbook",
										betAmount: betMoneyNum,
									});
								}
							} else if (txn_type === "credit" || txn_type === "win" || txn_type === "payout") {
								const sportsBet = await SportsBet.findOne({
									provider: "nexusggr",
									externalCouponId: couponCode,
								});

								if (sportsBet && sportsBet.status === "pending") {
									const statusMap = {
										won: "won",
										lost: "lost",
										cashedout: "cashout",
										canceled: "cancelled",
									};
									const mappedStatus = statusMap[betStatus] || betStatus;

									sportsBet.status = mappedStatus;
									sportsBet.actualWin = winMoneyNum;
									sportsBet.settlementBalanceBefore = balanceBefore;
									sportsBet.settlementBalanceAfter = balanceAfter;
									sportsBet.settledAt = new Date();
									await sportsBet.save();

									// Kuponun içindeki her bir maçı (betslip) kendi sonucuna göre
									// (kazandı/kaybetti/vs.) ayrı ayrı güncelliyoruz, hepsine kupon
									// genel durumunu basmıyoruz — böylece çoklu kuponlarda hangi
									// maçın kazanılıp hangisinin kaybedildiği görülebiliyor.
									const settledSlips = betInfo.betslips || [];
									if (settledSlips.length > 0) {
										const events = await SportsBetEvent.find({
											bet: sportsBet._id,
										});

										for (const slip of settledSlips) {
											const slipEventId = (
												slip.id || slip.oddPoint || ""
											).toString();
											const event = events.find(
												(ev) => ev.externalEventId === slipEventId
											);
											if (!event) continue;

											const liveScore = parseScore(
												slip.resultScore || slip.betScore
											);

											event.status = mapSlipStatus(slip.status);
											event.finalScore =
												slip.resultScore || slip.betScore || event.finalScore;
											if (liveScore) {
												event.homeScore = liveScore.homeScore;
												event.awayScore = liveScore.awayScore;
											}
											event.extra = slip;
											await event.save();
										}
									} else {
										// Betslip detayı yoksa (eski format vs.) en azından kupon
										// genel durumunu maçlara da yansıtalım.
										await SportsBetEvent.updateMany(
											{ bet: sportsBet._id },
											{ $set: { status: mappedStatus } }
										);
									}

									if (mappedStatus === "won") {
										await logEvent("win", {
											userId: user._id,
											gameId: "nexus_sportsbook",
											winAmount: winMoneyNum,
										});
									}
								}
							}
						} catch (sbError) {
							console.error(
								"Nexus SB bet tracking error:",
								sbError?.name,
								sbError?.message,
								sbError?.errors
									? JSON.stringify(sbError.errors)
									: "",
							);
						}
					}

					return res.status(200).json({
						status: 1,
						user_balance: balanceAfter,
						msg: "TRANSACTION_SUCCESS",
					});
				} catch (error) {
					console.error("Unexpected Error:", error.message);
					return res.status(500).json({
						status: 0,
						msg: "INTERNAL_ERROR",
						details: error.message,
					});
				}
			}

			default:
				return res
					.status(400)
					.json({ status: 0, msg: "UNKNOWN_METHOD" });
		}
	} catch (error) {
		console.error(error);

		if (error.response) {
			return res.status(500).json(error.response.data);
		}
		return res
			.status(500)
			.json({ status: 0, msg: "INTERNAL_ERROR", error: error.message });
	}
});

module.exports = router;
