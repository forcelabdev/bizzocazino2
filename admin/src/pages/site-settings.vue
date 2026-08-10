<script setup>
import { ref, onMounted, computed } from "vue";
import axios from "@/plugins/axios";
import ability from "@/plugins/casl/ability";
import { DEFAULT_PROVIDER_DISPLAY_NAMES } from "@/utils/providerDisplayNames";

// API base URL for image preview
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const isNewSiteMode =
	String(import.meta.env.NEW_SITE_MODE ?? "true").toLowerCase() !== "false";

const canUpdatePlatform = computed(
	() => ability.can("update", "platform") || ability.can("manage", "platform"),
);

const canReadPlatform = computed(
	() => ability.can("read", "platform") || ability.can("manage", "platform"),
);

const canReadApiSettings = computed(
	() =>
		ability.can("read", "platform.apiSettings") ||
		ability.can("update", "platform.apiSettings") ||
		ability.can("manage", "platform.apiSettings") ||
		ability.can("manage", "platform"),
);

const canUpdateApiSettings = computed(
	() =>
		ability.can("update", "platform.apiSettings") ||
		ability.can("manage", "platform.apiSettings") ||
		ability.can("manage", "platform"),
);

const ensurePlatformUpdatePermission = () => {
	if (canUpdatePlatform.value) return true;

	alert("Bu işlem için yetkiniz yok.");
	return false;
};

const ensureApiSettingsUpdatePermission = () => {
	if (canUpdateApiSettings.value) return true;

	alert("Bu işlem için yetkiniz yok.");
	return false;
};

// Helper to get full image URL for preview
const getImageUrl = (path) => {
	if (!path) return "";
	if (path.startsWith("http://") || path.startsWith("https://")) return path;
	// Remove leading slash if present and combine with base URL
	const cleanPath = path.startsWith("/") ? path : "/" + path;
	return apiBaseUrl + cleanPath;
};

const settings = ref({
	logo: "",
	logoMini: "",
	favicon: "",
	footerText: "",
	footerDescription: "",
	socialLinks: {
		twitter: "",
		discord: "",
		telegram: "",
		instagram: "",
		youtube: "",
	},
	partners: [],
	licenses: [],
	seo: {
		title: "",
		description: "",
		keywords: "",
	},
	maintenanceMode: false,
	maintenanceMessage: "",
	maxAccountBalance: 10000,
	originalGames: {
		turbo: "/uploads/games/turbo.png",
		crash: "/uploads/games/crash.png",
		wingo: "/uploads/games/wingo.png",
		unbox: "/uploads/games/unbox.png",
		mines: "/uploads/games/mines.png",
		towers: "/uploads/games/towers.png",
		roll: "/uploads/games/roll.png",
	},
	customCSS: "",
	customJS: "",
	customHTML: "",
	providerSettings: {
		drakonBalanceSync: true,
		drakonEnabled: true,
		drakonDisabledMessage: "Şu anda bu oyuna erişilemiyor.",
		sportsbookProvider: "betcolabs",
		providerDisplayNames: { ...DEFAULT_PROVIDER_DISPLAY_NAMES },
	},
	apiSettings: {
		betinoviReports: {
			enabled: true,
			baseUrl: "",
			agentCode: "",
			agentToken: "",
			currencyCode: "TRY",
			timeoutMs: 30000,
			methods: {
				wagerIndex: "ReportById",
				byAgent: "ReportByDate",
				byVendor: "ReportByDate",
				settlement: "ReportByDate",
				riskUsers: "ReportByDate",
			},
			envFallbacks: {},
		},
		controlGame: {
			enabled: true,
			baseUrl: "",
			agentCode: "",
			agentToken: "",
			currencyCode: "TRY",
			timeoutMs: 30000,
				methods: {
					onlineUsers: "GetCurrentPlayers",
					vendorGames: "GetVendorGames",
					callList: "GetCallList",
					callHistory: "GetCallHistory",
					applyCall: "CallApply",
					cancelCall: "CallCancel",
					getUserSetting: "GetUserSetting",
					changeUserSetting: "ChangeUserSetting",
					getAgentSetting: "GetAgentSetting",
					changeAgentSetting: "ChangeAgentSetting",
					freeRoundList: "GetFreeRoundList",
					applyFreeRound: "ApplyFreeRound",
					cancelFreeRound: "CancelFreeRound",
				},
			envFallbacks: {},
		},
	},
	smsOtp: {
		apiKey: "",
		baseUrl: "https://sms.uipapp.com/api/v1/hub/index.php",
		otpTtlMs: 5 * 60 * 1000,
		resendCooldownMs: 60 * 1000,
		maxAttempts: 5,
		encryptionKey: "",
		hashSecret: "",
	},
});

// E-posta şablonları (ayrı state, ayrı endpoint üzerinden yönetilir)
const emailTemplates = ref({
	fromName: "",
	fromAddress: "",
	tokenExpiresInMinutes: 30,
	verifyEmail: { subject: "", html: "" },
	resetPassword: { subject: "", html: "" },
	changeEmail: { subject: "", html: "" },
	emailOtp: { subject: "", html: "" },
	smtp: {
		hostConfigured: false,
		fromAddressEnv: "",
		fromNameEnv: "",
	},
});

const emailTestRecipient = ref("");
const emailTestType = ref("verifyEmail");
const activeTab = ref("general");
const hiddenNewSiteTabs = new Set(["avatars", "original-games", "category-icons"]);
const allSettingsTabs = [
	{ value: "general", label: "Genel", icon: "mdi-tune" },
	{ value: "logo", label: "Logo & Favicon", icon: "mdi-image" },
	{ value: "avatars", label: "Avatarlar", icon: "mdi-account-circle" },
	{ value: "partners", label: "Partnerler", icon: "mdi-handshake" },
	{ value: "licenses", label: "Lisanslar", icon: "mdi-certificate" },
	{ value: "social", label: "Sosyal Medya", icon: "mdi-share-variant" },
	{ value: "seo", label: "SEO", icon: "mdi-magnify" },
	{ value: "maintenance", label: "Bakım Modu", icon: "mdi-tools" },
	{ value: "original-games", label: "Original Oyunlar", icon: "mdi-gamepad-variant" },
	{ value: "category-icons", label: "Kategori İkonları", icon: "mdi-shape" },
	{ value: "custom-code", label: "Custom Kod", icon: "mdi-code-tags" },
	{ value: "provider-settings", label: "Provider", icon: "mdi-server" },
	{
		value: "api-settings",
		label: "ForceLab API",
		icon: "mdi-api",
		canView: () => canReadApiSettings.value,
	},
	{ value: "sms-otp", label: "SMS OTP", icon: "mdi-message-lock" },
	{ value: "email-templates", label: "E-posta", icon: "mdi-email-edit" },
];
const settingsTabs = computed(() =>
	allSettingsTabs.filter(
		(tab) =>
			(!isNewSiteMode || !hiddenNewSiteTabs.has(tab.value)) &&
			(tab.canView ? tab.canView() : canReadPlatform.value),
	),
);
const providerDisplayNameRows = Object.entries(DEFAULT_PROVIDER_DISPLAY_NAMES).map(
	([code, defaultName]) => ({ code, defaultName }),
);

const normalizeProviderSettings = (value = {}) => ({
	drakonBalanceSync: value.drakonBalanceSync ?? true,
	drakonEnabled: value.drakonEnabled ?? true,
	drakonDisabledMessage:
		value.drakonDisabledMessage || "Şu anda bu oyuna erişilemiyor.",
	sportsbookProvider: value.sportsbookProvider || "betcolabs",
	providerDisplayNames: {
		...DEFAULT_PROVIDER_DISPLAY_NAMES,
		...(value.providerDisplayNames || {}),
	},
});

const normalizeApiSettingsSection = (value = {}, defaults = {}) => ({
	enabled: value.enabled ?? defaults.enabled ?? true,
	baseUrl: value.baseUrl || "",
	agentCode: value.agentCode || "",
	agentToken: value.agentToken || "",
	currencyCode: value.currencyCode || defaults.currencyCode || "TRY",
	timeoutMs: value.timeoutMs || defaults.timeoutMs || 30000,
	methods: {
		...(defaults.methods || {}),
		...(value.methods || {}),
	},
	envFallbacks: value.envFallbacks || {},
});

const normalizeApiSettings = (value = {}) => ({
	betinoviReports: normalizeApiSettingsSection(
		value.betinoviReports,
		settings.value.apiSettings.betinoviReports,
	),
	controlGame: normalizeApiSettingsSection(
		value.controlGame,
		settings.value.apiSettings.controlGame,
	),
});

// Şablon bazında placeholder dokümantasyonu (admin paneli için)
const emailCommonPlaceholders = [
	{ key: "{{username}}", desc: "Kullanıcının kullanıcı adı veya tam adı" },
	{ key: "{{email}}", desc: "Kullanıcının mevcut e-posta adresi" },
	{ key: "{{siteName}}", desc: "Gönderici görünen adı (üstteki 'Gönderici Görünen Adı' alanından gelir)" },
	{ key: "{{siteUrl}}", desc: "Sitenin frontend URL'i (backend .env: SERVER_FRONTEND_URL)" },
	{ key: "{{expiresInMinutes}}", desc: "Link şablonlarında link süresi; e-posta OTP şablonunda OTP süresi (dakika)." },
];

const emailTemplatePlaceholders = {
	verifyEmail: [
		{ key: "{{verifyUrl}}", desc: "E-posta doğrulama linki (kullanıcının tıklayacağı URL). HTML içinde href olarak kullanılmalı." },
		{ key: "{{token}}", desc: "Ham doğrulama token'ı. Genellikle ihtiyaç olmaz, {{verifyUrl}} yeterlidir." },
		...emailCommonPlaceholders,
	],
	resetPassword: [
		{ key: "{{resetUrl}}", desc: "Şifre sıfırlama linki (kullanıcının tıklayacağı URL). HTML içinde href olarak kullanılmalı." },
		{ key: "{{token}}", desc: "Ham reset token'ı. Genellikle ihtiyaç olmaz, {{resetUrl}} yeterlidir." },
		...emailCommonPlaceholders,
	],
	changeEmail: [
		{ key: "{{changeEmailUrl}}", desc: "E-posta değişikliği onay linki (yeni e-posta adresine gönderilen linkte kullanılır)." },
		{ key: "{{newEmail}}", desc: "Kullanıcının değiştirmek istediği yeni e-posta adresi." },
		{ key: "{{token}}", desc: "Ham doğrulama token'ı. Genellikle ihtiyaç olmaz, {{changeEmailUrl}} yeterlidir." },
		...emailCommonPlaceholders,
	],
	emailOtp: [
		{ key: "{{otpCode}}", desc: "Kullanıcının giriş / MFA ekranına yazacağı 6 haneli tek kullanımlık kod." },
		{ key: "{{token}}", desc: "OTP kodunun alias değeri. Yeni şablonlarda {{otpCode}} kullanılması önerilir." },
		...emailCommonPlaceholders,
	],
};

const loading = ref(false);
const logoFile = ref(null);
const logoMiniFile = ref(null);
const faviconFile = ref(null);
const partnerFile = ref(null);
const licenseFile = ref(null);

// Avatar yönetimi
const avatarFiles = ref(null);
const fallbackAvatarFile = ref(null);
const avatarList = ref([]);
const fallbackAvatar = ref("/uploads/avatars/default.png");

