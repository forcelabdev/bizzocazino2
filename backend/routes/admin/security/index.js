const express = require("express");
const router = express.Router();

const User = require("../../../database/models/User");
const AdminActionLog = require("../../../database/models/AdminActionLog");
const UserActionLog = require("../../../database/models/UserActionLog");
const { checkPermission } = require("../../../middleware/permission");

const MIN_COLLISION_MEMBERS = 2;

/**
 * GET /admin/security/ip-collisions
 *
 * Aynı IP adresini kullanan 2 veya daha fazla farklı (admin olmayan) üyeyi
 * tespit eder. `User.ips[]` her login/register'da zaten dolduruluyor
 * (bkz. authSessionService.finalizeUserLoginSession) — burada sadece bu
 * veriyi IP bazında gruplayıp çakışmaları ortaya çıkarıyoruz.
 *
 * Not: bir IP çakışması tek başına hile kanıtı değildir (paylaşımlı Wi-Fi,
 * ofis/kafe ağı, mobil operatör NAT'i gibi meşru senaryolar da aynı IP'yi
 * üretebilir) — bu nedenle sonuçlar "incelenmesi gerekiyor" niteliğindedir,
 * otomatik bir kısıtlama tetiklenmez.
 */
router.get("/ip-collisions", checkPermission("security.read"), async (req, res) => {
	try {
		const { page = 1, limit = 20, search = "" } = req.query;
		const pageNumber = Math.max(1, Number(page) || 1);
		const limitNumber = Math.max(1, Number(limit) || 20);
		const trimmedSearch = String(search || "").trim();

		const matchStage = { rank: { $ne: "admin" }, ips: { $exists: true, $ne: [] } };

		const basePipeline = [
			{ $match: matchStage },
			{ $unwind: "$ips" },
			{
				$group: {
					_id: "$ips.address",
					userIds: { $addToSet: "$_id" },
					lastSeenAt: { $max: "$ips.createdAt" },
				},
			},
			{
				$addFields: { memberCount: { $size: "$userIds" } },
			},
			{ $match: { memberCount: { $gte: MIN_COLLISION_MEMBERS } } },
			...(trimmedSearch ? [{ $match: { _id: { $regex: trimmedSearch, $options: "i" } } }] : []),
			{ $sort: { memberCount: -1, lastSeenAt: -1 } },
		];

		const [countResult, groups] = await Promise.all([
			User.aggregate([...basePipeline, { $count: "total" }]),
			User.aggregate([
				...basePipeline,
				{ $skip: (pageNumber - 1) * limitNumber },
				{ $limit: limitNumber },
			]),
		]);

		const total = countResult[0]?.total || 0;

		const allUserIds = groups.flatMap((group) => group.userIds);
		const members = await User.find({ _id: { $in: allUserIds } })
			.select("numericId username local.email phone rank wallets currency ban createdAt")
			.lean();
		const membersById = new Map(members.map((member) => [String(member._id), member]));

		const data = groups.map((group) => ({
			ip: group._id,
			memberCount: group.memberCount,
			lastSeenAt: group.lastSeenAt,
			members: group.userIds
				.map((id) => membersById.get(String(id)))
				.filter(Boolean)
				.map((member) => ({
					id: member._id,
					numericId: member.numericId,
					username: member.username,
					email: member.local?.email || "",
					phone: member.phone || "",
					rank: member.rank,
					balance: member.wallets?.find(
						(w) => w.coinType === member.currency?.coinType && w.chain === member.currency?.chain
					)?.balance ?? member.wallets?.[0]?.balance ?? 0,
					isBanned: Boolean(member.ban?.expire && new Date(member.ban.expire) > new Date()),
					createdAt: member.createdAt,
				})),
		}));

		res.json({
			success: true,
			data,
			pagination: {
				page: pageNumber,
				limit: limitNumber,
				total,
				totalPages: Math.ceil(total / limitNumber) || 1,
			},
		});
	} catch (err) {
		console.error("ip-collisions hata:", err);
		res.status(500).json({ success: false, message: "IP çakışmaları alınırken bir hata oluştu." });
	}
});

