const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const validator = require("validator");
const User = require("../../database/models/User");
const Token = require("../../database/models/Token");
const bcrypt = require("bcryptjs");
const { authorizeUser } = require("../../middleware/auth");
const {
	rateLimiterStrictMiddleware,
} = require("../../middleware/rateLimiter");
const { sendTemplatedEmail } = require("../../utils/email");
const {
	applyValidatedMfaChallenge,
	buildChallengePayload,
	createMfaError,
	getOtpChallenge,
	getUserMfaSummary,
	issueOtp,
	normalizeMfaMethodType,
	resendOtp,
	validateOtp,
} = require("../../services/mfaService");
const { maskEmailAddress } = require("../../utils/mfa");
const { RIVO_WALLET } = require("../../utils/rivoWallet");

// Update user information (email and password)
// Update User Information

// ⚠️ GÜVENLİK: Sadece kendi profilini görebilir, hassas veriler gizlenir
router.get("/:id", authorizeUser(true), async (req, res) => {
	try {
		// Sadece kendi profilini görebilir
		if (req.user._id.toString() !== req.params.id) {
			return res.status(403).json({ success: false, message: "Yetkisiz erişim" });
		}

		const user = await User.findById(req.params.id)
			.select("-local.password -ips -adminRole")
			.lean();

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		res.status(200).json(user);
	} catch (error) {
		res.status(500).json({ message: "Error fetching user", error });
	}
});

// ⚠️ GÜVENLİK: Sadece kendi profilini güncelleyebilir, kritik alanlar korumalı
router.put("/:id", authorizeUser(true), async (req, res) => {
	try {
		// Sadece kendi profilini güncelleyebilir
		if (req.user._id.toString() !== req.params.id) {
			return res.status(403).json({ success: false, message: "Yetkisiz erişim" });
		}

		const currentUser = await User.findById(req.params.id).select("phone mfa local");
		if (!currentUser) {
			return res.status(404).json({ message: "User not found" });
		}

		const { password, mfa, ...userData } = req.body;

		if (mfa !== undefined) {
			return res.status(400).json({
				success: false,
				message: "MFA settings must be changed through MFA endpoints",
			});
		}

		// Yasaklı alanları filtrele - bu alanlar kullanıcı tarafından değiştirilemez
		const forbiddenFields = ['rank', 'adminRole', 'ips', 'wallets', 'balance', 'stats', 'xp', 'numericId', 'betAccess', '_id', 'affiliates', 'verifiedAt'];
		forbiddenFields.forEach(field => delete userData[field]);
		if (userData.local) {
			delete userData.local.emailVerified;
		}

		const requestedPhone =
			typeof userData.phone === "string" ? userData.phone.trim() : currentUser.phone;
		if (
			currentUser?.mfa?.enabled &&
			userData.phone !== undefined &&
			requestedPhone !== (currentUser.phone || "")
		) {
			return res.status(400).json({
				success: false,
				message: "Use MFA phone change verification flow to update your MFA phone",
				code: "MFA_PHONE_CHANGE_REQUIRES_OTP",
			});
		}

		if (password) {
			// Hash the new password before updating
			const salt = await bcrypt.genSalt(10);
			userData.local = userData.local || {};
			userData.local.password = await bcrypt.hash(password, salt);
		}

		const updatedUser = await User.findByIdAndUpdate(
			req.params.id,
			userData,
			{ new: true }
		).select("-local.password -ips -adminRole");

		if (!updatedUser) {
			return res.status(404).json({ message: "User not found" });
		}

		res.status(200).json({
			message: "User updated successfully",
			user: updatedUser,
		});
	} catch (error) {
		res.status(500).json({ message: "Error updating user", error });
	}
});

const resolveMfaPurposeScope = (purpose) => {
	const normalizedPurpose = String(purpose || "").trim().toLowerCase();

	switch (normalizedPurpose) {
		case "enable":
			return "enable";
		case "disable":
			return "disable";
		case "change-phone":
		case "change_phone":
		case "changephone":
			return "change-phone";
		default:
			throw createMfaError("Invalid MFA purpose", "INVALID_MFA_PURPOSE", 400);
	}
};

const assertUserMfaScope = (challenge) => {
	if (!["enable", "disable", "change-phone"].includes(challenge.scope)) {
		throw createMfaError(
			"OTP challenge scope is not valid for user MFA",
			"OTP_INVALID_SCOPE",
			400
		);
	}
};

