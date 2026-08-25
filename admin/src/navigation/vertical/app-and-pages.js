export default [
  // 👤 Kullanıcı Yönetimi
  {
    title: "Kullanıcı Yönetimi",
    icon: { icon: "tabler-users" },
    action: "read",
    subject: "users",
    children: [
      {
        title: "users.title",
        action: "read",
        subject: "users",
        children: [
          {
            title: "users.list",
            to: "apps-user-list",
            action: "read",
            subject: "users",
          },
          {
            title: "users.leaderboard",
            to: "apps-leaderboard",
            action: "read",
            subject: "users",
          },
          {
            title: "users.vip",
            to: "apps-vip",
            action: "read",
            subject: "users",
          },
        ],
      },
      {
        title: "crm.title",
        action: "read",
        subject: "users",
        children: [
          {
            title: "crm.playerSegments",
            to: "apps-crm-player-segments",
            action: "read",
            subject: "users",
          },
          {
            title: "crm.tagManager",
            to: "apps-crm-tag-manager",
            action: "read",
            subject: "users",
          },
        ],
      },
    ],
  },

  // 💰 Finans Yönetimi
  {
    title: "Finans Yönetimi",
    icon: { icon: "tabler-file-dollar" },
    action: "read",
    subject: "finance",
    children: [
      {
        title: "finance.deposits",
        to: "apps-finance-deposit",
        action: "read",
        subject: "finance.deposits",
      },
      {
        title: "finance.withdraws",
        to: "apps-finance-withdraw",
        action: "read",
        subject: "finance.withdraws",
      },
      {
        title: "manualAdjustments.title",
        to: "apps-finance-manual-adjustments",
        action: "read",
        subject: "users",
      },
      {
        title: "platform.bankAccounts",
        to: "apps-bank-accounts",
        action: "read",
        subject: "finance.bankAccounts",
      },
    ],
  },

  // 🎮 Oyun Yönetimi
  {
    title: "Oyun Yönetimi",
    icon: { icon: "tabler-device-gamepad" },
    action: "read",
    subject: "games",
    children: [
      {
        title: "gamesall",
        to: "apps-games",
        action: "read",
        subject: "games",
      },
      {
        title: "Spor Bahisleri",
        to: "apps-sports-bets",
        icon: { icon: "tabler-ball-football" },
        action: "read",
        subject: "sports",
      },
      {
        title: "gameshistorytitle",
        icon: { icon: "tabler-history" },
        action: "read",
        subject: "games",
        children: [
          {
            title: "gameshistoryfutures",
            to: "apps-futures",
            action: "read",
            subject: "games",
          },
          {
            title: "gameshistoryturbo",
            to: "apps-turbo",
            action: "read",
            subject: "games",
          },
          {
            title: "gameshistorywingo",
            to: "apps-wingo",
            action: "read",
            subject: "games",
          },
          {
            title: "gameshistorybattles",
            to: "apps-battles",
            action: "read",
            subject: "games",
          },
          {
            title: "gameshistoryblackjack",
            to: "apps-blackjack",
            action: "read",
            subject: "games",
          },
          {
            title: "gameshistorycrash",
            to: "apps-crash",
            action: "read",
            subject: "games",
          },
          {
            title: "gameshistoryduels",
            to: "apps-duels",
            action: "read",
            subject: "games",
          },
          {
            title: "gameshistorymines",
            to: "apps-mines",
            action: "read",
            subject: "games",
          },
          {
            title: "gameshistoryrolls",
            to: "apps-rolls",
            action: "read",
            subject: "games",
          },
          {
            title: "gameshistorytowers",
            to: "apps-towers",
            action: "read",
            subject: "games",
          },
          {
            title: "gameshistoryunbox",
            to: "apps-unbox",
            action: "read",
            subject: "games",
          },
        ],
      },
      {
        title: "Oyun Sağlayıcıları",
        icon: { icon: "tabler-plug" },
        action: "read",
        subject: "providers",
        children: [
          {
            title: "providers.apiProviders",
            to: "apps-providers-api-providers",
            action: "read",
            subject: "providers",
          },
          {
            title: "providers.gameProviders",
            to: "apps-providers-game-providers",
            action: "read",
            subject: "providers",
          },
        ],
      },
      {
        title: "Call Management",
        icon: { icon: "tabler-adjustments-star" },
        to: "apps-control-game",
        action: "read",
        subject: "controlGame",
      },
    ],
  },

  // 🏷️ Promosyon Yönetimi
  {
    title: "Promosyon Yönetimi",
    icon: { icon: "tabler-discount-2" },
    action: "read",
    subject: "finance.promo",
    children: [
      {
        title: "platform.promotions",
        to: "apps-promotions",
        action: "read",
        subject: "finance.promo",
      },
      {
        title: "platform.campaigns",
        to: "apps-campaigns",
        action: "read",
        subject: "finance.campaigns",
      },
      {
        title: "finance.promo",
        to: "apps-promo",
        action: "read",
        subject: "finance.promo",
      },
      {
        title: "platform.bulkBonus",
        to: "apps-bulk-bonus",
        action: "read",
        subject: "finance.manualAdjustments",
      },
      {
        title: "Spor Turnuvası",
        to: "apps-sports-tournament",
        icon: { icon: "tabler-trophy" },
        action: "read",
        subject: "sports.tournament",
      },
      {
        title: "platform.bonusNames",
        to: "apps-bonus-names",
        action: "read",
        subject: "finance.manualAdjustments",
      },
      {
        title: "platform.lossBonus",
        to: "apps-loss-bonus",
        action: "read",
        subject: "finance.lossBonus",
      },
      {
        title: "platform.depositBonus",
        to: "apps-deposit-bonus",
        action: "read",
        subject: "finance.depositBonus",
      },
      {
        title: "platform.trialBonus",
        to: "apps-trial-bonus",
        action: "read",
        subject: "finance.trialBonus",
      },
      {
        title: "platform.reloadBonus",
        to: "apps-reload-bonus",
        action: "read",
        subject: "finance.reloadBonus",
      },
      {
        title: "platform.callScenarios",
        to: "apps-call-scenarios",
        action: "read",
        subject: "callScenarios",
      },
      {
        title: "platform.freeSpinBonus",
        to: "apps-free-spin-bonus",
        action: "read",
        subject: "controlGame",
      },
      {
        title: "platform.ticketEvents",
        to: "apps-tickets",
        action: "read",
        subject: "finance.tickets",
      },
      {
        title: "platform.raceTournaments",
        to: "apps-race",
        action: "read",
        subject: "finance.race",
      },
    ],
  },

  // 📊 Rapor Yönetimi
  {
    title: "Rapor Yönetimi",
    icon: { icon: "tabler-report-analytics" },
    action: "read",
    subject: "finance.balanceAnalysis",
    children: [
      {
        title: "betinoviReports.crmReport",
        to: "apps-reports-crm",
        action: "read",
        subject: "finance.balanceAnalysis",
      },
      {
        title: "betinoviReports.balanceAnalysis",
        to: "apps-reports-balance-analysis",
        action: "read",
        subject: "finance.balanceAnalysis",
      },
    ],
  },

  // ⚙️ Site Yönetimi
  {
    title: "Site Yönetimi",
    icon: { icon: "tabler-settings" },
    action: "read",
    subject: "platform",
    children: [
      {
        title: "platform.siteSettings",
        to: "site-settings",
        action: "read",
        subject: "platform",
      },
      {
        title: "platform.fileManager",
        to: "file-manager",
        action: "read",
        subject: "platform",
      },
      {
        title: "platform.banners",
        to: "apps-banner",
        action: "read",
        subject: "platform",
      },
      {
        title: "platform.category",
        to: "apps-category",
        action: "read",
        subject: "platform",
      },
      {
        title: "platform.shop",
        to: "apps-shop",
        action: "read",
        subject: "shop",
      },
      {
        title: "roles.title",
        icon: { icon: "tabler-shield" },
        action: "read",
        subject: "roles",
        children: [
          {
            title: "roles.list",
            to: "apps-roles",
            action: "read",
            subject: "roles",
          },
          {
            title: "roles.adminUsers",
            to: "apps-admin-users",
            action: "read",
            subject: "roles",
          },
        ],
      },
    ],
  },

  // 💳 Ödeme Yöntem Yönetimi
  {
    title: "Ödeme Yöntem Yönetimi",
    icon: { icon: "tabler-credit-card" },
    action: "read",
    subject: "platform",
    children: [
      {
        title: "paymentMethods.fluxKripto",
        to: "apps-payment-methods-fluxkripto",
        action: "read",
        subject: "platform",
      },
      {
        title: "paymentMethods.xPayments",
        to: "apps-payment-methods-xpayments",
        action: "read",
        subject: "platform",
      },
      {
        title: "paymentMethods.forcelabFinance",
        to: "apps-payment-methods-forcelab-finance",
        action: "read",
        subject: "platform",
      },
      {
        title: "paymentMethods.meelDev",
        to: "apps-payment-methods-meeldev",
        action: "read",
        subject: "platform",
      },
      {
        title: "paymentMethods.galaxyPay",
        to: "apps-payment-methods-galaxypay",
        action: "read",
        subject: "platform",
      },
    ],
  },

  // 🔔 Site Bildirim Yönetimi
  {
    title: "Site Bildirim Yönetimi",
    icon: { icon: "tabler-bell-minus" },
    action: "read",
    subject: "notice",
    children: [
      {
        title: "notice.title",
        to: "apps-notice",
        action: "read",
        subject: "notice",
      },
      {
        title: "Mesaj Gönder",
        to: "apps-send-message",
        action: "read",
        subject: "notice",
      },
      {
        title: "Pop-up Duyuru Banner",
        to: "apps-popup-banner",
        action: "read",
        subject: "notice",
      },
    ],
  },

  // 🎟️ BattlePass
  {
    title: "battlepass.title",
    icon: { icon: "tabler-ticket" },
    action: "read",
    subject: "battlepass",
    children: [
      {
        title: "battlepass.season",
        to: "apps-battlepass",
        action: "read",
        subject: "battlepass",
      },
      {
        title: "battlepass.missions",
        to: "apps-battlepass-missions",
        action: "read",
        subject: "battlepass",
      },
      {
        title: "battlepass.rewards",
        to: "apps-battlepass-rewards",
        action: "read",
        subject: "battlepass",
      },
    ],
  },
]