/**
 * GET /admin/security/system-logs
 *
 * Admin paneli üzerinden yapılan TÜM durum değiştiren istekleri
 * (AdminActionLog) filtrelenebilir/sayfalanabilir şekilde döner.
 * `blocked=true` filtresi, geçerli bir admin token'ıyla ama panel dışından
 * (Postman/fetch/script) gelip reddedilen istekleri ayrıca gösterir.
 */
router.get("/system-logs", checkPermission("security.read"), async (req, res) => {
	try {
		const {
			page = 1,
			limit = 30,
			actor = "",
			method = "",
			resource = "",
			blocked,
			severity = "",
			dateFrom,
			dateTo,
		} = req.query;

		const pageNumber = Math.max(1, Number(page) || 1);
		const limitNumber = Math.max(1, Number(limit) || 30);

		const query = {};
		if (method) query.method = String(method).toUpperCase();
		if (resource) query.resource = { $regex: String(resource), $options: "i" };
		if (blocked === "true") query.blocked = true;
		if (blocked === "false") query.blocked = false;
		if (severity === "critical") query.severity = "critical";

		if (actor) {
			const regex = { $regex: String(actor), $options: "i" };
			query.$or = [
				{ "actorSnapshot.username": regex },
				{ "actorSnapshot.email": regex },
			];
		}

		if (dateFrom || dateTo) {
			query.createdAt = {};
			if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
			if (dateTo) query.createdAt.$lte = new Date(dateTo);
		}

		const [total, logs] = await Promise.all([
			AdminActionLog.countDocuments(query),
			AdminActionLog.find(query)
				.sort({ createdAt: -1 })
				.skip((pageNumber - 1) * limitNumber)
				.limit(limitNumber)
				.lean(),
		]);

		res.json({
			success: true,
			data: logs,
			pagination: {
				page: pageNumber,
				limit: limitNumber,
				total,
				totalPages: Math.ceil(total / limitNumber) || 1,
			},
		});
	} catch (err) {
		console.error("system-logs hata:", err);
		res.status(500).json({ success: false, message: "Sistem logları alınırken bir hata oluştu." });
	}
});

/**
 * GET /admin/security/activity-logs
 *
 * Oyuncu aktivite logu (UserActionLog) — kullanıcı/aksiyon/tarih
 * filtreleriyle. `login` kayıtlarında `metadata.ip` / `metadata.userAgent`
 * bulunur (bkz. authSessionService.finalizeUserLoginSession), böylece bu
 * ekrandan doğrudan bir üyenin login IP geçmişi izlenebilir.
 */
router.get("/activity-logs", checkPermission("security.read"), async (req, res) => {
	try {
		const {
			page = 1,
			limit = 30,
			userId = "",
			search = "",
			actionType = "",
			dateFrom,
			dateTo,
		} = req.query;

		const pageNumber = Math.max(1, Number(page) || 1);
		const limitNumber = Math.max(1, Number(limit) || 30);

		const query = {};
		if (actionType) query.actionType = actionType;
		if (userId) query.userId = userId;

		if (dateFrom || dateTo) {
			query.timestamp = {};
			if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
			if (dateTo) query.timestamp.$lte = new Date(dateTo);
		}

		const trimmedSearch = String(search || "").trim();
		if (trimmedSearch && !userId) {
			const regex = { $regex: trimmedSearch, $options: "i" };
			const matchingUsers = await User.find({
				$or: [{ username: regex }, { "local.email": regex }, { phone: regex }],
			})
				.select("_id")
				.lean();
			query.userId = { $in: matchingUsers.map((u) => u._id) };
		}

		const [total, logs] = await Promise.all([
			UserActionLog.countDocuments(query),
			UserActionLog.find(query)
				.sort({ timestamp: -1 })
				.skip((pageNumber - 1) * limitNumber)
				.limit(limitNumber)
				.populate("userId", "numericId username local.email phone")
				.lean(),
		]);

		res.json({
			success: true,
			data: logs,
			pagination: {
				page: pageNumber,
				limit: limitNumber,
				total,
				totalPages: Math.ceil(total / limitNumber) || 1,
			},
		});
	} catch (err) {
		console.error("activity-logs hata:", err);
		res.status(500).json({ success: false, message: "Aktivite logları alınırken bir hata oluştu." });
	}
});

module.exports = router;