router.post("/mfa/send-otp", authorizeUser(true), async (req, res) => {
	const requestId = crypto.randomUUID();
	const requestedPurpose = String(req.body?.purpose || "");
	const requestedMethodType = String(
		req.body?.methodType || req.body?.method || "sms"
	).toLowerCase();

	try {
		const scope = resolveMfaPurposeScope(req.body?.purpose);
		const user = await User.findById(req.user._id)
			.select("phone mfa local.email username name")
			.lean();

		if (!user) {
			return res.status(404).json({ success: false, message: "User not found" });
		}

		const mfaSummary = getUserMfaSummary(user);
		let methodType = normalizeMfaMethodType(
			req.body?.methodType || req.body?.method || "sms"
		);
		let destinationPhone = "";
		let destinationEmail = "";

		if (scope === "enable") {
			if (mfaSummary.enabled) {
				throw createMfaError(
					"MFA is already enabled",
					"MFA_ALREADY_ENABLED",
					400
				);
			}

			if (methodType === "email") {
				destinationEmail = user.local?.email;
			} else {
				destinationPhone = req.body?.phone || user.phone;
			}
		} else if (scope === "disable") {
			if (!mfaSummary.enabled) {
				throw createMfaError(
					"MFA is not enabled",
					"MFA_NOT_ENABLED",
					400
				);
			}

			methodType = mfaSummary.preferredMethodType || "sms";
			destinationPhone = mfaSummary.phone;
			destinationEmail = mfaSummary.email;
		} else {
			if (!mfaSummary.enabled) {
				throw createMfaError(
					"MFA is not enabled",
					"MFA_NOT_ENABLED",
					400
				);
			}

			methodType = "sms";
			destinationPhone = req.body?.phone;
			if (!destinationPhone) {
				throw createMfaError(
					"New phone is required",
					"MFA_PHONE_REQUIRED",
					400
				);
			}
		}

		const challenge = await issueOtp({
			user,
			scope,
			methodType,
			phone: destinationPhone,
			email: destinationEmail,
			metadata: {
				label: req.body?.label,
				requestId,
			},
		});

		console.info("[MFA send-otp] challenge sent", {
			requestId,
			userId: String(req.user?._id || ""),
			challengeId: String(challenge._id),
			scope,
			methodType,
			provider: challenge.provider?.name || null,
		});

		return res.status(200).json({
			success: true,
			...buildChallengePayload(challenge),
		});
	} catch (err) {
		console.error("[MFA send-otp] request failed", {
			requestId,
			userId: String(req.user?._id || ""),
			purpose: requestedPurpose,
			methodType: requestedMethodType,
			code: err.code || null,
			status: err.status || 500,
			message: err.message || "Unknown MFA error",
			stack: err.stack,
		});

		return res.status(err.status || 500).json({
			success: false,
			message: err.message,
			code: err.code,
			...(err.metadata ? { metadata: err.metadata } : {}),
		});
	}
});

router.post("/mfa/resend-otp", authorizeUser(true), async (req, res) => {
	try {
		const { challengeId } = req.body || {};
		const challenge = await getOtpChallenge({
			challengeId,
			userId: req.user._id,
		});
		assertUserMfaScope(challenge);

		const nextChallenge = await resendOtp({
			challengeId,
			userId: req.user._id,
		});

		return res.status(200).json({
			success: true,
			...buildChallengePayload(nextChallenge),
		});
	} catch (err) {
		return res.status(err.status || 500).json({
			success: false,
			message: err.message,
			code: err.code,
			...(err.metadata ? { metadata: err.metadata } : {}),
		});
	}
});

router.post("/mfa/validate-otp", authorizeUser(true), async (req, res) => {
	try {
		const { challengeId, code } = req.body || {};
		const challenge = await validateOtp({
			challengeId,
			code,
			userId: req.user._id,
		});
		assertUserMfaScope(challenge);

		const updatedUser = await applyValidatedMfaChallenge(challenge);

		return res.status(200).json({
			success: true,
			mfa: getUserMfaSummary(updatedUser),
		});
	} catch (err) {
		return res.status(err.status || 500).json({
			success: false,
			message: err.message,
			code: err.code,
			...(err.metadata ? { metadata: err.metadata } : {}),
		});
	}
});

