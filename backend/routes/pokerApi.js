// 📂 routes/ucranbet.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

const Game = require("../database/models/Game");
const User = require("../database/models/User");
const Transaction = require("../database/models/Transaction");
const BalanceTransaction = require("../database/models/BalanceTransaction");

const logEvent = require("../services/logEvent");
const { updateMissionProgress } = require("../services/MissionEngine");
const {
	getActiveWallet,
	updateUserBalance,
	emitUserBalance,
} = require("../utils/wallet");
const {
	BET_ACCESS_BLOCKED_CODE,
	BET_ACCESS_BLOCKED_MESSAGE,
	CATEGORY_BET_LIMIT_EXCEEDED_CODE,
	getProviderVisibleBalance,
	isUserBetAccessBlocked,
	evaluateCategoryBetLimit,
} = require("../utils/userBetAccess");
const { onBetSettled } = require("../utils/wagerHooks");

// 🔐 UCRANBET API Bilgileri
const API_BASE_URL = "https://pokersgamessistemas.com/api/v1";
const AGENT_TOKEN = "HBaPbdpRTuWHO2xuqDld62P2ROj05nT2";
const AGENT_SECRET = "8HWpFWaalcypMCCAkxUHeyUTa7dI1N5n";
const AGENT_NAME = "UCRANBET";

// 🔸 Erişim token’ı burada saklanacak
let accessToken = null;

// 🔸 Base64 token oluştur
const generateAuthHeader = () => {
	const encoded = Buffer.from(`${AGENT_TOKEN}:${AGENT_SECRET}`).toString(
		"base64"
	);
	return `Bearer ${encoded}`;
};

// 🔸 Kimlik doğrulama isteği
const authenticate = async () => {
	try {
		console.log("🔑 Authenticating with UCRANBET API...");
		const response = await axios.post(
			`${API_BASE_URL}/auth/authentication`,
			{},
			{
				headers: {
					Authorization: generateAuthHeader(),
				},
			}
		);

		if (response.data && response.data.access_token) {
			accessToken = response.data.access_token;
			console.log("✅ Authentication success");
			return accessToken;
		} else {
			throw new Error("Authentication failed - no access_token received");
		}
	} catch (err) {
		console.error("❌ Authentication Error:", err.message);
		throw err;
	}
};

// 🔸 Token kontrolü
const ensureToken = async () => {
	if (!accessToken) {
		await authenticate();
	}
	return accessToken;
};

