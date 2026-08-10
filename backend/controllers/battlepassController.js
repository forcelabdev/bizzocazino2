// controllers/battlepassController.js
const Mission = require("../database/models/Mission");
const UserMissionProgress = require("../database/models/UserMissionProgress");
const UserProgress = require("../database/models/UserProgress");
const Season = require("../database/models/Season");
const Reward = require("../database/models/Reward");
const User = require("../database/models/User");
const { getActiveWallet, updateUserBalance } = require("../utils/wallet");

async function claimMissionReward(req, res) {
	const userId = req.user._id;
	const { missionId } = req.body;

	try {
		const mission = await Mission.findById(missionId);
		if (!mission)
			return res.status(404).json({ message: "Mission not found" });

		const season = await Season.findOne({
			_id: mission.seasonId,
			isActive: true,
		});
		if (!season)
			return res
				.status(400)
				.json({ message: "Season inactive or not found" });

		const missionProgress = await UserMissionProgress.findOne({
			userId,
			missionId,
		});
		if (!missionProgress || !missionProgress.isCompleted) {
			return res
				.status(400)
				.json({ message: "Mission not completed yet" });
		}

		if (!mission.isRepeatable && missionProgress.lastClaimed) {
			return res.status(400).json({ message: "Reward already claimed" });
		}

		// XP ve token ekle
		let userProgress = await UserProgress.findOne({
			userId,
			seasonId: season._id,
		});
		if (!userProgress) {
			userProgress = await UserProgress.create({
				userId,
				seasonId: season._id,
				currentLevel: 1,
				currentXP: 0,
			});
		}

		let xpToAdd = mission.xpReward;
		let currentXP = userProgress.currentXP + xpToAdd;
		let currentLevel = userProgress.currentLevel;

		while (
			currentLevel < season.totalLevels &&
			currentXP >= season.xpPerLevel[currentLevel - 1]
		) {
			currentXP -= season.xpPerLevel[currentLevel - 1];
			currentLevel++;
		}

		userProgress.currentXP = currentXP;
		userProgress.currentLevel = currentLevel;
		userProgress.lastUpdated = new Date();

		if (!userProgress.completedMissions.includes(mission._id)) {
			userProgress.completedMissions.push(mission._id);
		}

		await userProgress.save();

		// mission claim tarihi güncelle
		missionProgress.lastClaimed = new Date();
		await missionProgress.save();

		res.json({
			message: "Mission reward claimed",
			newLevel: currentLevel,
			xp: currentXP,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Internal error" });
	}
}

async function claimBattlepassReward(req, res) {
	const userId = req.user._id;
	const { rewardId } = req.body;

	try {
		const reward = await Reward.findById(rewardId);
		if (!reward)
			return res.status(404).json({ message: "Reward not found" });

		const season = await Season.findOne({
			_id: reward.seasonId,
			isActive: true,
		});
		if (!season)
			return res
				.status(400)
				.json({ message: "Reward is not part of an active season" });

		const userProgress = await UserProgress.findOne({
			userId,
			seasonId: season._id,
		});
		if (!userProgress)
			return res
				.status(400)
				.json({ message: "User has no progress in this season" });

		if (userProgress.currentLevel < reward.level) {
			return res.status(400).json({
				message: "Your level is not high enough to claim this reward",
			});
		}

		if (reward.isPremium && !userProgress.premium) {
			return res.status(403).json({
				message:
					"This is a premium reward. Please upgrade to premium pass.",
			});
		}

		if (userProgress.claimedRewards.includes(reward._id)) {
			return res.status(400).json({ message: "Reward already claimed" });
		}

		// Kullanıcıyı bul
		const user = await User.findById(userId);
		if (!user) return res.status(400).json({ message: "User not found" });

		// Token ise bakiyeye ekle
		if (reward.rewardType?.toLowerCase() === "token" && reward.amount > 0) {
			user.balance = (user.balance || 0) + reward.amount;
			await user.save();
		}

		// Ödül claim işlemi
		userProgress.claimedRewards.push(reward._id);
		await userProgress.save();

		reward.claimedBy.push(userId);
		await reward.save();

		res.json({
			message: "Reward claimed successfully",
			newBalance: user.balance,
		});
	} catch (error) {
		console.error("claimBattlepassReward error:", error);
		res.status(500).json({ message: "Internal error" });
	}
}

async function getBattlepassStatus(req, res) {
	const userId = req.user._id;

	try {
		const season = await Season.findOne({ isActive: true });
		if (!season)
			return res.status(404).json({ message: "No active season found" });

		const progress = (await UserProgress.findOne({
			userId,
			seasonId: season._id,
		})) || {
			currentLevel: 1,
			currentXP: 0,
			premium: false,
			claimedRewards: [],
			completedMissions: [],
		};

		const missions = await Mission.find({ seasonId: season._id });
		const rewards = await Reward.find({ seasonId: season._id });

		const missionProgressList = await UserMissionProgress.find({ userId })
			.where("missionId")
			.in(missions.map((m) => m._id))
			.lean();

		const missionProgressMap = {};
		for (const mp of missionProgressList) {
			missionProgressMap[mp.missionId.toString()] = mp;
		}

		const missionsWithProgress = missions.map((m) => {
			const missionProgress = missionProgressMap[m._id.toString()] || {};
			return {
				...m.toObject(),
				currentProgress: missionProgress.currentProgress || 0,
				isCompleted: missionProgress.isCompleted || false,
				lastClaimed: missionProgress.lastClaimed || null, // ✅ EKLENDİ
			};
		});

		res.json({
			season,
			progress,
			missions: missionsWithProgress,
			rewards,
			claimedRewardIds: progress.claimedRewards || [],
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Internal error" });
	}
}

async function buyPremiumPass(req, res) {
	const userId = req.user._id;

	try {
		const season = await Season.findOne({ isActive: true });
		if (!season)
			return res.status(404).json({ message: "No active season found" });

		let userProgress = await UserProgress.findOne({
			userId,
			seasonId: season._id,
		});
		if (!userProgress) {
			userProgress = await UserProgress.create({
				userId,
				seasonId: season._id,
				currentLevel: 1,
				currentXP: 0,
			});
		}

		if (userProgress.premium) {
			return res
				.status(400)
				.json({ message: "Premium already purchased for this season" });
		}

		const user = await User.findById(userId);
		if (!user) {
			return res.status(400).json({ message: "User not found" });
		}

		const activeWallet = getActiveWallet(user);
		if (!activeWallet) {
			return res.status(400).json({ message: "Wallet not found" });
		}

		const currentBalance = activeWallet.balance || 0;
		if (currentBalance < season.premiumPrice) {
			return res.status(400).json({ message: "Insufficient balance" });
		}

		// Bakiyeden düş
		const newBalance = await updateUserBalance(user, -season.premiumPrice, {
			emitSocket: true,
		});

		// Premium yap
		userProgress.premium = true;
		userProgress.premiumPurchaseDate = new Date();
		await userProgress.save();

		res.json({
			message: "Premium pass purchased successfully",
			newBalance: newBalance,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Internal error" });
	}
}

module.exports = {
	claimMissionReward,
	claimBattlepassReward,
	getBattlepassStatus,
	buyPremiumPass,
};
