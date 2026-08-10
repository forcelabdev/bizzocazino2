const validator = require("validator");
const fetch = require("node-fetch");

const generalCheckGetUserInfoData = (data) => {
	if (data === undefined || data === null) {
		throw new Error(
			"Something went wrong! Please try again in a few seconds."
		);
	} else if (
		data.userId === undefined ||
		typeof data.userId !== "string" ||
		validator.isMongoId(data.userId) !== true
	) {
		throw new Error("Your entered user id is invalid.");
	}
};

const generalCheckGetUserInfoUser = (userDatabase) => {
	if (userDatabase === null) {
		throw new Error("Your requested user was not found.");
	}
};

const generalCheckGetUserBetsData = (data) => {
	if (data === undefined || data === null) {
		throw new Error(
			"Something went wrong. Please try again in a few seconds."
		);
	} else if (
		data.page === undefined ||
		isNaN(data.page) === true ||
		data.page <= 0
	) {
		throw new Error("Your entered page is invalid.");
	}
};

const generalCheckGetUserTransactionsData = (data) => {
	if (data === undefined || data === null) {
		throw new Error(
			"Something went wrong. Please try again in a few seconds."
		);
	} else if (
		data.page === undefined ||
		isNaN(data.page) === true ||
		data.page <= 0
	) {
		throw new Error("Your entered page is invalid.");
	}
};

const generalCheckSendUserAnonymousData = (data) => {
	if (data === undefined || data === null) {
		throw new Error(
			"Something went wrong! Please try again in a few seconds."
		);
	} else if (
		data.anonymous === undefined ||
		typeof data.anonymous !== "boolean"
	) {
		throw new Error("Your entered anonymous value is invalid.");
	}
};

const generalCheckSendUserDiscordData = (data) => {
	if (data === undefined || data === null) {
		throw new Error(
			"Something went wrong! Please try again in a few seconds."
		);
	} else if (
		data.method === undefined ||
		typeof data.method !== "string" ||
		["link", "unlink"].includes(data.method) === false
	) {
		throw new Error("Your entered method value is invalid.");
	} else if (
		data.method === "link" &&
		(data.tokenDiscord === undefined ||
			data.tokenDiscord === null ||
			typeof data.tokenDiscord !== "string")
	) {
		throw new Error("Your entered discord token is invalid.");
	}
};

const generalCheckSendUserDiscordUser = (data, user) => {
	if (data === undefined || user === undefined) {
		throw new Error(
			"Something went wrong! Please try again in a few seconds."
		);
	} else if (data.method === "link" && user.discordId !== undefined) {
		throw new Error("You have already linked a discord account.");
	} else if (data.method === "unlink" && user.discordId === undefined) {
		throw new Error(
			"You dont have a linked discord account at the moment."
		);
	}
};

const generalCheckSendUserSeedData = (data) => {
	if (data === undefined || data === null) {
		throw new Error(
			"Something went wrong! Please try again in a few seconds."
		);
	} else if (
		data.seedClient === undefined ||
		typeof data.seedClient !== "string" ||
		data.seedClient.trim().length <= 0 ||
		data.seedClient.trim().length > 64
	) {
		throw new Error("Your entered client seed is invalid.");
	}
};

const generalCheckSendUserSeedGames = (gamesDatabase) => {
	if (gamesDatabase.length >= 1) {
		throw new Error("You’ve to complete all your open games first.");
	}
};

const generalCheckSendUserTipData = (data) => {
	if (data === undefined || data === null) {
		throw new Error(
			"Something went wrong! Please try again in a few seconds."
		);
	} else if (
		data.receiverId === undefined ||
		typeof data.receiverId !== "string" ||
		validator.isMongoId(data.receiverId) !== true
	) {
		throw new Error("Your entered receiver id is invalid.");
	} else if (
		data.amount === undefined ||
		isNaN(data.amount) === true ||
		Math.floor(data.amount) < 10
	) {
		throw new Error("Your entered tip amount is invalid.");
	}
};

const generalCheckSendUserTipUser = (data, user) => {
	if (user.balance < Math.floor(data.amount)) {
		throw new Error("You have not enough balance for this action.");
	} else if (user.stats.deposit < 50 * 1000) {
		throw new Error("You need to have a total of 50 robux deposited.");
	} else if (user.limits.blockTip === true && user.limits.limitTip === 0) {
		throw new Error("You are not allowed to tip users.");
	} else if (
		user.limits.blockTip === true &&
		user.limits.limitTip < Math.floor(data.amount)
	) {
		throw new Error(
			`You are not allowed to tip users more then ${(
				Math.floor(user.limits.limitTip / 10) / 100
			).toFixed(2)}.`
		);
	}
};

const generalCheckSendUserTipReceiver = (user, receiverDatabase) => {
	if (receiverDatabase === null) {
		throw new Error("Your entered receiver id is not available.");
	} else if (user._id.toString() === receiverDatabase._id.toString()) {
		throw new Error("You are not allowed to tip yourself.");
	}
};
const generalUserGetLevel = (user) => {
	if (!user || !user.xp) return 0;
	const level = Math.floor(Math.pow(user.xp / 100, 1 / 3));
	return level >= 100 ? 100 : level;
};

