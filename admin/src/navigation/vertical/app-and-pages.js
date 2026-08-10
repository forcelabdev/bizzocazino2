export default [
  { heading: "Apps & Pages" },

  // 📡 Communication
  {
    title: "communication.title",
    icon: { icon: "tabler-message" },
    action: "read",
    subject: "communication",
    children: [
      {
        title: "communication.email",
        to: "apps-email",
        action: "read",
        subject: "communication",
      },
      {
        title: "communication.chat",
        to: "apps-chat",
        action: "read",
        subject: "communication",
      },
      {
        title: "communication.telegram",
        to: "apps-telegram",
        action: "read",
        subject: "communication",
      },
    ],
  },

  // 👥 Users
  {
    title: "users.title",
    icon: { icon: "tabler-users" },
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

  // 💰 Finance
  {
    title: "finance.title",
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
        title: "finance.echopayzMenu",
        to: "apps-finance-echopayz",
        action: "read",
        subject: "finance",
      },
      {
        title: "manualAdjustments.title",
        to: "apps-finance-manual-adjustments",
        action: "read",
        subject: "users",
      },
      {
        title: "platform.campaigns",
        to: "apps-campaigns",
        action: "read",
        subject: "finance.campaigns",
      },
      {
        title: "platform.promotions",
        to: "apps-promotions",
        action: "read",
        subject: "finance.promo",
      },
      {
        title: "finance.promo",
        to: "apps-promo",
        action: "read",
        subject: "finance.promo",
      },
    ],
  },

  // 🎮 Games
  {
    title: "gamestitle",
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
    ],
  },

  // 📊 Reports
  {
    title: "betinoviReports.title",
    icon: { icon: "tabler-report-analytics" },
    action: "read",
    subject: "reports.betinovi",
    children: [
      {
        title: "betinoviReports.wagerIndex",
        to: "apps-reports-betinovi-wager",
        action: "read",
        subject: "reports.betinovi",
      },
      {
        title: "betinoviReports.byAgent",
        to: "apps-reports-betinovi-by-agent",
        action: "read",
        subject: "reports.betinovi",
      },
      {
        title: "betinoviReports.byVendor",
        to: "apps-reports-betinovi-by-vendor",
        action: "read",
        subject: "reports.betinovi",
      },
      {
        title: "betinoviReports.settlement",
        to: "apps-reports-betinovi-settlement",
        action: "read",
        subject: "reports.betinovi",
      },
      {
        title: "betinoviReports.riskUsers",
        to: "apps-reports-betinovi-risk-users",
        action: "read",
        subject: "reports.betinovi",
      },
    ],
  },

  // 🎛️ ControlGame / Call Management
  {
    title: "controlGame.title",
    icon: { icon: "tabler-adjustments-star" },
    to: "apps-control-game",
    action: "read",
    subject: "controlGame",
  },

  // 🔌 Providers (API Integrations)
  {
    title: "providers.title",
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

  // 📦 NFT
  {
    title: "nft.title",
    icon: { icon: "tabler-box" },
    action: "read",
    subject: "nft",
    children: [
      {
        title: "nft.boxes",
        to: "apps-box",
        action: "read",
        subject: "nft",
      },
      {
        title: "nft.items",
        to: "apps-box-items",
        action: "read",
        subject: "nft",
      },
    ],
  },

  // ⚙️ Platform Settings
  {
    title: "platform.title",
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
        title: "platform.bonus",
        to: "apps-bonus",
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
        title: "platform.banners",
        to: "apps-banner",
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
        title: "platform.category",
        to: "apps-category",
        action: "read",
        subject: "platform",
      },
      {
        title: "platform.bankAccounts",
        to: "apps-bank-accounts",
        action: "read",
        subject: "finance.bankAccounts",
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

  // 🔔 Notice
  {
    title: "notice.title",
    icon: { icon: "tabler-bell-minus" },
    to: "apps-notice",
    action: "read",
    subject: "notice",
  },

  // 🔐 Rol & Yetki Yönetimi
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
]
