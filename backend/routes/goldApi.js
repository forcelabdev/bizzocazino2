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
const trialBonusService = require("../services/trialBonusService");

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
				// 2.5) SB (sportsbook) "info" alanını EN BAŞTA çözümle
				// ============================================================
				// KÖK NEDEN: Nexus, spor bahsinin SONUÇ bildirimini (won/lost/void)
				// genellikle bahsin İLK "debit" isteğiyle AYNI txn_id üzerinden
				// "credit" olarak gönderiyor (bkz. üretim loglarında canlı rulet
				// örneğinde aynı txn_id'nin önce "debit" sonra "credit" olarak
				// gelmesi ve "Existing txn found, attempting merge" satırı).
				// Kod, aynı txn_id ile tekrar istek geldiğinde aşağıdaki "mükerrer
				// txn_id" birleştirme bloğuna girip SADECE bakiyeyi güncelleyip
				// erken dönüyordu (early return) — kuponun nihai durumunu
				// (SportsBet.status / SportsBetEvent sonuçları) ve "info"
				// içeriğini HİÇ işlemiyordu. Panelde kuponların sürekli "pending"
				// kalması ve "Maç detayı bulunamadı" görünmesinin asıl sebebi buydu
				// — Nexus'un "info" alanını göndermemesi değildi.
				//
				// Bu yüzden "info" çözümlemesini ve settlement (sonuçlandırma)
				// mantığını burada, hem "yeni transaction" hem de "mükerrer
				// txn_id" akışlarının ORTAK olarak kullanabileceği şekilde
				// tanımlıyoruz.
				const rawInfo =
					info ??
					(game_type === "SB" ? gameDetails?.info : undefined) ??
					req.body.betInfo ??
					req.body.bet_info ??
					req.body.Info ??
					null;

				let betInfo = {};
				if (rawInfo) {
					try {
						betInfo =
							typeof rawInfo === "string" ? JSON.parse(rawInfo) : rawInfo;
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

				// SB kuponunun/maçının nihai sonucunu (won/lost/void/...) hem
				// SportsBet hem de SportsBetEvent kayıtlarına işler. Bu fonksiyon
				// hem "yeni transaction" akışından hem de "mükerrer txn_id"
				// birleştirme akışından (aynı txn_id ile gelen settlement)
				// çağrılabiliyor — settlement artık HANGİ yoldan gelirse gelsin
				// işleniyor.
				const applySportsBetSettlement = async ({
					winMoney,
					balanceBefore,
					balanceAfter,
				}) => {
					if (game_type !== "SB") return;
					const sportsBet = await SportsBet.findOne({
						provider: "nexusggr",
						externalCouponId: couponCode,
					});
					if (!sportsBet || sportsBet.status !== "pending") return;

					const statusMap = {
						won: "won",
						lost: "lost",
						cashedout: "cashout",
						canceled: "cancelled",
					};
					const mappedStatus = statusMap[betStatus] || betStatus;

					sportsBet.status = mappedStatus;
					sportsBet.actualWin = winMoney;
					sportsBet.settlementBalanceBefore = balanceBefore;
					sportsBet.settlementBalanceAfter = balanceAfter;
					sportsBet.settledAt = new Date();
					await sportsBet.save();

					// Kuponun içindeki her bir maçı (betslip) kendi sonucuna göre
					// (kazandı/kaybetti/vs.) ayrı ayrı güncelliyoruz.
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
				};

				// ============================================================
				// 3) Extract fields with proper fallbacks for SB
				// ============================================================
				let provider_code = gameDetails?.provider_code || null;
				let game_code = gameDetails?.game_code || null;
				let bet_money = gameDetails?.bet_money || gameDetails?.betMoney || gameDetails?.amount || gameDetails?.stake || 0;
				let win_money = gameDetails?.win_money || gameDetails?.winMoney || gameDetails?.winAmount || gameDetails?.profit || gameDetails?.payout || 0;
					let txn_id = gameDetails?.txn_id || gameDetails?.transactionId || gameDetails?.txnId || null;
					// ÖNEMLİ (sağlayıcı dokümantasyonu): "txn_id" bir BAHSE (round) aittir ve
					// o bahsin ürettiği TÜM transaction'larda (debit + birden fazla credit)
					// AYNIDIR — transaction başına benzersiz DEĞİLDİR. Gerçek benzersiz alan
					// "txn_id_v2"dir ve mükerrer (idempotency) kontrolü SADECE bunun üzerinden
					// yapılmalıdır.
					let txn_id_v2 = gameDetails?.txn_id_v2 || gameDetails?.txnIdV2 || gameDetails?.transactionIdV2 || null;
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
					// 6) Idempotency & çoklu-transaction (aynı bahis) yönetimi
					// ============================================================
					// KÖK NEDEN (canlı casino / slot işlemlerinin sağlayıcıda "failed"
					// görünmesi ve panele düşmemesi): Bir bahis (round_id / txn_id) TEK
					// bir ödeme değildir — tumbling win, free spin turları, kapanış
					// tahsilatı gibi BİRDEN FAZLA transaction üretebilir ve bunların
					// HEPSİ AYNI "txn_id"yi paylaşır. Eski kod dedup'ı "txn_id" üzerinden
					// yaptığı için, aynı txn_id ile gelen İKİNCİ+ credit'i
					// "DUPLICATE_CREDIT" (status 0) ile REDDEDİYORDU. Sağlayıcı bunu
					// "transaction failed" olarak görüyor, tur tamamlanamıyor ve işlem
					// admin paneline hiç düşmüyordu.
					//
					// DÜZELTME (sağlayıcı dokümantasyonuna uygun): Idempotency SADECE
					// benzersiz "txn_id_v2" üzerinden yapılır. Aynı txn_id'ye ait tüm
					// transaction'lar TEK bir Transaction kaydında toplanır (mevcut unique
					// "txn_id" index'i korunur, DB migration gerekmez). İşlenen her
					// txn_id_v2, "extra.processedV2" dizisinde tutulur:
					//   - Aynı txn_id_v2 tekrar gelirse → gerçek mükerrer/retry → bakiye
					//     değiştirilmeden status 1 (idempotent başarı) döndürülür.
					//   - Yeni bir txn_id_v2 gelirse → tutar BİRİKTİRİLEREK işlenir
					//     (credit eklenir / debit düşülür); artık ASLA reddedilmez.
					const existingTxn = await Transaction.findOne({ txn_id });
					if (existingTxn) {
						const processedV2 =
							(existingTxn.extra && existingTxn.extra.processedV2) || [];

						// Gerçek mükerrer: bu iç-spin (txn_id_v2) daha önce işlenmiş.
						if (txn_id_v2 && processedV2.includes(txn_id_v2)) {
							console.log(
								"Duplicate txn_id_v2 ignored (idempotent):",
								txn_id_v2
							);
							return res.status(200).json({
								status: 1,
								user_balance: activeWallet.balance,
								msg: "DUPLICATE_TXN_IGNORED",
							});
						}

						console.log("Existing txn found, accumulating:", {
							txn_id,
							txn_id_v2,
							incoming_type: txn_type,
							existing_type: existingTxn.txn_type,
						});

						const isCredit =
							txn_type === "credit" ||
							txn_type === "win" ||
							txn_type === "payout";
						const isDebit = txn_type === "debit" || txn_type === "bet";
						const isDebitCredit = txn_type === "debit_credit";

						// Ek debit / debit_credit için yetersiz bakiye kontrolü.
						if ((isDebit || isDebitCredit) && activeWallet.balance < betMoneyNum) {
							console.error("Insufficient Funds (accumulate):", {
								balance: activeWallet.balance,
								bet_money: betMoneyNum,
							});
							return res.status(400).json({
								status: 0,
								msg: "INSUFFICIENT_USER_FUNDS",
								user_balance: activeWallet.balance,
							});
						}

						const balanceChange = isCredit
							? winMoneyNum
							: isDebit
								? -betMoneyNum
								: -betMoneyNum + winMoneyNum; // debit_credit

						const statsInc = {};
						if (isCredit) {
							statsInc["stats.won"] = winMoneyNum;
						} else if (isDebit) {
							statsInc["stats.bet"] = betMoneyNum;
						} else if (isDebitCredit) {
							statsInc["stats.bet"] = betMoneyNum;
							statsInc["stats.won"] = winMoneyNum;
						}

						const updatedUserMerge = await User.findByIdAndUpdate(
							user._id,
							{
								$inc: {
									"wallets.$[elem].balance": balanceChange,
									...statsInc,
								},
							},
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
						).select("wallets");

						const balanceAfterMerge = updatedUserMerge.wallets.find(
							(w) =>
								w.coinType === activeWallet.coinType &&
								w.chain === activeWallet.chain &&
								w.type === activeWallet.type
						).balance;

						// Aggregate Transaction kaydını güncelle: tutarları biriktir,
						// işlenen txn_id_v2'yi kaydet, gerekiyorsa tipi debit_credit yap.
						const nextTxnType =
							(existingTxn.txn_type === "debit" ||
								existingTxn.txn_type === "bet") &&
							(isCredit || isDebitCredit)
								? "debit_credit"
								: existingTxn.txn_type;

						const incFields = {};
						if (betMoneyNum) incFields.bet_money = betMoneyNum;
						if (winMoneyNum) incFields.win_money = winMoneyNum;

						const updateOps = {
							$set: {
								txn_type: nextTxnType,
								balance_after: balanceAfterMerge,
								"extra.info": rawInfo,
								"extra.betInfo": betInfo,
								"extra.rawWebhook": req.body,
							},
						};
						if (Object.keys(incFields).length > 0) {
							updateOps.$inc = incFields;
						}
						if (txn_id_v2) {
							updateOps.$push = { "extra.processedV2": txn_id_v2 };
						}

						await Transaction.updateOne({ _id: existingTxn._id }, updateOps);

						emitUserBalance(null, {
							_id: user._id,
							wallets: updatedUserMerge.wallets,
							currency: user.currency,
						});

						// SB (spor bahis) settlement: kazanç/sonuç bildirimi bu yoldan
						// gelirse de kupon durumu (won/lost/void) ve maç sonuçları işlensin.
						if (isCredit || isDebitCredit) {
							await applySportsBetSettlement({
								winMoney: winMoneyNum,
								balanceBefore: activeWallet.balance,
								balanceAfter: balanceAfterMerge,
							});
						}

						// Bilet çevrimi + Race puanı hook'u: ek debit/debit_credit de bahis.
						if ((isDebit || isDebitCredit) && betMoneyNum > 0) {
							onBetSettled({
								userId: user._id,
								amount: betMoneyNum,
								category: game_type === "SB" ? "sportsBook" : "casino",
								providerCode: provider_code,
							});
						}

						// 🎯 Deneme Bonusu hedef bakiye kontrolü — bu akış bakiyeyi
						// wallet.js'i atlayarak günceller, ana akıştaki kontrole uğramadan
						// döner; bu yüzden burada ayrıca çağırmak gerekir.
						trialBonusService
							.checkTrialBonusTargetBalance(user._id, balanceAfterMerge)
							.catch((err) =>
								console.error(
									"❌ GoldApi accumulate → deneme bonusu hedef bakiye kontrolü hatası:",
									err.message
								)
							);

						return res.status(200).json({
							status: 1,
							user_balance: balanceAfterMerge,
							msg: "TRANSACTION_ACCUMULATED",
						});
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
						// "processedV2": Bu bahse (txn_id) ait işlenmiş txn_id_v2'lerin listesi.
						// Idempotency ve aynı tura ait sonraki credit'lerin (tumbling/free
						// spin) biriktirilmesi bu diziye göre yapılır (bkz. adım 6).
						//
						// SB (sportsbook) kuponlarının maç/market detaylarını (info) daha
						// sonra referans/debug için Transaction kaydında da saklıyoruz.
						// NOT: "info" request body'nin kök seviyesinden geliyor (SB'nin içinden değil).
						// ÖNEMLİ: Daha önce bu alan sadece "info" DOLU geldiğinde
						// yazılıyordu; "info" boş geldiğinde hiçbir iz kalmıyordu ve
						// sonradan hangi alanın eksik geldiğini teşhis etmek
						// imkansız oluyordu. Artık SB işlemlerinde "info" boş olsa
						// bile ham request body'sini saklıyoruz.
						extra: {
							processedV2: txn_id_v2 ? [txn_id_v2] : [],
							...(game_type === "SB"
								? { info: info || null, rawWebhook: req.body }
								: {}),
						},
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

					// 🎯 Deneme Bonusu hedef bakiye kontrolü. Bu route bakiyeyi
					// `wallet.js → updateWalletBalance`'ı ATLAYARAK ham $inc ile
					// güncellediği için o hook'tan hiç geçmez — burada AYRICA
					// çağırmak gerekir (Çevrim Katsayısı=0 + Hedef Bakiye kullanan
					// deneme bonusları için hem bet hem win/settlement callback'lerinde şart).
					trialBonusService
						.checkTrialBonusTargetBalance(user._id, balanceAfter)
						.catch((err) =>
							console.error(
								"❌ GoldApi callback → deneme bonusu hedef bakiye kontrolü hatası:",
								err.message
							)
						);

					emitUserBalance(null, {
						_id: user._id,
						wallets: updatedUser.wallets,
						currency: updatedUser.currency,
					});

					// ============================================================
					// 10) Handle nexus sportsbook bet tracking
					// ============================================================
					// NOT: "rawInfo"/"betInfo"/"couponCode"/"betStatus" ve
					// "mapSlipStatus"/"parseScore" artık bu case'in en başında
					// (2.5 numaralı adımda) TEK SEFER hesaplanıyor; hem burada
					// (yeni bet oluşturma / ilk kez görülen settlement) hem de
					// yukarıdaki "mükerrer txn_id" birleştirme akışında aynı
					// değerler kullanılıyor. Bu sayede iki akış birbirinden
					// sapmıyor.
					if (game_type === "SB") {
						try {
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
									// Ortak settlement mantığı: SportsBet.status/actualWin ve her
									// betslip'in SportsBetEvent sonucunu günceller. Aynı fonksiyon
									// yukarıdaki "mükerrer txn_id" birleştirme akışında da
									// kullanılıyor, böylece iki yol birbirinden sapmıyor.
									await applySportsBetSettlement({
										winMoney: winMoneyNum,
										balanceBefore,
										balanceAfter,
									});

									const statusMap = {
										won: "won",
										lost: "lost",
										cashedout: "cashout",
										canceled: "cancelled",
									};
									const mappedStatus = statusMap[betStatus] || betStatus;

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
