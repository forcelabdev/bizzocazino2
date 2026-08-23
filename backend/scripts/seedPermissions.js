/**
 * Kullanım: node scripts/seedPermissions.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Permission = require("../database/models/Permission");
const AdminRole = require("../database/models/AdminRole");

// Bağlantı
const connectDB = async () => {
	try {
		await mongoose.connect(process.env.DATABASE_URI);
		console.log("✅ MongoDB connected");
	} catch (err) {
		console.error("❌ MongoDB connection error:", err);
		process.exit(1);
	}
};

// Varsayılan permission'lar
const defaultPermissions = [
	// Dashboard
	{
		code: "dashboard.read",
		name: "Dashboard Görüntüle",
		resource: "dashboard",
		action: "read",
		group: "Dashboard",
	},
	{
		code: "dashboard.manage",
		name: "Dashboard Yönet",
		resource: "dashboard",
		action: "manage",
		group: "Dashboard",
	},

	// Users
	{
		code: "users.read",
		name: "Kullanıcıları Görüntüle",
		resource: "users",
		action: "read",
		group: "Kullanıcılar",
	},
	{
		code: "users.listDetails.read",
		name: "Kullanıcı Listesi Detaylarını Görüntüle",
		description:
			"Kullanıcı listesinde telefon, e-posta, toplam yatırım, toplam çekim ve XLSX dışa aktarma erişimi",
		resource: "users.listDetails",
		action: "read",
		group: "Kullanıcılar",
	},
	{
		code: "users.create",
		name: "Kullanıcı Oluştur",
		resource: "users",
		action: "create",
		group: "Kullanıcılar",
	},
	{
		code: "users.update",
		name: "Kullanıcı Güncelle",
		resource: "users",
		action: "update",
		group: "Kullanıcılar",
	},
	{
		code: "users.manage",
		name: "Kullanıcı Tam Yetki",
		resource: "users",
		action: "manage",
		group: "Kullanıcılar",
	},
	{
		code: "users.mfa.read",
		name: "Kullanıcı MFA Kayıtlarını Görüntüle",
		resource: "users.mfa",
		action: "read",
		group: "Kullanıcılar",
	},
	{
		code: "users.mfa.manage",
		name: "Kullanıcı MFA Yönet",
		resource: "users.mfa",
		action: "manage",
		group: "Kullanıcılar",
	},

	// Finance - Deposits
	{
		code: "finance.read",
		name: "Finans Görüntüle",
		resource: "finance",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.create",
		name: "Finans İşlemi Oluştur",
		resource: "finance",
		action: "create",
		group: "Finans",
	},
	{
		code: "finance.update",
		name: "Finans İşlemi Güncelle",
		resource: "finance",
		action: "update",
		group: "Finans",
	},
	{
		code: "finance.delete",
		name: "Finans İşlemi Sil",
		resource: "finance",
		action: "delete",
		group: "Finans",
	},
	{
		code: "finance.manage",
		name: "Finans Tam Yetki",
		resource: "finance",
		action: "manage",
		group: "Finans",
	},

	{
		code: "finance.deposits.read",
		name: "Finans - Yatırımlar Görüntüle",
		resource: "finance.deposits",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.deposits.manage",
		name: "Finans - Yatırımlar Yönet",
		resource: "finance.deposits",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.withdraws.read",
		name: "Finans - Çekimler Görüntüle",
		resource: "finance.withdraws",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.withdraws.manage",
		name: "Finans - Çekimler Yönet",
		resource: "finance.withdraws",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.bankAccounts.read",
		name: "Finans - Banka Hesapları Görüntüle",
		resource: "finance.bankAccounts",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.bankAccounts.manage",
		name: "Finans - Banka Hesapları Yönet",
		resource: "finance.bankAccounts",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.bankTransfers.read",
		name: "Finans - Banka Transferleri Görüntüle",
		resource: "finance.bankTransfers",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.bankTransfers.manage",
		name: "Finans - Banka Transferleri Yönet",
		resource: "finance.bankTransfers",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.bankTransfersWithdraw.read",
		name: "Finans - Banka Transfer Çekim Görüntüle",
		resource: "finance.bankTransfersWithdraw",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.bankTransfersWithdraw.manage",
		name: "Finans - Banka Transfer Çekim Yönet",
		resource: "finance.bankTransfersWithdraw",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.campaigns.read",
		name: "Finans - Kampanyalar Görüntüle",
		resource: "finance.campaigns",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.campaigns.manage",
		name: "Finans - Kampanyalar Yönet",
		resource: "finance.campaigns",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.promo.read",
		name: "Finans - Promolar Görüntüle",
		resource: "finance.promo",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.promo.manage",
		name: "Finans - Promolar Yönet",
		resource: "finance.promo",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.manualAdjustments.read",
		name: "Finans - Manuel İşlemleri Görüntüle",
		resource: "finance.manualAdjustments",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.manualAdjustments.manage",
		name: "Finans - Manuel İşlemleri Yönet",
		resource: "finance.manualAdjustments",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.lossBonus.read",
		name: "Finans - Kayıp Bonusu Görüntüle",
		resource: "finance.lossBonus",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.lossBonus.manage",
		name: "Finans - Kayıp Bonusu Yönet",
		resource: "finance.lossBonus",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.reloadBonus.read",
		name: "Finans - Reload Bonusu Görüntüle",
		resource: "finance.reloadBonus",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.reloadBonus.manage",
		name: "Finans - Reload Bonusu Yönet",
		resource: "finance.reloadBonus",
		action: "manage",
		group: "Finans",
	},
	{
		code: "callScenarios.read",
		name: "Çağrı Senaryoları Görüntüle",
		resource: "callScenarios",
		action: "read",
		group: "Finans",
	},
	{
		code: "callScenarios.manage",
		name: "Çağrı Senaryoları Yönet",
		resource: "callScenarios",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.depositBonus.read",
		name: "Finans - Yatırım Bonusu Görüntüle",
		resource: "finance.depositBonus",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.depositBonus.manage",
		name: "Finans - Yatırım Bonusu Yönet",
		resource: "finance.depositBonus",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.tickets.read",
		name: "Finans - Bilet Etkinliği Görüntüle",
		resource: "finance.tickets",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.tickets.manage",
		name: "Finans - Bilet Etkinliği Yönet",
		resource: "finance.tickets",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.race.read",
		name: "Finans - Çevrim Turnuvası Görüntüle",
		resource: "finance.race",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.race.manage",
		name: "Finans - Çevrim Turnuvası Yönet",
		resource: "finance.race",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.trialBonus.read",
		name: "Finans - Deneme Bonusu Görüntüle",
		resource: "finance.trialBonus",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.trialBonus.manage",
		name: "Finans - Deneme Bonusu Yönet",
		resource: "finance.trialBonus",
		action: "manage",
		group: "Finans",
	},
	{
		code: "finance.balanceAnalysis.read",
		name: "Finans - Bakiye Analizi Görüntüle",
		resource: "finance.balanceAnalysis",
		action: "read",
		group: "Finans",
	},
	{
		code: "finance.balanceAnalysis.manage",
		name: "Finans - Bakiye Analizi Yönet",
		resource: "finance.balanceAnalysis",
		action: "manage",
		group: "Finans",
	},

	// Games
	{
		code: "games.read",
		name: "Oyunları Görüntüle",
		resource: "games",
		action: "read",
		group: "Oyunlar",
	},
	{
		code: "games.create",
		name: "Oyun Oluştur",
		resource: "games",
		action: "create",
		group: "Oyunlar",
	},
	{
		code: "games.update",
		name: "Oyun Güncelle",
		resource: "games",
		action: "update",
		group: "Oyunlar",
	},
	{
		code: "games.delete",
		name: "Oyun Sil",
		resource: "games",
		action: "delete",
		group: "Oyunlar",
	},
	{
		code: "games.manage",
		name: "Oyun Tam Yetki",
		resource: "games",
		action: "manage",
		group: "Oyunlar",
	},

	// Sports
	{
		code: "sports.read",
		name: "Spor Bahislerini Görüntüle",
		resource: "sports",
		action: "read",
		group: "Spor Bahisleri",
	},
	{
		code: "sports.create",
		name: "Spor Bahisi Oluştur",
		resource: "sports",
		action: "create",
		group: "Spor Bahisleri",
	},
	{
		code: "sports.update",
		name: "Spor Bahisi Güncelle",
		resource: "sports",
		action: "update",
		group: "Spor Bahisleri",
	},
	{
		code: "sports.delete",
		name: "Spor Bahisi Sil",
		resource: "sports",
		action: "delete",
		group: "Spor Bahisleri",
	},
	{
		code: "sports.manage",
		name: "Spor Bahisleri Tam Yetki",
		resource: "sports",
		action: "manage",
		group: "Spor Bahisleri",
	},

	// Providers
	{
		code: "providers.read",
		name: "Sağlayıcıları Görüntüle",
		resource: "providers",
		action: "read",
		group: "Sağlayıcılar",
	},
	{
		code: "providers.create",
		name: "Sağlayıcı Oluştur",
		resource: "providers",
		action: "create",
		group: "Sağlayıcılar",
	},
	{
		code: "providers.update",
		name: "Sağlayıcı Güncelle",
		resource: "providers",
		action: "update",
		group: "Sağlayıcılar",
	},
	{
		code: "providers.delete",
		name: "Sağlayıcı Sil",
		resource: "providers",
		action: "delete",
		group: "Sağlayıcılar",
	},
	{
		code: "providers.manage",
		name: "Sağlayıcı Tam Yetki",
		resource: "providers",
		action: "manage",
		group: "Sağlayıcılar",
	},

	// NFT / Boxes
	{
		code: "nft.read",
		name: "NFT/Kutuları Görüntüle",
		resource: "nft",
		action: "read",
		group: "NFT",
	},
	{
		code: "nft.create",
		name: "NFT/Kutu Oluştur",
		resource: "nft",
		action: "create",
		group: "NFT",
	},
	{
		code: "nft.update",
		name: "NFT/Kutu Güncelle",
		resource: "nft",
		action: "update",
		group: "NFT",
	},
	{
		code: "nft.delete",
		name: "NFT/Kutu Sil",
		resource: "nft",
		action: "delete",
		group: "NFT",
	},
	{
		code: "nft.manage",
		name: "NFT Tam Yetki",
		resource: "nft",
		action: "manage",
		group: "NFT",
	},

	// Platform Settings
	{
		code: "platform.read",
		name: "Platform Ayarlarını Görüntüle",
		resource: "platform",
		action: "read",
		group: "Platform",
	},
	{
		code: "platform.create",
		name: "Platform Ayarı Oluştur",
		resource: "platform",
		action: "create",
		group: "Platform",
	},
	{
		code: "platform.update",
		name: "Platform Ayarı Güncelle",
		resource: "platform",
		action: "update",
		group: "Platform",
	},
	{
		code: "platform.delete",
		name: "Platform Ayarı Sil",
		resource: "platform",
		action: "delete",
		group: "Platform",
	},
	{
		code: "platform.manage",
		name: "Platform Tam Yetki",
		resource: "platform",
		action: "manage",
		group: "Platform",
	},
	{
		code: "shop.read",
		name: "Mağazayı Görüntüle",
		resource: "shop",
		action: "read",
		group: "Mağaza",
	},
	{
		code: "shop.create",
		name: "Mağaza Ürünü Oluştur",
		resource: "shop",
		action: "create",
		group: "Mağaza",
	},
	{
		code: "shop.update",
		name: "Mağaza Ürünü Güncelle",
		resource: "shop",
		action: "update",
		group: "Mağaza",
	},
	{
		code: "shop.delete",
		name: "Mağaza Ürünü Sil",
		resource: "shop",
		action: "delete",
		group: "Mağaza",
	},
	{
		code: "shop.manage",
		name: "Mağaza Tam Yetki",
		resource: "shop",
		action: "manage",
		group: "Mağaza",
	},

	// BattlePass
	{
		code: "battlepass.read",
		name: "BattlePass Görüntüle",
		resource: "battlepass",
		action: "read",
		group: "BattlePass",
	},
	{
		code: "battlepass.create",
		name: "BattlePass Oluştur",
		resource: "battlepass",
		action: "create",
		group: "BattlePass",
	},
	{
		code: "battlepass.update",
		name: "BattlePass Güncelle",
		resource: "battlepass",
		action: "update",
		group: "BattlePass",
	},
	{
		code: "battlepass.delete",
		name: "BattlePass Sil",
		resource: "battlepass",
		action: "delete",
		group: "BattlePass",
	},
	{
		code: "battlepass.manage",
		name: "BattlePass Tam Yetki",
		resource: "battlepass",
		action: "manage",
		group: "BattlePass",
	},

	// Notice
	{
		code: "notice.read",
		name: "Duyuruları Görüntüle",
		resource: "notice",
		action: "read",
		group: "Duyurular",
	},
	{
		code: "notice.create",
		name: "Duyuru Oluştur",
		resource: "notice",
		action: "create",
		group: "Duyurular",
	},
	{
		code: "notice.update",
		name: "Duyuru Güncelle",
		resource: "notice",
		action: "update",
		group: "Duyurular",
	},
	{
		code: "notice.delete",
		name: "Duyuru Sil",
		resource: "notice",
		action: "delete",
		group: "Duyurular",
	},
	{
		code: "notice.manage",
		name: "Duyuru Tam Yetki",
		resource: "notice",
		action: "manage",
		group: "Duyurular",
	},

	// Communication
	{
		code: "communication.read",
		name: "İletişimi Görüntüle",
		resource: "communication",
		action: "read",
		group: "İletişim",
	},
	{
		code: "communication.create",
		name: "Mesaj Oluştur",
		resource: "communication",
		action: "create",
		group: "İletişim",
	},
	{
		code: "communication.update",
		name: "Mesaj Güncelle",
		resource: "communication",
		action: "update",
		group: "İletişim",
	},
	{
		code: "communication.delete",
		name: "Mesaj Sil",
		resource: "communication",
		action: "delete",
		group: "İletişim",
	},
	{
		code: "communication.manage",
		name: "İletişim Tam Yetki",
		resource: "communication",
		action: "manage",
		group: "İletişim",
	},

	// Reports
	{
		code: "reports.read",
		name: "Raporları Görüntüle",
		resource: "reports",
		action: "read",
		group: "Raporlar",
	},
	{
		code: "reports.manage",
		name: "Raporlar Tam Yetki",
		resource: "reports",
		action: "manage",
		group: "Raporlar",
	},
	{
		code: "reports.betinovi.read",
		name: "Betinovi Raporlarını Görüntüle",
		resource: "reports.betinovi",
		action: "read",
		group: "Raporlar",
	},
	{
		code: "reports.betinovi.manage",
		name: "Betinovi Raporları Tam Yetki",
		resource: "reports.betinovi",
		action: "manage",
		group: "Raporlar",
	},

	// ControlGame / Call Management
	{
		code: "controlGame.read",
		name: "ControlGame Görüntüle",
		resource: "controlGame",
		action: "read",
		group: "ControlGame",
	},
	{
		code: "controlGame.manage",
		name: "ControlGame Call Yönet",
		resource: "controlGame",
		action: "manage",
		group: "ControlGame",
	},

	// API Settings
	{
		code: "platform.apiSettings.read",
		name: "API Ayarlarını Görüntüle",
		resource: "platform.apiSettings",
		action: "read",
		group: "Platform",
	},
	{
		code: "platform.apiSettings.update",
		name: "API Ayarlarını Güncelle",
		resource: "platform.apiSettings",
		action: "update",
		group: "Platform",
	},
	{
		code: "platform.apiSettings.manage",
		name: "API Ayarları Tam Yetki",
		resource: "platform.apiSettings",
		action: "manage",
		group: "Platform",
	},

	// Roles & Permissions (sadece super admin)
	{
		code: "roles.read",
		name: "Rolleri Görüntüle",
		resource: "roles",
		action: "read",
		group: "Roller",
	},
	{
		code: "roles.create",
		name: "Rol Oluştur",
		resource: "roles",
		action: "create",
		group: "Roller",
	},
	{
		code: "roles.update",
		name: "Rol Güncelle",
		resource: "roles",
		action: "update",
		group: "Roller",
	},
	{
		code: "roles.delete",
		name: "Rol Sil",
		resource: "roles",
		action: "delete",
		group: "Roller",
	},
	{
		code: "roles.manage",
		name: "Roller Tam Yetki",
		resource: "roles",
		action: "manage",
		group: "Roller",
	},
];

// Varsayılan roller
const defaultRoles = [
	{
		name: "super_admin",
		displayName: "Süper Admin",
		description: "Tüm yetkilere sahip sistem yöneticisi",
		isSuperAdmin: true,
		isSystem: true,
		color: "error",
		icon: "tabler-shield-star",
		permissions: [], // Super admin tüm yetkilere sahip
	},
	{
		name: "admin",
		displayName: "Admin",
		description: "Genel admin yetkileri",
		isSuperAdmin: false,
		isSystem: true,
		color: "warning",
		icon: "tabler-shield",
		permissionCodes: [
			"dashboard.read",
			"users.read",
			"users.listDetails.read",
			"users.update",
			"users.mfa.read",
			"users.mfa.manage",
			"finance.read",
			"finance.manualAdjustments.manage",
			"finance.lossBonus.manage",
			"finance.depositBonus.manage",
			"finance.trialBonus.manage",
			"finance.reloadBonus.manage",
			"finance.balanceAnalysis.manage",
			"finance.tickets.manage",
			"finance.race.manage",
			"callScenarios.manage",
			"games.read",
			"games.update",
			"providers.read",
			"platform.read",
			"shop.read",
			"shop.manage",
			"notice.read",
			"notice.create",
			"notice.update",
			"communication.read",
			"reports.read",
		],
	},
	{
		name: "finance_manager",
		displayName: "Finans Yöneticisi",
		description: "Sadece finans işlemlerini yönetebilir",
		isSuperAdmin: false,
		isSystem: false,
		color: "success",
		icon: "tabler-currency-dollar",
		permissionCodes: [
			"dashboard.read",
			"finance.read",
			"finance.create",
			"finance.update",
			"finance.manualAdjustments.manage",
			"finance.lossBonus.manage",
			"finance.depositBonus.manage",
			"finance.trialBonus.manage",
			"finance.reloadBonus.manage",
			"finance.balanceAnalysis.manage",
			"finance.tickets.manage",
			"finance.race.manage",
			"callScenarios.manage",
			"users.read",
		],
	},
	{
		name: "support",
		displayName: "Destek",
		description: "Müşteri desteği yetkileri",
		isSuperAdmin: false,
		isSystem: false,
		color: "info",
		icon: "tabler-headset",
		permissionCodes: [
			"dashboard.read",
			"users.read",
			"users.mfa.read",
			"communication.read",
			"communication.create",
			"communication.update",
			"notice.read",
			"callScenarios.read",
			"callScenarios.manage",
		],
	},
	{
		name: "content_manager",
		displayName: "İçerik Yöneticisi",
		description: "İçerik ve duyuru yönetimi",
		isSuperAdmin: false,
		isSystem: false,
		color: "primary",
		icon: "tabler-pencil",
		permissionCodes: [
			"dashboard.read",
			"notice.read",
			"notice.create",
			"notice.update",
			"notice.delete",
			"platform.read",
			"platform.update",
			"shop.read",
			"shop.manage",
		],
	},
	{
		name: "game_manager",
		displayName: "Oyun Yöneticisi",
		description: "Oyun ve provider yönetimi",
		isSuperAdmin: false,
		isSystem: false,
		color: "secondary",
		icon: "tabler-device-gamepad-2",
		permissionCodes: [
			"dashboard.read",
			"games.read",
			"games.create",
			"games.update",
			"games.delete",
			"providers.read",
			"providers.update",
			"sports.read",
			"sports.update",
		],
	},
	{
		name: "viewer",
		displayName: "Sadece Görüntüleme",
		description: "Sadece görüntüleme yetkileri",
		isSuperAdmin: false,
		isSystem: false,
		color: "secondary",
		icon: "tabler-eye",
		permissionCodes: [
			"dashboard.read",
			"users.read",
			"users.mfa.read",
			"finance.read",
			"finance.manualAdjustments.read",
			"finance.lossBonus.read",
			"finance.depositBonus.read",
			"finance.trialBonus.read",
			"finance.reloadBonus.read",
			"finance.balanceAnalysis.read",
			"finance.tickets.read",
			"finance.race.read",
			"callScenarios.read",
			"games.read",
			"providers.read",
			"platform.read",
			"notice.read",
			"reports.read",
		],
	},
];

const seedPermissions = async () => {
	try {
		console.log("🔄 Seeding permissions...");

		// Permission'ları upsert et
		for (const perm of defaultPermissions) {
			await Permission.findOneAndUpdate({ code: perm.code }, perm, {
				upsert: true,
				new: true,
			});
		}

		console.log(`✅ ${defaultPermissions.length} permissions seeded`);
	} catch (err) {
		console.error("❌ Error seeding permissions:", err);
		throw err;
	}
};

const seedRoles = async ({ overwriteExisting = false } = {}) => {
	try {
		console.log(
			`🔄 Seeding roles${overwriteExisting ? " (overwrite mode)" : ""}...`
		);

		// Tüm permission'ları al
		const allPermissions = await Permission.find({});
		const permissionMap = {};
		allPermissions.forEach((p) => {
			permissionMap[p.code] = p._id;
		});

		let createdCount = 0;
		let updatedCount = 0;
		let skippedCount = 0;

		// Rolleri oluştur
		for (const roleData of defaultRoles) {
			const { permissionCodes, ...role } = roleData;

			// Permission ID'lerini bul
			if (permissionCodes && permissionCodes.length > 0) {
				role.permissions = permissionCodes
					.map((code) => permissionMap[code])
					.filter(Boolean);
			}

			const existingRole = await AdminRole.findOne({ name: role.name }).select("_id");

			if (!existingRole) {
				await AdminRole.create(role);
				createdCount += 1;
				continue;
			}

			if (!overwriteExisting) {
				skippedCount += 1;
				continue;
			}

			await AdminRole.findByIdAndUpdate(existingRole._id, role, {
				new: true,
			});
			updatedCount += 1;
		}

		console.log(
			`✅ ${defaultRoles.length} roles processed (created=${createdCount}, updated=${updatedCount}, skipped=${skippedCount})`
		);
	} catch (err) {
		console.error("❌ Error seeding roles:", err);
		throw err;
	}
};

const seedPermissionsAndRoles = async () => {
	const overwriteExistingRoles = process.env.SEED_ROLES_OVERWRITE === "true";

	await seedPermissions();
	await seedRoles({ overwriteExisting: overwriteExistingRoles });
};

const main = async () => {
	await connectDB();
	await seedPermissionsAndRoles();
	console.log("🎉 Seeding completed!");
	process.exit(0);
};

module.exports = {
	defaultPermissions,
	defaultRoles,
	seedPermissions,
	seedRoles,
	seedPermissionsAndRoles,
};

if (require.main === module) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
