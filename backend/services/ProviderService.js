const axios = require("axios");
const ApiProvider = require("../database/models/ApiProvider");
const GameProvider = require("../database/models/GameProvider");
const Game = require("../database/models/Game");

/**
 * ProviderService - API Provider yönetim servisi
 * Her provider tipi için özelleştirilmiş auth, sync ve game fetch işlemleri
 */
class ProviderService {
	constructor() {
		// Provider-specific handlers
		this.handlers = {
			drakon: new DrakonHandler(),
			nexus: new NexusHandler(),
		};
	}

	/**
	 * Handler'ı al veya generic handler döndür
	 */
	getHandler(providerCode) {
		return (
			this.handlers[providerCode.toLowerCase()] || new GenericHandler()
		);
	}

	/**
	 * Provider için authentication yap
	 */
	async authenticate(apiProvider) {
		const handler = this.getHandler(apiProvider.code);
		try {
			const result = await handler.authenticate(apiProvider);

			// Token'ı kaydet
			apiProvider.accessToken = result.token;
			apiProvider.tokenExpiresAt =
				result.expiresAt || new Date(Date.now() + 3600000); // 1 saat default
			apiProvider.lastError = null;
			await apiProvider.save();

			return { success: true, token: result.token };
		} catch (error) {
			apiProvider.lastError = error.message;
			await apiProvider.save();
			throw error;
		}
	}

	/**
	 * Geçerli token al (gerekirse yenile)
	 */
	async ensureValidToken(apiProvider) {
		if (!apiProvider.isTokenValid()) {
			await this.authenticate(apiProvider);
		}
		return apiProvider.accessToken;
	}

	/**
	 * GameProvider'ları senkronize et
	 */
	async syncGameProviders(apiProvider) {
		const handler = this.getHandler(apiProvider.code);

		try {
			apiProvider.syncStatus = "syncing";
			await apiProvider.save();

			// Token'ı al
			const token = await this.ensureValidToken(apiProvider);

			// Provider listesini çek
			const providers = await handler.fetchProviders(apiProvider, token);

			// Her provider'ı kaydet/güncelle
			const results = { created: 0, updated: 0, failed: 0 };

			for (const providerData of providers) {
				try {
					const existing = await GameProvider.findOne({
						apiProvider: apiProvider._id,
						code: providerData.code.toLowerCase(),
					});

					if (existing) {
						// Güncelle
						Object.assign(existing, {
							name: providerData.name,
							externalId: providerData.id,
							rtp: providerData.rtp || existing.rtp,
							status: providerData.status ?? existing.status,
							meta: { ...existing.meta, ...providerData.meta },
							lastSyncAt: new Date(),
						});
						await existing.save();
						results.updated++;
					} else {
						// Oluştur
						await GameProvider.create({
							apiProvider: apiProvider._id,
							externalId: providerData.id,
							code: providerData.code.toLowerCase(),
							name: providerData.name,
							rtp: providerData.rtp || 96,
							status: providerData.status ?? 1,
							gameTypes: providerData.gameTypes || ["slots"],
							meta: providerData.meta || {},
							lastSyncAt: new Date(),
						});
						results.created++;
					}
				} catch (err) {
					console.error(
						`Failed to sync provider ${providerData.code}:`,
						err.message
					);
					results.failed++;
				}
			}

			// Sync durumunu güncelle
			apiProvider.syncStatus = "success";
			apiProvider.lastSyncAt = new Date();
			apiProvider.lastError = null;
			await apiProvider.save();

			return results;
		} catch (error) {
			apiProvider.syncStatus = "failed";
			apiProvider.lastError = error.message;
			await apiProvider.save();
			throw error;
		}
	}

