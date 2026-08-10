const express = require("express");
const axios = require("axios");
const router = express.Router();
const User = require("../database/models/User");
const Transaction = require("../database/models/Transaction");
const SportsBet = require("../database/models/SportsBet");
const SportsBetEvent = require("../database/models/SportsBetEvent");
const BalanceTransaction = require("../database/models/BalanceTransaction");
const logEvent = require("../services/logEvent");
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
	getProviderVisibleBalance,
	isUserBetAccessBlocked,
} = require("../utils/userBetAccess");
const { generalUserGetRakeback } = require("../utils/general/user");
const { getClientIp } = require("../utils/ip");

// Betcolabs API Credentials
const BETCOLABS_BASE_URL = process.env.BETCOLABS_API_ENDPOINT;
const BETCOLABS_AGENT_TOKEN = process.env.BETCOLABS_AGENT_TOKEN;
const BETCOLABS_AGENT_SECRET = process.env.BETCOLABS_AGENT_SECRET;
const BETCOLABS_AGENT_ID = process.env.BETCOLABS_AGENT_ID;

//Game URLS
const WEBSPOR_DESKTOP_URL = process.env.BETCOLABS_DESKTOP_URL;
const WEBSPOR_MOBILE_URL = process.env.BETCOLABS_MOBILE_URL;

const sessionCache = new Map();

const betcolabsRequest = async (endpoint, payload) => {
	try {
		const response = await axios.post(
			`${BETCOLABS_BASE_URL}/${endpoint}`,
			payload,
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
			"Betcolabs API Error:",
			error.response?.data || error.message
		);
		throw error;
	}
};

const getOrCreateSession = async (user) => {
	const cacheKey = `betcolabs_session_${user._id}`;
	const cached = sessionCache.get(cacheKey);

	if (cached && new Date(cached.expires_at) > new Date())
		return cached.session_token;

	const activeWallet = getActiveWallet(user);
	const response = await betcolabsRequest("agent_auth.php", {
		agent_token: BETCOLABS_AGENT_TOKEN,
		agent_secret_key: BETCOLABS_AGENT_SECRET,
		user_id: user.numericId.toString(),
		user_data: {
			username: user.username || `user_${user.numericId}`,
			email: user.local?.email || "",
			balance: activeWallet?.balance || 0,
		},
	});

	if (response.success && response.session_token) {
		sessionCache.set(cacheKey, {
			session_token: response.session_token,
			expires_at: response.expires_at,
		});
		return response.session_token;
	}

	throw new Error(response.message || "Failed to create session");
};

// ==================== OPERATOR API ENDPOINTS ====================

