const fs = require("fs");
const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const crypto = require("crypto");
const router = express.Router();

// Load database models
const User = require("../../../database/models/User");
const UserSeed = require("../../../database/models/UserSeed");
const Token = require("../../../database/models/Token");
const Report = require("../../../database/models/Report");
const BankTransfer = require("../../../database/models/BankTransfer");
const SiteSettings = require("../../../database/models/SiteSettings");

// Load middleware
const { authorizeUser } = require("../../../middleware/auth");
const {
	rateLimiterStrictMiddleware,
} = require("../../../middleware/rateLimiter");

// Load utils
const { captchaCheckData, captchaGetData } = require("../../../utils/captcha");
const { emailSend, sendTemplatedEmail } = require("../../../utils/email");
const { processUserAvatar } = require("../../../utils/avatar");
const { getClientIp } = require("../../../utils/ip");
const { authGenerateJwtToken } = require("../../../utils/auth");
const {
	buildChallengePayload,
	getUserMfaSummary,
	issueOtp,
} = require("../../../services/mfaService");
const { finalizeUserLoginSession } = require("../../../services/authSessionService");
const {
	ACCOUNT_SUSPENDED_CODE,
	assertUserNotSuspended,
	sendUserSuspensionResponse,
} = require("../../../utils/userSuspension");
const {
	authCheckPostCredentialsData,
	authCheckPostCredentialsUser,
	authCheckPostCredentialsRegisterData,
	authCheckPostCredentialsRegisterUser,
	authCheckPostCredentialsLinkData,
	authCheckPostCredentialsLinkUser,
	authCheckPostCredentialsRequestData,
	authCheckPostCredentialsRequestUser,
	authCheckPostCredentialsRequestToken,
	authCheckPostCredentialsVerifyData,
	authCheckPostCredentialsVerifyToken,
	authCheckPostCredentialsResetData,
	authCheckPostCredentialsResetToken,
} = require("../../../utils/auth/credentials");
const { createAdminNotification } = require("../../../utils/adminNotification");

