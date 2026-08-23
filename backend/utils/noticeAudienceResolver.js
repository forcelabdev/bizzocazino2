const User = require("../database/models/User");
const { getUserApprovedFinanceTotals } = require("./userFinanceTotals");
const ioUtils = require("./io");

/**
 * Site İçi Mesaj (Notice) hedef kitle çözümleyicisi.
 *
 * `audience.type`:
 * - "all": Tüm kullanıcılar (recipients boş bırakılır, public API bunu "herkese açık" sayar).
 * - "online": O anki online kullanıcı seti (bkz. utils/io.js -> getOnlineUserIds).
 * - "offline": Online olmayan tüm kullanıcılar.
 * - "segment": `audience.conditions` (PromoCode.conditions ile aynı şema) TÜMÜNÜN (AND)
 *   karşılandığı kullanıcılar. deposit/withdraw metrikleri toplu (tüm kullanıcı tabanı
 *   için tek seferde) hesaplanır; membershipAgeDays doğrudan User.createdAt'tan okunur.
 *
 * @returns {Promise<{ recipients: import('mongoose').Types.ObjectId[] | null, matchedCount: number }>}
 *   recipients === null -> "all" (herkes), public API'de recipients kısıtlaması uygulanmaz.
 */
const resolveNoticeAudience = async (audience = {}) => {
	const type = audience?.type || "all";

	if (type === "all") {
		return { recipients: null, matchedCount: null };
	}

	if (type === "online" || type === "offline") {
		const onlineIds = new Set(ioUtils.getOnlineUserIds());
		// Socket bağlantısı login olmayan ziyaretçiler için socket.id kullanır,
		// bu yüzden sadece geçerli Mongo ObjectId formatındaki id'ler kullanıcı eşleşmesi sayılır.
		const isValidObjectId = (id) => /^[a-f0-9]{24}$/i.test(id);
		const onlineUserIds = Array.from(onlineIds).filter(isValidObjectId);

		if (type === "online") {
			const users = await User.find({ _id: { $in: onlineUserIds } }, "_id").lean();
			const recipients = users.map((u) => u._id);
			return { recipients, matchedCount: recipients.length };
		}

		// offline: online olmayan TÜM kullanıcılar
		const users = await User.find({ _id: { $nin: onlineUserIds } }, "_id").lean();
		const recipients = users.map((u) => u._id);
		return { recipients, matchedCount: recipients.length };
	}

	if (type === "segment") {
		const conditions = Array.isArray(audience.conditions) ? audience.conditions : [];
		if (!conditions.length) {
			return { recipients: [], matchedCount: 0 };
		}

		const allUsers = await User.find({}, "_id createdAt").lean();
		const allUserIds = allUsers.map((u) => u._id);

		// deposit/withdraw/depositSinceDate metriklerini kullanan koşullar için
		// tüm kullanıcı tabanının onaylı finans toplamlarını TEK seferde hesapla.
		// Not: getUserApprovedFinanceTotals tarih aralığı desteklemez (tüm zamanlar),
		// bu yüzden dateFrom/dateTo belirtilmiş koşullar için (tarih aralığı önemliyse)
		// kullanıcı bazında getUserApprovedFinanceTotalsInRange'e düşülür.
		const needsFinanceTotals = conditions.some((c) => ["deposit", "withdraw", "depositSinceDate"].includes(c.metric));
		const totalsByUser = needsFinanceTotals
			? await getUserApprovedFinanceTotals(allUserIds)
			: new Map();

		const { getUserApprovedFinanceTotalsInRange } = require("./userFinanceTotals");

		const matched = [];
		for (const user of allUsers) {
			let passedAll = true;
			for (const condition of conditions) {
				const { metric, operator, value, dateFrom, dateTo } = condition;
				let observed = 0;

				if (metric === "membershipAgeDays") {
					const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
					observed = Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
				} else if (metric === "deposit" || metric === "withdraw" || metric === "depositSinceDate") {
					if (dateFrom || dateTo) {
						// eslint-disable-next-line no-await-in-loop
						const totals = await getUserApprovedFinanceTotalsInRange(user._id, {
							from: dateFrom || null,
							to: dateTo || null,
						});
						observed = metric === "withdraw" ? totals.totalWithdrawal : totals.totalDeposit;
					} else {
						const totals = totalsByUser.get(user._id.toString()) || { totalDeposit: 0, totalWithdrawal: 0 };
						observed = metric === "withdraw" ? totals.totalWithdrawal : totals.totalDeposit;
					}
				}

				const target = Number(value);
				const compare = {
					gte: observed >= target,
					lte: observed <= target,
					eq: observed === target,
					gt: observed > target,
					lt: observed < target,
				};
				if (!compare[operator]) {
					passedAll = false;
					break;
				}
			}
			if (passedAll) matched.push(user._id);
		}

		return { recipients: matched, matchedCount: matched.length };
	}

	return { recipients: null, matchedCount: null };
};

module.exports = { resolveNoticeAudience };
