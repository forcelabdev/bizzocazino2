const jwt = require("jsonwebtoken");

// Load database models
const User = require("../database/models/User");
const {
	isActiveUserSuspension,
	sendUserSuspensionResponse,
} = require("../utils/userSuspension");

const authorizeUser = (strict) => {
	return async (req, res, next) => {
		// Get token from header - support both x-auth-token and Authorization: Bearer
		let token = req.header("x-auth-token");
		
		// If x-auth-token not present, try Authorization header
		if (!token) {
			const authHeader = req.header("Authorization");
			if (authHeader && authHeader.startsWith("Bearer ")) {
				token = authHeader.substring(7); // Remove "Bearer " prefix
			}
		}

		// Check for token
		if (typeof token !== "string" && strict === false) {
			req.user = null;
			return next();
		} else if (typeof token !== "string") {
			return res.status(401).json({success: false, message: "Authorization denied."});
		}

		// Verify token
		try {
			const data = await jwt.verify(token, process.env.TOKEN_SECRET);
			// JWT'de "id" veya "_id" olabilir - her ikisini de destekle
			const userId = data._id || data.id;
			if (!userId) throw new Error("Invalid token payload");
			
			const user = await User.findById(userId);
			if (!user) throw new Error("User not found");

			if (isActiveUserSuspension(user)) {
				return sendUserSuspensionResponse(res);
			}
			
			// req.user'a her zaman _id olarak ata (tutarlılık için)
			req.user = { ...data, _id: userId };
			next();
		} catch (err) {
			return res.status(401).json({success: false, error: {type: "error", message: "Authorization denied."}});
		}
	};
};

const authorizeAdmin = (req, res, next) => {
	try {
		if (req.user.rank !== "admin") {
			return res.status(403).json({success: false, message: "You are not authorized to access this route."});
		}
		next();
	} catch (err) {
		return res.status(403).json({success: false, error: {type: "error", message: "You are not authorized to access this route."}});
	}
};

module.exports = {
	authorizeUser,
	authorizeAdmin,
};