module.exports = () => {
	// @desc    Login user
	// @route   POST /auth/credentials
	// @access  Public
	router.post("/", rateLimiterStrictMiddleware, async (req, res) => {
		try {
			// Gelen verilerin doğrulanması
			authCheckPostCredentialsData(req.body);

			// Captcha doğrulaması (zorunluysa)
			// const captchaCheck = await captchaGetData(req.body.captcha);
			// captchaCheckData(captchaCheck);

			// Kullanıcının veritabanından alınması
			let userDatabase;

			if (req.body.email) {
				userDatabase = await User.findOne({
					"local.email": req.body.email.trim(),
				})
					.select("local ips rank phone username name mfa ban")
					.lean();
			} else if (req.body.phone) {
				userDatabase = await User.findOne({
					phone: req.body.phone.trim(),
				})
					.select("local ips rank phone username name mfa ban")
					.lean();
			} else if (req.body.username) {
				userDatabase = await User.findOne({
					username: req.body.username.trim(),
				})
					.select("local ips rank phone username name mfa ban")
					.lean();
			} else {
				return res.status(400).json({
					success: false,
					message: "Invalid login credentials",
				});
			}

			// Gönderilen şifreyi alın
			const password = req.body.password.trim();

			// Şifreyi karşılaştır
			const isMatch = await bcrypt.compare(
				password,
				userDatabase !== null && userDatabase.local !== undefined
					? userDatabase.local.password
					: ""
			);

			// Kullanıcıyı doğrula
			authCheckPostCredentialsUser(userDatabase, isMatch);
			assertUserNotSuspended(userDatabase);

			const mfaSummary = getUserMfaSummary(userDatabase);
			if (mfaSummary.enabled) {
				const challenge = await issueOtp({
					user: userDatabase,
					scope: "user-login",
					methodType: mfaSummary.preferredMethodType,
					phone: mfaSummary.phone,
					email: mfaSummary.email,
					metadata: {
						loginIdentifier: req.body.email
							? "email"
							: req.body.phone
								? "phone"
								: "username",
					},
				});

				return res.status(200).json({
					success: true,
					...buildChallengePayload(challenge),
				});
			}

			return res.status(200).json(
				await finalizeUserLoginSession({
					userId: userDatabase._id,
					req,
				})
			);
		} catch (err) {
			if (err.code === ACCOUNT_SUSPENDED_CODE) {
				return sendUserSuspensionResponse(res);
			}
			res.status(err.status || 500).json({
				success: false,
				error: {
					type: "error",
					message: err.message,
					code: err.code,
					...(err.metadata ? { metadata: err.metadata } : {}),
				},
			});
		}
	});

	// @desc    Register user
	// @route   POST /auth/credentials/register
	// @access  Public
	router.post("/register", rateLimiterStrictMiddleware, async (req, res) => {
		try {
			// Gelen verilerin doğrulanması
			authCheckPostCredentialsRegisterData(req.body);

			// Kullanıcıdan gelen veriler
			const email = req.body.email?.trim();
			const username = req.body.username?.trim();
			const phone = req.body.phone?.trim();
			const name = req.body.name?.trim();
			const birthday = req.body.birthday;
			let password = req.body.password?.trim();
			const fiatCurrency = req.body.fiatCurrency || "USD";
			const affiliateCode = req.body.affiliate?.trim(); // ✅ affiliate kodu

			// Kullanıcı tekrar kontrolü
			const emailExists = await User.findOne({ "local.email": email });
			const usernameExists = await User.findOne({ username });
			const phoneExists = await User.findOne({ phone });

			if (emailExists)
				return res.status(400).json({
					success: false,
					message: "E-mail already in use.",
				});
			if (usernameExists)
				return res.status(400).json({
					success: false,
					message: "Username already in use.",
				});
			if (phoneExists)
				return res.status(400).json({
					success: false,
					message: "Phone number already in use.",
				});

			// 🎂 Doğum günü kontrolü
			const birthDate = new Date(birthday);
			if (isNaN(birthDate.getTime())) {
				return res
					.status(400)
					.json({ success: false, message: "Invalid birthday." });
			}
			const today = new Date();
			let age = today.getFullYear() - birthDate.getFullYear();
			const m = today.getMonth() - birthDate.getMonth();
			if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate()))
				age--;
			if (age < 18) {
				return res.status(400).json({
					success: false,
					message: "You must be at least 18 years old to register.",
				});
			}

			// 🔑 Şifre validasyonu
			const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
			if (!passwordRegex.test(password)) {
				return res.status(400).json({
					success: false,
					message:
						"Password must be at least 8 characters long, contain 1 uppercase letter and 1 number.",
				});
			}

			// Şifreyi hashle
			const salt = await bcrypt.genSalt(10);
			password = await bcrypt.hash(password, salt);

			// Rastgele seed ve hash
			const seedsClient = [
				crypto.randomBytes(8).toString("hex"),
				crypto.randomBytes(8).toString("hex"),
			];
			const seedsServer = [
				crypto.randomBytes(24).toString("hex"),
				crypto.randomBytes(24).toString("hex"),
			];
			const hashes = [
				crypto
					.createHash("sha256")
					.update(seedsServer[0])
					.digest("hex"),
				crypto
					.createHash("sha256")
					.update(seedsServer[1])
					.digest("hex"),
			];

			// IP adresi
			const userIp = getClientIp(req);

			// Yeni ObjectId
			const userId = new mongoose.Types.ObjectId();

			// 📂 Avatar klasöründen rastgele avatar seç (yeni sistem: /uploads/avatars)
			const avatarDir = path.join(__dirname, "../../../uploads/avatars");

			// Klasör yoksa oluştur
			if (!fs.existsSync(avatarDir)) {
				fs.mkdirSync(avatarDir, { recursive: true });
			}

			const avatarFiles = fs.existsSync(avatarDir)
				? fs
						.readdirSync(avatarDir)
						.filter((file) => /\.(jpe?g|png|gif)$/i.test(file))
				: [];

			let randomAvatar = null;
			if (avatarFiles.length > 0) {
				randomAvatar = `/uploads/avatars/${
					avatarFiles[Math.floor(Math.random() * avatarFiles.length)]
				}`;
			} else {
				// Fallback avatar'ı SiteSettings'den al
				const settings = await SiteSettings.findOne().lean();
				randomAvatar =
					settings?.avatars?.fallbackAvatar ||
					"/uploads/avatars/default.png";
			}

			// ✅ Referrer bul
			let referrerUser = null;
			if (affiliateCode) {
				referrerUser = await User.findOne({
					"affiliates.code": affiliateCode,
				})
					.select("_id")
					.lean();
			}

			// Identity / ID number (optional)
			const rawIdNumber = req.body.idNumber
				? String(req.body.idNumber).trim()
				: null;
			const sanitizedIdNumber = rawIdNumber
				? rawIdNumber.replace(/\D/g, "")
				: null;
			const documentType = req.body.documentType
				? String(req.body.documentType).trim()
				: null;

			// Basic validation: if provided, idNumber should be 11 digits (common for CPF/TC)
			if (sanitizedIdNumber && sanitizedIdNumber.length !== 11) {
				return res.status(400).json({
					success: false,
					message: "Invalid idNumber. Must be 11 digits.",
				});
			}

			// Veritabanına kullanıcıyı ekle
			let newUser = await User.create({
				_id: userId,
				username: username,
				local: {
					email: email,
					password: password,
				},
				phone: phone,
				name: name,
				identity: sanitizedIdNumber
					? {
							idNumber: sanitizedIdNumber,
							documentType: documentType || "CPF",
							verified: false,
					  }
					: undefined,
				birthday: birthDate,
				ips: [{ address: userIp }],
				avatar: randomAvatar,
				currency: {
					fiatCurrency: fiatCurrency,
				},
				affiliates: {
					referred: 0,
					referredLevel2: 0,
					referredLevel3: 0,
					bet: 0,
					deposit: 0,
					earned: 0,
					available: 0,
					generated: 0,
					referredAddress: userIp,
					referredAt: new Date(),
					referrer: referrerUser ? referrerUser._id : null, // ✅ bağlanan kişi
					redeemedCode: affiliateCode || null, // ✅ hangi kodla geldiği
				},
			});

			// Günlük rapor ve seeds ekle
			let dataDatabase = await Promise.all([
				Report.findOneAndUpdate(
					{ createdAt: new Date().toISOString().slice(0, 10) },
					{ $inc: { "stats.total.user": 1 } },
					{ upsert: true }
				),
				UserSeed.create({
					seedClient: seedsClient[0],
					seedServer: seedsServer[0],
					hash: hashes[0],
					nonce: 1,
					user: userId,
					state: "active",
				}),
				UserSeed.create({
					seedClient: seedsClient[1],
					seedServer: seedsServer[1],
					hash: hashes[1],
					nonce: 1,
					user: userId,
					state: "created",
				}),
			]);

			createAdminNotification(
				"new_user",
				"Yeni Üye Kaydı",
				`${username} kullanıcı adıyla yeni bir üye kayıt oldu.`,
				"/apps/user/list",
				{ username, userId: newUser._id },
			);

			newUser = newUser.toObject();
			delete newUser.local.password;

			// Process avatar - ensure valid avatar with fallback
			const userWithAvatar = await processUserAvatar(newUser);

			const accessToken = authGenerateJwtToken(newUser._id);

			res.status(200).json({
				success: true,
				token: accessToken,
				user: userWithAvatar,
			});
		} catch (err) {
			res.status(500).json({
				success: false,
				error: { type: "error", message: err.message },
			});
		}
	});

	// @desc    Link user
	// @route   POST /auth/credentials/link
	// @access  Private
	router.post(
		"/link",
		[rateLimiterStrictMiddleware, authorizeUser(true)],
		async (req, res) => {
			try {
				// Validate sent data
				authCheckPostCredentialsLinkData(req.body);

				// Get sent email and password
				const email = req.body.email.trim();
				let password = req.body.password.trim();

				// Get user from database
				let dataDatabase = await Promise.all([
					User.findById(req.user._id).select("local").lean(),
					User.findOne({ "local.email": email })
						.select("local")
						.lean(),
				]);

				// Validate user
				authCheckPostCredentialsLinkUser(dataDatabase);

				// Encrypt password
				const salt = await bcrypt.genSalt(10);
				password = await bcrypt.hash(password, salt);

				// Update user in database
				dataDatabase = await User.findByIdAndUpdate(
					req.user._id,
					{
						local: {
							email: req.body.email,
							password: password,
						},
					},
					{ new: true }
				)
					.select("local.email local.emailVerified")
					.lean();

				res.status(200).json({ success: true, user: dataDatabase });
			} catch (err) {
				res.status(500).json({
					success: false,
					error: { type: "error", message: err.message },
				});
			}
		}
	);

	// @desc    Request verify user or reset password email
	// @route   POST /auth/credentials/request
	// @access  Public
	router.post("/request", rateLimiterStrictMiddleware, async (req, res) => {
		try {
			// Validate sent data
			authCheckPostCredentialsRequestData(req.body);

			// Get user from the database
			const userDatabase = await User.findOne({
				"local.email": req.body.email,
			})
				.select("local username name")
				.lean();

			// Validate user
			authCheckPostCredentialsRequestUser(userDatabase, req.body);

			// Get token from the database
			const tokenDatabase = await Token.findOne({
				type: req.body.type,
				user: userDatabase._id,
			})
				.select("type user updatedAt")
				.lean();

			// Validate token
			authCheckPostCredentialsRequestToken(tokenDatabase);

			// Create a new token
			const token = crypto.randomBytes(16).toString("hex");

			// Create or update token in the database
			await Token.findOneAndUpdate(
				{ type: req.body.type, user: userDatabase._id },
				{ token: token, updatedAt: new Date() },
				{ upsert: true }
			);

			// Build action URL using configured frontend URL
			const frontendBase =
				(process.env.SERVER_FRONTEND_URL || "")
					.split(",")[0]
					.trim()
					.replace(/\/+$/, "") || "";
			const actionPath =
				req.body.type === "verify" ? "/verify" : "/reset";
			const actionUrl = `${frontendBase}${actionPath}?userId=${userDatabase._id}&token=${token}`;

			// Send templated email to user
			await sendTemplatedEmail({
				to: userDatabase.local.email,
				type:
					req.body.type === "verify"
						? "verifyEmail"
						: "resetPassword",
				vars: {
					username:
						userDatabase.username ||
						userDatabase.name ||
						userDatabase.local.email,
					email: userDatabase.local.email,
					token,
					verifyUrl:
						req.body.type === "verify" ? actionUrl : undefined,
					resetUrl:
						req.body.type === "reset" ? actionUrl : undefined,
					siteUrl: frontendBase,
				},
			});

			res.status(200).json({ success: true });
		} catch (err) {
			res.status(500).json({
				success: false,
				error: { type: "error", message: err.message },
			});
		}
	});

	// @desc    Verify user email
	// @route   POST /auth/credentials/verify
	// @access  Public
	router.post("/verify", rateLimiterStrictMiddleware, async (req, res) => {
		try {
			// Validate sent data
			authCheckPostCredentialsVerifyData(req.body);

			// Get token from database
			const tokenDatabase = await Token.findOne({
				token: req.body.token,
				type: "verify",
				user: req.body.userId,
			})
				.select("token type user updatedAt")
				.lean();

			// Validate token
			authCheckPostCredentialsVerifyToken(tokenDatabase);

			// Delete token and update user in the database
			await Promise.all([
				Token.findByIdAndDelete(tokenDatabase._id),
				User.findByIdAndUpdate(
					tokenDatabase.user,
					{ "local.emailVerified": true },
					{}
				),
			]);

			res.status(200).json({ success: true });
		} catch (err) {
			res.status(500).json({
				success: false,
				error: { type: "error", message: err.message },
			});
		}
	});

	// @desc    Reset user password
	// @route   POST /auth/credentials/reset
	// @access  Public
	router.post("/reset", rateLimiterStrictMiddleware, async (req, res) => {
		try {
			// Validate sent data
			authCheckPostCredentialsResetData(req.body);

			// Validate captcha
			const captchaCheck = await captchaGetData(req.body.captcha);
			captchaCheckData(captchaCheck);

			// Get token from database
			const tokenDatabase = await Token.findOne({
				token: req.body.token,
				type: "reset",
				user: req.body.userId,
			})
				.select("token type user updatedAt")
				.lean();

			// Validate token
			authCheckPostCredentialsResetToken(tokenDatabase);

			// Get sent password
			let password = req.body.password.trim();

			// Encrypt password
			const salt = await bcrypt.genSalt(10);
			password = await bcrypt.hash(password, salt);

			// Delete token and update user in the database
			await Promise.all([
				Token.findByIdAndDelete(tokenDatabase._id),
				User.findByIdAndUpdate(
					tokenDatabase.user,
					{ "local.password": password },
					{}
				),
			]);

			res.status(200).json({ success: true });
		} catch (err) {
			res.status(500).json({
				success: false,
				error: { type: "error", message: err.message },
			});
		}
	});

	return router;
};