// ----------------------------------------------------------------------
// 📍 Ana API endpoint
// ----------------------------------------------------------------------
router.post("/", async (req, res) => {
	const { method } = req.body;

	if (!method)
		return res.status(400).json({
			status: 0,
			msg: "INVALID_REQUEST",
			details: "Method is required.",
		});

	try {
		switch (method) {
			// ----------------------------------------------------------------------
			// 1️⃣ Authentication
			// ----------------------------------------------------------------------
			case "authenticate": {
				const token = await authenticate();
				return res.status(200).json({
					status: 1,
					msg: "Authentication successful",
					access_token: token,
				});
			}

			// ----------------------------------------------------------------------
			// 2️⃣ Fetch Games List
			// ----------------------------------------------------------------------
			case "fetch_games": {
				try {
					const token = await ensureToken();
					const response = await axios.get(
						`${API_BASE_URL}/games/list?page=1`,
						{
							headers: { Authorization: `Bearer ${token}` },
						}
					);

					return res.status(200).json({
						status: 1,
						msg: "Games fetched successfully",
						data: response.data,
					});
				} catch (error) {
					console.error("Error fetching games:", error.message);
					return res.status(500).json({
						status: 0,
						msg: "Failed to fetch games",
						error: error.response?.data || error.message,
					});
				}
			}

			// ----------------------------------------------------------------------
			// 3️⃣ Game Launch
			// ----------------------------------------------------------------------
			case "game_launch": {
				const startTime = Date.now();
				console.log("\n──────────────────────────────");
				console.log(
					"🎯 [GAME_LAUNCH] STARTED @",
					new Date().toISOString()
				);
				console.log(
					"📥 Raw Request Body:",
					JSON.stringify(req.body, null, 2)
				);

				try {
					const {
						user_id,
						game_uuid,
						currency = "BRL",
						lang = "pt",
						type = "CHARGED",
					} = req.body;

					// 🧩 Step 1 - Body Validation
					if (!user_id || !game_uuid) {
						console.warn(
							"⚠️ Missing user_id or game_uuid in request"
						);
						return res.status(400).json({
							status: 0,
							msg: "INVALID_REQUEST",
							details: "Missing user_id or game_uuid",
						});
					}

					// 🧩 Step 2 - User Lookup
					console.log(`🔍 Searching user by phone: ${user_id}`);
					const user = await User.findOne({ phone: user_id }).lean();
					if (!user) {
						console.warn("⚠️ USER_NOT_FOUND in DB:", user_id);
						return res
							.status(404)
							.json({ status: 0, msg: "USER_NOT_FOUND" });
					}

					if (isUserBetAccessBlocked(user)) {
						return res.status(403).json({
							status: 0,
							msg: BET_ACCESS_BLOCKED_CODE,
							details: BET_ACCESS_BLOCKED_MESSAGE,
						});
					}

					console.log(
						"👤 USER RECORD:",
						JSON.stringify(user, null, 2)
					);

					// 🧩 Step 3 - Token Control
					console.log("🪪 Checking access token...");
					const token = await ensureToken();
					if (!token) {
						console.error(
							"❌ Access token missing! ensureToken() failed"
						);
						return res
							.status(500)
							.json({ status: 0, msg: "AUTH_TOKEN_MISSING" });
					}
					console.log(
						"✅ Access token (first 40 chars):",
						token.substring(0, 40)
					);

					// 🧩 Step 4 - Prepare Request
					const requestUrl = `${API_BASE_URL}/games/game_launch`;
					const params = {
						agent_code: AGENT_NAME,
						agent_token: AGENT_TOKEN,
						game_id: game_uuid,
						type,
						currency,
						lang,
						user_id: user.phone, // ✅ as required
					};

					console.log("🌍 API URL:", requestUrl);
					console.log(
						"📦 API Params:",
						JSON.stringify(params, null, 2)
					);
					console.log(
						"🧠 Headers:",
						JSON.stringify(
							{ Authorization: `Bearer ${token}` },
							null,
							2
						)
					);

					// 🧩 Step 5 - Axios Request
					console.time("⏱️ UCRANBET Response Time");
					try {
						const response = await axios.get(requestUrl, {
							headers: { Authorization: `Bearer ${token}` },
							params,
							timeout: 15000,
							validateStatus: () => true, // log even non-200
						});

						console.timeEnd("⏱️ UCRANBET Response Time");
						console.log("📬 [RESPONSE] Status:", response.status);
						console.log(
							"📬 [RESPONSE] Headers:",
							JSON.stringify(response.headers, null, 2)
						);
						console.log(
							"📬 [RESPONSE] Body:",
							JSON.stringify(response.data, null, 2)
						);

						// 🧩 Step 6 - Analyze Response
						if (response.status >= 500) {
							console.error(
								"💥 Remote server 500 error! Raw response:",
								response.data
							);
						}

						const data = response.data;
						const gameUrl =
							data?.game_url || data?.data?.game_url || null;

						if (!gameUrl) {
							console.error("⚠️ Missing game_url field:", data);
							return res.status(400).json({
								status: 0,
								msg: "INVALID_LAUNCH_RESPONSE",
								response: data,
							});
						}

						// 🧩 Step 7 - Success
						console.log("✅ [SUCCESS] Game URL:", gameUrl);
						await logEvent("game_start", {
							userId: user._id,
							gameId: game_uuid,
						});
						await updateMissionProgress("game_start", {
							userId: user._id,
							gameId: game_uuid,
						});

						console.log("🎉 Game launch completed successfully.");
						return res.status(200).json({
							status: 1,
							msg: "Game launched successfully",
							game_url: gameUrl,
						});
					} catch (innerErr) {
						console.error("🔥 INNER AXIOS ERROR CAUGHT");
						console.error("🧱 Message:", innerErr.message);
						console.error("📊 Code:", innerErr.code);
						console.error("📡 Config URL:", innerErr.config?.url);
						console.error(
							"📦 Config Params:",
							innerErr.config?.params
						);
						console.error("📤 Headers:", innerErr.config?.headers);
						if (innerErr.response) {
							console.error(
								"⚠️ Response Status:",
								innerErr.response.status
							);
							console.error(
								"⚠️ Response Data:",
								JSON.stringify(innerErr.response.data, null, 2)
							);
						} else {
							console.error(
								"⚠️ No response received from UCRANBET"
							);
						}
						console.error("📄 Stack:", innerErr.stack);
						throw innerErr;
					}
				} catch (error) {
					console.error("\n❌ [FATAL ERROR] GAME_LAUNCH CRASHED");
					console.error("🧱 Error Name:", error.name);
					console.error("🧠 Message:", error.message);
					console.error("📊 Code:", error.code);
					console.error("📄 Stack Trace:", error.stack);
					console.error(
						"🕐 Total Duration (ms):",
						Date.now() - startTime
					);
					console.error("──────────────────────────────\n");

					return res.status(500).json({
						status: 0,
						msg: "Failed to launch game",
						error: {
							message: error.message,
							status: error.response?.status,
							data: error.response?.data || null,
							stack: error.stack,
						},
					});
				}
			}

			// ----------------------------------------------------------------------
			// 4️⃣ Account Details
			// ----------------------------------------------------------------------
			case "account_details": {
				const { user_id } = req.body;
				if (!user_id)
					return res.status(400).json({
						status: 0,
						msg: "INVALID_REQUEST",
						details: "Missing user_id",
					});

				const user = await User.findOne({ phone: user_id });
				if (!user)
					return res
						.status(404)
						.json({ status: 0, msg: "USER_NOT_FOUND" });

				return res.status(200).json({
					status: 1,
					msg: "Account details retrieved",
					user_id: user.phone,
					email: user.local?.email || "N/A",
					name: user.username || user.name || "guest",
				});
			}

			// ----------------------------------------------------------------------
			// 5️⃣ User Balance
			// ----------------------------------------------------------------------
			case "user_balance": {
				const { user_id } = req.body;
				if (!user_id)
					return res.status(400).json({
						status: 0,
						msg: "INVALID_REQUEST",
						details: "Missing user_id",
					});

				const user = await User.findOne({ phone: user_id });
				if (!user)
					return res
						.status(404)
						.json({ status: 0, msg: "USER_NOT_FOUND" });

				const activeWallet = getActiveWallet(user);
				const balance = activeWallet?.balance || 0;

				return res.status(200).json({
					status: 1,
					msg: "User balance retrieved",
					user_id: user.phone,
					balance: getProviderVisibleBalance(user, balance),
				});
			}

			// ----------------------------------------------------------------------
			// 6️⃣ Transaction: BET
			// ----------------------------------------------------------------------
			case "transaction_bet": {
				const {
					transaction_id,
					user_id,
					amount,
					currency,
					game_uuid,
					round_id,
				} = req.body;

				if (!transaction_id || !user_id || !amount)
					return res.status(400).json({
						status: 0,
						msg: "INVALID_REQUEST",
						details: "Missing required fields",
					});

				const user = await User.findOne({ phone: user_id });
				if (!user)
					return res
						.status(404)
						.json({ status: 0, msg: "USER_NOT_FOUND" });

				if (isUserBetAccessBlocked(user)) {
					return res.status(403).json({
						status: 0,
						msg: BET_ACCESS_BLOCKED_CODE,
						details: BET_ACCESS_BLOCKED_MESSAGE,
						balance: 0,
					});
				}

				// 🎯 Bet Limitleme: kategori bazlı tam blokaj / maksimum tutar kontrolü.
				const limitCheck = evaluateCategoryBetLimit(user, "slots", amount);
				if (!limitCheck.allowed) {
					return res.status(403).json({
						status: 0,
						msg: limitCheck.reason,
						details:
							limitCheck.reason === CATEGORY_BET_LIMIT_EXCEEDED_CODE
								? `Bu kategori için maksimum bahis tutarı ${limitCheck.max} ile sınırlıdır.`
								: "Bu oyun kategorisine erişiminiz kısıtlanmıştır.",
						balance: 0,
					});
				}

				const activeWallet = getActiveWallet(user);
				if (!activeWallet)
					return res
						.status(400)
						.json({ status: 0, msg: "WALLET_NOT_FOUND" });

				const balanceBefore = activeWallet.balance || 0;
				if (balanceBefore < amount)
					return res.status(400).json({
						status: 0,
						msg: "INSUFFICIENT_FUNDS",
						balance: balanceBefore,
					});

				const newBalance = await updateUserBalance(user, -amount, {
					emitSocket: true,
				});

				// 🎯 Bilet çevrimi + Race puanı hook'u (Poker/UCRANBET bahsi konuldu)
				onBetSettled({
					userId: user._id,
					amount,
					category: "casino",
					providerCode: "pokerapi",
				});

				const updatedProgressUser = await User.findByIdAndUpdate(
					user._id,
					{
						$inc: {
							xp: Math.floor(amount / 5),
							"currency.coins": amount / 500,
						},
					},
					{ new: true }
				).select("wallets currency");
				emitUserBalance(null, updatedProgressUser);

				await Transaction.create({
					txn_id: transaction_id,
					user_code: user_id,
					txn_type: "bet",
					game_code: game_uuid,
					bet_money: amount,
					round_id,
					balance_before: balanceBefore,
					balance_after: newBalance,
				});

				await logEvent("bet", { userId: user._id, amount });
				return res.status(200).json({
					status: 1,
					msg: "Bet recorded",
					balance: newBalance,
				});
			}

			// ----------------------------------------------------------------------
			// 7️⃣ Transaction: WIN
			// ----------------------------------------------------------------------
			case "transaction_win": {
				const { transaction_id, user_id, amount, game_uuid, round_id } =
					req.body;

				if (!transaction_id || !user_id || !amount)
					return res.status(400).json({
						status: 0,
						msg: "INVALID_REQUEST",
						details: "Missing required fields",
					});

				const user = await User.findOne({ phone: user_id });
				if (!user)
					return res
						.status(404)
						.json({ status: 0, msg: "USER_NOT_FOUND" });

				const activeWallet = getActiveWallet(user);
				if (!activeWallet)
					return res
						.status(400)
						.json({ status: 0, msg: "WALLET_NOT_FOUND" });

				if (isUserBetAccessBlocked(user)) {
					const linkedBet = await Transaction.exists({
						user_code: user_id,
						round_id,
						txn_type: "bet",
					});
					if (!linkedBet) {
						return res.status(403).json({
							status: 0,
							msg: BET_ACCESS_BLOCKED_CODE,
							details: BET_ACCESS_BLOCKED_MESSAGE,
							balance: 0,
						});
					}
				}

				const balanceBefore = activeWallet.balance || 0;
				const newBalance = await updateUserBalance(user, amount, {
					emitSocket: true,
				});

				await Transaction.create({
					txn_id: transaction_id,
					user_code: user_id,
					txn_type: "win",
					game_code: game_uuid,
					win_money: amount,
					round_id,
					balance_before: balanceBefore,
					balance_after: newBalance,
				});

				await logEvent("win", { userId: user._id, amount });
				return res.status(200).json({
					status: 1,
					msg: "Win recorded",
					balance: newBalance,
				});
			}

			// ----------------------------------------------------------------------
			// 8️⃣ Refund
			// ----------------------------------------------------------------------
			case "refund": {
				const { user_id, amount, transaction_id } = req.body;
				if (!user_id || !amount || !transaction_id)
					return res.status(400).json({
						status: 0,
						msg: "INVALID_REQUEST",
						details: "Missing required fields",
					});

				const user = await User.findOne({ phone: user_id });
				if (!user)
					return res
						.status(404)
						.json({ status: 0, msg: "USER_NOT_FOUND" });

				const activeWallet = getActiveWallet(user);
				if (!activeWallet)
					return res
						.status(400)
						.json({ status: 0, msg: "WALLET_NOT_FOUND" });

				const balanceBefore = activeWallet.balance || 0;
				const newBalance = await updateUserBalance(user, amount, {
					emitSocket: true,
				});

				await Transaction.create({
					txn_id: transaction_id,
					user_code: user_id,
					txn_type: "refund",
					refund_amount: amount,
					balance_before: balanceBefore,
					balance_after: newBalance,
				});

				return res.status(200).json({
					status: 1,
					msg: "Refund processed",
					balance: newBalance,
				});
			}

			// ----------------------------------------------------------------------
			// 9️⃣ Default
			// ----------------------------------------------------------------------
			default:
				return res
					.status(400)
					.json({ status: 0, msg: "UNKNOWN_METHOD" });
		}
	} catch (err) {
		console.error("Unhandled Error:", err.message);
		return res
			.status(500)
			.json({ status: 0, msg: "INTERNAL_ERROR", error: err.message });
	}
});

