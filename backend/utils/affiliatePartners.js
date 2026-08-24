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
 * CRM raporu "Partner" filtre listesi için: sadece en az bir üye tarafından
 * gerçekten kullanılmış (affiliates.redeemedCode) kodları döner. Hiç kimse
 * tarafından kullanılmamış olsa dahi bir partnere ait olan kodlar (sadece
 * affiliates.code'da bulunanlar) listeye dahil edilmez — filtre bu şekilde
 * yalnızca gerçekten üye getirmiş partnerleri gösterir. Kod hâlâ bir
 * partnere ait ise başlıkta partnerin kullanıcı adı da gösterilir; partner
 * hesabı silinmiş/kod değişmişse ("yetim" kod) kodun kendisi gösterilir.
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

	for (const doc of redeemedCodeDocs) {
		const rawCode = doc._id;
		if (!rawCode) continue;
		const key = normalizeCode(rawCode);
		if (byKey.has(key)) continue;

		const partner = partnerMap.get(key);
		byKey.set(key, {
			code: partner?.code || rawCode,
			username: partner?.username || null,
			title: partner ? `${partner.username} (${partner.code})` : rawCode,
		});
	}

	return [...byKey.values()].sort((a, b) => a.title.localeCompare(b.title));
};

module.exports = {
	normalizeCode,
	buildPartnerCodeMap,
	listRedeemedAffiliateCodes,
};
