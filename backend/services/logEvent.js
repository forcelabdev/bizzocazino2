const UserActionLog = require("../database/models/UserActionLog");
const { updateMissionProgress } = require("./MissionEngine");

async function logEvent(actionType, data) {
	const logData = {
		userId: data.userId,
		actionType,
		gameId: data.gameId,
		betAmount: data.betAmount,
		winAmount: data.winAmount,
		amount: data.amount,
		metadata: data.metadata || {},
		timestamp: new Date(),
	};

	await UserActionLog.create(logData);

	// 📌 GÖREVLERİ GÜNCELLE
	await updateMissionProgress(actionType, data);
}

module.exports = logEvent;
