const jwt = require("jsonwebtoken");
const User = require("../database/models/User");
const AdminRole = require("../database/models/AdminRole");
const {
	isActiveUserSuspension,
	sendUserSuspensionResponse,
} = require("../utils/userSuspension");

const parsePermissionCode = (permission) => {
	const parts = String(permission || "")
		.split(".")
		.filter(Boolean);

	if (parts.length <= 1) {
		return {
			resource: parts[0] || "",
			action: null,
		};
	}

	const action = parts.pop();

	return {
		resource: parts.join("."),
		action,
	};
};

const getManageCandidates = (resource) => {
	const parts = String(resource || "")
		.split(".")
		.filter(Boolean);
	const candidates = [];

	for (let i = parts.length; i >= 1; i--) {
		candidates.push(`${parts.slice(0, i).join(".")}.manage`);
	}

	return [...new Set(candidates)];
};

const hasPermissionCode = (userPermissions, permission) => {
	if (!permission) return true;
	if (userPermissions.includes("*") || userPermissions.includes(permission)) {
		return true;
	}

	const { resource } = parsePermissionCode(permission);

	return getManageCandidates(resource).some((candidate) =>
		userPermissions.includes(candidate),
	);
};

/**
 * Permission Middleware
 *
 * Admin paneli için yetkilendirme kontrolü sağlar.
 * Route'lara hangi permission'ların gerekli olduğunu belirtebilirsiniz.
 *
 * Kullanım:
 * router.get("/users", checkPermission("users.read"), (req, res) => {...})
 * router.post("/users", checkPermission("users.create"), (req, res) => {...})
 * router.get("/users", checkPermission(["users.read", "users.manage"]), (req, res) => {...}) // OR logic
 */

/**
 * Admin JWT doğrulama ve kullanıcı bilgilerini yükleme
 */
const authenticateAdmin = async (req, res, next) => {
	try {
		// Authorization header'dan token al
		const authHeader = req.headers.authorization;
		let token = null;

		if (authHeader && authHeader.startsWith("Bearer ")) {
			token = authHeader.substring(7);
		} else {
			// Fallback: x-auth-token header
			token = req.header("x-auth-token");
		}

		if (!token) {
			return res.status(401).json({
				success: false,
				message: "Yetkilendirme gerekli. Token bulunamadı.",
			});
		}

		// Token'ı doğrula
		const decoded = jwt.verify(
			token,
			process.env.TOKEN_SECRET || process.env.JWT_SECRET
		);

		// Kullanıcıyı bul ve adminRole'ü populate et
		const user = await User.findById(decoded._id || decoded.id)
			.select("_id username local.email rank adminRole ban")
			.populate({
				path: "adminRole",
				populate: {
					path: "permissions",
					select: "code resource action",
				},
			});

		if (!user) {
			return res.status(401).json({
				success: false,
				message: "Kullanıcı bulunamadı.",
			});
		}

		// Admin değilse reddet
		if (user.rank !== "admin") {
			return res.status(403).json({
				success: false,
				message: "Bu alana erişim yetkiniz yok.",
			});
		}

		if (isActiveUserSuspension(user)) {
			return sendUserSuspensionResponse(res);
		}

		// Kullanıcı bilgilerini request'e ekle
		// adminRole atanmamış (legacy) adminler tüm yetkilere sahip kabul edilir.
		req.adminUser = user;
		const hasAdminRole = Boolean(user.adminRole && user.adminRole._id);
		req.isSuperAdmin = hasAdminRole
			? user.adminRole.isSuperAdmin || false
			: true; // Legacy admins treated as superadmin
		req.userPermissions = extractPermissions(user, !hasAdminRole);

		next();
	} catch (err) {
		console.error("Admin auth error:", err);

		if (err.name === "JsonWebTokenError") {
			return res.status(401).json({
				success: false,
				message: "Geçersiz token.",
			});
		}

		if (err.name === "TokenExpiredError") {
			return res.status(401).json({
				success: false,
				message: "Token süresi dolmuş.",
			});
		}

		return res.status(500).json({
			success: false,
			message: "Yetkilendirme hatası.",
		});
	}
};