router.post("/switch-wallet", [authorizeUser(true)], async (req, res) => {
	try {
		await User.findByIdAndUpdate(req.user._id, {
			"currency.coinType": RIVO_WALLET.coinType,
			"currency.type": RIVO_WALLET.type,
			"currency.chain": RIVO_WALLET.chain,
		});

		res.json({
			success: true,
			message: "Wallet başarıyla güncellendi.",
			data: RIVO_WALLET,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// ═══════════════════════════════════════════════════════════════════════════
// E-posta Değiştirme Akışı
// Kullanıcı yeni e-postaya doğrulama linki ister, linke tıklayınca e-posta
// değişir ve emailVerified=true olarak işaretlenir.
// ═══════════════════════════════════════════════════════════════════════════

const EMAIL_CHANGE_TOKEN_TYPE = "email-change";
const EMAIL_CHANGE_REQUEST_COOLDOWN_MS = 1000 * 60 * 5;

// @desc    Request e-mail change verification (link sent to NEW e-mail)
// @route   POST /users/email-change/request
// @access  Private
router.post(
	"/email-change/request",
	authorizeUser(true),
	rateLimiterStrictMiddleware,
	async (req, res) => {
		try {
			const { newEmail, password } = req.body || {};

			if (
				!newEmail ||
				typeof newEmail !== "string" ||
				!validator.isEmail(newEmail)
			) {
				return res.status(400).json({
					success: false,
					error: {
						type: "error",
						message: "Geçerli bir e-posta adresi girmelisiniz.",
					},
				});
			}

			if (!password || typeof password !== "string") {
				return res.status(400).json({
					success: false,
					error: {
						type: "error",
						message: "Mevcut şifrenizi girmelisiniz.",
					},
				});
			}

			const normalizedNewEmail = newEmail.trim().toLowerCase();

			const currentUser = await User.findById(req.user._id)
				.select("local username name")
				.lean();

			if (!currentUser || !currentUser.local) {
				return res.status(404).json({
					success: false,
					error: {
						type: "error",
						message: "Kullanıcı bulunamadı.",
					},
				});
			}

			if (
				currentUser.local.email &&
				currentUser.local.email.toLowerCase() === normalizedNewEmail
			) {
				return res.status(400).json({
					success: false,
					error: {
						type: "error",
						message:
							"Yeni e-posta adresi mevcut adresinizle aynı olamaz.",
					},
				});
			}

			const passwordOk = await bcrypt.compare(
				password.trim(),
				currentUser.local.password || ""
			);
			if (!passwordOk) {
				return res.status(401).json({
					success: false,
					error: {
						type: "error",
						message: "Şifreniz hatalı.",
					},
				});
			}

			// E-posta zaten başka bir kullanıcı tarafından kullanılıyor mu?
			const existing = await User.findOne({
				"local.email": normalizedNewEmail,
			})
				.select("_id")
				.lean();
			if (existing) {
				return res.status(409).json({
					success: false,
					error: {
						type: "error",
						message:
							"Bu e-posta adresi zaten başka bir hesap tarafından kullanılıyor.",
					},
				});
			}

			// Cooldown: son 5 dakika içinde aynı kullanıcı için talep var mı?
			const existingToken = await Token.findOne({
				type: EMAIL_CHANGE_TOKEN_TYPE,
				user: req.user._id,
			})
				.select("updatedAt")
				.lean();

			if (
				existingToken &&
				Date.now() -
					new Date(existingToken.updatedAt).getTime() <
					EMAIL_CHANGE_REQUEST_COOLDOWN_MS
			) {
				return res.status(429).json({
					success: false,
					error: {
						type: "error",
						message:
							"Yeni bir doğrulama maili göndermeden önce en az 5 dakika beklemelisiniz.",
					},
				});
			}

			const token = crypto.randomBytes(16).toString("hex");

			await Token.findOneAndUpdate(
				{ type: EMAIL_CHANGE_TOKEN_TYPE, user: req.user._id },
				{
					token,
					meta: { newEmail: normalizedNewEmail },
					updatedAt: new Date(),
				},
				{ upsert: true }
			);

			const frontendBase =
				(process.env.SERVER_FRONTEND_URL || "")
					.split(",")[0]
					.trim()
					.replace(/\/+$/, "") || "";

			const changeEmailUrl = `${frontendBase}/email-change-verify?userId=${req.user._id}&token=${token}`;

			await sendTemplatedEmail({
				to: normalizedNewEmail,
				type: "changeEmail",
				vars: {
					username:
						currentUser.username ||
						currentUser.name ||
						currentUser.local.email,
					email: currentUser.local.email,
					newEmail: normalizedNewEmail,
					token,
					changeEmailUrl,
					siteUrl: frontendBase,
				},
			});

			res.status(200).json({ success: true });
		} catch (err) {
			console.error("E-posta değiştirme talebi hatası:", err);
			res.status(500).json({
				success: false,
				error: { type: "error", message: err.message },
			});
		}
	}
);

// @desc    Verify e-mail change token (link clicked from new e-mail inbox)
// @route   POST /users/email-change/verify
// @access  Public
router.post(
	"/email-change/verify",
	rateLimiterStrictMiddleware,
	async (req, res) => {
		try {
			const { userId, token } = req.body || {};

			if (
				!userId ||
				typeof userId !== "string" ||
				!validator.isMongoId(userId)
			) {
				return res.status(400).json({
					success: false,
					error: {
						type: "error",
						message: "Geçersiz kullanıcı kimliği.",
					},
				});
			}

			if (!token || typeof token !== "string" || token.length > 64) {
				return res.status(400).json({
					success: false,
					error: {
						type: "error",
						message: "Geçersiz token.",
					},
				});
			}

			const tokenDb = await Token.findOne({
				token,
				type: EMAIL_CHANGE_TOKEN_TYPE,
				user: userId,
			}).lean();

			if (!tokenDb) {
				return res.status(400).json({
					success: false,
					error: {
						type: "error",
						message: "Token geçersiz veya kullanılmış.",
					},
				});
			}

			// 30 dakika geçerlilik
			const tokenAgeMs =
				Date.now() - new Date(tokenDb.updatedAt).getTime();
			if (tokenAgeMs > 1000 * 60 * 30) {
				await Token.deleteOne({ _id: tokenDb._id });
				return res.status(400).json({
					success: false,
					error: {
						type: "error",
						message:
							"Token süresi dolmuş. Lütfen yeni bir doğrulama maili talep edin.",
					},
				});
			}

			const newEmail =
				tokenDb.meta && typeof tokenDb.meta.newEmail === "string"
					? tokenDb.meta.newEmail.trim().toLowerCase()
					: "";

			if (!newEmail || !validator.isEmail(newEmail)) {
				await Token.deleteOne({ _id: tokenDb._id });
				return res.status(400).json({
					success: false,
					error: {
						type: "error",
						message:
							"Token verisi bozuk. Lütfen yeni bir doğrulama maili talep edin.",
					},
				});
			}

			// E-posta arada başka biri tarafından kullanılmaya başladıysa engelle
			const existing = await User.findOne({
				"local.email": newEmail,
				_id: { $ne: userId },
			})
				.select("_id")
				.lean();
			if (existing) {
				await Token.deleteOne({ _id: tokenDb._id });
				return res.status(409).json({
					success: false,
					error: {
						type: "error",
						message:
							"Bu e-posta adresi başka bir hesap tarafından kullanılıyor.",
					},
				});
			}

			const userToUpdate = await User.findById(userId).select("local mfa");
			if (!userToUpdate) {
				await Token.deleteOne({ _id: tokenDb._id });
				return res.status(404).json({
					success: false,
					error: {
						type: "error",
						message: "Kullanıcı bulunamadı.",
					},
				});
			}

			userToUpdate.local.email = newEmail;
			userToUpdate.local.emailVerified = true;
			if (Array.isArray(userToUpdate.mfa?.methods)) {
				const now = new Date();
				userToUpdate.mfa.methods.forEach((method) => {
					if (method?.type === "email") {
						method.email = newEmail;
						method.emailMasked = maskEmailAddress(newEmail);
						method.updatedAt = now;
					}
				});
			}

			await Promise.all([
				userToUpdate.save(),
				Token.deleteOne({ _id: tokenDb._id }),
				// Bekleyen verify/reset tokenlarını da iptal et
				Token.deleteMany({
					user: userId,
					type: { $in: ["verify", "reset"] },
				}),
			]);

			res.status(200).json({ success: true, email: newEmail });
		} catch (err) {
			console.error("E-posta değiştirme doğrulama hatası:", err);
			res.status(500).json({
				success: false,
				error: { type: "error", message: err.message },
			});
		}
	}
);

module.exports = router;
