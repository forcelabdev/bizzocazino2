const fs = require("fs");
const path = require("path");
const SiteSettings = require("../database/models/SiteSettings");

// Cache for fallback avatar to avoid repeated DB queries
let fallbackAvatarCache = null;
let fallbackAvatarCacheTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Get the fallback avatar from SiteSettings with caching
 * @returns {Promise<string>} Fallback avatar path
 */
const getFallbackAvatar = async () => {
	const now = Date.now();

	// Return cached value if still valid
	if (fallbackAvatarCache && now - fallbackAvatarCacheTime < CACHE_TTL) {
		return fallbackAvatarCache;
	}

	try {
		const settings = await SiteSettings.findOne()
			.select("avatars.fallbackAvatar")
			.lean();
		fallbackAvatarCache =
			settings?.avatars?.fallbackAvatar || "/uploads/avatars/default.png";
		fallbackAvatarCacheTime = now;

		// Update User model cache as well
		try {
			const User = require("../database/models/User");
			if (User.updateFallbackCache) {
				User.updateFallbackCache(fallbackAvatarCache);
			}
		} catch (e) {
			// Ignore circular dependency errors during startup
		}

		return fallbackAvatarCache;
	} catch (error) {
		console.error("Fallback avatar alınırken hata:", error);
		return "/uploads/avatars/default.png";
	}
};

/**
 * Clear the fallback avatar cache (call this when fallback is updated)
 */
const clearFallbackAvatarCache = () => {
	fallbackAvatarCache = null;
	fallbackAvatarCacheTime = 0;

	// Also clear User model cache
	try {
		const User = require("../database/models/User");
		if (User.updateFallbackCache) {
			User.updateFallbackCache(null);
		}
	} catch (e) {
		// Ignore
	}
};

/**
 * Check if an avatar path is valid (exists on disk or is a valid URL)
 * @param {string} avatarPath - The avatar path to check
 * @returns {boolean} Whether the avatar is valid
 */
const isAvatarValid = (avatarPath) => {
	if (!avatarPath) return false;

	// If it's an external URL, assume it's valid (we can't easily check)
	if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
		return true;
	}

	// For local paths, check if file exists
	try {
		// Remove leading slash and construct full path
		const relativePath = avatarPath.replace(/^\//, "");
		const fullPath = path.join(__dirname, "..", relativePath);
		return fs.existsSync(fullPath);
	} catch {
		return false;
	}
};

/**
 * Get a valid avatar path, returning fallback if the original is invalid
 * @param {string} avatarPath - The original avatar path
 * @param {string} fallback - Optional fallback to use instead of fetching from DB
 * @returns {Promise<string>} Valid avatar path
 */
const getValidAvatar = async (avatarPath, fallback = null) => {
	// If avatar is valid, return it
	if (isAvatarValid(avatarPath)) {
		return avatarPath;
	}

	// Return fallback
	return fallback || (await getFallbackAvatar());
};

/**
 * Get a valid avatar path synchronously (uses cached fallback)
 * @param {string} avatarPath - The original avatar path
 * @returns {string} Valid avatar path
 */
const getValidAvatarSync = (avatarPath) => {
	// If avatar is valid, return it
	if (isAvatarValid(avatarPath)) {
		return avatarPath;
	}

	// Return cached fallback or default
	return fallbackAvatarCache || "/uploads/avatars/default.png";
};

/**
 * Process a user object to ensure valid avatar
 * @param {Object} user - User object (can be a mongoose document or plain object)
 * @param {string} fallback - Optional fallback avatar path
 * @returns {Promise<Object>} User object with valid avatar
 */
const processUserAvatar = async (user, fallback = null) => {
	if (!user) return user;

	const userObj = user.toObject ? user.toObject() : { ...user };
	userObj.avatar = await getValidAvatar(userObj.avatar, fallback);
	return userObj;
};

/**
 * Process multiple user objects to ensure valid avatars
 * @param {Array} users - Array of user objects
 * @param {string} fallback - Optional fallback avatar path
 * @returns {Promise<Array>} Array of user objects with valid avatars
 */
const processUsersAvatars = async (users, fallback = null) => {
	if (!users || !Array.isArray(users)) return users;

	// Get fallback once for all users
	const fb = fallback || (await getFallbackAvatar());

	return users.map((user) => {
		if (!user) return user;
		const userObj = user.toObject ? user.toObject() : { ...user };
		userObj.avatar = isAvatarValid(userObj.avatar) ? userObj.avatar : fb;
		return userObj;
	});
};

/**
 * Mongoose virtual or transform helper - adds avatar validation to schema
 * Usage in schema: userSchema.set('toJSON', { transform: avatarTransform });
 */
const avatarTransform = (doc, ret) => {
	if (ret.avatar && !isAvatarValid(ret.avatar)) {
		ret.avatar = fallbackAvatarCache || "/uploads/avatars/default.png";
	}
	return ret;
};

/**
 * Initialize the avatar helper (preload fallback cache)
 */
const initAvatarHelper = async () => {
	try {
		await getFallbackAvatar();
		console.log(
			"✅ Avatar helper initialized, fallback:",
			fallbackAvatarCache
		);
	} catch (error) {
		console.error("❌ Avatar helper initialization error:", error);
	}
};

module.exports = {
	getFallbackAvatar,
	clearFallbackAvatarCache,
	isAvatarValid,
	getValidAvatar,
	getValidAvatarSync,
	processUserAvatar,
	processUsersAvatars,
	avatarTransform,
	initAvatarHelper,
};