/**
 * Kullanıcının permission'larını çıkar
 * @param {Object} user - Kullanıcı objesi
 * @param {boolean} isLegacyAdmin - AdminRole atanmamış eski admin mi?
 */
const extractPermissions = (user, isLegacyAdmin = false) => {
	// Legacy admin kullanıcıları (adminRole atanmamış) tüm yetkilere sahip
	if (isLegacyAdmin) {
		return ["*"];
	}

	if (!user.adminRole) {
		return [];
	}

	if (user.adminRole.isSuperAdmin) {
		return ["*"]; // Süper admin tüm yetkilere sahip
	}

	if (!user.adminRole.permissions) {
		return [];
	}

	return user.adminRole.permissions.map((p) => p.code);
};

/**
 * Permission kontrolü yapan middleware
 * @param {string|string[]} requiredPermissions - Gerekli permission(lar)
 * @param {Object} options - Ek seçenekler
 * @param {boolean} options.requireAll - Tüm permission'lar gerekli mi? (default: false = OR)
 */
const checkPermission = (requiredPermissions, options = {}) => {
	const { requireAll = false } = options;

	return async (req, res, next) => {
		try {
			// authenticateAdmin middleware'i çalıştırılmamışsa önce onu çalıştır
			if (!req.adminUser) {
				return authenticateAdmin(req, res, () => {
					checkPermissionLogic(
						req,
						res,
						next,
						requiredPermissions,
						requireAll
					);
				});
			}

			checkPermissionLogic(
				req,
				res,
				next,
				requiredPermissions,
				requireAll
			);
		} catch (err) {
			console.error("Permission check error:", err);
			return res.status(500).json({
				success: false,
				message: "Yetki kontrolü sırasında hata oluştu.",
			});
		}
	};
};

/**
 * Permission kontrol mantığı
 */
const checkPermissionLogic = (
	req,
	res,
	next,
	requiredPermissions,
	requireAll
) => {
	// Süper admin her şeye erişebilir
	if (req.isSuperAdmin || req.userPermissions.includes("*")) {
		return next();
	}

	// Permission yoksa devam et (bazı route'lar sadece admin olması yeterli)
	if (!requiredPermissions) {
		return next();
	}

	// String ise array'e çevir
	const permissions = Array.isArray(requiredPermissions)
		? requiredPermissions
		: [requiredPermissions];

	const hasPermission = permissions.some((required) =>
		hasPermissionCode(req.userPermissions, required),
	);

	if (requireAll) {
		// Tüm permission'lar gerekli
		const allPermissions = permissions.every((required) =>
			hasPermissionCode(req.userPermissions, required),
		);

		if (!allPermissions) {
			return res.status(403).json({
				success: false,
				message: "Bu işlem için yetkiniz yok.",
				requiredPermissions: permissions,
			});
		}
	} else {
		// En az bir permission yeterli (OR)
		if (!hasPermission) {
			return res.status(403).json({
				success: false,
				message: "Bu işlem için yetkiniz yok.",
				requiredPermissions: permissions,
			});
		}
	}

	next();
};

/**
 * Sadece süper admin erişimi için middleware
 */
const requireSuperAdmin = async (req, res, next) => {
	try {
		if (!req.adminUser) {
			return authenticateAdmin(req, res, () => {
				if (!req.isSuperAdmin) {
					return res.status(403).json({
						success: false,
						message:
							"Bu işlem sadece süper admin tarafından yapılabilir.",
					});
				}
				next();
			});
		}

		if (!req.isSuperAdmin) {
			return res.status(403).json({
				success: false,
				message: "Bu işlem sadece süper admin tarafından yapılabilir.",
			});
		}

		next();
	} catch (err) {
		console.error("Super admin check error:", err);
		return res.status(500).json({
			success: false,
			message: "Yetki kontrolü sırasında hata oluştu.",
		});
	}
};

/**
 * Kullanıcının belirli bir permission'a sahip olup olmadığını kontrol et
 * Route handler içinde kullanmak için
 */
const hasPermission = (req, permission) => {
	if (req.isSuperAdmin || req.userPermissions.includes("*")) {
		return true;
	}

	return hasPermissionCode(req.userPermissions, permission);
};

module.exports = {
	authenticateAdmin,
	checkPermission,
	requireSuperAdmin,
	hasPermission,
	extractPermissions,
};