// ----------------------------------------------------------------------
// 🎮 UCRANBET Game Importer - ALL PAGES (Distribution: pokerapi)
// ----------------------------------------------------------------------

router.post("/import_games", async (req, res) => {
	const { provider = "EVOLIVE" } = req.body;

	try {
		const token = await ensureToken();

		console.log(`📦 Importing ALL games from provider: ${provider}`);

		let importedCount = 0;
		let skippedCount = 0;
		let page = 1;
		let totalPages = 1;

		do {
			console.log(`➡️ Fetching page ${page}...`);

			const response = await axios.get(
				`${API_BASE_URL}/games/list?page=${page}&provider=${provider}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			const json = response.data;

			if (!json?.data?.games) {
				console.log("⚠️ No game data found on page", page);
				break;
			}

			const games = json.data.games;
			const headers = json.data.headers || {};
			const totalRecords = Number(
				json.totalRecords || json.data.totalRecords || 0
			);
			const pageSize = Number(json.pageSize || json.data.pageSize || 20);
			totalPages = Math.ceil(totalRecords / pageSize) || 1;

			console.log(
				`📄 Page ${page}/${totalPages} | ${games.length} games found`
			);

			for (const g of games) {
				const gameCode = g[headers.gameCode] || g[0] || "";
				const gameName = g[headers.gameName] || g[1] || "Unknown Game";
				const category = g[headers.categoryCode] || g[2] || "SLOT";
				const imageSquare = g[headers.imageSquare] || g[3] || "";
				const imageLandscape = g[headers.imageLandscape] || g[4] || "";
				const languages = g[headers.languageCode]?.split(",") || ["en"];
				const platforms = g[headers.platformCode]?.split(",") || [
					"WEB",
				];
				const currency = g[headers.currencyCode] || "BRL";

				if (!gameCode) continue; // Boş kodları atla

				const exists = await Game.findOne({ game_code: gameCode });
				if (exists) {
					skippedCount++;
					continue;
				}

				const gameData = {
					game_id: String(gameCode),
					provider_id: 0,
					game_server_url: null,
					game_name: gameName,
					game_code: gameCode,
					game_type: category || "casino",
					description: null,
					cover: imageLandscape || imageSquare,
					technology: "HTML5",
					has_lobby: 0,
					is_mobile: platforms.includes("H5") ? 1 : 0,
					has_freespins: 0,
					has_tables: 0,
					only_demo: 0,
					distribution: "pokerapi",
					status: 1,
					lobby_id: null,
					rtp: 0,
					provider_code: provider,
					banner: imageSquare || imageLandscape,
					featured: 0,
					views: 0,
					provider: {
						id: 0,
						code: String(provider),
						name: String(provider),
						status: 1,
						rtp: 0,
					},
					category: category || null,
				};

				await Game.create(gameData);
				importedCount++;
			}

			console.log(
				`✅ Page ${page} imported (${importedCount} total, ${skippedCount} skipped)`
			);

			page++;
		} while (page <= totalPages);

		console.log(
			`🎯 Import finished for ${provider}: ${importedCount} new games, ${skippedCount} skipped`
		);

		return res.status(200).json({
			status: 1,
			msg: "All games imported successfully",
			imported: importedCount,
			skipped: skippedCount,
			provider,
		});
	} catch (error) {
		console.error(
			"❌ Error importing games:",
			error.response?.data || error.message
		);
		return res.status(500).json({
			status: 0,
			msg: "ERROR_IMPORTING_GAMES",
			error: error.response?.data || error.message,
		});
	}
});

module.exports = router;
