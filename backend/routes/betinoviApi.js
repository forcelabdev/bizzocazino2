const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const router = express.Router();
const Game = require("../database/models/Game");
const User = require("../database/models/User");
const Transaction = require("../database/models/Transaction");
const BalanceTransaction = require("../database/models/BalanceTransaction");
const logEvent = require("../services/logEvent");
const { settingGet } = require("../utils/setting");
const {
	getActiveWallet,
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
const { generalUserGetRakeback } = require("../utils/general/user");
const trialBonusService = require("../services/trialBonusService");
const { onBetSettled } = require("../utils/wagerHooks");

// Betinovi API Credentials (varsayılan / bizzocasinoyeni agent)
const BETINOVI_BASE_URL = process.env.BETINOVI_API_ENDPOINT;
const BETINOVI_AGENT_CODE = process.env.BETINOVI_AGENT_CODE;
const BETINOVI_AGENT_TOKEN = process.env.BETINOVI_AGENT_TOKEN;

// Betinovi API Credentials (deneme bonusu / bizzodeneme agent). Aktif bir
// deneme bonusu çevrim şartı olan kullanıcılar oyunu bu agent üzerinden
// açar; çevrim tamamlanınca otomatik olarak yukarıdaki varsayılan agent'a
// geri döner. Bkz. trialBonusService.hasActiveTrialWageringLock.
const BETINOVI_BASE_URL_2 = process.env.BETINOVI_API_ENDPOINT_2;
const BETINOVI_AGENT_CODE_2 = process.env.BETINOVI_AGENT_CODE_2;
const BETINOVI_AGENT_TOKEN_2 = process.env.BETINOVI_AGENT_TOKEN_2;

const SINGLE_GAME_VENDORS = {
	"sport-bbbet": {
		game_name: "Sports Betting",
		game_type: "sport",
		banner: "",
	},
};
const { updateMissionProgress } = require("../services/MissionEngine");

const findValidUserById = async (userId) => {
	const normalizedUserId = userId?.toString?.().trim();

	if (!normalizedUserId) {
		return null;
	}

	if (!mongoose.Types.ObjectId.isValid(normalizedUserId)) {
		return null;
	}

	return User.findById(normalizedUserId);
};

const BETINOVI_CALLBACK_TXN_TYPES = {
	0: "debit",
	1: "credit",
	2: "refund",
};

const normalizeCallbackString = (value) => {
	if (value === undefined || value === null) return "";
	return value.toString().trim();
};

const normalizeCallbackAmount = (value, txnType) => {
	const amount = Number(value);
	if (!Number.isFinite(amount)) return null;

	// Debit (bet) transactions must move a strictly positive amount.
	if (txnType === 0) {
		return amount > 0 ? Math.abs(amount) : null;
	}

	// Credit (win) and refund transactions may legitimately settle with a
	// zero amount (e.g. a round finished with no win, or a zero-value
	// refund). Only reject negative or non-numeric values here.
	return amount >= 0 ? Math.abs(amount) : null;
};

const normalizeCallbackTxnType = (value) => {
	const txnType = Number(value);
	return Number.isInteger(txnType) && BETINOVI_CALLBACK_TXN_TYPES[txnType]
		? txnType
		: null;
};

const uniqueCallbackValues = (values) => {
	const normalizedValues = [];
	const seen = new Set();

	const addValue = (value) => {
		if (value === undefined || value === null || value === "") return;
		const key = `${typeof value}:${value}`;
		if (seen.has(key)) return;
		seen.add(key);
		normalizedValues.push(value);
	};

	for (const value of values) {
		const stringValue = normalizeCallbackString(value);
		if (!stringValue) continue;

		addValue(stringValue);
		if (typeof value === "number") addValue(value);

		const numericValue = Number(stringValue);
		if (Number.isFinite(numericValue)) addValue(numericValue);
	}

	return normalizedValues;
};

const buildBetinoviLinkedTransactionQuery = ({
	userId,
	vendorCode,
	gameCode,
	txnType,
	pairCode,
	wagerId,
	gameRoundId,
}) => {
	const normalizedPairCode = normalizeCallbackString(pairCode);
	const roundValues = uniqueCallbackValues([gameRoundId, wagerId, pairCode]);
	const linkConditions = [];

	if (normalizedPairCode) {
		linkConditions.push({ txn_id: normalizedPairCode });
	}

	if (roundValues.length > 0) {
		linkConditions.push({ round_id: { $in: roundValues } });
		linkConditions.push({ "extra.gameRoundId": { $in: roundValues } });
		linkConditions.push({ "extra.wagerId": { $in: roundValues } });
		linkConditions.push({ "extra.pairCode": { $in: roundValues } });
	}

	if (linkConditions.length === 0) return null;

	return {
		user_code: normalizeCallbackString(userId),
		provider_code: normalizeCallbackString(vendorCode),
		txn_type: txnType,
		...(normalizeCallbackString(gameCode) && {
			game_code: normalizeCallbackString(gameCode),
		}),
		$or: linkConditions,
	};
};

const findBetinoviLinkedTransaction = (params, options = {}) => {
	const query = buildBetinoviLinkedTransactionQuery(params);
	if (!query) return null;

	const mongooseQuery = Transaction.findOne(query);
	return options.session ? mongooseQuery.session(options.session) : mongooseQuery;
};

const betinoviDuplicateProjection =
	"user_code provider_code txn_type bet_money win_money balance_after extra.amount";

const isSameBetinoviCallbackTransaction = (
	transaction,
	{ userCode, vendorCode, txnType, amount }
) => {
	if (!transaction) return false;

	const expectedTxnType = BETINOVI_CALLBACK_TXN_TYPES[txnType];
	const transactionAmount =
		txnType === 0
			? transaction.bet_money
			: txnType === 1
				? transaction.win_money
				: transaction.extra?.amount;
	const sameAmount =
		txnType === 2 && transactionAmount === undefined
			? true
			: Number(transactionAmount || 0) === amount;

	return (
		normalizeCallbackString(transaction.user_code) === userCode &&
		normalizeCallbackString(transaction.provider_code) === vendorCode &&
		transaction.txn_type === expectedTxnType &&
		sameAmount
	);
};

const buildBetinoviProcessedResponse = (transaction, fallbackBalance = 0) => {
	const balance = Number(transaction?.balance_after);

	return {
		status: 0,
		msg: "SUCCESS",
		balance: Number.isFinite(balance) ? balance : fallbackBalance,
	};
};

// Helper: Make API request to Betinovi.
// `agent` "trial" ise bizzodeneme (BETINOVI_*_2) kimlik bilgileri, aksi
// halde (varsayılan) bizzocasinoyeni kimlik bilgileri kullanılır.
const betinoviRequest = async (payload, agent = "default") => {
	const useTrialAgent = agent === "trial";
	const baseUrl = useTrialAgent ? BETINOVI_BASE_URL_2 : BETINOVI_BASE_URL;
	const agentToken = useTrialAgent ? BETINOVI_AGENT_TOKEN_2 : BETINOVI_AGENT_TOKEN;
	const agentCode = useTrialAgent ? BETINOVI_AGENT_CODE_2 : BETINOVI_AGENT_CODE;

	try {
		const response = await axios.post(
			baseUrl,
			{
				...payload,
				token: agentToken,
				agentCode: agentCode,
			},
			{
				headers: {
					"Content-Type": "application/json",
				},
				timeout: 30000,
			}
		);
		return response.data;
	} catch (error) {
		console.error(
			"Betinovi API Error:",
			error.response?.data || error.message
		);
		throw error;
	}
};

// ==================== OPERATOR API ENDPOINTS ====================

// Main endpoint for frontend requests
router.post("/", async (req, res) => {
	const { method } = req.body;

	if (!method) {
		return res.status(400).json({
			status: 2,
			msg: "INVALID_ACTION",
			details: "Method is required.",
		});
	}

	try {
		switch (method) {
			// -------------------- Game Launch --------------------
			case "game_launch":
			case "GetGameUrl": {
				const {
					user_id,
					vendorCode,
					gameCode,
					language = "tr",
					channel = "desktop",
					customData,
				} = req.body;

				if (!user_id || !vendorCode) {
					return res.status(200).json({
						status: 0,
						msg: "INVALID_REQUEST",
						details: "User code and provider code are required.",
					});
				}

				const user = await findValidUserById(user_id);
				if (!user) {
					return res.status(200).json({
						status: 5,
						msg: "INVALID_USER",
					});
				}

				if (isUserBetAccessBlocked(user)) {
					return res.status(403).json({
						status: 6,
						msg: BET_ACCESS_BLOCKED_CODE,
						details: BET_ACCESS_BLOCKED_MESSAGE,
					});
				}

				const activeWallet = getActiveWallet(user);
				if (!activeWallet) {
					return res.status(400).json({
						status: 8,
						msg: "INSUFFICIENT_MONEY",
						details: "Aktif cüzdan bulunamadı.",
					});
				}

				const maxBalance = await getMaxAccountBalance();
				if (activeWallet.balance >= maxBalance) {
					return res.status(400).json({
						status: 6,
						msg: "INVALID_BALANCE",
						details: `Bakiyeniz ${maxBalance}₺ bonus şartına ulaştı. Oyunlara katılmak için lütfen destek ekibimizle iletişime geçin.`,
					});
				}

				// Deneme bonusundan kalan çevrim şartı aktifse, oyun bizzodeneme
				// (BETINOVI_*_2) agent'ı üzerinden açılır — RTP override YOKTUR,
				// bizzodeneme agent'ının kendi konfigürasyonu geçerlidir. Çevrim
				// tamamlandığında (veya hiç yoksa) burası false döner ve bir
				// dahaki oyun açılışında otomatik olarak varsayılan
				// (bizzocasinoyeni) agent'a geri dönülür.
				const useTrialAgent =
					await trialBonusService.hasActiveTrialWageringLock(user);

				const launchPayload = {
					method: "GetGameUrl",
					userCode: user._id.toString(),
					nickname: user.username || "Player",
					vendorCode,
					gameCode: SINGLE_GAME_VENDORS[vendorCode] ? "" : (gameCode || null),
					currencyCode: "TRY",
					language: language || "tr",
					channel: channel || "desktop",
					...(customData && { customData }),
				};

				const response = await betinoviRequest(
					launchPayload,
					useTrialAgent ? "trial" : "default"
				);

				if (response.status === 0 && response.launchUrl) {
					await logEvent("game_start", {
						userId: user._id,
						gameId: gameCode || vendorCode,
					});

					await updateMissionProgress("game_start", {
						userId: user._id,
						gameId: gameCode || vendorCode,
					});

					return res.status(200).json({
						status: 1,
						msg: "SUCCESS",
						launch_url: response.launchUrl,
					});
				}

				return res.status(400).json({
					status: response.status,
					msg: response.msg || "Failed to launch game",
				});
			}

			// -------------------- Get Vendors --------------------
			case "get_vendors":
			case "GetVendors": {
				const response = await betinoviRequest({
					method: "GetVendors",
				});

				if (response.status === 0) {
					return res.status(200).json({
						status: 1,
						msg: "SUCCESS",
						vendors: response.vendors || [],
					});
				}

				return res.status(400).json(response);
			}

			// -------------------- Get Vendor Games --------------------
			case "get_vendor_games":
			case "GetVendorGames": {
				const { vendorCode } = req.body;

				if (!vendorCode) {
					return res.status(400).json({
						status: 13,
						msg: "INVALID_PARAMETER",
						details: "vendorCode is required",
					});
				}

				const response = await betinoviRequest({
					method: "GetVendorGames",
					vendorCode,
				});

				if (response.status === 0) {
					return res.status(200).json({
						status: 1,
						msg: "SUCCESS",
						games: response.vendorGames || [],
					});
				}

				return res.status(400).json(response);
			}

			// -------------------- Fetch and Save Games --------------------
			case "fetch_games": {
				const { vendorCode } = req.body;

				if (!vendorCode) {
					return res.status(400).json({
						status: 13,
						msg: "INVALID_PARAMETER",
						details: "vendorCode is required",
					});
				}

				// Handle single-game vendors (e.g. sport-bbbet)
				const singleGameInfo = SINGLE_GAME_VENDORS[vendorCode];
				if (singleGameInfo) {
					await Game.updateOne(
						{ game_code: vendorCode },
						{
							provider_code: vendorCode,
							game_code: vendorCode,
							game_name: singleGameInfo.game_name,
							banner: singleGameInfo.banner,
							status: 1,
							distribution: "betinovi",
							game_type: singleGameInfo.game_type,
						},
						{ upsert: true }
					);

					return res.status(200).json({
						status: 1,
						msg: "SUCCESS",
						message: `1 game saved for single-game vendor ${vendorCode}`,
					});
				}

				const response = await betinoviRequest({
					method: "GetVendorGames",
					vendorCode,
				});

				if (response.status !== 0 || !response.vendorGames) {
					return res.status(400).json({
						status: response.status,
						msg: response.msg || "Failed to fetch games",
					});
				}

				// Save games to database
				const promises = response.vendorGames.map(async (game) => {
					try {
						let gameName = game.gameName;
						let imageUrl = game.imageUrl;

						// Parse JSON if needed
						try {
							const nameObj = JSON.parse(gameName);
							gameName =
								nameObj.en ||
								nameObj.tr ||
								Object.values(nameObj)[0] ||
								game.gameCode;
						} catch (e) {
							// Keep original if not JSON
						}

						try {
							const imageObj = JSON.parse(imageUrl);
							imageUrl =
								imageObj.en ||
								imageObj.tr ||
								Object.values(imageObj)[0] ||
								"";
						} catch (e) {
							// Keep original if not JSON
						}

						await Game.updateOne(
							{ game_code: game.gameCode },
							{
								provider_code: vendorCode,
								game_code: game.gameCode,
								game_name: gameName,
								banner: imageUrl,
								status: 1,
								distribution: "betinovi",
								game_type:
									game.gameType === 1
										? "slot"
										: game.gameType === 2
										? "live"
										: "other",
							},
							{ upsert: true }
						);
					} catch (err) {
						console.error(
							`Error saving game: ${game.gameCode}`,
							err
						);
					}
				});

				await Promise.all(promises);

				return res.status(200).json({
					status: 1,
					msg: "SUCCESS",
					message: `${response.vendorGames.length} games saved successfully`,
				});
			}

			// -------------------- Fetch All Vendors and Games --------------------
			case "fetch_all_games": {
				const vendorsResponse = await betinoviRequest({
					method: "GetVendors",
				});

				if (vendorsResponse.status !== 0 || !vendorsResponse.vendors) {
					return res.status(400).json({
						status: vendorsResponse.status,
						msg: vendorsResponse.msg || "Failed to fetch vendors",
					});
				}

				let totalGames = 0;
				const errors = [];

				for (const vendor of vendorsResponse.vendors) {
					try {
						const singleGameInfo = SINGLE_GAME_VENDORS[vendor.vendorCode];
						if (singleGameInfo) {
							await Game.updateOne(
								{ game_code: vendor.vendorCode },
								{
									provider_code: vendor.vendorCode,
									game_code: vendor.vendorCode,
									game_name: singleGameInfo.game_name,
									banner: singleGameInfo.banner,
									status: 1,
									distribution: "betinovi",
									game_type: singleGameInfo.game_type,
								},
								{ upsert: true }
							);
							totalGames++;
							continue;
						}

						// Rate limiting - 1 second delay
						await new Promise((resolve) =>
							setTimeout(resolve, 1000)
						);

						const gamesResponse = await betinoviRequest({
							method: "GetVendorGames",
							vendorCode: vendor.vendorCode,
						});

						if (
							gamesResponse.status === 0 &&
							gamesResponse.vendorGames
						) {
							for (const game of gamesResponse.vendorGames) {
								try {
									let gameName = game.gameName;
									let imageUrl = game.imageUrl;

									try {
										const nameObj = JSON.parse(gameName);
										gameName =
											nameObj.en ||
											nameObj.tr ||
											Object.values(nameObj)[0] ||
											game.gameCode;
									} catch (e) {}

									try {
										const imageObj = JSON.parse(imageUrl);
										imageUrl =
											imageObj.en ||
											imageObj.tr ||
											Object.values(imageObj)[0] ||
											"";
									} catch (e) {}

									await Game.updateOne(
										{ game_code: game.gameCode },
										{
											provider_code: vendor.vendorCode,
											game_code: game.gameCode,
											game_name: gameName,
											banner: imageUrl,
											status: 1,
											distribution: "betinovi",
											game_type:
												game.gameType === 1
													? "slot"
													: game.gameType === 2
													? "live"
													: "other",
										},
										{ upsert: true }
									);
									totalGames++;
								} catch (err) {
									console.error(
										`Error saving game: ${game.gameCode}`,
										err
									);
								}
							}
						}
					} catch (err) {
						errors.push({
							vendor: vendor.vendorCode,
							error: err.message,
						});
					}
				}

				return res.status(200).json({
					status: 1,
					msg: "SUCCESS",
					message: `${totalGames} games saved from ${vendorsResponse.vendors.length} vendors`,
					errors: errors.length > 0 ? errors : undefined,
				});
			}

			// -------------------- Get Agent Info --------------------
			case "get_agent_info":
			case "GetAgentInfo": {
				const response = await betinoviRequest({
					method: "GetAgentInfo",
				});

				return res.status(200).json(response);
			}

			// -------------------- Get User Balance --------------------
			case "user_balance": {
				const { user_id } = req.body;

				if (!user_id) {
					return res.status(400).json({
						status: 13,
						msg: "INVALID_PARAMETER",
						details: "user_id is required",
					});
				}

				const user = await findValidUserById(user_id);
				if (!user) {
					return res.status(404).json({
						status: 5,
						msg: "INVALID_USER",
					});
				}

				const activeWallet = getActiveWallet(user);
				if (!activeWallet) {
					return res.status(404).json({
						status: 5,
						msg: "INVALID_USER",
						details: "Wallet not found",
					});
				}

				return res.status(200).json({
					status: 0,
					msg: "SUCCESS",
					balance: getProviderVisibleBalance(user, activeWallet.balance),
				});
			}

			// -------------------- Get Wager Info --------------------
			case "get_wager_info":
			case "GetWagerInfo": {
				const { wagerId } = req.body;

				if (!wagerId) {
					return res.status(400).json({
						status: 13,
						msg: "INVALID_PARAMETER",
						details: "wagerId is required",
					});
				}

				const response = await betinoviRequest({
					method: "GetWagerInfo",
					wagerId,
				});

				return res.status(200).json(response);
			}

			// -------------------- Get Report by Date --------------------
			case "report_by_date":
			case "ReportByDate": {
				const { startDate, endDate } = req.body;

				if (!startDate || !endDate) {
					return res.status(400).json({
						status: 13,
						msg: "INVALID_PARAMETER",
						details: "startDate and endDate are required",
					});
				}

				const response = await betinoviRequest({
					method: "ReportByDate",
					startDate,
					endDate,
				});

				return res.status(200).json(response);
			}

			// -------------------- Get Report by ID --------------------
			case "report_by_id":
			case "ReportById": {
				const { startWagerId = 0, count = 100 } = req.body;

				const response = await betinoviRequest({
					method: "ReportById",
					startWagerId,
					count,
				});

				return res.status(200).json(response);
			}

			default:
				return res.status(400).json({
					status: 2,
					msg: "INVALID_ACTION",
					details: `Unknown method: ${method}`,
				});
		}
	} catch (error) {
		console.error("Betinovi API Error:", error.message);
		return res.status(500).json({
			status: 1,
			msg: "INTERNAL_ERROR",
			error: error.response?.data || error.message,
		});
	}
});

// ==================== WALLET CALLBACK API (Seamless Integration) ====================

// Callback endpoint for Betinovi to call our site
router.post("/callback", async (req, res) => {
	const { method, token, userCode, currencyCode } = req.body;

	// console.log(
	// 	"Betinovi Callback Request:",
	// 	JSON.stringify(req.body, null, 2)
	// );

	// Validate token — hem varsayılan (bizzocasinoyeni) hem de deneme bonusu
	// (bizzodeneme) agent'ından gelen callback'ler kabul edilir; ikisi de
	// aynı kullanıcı/cüzdan üzerinde işlem yapar.
	if (
		token !== BETINOVI_AGENT_TOKEN &&
		(!BETINOVI_AGENT_TOKEN_2 || token !== BETINOVI_AGENT_TOKEN_2)
	) {
		console.error("Invalid token in callback");
		return res.status(200).json({
			status: 3,
			msg: "INVALID_AGENT",
		});
	}

	try {
		switch (method) {
			// -------------------- Get Balance Callback --------------------
			case "GetBalance": {
				const user = await findValidUserById(userCode);
				if (!user) {
					return res.status(200).json({
						status: 5,
						msg: "INVALID_USER",
					});
				}

				const activeWallet = getActiveWallet(user);
				if (!activeWallet) {
					return res.status(200).json({
						status: 5,
						msg: "INVALID_USER",
					});
				}

				return res.status(200).json({
					status: 0,
					msg: "SUCCESS",
					balance: getProviderVisibleBalance(user, activeWallet.balance),
				});
			}

			// -------------------- Change Balance Callback --------------------
			case "ChangeBalance": {
				const {
					vendorCode,
					txnType,
					wagerId,
					txnCode,
					pairCode,
					amount,
					gameCode,
					gameRoundId,
					createdOn,
					isFinished,
					isFreeRound,
					detail,
				} = req.body;

				const normalizedUserCode = normalizeCallbackString(userCode);
				const normalizedTxnCode = normalizeCallbackString(txnCode);
				const normalizedVendorCode = normalizeCallbackString(vendorCode);
				const normalizedGameCode =
					normalizeCallbackString(gameCode) || normalizedVendorCode;
				const normalizedTxnType = normalizeCallbackTxnType(txnType);
				const normalizedAmount = normalizeCallbackAmount(
					amount,
					normalizedTxnType
				);
				const roundId =
					normalizeCallbackString(gameRoundId) ||
					normalizeCallbackString(wagerId) ||
					normalizeCallbackString(pairCode) ||
					normalizedTxnCode;

				if (
					!normalizedUserCode ||
					!normalizedVendorCode ||
					!normalizedTxnCode ||
					normalizedTxnType === null ||
					normalizedAmount === null
				) {
					return res.status(200).json({
						status: 13,
						msg: "INVALID_PARAMETER",
						details: "userCode, vendorCode, txnCode, txnType and valid amount are required.",
					});
				}

				const txnTypeStr = BETINOVI_CALLBACK_TXN_TYPES[normalizedTxnType];
				const existingTxn = await Transaction.findOne({
					txn_id: normalizedTxnCode,
				})
					.select(betinoviDuplicateProjection)
					.lean();

				if (existingTxn) {
					if (
						isSameBetinoviCallbackTransaction(existingTxn, {
							userCode: normalizedUserCode,
							vendorCode: normalizedVendorCode,
							txnType: normalizedTxnType,
							amount: normalizedAmount,
						})
					) {
						return res
							.status(200)
							.json(buildBetinoviProcessedResponse(existingTxn));
					}

					return res.status(200).json({
						status: 21,
						msg: "DUPLICATE_REQUESTKEY",
					});
				}

				const user = await findValidUserById(normalizedUserCode);
				if (!user) {
					return res.status(200).json({
						status: 5,
						msg: "INVALID_USER",
					});
				}

				const activeWallet = getActiveWallet(user);
				if (!activeWallet) {
					return res.status(200).json({
						status: 5,
						msg: "INVALID_USER",
					});
				}

				if (normalizedTxnType === 0 && isUserBetAccessBlocked(user)) {
					return res.status(200).json({
						status: 6,
						msg: BET_ACCESS_BLOCKED_CODE,
						details: BET_ACCESS_BLOCKED_MESSAGE,
						balance: 0,
					});
				}

				// 🎯 Bet Limitleme: kategori bazlı tam blokaj / maksimum tutar kontrolü.
				if (normalizedTxnType === 0) {
					const betCategory =
						SINGLE_GAME_VENDORS[normalizedVendorCode]?.game_type === "sport"
							? "sportsBook"
							: "slots";
					const limitCheck = evaluateCategoryBetLimit(user, betCategory, normalizedAmount);
					if (!limitCheck.allowed) {
						return res.status(200).json({
							status: 6,
							msg: limitCheck.reason,
							details:
								limitCheck.reason === CATEGORY_BET_LIMIT_EXCEEDED_CODE
									? `Bu kategori için maksimum bahis tutarı ${limitCheck.max} ile sınırlıdır.`
									: "Bu oyun kategorisine erişiminiz kısıtlanmıştır.",
							balance: 0,
						});
					}
				}

				let balanceBefore = activeWallet.balance || 0;

				let rakebackAmount = 0;
				let affiliateAmount = 0;
				let balanceAfter = balanceBefore;
				let updatedUser = null;
				let callbackResponse = null;
				const session = await mongoose.startSession();

				try {
					await session.withTransaction(async () => {
						const currentUser = await User.findById(user._id).session(session);
						if (!currentUser) {
							callbackResponse = { status: 5, msg: "INVALID_USER" };
							return;
						}

						const currentActiveWallet = getActiveWallet(currentUser);
						if (!currentActiveWallet) {
							callbackResponse = { status: 5, msg: "INVALID_USER" };
							return;
						}

						balanceBefore = currentActiveWallet.balance || 0;

						const duplicateTxn = await Transaction.findOne({
							txn_id: normalizedTxnCode,
						})
							.select(betinoviDuplicateProjection)
							.session(session);

						if (duplicateTxn) {
							callbackResponse = isSameBetinoviCallbackTransaction(
								duplicateTxn,
								{
									userCode: normalizedUserCode,
									vendorCode: normalizedVendorCode,
									txnType: normalizedTxnType,
									amount: normalizedAmount,
								}
							)
								? buildBetinoviProcessedResponse(duplicateTxn, balanceBefore)
								: {
										status: 21,
										msg: "DUPLICATE_REQUESTKEY",
										balance: balanceBefore,
									};
							return;
						}

						if (
							normalizedTxnType === 0 &&
							isUserBetAccessBlocked(currentUser)
						) {
							callbackResponse = {
								status: 6,
								msg: BET_ACCESS_BLOCKED_CODE,
								details: BET_ACCESS_BLOCKED_MESSAGE,
								balance: 0,
							};
							return;
						}

						// 🎯 Bet Limitleme: transaction içinde tekrar doğrula (race condition güvenliği).
						if (normalizedTxnType === 0) {
							const betCategory =
								SINGLE_GAME_VENDORS[normalizedVendorCode]?.game_type === "sport"
									? "sportsBook"
									: "slots";
							const limitCheck = evaluateCategoryBetLimit(currentUser, betCategory, normalizedAmount);
							if (!limitCheck.allowed) {
								callbackResponse = {
									status: 6,
									msg: limitCheck.reason,
									details:
										limitCheck.reason === CATEGORY_BET_LIMIT_EXCEEDED_CODE
											? `Bu kategori için maksimum bahis tutarı ${limitCheck.max} ile sınırlıdır.`
											: "Bu oyun kategorisine erişiminiz kısıtlanmıştır.",
									balance: balanceBefore,
								};
								return;
							}
						}

						let linkedDebit = null;
						if (normalizedTxnType !== 0) {
							linkedDebit = await findBetinoviLinkedTransaction(
								{
									userId: normalizedUserCode,
									vendorCode: normalizedVendorCode,
									gameCode: "",
									txnType: "debit",
									pairCode,
									wagerId,
									gameRoundId,
								},
								{ session }
							);

							// NOT: Eşleşen bir debit bulunamasa da credit/refund işlemi
							// reddedilmez. Dual-agent (deneme bonusu) geçişlerinde eşleşme
							// anahtarları (pairCode/wagerId/gameRoundId) farklı bir kayda
							// düşebiliyor; bunu bloklamak sağlayıcı tarafında "kasiyeri
							// ziyaret edin" hatasına yol açıyordu. Sadece bilgilendirme
							// amaçlı loglanır, işlem normal şekilde devam eder.
							if (!linkedDebit) {
								console.warn("Betinovi settlement without matching debit (allowed)", {
									userCode: normalizedUserCode,
									vendorCode: normalizedVendorCode,
									txnCode: normalizedTxnCode,
									txnType: normalizedTxnType,
									wagerId,
									gameRoundId,
									pairCode,
								});
							}

							if (
								linkedDebit &&
								normalizedTxnType === 2 &&
								normalizedAmount > Math.abs(linkedDebit.bet_money || 0)
							) {
								callbackResponse = {
									status: 13,
									msg: "INVALID_TRANSACTION",
									details: "Refund amount exceeds original debit amount.",
									balance: balanceBefore,
								};
								return;
							}

							if (normalizedTxnType === 2) {
								const existingRefund = await findBetinoviLinkedTransaction(
									{
										userId: normalizedUserCode,
										vendorCode: normalizedVendorCode,
										gameCode: "",
										txnType: "refund",
										pairCode,
										wagerId,
										gameRoundId,
									},
									{ session }
								);

								if (existingRefund) {
									callbackResponse = {
										status: 21,
										msg: "DUPLICATE_REQUESTKEY",
										balance: balanceBefore,
									};
									return;
								}
							}
						}

						const balanceChange =
							normalizedTxnType === 0 ? -normalizedAmount : normalizedAmount;
						const statsUpdate = {};

						if (normalizedTxnType === 0) {
							const userLevelData = generalUserGetRakeback(currentUser);
							rakebackAmount = Math.floor(
								normalizedAmount * userLevelData.percentage
							);
							statsUpdate["stats.bet"] = normalizedAmount;
							statsUpdate["xp"] = Math.floor(normalizedAmount / 5);
							statsUpdate["currency.coins"] = normalizedAmount / 500;
						} else if (normalizedTxnType === 1) {
							statsUpdate["stats.won"] = normalizedAmount;
						}

						const updateFilter = { _id: currentUser._id };
						if (normalizedTxnType === 0) {
							updateFilter.wallets = {
								$elemMatch: {
									coinType: currentActiveWallet.coinType,
									chain: currentActiveWallet.chain,
									type: currentActiveWallet.type,
									balance: { $gte: normalizedAmount },
								},
							};
						}

						updatedUser = await User.findOneAndUpdate(
							updateFilter,
							{
								$inc: {
									"wallets.$[elem].balance": balanceChange,
									"rakeback.earned": rakebackAmount,
									"rakeback.available": rakebackAmount,
									...statsUpdate,
								},
							},
							{
								arrayFilters: [
									{
										"elem.coinType": currentActiveWallet.coinType,
										"elem.chain": currentActiveWallet.chain,
										"elem.type": currentActiveWallet.type,
									},
								],
								new: true,
								session,
							}
						).select("wallets currency");

						if (!updatedUser) {
							callbackResponse = {
								status: 8,
								msg: "INSUFFICIENT_MONEY",
								balance: balanceBefore,
							};
							return;
						}

						const updatedWallet = updatedUser.wallets.find(
							(wallet) =>
								wallet.coinType === currentActiveWallet.coinType &&
								wallet.chain === currentActiveWallet.chain &&
								wallet.type === currentActiveWallet.type
						);

						if (!updatedWallet) {
							throw new Error("Updated wallet not found after Betinovi callback.");
						}

						balanceAfter = updatedWallet.balance;

						if (normalizedTxnType === 0 && currentUser.affiliates?.referrer) {
							const settings = settingGet();
							const affiliateLevels = settings.general?.affiliateLevels || {
								level1: 0.07,
								level2: 0.03,
								level3: 0.01,
							};

							affiliateAmount = Math.floor(
								normalizedAmount * affiliateLevels.level1
							);

							const ref1 = currentUser.affiliates.referrer;
							let ref2 = null;
							let ref3 = null;

							if (ref1) {
								const user1 = await User.findById(ref1)
									.select("affiliates.referrer")
									.session(session);
								ref2 = user1?.affiliates?.referrer;
								if (ref2) {
									const user2 = await User.findById(ref2)
										.select("affiliates.referrer")
										.session(session);
									ref3 = user2?.affiliates?.referrer;
								}
							}

							const distributions = [];
							if (ref1) {
								distributions.push({
									id: ref1,
									amount: Math.floor(normalizedAmount * affiliateLevels.level1),
								});
							}
							if (ref2) {
								distributions.push({
									id: ref2,
									amount: Math.floor(normalizedAmount * affiliateLevels.level2),
								});
							}
							if (ref3) {
								distributions.push({
									id: ref3,
									amount: Math.floor(normalizedAmount * affiliateLevels.level3),
								});
							}

							for (const distribution of distributions) {
								if (distribution.amount <= 0) continue;

								await User.findByIdAndUpdate(
									distribution.id,
									{
										$inc: {
											"affiliates.earned": distribution.amount,
											"affiliates.available": distribution.amount,
										},
										$set: { updatedAt: Date.now() },
									},
									{ session }
								);

								await BalanceTransaction.create(
									[
										{
											amount: distribution.amount,
											type: "affiliateCommission",
											user: distribution.id,
											fromUser: user._id,
											state: "completed",
										},
									],
									{ session }
								);
							}
						}

						await Transaction.create(
							[
								{
									txn_id: normalizedTxnCode,
									user_code: normalizedUserCode,
									game_type:
										SINGLE_GAME_VENDORS[normalizedVendorCode]?.game_type || "slot",
									provider_code: normalizedVendorCode,
									game_code: normalizedGameCode,
									round_id: roundId,
									bet_money: normalizedTxnType === 0 ? normalizedAmount : 0,
									win_money: normalizedTxnType === 1 ? normalizedAmount : 0,
									txn_type: txnTypeStr,
									balance_before: balanceBefore,
									balance_after: balanceAfter,
									rakeback: rakebackAmount,
									affiliate: affiliateAmount,
									extra: {
										amount: normalizedAmount,
										wagerId,
										pairCode,
										gameRoundId,
										isFinished,
										isFreeRound,
										detail,
										createdOn,
										linkedDebitTxnId: linkedDebit?.txn_id,
									},
								},
							],
							{ session }
						);
					});
				} catch (error) {
					if (error?.code === 11000) {
						const duplicateTxn = await Transaction.findOne({
							txn_id: normalizedTxnCode,
						})
							.select(betinoviDuplicateProjection)
							.lean();

						if (
							isSameBetinoviCallbackTransaction(duplicateTxn, {
								userCode: normalizedUserCode,
								vendorCode: normalizedVendorCode,
								txnType: normalizedTxnType,
								amount: normalizedAmount,
							})
						) {
							return res
								.status(200)
								.json(
									buildBetinoviProcessedResponse(duplicateTxn, balanceBefore)
								);
						}

						const latestUser = await User.findById(user._id).select(
							"wallets currency"
						);
						const latestWallet = getActiveWallet(latestUser);
						return res.status(200).json({
							status: 21,
							msg: "DUPLICATE_REQUESTKEY",
							balance: latestWallet?.balance || balanceBefore,
						});
					}

					throw error;
				} finally {
					await session.endSession();
				}

				if (callbackResponse) {
					return res.status(200).json(callbackResponse);
				}

				res.status(200).json({
					status: 0,
					msg: "SUCCESS",
					balance: balanceAfter,
				});

				setImmediate(async () => {
					emitUserBalance(null, {
						_id: user._id,
						wallets: updatedUser.wallets,
						currency: updatedUser.currency,
					});

					// 🎯 Bilet çevrimi + Race puanı hook'u (Betinovi debit = bahis konuldu)
					if (normalizedTxnType === 0) {
						onBetSettled({
							userId: user._id,
							amount: normalizedAmount,
							category: "casino",
							providerCode: normalizedVendorCode,
						});
					}

					try {
						if (normalizedTxnType === 0) {
							await logEvent("bet", {
								userId: user._id,
								gameId: normalizedGameCode,
								betAmount: normalizedAmount,
							});

							await logEvent("spin", {
								userId: user._id,
								gameId: normalizedGameCode,
								amount: 1,
							});
						} else if (normalizedTxnType === 1) {
							await logEvent("win", {
								userId: user._id,
								gameId: normalizedGameCode,
								winAmount: normalizedAmount,
							});
						}
					} catch (logErr) {
						console.error("Betinovi logEvent error (non-fatal):", logErr.message);
					}
				});

				// console.log("ChangeBalance processed:", {
				// 	userCode,
				// 	txnType,
				// 	txnTypeStr,
				// 	amount,
				// 	balanceBefore,
				// 	balanceAfter,
				// });

				return;
			}

			// -------------------- Update Detail Callback --------------------
			case "UpdateDetail": {
				const { wagerId, detail } = req.body;

				// Update transaction with detail
				await Transaction.updateOne(
					{ "extra.wagerId": wagerId },
					{ $set: { "extra.detail": detail } }
				);

				return res.status(200).json({
					status: 0,
					msg: "SUCCESS",
				});
			}

			default:
				return res.status(200).json({
					status: 2,
					msg: "INVALID_ACTION",
				});
		}
	} catch (error) {
		console.error("Betinovi Callback Error:", error.message);
		return res.status(200).json({
			status: 1,
			msg: "INTERNAL_ERROR",
		});
	}
});

module.exports = router;