router.post("/", async (req, res) => {
	const { method } = req.body;

	if (!method) {
		return res.status(400).json({
			success: false,
			error: "INVALID_REQUEST",
			details: "Method is required.",
		});
	}

	try {
		switch (method) {
			// -------------------- Get Launch URL --------------------
			case "get_launch_url":
			case "launch": {
				const {
					user_id,
					language = "tr",
					channel = "desktop",
					gameCode,
				} = req.body;

				if (!user_id) {
					return res.status(400).json({
						success: false,
						error: "INVALID_PARAMETER",
						details: "user_id is required",
					});
				}

				const user = await User.findById(user_id);
				if (!user) {
					return res.status(200).json({
						success: false,
						error: "INVALID_USER",
					});
				}

				if (isUserBetAccessBlocked(user)) {
					return res.status(403).json({
						success: false,
						error: BET_ACCESS_BLOCKED_CODE,
						details: BET_ACCESS_BLOCKED_MESSAGE,
					});
				}

				const activeWallet = getActiveWallet(user);
				if (!activeWallet) {
					return res.status(400).json({
						success: false,
						error: "WALLET_NOT_FOUND",
						details: "Aktif cüzdan bulunamadı.",
					});
				}

				const maxBalance = await getMaxAccountBalance();
				if (activeWallet.balance >= maxBalance) {
					return res.status(400).json({
						success: false,
						error: "INVALID_BALANCE",
						details: `Bakiyeniz ${maxBalance}₺ bonus şartına ulaştı. Oyunlara katılmak için lütfen destek ekibimizle iletişime geçin.`,
					});
				}

				const sessionToken = await getOrCreateSession(user);

				const isMobile = channel === "mobile" || channel === "m";
				const baseUrl =
					(isMobile ? WEBSPOR_MOBILE_URL : WEBSPOR_DESKTOP_URL) +
					(gameCode.includes("live")
						? "/sports/live/event-view/"
						: "");

				const params = new URLSearchParams();
				params.append("session_token", sessionToken);
				if (language) {
					params.append("lang", language);
				}

				const launchUrl = `${baseUrl}/?${params.toString()}`;

				await logEvent("game_start", {
					userId: user._id,
					gameId: "betcolabs_sports",
				});

				return res.status(200).json({
					success: true,
					launch_url: launchUrl,
					session_token: sessionToken,
				});
			}

			// -------------------- Authenticate / Create Session --------------------
			case "authenticate":
			case "create_session": {
				const { user_id } = req.body;

				if (!user_id) {
					return res.status(400).json({
						success: false,
						error: "INVALID_PARAMETER",
						details: "user_id is required",
					});
				}

				const user = await User.findById(user_id);
				if (!user) {
					return res.status(200).json({
						success: false,
						error: "INVALID_USER",
					});
				}

				if (isUserBetAccessBlocked(user)) {
					return res.status(403).json({
						success: false,
						error: BET_ACCESS_BLOCKED_CODE,
						details: BET_ACCESS_BLOCKED_MESSAGE,
					});
				}

				const activeWallet = getActiveWallet(user);
				const response = await betcolabsRequest("agent_auth.php", {
					agent_token: BETCOLABS_AGENT_TOKEN,
					agent_secret_key: BETCOLABS_AGENT_SECRET,
					user_id: user.numericId.toString(),
					user_data: {
						username: user.username || `user_${user.numericId}`,
						email: user.local?.email || "",
						balance: getProviderVisibleBalance(user, activeWallet?.balance),
					},
				});

				if (response.success) {
					// Cache session
					const cacheKey = `betcolabs_session_${user._id}`;
					sessionCache.set(cacheKey, {
						session_token: response.session_token,
						expires_at: response.expires_at,
					});
				}

				return res.status(200).json(response);
			}

			// -------------------- Validate Session --------------------
			case "validate_session":
			case "check_session": {
				const { session_token } = req.body;

				if (!session_token) {
					return res.status(400).json({
						success: false,
						error: "INVALID_PARAMETER",
						details: "session_token is required",
					});
				}

				const response = await betcolabsRequest("agent_session.php", {
					session_token,
				});

				return res.status(200).json(response);
			}

			// -------------------- Get User Balance --------------------
			case "get_balance":
			case "user_balance": {
				const { user_id, session_token } = req.body;

				// If session token provided, use Betcolabs API
				if (session_token) {
					const response = await betcolabsRequest(
						"agent_balance.php",
						{
							session_token,
							action: "get",
						}
					);
					return res.status(200).json(response);
				}

				// Otherwise get from local DB
				if (!user_id) {
					return res.status(400).json({
						success: false,
						error: "INVALID_PARAMETER",
						details: "user_id or session_token is required",
					});
				}

				const user =
					(await User.findOne({ numericId: parseInt(user_id) })) ||
					(await User.findById(user_id));
				if (!user) {
					return res.status(404).json({
						success: false,
						error: "INVALID_USER",
					});
				}

				const activeWallet = getActiveWallet(user);
				return res.status(200).json({
					success: true,
					balance: getProviderVisibleBalance(user, activeWallet?.balance),
					user_id: user.numericId,
				});
			}

			// -------------------- Update Balance --------------------
			case "update_balance": {
				const { session_token, amount, type } = req.body;

				if (!session_token || amount === undefined || !type) {
					return res.status(400).json({
						success: false,
						error: "INVALID_PARAMETER",
						details: "session_token, amount and type are required",
					});
				}

				const response = await betcolabsRequest("agent_balance.php", {
					session_token,
					action: "update",
					amount,
					type, // deposit or withdraw
				});

				return res.status(200).json(response);
			}

			// -------------------- Get Bets List --------------------
			case "get_bets":
			case "bets_list": {
				const { user_id, status, limit = 100, offset = 0 } = req.body;

				const response = await betcolabsRequest("agent_bets_list.php", {
					agent_token: BETCOLABS_AGENT_TOKEN,
					agent_secret_key: BETCOLABS_AGENT_SECRET,
					agent_id: BETCOLABS_AGENT_ID
						? parseInt(BETCOLABS_AGENT_ID)
						: undefined,
					user_id: user_id || undefined,
					status: status || undefined,
					limit,
					offset,
				});

				return res.status(200).json(response);
			}

			// -------------------- Place Bet (via API) --------------------
			case "place_bet": {
				const {
					session_token,
					coupon_id,
					bet_data,
					amount,
					total_odds,
					potential_win,
				} = req.body;

				if (!session_token || !bet_data || !amount) {
					return res.status(400).json({
						success: false,
						error: "INVALID_PARAMETER",
						details:
							"session_token, bet_data and amount are required",
					});
				}

				const response = await betcolabsRequest("agent_bet.php", {
					session_token,
					coupon_id: coupon_id || `coupon_${Date.now()}`,
					bet_data,
					amount,
					total_odds: total_odds || 1,
					potential_win: potential_win || amount,
				});

				return res.status(200).json(response);
			}

			// -------------------- Get User Bet History (Local DB) --------------------
			case "get_user_bets":
			case "bet_history": {
				const { user_id, status, limit = 50, page = 1 } = req.body;

				if (!user_id) {
					return res.status(400).json({
						success: false,
						error: "INVALID_PARAMETER",
						details: "user_id is required",
					});
				}

				const user = await User.findById(user_id);
				if (!user) {
					return res.status(404).json({
						success: false,
						error: "INVALID_USER",
					});
				}

				const query = { user: user._id };
				if (status) {
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

				return res.status(200).json({
					success: true,
					bets,
					pagination: {
						page: parseInt(page),
						limit: parseInt(limit),
						total,
						totalPages: Math.ceil(total / parseInt(limit)),
					},
				});
			}

			// -------------------- Get Single Bet Details --------------------
			case "get_bet_detail":
			case "bet_detail": {
				const { bet_id, coupon_id } = req.body;

				if (!bet_id && !coupon_id) {
					return res.status(400).json({
						success: false,
						error: "INVALID_PARAMETER",
						details: "bet_id or coupon_id is required",
					});
				}

				const query = bet_id
					? { _id: bet_id }
					: { externalCouponId: coupon_id };

				const bet = await SportsBet.findOne(query).lean();
				if (!bet) {
					return res.status(404).json({
						success: false,
						error: "BET_NOT_FOUND",
					});
				}

				// Get associated events
				const events = await SportsBetEvent.find({ bet: bet._id })
					.sort({ createdAt: 1 })
					.lean();

				return res.status(200).json({
					success: true,
					bet: {
						...bet,
						events,
					},
				});
			}

			// -------------------- Get Bet Statistics --------------------
			case "get_bet_stats":
			case "bet_stats": {
				const { user_id } = req.body;

				if (!user_id) {
					return res.status(400).json({
						success: false,
						error: "INVALID_PARAMETER",
						details: "user_id is required",
					});
				}

				const user = await User.findById(user_id);
				if (!user) {
					return res.status(404).json({
						success: false,
						error: "INVALID_USER",
					});
				}

				const [stats] = await SportsBet.aggregate([
					{ $match: { user: user._id } },
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
									$cond: [
										{ $eq: ["$status", "pending"] },
										1,
										0,
									],
								},
							},
							totalWinAmount: { $sum: "$actualWin" },
							avgOdds: { $avg: "$totalOdds" },
						},
					},
				]);

				return res.status(200).json({
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
			}

			default:
				return res.status(400).json({
					success: false,
					error: "INVALID_ACTION",
					details: `Unknown method: ${method}`,
				});
		}
	} catch (error) {
		console.error("Betcolabs API Error:", error.message);
		return res.status(500).json({
			success: false,
			error: "INTERNAL_ERROR",
			details: error.response?.data || error.message,
		});
	}
});

