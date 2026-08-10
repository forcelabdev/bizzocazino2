const mongoose = require("mongoose");

const SiteSettingsSchema = new mongoose.Schema(
	{
		// Logo ve görsel ayarları
		logo: {
			type: String,
			default: "/img/logo.png",
		},
		logoMini: {
			type: String,
			default: "/img/logo-mini.png",
		},
		favicon: {
			type: String,
			default: "/uploads/favicon.png",
		},

		// Footer ayarları
		footerText: {
			type: String,
			default: "© 2024 All rights reserved.",
		},
		footerDescription: {
			type: String,
			default: "",
		},

		// Sosyal medya linkleri
		socialLinks: {
			twitter: { type: String, default: "" },
			discord: { type: String, default: "" },
			telegram: { type: String, default: "" },
			instagram: { type: String, default: "" },
			youtube: { type: String, default: "" },
		},

		// Lisanslar
		licenses: [
			{
				name: String,
				logo: String,
				url: String,
			},
		],

		// Partnerler
		partners: [
			{
				name: String,
				logo: String,
				url: String,
				order: { type: Number, default: 0 },
			},
		],

		// SEO ayarları
		seo: {
			title: { type: String, default: "" },
			description: { type: String, default: "" },
			keywords: { type: String, default: "" },
		},

		// Site durumu
		maintenanceMode: {
			type: Boolean,
			default: false,
		},
		maintenanceMessage: {
			type: String,
			default: "Site bakımda. Lütfen daha sonra tekrar deneyin.",
		},

		maxAccountBalance: {
			type: Number,
			default: 10000,
		},

		// Original oyun banner'ları (sabit path'ler)
		originalGames: {
			turbo: { type: String, default: "/uploads/games/turbo.png" },
			crash: { type: String, default: "/uploads/games/crash.png" },
			wingo: { type: String, default: "/uploads/games/wingo.png" },
			unbox: { type: String, default: "/uploads/games/unbox.png" },
			mines: { type: String, default: "/uploads/games/mines.png" },
			towers: { type: String, default: "/uploads/games/towers.png" },
			roll: { type: String, default: "/uploads/games/roll.png" },
		},

		// Custom CSS ve JavaScript
		customCSS: {
			type: String,
			default: "",
		},
		customJS: {
			type: String,
			default: "",
		},
		// Custom HTML injection
		customHTML: {
			type: String,
			default: "",
		},

		// Avatar Ayarları
		avatars: {
			// Fallback avatar - kullanıcı avatarı yoksa bu gösterilir
			fallbackAvatar: {
				type: String,
				default: "/uploads/avatars/default.png",
			},
			// Yüklenmiş avatar listesi
			avatarList: [
				{
					filename: String,
					path: String,
					uploadedAt: { type: Date, default: Date.now },
				},
			],
		},

		// Provider Ayarları
		providerSettings: {
			drakonBalanceSync: {
				type: Boolean,
				default: true,
			},
			drakonEnabled: {
				type: Boolean,
				default: true,
			},
			drakonDisabledMessage: {
				type: String,
				default: "Şu anda bu oyuna erişilemiyor.",
			},
			sportsbookProvider: {
				type: String,
				enum: ["betcolabs", "nexusggr"],
				default: "betcolabs",
			},
			providerDisplayNames: {
				type: mongoose.Schema.Types.Mixed,
				default: () => ({}),
			},
		},

		// Admin Betinovi report ve ControlGame API ayarları
		apiSettings: {
			betinoviReports: {
				enabled: { type: Boolean, default: true },
				baseUrl: { type: String, default: "", trim: true },
				agentCode: { type: String, default: "", trim: true },
				agentToken: { type: String, default: "", trim: true },
				currencyCode: {
					type: String,
					default: "TRY",
					uppercase: true,
					trim: true,
				},
				timeoutMs: { type: Number, default: 30000 },
				methods: {
					wagerIndex: { type: String, default: "ReportById", trim: true },
					byAgent: { type: String, default: "ReportByDate", trim: true },
					byVendor: { type: String, default: "ReportByDate", trim: true },
					settlement: { type: String, default: "ReportByDate", trim: true },
					riskUsers: { type: String, default: "ReportByDate", trim: true },
				},
			},
			controlGame: {
				enabled: { type: Boolean, default: true },
				baseUrl: { type: String, default: "", trim: true },
				agentCode: { type: String, default: "", trim: true },
				agentToken: { type: String, default: "", trim: true },
				currencyCode: {
					type: String,
					default: "TRY",
					uppercase: true,
					trim: true,
				},
				timeoutMs: { type: Number, default: 30000 },
				methods: {
					vendors: { type: String, default: "GetVendors", trim: true },
					onlineUsers: { type: String, default: "GetCurrentPlayers", trim: true },
					callList: { type: String, default: "GetCallList", trim: true },
					callHistory: { type: String, default: "GetCallHistory", trim: true },
					applyCall: { type: String, default: "CallApply", trim: true },
					cancelCall: { type: String, default: "CallCancel", trim: true },
					getUserSetting: { type: String, default: "GetUserSetting", trim: true },
					changeUserSetting: { type: String, default: "ChangeUserSetting", trim: true },
					getAgentSetting: { type: String, default: "GetAgentSetting", trim: true },
					changeAgentSetting: { type: String, default: "ChangeAgentSetting", trim: true },
					agentInfo: { type: String, default: "GetAgentInfo", trim: true },
					subAgentBalances: { type: String, default: "GetSubAgentBalances", trim: true },
				},
			},
		},

		// SMS OTP / MFA Ayarları
		smsOtp: {
			apiKey: {
				type: String,
				default: "",
				trim: true,
			},
			// Deprecated alanlar eski kayıtların kontrollü biçimde taşınabilmesi için tutuluyor.
			userToken: {
				type: String,
				default: "",
				trim: true,
			},
			origin: {
				type: String,
				default: "",
				trim: true,
			},
			baseUrl: {
				type: String,
				default: "https://sms.uipapp.com/api/v1/hub/index.php",
				trim: true,
			},
			otpTtlMs: {
				type: Number,
				default: 5 * 60 * 1000,
			},
			resendCooldownMs: {
				type: Number,
				default: 60 * 1000,
			},
			maxAttempts: {
				type: Number,
				default: 5,
			},
			encryptionKey: {
				type: String,
				default: "",
				trim: true,
			},
			hashSecret: {
				type: String,
				default: "",
				trim: true,
			},
		},

		// Forcelab Finance Ödeme Sistemi Ayarları
		forcelabFinance: {
			isActive: {
				type: Boolean,
				default: false,
			},
			name: {
				type: String,
				default: "Forcelab Finance",
			},
			logo: {
				type: String,
				default: "https://financeforcalabs.com/favicon.ico",
			},
			minAmount: {
				type: Number,
				default: 100,
			},
			maxAmount: {
				type: Number,
				default: 100000,
			},
			currency: {
				type: String,
				default: "TRY",
				uppercase: true,
				trim: true,
			},
			apiKey: {
				type: String,
				default: "",
			},
			webhookSecret: {
				type: String,
				default: "",
			},
			apiUrl: {
				type: String,
				default: "https://financeforcalabs.com/api/v1",
			},
		},

		// MeelDev Ödeme Sistemi Ayarları
		meelDev: {
			isActive: {
				type: Boolean,
				default: false,
			},
			name: {
				type: String,
				default: "MeelDev",
			},
			logo: {
				type: String,
				default: "",
			},
			minAmount: {
				type: Number,
				default: 100,
			},
			maxAmount: {
				type: Number,
				default: 100000,
			},
			currency: {
				type: String,
				default: "TRY",
				uppercase: true,
				trim: true,
			},
			apiKey: {
				type: String,
				default: "",
			},
			apiSecret: {
				type: String,
				default: "",
			},
			cbSecretKey: {
				type: String,
				default: "",
			},
			apiUrl: {
				type: String,
				default: "https://gateway.meeldev.com",
			},
		},

		// GalaxyPay Ödeme Sistemi Ayarları
		galaxyPay: {
			isActive: {
				type: Boolean,
				default: false,
			},
			name: {
				type: String,
				default: "GalaxyPay",
			},
			logo: {
				type: String,
				default: "",
			},
			minAmount: {
				type: Number,
				default: 100,
			},
			maxAmount: {
				type: Number,
				default: 100000,
			},
			currency: {
				type: String,
				default: "TRY",
				uppercase: true,
				trim: true,
			},
			lang: {
				type: String,
				default: "tr",
				lowercase: true,
				trim: true,
			},
			apiId: {
				type: String,
				default: "",
				trim: true,
			},
			apiKey: {
				type: String,
				default: "",
				trim: true,
			},
			apiUrl: {
				type: String,
				default: "https://galaxypay.dev",
				trim: true,
			},
			methods: {
				depositLobby: { type: Boolean, default: true },
				depositBankTransfer: { type: Boolean, default: true },
				depositPapara: { type: Boolean, default: true },
				withdrawBankTransfer: { type: Boolean, default: true },
				withdrawPapara: { type: Boolean, default: true },
			},
			returnUrlSuccess: {
				type: String,
				default: "",
				trim: true,
			},
			returnUrlFail: {
				type: String,
				default: "",
				trim: true,
			},
		},

		// E-posta Şablonları (SMTP ile gönderilen mailler)
		// Placeholder formatı: {{token}}, {{verifyUrl}}, {{resetUrl}},
		// {{changeEmailUrl}}, {{otpCode}}, {{username}}, {{email}},
		// {{newEmail}}, {{siteName}}, {{siteUrl}}, {{expiresInMinutes}}
		// FluxKripto Native API settings
		fluxKripto: {
			isActive: { type: Boolean, default: false },
			name: { type: String, default: "FluxKripto", trim: true },
			logo: { type: String, default: "", trim: true },
			minAmount: { type: Number, default: 100 },
			maxAmount: { type: Number, default: 100000 },
			currency: {
				type: String,
				default: "TRY",
				uppercase: true,
				trim: true,
			},
			apiUrl: {
				type: String,
				default: "https://api.fluxkripto.com",
				trim: true,
			},
			siteUrl: { type: String, default: "", trim: true },
			apiKey: { type: String, default: "", trim: true },
			secretKey: { type: String, default: "", trim: true },
			methods: {
				deposit: { type: Boolean, default: true },
				withdraw: { type: Boolean, default: true },
			},
			currencies: {
				trx: { type: Boolean, default: true },
				usdt: { type: Boolean, default: true },
			},
		},

		// XPayment H2H API settings
		xPayments: {
			isActive: { type: Boolean, default: false },
			name: { type: String, default: "XPayment", trim: true },
			logo: { type: String, default: "", trim: true },
			minAmount: { type: Number, default: 100 },
			maxAmount: { type: Number, default: 100000 },
			currency: {
				type: String,
				default: "TRY",
				uppercase: true,
				trim: true,
			},
			apiUrl: {
				type: String,
				default: "https://api.xpaymentsystems.com",
				trim: true,
			},
			apiKey: { type: String, default: "", trim: true },
			secretKey: { type: String, default: "", trim: true },
			methods: {
				deposit: { type: Boolean, default: true },
				withdraw: { type: Boolean, default: true },
			},
		},

		emailTemplates: {
			fromName: {
				type: String,
				default: "",
				trim: true,
			},
			fromAddress: {
				type: String,
				default: "",
				trim: true,
			},
			tokenExpiresInMinutes: {
				type: Number,
				default: 30,
			},
			verifyEmail: {
				subject: {
					type: String,
					default: "E-posta adresinizi doğrulayın",
				},
				html: {
					type: String,
					default:
						`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f1115;color:#e6e8ec;border-radius:12px">` +
						`<h2 style="margin:0 0 12px">Merhaba {{username}},</h2>` +
						`<p>{{siteName}} hesabını aktifleştirmek için aşağıdaki butona tıkla:</p>` +
						`<p style="text-align:center;margin:24px 0">` +
						`<a href="{{verifyUrl}}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">E-postamı Doğrula</a>` +
						`</p>` +
						`<p style="font-size:12px;color:#9aa0a6">Buton çalışmazsa bu linki tarayıcına yapıştır:<br><a href="{{verifyUrl}}" style="color:#3b82f6">{{verifyUrl}}</a></p>` +
						`<p style="font-size:12px;color:#9aa0a6">Bu link {{expiresInMinutes}} dakika boyunca geçerlidir.</p>` +
						`</div>`,
				},
			},
			resetPassword: {
				subject: {
					type: String,
					default: "Şifre sıfırlama talebi",
				},
				html: {
					type: String,
					default:
						`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f1115;color:#e6e8ec;border-radius:12px">` +
						`<h2 style="margin:0 0 12px">Merhaba {{username}},</h2>` +
						`<p>{{siteName}} hesabının şifresini sıfırlamak için aşağıdaki butona tıkla:</p>` +
						`<p style="text-align:center;margin:24px 0">` +
						`<a href="{{resetUrl}}" style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Şifremi Sıfırla</a>` +
						`</p>` +
						`<p style="font-size:12px;color:#9aa0a6">Buton çalışmazsa bu linki tarayıcına yapıştır:<br><a href="{{resetUrl}}" style="color:#ef4444">{{resetUrl}}</a></p>` +
						`<p style="font-size:12px;color:#9aa0a6">Bu link {{expiresInMinutes}} dakika boyunca geçerlidir. Eğer bu talebi sen yapmadıysan bu maili görmezden gelebilirsin.</p>` +
						`</div>`,
				},
			},
			changeEmail: {
				subject: {
					type: String,
					default: "Yeni e-posta adresinizi doğrulayın",
				},
				html: {
					type: String,
					default:
						`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f1115;color:#e6e8ec;border-radius:12px">` +
						`<h2 style="margin:0 0 12px">Merhaba {{username}},</h2>` +
						`<p>{{siteName}} hesabının e-posta adresini <strong>{{newEmail}}</strong> olarak değiştirmek istedin. Onaylamak için aşağıdaki butona tıkla:</p>` +
						`<p style="text-align:center;margin:24px 0">` +
						`<a href="{{changeEmailUrl}}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">E-posta Değişikliğini Onayla</a>` +
						`</p>` +
						`<p style="font-size:12px;color:#9aa0a6">Buton çalışmazsa bu linki tarayıcına yapıştır:<br><a href="{{changeEmailUrl}}" style="color:#10b981">{{changeEmailUrl}}</a></p>` +
						`<p style="font-size:12px;color:#9aa0a6">Bu link {{expiresInMinutes}} dakika boyunca geçerlidir. Eğer bu talebi sen yapmadıysan bu maili görmezden gelebilirsin.</p>` +
						`</div>`,
				},
			},
			emailOtp: {
				subject: {
					type: String,
					default: "Giriş doğrulama kodunuz",
				},
				html: {
					type: String,
					default:
						`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f1115;color:#e6e8ec;border-radius:12px">` +
						`<h2 style="margin:0 0 12px">Merhaba {{username}},</h2>` +
						`<p>{{siteName}} hesabına giriş doğrulaması için tek kullanımlık kodun:</p>` +
						`<div style="font-size:32px;letter-spacing:6px;font-weight:700;text-align:center;margin:24px 0;padding:16px;border-radius:10px;background:#1f2937;color:#fff">{{otpCode}}</div>` +
						`<p style="font-size:12px;color:#9aa0a6">Bu kod {{expiresInMinutes}} dakika boyunca geçerlidir. Eğer bu işlemi sen başlatmadıysan hesabının güvenliğini kontrol etmelisin.</p>` +
						`</div>`,
				},
			},
		},
	},
	{ timestamps: true }
);

SiteSettingsSchema.index({ type: 1 });

module.exports = mongoose.model("SiteSettings", SiteSettingsSchema);
