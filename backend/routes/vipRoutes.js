const express = require("express");
const router = express.Router();
const User = require("../database/models/User");
const Vip = require("../database/models/Vip");
const BonusHistory = require("../database/models/BonusHistory");
const Setting = require("../database/models/Setting");
const { getUserVIPLevel } = require("../utils/vipUtils");
const { authorizeUser } = require("../middleware/auth");
const { updateUserBalance, emitUserBalance } = require("../utils/wallet");
const moment = require("moment");

// 🔹 Fiat çevirici
async function convertAmount(amount, fromCurrency, toCurrency) {
	const settings = await Setting.findOne().select("exchangeRates").lean();
	if (!settings || !settings.exchangeRates) return amount;

	const rates = settings.exchangeRates;
	const fromRate = rates[fromCurrency] || 1;
	const toRate = rates[toCurrency] || 1;

	const amountInUSD = amount / fromRate; // normalize to USD
	return amountInUSD * toRate;
}

// Kullanıcının mevcut VIP seviyesini getir
router.get("/current-level", authorizeUser(true), async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		const vipLevel = await getUserVIPLevel(user);
		return res.json({ success: true, vipLevel });
	} catch (err) {
		console.error(err);
		return res
			.status(500)
			.json({ success: false, error: { message: "Sunucu hatası" } });
	}
});

// VIP ödül talep etme
router.post("/claim-reward", authorizeUser(true), async (req, res) => {
	try {
		const userId = req.user._id;
		const { type } = req.body;

		console.log("🎯 Claim Reward çağrıldı:", { userId, type });

		const user = await User.findById(userId);
		const vipLevel = await getUserVIPLevel(user);

		if (!vipLevel || !vipLevel[type]) {
			return res.status(400).json({
				success: false,
				message: "Ödül tipi geçersiz veya tanımlı değil.",
			});
		}

		const lastClaim = await BonusHistory.findOne({ userId, type }).sort({
			claimedAt: -1,
		});
		const now = new Date();

		let eligible = false;
		if (type === "upgradeReward") {
			eligible = !lastClaim || lastClaim.level !== vipLevel.level;
		} else if (type === "dailyVipReward") {
			eligible =
				!lastClaim || now - lastClaim.claimedAt > 24 * 60 * 60 * 1000;
		} else if (type === "weeklyVipReward") {
			const isThursday20 = now.getDay() === 4 && now.getHours() >= 20;
			const oneWeekAgo = new Date(
				now.getTime() - 7 * 24 * 60 * 60 * 1000
			);
			eligible =
				isThursday20 &&
				(!lastClaim || lastClaim.claimedAt < oneWeekAgo);
		} else if (type === "vipDayReward") {
			const vipDay = vipLevel.vipDay.toLowerCase();
			const currentDay = now
				.toLocaleString("en-US", { weekday: "long" })
				.toLowerCase();
			const isVipDay = currentDay === vipDay && now.getHours() >= 20;
			const oneWeekAgo = new Date(
				now.getTime() - 7 * 24 * 60 * 60 * 1000
			);
			eligible =
				isVipDay && (!lastClaim || lastClaim.claimedAt < oneWeekAgo);
		}

		if (!eligible) {
			console.log("❌ Eligible değil.");
			return res.status(400).json({
				success: false,
				message: "Bu ödülü şu anda alamazsınız.",
			});
		}

		// 🔹 Ödül USD → Kullanıcının fiatCurrency’sine dönüştürülüyor
		const userFiat = user.currency?.fiatCurrency || "USD";
		const rewardUSD = vipLevel[type];
		const rewardAmount = await convertAmount(rewardUSD, "USD", userFiat);

		// 🔹 Aktif cüzdan bul → fiat ekle
		const walletIndex = user.wallets.findIndex(
			(w) =>
				w.coinType.toUpperCase() ===
					user.currency.coinType.toUpperCase() &&
				w.chain.toUpperCase() === user.currency.chain.toUpperCase() &&
				w.type.toLowerCase() === user.currency.type.toLowerCase()
		);
		if (walletIndex === -1) {
			return res
				.status(400)
				.json({ success: false, message: "Aktif cüzdan bulunamadı." });
		}

		const newBalance = await updateUserBalance(user, rewardAmount, {
			emitSocket: true,
		});

		await BonusHistory.create({
			userId,
			type,
			amount: rewardAmount,
			level: vipLevel.level,
			claimedAt: now,
			details: { vipName: vipLevel.levelName },
		});

		req.app.get("io").to(userId.toString()).emit("vip:rewardClaimed", {
			type,
			amount: rewardAmount,
			newBalance: newBalance,
			currency: userFiat,
		});

		console.log("✅ Ödül başarıyla alındı:", { type, rewardAmount });

		return res.json({
			success: true,
			amount: rewardAmount,
			newBalance: newBalance,
		});
	} catch (err) {
		console.error("🚨 VIP ödülü alınamadı:", err);
		return res
			.status(500)
			.json({ success: false, message: "Sunucu hatası" });
	}
});

