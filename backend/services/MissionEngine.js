const Mission = require("../database/models/Mission");
const UserMissionProgress = require("../database/models/UserMissionProgress");
const Season = require("../database/models/Season");

async function updateMissionProgress(actionType, data) {
	const { userId, gameId, amount = 1 } = data;

	// Aktif sezonu bul
	const activeSeason = await Season.findOne({ isActive: true });
	if (!activeSeason) return;

	// Sezon içindeki ilgili görevleri çek
	const missions = await Mission.find({
		seasonId: activeSeason._id,
		missionType: {
			$in: ["DAILY", "WEEKLY", "SEASONAL", "SPECIAL", "GAME_SPECIFIC"],
		},
		startDate: { $lte: new Date() },
		$or: [
			{ endDate: { $exists: false } },
			{ endDate: { $gte: new Date() } },
		],
	});

	for (const mission of missions) {
		// Görev log türüyle eşleşiyor mu?
		if (!isMissionMatchingAction(mission, actionType, gameId)) continue;

		// Kullanıcının görev kaydını al ya da oluştur
		const progress = await UserMissionProgress.findOneAndUpdate(
			{ userId, missionId: mission._id },
			{
				$inc: { currentProgress: amount },
				$setOnInsert: { isCompleted: false },
			},
			{ upsert: true, new: true }
		);

		// Görev tamamlandıysa flagle
		if (
			!progress.isCompleted &&
			progress.currentProgress + amount >= mission.targetValue
		) {
			progress.isCompleted = true;
			progress.lastClaimed = null;
			await progress.save();
		}
	}
}

// Görev tipi aksiyonla eşleşiyor mu kontrolü
function isMissionMatchingAction(mission, actionType, gameId) {
	switch (actionType) {
		case "game_start":
			return mission.name.toLowerCase().includes("oyun");
		case "spin":
			if (mission.missionType === "GAME_SPECIFIC") {
				return (
					Array.isArray(mission.gameSpecific) &&
					mission.gameSpecific.includes(gameId)
				);
			}
			return mission.name.toLowerCase().includes("spin");
		case "bet":
			return mission.name.toLowerCase().includes("bahis");
		case "login":
			return (
				mission.name.toLowerCase().includes("giriş") ||
				mission.name.toLowerCase().includes("login")
			);
		case "stake":
			return mission.name.toLowerCase().includes("stake");
		default:
			return false;
	}
}

module.exports = { updateMissionProgress };