// ==================== CALLBACK API ====================

// Callback endpoint for Betcolabs to notify us about bet events
router.post("/callback", async (req, res) => {
	const { event, timestamp, data } = req.body;

	console.log(
		"Betcolabs Callback Request:",
		JSON.stringify(req.body, null, 2)
	);

	if (!event || !data) {
		return res.status(400).json({
			success: false,
			error: "Invalid callback data",
		});
	}

	try {
		switch (event) {
			// -------------------- Bet Placed Callback --------------------
			case "bet_placed": {
				const {
					bet_id,
					coupon_id,
					user_id,
					amount,
					user_balance_before,
					user_balance_after,
					total_odds,
					potential_win,
					details, // Maç/market detayları array
					selections, // Alternatif field adı
					bets, // Alternatif field adı
					events, // Alternatif field adı
					picks, // Alternatif field adı
				} = data;

				// Log incoming data for debugging
				// console.log("bet_placed callback data:", JSON.stringify(data, null, 2));

				// Use whichever array exists
				const betDetails =
					details || selections || bets || events || picks || [];
				// console.log("betDetails extracted:", betDetails.length, "items");

				// Find user by numericId
				const user = await User.findOne({
					numericId: parseInt(user_id),
				});
				if (!user) {
					console.error("Callback: User not found:", user_id);
					return res.status(200).json({ success: true }); // Still return success to avoid retries
				}

				const activeWallet = getActiveWallet(user);
				if (!activeWallet) {
					console.error(
						"Callback: Wallet not found for user:",
						user_id
					);
					return res.status(200).json({ success: true });
				}

				// Check for duplicate using SportsBet model
				const existingBet = await SportsBet.findOne({
					provider: "betcolabs",
					externalCouponId: coupon_id,
				});
				if (existingBet) {
					console.log(
						"Duplicate bet_placed callback ignored:",
						coupon_id
					);
					return res.status(200).json({ success: true });
				}

				if (isUserBetAccessBlocked(user)) {
					return res.status(200).json({
						success: false,
						error: BET_ACCESS_BLOCKED_CODE,
						details: BET_ACCESS_BLOCKED_MESSAGE,
						balance: 0,
					});
				}

				const betAmount = parseFloat(amount) || 0;
				const balanceBefore = activeWallet.balance;

				// Deduct balance
				const balanceAfter = await updateUserBalance(user, -betAmount, {
					emitSocket: true,
				});

				// Calculate rakeback
				const userLevelData = generalUserGetRakeback(user);
				const rakebackPercentage = userLevelData.percentage;
				const rakebackAmount = Math.floor(
					betAmount * rakebackPercentage
				);

				// Update rakeback
				if (rakebackAmount > 0) {
					await User.findByIdAndUpdate(user._id, {
						$inc: {
							"rakeback.earned": rakebackAmount,
							"rakeback.available": rakebackAmount,
						},
					});
				}

				// Process affiliate commission
				let affiliateAmount = 0;
				if (user.affiliates && user.affiliates.referrer) {
					const settings = settingGet();
					const affiliateLevels = settings.general
						?.affiliateLevels || {
						level1: 0.07,
						level2: 0.03,
						level3: 0.01,
					};

					const ref1 = user.affiliates.referrer;
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
							amount: Math.floor(
								betAmount * affiliateLevels.level1
							),
						});
					if (ref2)
						distributions.push({
							id: ref2,
							level: 2,
							amount: Math.floor(
								betAmount * affiliateLevels.level2
							),
						});
					if (ref3)
						distributions.push({
							id: ref3,
							level: 3,
							amount: Math.floor(
								betAmount * affiliateLevels.level3
							),
						});

					for (const dist of distributions) {
						if (dist.amount > 0) {
							affiliateAmount += dist.amount;
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

				// Update user stats
				const updatedProgressUser = await User.findByIdAndUpdate(
					user._id,
					{
						$inc: {
							"stats.bet": betAmount,
							xp: Math.floor(betAmount / 5),
							"currency.coins": betAmount / 500,
							"affiliates.generated": betAmount,
						},
					},
					{ new: true }
				).select("wallets currency");
				emitUserBalance(null, updatedProgressUser);

				// Determine bet type and if live
				const eventCount = Array.isArray(betDetails)
					? betDetails.length
					: 1;
				const betType = eventCount === 1 ? "single" : "multiple";
				const hasLiveEvent =
					Array.isArray(betDetails) &&
					betDetails.some((ev) => ev.is_live);

				// Create SportsBet record
				const sportsBet = await SportsBet.create({
					user: user._id,
					userNumericId: parseInt(user_id),
					provider: "betcolabs",
					externalBetId: bet_id?.toString(),
					externalCouponId: coupon_id,
					amount: betAmount,
					totalOdds: parseFloat(total_odds) || 1,
					potentialWin: parseFloat(potential_win) || 0,
					status: "pending",
					balanceBefore,
					balanceAfter,
					rakeback: rakebackAmount,
					affiliateCommission: affiliateAmount,
					betType,
					eventCount,
					isLive: hasLiveEvent,
					ipAddress: getClientIp(req),
					externalTimestamp: timestamp,
					extra: {
						user_balance_before,
						user_balance_after,
					},
				});

				// Create SportsBetEvent records for each match/market
				if (Array.isArray(betDetails) && betDetails.length > 0) {
					const eventDocs = betDetails.map((ev) => ({
						bet: sportsBet._id,
						user: user._id,
						externalEventId: (
							ev.event_id ||
							ev.eventId ||
							ev.match_id ||
							ev.matchId ||
							ev.id ||
							""
						).toString(),
						externalGameId: (
							ev.game_id ||
							ev.gameId ||
							""
						).toString(),
						matchTitle:
							ev.match_title ||
							ev.matchTitle ||
							ev.title ||
							ev.game_name ||
							ev.gameName ||
							ev.name ||
							"",
						homeTeam:
							ev.home_team ||
							ev.homeTeam ||
							ev.team1 ||
							ev.home ||
							"",
						awayTeam:
							ev.away_team ||
							ev.awayTeam ||
							ev.team2 ||
							ev.away ||
							"",
						sportType:
							ev.sport_type ||
							ev.sportType ||
							ev.sport ||
							ev.sportName ||
							"",
						leagueName:
							ev.league_name ||
							ev.leagueName ||
							ev.league ||
							ev.competition ||
							ev.tournament ||
							"",
						countryCode:
							ev.country_code ||
							ev.countryCode ||
							ev.country ||
							"",
						marketType:
							ev.market_type ||
							ev.marketType ||
							ev.market ||
							ev.bet_type ||
							ev.betType ||
							"",
						marketName:
							ev.market_name ||
							ev.marketName ||
							ev.marketTitle ||
							"",
						pick:
							ev.pick ||
							ev.selection ||
							ev.outcome ||
							ev.bet_pick ||
							"",
						displayText:
							ev.display_text ||
							ev.displayText ||
							ev.pick_name ||
							ev.pickName ||
							ev.selection_name ||
							ev.selectionName ||
							ev.outcome_name ||
							ev.outcomeName ||
							ev.pick ||
							"",
						odds:
							parseFloat(
								ev.price ||
									ev.odds ||
									ev.coefficient ||
									ev.odd ||
									1
							) || 1,
						status: "pending",
						startTimestamp:
							ev.start_ts ||
							ev.startTs ||
							ev.start_time ||
							ev.startTime
								? parseInt(
										ev.start_ts ||
											ev.startTs ||
											ev.start_time ||
											ev.startTime
								  )
								: null,
						startDate:
							ev.start_ts ||
							ev.startTs ||
							ev.start_time ||
							ev.startTime
								? new Date(
										parseInt(
											ev.start_ts ||
												ev.startTs ||
												ev.start_time ||
												ev.startTime
										) * 1000
								  )
								: null,
						isLive: !!(ev.is_live || ev.isLive || ev.live),
						extra: ev,
					}));

					console.log(
						"Creating SportsBetEvent docs:",
						eventDocs.length
					);
					await SportsBetEvent.insertMany(eventDocs);
				} else {
					console.log(
						"No betDetails to save. Raw data keys:",
						Object.keys(data)
					);
				}

				// Save transaction (for backward compatibility)
				await Transaction.create({
					txn_id: `betcolabs_bet_${bet_id}`,
					user_code: user_id,
					game_type: "sports",
					provider_code: "betcolabs",
					game_code: coupon_id,
					round_id: coupon_id,
					bet_money: betAmount,
					win_money: 0,
					txn_type: "debit",
					balance_before: balanceBefore,
					balance_after: balanceAfter,
					rakeback: rakebackAmount,
					affiliate: affiliateAmount,
					extra: {
						bet_id,
						coupon_id,
						total_odds,
						potential_win,
						timestamp,
						sportsBetId: sportsBet._id,
					},
				});

				// Log event
				await logEvent("bet", {
					userId: user._id,
					gameId: "betcolabs_sports",
					betAmount,
				});

				console.log("bet_placed processed:", {
					bet_id,
					coupon_id,
					user_id,
					amount: betAmount,
					balanceAfter,
					sportsBetId: sportsBet._id,
					eventCount,
				});
				return res.status(200).json({
					success: true,
					bet_id: sportsBet._id,
					balance: balanceAfter,
				});
			}

			// -------------------- Bet Settled Callback --------------------
			case "bet_settled": {
				const {
					bet_id,
					coupon_id,
					user_id,
					status, // won, lost, cancelled
					amount,
					win_amount,
					potential_win,
					user_balance_after,
					details, // Maç sonuçları (opsiyonel)
				} = data;

				const user = await User.findOne({
					numericId: parseInt(user_id),
				});
				if (!user) {
					console.error("Callback: User not found:", user_id);
					return res.status(200).json({ success: true });
				}

				const activeWallet = getActiveWallet(user);
				if (!activeWallet) {
					console.error(
						"Callback: Wallet not found for user:",
						user_id
					);
					return res.status(200).json({ success: true });
				}

				// Find the original SportsBet
				const sportsBet = await SportsBet.findOne({
					provider: "betcolabs",
					externalCouponId: coupon_id,
				});

				if (!sportsBet) {
					console.error("Callback: SportsBet not found:", coupon_id);
					if (isUserBetAccessBlocked(user)) {
						return res.status(200).json({
							success: true,
							ignored: true,
							balance: 0,
						});
					}
					// Legacy behavior: still process balance update for unblocked users.
				}

				// Check if already settled
				if (sportsBet && sportsBet.status !== "pending") {
					console.log(
						"Duplicate bet_settled callback ignored:",
						coupon_id
					);
					return res.status(200).json({ success: true });
				}

				const balanceBefore = activeWallet.balance;
				let balanceAfter = balanceBefore;
				let winMoney = 0;

				// Map status to our enum
				const statusMap = {
					won: "won",
					lost: "lost",
					cancelled: "cancelled",
					cashout: "cashout",
				};
				const mappedStatus = statusMap[status] || status;

				if (status === "won") {
					winMoney = parseFloat(win_amount) || 0;
					balanceAfter = await updateUserBalance(user, winMoney, {
						emitSocket: true,
					});

					// Update stats
					await User.findByIdAndUpdate(user._id, {
						$inc: { "stats.won": winMoney },
					});

					// Log win event
					await logEvent("win", {
						userId: user._id,
						gameId: "betcolabs_sports",
						winAmount: winMoney,
					});
				} else if (status === "cancelled") {
					// Refund the bet amount
					const refundAmount = parseFloat(amount) || 0;
					balanceAfter = await updateUserBalance(user, refundAmount, {
						emitSocket: true,
					});
					winMoney = refundAmount;
				}
				// For "lost" status, no balance change needed

				// Update SportsBet record
				if (sportsBet) {
					sportsBet.status = mappedStatus;
					sportsBet.actualWin = winMoney;
					sportsBet.settlementBalanceBefore = balanceBefore;
					sportsBet.settlementBalanceAfter = balanceAfter;
					sportsBet.settledAt = new Date();
					await sportsBet.save();

					// Update SportsBetEvent records if details provided
					if (Array.isArray(details) && details.length > 0) {
						for (const ev of details) {
							const eventStatus =
								ev.status ||
								(status === "won"
									? "won"
									: status === "lost"
									? "lost"
									: "cancelled");

							await SportsBetEvent.updateOne(
								{
									bet: sportsBet._id,
									externalEventId: ev.event_id?.toString(),
								},
								{
									$set: {
										status: eventStatus,
										homeScore: ev.home_score,
										awayScore: ev.away_score,
										finalScore:
											ev.home_score !== undefined &&
											ev.away_score !== undefined
												? `${ev.home_score}-${ev.away_score}`
												: null,
										extra: ev,
									},
								}
							);
						}
					} else {
						// If no details, update all events with same status
						await SportsBetEvent.updateMany(
							{ bet: sportsBet._id },
							{ $set: { status: mappedStatus } }
						);
					}
				}

				// Save settlement transaction
				await Transaction.create({
					txn_id: `betcolabs_settle_${bet_id || coupon_id}`,
					user_code: user_id,
					game_type: "sports",
					provider_code: "betcolabs",
					game_code: coupon_id,
					round_id: coupon_id,
					bet_money: 0,
					win_money: winMoney,
					txn_type:
						status === "won"
							? "credit"
							: status === "cancelled"
							? "refund"
							: "settled",
					balance_before: balanceBefore,
					balance_after: balanceAfter,
					extra: {
						bet_id,
						coupon_id,
						status,
						original_amount: amount,
						potential_win,
						timestamp,
						sportsBetId: sportsBet?._id,
					},
				});

				console.log("bet_settled processed:", {
					bet_id,
					coupon_id,
					user_id,
					status: mappedStatus,
					winMoney,
					balanceAfter,
					sportsBetId: sportsBet?._id,
				});
				return res.status(200).json({
					success: true,
					balance: balanceAfter,
				});
			}

			default:
				console.log("Unknown callback event:", event);
				return res.status(200).json({ success: true });
		}
	} catch (error) {
		console.error("Betcolabs Callback Error:", error.message);
		// Still return success to avoid infinite retries
		return res.status(200).json({ success: true, error: error.message });
	}
});

module.exports = router;