// Original games banner files
const originalGameFiles = ref({
	turbo: null,
	crash: null,
	wingo: null,
	unbox: null,
	mines: null,
	towers: null,
	roll: null,
});

const newPartner = ref({
	name: "",
	url: "",
	order: 0,
});

const newLicense = ref({
	name: "",
	url: "",
});

// Ayarları getir
const fetchSettings = async () => {
	try {
		loading.value = true;
		const response = await axios.get("/admin/site-settings");
		settings.value = {
			...response.data,
		};
	} catch (error) {
		console.error("Ayarlar yüklenirken hata:", error);
	} finally {
		loading.value = false;
	}
};

// Ayarları kaydet
const saveSettings = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	try {
		loading.value = true;
		await axios.put("/admin/site-settings", settings.value);
		alert("Ayarlar başarıyla kaydedildi!");
	} catch (error) {
		console.error("Ayarlar kaydedilirken hata:", error);
		alert("Ayarlar kaydedilirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Logo yükle
const uploadLogo = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	const file = Array.isArray(logoFile.value)
		? logoFile.value[0]
		: logoFile.value;
	if (!file) return;

	const formData = new FormData();
	formData.append("logo", file);

	try {
		loading.value = true;
		const response = await axios.post(
			"/admin/site-settings/logo",
			formData,
			{
				headers: { "Content-Type": "multipart/form-data" },
			}
		);
		settings.value.logo = response.data.logo;
		logoFile.value = null;
		alert("Logo başarıyla yüklendi!");
	} catch (error) {
		console.error("Logo yüklenirken hata:", error);
		alert("Logo yüklenirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Logo Mini yükle
const uploadLogoMini = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	const file = Array.isArray(logoMiniFile.value)
		? logoMiniFile.value[0]
		: logoMiniFile.value;
	if (!file) return;

	const formData = new FormData();
	formData.append("logoMini", file);

	try {
		loading.value = true;
		const response = await axios.post(
			"/admin/site-settings/logo-mini",
			formData,
			{
				headers: { "Content-Type": "multipart/form-data" },
			}
		);
		settings.value.logoMini = response.data.logoMini;
		logoMiniFile.value = null;
		alert("Logo Mini başarıyla yüklendi!");
	} catch (error) {
		console.error("Logo Mini yüklenirken hata:", error);
		alert("Logo Mini yüklenirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Favicon yükle
const uploadFavicon = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	const file = Array.isArray(faviconFile.value)
		? faviconFile.value[0]
		: faviconFile.value;
	if (!file) return;

	const formData = new FormData();
	formData.append("favicon", file);

	try {
		loading.value = true;
		const response = await axios.post(
			"/admin/site-settings/favicon",
			formData,
			{
				headers: { "Content-Type": "multipart/form-data" },
			}
		);
		settings.value.favicon = response.data.favicon;
		faviconFile.value = null;
		alert("Favicon başarıyla yüklendi!");
	} catch (error) {
		console.error("Favicon yüklenirken hata:", error);
		alert("Favicon yüklenirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Partner ekle
const addPartner = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	const file = Array.isArray(partnerFile.value)
		? partnerFile.value[0]
		: partnerFile.value;
	if (!file || !newPartner.value.name) {
		alert("Partner adı ve logo gerekli!");
		return;
	}

	const formData = new FormData();
	formData.append("logo", file);
	formData.append("name", newPartner.value.name);
	formData.append("url", newPartner.value.url);
	formData.append("order", newPartner.value.order);

	try {
		loading.value = true;
		const response = await axios.post(
			"/admin/site-settings/partners",
			formData,
			{
				headers: { "Content-Type": "multipart/form-data" },
			}
		);
		settings.value.partners = response.data.partners;
		newPartner.value = { name: "", url: "", order: 0 };
		partnerFile.value = null;
		alert("Partner başarıyla eklendi!");
	} catch (error) {
		console.error("Partner eklenirken hata:", error);
		alert("Partner eklenirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Partner sil
const deletePartner = async (id) => {
	if (!ensurePlatformUpdatePermission()) return;

	if (!confirm("Bu partneri silmek istediğinizden emin misiniz?")) return;

	try {
		loading.value = true;
		const response = await axios.delete(
			`/admin/site-settings/partners/${id}`
		);
		settings.value.partners = response.data.partners;
		alert("Partner başarıyla silindi!");
	} catch (error) {
		console.error("Partner silinirken hata:", error);
		alert("Partner silinirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Lisans ekle
const addLicense = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	const file = Array.isArray(licenseFile.value)
		? licenseFile.value[0]
		: licenseFile.value;
	if (!file || !newLicense.value.name) {
		alert("Lisans adı ve logo gerekli!");
		return;
	}

	const formData = new FormData();
	formData.append("logo", file);
	formData.append("name", newLicense.value.name);
	formData.append("url", newLicense.value.url);

	try {
		loading.value = true;
		const response = await axios.post(
			"/admin/site-settings/licenses",
			formData,
			{
				headers: { "Content-Type": "multipart/form-data" },
			}
		);
		settings.value.licenses = response.data.licenses;
		newLicense.value = { name: "", url: "" };
		licenseFile.value = null;
		alert("Lisans başarıyla eklendi!");
	} catch (error) {
		console.error("Lisans eklenirken hata:", error);
		alert("Lisans eklenirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Lisans sil
const deleteLicense = async (id) => {
	if (!ensurePlatformUpdatePermission()) return;

	if (!confirm("Bu lisansı silmek istediğinizden emin misiniz?")) return;

	try {
		loading.value = true;
		const response = await axios.delete(
			`/admin/site-settings/licenses/${id}`
		);
		settings.value.licenses = response.data.licenses;
		alert("Lisans başarıyla silindi!");
	} catch (error) {
		console.error("Lisans silinirken hata:", error);
		alert("Lisans silinirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Edit dialog states
const editPartnerDialog = ref(false);
const editLicenseDialog = ref(false);
const editingPartner = ref({ _id: "", name: "", url: "" });
const editingLicense = ref({ _id: "", name: "", url: "" });
const editPartnerFile = ref(null);
const editLicenseFile = ref(null);

// Partner edit dialog aç
const openEditPartnerDialog = (partner) => {
	if (!canUpdatePlatform.value) return;

	editingPartner.value = { ...partner };
	editPartnerFile.value = null;
	editPartnerDialog.value = true;
};

// Partner güncelle
const updatePartner = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	try {
		loading.value = true;
		const formData = new FormData();
		formData.append("name", editingPartner.value.name);
		formData.append("url", editingPartner.value.url || "");

		const file = Array.isArray(editPartnerFile.value)
			? editPartnerFile.value[0]
			: editPartnerFile.value;
		if (file) {
			formData.append("logo", file);
		}

		const response = await axios.put(
			`/admin/site-settings/partners/${editingPartner.value._id}`,
			formData,
			{
				headers: { "Content-Type": "multipart/form-data" },
			}
		);
		settings.value.partners = response.data.partners;
		editPartnerDialog.value = false;
		alert("Partner başarıyla güncellendi!");
	} catch (error) {
		console.error("Partner güncellenirken hata:", error);
		alert("Partner güncellenirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// License edit dialog aç
const openEditLicenseDialog = (license) => {
	if (!canUpdatePlatform.value) return;

	editingLicense.value = { ...license };
	editLicenseFile.value = null;
	editLicenseDialog.value = true;
};

// License güncelle
const updateLicense = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	try {
		loading.value = true;
		const formData = new FormData();
		formData.append("name", editingLicense.value.name);
		formData.append("url", editingLicense.value.url || "");

		const file = Array.isArray(editLicenseFile.value)
			? editLicenseFile.value[0]
			: editLicenseFile.value;
		if (file) {
			formData.append("logo", file);
		}

		const response = await axios.put(
			`/admin/site-settings/licenses/${editingLicense.value._id}`,
			formData,
			{
				headers: { "Content-Type": "multipart/form-data" },
			}
		);
		settings.value.licenses = response.data.licenses;
		editLicenseDialog.value = false;
		alert("Lisans başarıyla güncellendi!");
	} catch (error) {
		console.error("Lisans güncellenirken hata:", error);
		alert("Lisans güncellenirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Partner sıralama
const movePartner = async (partnerId, direction) => {
	if (!ensurePlatformUpdatePermission()) return;

	try {
		loading.value = true;
		const response = await axios.put(
			"/admin/site-settings/partners-reorder",
			{
				partnerId,
				direction,
			}
		);
		settings.value.partners = response.data.partners;
	} catch (error) {
		console.error("Partner sırası güncellenirken hata:", error);
		alert("Partner sırası güncellenirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// License sıralama
const moveLicense = async (licenseId, direction) => {
	if (!ensurePlatformUpdatePermission()) return;

	try {
		loading.value = true;
		const response = await axios.put(
			"/admin/site-settings/licenses-reorder",
			{
				licenseId,
				direction,
			}
		);
		settings.value.licenses = response.data.licenses;
	} catch (error) {
		console.error("Lisans sırası güncellenirken hata:", error);
		alert("Lisans sırası güncellenirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Original game banner yükle
const uploadOriginalGameBanner = async (game) => {
	if (!ensurePlatformUpdatePermission()) return;

	const file = Array.isArray(originalGameFiles.value[game])
		? originalGameFiles.value[game][0]
		: originalGameFiles.value[game];
	if (!file) {
		alert("Lütfen bir PNG dosyası seçin!");
		return;
	}

	const formData = new FormData();
	formData.append("banner", file);

	try {
		loading.value = true;
		const response = await axios.post(
			`/admin/site-settings/original-games/${game}`,
			formData,
			{
				headers: { "Content-Type": "multipart/form-data" },
			}
		);
		if (response.data.originalGames) {
			settings.value.originalGames = response.data.originalGames;
		}
		originalGameFiles.value[game] = null;
		alert(`${game} banner'ı başarıyla yüklendi!`);
	} catch (error) {
		console.error("Banner yüklenirken hata:", error);
		alert(
			error.response?.data?.error || "Banner yüklenirken bir hata oluştu!"
		);
	} finally {
		loading.value = false;
	}
};

// Custom CSS kaydet
const saveCustomCSS = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	try {
		loading.value = true;
		await axios.put("/admin/site-settings/custom-css", {
			customCSS: settings.value.customCSS,
		});
		alert("Custom CSS başarıyla kaydedildi!");
	} catch (error) {
		console.error("Custom CSS kaydedilirken hata:", error);
		alert("Custom CSS kaydedilirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Custom JS kaydet
const saveCustomJS = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	try {
		loading.value = true;
		await axios.put("/admin/site-settings/custom-js", {
			customJS: settings.value.customJS,
		});
		alert("Custom JavaScript başarıyla kaydedildi!");
	} catch (error) {
		console.error("Custom JS kaydedilirken hata:", error);
		alert("Custom JavaScript kaydedilirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Custom HTML kaydet
const saveCustomHTML = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	try {
		loading.value = true;
		await axios.put("/admin/site-settings/custom-html", {
			customHTML: settings.value.customHTML,
		});
		alert("Custom HTML başarıyla kaydedildi!");
	} catch (error) {
		console.error("Custom HTML kaydedilirken hata:", error);
		alert("Custom HTML kaydedilirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Provider ayarlarını kaydet
const saveProviderSettings = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	try {
		loading.value = true;
		const response = await axios.put("/admin/provider/settings", settings.value.providerSettings);
		if (response.data.success && response.data.data) {
			settings.value.providerSettings = normalizeProviderSettings(response.data.data);
		}
		alert("Provider ayarları başarıyla kaydedildi!");
	} catch (error) {
		console.error("Provider ayarları kaydedilirken hata:", error);
		alert("Provider ayarları kaydedilirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Provider ayarlarını getir
const fetchProviderSettings = async () => {
	try {
		const response = await axios.get("/admin/provider/settings");
		if (response.data.success && response.data.data) {
			settings.value.providerSettings = normalizeProviderSettings(response.data.data);
		}
	} catch (error) {
		console.error("Provider ayarları yüklenirken hata:", error);
	}
};

const saveApiSettings = async () => {
	if (!ensureApiSettingsUpdatePermission()) return;

	try {
		loading.value = true;
		const response = await axios.put(
			"/admin/betinovi-admin/settings",
			settings.value.apiSettings,
		);
		if (response.data.success && response.data.data) {
			settings.value.apiSettings = normalizeApiSettings(response.data.data);
		}
		alert("ForceLab API ayarları başarıyla kaydedildi!");
	} catch (error) {
		console.error("ForceLab API ayarları kaydedilirken hata:", error);
		alert(
			error?.response?.data?.message ||
				"ForceLab API ayarları kaydedilirken bir hata oluştu!",
		);
	} finally {
		loading.value = false;
	}
};

const fetchApiSettings = async () => {
	try {
		const response = await axios.get("/admin/betinovi-admin/settings");
		if (response.data.success && response.data.data) {
			settings.value.apiSettings = normalizeApiSettings(response.data.data);
		}
	} catch (error) {
		console.error("ForceLab API ayarları yüklenirken hata:", error);
	}
};

const saveSmsOtpSettings = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	try {
		loading.value = true;
		const response = await axios.put(
			"/admin/sms-otp/settings",
			settings.value.smsOtp
		);
		if (response.data.success && response.data.data) {
			settings.value.smsOtp = response.data.data;
		}
		alert("SMS OTP ayarları başarıyla kaydedildi!");
	} catch (error) {
		console.error("SMS OTP ayarları kaydedilirken hata:", error);
		alert("SMS OTP ayarları kaydedilirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

const fetchSmsOtpSettings = async () => {
	try {
		const response = await axios.get("/admin/sms-otp/settings");
		if (response.data.success && response.data.data) {
			settings.value.smsOtp = response.data.data;
		}
	} catch (error) {
		console.error("SMS OTP ayarları yüklenirken hata:", error);
	}
};

// E-posta şablonları yönetimi
const fetchEmailTemplates = async () => {
	try {
		const response = await axios.get("/admin/email-templates");
		if (response.data.success && response.data.data) {
			emailTemplates.value = {
				...emailTemplates.value,
				...response.data.data,
			};
		}
	} catch (error) {
		console.error("E-posta şablonları yüklenirken hata:", error);
	}
};

const saveEmailTemplates = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	try {
		loading.value = true;
		const payload = {
			fromName: emailTemplates.value.fromName,
			fromAddress: emailTemplates.value.fromAddress,
			tokenExpiresInMinutes: emailTemplates.value.tokenExpiresInMinutes,
			verifyEmail: emailTemplates.value.verifyEmail,
			resetPassword: emailTemplates.value.resetPassword,
			changeEmail: emailTemplates.value.changeEmail,
			emailOtp: emailTemplates.value.emailOtp,
		};
		const response = await axios.put("/admin/email-templates", payload);
		if (response.data.success && response.data.data) {
			emailTemplates.value = {
				...emailTemplates.value,
				...response.data.data,
			};
		}
		alert("E-posta şablonları başarıyla kaydedildi!");
	} catch (error) {
		console.error("E-posta şablonları kaydedilirken hata:", error);
		alert(
			error?.response?.data?.error ||
				"E-posta şablonları kaydedilirken bir hata oluştu!"
		);
	} finally {
		loading.value = false;
	}
};

const copyPlaceholder = async (value) => {
	try {
		await navigator.clipboard.writeText(value);
	} catch (err) {
		console.error("Placeholder kopyalanamadı:", err);
	}
};

const sendTestEmail = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	if (!emailTestRecipient.value) {
		alert("Test için e-posta adresi girmelisiniz.");
		return;
	}

	try {
		loading.value = true;
		await axios.post("/admin/email-templates/test", {
			to: emailTestRecipient.value,
			type: emailTestType.value,
		});
		alert("Test e-postası gönderildi.");
	} catch (error) {
		console.error("Test e-posta gönderilirken hata:", error);
		alert(
			error?.response?.data?.error ||
				"Test e-postası gönderilemedi. SMTP ayarlarını kontrol edin."
		);
	} finally {
		loading.value = false;
	}
};

// ═══════════════════════════════════════════════════════════════════════════
// Avatar Yönetimi
// ═══════════════════════════════════════════════════════════════════════════

// Avatar listesini getir
const fetchAvatars = async () => {
	try {
		const response = await axios.get("/admin/site-settings/avatars");
		if (response.data.success) {
			avatarList.value = response.data.data.avatars;
			fallbackAvatar.value = response.data.data.fallbackAvatar;
		}
	} catch (error) {
		console.error("Avatar listesi yüklenirken hata:", error);
	}
};

// Avatar yükle
const uploadAvatars = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	const files = Array.isArray(avatarFiles.value)
		? avatarFiles.value
		: [avatarFiles.value];
	if (!files || files.length === 0 || !files[0]) {
		alert("Lütfen en az bir dosya seçin!");
		return;
	}

	if (files.length > 100) {
		alert("Tek seferde en fazla 100 dosya yükleyebilirsiniz!");
		return;
	}

	const formData = new FormData();
	files.forEach((file) => {
		if (file) formData.append("avatars", file);
	});

	try {
		loading.value = true;
		const response = await axios.post(
			"/admin/site-settings/avatars",
			formData,
			{
				headers: { "Content-Type": "multipart/form-data" },
			}
		);
		if (response.data.success) {
			await fetchAvatars();
			avatarFiles.value = null;
			alert(response.data.message);
		}
	} catch (error) {
		console.error("Avatar yüklenirken hata:", error);
		alert("Avatar yüklenirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Avatar sil
const deleteAvatar = async (filename) => {
	if (!ensurePlatformUpdatePermission()) return;

	if (!confirm("Bu avatarı silmek istediğinizden emin misiniz?")) return;

	try {
		loading.value = true;
		const response = await axios.delete(
			`/admin/site-settings/avatars/${filename}`
		);
		if (response.data.success) {
			await fetchAvatars();
			alert("Avatar başarıyla silindi!");
		}
	} catch (error) {
		console.error("Avatar silinirken hata:", error);
		alert("Avatar silinirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Fallback avatar yükle
const uploadFallbackAvatar = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	const file = Array.isArray(fallbackAvatarFile.value)
		? fallbackAvatarFile.value[0]
		: fallbackAvatarFile.value;
	if (!file) {
		alert("Lütfen bir dosya seçin!");
		return;
	}

	const formData = new FormData();
	formData.append("fallback", file);

	try {
		loading.value = true;
		const response = await axios.post(
			"/admin/site-settings/avatars/fallback",
			formData,
			{
				headers: { "Content-Type": "multipart/form-data" },
			}
		);
		if (response.data.success) {
			fallbackAvatar.value = response.data.fallbackAvatar;
			fallbackAvatarFile.value = null;
			alert("Fallback avatar başarıyla güncellendi!");
		}
	} catch (error) {
		console.error("Fallback avatar yüklenirken hata:", error);
		alert("Fallback avatar yüklenirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// Mevcut avatarı fallback olarak ayarla
const setAsFallback = async (avatarPath) => {
	if (!ensurePlatformUpdatePermission()) return;

	if (
		!confirm(
			"Bu avatarı fallback olarak ayarlamak istediğinizden emin misiniz?"
		)
	)
		return;

	try {
		loading.value = true;
		const response = await axios.post(
			"/admin/site-settings/avatars/fallback",
			{
				path: avatarPath,
			}
		);
		if (response.data.success) {
			fallbackAvatar.value = response.data.fallbackAvatar;
			alert("Fallback avatar başarıyla güncellendi!");
		}
	} catch (error) {
		console.error("Fallback avatar ayarlanırken hata:", error);
		alert("Fallback avatar ayarlanırken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

// ═══════════════════════════════════════════════════════════════════════════
// Kategori İkonları
// ═══════════════════════════════════════════════════════════════════════════

const categoryIcons = ref([]);
const categoryIconFiles = ref({
	lobby: null,
	originals: null,
	favorites: null,
	hot: null,
});
const categoryIconLoading = ref({
	lobby: false,
	originals: false,
	favorites: false,
	hot: false,
});

// Kategori ikonlarını getir
const fetchCategoryIcons = async () => {
	try {
		const response = await axios.get("/admin/category-icons");
		if (response.data.success) {
			categoryIcons.value = response.data.icons;
		}
	} catch (error) {
		console.error("Kategori ikonları yüklenirken hata:", error);
	}
};

// Kategori ikonu yükle
const uploadCategoryIcon = async (iconType) => {
	if (!ensurePlatformUpdatePermission()) return;

	const file = Array.isArray(categoryIconFiles.value[iconType])
		? categoryIconFiles.value[iconType][0]
		: categoryIconFiles.value[iconType];

	if (!file) {
		alert("Lütfen bir PNG dosyası seçin!");
		return;
	}

	// PNG kontrolü
	if (file.type !== "image/png") {
		alert("Sadece PNG dosyaları yüklenebilir!");
		return;
	}

	const formData = new FormData();
	formData.append("file", file);
	formData.append("iconType", iconType);

	try {
		categoryIconLoading.value[iconType] = true;
		const response = await axios.post(
			"/admin/category-icons/upload",
			formData,
			{
				headers: { "Content-Type": "multipart/form-data" },
			}
		);

		if (response.data.success) {
			// İkon listesini güncelle
			await fetchCategoryIcons();
			categoryIconFiles.value[iconType] = null;
			alert(
				`${
					iconType.charAt(0).toUpperCase() + iconType.slice(1)
				} ikonu başarıyla yüklendi!`
			);
		}
	} catch (error) {
		console.error("Kategori ikonu yüklenirken hata:", error);
		alert(
			error.response?.data?.error ||
				"Kategori ikonu yüklenirken bir hata oluştu!"
		);
	} finally {
		categoryIconLoading.value[iconType] = false;
	}
};

// İkon URL'ini al (cache busting için timestamp ekle)
const getCategoryIconUrl = (iconType) => {
	const icon = categoryIcons.value.find((i) => i.type === iconType);
	if (icon && icon.url) {
		return icon.url + "?t=" + Date.now();
	}
	return null;
};

onMounted(async () => {
	if (!settingsTabs.value.some((tab) => tab.value === activeTab.value)) {
		activeTab.value = settingsTabs.value[0]?.value || "general";
	}

	if (canReadPlatform.value) {
		await fetchSettings();
		await fetchProviderSettings();
		await fetchSmsOtpSettings();
		await fetchEmailTemplates();
		if (!isNewSiteMode) {
			fetchCategoryIcons();
			fetchAvatars();
		}
	}

	if (canReadApiSettings.value) {
		await fetchApiSettings();
	}
});
</script>

<template>
	<div class="site-settings-page">
		<VCard class="site-settings-shell">
			<VCardText class="site-settings-header">
				<div>
					<div class="site-settings-eyebrow">Platform</div>
					<h1 class="site-settings-title">Site Ayarları</h1>
					<p class="site-settings-subtitle">
						Marka varlıkları, ödeme sağlayıcıları, OTP, SEO ve bakım ayarlarını tek ekranda yönetin.
					</p>
				</div>
				<VChip
					:color="canUpdatePlatform ? 'success' : 'warning'"
					variant="tonal"
					size="small"
				>
					<VIcon
						:start="true"
						:icon="canUpdatePlatform ? 'mdi-shield-check' : 'mdi-lock-outline'"
					/>
					{{ canUpdatePlatform ? 'Düzenleme açık' : 'Salt okunur' }}
				</VChip>
			</VCardText>

			<VProgressLinear v-if="loading" indeterminate />
			<VDivider />

			<VCardText class="site-settings-body">
				<VRow class="settings-layout" no-gutters>
					<VCol cols="12" lg="3" class="settings-sidebar">
						<VList nav density="compact" class="settings-nav">
							<VListItem
								v-for="tab in settingsTabs"
								:key="tab.value"
								:active="activeTab === tab.value"
								:prepend-icon="tab.icon"
								@click="activeTab = tab.value"
							>
								<VListItemTitle>{{ tab.label }}</VListItemTitle>
							</VListItem>
						</VList>
					</VCol>

					<VCol cols="12" lg="9" class="settings-content">
						<VWindow v-model="activeTab" class="settings-window">
					<!-- Genel Ayarlar -->
					<VWindowItem value="general">
						<VContainer>
							<VRow>
								<VCol cols="12">
									<VTextField
										v-model="settings.footerText"
										label="Footer Metni"
										placeholder="© 2024 All rights reserved."
									/>
								</VCol>
								<VCol cols="12">
									<VTextarea
										v-model="settings.footerDescription"
										label="Footer Açıklaması"
										rows="3"
									/>
								</VCol>
								<VCol cols="12">
									<VDivider class="my-4" />
									<h4 class="mb-2">Hesap Bakiye Limiti</h4>
									<p class="text-caption text-grey mb-3">
										Kullanıcıların bu bakiye değerine
										ulaştığında oyun oynaması engellenir ve
										destek ekibiyle iletişime geçmeleri
										istenir.
									</p>
									<VTextField
										v-model.number="
											settings.maxAccountBalance
										"
										label="Maksimum Hesap Bakiyesi (₺)"
										type="number"
										:min="0"
										prepend-inner-icon="mdi-currency-try"
									/>
								</VCol>
								<VCol cols="12">
									<VBtn color="primary" :disabled="!canUpdatePlatform" @click="saveSettings">
										Kaydet
									</VBtn>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					<!-- Logo & Favicon -->
					<VWindowItem value="logo">
						<VContainer>
							<VRow>
								<VCol cols="12" md="6">
									<h3 class="mb-3">Logo</h3>
									<VImg
										v-if="settings.logo"
										:src="getImageUrl(settings.logo)"
										max-height="100"
										max-width="200"
										class="mb-3"
									/>
									<VFileInput
										v-model="logoFile"
										label="Yeni Logo Yükle"
										accept="image/*"
										prepend-icon="mdi-image"
									/>
									<VBtn
										color="primary"
										@click="uploadLogo"
										:disabled="!canUpdatePlatform || !logoFile"
									>
										Logo Yükle
									</VBtn>
								</VCol>
								<VCol cols="12" md="6">
									<h3 class="mb-3">Logo Mini</h3>
									<VImg
										v-if="settings.logoMini"
										:src="getImageUrl(settings.logoMini)"
										max-height="50"
										max-width="50"
										class="mb-3"
									/>
									<VFileInput
										v-model="logoMiniFile"
										label="Yeni Logo Mini Yükle"
										accept="image/*"
										prepend-icon="mdi-image"
									/>
									<VBtn
										color="primary"
										@click="uploadLogoMini"
										:disabled="!canUpdatePlatform || !logoMiniFile"
									>
										Logo Mini Yükle
									</VBtn>
								</VCol>
								<VCol cols="12" md="6">
									<h3 class="mb-3">Favicon</h3>
									<VImg
										v-if="settings.favicon"
										:src="getImageUrl(settings.favicon)"
										max-height="32"
										max-width="32"
										class="mb-3"
									/>
									<VFileInput
										v-model="faviconFile"
										label="Yeni Favicon Yükle"
										accept="image/*"
										prepend-icon="mdi-image"
									/>
									<VBtn
										color="primary"
										@click="uploadFavicon"
										:disabled="!canUpdatePlatform || !faviconFile"
									>
										Favicon Yükle
									</VBtn>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					<!-- Avatarlar -->
					<VWindowItem v-if="!isNewSiteMode" value="avatars">
						<VContainer>
							<VRow>
								<!-- Fallback Avatar Bölümü -->
								<VCol cols="12">
									<h3 class="mb-3">Fallback Avatar</h3>
									<p class="text-medium-emphasis mb-3">
										Kullanıcının avatarı yoksa veya
										bulunamıyorsa bu avatar gösterilir.
									</p>
								</VCol>
								<VCol cols="12" md="6">
									<div class="d-flex align-center gap-4 mb-4">
										<VAvatar size="80" rounded>
											<VImg
												v-if="fallbackAvatar"
												:src="
													getImageUrl(fallbackAvatar)
												"
											/>
											<span v-else>?</span>
										</VAvatar>
										<div>
											<p class="font-weight-medium">
												Mevcut Fallback Avatar
											</p>
											<p
												class="text-medium-emphasis text-sm"
											>
												{{ fallbackAvatar }}
											</p>
										</div>
									</div>
								</VCol>
								<VCol cols="12" md="6">
									<VFileInput
										v-model="fallbackAvatarFile"
										label="Yeni Fallback Avatar Yükle"
										accept="image/jpeg,image/png,image/gif"
										prepend-icon="mdi-account-circle"
									/>
									<VBtn
										color="primary"
										@click="uploadFallbackAvatar"
										:disabled="!canUpdatePlatform || !fallbackAvatarFile"
										class="mt-2"
									>
										Fallback Avatar Yükle
									</VBtn>
								</VCol>

								<VCol cols="12">
									<VDivider class="my-4" />
								</VCol>

								<!-- Avatar Yükleme Bölümü -->
								<VCol cols="12">
									<h3 class="mb-3">Avatar Yükle</h3>
									<p class="text-medium-emphasis mb-3">
										Kullanıcıların seçebileceği avatarları
										yükleyin. JPEG, PNG ve GIF formatları
										desteklenir.
									</p>
								</VCol>
								<VCol cols="12" md="8">
									<VFileInput
										v-model="avatarFiles"
										label="Avatar Dosyaları Seç"
										accept="image/jpeg,image/png,image/gif"
										prepend-icon="mdi-image-multiple"
										multiple
										chips
										show-size
									/>
								</VCol>
								<VCol
									cols="12"
									md="4"
									class="d-flex align-center"
								>
									<VBtn
										color="primary"
										@click="uploadAvatars"
										:disabled="
											!canUpdatePlatform ||
											!avatarFiles ||
											avatarFiles.length === 0
										"
										block
									>
										<VIcon start icon="mdi-upload" />
										Avatarları Yükle
									</VBtn>
								</VCol>

								<VCol cols="12">
									<VDivider class="my-4" />
								</VCol>

								<!-- Avatar Listesi -->
								<VCol cols="12">
									<h3 class="mb-3">
										Mevcut Avatarlar ({{
											avatarList.length
										}})
									</h3>
								</VCol>
								<VCol cols="12">
									<div class="d-flex flex-wrap gap-4">
										<VCard
											v-for="avatar in avatarList"
											:key="avatar.filename"
											width="150"
											class="text-center"
										>
											<VImg
												:src="getImageUrl(avatar.path)"
												height="120"
												cover
											/>
											<VCardActions
												class="justify-center"
											>
												<VBtn
													icon="mdi-star"
													size="small"
													:color="
														fallbackAvatar ===
														avatar.path
															? 'warning'
															: 'default'
													"
													variant="text"
													@click="
														setAsFallback(
															avatar.path
														)
													"
													:disabled="!canUpdatePlatform"
													title="Fallback olarak ayarla"
												/>
												<VBtn
													icon="mdi-delete"
													size="small"
													color="error"
													variant="text"
													@click="
														deleteAvatar(
															avatar.filename
														)
													"
													:disabled="!canUpdatePlatform"
													title="Avatarı sil"
												/>
											</VCardActions>
										</VCard>

										<VCard
											v-if="avatarList.length === 0"
											width="100%"
											class="text-center pa-6"
											variant="outlined"
										>
											<VIcon
												size="48"
												color="grey"
												icon="mdi-image-off"
											/>
											<p
												class="text-medium-emphasis mt-2"
											>
												Henüz avatar yüklenmemiş
											</p>
										</VCard>
									</div>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					<!-- Partnerler -->
					<VWindowItem value="partners">
						<VContainer>
							<VRow>
								<VCol cols="12">
									<h3 class="mb-3">Mevcut Partnerler</h3>
									<VList>
										<VListItem
											v-for="(
												partner, index
											) in settings.partners"
											:key="partner._id"
										>
											<template #prepend>
												<VImg
													:src="
														getImageUrl(
															partner.logo
														)
													"
													max-height="40"
													max-width="80"
												/>
											</template>
											<VListItemTitle>{{
												partner.name
											}}</VListItemTitle>
											<VListItemSubtitle
												v-if="partner.url"
											>
												{{ partner.url }}
											</VListItemSubtitle>
											<template #append>
												<div
													class="d-flex align-center gap-1"
												>
													<VBtn
														icon="mdi-arrow-up"
														size="x-small"
														variant="text"
														:disabled="!canUpdatePlatform || index === 0"
														@click="
															movePartner(
																partner._id,
																'up'
															)
														"
													/>
													<VBtn
														icon="mdi-arrow-down"
														size="x-small"
														variant="text"
														:disabled="
															!canUpdatePlatform ||
															index ===
															settings.partners
																.length -
																1
														"
														@click="
															movePartner(
																partner._id,
																'down'
															)
														"
													/>
													<VBtn
														icon="mdi-pencil"
														size="small"
														color="info"
														variant="text"
														:disabled="!canUpdatePlatform"
														@click="
															openEditPartnerDialog(
																partner
															)
														"
													/>
													<VBtn
														icon="mdi-delete"
														size="small"
														color="error"
														variant="text"
														:disabled="!canUpdatePlatform"
														@click="
															deletePartner(
																partner._id
															)
														"
													/>
												</div>
											</template>
										</VListItem>
									</VList>
								</VCol>
								<VCol cols="12">
									<VDivider class="my-4" />
									<h3 class="mb-3">Yeni Partner Ekle</h3>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="newPartner.name"
										label="Partner Adı"
										required
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="newPartner.url"
										label="Partner URL (opsiyonel)"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model.number="newPartner.order"
										label="Sıralama"
										type="number"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VFileInput
										v-model="partnerFile"
										label="Partner Logo"
										accept="image/*"
										required
									/>
								</VCol>
								<VCol cols="12">
									<VBtn
										color="primary"
										@click="addPartner"
										:disabled="
											!canUpdatePlatform ||
											!partnerFile || !newPartner.name
										"
									>
										Partner Ekle
									</VBtn>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					<!-- Lisanslar -->
					<VWindowItem value="licenses">
						<VContainer>
							<VRow>
								<VCol cols="12">
									<h3 class="mb-3">Mevcut Lisanslar</h3>
									<VList>
										<VListItem
											v-for="(
												license, index
											) in settings.licenses"
											:key="license._id"
										>
											<template #prepend>
												<VImg
													:src="
														getImageUrl(
															license.logo
														)
													"
													max-height="40"
													max-width="80"
												/>
											</template>
											<VListItemTitle>{{
												license.name
											}}</VListItemTitle>
											<VListItemSubtitle
												v-if="license.url"
											>
												{{ license.url }}
											</VListItemSubtitle>
											<template #append>
												<div
													class="d-flex align-center gap-1"
												>
													<VBtn
														icon="mdi-arrow-up"
														size="x-small"
														variant="text"
														:disabled="!canUpdatePlatform || index === 0"
														@click="
															moveLicense(
																license._id,
																'up'
															)
														"
													/>
													<VBtn
														icon="mdi-arrow-down"
														size="x-small"
														variant="text"
														:disabled="
															!canUpdatePlatform ||
															index ===
															settings.licenses
																.length -
																1
														"
														@click="
															moveLicense(
																license._id,
																'down'
															)
														"
													/>
													<VBtn
														icon="mdi-pencil"
														size="small"
														color="info"
														variant="text"
														:disabled="!canUpdatePlatform"
														@click="
															openEditLicenseDialog(
																license
															)
														"
													/>
													<VBtn
														icon="mdi-delete"
														size="small"
														color="error"
														variant="text"
														:disabled="!canUpdatePlatform"
														@click="
															deleteLicense(
																license._id
															)
														"
													/>
												</div>
											</template>
										</VListItem>
									</VList>
								</VCol>
								<VCol cols="12">
									<VDivider class="my-4" />
									<h3 class="mb-3">Yeni Lisans Ekle</h3>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="newLicense.name"
										label="Lisans Adı"
										required
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="newLicense.url"
										label="Lisans URL (opsiyonel)"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VFileInput
										v-model="licenseFile"
										label="Lisans Logo"
										accept="image/*"
										required
									/>
								</VCol>
								<VCol cols="12">
									<VBtn
										color="primary"
										@click="addLicense"
										:disabled="
											!canUpdatePlatform ||
											!licenseFile || !newLicense.name
										"
									>
										Lisans Ekle
									</VBtn>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					<!-- Sosyal Medya -->
					<VWindowItem value="social">
						<VContainer>
							<VRow>
								<VCol cols="12" md="6">
									<VTextField
										v-model="settings.socialLinks.twitter"
										label="Twitter"
										prepend-icon="mdi-twitter"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="settings.socialLinks.discord"
										label="Discord"
										prepend-icon="mdi-discord"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="settings.socialLinks.telegram"
										label="Telegram"
										prepend-icon="mdi-telegram"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="settings.socialLinks.instagram"
										label="Instagram"
										prepend-icon="mdi-instagram"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="settings.socialLinks.youtube"
										label="YouTube"
										prepend-icon="mdi-youtube"
									/>
								</VCol>
								<VCol cols="12">
									<VBtn color="primary" :disabled="!canUpdatePlatform" @click="saveSettings">
										Kaydet
									</VBtn>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					<!-- SEO -->
					<VWindowItem value="seo">
						<VContainer>
							<VRow>
								<VCol cols="12">
									<VTextField
										v-model="settings.seo.title"
										label="Site Başlığı"
									/>
								</VCol>
								<VCol cols="12">
									<VTextarea
										v-model="settings.seo.description"
										label="Site Açıklaması"
										rows="3"
									/>
								</VCol>
								<VCol cols="12">
									<VTextField
										v-model="settings.seo.keywords"
										label="Anahtar Kelimeler (virgülle ayırın)"
									/>
								</VCol>
								<VCol cols="12">
									<VBtn color="primary" :disabled="!canUpdatePlatform" @click="saveSettings">
										Kaydet
									</VBtn>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					<!-- Bakım Modu -->
					<VWindowItem value="maintenance">
						<VContainer>
							<VRow>
								<VCol cols="12">
									<VSwitch
										v-model="settings.maintenanceMode"
										label="Bakım Modu Aktif"
										color="warning"
									/>
								</VCol>
								<VCol cols="12">
									<VTextarea
										v-model="settings.maintenanceMessage"
										label="Bakım Modu Mesajı"
										rows="3"
										:disabled="!settings.maintenanceMode"
									/>
								</VCol>
								<VCol cols="12">
									<VBtn color="primary" :disabled="!canUpdatePlatform" @click="saveSettings">
										Kaydet
									</VBtn>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					<!-- Original Oyunlar -->
					<VWindowItem v-if="!isNewSiteMode" value="original-games">
						<VContainer>
							<VAlert type="info" class="mb-4">
								Original oyunlar için banner yükleyin. Sadece
								PNG formatı kabul edilmektedir. Banner'lar
								otomatik olarak sabit URL'lere kaydedilir.
							</VAlert>
							<VRow>
								<VCol
									cols="12"
									md="6"
									v-for="game in [
										'turbo',
										'crash',
										'wingo',
										'unbox',
										'mines',
										'towers',
										'roll',
									]"
									:key="game"
								>
									<VCard variant="outlined" class="mb-4">
										<VCardTitle class="text-capitalize">{{
											game
										}}</VCardTitle>
										<VCardText>
											<div
												v-if="
													settings.originalGames &&
													settings.originalGames[game]
												"
												class="mb-3"
											>
												<VImg
													:src="
														getImageUrl(
															settings
																.originalGames[
																game
															]
														)
													"
													max-height="100"
													contain
													class="mb-2"
												/>
												<small class="text-muted">{{
													settings.originalGames[game]
												}}</small>
											</div>
											<VFileInput
												v-model="
													originalGameFiles[game]
												"
												:label="`${game} Banner (PNG)`"
												accept="image/png"
												prepend-icon="mdi-image"
											/>
											<VBtn
												color="primary"
												size="small"
												class="mt-2"
												@click="
													uploadOriginalGameBanner(
														game
													)
												"
												:disabled="
													!canUpdatePlatform ||
													!originalGameFiles[game]
												"
											>
												Yükle
											</VBtn>
										</VCardText>
									</VCard>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					<!-- Custom CSS/JS -->
					<VWindowItem value="custom-code">
						<VContainer>
							<VAlert type="warning" class="mb-4">
								Dikkat: Buraya yazdığınız kodlar doğrudan
								frontend'e uygulanır. Hatalı kod site
								çalışmasını engelleyebilir.
							</VAlert>
							<VRow>
								<VCol cols="12">
									<h3 class="mb-2">Custom CSS</h3>
									<VTextarea
										v-model="settings.customCSS"
										label="Custom CSS Kodu"
										rows="10"
										placeholder="/* CSS kodunuzu buraya yazın */
.my-class {
  color: red;
}"
										class="font-monospace"
									/>
									<VBtn
										color="primary"
										class="mt-2"
										:disabled="!canUpdatePlatform"
										@click="saveCustomCSS"
									>
										CSS Kaydet
									</VBtn>
								</VCol>
								<VCol cols="12" class="mt-4">
									<h3 class="mb-2">Custom JavaScript</h3>
									<VTextarea
										v-model="settings.customJS"
										label="Custom JavaScript Kodu"
										rows="10"
										placeholder="// JavaScript kodunuzu buraya yazın
console.log('Custom JS loaded');"
										class="font-monospace"
									/>
									<VBtn
										color="primary"
										class="mt-2"
										:disabled="!canUpdatePlatform"
										@click="saveCustomJS"
									>
										JavaScript Kaydet
									</VBtn>
								</VCol>
								<VCol cols="12" class="mt-4">
									<h3 class="mb-2">Custom HTML</h3>
									<VAlert
										type="info"
										density="compact"
										class="mb-2"
									>
										HTML kodu body sonuna eklenir. Live chat
										widget'ları, analytics scriptleri vb.
										için kullanabilirsiniz.
									</VAlert>
									<VTextarea
										v-model="settings.customHTML"
										label="Custom HTML Kodu"
										rows="10"
										placeholder="<!-- HTML kodunuzu buraya yazın -->
<!--Begin Live Chat Code-->
<div id='chat-widget'></div>
<script>
  // Widget script here
</script>
<!--End Live Chat Code-->"
										class="font-monospace"
									/>
									<VBtn
										color="primary"
										class="mt-2"
										:disabled="!canUpdatePlatform"
										@click="saveCustomHTML"
									>
										HTML Kaydet
									</VBtn>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					<!-- Kategori İkonları -->
					<VWindowItem v-if="!isNewSiteMode" value="category-icons">
						<VContainer>
							<VAlert type="info" class="mb-4">
								<strong>Kategori İkonları</strong> - Oyun
								kategorileri için kullanılan ikonları buradan
								yönetebilirsiniz.
								<br />
								<strong>Not:</strong> Sadece PNG formatında
								dosyalar yüklenebilir. Dosya yolları sabit
								kalacaktır.
							</VAlert>

							<VRow>
								<!-- Lobby İkonu -->
								<VCol cols="12" md="6">
									<VCard variant="outlined" class="pa-4">
										<VCardTitle class="text-h6">
											<VIcon start>mdi-home</VIcon>
											Lobby İkonu
										</VCardTitle>
										<VCardText>
											<div
												class="d-flex align-center gap-4 mb-4"
											>
												<VAvatar
													size="80"
													rounded="lg"
													color="grey-lighten-3"
												>
													<VImg
														v-if="
															getCategoryIconUrl(
																'lobby'
															)
														"
														:src="
															getCategoryIconUrl(
																'lobby'
															)
														"
														alt="Lobby"
													/>
													<VIcon
														v-else
														size="40"
														color="grey"
														>mdi-image-off</VIcon
													>
												</VAvatar>
												<div>
													<div
														class="text-body-2 text-grey"
													>
														Dosya Yolu:
													</div>
													<code
														>/uploads/category/lobby.png</code
													>
												</div>
											</div>
											<VFileInput
												v-model="
													categoryIconFiles.lobby
												"
												label="PNG Dosyası Seçin"
												accept="image/png"
												prepend-icon="mdi-camera"
												show-size
												density="compact"
											/>
											<VBtn
												color="primary"
												class="mt-2"
												:loading="
													categoryIconLoading.lobby
												"
												:disabled="
													!canUpdatePlatform ||
													!categoryIconFiles.lobby
												"
												@click="
													uploadCategoryIcon('lobby')
												"
											>
												<VIcon start>mdi-upload</VIcon>
												Yükle
											</VBtn>
										</VCardText>
									</VCard>
								</VCol>

								<!-- Originals İkonu -->
								<VCol cols="12" md="6">
									<VCard variant="outlined" class="pa-4">
										<VCardTitle class="text-h6">
											<VIcon start>mdi-star</VIcon>
											Originals İkonu
										</VCardTitle>
										<VCardText>
											<div
												class="d-flex align-center gap-4 mb-4"
											>
												<VAvatar
													size="80"
													rounded="lg"
													color="grey-lighten-3"
												>
													<VImg
														v-if="
															getCategoryIconUrl(
																'originals'
															)
														"
														:src="
															getCategoryIconUrl(
																'originals'
															)
														"
														alt="Originals"
													/>
													<VIcon
														v-else
														size="40"
														color="grey"
														>mdi-image-off</VIcon
													>
												</VAvatar>
												<div>
													<div
														class="text-body-2 text-grey"
													>
														Dosya Yolu:
													</div>
													<code
														>/uploads/category/originals.png</code
													>
												</div>
											</div>
											<VFileInput
												v-model="
													categoryIconFiles.originals
												"
												label="PNG Dosyası Seçin"
												accept="image/png"
												prepend-icon="mdi-camera"
												show-size
												density="compact"
											/>
											<VBtn
												color="primary"
												class="mt-2"
												:loading="
													categoryIconLoading.originals
												"
												:disabled="
													!canUpdatePlatform ||
													!categoryIconFiles.originals
												"
												@click="
													uploadCategoryIcon(
														'originals'
													)
												"
											>
												<VIcon start>mdi-upload</VIcon>
												Yükle
											</VBtn>
										</VCardText>
									</VCard>
								</VCol>

								<!-- Favorites İkonu -->
								<VCol cols="12" md="6">
									<VCard variant="outlined" class="pa-4">
										<VCardTitle class="text-h6">
											<VIcon start>mdi-heart</VIcon>
											Favorites İkonu
										</VCardTitle>
										<VCardText>
											<div
												class="d-flex align-center gap-4 mb-4"
											>
												<VAvatar
													size="80"
													rounded="lg"
													color="grey-lighten-3"
												>
													<VImg
														v-if="
															getCategoryIconUrl(
																'favorites'
															)
														"
														:src="
															getCategoryIconUrl(
																'favorites'
															)
														"
														alt="Favorites"
													/>
													<VIcon
														v-else
														size="40"
														color="grey"
														>mdi-image-off</VIcon
													>
												</VAvatar>
												<div>
													<div
														class="text-body-2 text-grey"
													>
														Dosya Yolu:
													</div>
													<code
														>/uploads/category/favorites.png</code
													>
												</div>
											</div>
											<VFileInput
												v-model="
													categoryIconFiles.favorites
												"
												label="PNG Dosyası Seçin"
												accept="image/png"
												prepend-icon="mdi-camera"
												show-size
												density="compact"
											/>
											<VBtn
												color="primary"
												class="mt-2"
												:loading="
													categoryIconLoading.favorites
												"
												:disabled="
													!canUpdatePlatform ||
													!categoryIconFiles.favorites
												"
												@click="
													uploadCategoryIcon(
														'favorites'
													)
												"
											>
												<VIcon start>mdi-upload</VIcon>
												Yükle
											</VBtn>
										</VCardText>
									</VCard>
								</VCol>

								<!-- Hot İkonu -->
								<VCol cols="12" md="6">
									<VCard variant="outlined" class="pa-4">
										<VCardTitle class="text-h6">
											<VIcon start>mdi-fire</VIcon>
											Hot İkonu
										</VCardTitle>
										<VCardText>
											<div
												class="d-flex align-center gap-4 mb-4"
											>
												<VAvatar
													size="80"
													rounded="lg"
													color="grey-lighten-3"
												>
													<VImg
														v-if="
															getCategoryIconUrl(
																'hot'
															)
														"
														:src="
															getCategoryIconUrl(
																'hot'
															)
														"
														alt="Hot"
													/>
													<VIcon
														v-else
														size="40"
														color="grey"
														>mdi-image-off</VIcon
													>
												</VAvatar>
												<div>
													<div
														class="text-body-2 text-grey"
													>
														Dosya Yolu:
													</div>
													<code
														>/uploads/category/hot.png</code
													>
												</div>
											</div>
											<VFileInput
												v-model="categoryIconFiles.hot"
												label="PNG Dosyası Seçin"
												accept="image/png"
												prepend-icon="mdi-camera"
												show-size
												density="compact"
											/>
											<VBtn
												color="primary"
												class="mt-2"
												:loading="
													categoryIconLoading.hot
												"
												:disabled="
													!canUpdatePlatform ||
													!categoryIconFiles.hot
												"
												@click="
													uploadCategoryIcon('hot')
												"
											>
												<VIcon start>mdi-upload</VIcon>
												Yükle
											</VBtn>
										</VCardText>
									</VCard>
								</VCol>
							</VRow>

							<VDivider class="my-6" />

							<VAlert type="warning" variant="tonal">
								<strong>Dikkat:</strong> Yüklenen ikonlar mevcut
								dosyaların üzerine yazılır. Değişikliklerin
								görünmesi için tarayıcı önbelleğini temizlemeniz
								gerekebilir.
							</VAlert>
						</VContainer>
					</VWindowItem>

					<!-- Provider Ayarları -->
					<VWindowItem value="provider-settings">
						<VContainer>
							<VAlert type="info" class="mb-4">
								<strong>Provider Ayarları</strong> — Oyun sağlayıcılarına ait
								genel ayarları bu bölümden yönetebilirsiniz.
							</VAlert>
							<VRow>
								<VCol cols="12">
									<h3 class="mb-3">Drakon</h3>
								</VCol>
								<VCol cols="12" md="6">
									<VSwitch
										v-model="settings.providerSettings.drakonEnabled"
										label="Drakon Oyunları Açık"
										color="success"
										hint="Kapalıyken Drakon oyunları başlatılamaz ve kullanıcıya hata mesajı gösterilir."
										persistent-hint
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="settings.providerSettings.drakonDisabledMessage"
										label="Kapalıyken Gösterilecek Hata Mesajı"
										placeholder="Şu anda bu oyuna erişilemiyor."
										hint="Boş bırakılırsa varsayılan mesaj kullanılır."
										persistent-hint
										:disabled="settings.providerSettings.drakonEnabled"
									/>
								</VCol>
								<VCol cols="12">
									<VSwitch
										v-model="settings.providerSettings.drakonBalanceSync"
										label="Drakon Balance Senkronizasyonu"
										color="success"
										hint="Kapalıyken Drakon API'ye kullanıcı bakiyesi 0 olarak gönderilir."
										persistent-hint
									/>
								</VCol>

								<VCol cols="12">
									<VDivider class="my-4" />
									<h3 class="mb-3">Görünen Provider Adları</h3>
									<VAlert type="info" variant="tonal" density="compact" class="mb-4">
										Bu alan yalnızca admin panelde görünen isimleri değiştirir. Kod ve API entegrasyonları orijinal provider kodlarıyla çalışmaya devam eder.
									</VAlert>
								</VCol>
								<VCol
									v-for="provider in providerDisplayNameRows"
									:key="provider.code"
									cols="12"
									md="6"
								>
									<VTextField
										v-model="settings.providerSettings.providerDisplayNames[provider.code]"
										:label="`${provider.defaultName} görünen adı`"
										:placeholder="provider.defaultName"
										:hint="`Kod: ${provider.code}`"
										persistent-hint
									/>
								</VCol>

								<VCol cols="12">
									<VDivider class="my-4" />
									<h3 class="mb-3">Sportsbook</h3>
								</VCol>
								<VCol cols="12" md="6">
									<VSelect
										v-model="settings.providerSettings.sportsbookProvider"
										:items="[
											{ title: 'Betcolabs (Webspor)', value: 'betcolabs' },
											{ title: 'Nexus GGR Sportsbook', value: 'nexusggr' },
										]"
										label="Sportsbook Sağlayıcı"
										hint="Aktif sportsbook sağlayıcısını seçin. Değişiklik yapıldığında kullanıcılar yeni sağlayıcının sportsbook'unu görmeye başlar."
										persistent-hint
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VAlert type="warning" variant="tonal" density="compact">
										<template v-if="settings.providerSettings.sportsbookProvider === 'betcolabs'">
											<strong>Betcolabs</strong> aktif. Betcolabs callback'leri üzerinden bahisler işlenir.
										</template>
										<template v-else>
											<strong>Nexus GGR</strong> aktif. Nexus seamless API üzerinden bahisler işlenir. NEXUS_API_ENDPOINT, NEXUS_AGENT_CODE ve NEXUS_AGENT_TOKEN env değişkenlerinin doğru ayarlandığından emin olun.
										</template>
									</VAlert>
								</VCol>

								<VCol cols="12">
									<VBtn
										color="primary"
										@click="saveProviderSettings"
										:disabled="!canUpdatePlatform"
										:loading="loading"
									>
										Provider Ayarlarını Kaydet
									</VBtn>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					<VWindowItem v-if="canReadApiSettings" value="api-settings">
						<VContainer>
							<VAlert type="info" class="mb-4">
								<strong>ForceLab API Ayarları</strong> - Rapor ve ControlGame ekranlarının kullanacağı endpoint, agent ve method bilgileri bu özel yetkili alandan yönetilir.
							</VAlert>
							<VRow>
								<VCol cols="12">
									<h3 class="mb-3">Rapor API</h3>
								</VCol>
								<VCol cols="12" md="4">
									<VSwitch
										v-model="settings.apiSettings.betinoviReports.enabled"
										label="Rapor API Aktif"
										color="success"
									/>
								</VCol>
								<VCol cols="12" md="8" class="d-flex align-center flex-wrap gap-2">
									<VChip
										v-if="settings.apiSettings.betinoviReports.envFallbacks?.baseUrl"
										color="info"
										variant="tonal"
										size="small"
									>
										.env API URL kullanılıyor
									</VChip>
									<VChip
										v-if="settings.apiSettings.betinoviReports.envFallbacks?.agentCode"
										color="info"
										variant="tonal"
										size="small"
									>
										.env Agent Code kullanılıyor
									</VChip>
									<VChip
										v-if="settings.apiSettings.betinoviReports.envFallbacks?.agentToken"
										color="info"
										variant="tonal"
										size="small"
									>
										.env Token kullanılıyor
									</VChip>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="settings.apiSettings.betinoviReports.baseUrl"
										label="Rapor API URL"
										placeholder="https://api.example.com/api/casinoapi"
										prepend-icon="mdi-link-variant"
									/>
								</VCol>
								<VCol cols="12" md="3">
									<VTextField
										v-model="settings.apiSettings.betinoviReports.agentCode"
										label="Agent Code"
										prepend-icon="mdi-account-key"
									/>
								</VCol>
								<VCol cols="12" md="3">
									<VTextField
										v-model="settings.apiSettings.betinoviReports.agentToken"
										label="Agent Token"
										type="password"
										prepend-icon="mdi-shield-key"
									/>
								</VCol>
								<VCol cols="12" md="3">
									<VTextField
										v-model="settings.apiSettings.betinoviReports.currencyCode"
										label="Para Birimi"
										placeholder="TRY"
									/>
								</VCol>
								<VCol cols="12" md="3">
									<VTextField
										v-model.number="settings.apiSettings.betinoviReports.timeoutMs"
										label="Timeout (ms)"
										type="number"
										:min="1000"
									/>
								</VCol>
								<VCol cols="12">
									<VDivider class="my-4" />
									<h4 class="mb-3">Rapor Method Eşleşmeleri</h4>
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.betinoviReports.methods.wagerIndex" label="Bahis indeksine göre" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.betinoviReports.methods.byAgent" label="Temsilciye göre" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.betinoviReports.methods.byVendor" label="Vendora göre" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.betinoviReports.methods.settlement" label="Mutabakat" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.betinoviReports.methods.riskUsers" label="Riskli kullanıcılar" />
								</VCol>

								<VCol cols="12">
									<VDivider class="my-6" />
									<h3 class="mb-3">ControlGame API</h3>
								</VCol>
								<VCol cols="12" md="4">
									<VSwitch
										v-model="settings.apiSettings.controlGame.enabled"
										label="ControlGame API Aktif"
										color="success"
									/>
								</VCol>
								<VCol cols="12" md="8" class="d-flex align-center flex-wrap gap-2">
									<VChip
										v-if="settings.apiSettings.controlGame.envFallbacks?.baseUrl"
										color="info"
										variant="tonal"
										size="small"
									>
										.env API URL kullanılıyor
									</VChip>
									<VChip
										v-if="settings.apiSettings.controlGame.envFallbacks?.agentCode"
										color="info"
										variant="tonal"
										size="small"
									>
										.env Agent Code kullanılıyor
									</VChip>
									<VChip
										v-if="settings.apiSettings.controlGame.envFallbacks?.agentToken"
										color="info"
										variant="tonal"
										size="small"
									>
										.env Token kullanılıyor
									</VChip>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="settings.apiSettings.controlGame.baseUrl"
										label="ControlGame API URL"
										placeholder="https://api.example.com/api/casinoapi"
										prepend-icon="mdi-link-variant"
									/>
								</VCol>
								<VCol cols="12" md="3">
									<VTextField
										v-model="settings.apiSettings.controlGame.agentCode"
										label="Agent Code"
										prepend-icon="mdi-account-key"
									/>
								</VCol>
								<VCol cols="12" md="3">
									<VTextField
										v-model="settings.apiSettings.controlGame.agentToken"
										label="Agent Token"
										type="password"
										prepend-icon="mdi-shield-key"
									/>
								</VCol>
								<VCol cols="12" md="3">
									<VTextField
										v-model="settings.apiSettings.controlGame.currencyCode"
										label="Para Birimi"
										placeholder="TRY"
									/>
								</VCol>
								<VCol cols="12" md="3">
									<VTextField
										v-model.number="settings.apiSettings.controlGame.timeoutMs"
										label="Timeout (ms)"
										type="number"
										:min="1000"
									/>
								</VCol>
								<VCol cols="12">
									<VDivider class="my-4" />
									<h4 class="mb-3">ControlGame Method Eşleşmeleri</h4>
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.controlGame.methods.onlineUsers" label="Oyundaki kullanıcılar" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.controlGame.methods.vendorGames" label="Vendor oyun listesi" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.controlGame.methods.callList" label="Call listesi" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.controlGame.methods.callHistory" label="Call geçmişi" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.controlGame.methods.applyCall" label="Call uygula" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.controlGame.methods.cancelCall" label="Call iptal" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.controlGame.methods.getUserSetting" label="Kullanıcı RTP oku" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.controlGame.methods.changeUserSetting" label="Kullanıcı RTP değiştir" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.controlGame.methods.getAgentSetting" label="Agent RTP oku" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.controlGame.methods.changeAgentSetting" label="Agent RTP değiştir" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.controlGame.methods.freeRoundList" label="Freeround listesi" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.controlGame.methods.applyFreeRound" label="Freeround uygula" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.apiSettings.controlGame.methods.cancelFreeRound" label="Freeround iptal" />
								</VCol>

								<VCol cols="12">
									<VBtn
										color="primary"
										@click="saveApiSettings"
										:disabled="!canUpdateApiSettings"
										:loading="loading"
									>
										ForceLab API Ayarlarını Kaydet
									</VBtn>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					<VWindowItem value="sms-otp">
						<VContainer>
							<VAlert type="warning" class="mb-4">
								<strong>SMS OTP Ayarları</strong> MFA SMS doğrulama akışı yeni UIPAPP Hub API üzerinden çalışır. Dokümanda verilen API anahtarını aşağıdaki alana kaydedin.
								<br />
								Bu alan public site ayarları yanıtına eklenmez.
								<br />
								<strong>Not:</strong> Encryption Key veya Hash Secret değiştirilirse o sırada aktif olan OTP challenge'larının yeniden gönderilmesi gerekir.
							</VAlert>
							<VRow>
								<VCol cols="12" md="6">
									<VTextField
										v-model="settings.smsOtp.apiKey"
										label="UIPAPP API Key"
										type="password"
										prepend-icon="mdi-key"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="settings.smsOtp.baseUrl"
										label="API Endpoint"
										placeholder="https://sms.uipapp.com/api/v1/hub/index.php"
									/>
								</VCol>
								<VCol cols="12" md="4">
									<VTextField
										v-model.number="settings.smsOtp.otpTtlMs"
										label="OTP Geçerlilik Süresi (ms)"
										type="number"
										:min="1000"
									/>
								</VCol>
								<VCol cols="12" md="4">
									<VTextField
										v-model.number="settings.smsOtp.resendCooldownMs"
										label="Yeniden Gönderim Bekleme Süresi (ms)"
										type="number"
										:min="1000"
									/>
								</VCol>
								<VCol cols="12" md="4">
									<VTextField
										v-model.number="settings.smsOtp.maxAttempts"
										label="Maksimum Deneme"
										type="number"
										:min="1"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="settings.smsOtp.encryptionKey"
										label="Encryption Key"
										type="password"
										prepend-icon="mdi-lock"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="settings.smsOtp.hashSecret"
										label="Hash Secret"
										type="password"
										prepend-icon="mdi-shield-key"
									/>
								</VCol>
								<VCol cols="12">
									<VBtn
										color="primary"
										@click="saveSmsOtpSettings"
										:disabled="!canUpdatePlatform"
										:loading="loading"
									>
										SMS OTP Ayarlarını Kaydet
									</VBtn>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					<VWindowItem value="email-templates">
						<VContainer>
							<VAlert
								:type="
									emailTemplates.smtp &&
									emailTemplates.smtp.hostConfigured
										? 'info'
										: 'warning'
								"
								class="mb-4"
							>
								<strong>SMTP Yapılandırması</strong>
								<div class="mt-1">
									SMTP host / port / kullanıcı / şifre bilgileri
									<code>backend/.env</code> üzerindeki
									<code>EMAIL_SMTP_*</code> değişkenlerinden okunur.
								</div>
								<div class="mt-2">
									<strong>Durum:</strong>
									<span
										v-if="
											emailTemplates.smtp &&
											emailTemplates.smtp.hostConfigured
										"
									>
										SMTP host yapılandırılmış.
									</span>
									<span v-else>
										SMTP host yapılandırılmamış. Mailler
										gönderilemeyecek.
									</span>
								</div>
								<div
									v-if="emailTemplates.smtp && emailTemplates.smtp.fromAddressEnv"
									class="mt-1 text-caption"
								>
									.env içindeki gönderici adresi:
									<code>{{ emailTemplates.smtp.fromAddressEnv }}</code>
								</div>
							</VAlert>

							<VAlert type="info" variant="tonal" class="mb-4">
								<strong>Placeholder kullanımı</strong>
								<div class="mt-1" style="font-size: 13px;">
									HTML içinde
									<code v-pre>{{anahtar}}</code>
									biçiminde yazdığın değişkenler maile gönderilirken otomatik olarak doldurulur.
									URL içeren placeholder'lar (
									<code v-pre>{{verifyUrl}}</code>,
									<code v-pre>{{resetUrl}}</code>,
									<code v-pre>{{changeEmailUrl}}</code>,
									<code v-pre>{{siteUrl}}</code>,
									<code v-pre>{{token}}</code>
									) olduğu gibi yazılır; diğer tüm değerler güvenlik için HTML-escape edilir.
								</div>
								<div class="mt-2" style="font-size: 13px;">
									Hangi placeholder'ın hangi şablonda geçerli olduğu, ilgili şablonun başındaki
									<strong>"Placeholder Listesi"</strong> bölümünden görülebilir. Üzerine tıklayarak panoya
									kopyalayabilirsin.
								</div>
							</VAlert>

							<VRow>
								<VCol cols="12" md="6">
									<VTextField
										v-model="emailTemplates.fromName"
										label="Gönderici Görünen Adı (boş bırakılırsa .env)"
										placeholder="Raxen Casino"
										prepend-icon="mdi-account-tie"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model="emailTemplates.fromAddress"
										label="Gönderici E-posta Adresi (boş bırakılırsa .env)"
										placeholder="no-reply@example.com"
										prepend-icon="mdi-email"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<VTextField
										v-model.number="
											emailTemplates.tokenExpiresInMinutes
										"
										label="Link Geçerlilik Süresi (dakika)"
										type="number"
										:min="5"
										prepend-icon="mdi-clock-outline"
									/>
								</VCol>
							</VRow>

							<VDivider class="my-6" />
							<h3 class="mb-3">E-posta OTP Şablonu</h3>
							<p class="text-caption mb-3">
								MFA yöntemi <code>email</code> olan kullanıcılar için
								login ve OTP yeniden gönderimlerinde tetiklenir.
								<code v-pre>{{expiresInMinutes}}</code>
								değeri OTP Ayarları sekmesindeki OTP geçerlilik süresinden hesaplanır.
							</p>
							<VExpansionPanels variant="accordion" class="mb-4">
								<VExpansionPanel>
									<VExpansionPanelTitle>
										<VIcon start icon="mdi-tag-multiple" />
										Placeholder Listesi (E-posta OTP)
									</VExpansionPanelTitle>
									<VExpansionPanelText>
										<VList density="compact">
											<VListItem
												v-for="ph in emailTemplatePlaceholders.emailOtp"
												:key="ph.key"
												@click="copyPlaceholder(ph.key)"
												style="cursor: pointer;"
											>
												<template #prepend>
													<VIcon
														icon="mdi-content-copy"
														size="small"
														class="me-2"
													/>
												</template>
												<VListItemTitle
													style="font-family: monospace; font-size: 13px;"
												>
													{{ ph.key }}
												</VListItemTitle>
												<VListItemSubtitle>
													{{ ph.desc }}
												</VListItemSubtitle>
											</VListItem>
										</VList>
									</VExpansionPanelText>
								</VExpansionPanel>
							</VExpansionPanels>
							<VRow>
								<VCol cols="12">
									<VTextField
										v-model="emailTemplates.emailOtp.subject"
										label="Konu"
										placeholder="Giriş doğrulama kodunuz"
									/>
								</VCol>
								<VCol cols="12">
									<VTextarea
										v-model="emailTemplates.emailOtp.html"
										label="HTML İçerik"
										rows="10"
										auto-grow
										style="font-family: monospace;"
									/>
								</VCol>
							</VRow>

							<VDivider class="my-6" />
							<h3 class="mb-3">E-posta Doğrulama Şablonu</h3>
							<p class="text-caption mb-3">
								Kullanıcı kayıt sonrası ya da
								<code>POST /auth/credentials/request</code>
								(<code>type: "verify"</code>) ile tetiklenir.
							</p>
							<VExpansionPanels variant="accordion" class="mb-4">
								<VExpansionPanel>
									<VExpansionPanelTitle>
										<VIcon start icon="mdi-tag-multiple" />
										Placeholder Listesi (E-posta Doğrulama)
									</VExpansionPanelTitle>
									<VExpansionPanelText>
										<VList density="compact">
											<VListItem
												v-for="ph in emailTemplatePlaceholders.verifyEmail"
												:key="ph.key"
												@click="copyPlaceholder(ph.key)"
												style="cursor: pointer;"
											>
												<template #prepend>
													<VIcon
														icon="mdi-content-copy"
														size="small"
														class="me-2"
													/>
												</template>
												<VListItemTitle
													style="font-family: monospace; font-size: 13px;"
												>
													{{ ph.key }}
												</VListItemTitle>
												<VListItemSubtitle>
													{{ ph.desc }}
												</VListItemSubtitle>
											</VListItem>
										</VList>
									</VExpansionPanelText>
								</VExpansionPanel>
							</VExpansionPanels>
							<VRow>
								<VCol cols="12">
									<VTextField
										v-model="
											emailTemplates.verifyEmail.subject
										"
										label="Konu"
										placeholder="E-posta adresinizi doğrulayın"
									/>
								</VCol>
								<VCol cols="12">
									<VTextarea
										v-model="emailTemplates.verifyEmail.html"
										label="HTML İçerik"
										rows="10"
										auto-grow
										style="font-family: monospace;"
									/>
								</VCol>
							</VRow>

							<VDivider class="my-6" />
							<h3 class="mb-3">Şifre Sıfırlama Şablonu</h3>
							<p class="text-caption mb-3">
								<code>POST /auth/credentials/request</code>
								(<code>type: "reset"</code>) ile tetiklenir.
							</p>
							<VExpansionPanels variant="accordion" class="mb-4">
								<VExpansionPanel>
									<VExpansionPanelTitle>
										<VIcon start icon="mdi-tag-multiple" />
										Placeholder Listesi (Şifre Sıfırlama)
									</VExpansionPanelTitle>
									<VExpansionPanelText>
										<VList density="compact">
											<VListItem
												v-for="ph in emailTemplatePlaceholders.resetPassword"
												:key="ph.key"
												@click="copyPlaceholder(ph.key)"
												style="cursor: pointer;"
											>
												<template #prepend>
													<VIcon
														icon="mdi-content-copy"
														size="small"
														class="me-2"
													/>
												</template>
												<VListItemTitle
													style="font-family: monospace; font-size: 13px;"
												>
													{{ ph.key }}
												</VListItemTitle>
												<VListItemSubtitle>
													{{ ph.desc }}
												</VListItemSubtitle>
											</VListItem>
										</VList>
									</VExpansionPanelText>
								</VExpansionPanel>
							</VExpansionPanels>
							<VRow>
								<VCol cols="12">
									<VTextField
										v-model="
											emailTemplates.resetPassword.subject
										"
										label="Konu"
										placeholder="Şifre sıfırlama talebi"
									/>
								</VCol>
								<VCol cols="12">
									<VTextarea
										v-model="
											emailTemplates.resetPassword.html
										"
										label="HTML İçerik"
										rows="10"
										auto-grow
										style="font-family: monospace;"
									/>
								</VCol>
							</VRow>

							<VDivider class="my-6" />
							<h3 class="mb-3">E-posta Değiştirme Şablonu</h3>
							<p class="text-caption mb-3">
								<code>POST /users/email-change/request</code>
								çağrıldığında <strong>yeni</strong> e-posta
								adresine gönderilir.
							</p>
							<VExpansionPanels variant="accordion" class="mb-4">
								<VExpansionPanel>
									<VExpansionPanelTitle>
										<VIcon start icon="mdi-tag-multiple" />
										Placeholder Listesi (E-posta Değiştirme)
									</VExpansionPanelTitle>
									<VExpansionPanelText>
										<VList density="compact">
											<VListItem
												v-for="ph in emailTemplatePlaceholders.changeEmail"
												:key="ph.key"
												@click="copyPlaceholder(ph.key)"
												style="cursor: pointer;"
											>
												<template #prepend>
													<VIcon
														icon="mdi-content-copy"
														size="small"
														class="me-2"
													/>
												</template>
												<VListItemTitle
													style="font-family: monospace; font-size: 13px;"
												>
													{{ ph.key }}
												</VListItemTitle>
												<VListItemSubtitle>
													{{ ph.desc }}
												</VListItemSubtitle>
											</VListItem>
										</VList>
									</VExpansionPanelText>
								</VExpansionPanel>
							</VExpansionPanels>
							<VRow>
								<VCol cols="12">
									<VTextField
										v-model="
											emailTemplates.changeEmail.subject
										"
										label="Konu"
										placeholder="Yeni e-posta adresinizi doğrulayın"
									/>
								</VCol>
								<VCol cols="12">
									<VTextarea
										v-model="emailTemplates.changeEmail.html"
										label="HTML İçerik"
										rows="10"
										auto-grow
										style="font-family: monospace;"
									/>
								</VCol>
							</VRow>

							<VDivider class="my-6" />
							<VRow>
								<VCol cols="12">
									<VBtn
										color="primary"
										@click="saveEmailTemplates"
										:disabled="!canUpdatePlatform"
										:loading="loading"
									>
										E-posta Şablonlarını Kaydet
									</VBtn>
								</VCol>
							</VRow>

							<VDivider class="my-6" />
							<h3 class="mb-3">Test E-postası Gönder</h3>
							<VRow>
								<VCol cols="12" md="5">
									<VTextField
										v-model="emailTestRecipient"
										label="Alıcı E-posta"
										placeholder="ornek@mail.com"
										prepend-icon="mdi-send"
									/>
								</VCol>
								<VCol cols="12" md="4">
									<VSelect
										v-model="emailTestType"
										label="Şablon"
										:items="[
											{ title: 'E-posta Doğrulama', value: 'verifyEmail' },
											{ title: 'Şifre Sıfırlama', value: 'resetPassword' },
											{ title: 'E-posta Değiştirme', value: 'changeEmail' },
											{ title: 'E-posta OTP', value: 'emailOtp' },
										]"
										item-title="title"
										item-value="value"
									/>
								</VCol>
								<VCol cols="12" md="3" class="d-flex align-center">
									<VBtn
										color="success"
										@click="sendTestEmail"
										:disabled="!canUpdatePlatform"
										:loading="loading"
										block
									>
										Test Gönder
									</VBtn>
								</VCol>
							</VRow>
						</VContainer>
					</VWindowItem>

					</VWindow>
					</VCol>
				</VRow>
			</VCardText>
		</VCard>

		<!-- Partner Edit Dialog -->
		<VDialog v-model="editPartnerDialog" max-width="500">
			<VCard>
				<VCardTitle>Partner Düzenle</VCardTitle>
				<VCardText>
					<VContainer>
						<VRow>
							<VCol cols="12">
								<VImg
									v-if="editingPartner.logo"
									:src="getImageUrl(editingPartner.logo)"
									max-height="60"
									max-width="120"
									class="mb-3"
								/>
							</VCol>
							<VCol cols="12">
								<VTextField
									v-model="editingPartner.name"
									label="Partner Adı"
									required
								/>
							</VCol>
							<VCol cols="12">
								<VTextField
									v-model="editingPartner.url"
									label="Partner URL (opsiyonel)"
								/>
							</VCol>
							<VCol cols="12">
								<VFileInput
									v-model="editPartnerFile"
									label="Yeni Logo (opsiyonel)"
									accept="image/*"
									prepend-icon="mdi-image"
								/>
							</VCol>
						</VRow>
					</VContainer>
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn color="grey" @click="editPartnerDialog = false"
						>İptal</VBtn
					>
					<VBtn
						color="primary"
						@click="updatePartner"
						:disabled="!canUpdatePlatform || !editingPartner.name"
						>Kaydet</VBtn
					>
				</VCardActions>
			</VCard>
		</VDialog>

		<!-- License Edit Dialog -->
		<VDialog v-model="editLicenseDialog" max-width="500">
			<VCard>
				<VCardTitle>Lisans Düzenle</VCardTitle>
				<VCardText>
					<VContainer>
						<VRow>
							<VCol cols="12">
								<VImg
									v-if="editingLicense.logo"
									:src="getImageUrl(editingLicense.logo)"
									max-height="60"
									max-width="120"
									class="mb-3"
								/>
							</VCol>
							<VCol cols="12">
								<VTextField
									v-model="editingLicense.name"
									label="Lisans Adı"
									required
								/>
							</VCol>
							<VCol cols="12">
								<VTextField
									v-model="editingLicense.url"
									label="Lisans URL (opsiyonel)"
								/>
							</VCol>
							<VCol cols="12">
								<VFileInput
									v-model="editLicenseFile"
									label="Yeni Logo (opsiyonel)"
									accept="image/*"
									prepend-icon="mdi-image"
								/>
							</VCol>
						</VRow>
					</VContainer>
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn color="grey" @click="editLicenseDialog = false"
						>İptal</VBtn
					>
					<VBtn
						color="primary"
						@click="updateLicense"
						:disabled="!canUpdatePlatform || !editingLicense.name"
						>Kaydet</VBtn
					>
				</VCardActions>
			</VCard>
		</VDialog>
	</div>
</template>

<route lang="yaml">
meta:
  action: read
  subject: platform
</route>

<style lang="scss" scoped>
.site-settings-page {
	max-inline-size: 1480px;
	margin-inline: auto;
}

.site-settings-shell {
	overflow: hidden;
}

.site-settings-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 24px;
	padding: 28px 32px;
}

.site-settings-eyebrow {
	color: rgba(var(--v-theme-primary), 1);
	font-size: 0.75rem;
	font-weight: 700;
	text-transform: uppercase;
}

.site-settings-title {
	margin: 4px 0 8px;
	font-size: 1.75rem;
	font-weight: 700;
}

.site-settings-subtitle {
	max-inline-size: 720px;
	margin: 0;
	color: rgba(var(--v-theme-on-surface), 0.68);
}

.site-settings-body {
	padding: 0;
}

.settings-layout {
	min-block-size: 680px;
}

.settings-sidebar {
	border-inline-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
	background: rgba(var(--v-theme-on-surface), 0.02);
}

.settings-nav {
	position: sticky;
	top: 88px;
	max-block-size: calc(100vh - 120px);
	overflow: auto;
	padding: 16px;
}

.settings-content {
	min-inline-size: 0;
}

.settings-window {
	padding: 28px;
}

.settings-window :deep(.v-container) {
	max-inline-size: none;
	padding: 0;
}

.settings-window :deep(.v-card) {
	border-radius: 8px;
}

.settings-window :deep(.v-alert),
.settings-window :deep(.v-input) {
	margin-block-end: 14px;
}

@media (max-width: 1279px) {
	.site-settings-header {
		padding: 24px;
	}

	.settings-sidebar {
		border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
		border-inline-end: 0;
	}

	.settings-nav {
		position: static;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		max-block-size: none;
	}

	.settings-window {
		padding: 24px;
	}
}

@media (max-width: 767px) {
	.site-settings-header {
		flex-direction: column;
		padding: 20px;
	}

	.settings-window {
		padding: 18px;
	}
}
</style>