// VIP seviyesi detaylarını getir
router.get("/user-level/:userId", async (req, res) => {
	try {
		const userId = req.params.userId;
		const [user, levels] = await Promise.all([
			User.findById(userId),
			Vip.find({}).sort({ level: 1 }),
		]);

		const currentLevel = await getUserVIPLevel(user);
		if (!currentLevel) {
			return res.status(404).json({
				success: false,
				error: { message: "VIP seviyeleri henüz tanımlanmamış" },
			});
		}
		const nextLevel = levels.find(
			(l) => l.level === currentLevel.level + 1
		);

		// 🔹 Doğru yerden XP alıyoruz
		const userXp = user.xp || 0;

		let xpProgress = 100;
		if (nextLevel && nextLevel.requiredXp) {
			xpProgress = ((userXp / nextLevel.requiredXp) * 100).toFixed(2);
		}

		return res.json({
			success: true,
			currentLevel,
			nextLevel: nextLevel || null,
			levels: levels.map((l) => ({
				level: l.level,
				requiredXp: l.requiredXp || 0,
			})),
			userVip: currentLevel,
			userStats: {
				bet: user.stats.bet,
				deposit: user.stats.deposit,
				fiatCurrency: user.currency.fiatCurrency,
			},
			xp: userXp, // 🔹 xp’yi ayrı veriyoruz
			xpProgress,
		});
	} catch (err) {
		console.error(err);
		return res
			.status(500)
			.json({ success: false, error: { message: "Sunucu hatası" } });
	}
});

// VIP seviyelerini getir
router.get("/levels", async (req, res) => {
	try {
		const levels = await Vip.find({}).sort({ level: 1 });
		res.json({ success: true, levels });
	} catch (err) {
		console.error(err);
		res.status(500).json({
			success: false,
			error: { message: "Sunucu hatası" },
		});
	}
});

// Yardımcı fonksiyonlar
const getLastBonus = async (userId, type) => {
	return await BonusHistory.findOne({ userId, type }).sort({ createdAt: -1 });
};

const vipDayMap = {
	Monday: 1,
	Tuesday: 2,
	Wednesday: 3,
	Thursday: 4,
	Friday: 5,
	Saturday: 6,
	Sunday: 0,
};

// VIP ödül durumlarını getir
router.get("/rewards/:id", async (req, res) => {
	try {
		const userId = req.params.id;
		const user = await User.findById(userId);
		if (!user)
			return res.status(404).json({
				success: false,
				error: { message: "Kullanıcı bulunamadı" },
			});

		const vipLevel = await getUserVIPLevel(user);
		if (!vipLevel) {
			return res.status(404).json({
				success: false,
				error: { message: "VIP seviyeleri henüz tanımlanmamış" },
			});
		}
		const now = moment();

		const upgradeLog = await BonusHistory.findOne({
			userId,
			type: "upgradeReward",
			level: vipLevel.level,
		});
		const upgradeRewardAvailable = !upgradeLog;

		const dailyLog = await getLastBonus(userId, "dailyVipReward");
		const lastDaily = dailyLog?.claimedAt
			? moment(dailyLog.claimedAt)
			: null;
		const dailyAvailable = !lastDaily || now.diff(lastDaily, "hours") >= 24;
		const dailyNext = dailyAvailable
			? null
			: lastDaily.clone().add(24, "hours").toISOString();

		const weeklyLog = await getLastBonus(userId, "weeklyVipReward");
		const lastWeekly = weeklyLog?.createdAt
			? moment(weeklyLog.createdAt)
			: null;
		const thisWeekThursday20 = moment().day(4).hour(20).minute(0).second(0);
		if (now.isAfter(thisWeekThursday20.clone().add(1, "day")))
			thisWeekThursday20.add(7, "days");
		const weeklyAvailable =
			now.isSameOrAfter(thisWeekThursday20) &&
			(!lastWeekly || lastWeekly.isBefore(thisWeekThursday20));
		const weeklyNext = weeklyAvailable
			? null
			: thisWeekThursday20.toISOString();

		const vipDay = vipDayMap[vipLevel.vipDay];
		const vipDayTarget = moment().day(vipDay).hour(20).minute(0).second(0);
		if (now.isAfter(vipDayTarget.clone().add(1, "day")))
			vipDayTarget.add(7, "days");
		const vipLog = await getLastBonus(userId, "vipDayReward");
		const lastVip = vipLog?.createdAt ? moment(vipLog.createdAt) : null;
		const vipAvailable =
			now.isSameOrAfter(vipDayTarget) &&
			(!lastVip || lastVip.isBefore(vipDayTarget));
		const vipNext = vipAvailable ? null : vipDayTarget.toISOString();

		return res.json({
			success: true,
			rewards: {
				upgradeReward: {
					available: upgradeRewardAvailable,
					nextAvailable: null,
				},
				dailyVipReward: {
					available: dailyAvailable,
					nextAvailable: dailyNext,
				},
				weeklyVipReward: {
					available: weeklyAvailable,
					nextAvailable: weeklyNext,
				},
				vipDayReward: {
					available: vipAvailable,
					nextAvailable: vipNext,
				},
			},
		});
	} catch (err) {
		console.error(err);
		return res
			.status(500)
			.json({ success: false, error: { message: "Sunucu hatası" } });
	}
});

module.exports = router;
