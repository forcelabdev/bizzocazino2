const User = require("../database/models/User");

/**
 * Affiliate/referral kodları bazı akışlarda kullanıcı tarafından elle
 * girildiği için (redeemedCode), partnerin kendi kayıtlı kodundan
 * (affiliates.code) farklı büyük/küçük harf ile saklanabilir. Tüm
 * karşılaştırmalar bu normalize edilmiş (trim + uppercase) değer üzerinden
 * yapılmalıdır.
 */
const normalizeCode = (code) => String(code || "").trim().toUpperCase();

/**
 * Şu anda bir affiliate kodu atanmış olan tüm kullanıcılardan, kod ->
 * { code, username } eşlemesini (case-insensitive key ile) üretir.
 */
const buildPartnerCodeMap = async () => {
	const partnerDocs = await User.find({
		"affiliates.code": { $exists: true, $ne: null },
	})
		.select("username affiliates.code")
		.lean();

	const map = new Map();
	for (const u of partnerDocs) {
		if (!u.username || !u.affiliates?.code) continue;
		const key = normalizeCode(u.affiliates.code);
		if (key) map.set(key, { code: u.affiliates.code, username: u.username });
	}
	return map;
};

/**
 * CRM raporu "Partner" filtre listesi için: hem şu an bir partnere ait olan
 * kodları hem de üyeler tarafından kullanılmış ama artık hiçbir partnere
 * bağlı olmayan ("yetim") redeemedCode değerlerini birleştirip, TEK bir
 * case-insensitive, distinct liste olarak döner. Böylece partner hesabı
 * silinmiş/kod değişmiş olsa dahi o kodu kullanan üyeler filtrelenebilir.
 */
const listRedeemedAffiliateCodes = async () => {
	const [partnerMap, redeemedCodeDocs] = await Promise.all([
		buildPartnerCodeMap(),
		User.aggregate([
			{
				$match: {
					"affiliates.redeemedCode": { $exists: true, $ne: null, $nin: [""] },
				},
			},
			{ $group: { _id: "$affiliates.redeemedCode" } },
		]),
	]);

	const byKey = new Map();

	for (const [key, partner] of partnerMap.entries()) {
		byKey.set(key, {
			code: partner.code,
			username: partner.username,
			title: `${partner.username} (${partner.code})`,
		});
	}

	for (const doc of redeemedCodeDocs) {
		const rawCode = doc._id;
		if (!rawCode) continue;
		const key = normalizeCode(rawCode);
		if (byKey.has(key)) continue;
		// Yetim kod: şu an hiçbir partnere ait değil, olduğu gibi listelenir.
		byKey.set(key, { code: rawCode, username: null, title: rawCode });
	}

	return [...byKey.values()].sort((a, b) => a.title.localeCompare(b.title));
};

module.exports = {
	normalizeCode,
	buildPartnerCodeMap,
	listRedeemedAffiliateCodes,
};