	/**
	 * Belirli bir GameProvider için oyunları senkronize et
	 */
	async syncGames(gameProvider, options = {}) {
		const apiProvider = await ApiProvider.findById(
			gameProvider.apiProvider
		);
		if (!apiProvider) throw new Error("ApiProvider not found");

		const handler = this.getHandler(apiProvider.code);
		const token = await this.ensureValidToken(apiProvider);

		try {
			// Oyunları çek
			const games = await handler.fetchGames(
				apiProvider,
				gameProvider,
				token
			);

			const results = { created: 0, updated: 0, failed: 0 };

			for (const gameData of games) {
				try {
					const existing = await Game.findOne({
						gameProvider: gameProvider._id,
						game_code: gameData.code,
					});

					// Eski Game.js yapısına uygun, sadece gameProvider referansı ekli
					const gameDoc = {
						gameProvider: gameProvider._id,
						game_id: gameData.id?.toString() || gameData.code,
						provider_id: gameProvider.externalId || 0,
						game_server_url: gameData.server_url || null,
						game_name: gameData.name,
						game_code: gameData.code,
						game_type: gameData.type || "slots",
						description: gameData.description || null,
						cover:
							gameData.cover || gameData.banner || gameData.image,
						technology: gameData.technology || "html5",
						has_lobby: gameData.has_lobby ? 1 : 0,
						is_mobile: gameData.is_mobile ? 1 : 0,
						has_freespins: gameData.has_freespins ? 1 : 0,
						has_tables: gameData.has_tables ? 1 : 0,
						only_demo: gameData.only_demo ? 1 : 0,
						distribution: apiProvider.code,
						status: gameData.status ?? 1,
						lobby_id: gameData.lobby_id || null,
						rtp: gameData.rtp || gameProvider.rtp || 96,
						provider_code: gameProvider.code,
						banner: gameData.banner || gameData.image || null,
						category: gameData.category || null,
					};

					if (existing) {
						Object.assign(existing, gameDoc);
						await existing.save();
						results.updated++;
					} else {
						await Game.create(gameDoc);
						results.created++;
					}
				} catch (err) {
					console.error(
						`Failed to sync game ${gameData.code}:`,
						err.message
					);
					results.failed++;
				}
			}

			// Game count güncelle
			await gameProvider.updateGameCount();

			return results;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Tüm oyunları senkronize et (belirli bir ApiProvider için)
	 */
	async syncAllGames(apiProvider, options = {}) {
		const gameProviders = await GameProvider.find({
			apiProvider: apiProvider._id,
			status: 1,
		});

		const totalResults = {
			created: 0,
			updated: 0,
			failed: 0,
			providers: 0,
		};
		const rateLimit = apiProvider.settings?.rateLimit || 1000;

		for (const gp of gameProviders) {
			try {
				console.log(`Syncing games for ${gp.name}...`);
				const results = await this.syncGames(gp, options);
				totalResults.created += results.created;
				totalResults.updated += results.updated;
				totalResults.failed += results.failed;
				totalResults.providers++;

				// Rate limit
				if (rateLimit > 0) {
					await new Promise((resolve) =>
						setTimeout(resolve, rateLimit)
					);
				}
			} catch (err) {
				console.error(
					`Failed to sync games for ${gp.name}:`,
					err.message
				);
			}
		}

		return totalResults;
	}

	/**
	 * Oyun başlat
	 */
	async launchGame(game, user, options = {}) {
		const gameProvider = await GameProvider.findById(game.gameProvider);
		if (!gameProvider) throw new Error("GameProvider not found");

		const apiProvider = await ApiProvider.findById(
			gameProvider.apiProvider
		);
		if (!apiProvider) throw new Error("ApiProvider not found");
		if (apiProvider.status !== 1)
			throw new Error("ApiProvider is inactive");

		const handler = this.getHandler(apiProvider.code);
		const token = await this.ensureValidToken(apiProvider);

		return handler.launchGame(
			apiProvider,
			gameProvider,
			game,
			user,
			token,
			options
		);
	}
}

/**
 * Base Handler - Tüm handler'lar için temel sınıf
 */
class BaseHandler {
	async authenticate(apiProvider) {
		throw new Error("authenticate() must be implemented");
	}

	async fetchProviders(apiProvider, token) {
		throw new Error("fetchProviders() must be implemented");
	}

	async fetchGames(apiProvider, gameProvider, token) {
		throw new Error("fetchGames() must be implemented");
	}

	async launchGame(apiProvider, gameProvider, game, user, token, options) {
		throw new Error("launchGame() must be implemented");
	}

	// Helper: Axios instance oluştur
	createClient(apiProvider, token = null) {
		const headers = { "Content-Type": "application/json" };

		if (token) {
			if (apiProvider.authType === "bearer") {
				headers["Authorization"] = `Bearer ${token}`;
			} else if (apiProvider.authType === "api_key") {
				headers["X-API-Key"] = token;
			}
		}

		return axios.create({
			baseURL: apiProvider.apiBaseUrl,
			headers,
			timeout: apiProvider.settings?.timeout || 30000,
		});
	}
}

/**
 * Drakon Handler
 */
class DrakonHandler extends BaseHandler {
	async authenticate(apiProvider) {
		const { agentToken, agentSecret } = apiProvider.credentials;
		const authToken = Buffer.from(`${agentToken}:${agentSecret}`).toString(
			"base64"
		);

		const response = await axios.post(
			`${apiProvider.apiBaseUrl}${
				apiProvider.endpoints.auth || "/auth/authentication"
			}`,
			{},
			{ headers: { Authorization: `Bearer ${authToken}` } }
		);

		if (!response.data?.access_token) {
			throw new Error("Authentication failed: No access_token received");
		}

		return {
			token: response.data.access_token,
			expiresAt: new Date(Date.now() + 3600000), // 1 saat
		};
	}

	async fetchProviders(apiProvider, token) {
		const client = this.createClient(apiProvider, token);
		const response = await client.get(
			apiProvider.endpoints.providers || "/games/provider"
		);

		const providers = response.data?.providers || response.data?.data || [];

		return providers.map((p) => ({
			id: p.id,
			code: p.code,
			name: p.name,
			rtp: p.rtp,
			status: p.status,
			meta: { created_at: p.created_at, updated_at: p.updated_at },
		}));
	}

	async fetchGames(apiProvider, gameProvider, token) {
		const client = this.createClient(apiProvider, token);
		const response = await client.get(
			apiProvider.endpoints.games || "/games/all"
		);

		const allGames = response.data?.games || response.data?.data || [];

		// Bu provider'a ait oyunları filtrele
		const providerGames = allGames.filter(
			(g) =>
				g.provider?.code?.toLowerCase() ===
				gameProvider.code.toLowerCase()
		);

		return providerGames.map((g) => ({
			id: g.game_id,
			code: g.game_code,
			name: g.game_name,
			type: g.game_type,
			banner: g.banner || g.cover,
			cover: g.cover,
			rtp: g.rtp,
			status: g.status,
			has_lobby: g.has_lobby,
			is_mobile: g.is_mobile,
			has_freespins: g.has_freespins,
			has_tables: g.has_tables,
			only_demo: g.only_demo,
			technology: g.technology,
			lobby_id: g.lobby_id,
		}));
	}

	async launchGame(
		apiProvider,
		gameProvider,
		game,
		user,
		token,
		options = {}
	) {
		const client = this.createClient(apiProvider, token);

		const response = await client.get(
			apiProvider.endpoints.gameLaunch || "/games/game_launch",
			{
				params: {
					agent_code: apiProvider.credentials.agentCode,
					agent_token: apiProvider.credentials.agentToken,
					game_id: game.gameCode,
					type: options.type || "CHARGED",
					currency:
						options.currency ||
						apiProvider.settingsCurrency ||
						"TRY",
					lang: options.lang || apiProvider.settingsLanguage || "tr",
					user_id: user.numericId,
					user_name: user.username || "guest",
				},
			}
		);

		if (!response.data?.game_url) {
			throw new Error("Failed to launch game: No game_url received");
		}

		return { gameUrl: response.data.game_url };
	}
}

/**
 * Nexus Handler
 */
class NexusHandler extends BaseHandler {
	async authenticate(apiProvider) {
		// Nexus token-based auth kullanmıyor, her request'te credentials gönderiliyor
		return {
			token: "nexus_static_token", // Placeholder
			expiresAt: new Date(Date.now() + 86400000), // 24 saat
		};
	}

	async fetchProviders(apiProvider, token) {
		const { agentCode, agentToken } = apiProvider.credentials;

		const response = await axios.post(apiProvider.apiBaseUrl, {
			method: "provider_list",
			agent_code: agentCode,
			agent_token: agentToken,
		});

		if (response.data?.status !== 1) {
			throw new Error(
				`Provider list failed: ${response.data?.msg || "UNKNOWN_ERROR"}`
			);
		}

		const providers =
			response.data?.providers || response.data?.provider_list || [];

		return providers.map((p) => ({
			id: p.id || null,
			code: p.provider_code || p.code,
			name: p.provider_name || p.name || p.provider_code,
			rtp: p.rtp || 96,
			status: 1,
		}));
	}

	async fetchGames(apiProvider, gameProvider, token) {
		const { agentCode, agentToken } = apiProvider.credentials;

		const response = await axios.post(apiProvider.apiBaseUrl, {
			method: "game_list",
			agent_code: agentCode,
			agent_token: agentToken,
			provider_code: gameProvider.code,
		});

		if (response.data?.status !== 1) {
			throw new Error(
				`Game list failed: ${response.data?.msg || "UNKNOWN_ERROR"}`
			);
		}

		const games = response.data?.games || [];

		return games.map((g) => ({
			id: g.game_id,
			code: g.game_code,
			name: g.game_name,
			type: g.game_type || "slots",
			banner: (g.banner || "").replace(
				"assets.bd34fgabh.com",
				"assets.wkuytxcg8.com"
			),
			status: g.status ?? 1,
		}));
	}

	async launchGame(
		apiProvider,
		gameProvider,
		game,
		user,
		token,
		options = {}
	) {
		const { agentCode, agentToken } = apiProvider.credentials;

		const response = await axios.post(apiProvider.apiBaseUrl, {
			method: "game_launch",
			agent_code: agentCode,
			agent_token: agentToken,
			user_code: user._id.toString(),
			provider_code: gameProvider.code,
			game_code: game.gameCode,
			lang: options.lang || apiProvider.settingsLanguage || "tr",
		});

		if (!response.data?.launch_url && !response.data?.game_url) {
			throw new Error("Failed to launch game: No launch_url received");
		}

		return { gameUrl: response.data.launch_url || response.data.game_url };
	}
}

/**
 * Generic Handler - Bilinmeyen provider'lar için
 */
class GenericHandler extends BaseHandler {
	async authenticate(apiProvider) {
		console.warn(
			`No specific handler for provider: ${apiProvider.code}, using generic auth`
		);
		return { token: null, expiresAt: null };
	}

	async fetchProviders(apiProvider, token) {
		console.warn(`No specific handler for provider: ${apiProvider.code}`);
		return [];
	}

	async fetchGames(apiProvider, gameProvider, token) {
		console.warn(`No specific handler for provider: ${apiProvider.code}`);
		return [];
	}

	async launchGame(apiProvider, gameProvider, game, user, token, options) {
		throw new Error(
			`No handler implemented for provider: ${apiProvider.code}`
		);
	}
}

// Singleton instance
module.exports = new ProviderService();
