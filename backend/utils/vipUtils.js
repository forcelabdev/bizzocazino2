const Vip = require("../database/models/Vip");

async function getUserVIPLevel(user) {
  const levels = await Vip.find({}).sort({ level: 1 }).lean();

  if (!levels || levels.length === 0) {
    return null;
  }

  const userXp = (user && user.xp) || 0;

  let currentLevel = levels[0];

  for (let level of levels) {
    if (userXp >= level.requiredXp) {
      currentLevel = level;
    } else {
      break;
    }
  }

  return currentLevel;
}

module.exports = { getUserVIPLevel };