const generalUserGetRakeback = (user) => {
	if (!user || !user.xp) {
		return { name: null, percentage: 0 };
	}

	const xp = user.xp;
	let rakeback = { name: null, percentage: 0 };

	if (xp >= 100 && xp < 200) {
		rakeback = { name: "Rivo VIP1", percentage: 0.002 }; // %0.2
	} else if (xp >= 200 && xp < 300) {
		rakeback = { name: "Rivo VIP2", percentage: 0.0025 }; // %0.25
	} else if (xp >= 300 && xp < 500) {
		rakeback = { name: "Rivo VIP3", percentage: 0.003 }; // %0.3
	} else if (xp >= 500 && xp < 700) {
		rakeback = { name: "Rivo VIP4", percentage: 0.004 }; // %0.4
	} else if (xp >= 700 && xp < 1500) {
		rakeback = { name: "Rivo VIP5", percentage: 0.0045 }; // %0.45
	} else if (xp >= 1500 && xp < 3000) {
		rakeback = { name: "Rivo VIP6", percentage: 0.005 }; // %0.5
	} else if (xp >= 3000 && xp < 5000) {
		rakeback = { name: "Rivo VIP7", percentage: 0.006 }; // %0.6
	} else if (xp >= 5000 && xp < 10000) {
		rakeback = { name: "Rivo VIP8", percentage: 0.0065 }; // %0.65
	} else if (xp >= 10000 && xp < 50000) {
		rakeback = { name: "Rivo VIP9", percentage: 0.007 }; // %0.7
	} else if (xp >= 50000) {
		rakeback = { name: "Rivo VIP10", percentage: 0.0085 }; // %0.85
	}

	return rakeback;
};

const userGetDiscordUserData = (discordToken) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await fetch("https://discord.com/api/v9/users/@me", {
				method: "GET",
				headers: { Authorization: `Bearer ${discordToken}` },
			});

			// Validate response object
			if (
				response !== undefined &&
				response !== null &&
				response.status === 200
			) {
				response = await response.json();
				resolve(response);
			} else {
				reject(
					new Error(
						"We are not able to fetch your discord user data at the moment. Please try again later."
					)
				);
			}
		} catch (err) {
			reject(
				new Error(
					"Something went wrong. Please try again in a few seconds."
				)
			);
		}
	});
};

const generalUserGetFormated = (user) => {
	// Get user level
	const level = generalUserGetLevel(user);

	// Check if user is null
	if (!user) return null;

	// Get user rakeback
	const rakeback = generalUserGetRakeback(user);

	// Create new sanitized user object
	let sanitized =
		user.anonymous === true
			? null
			: {
					_id: user._id,
					roblox: user.roblox,
					username: user.username,
					avatar: user.avatar,
					rank: user.rank,
					level: level,
					stats: user.stats,
					rakeback: rakeback.name,
					createdAt: user.createdAt,
			  };

	return sanitized;
};

const generalSanitizeBets = (bets) => {
	let sanitized = [];

	for (let bet of bets) {
		if (["mines", "towers", "unbox"].includes(bet.method) === true) {
			bet.fair.seed = {
				seedClient: bet.fair.seed.seedClient,
				hash: bet.fair.seed.hash,
				...(bet.fair.seed.state === "completed"
					? { seedServer: bet.fair.seed.seedServer }
					: {}),
			};
		} else if (["crash", "roll"].includes(bet.method) === true) {
			bet.game.fair.seed = {
				...bet.game.fair.seed,
				seedServer:
					bet.game.state === "completed"
						? bet.game.fair.seed.seedServer
						: undefined,
			};
		}

		sanitized.push(bet);
	}

	return sanitized;
};

const generalSanitizeUserSeed = (seedDatabase) => {
	let sanitized = JSON.parse(JSON.stringify(seedDatabase));

	if (sanitized.state !== "completed") {
		delete sanitized._id;
		delete sanitized.seedServer;
		delete sanitized.user;
		delete sanitized.state;
	}

	return sanitized;
};

module.exports = {
	generalCheckGetUserInfoData,
	generalCheckGetUserInfoUser,
	generalCheckGetUserBetsData,
	generalCheckGetUserTransactionsData,
	generalCheckSendUserAnonymousData,
	generalCheckSendUserDiscordData,
	generalCheckSendUserDiscordUser,
	generalCheckSendUserSeedData,
	generalCheckSendUserSeedGames,
	generalCheckSendUserTipData,
	generalCheckSendUserTipUser,
	generalCheckSendUserTipReceiver,
	generalUserGetLevel,
	generalUserGetRakeback,
	userGetDiscordUserData,
	generalUserGetFormated,
	generalSanitizeBets,
	generalSanitizeUserSeed,
};
