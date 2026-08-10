(() => {
	let bonusses = [];
	let activeCategory = "all";
	let categories = [];

	const CONTAINER_SELECTOR = ".bonus-cards-grid";
	const DATA_ATTR = "data-v-9307aaf0";
	let isRendering = false;
	let mountedContainer = null;

	function injectStyles() {
		if (document.getElementById("bonus-injected-styles")) return;
		const style = document.createElement("style");
		style.id = "bonus-injected-styles";
		style.textContent = `
			.bonus-cards-grid {
				width: 100% !important;
				max-width: 100% !important;
				box-sizing: border-box !important;
				padding: 0 !important;
				margin: 0 !important;
				display: block !important;
			}
			.bonus-layout {
				display: flex;
				gap: 20px;
				width: 100%;
				min-width: 0;
				font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
			}
			.bonus-sidebar {
				width: 200px;
				min-width: 200px;
				flex-shrink: 0;
				background: linear-gradient(180deg, rgba(26,26,36,0.95) 0%, rgba(18,18,28,0.98) 100%);
				border-radius: 16px;
				padding: 8px;
				border: 1px solid rgba(255,215,0,0.08);
			}
			.bonus-sidebar-item {
				display: flex;
				align-items: center;
				gap: 10px;
				padding: 13px 16px;
				margin-bottom: 2px;
				border-radius: 12px;
				cursor: pointer;
				transition: all 0.2s ease;
				font-size: 13px;
				font-weight: 600;
				color: rgba(255,255,255,0.55);
				letter-spacing: 0.3px;
				text-transform: uppercase;
				border: 1px solid transparent;
				user-select: none;
			}
			.bonus-sidebar-item:hover {
				background: rgba(255,215,0,0.06);
				color: rgba(255,255,255,0.8);
			}
			.bonus-sidebar-item.active {
				background: linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,180,0,0.08) 100%);
				color: #ffd700;
				border-color: rgba(255,215,0,0.2);
				box-shadow: 0 0 20px rgba(255,215,0,0.05);
			}
			.bonus-sidebar-icon {
				font-size: 16px;
				width: 22px;
				text-align: center;
			}
			.bonus-main {
				flex: 1;
				min-width: 0;
				overflow: hidden;
			}
			.bonus-grid {
				display: grid;
				grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
				gap: 16px;
				width: 100%;
			}
			.bonus-card-new {
				background: linear-gradient(160deg, rgba(30,30,42,0.9) 0%, rgba(20,20,32,0.95) 100%);
				border-radius: 16px;
				overflow: hidden;
				position: relative;
				transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
				border: 1px solid rgba(255,255,255,0.04);
				cursor: pointer;
			}
			.bonus-card-new:hover {
				transform: translateY(-4px);
				border-color: rgba(255,215,0,0.15);
				box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 30px rgba(255,215,0,0.04);
			}
			.bonus-card-img-wrap {
				width: 100%;
				aspect-ratio: 16/10;
				overflow: hidden;
				position: relative;
			}
			.bonus-card-img-wrap img {
				width: 100%;
				height: 100%;
				object-fit: cover;
				transition: transform 0.4s ease;
			}
			.bonus-card-new:hover .bonus-card-img-wrap img {
				transform: scale(1.05);
			}
			.bonus-card-reward {
				position: absolute;
				top: 10px;
				right: 10px;
				background: linear-gradient(135deg, rgba(255,215,0,0.9), rgba(255,180,0,0.9));
				color: #1a1a24;
				padding: 5px 12px;
				border-radius: 20px;
				font-size: 11px;
				font-weight: 700;
				letter-spacing: 0.3px;
				box-shadow: 0 4px 12px rgba(255,215,0,0.25);
				backdrop-filter: blur(4px);
			}
			.bonus-card-action {
				display: block;
				width: 100%;
				padding: 12px 0;
				text-align: center;
				font-size: 13px;
				font-weight: 700;
				text-transform: uppercase;
				letter-spacing: 1px;
				border: none;
				cursor: pointer;
				transition: all 0.25s ease;
				font-family: inherit;
			}
			.bonus-card-action.claim-active {
				background: linear-gradient(135deg, #ffd700 0%, #ffb800 100%);
				color: #1a1a24;
			}
			.bonus-card-action.claim-active:hover {
				background: linear-gradient(135deg, #ffe44d 0%, #ffc933 100%);
				box-shadow: 0 4px 16px rgba(255,215,0,0.3);
			}
			.bonus-card-action.claim-disabled {
				background: rgba(255,255,255,0.06);
				color: rgba(255,255,255,0.35);
				cursor: not-allowed;
			}
			.bonus-card-action.claim-terms {
				background: rgba(255,215,0,0.1);
				color: #ffd700;
			}
			.bonus-card-action.claim-terms:hover {
				background: rgba(255,215,0,0.18);
			}
			.bonus-card-action.claim-login {
				background: rgba(255,255,255,0.08);
				color: rgba(255,255,255,0.7);
			}
			.bonus-card-action.claim-login:hover {
				background: rgba(255,255,255,0.12);
				color: #fff;
			}
			.bonus-empty {
				grid-column: 1/-1;
				text-align: center;
				padding: 60px 20px;
				color: rgba(255,255,255,0.3);
				font-size: 15px;
			}
			.bonus-empty-icon {
				font-size: 48px;
				display: block;
				margin-bottom: 16px;
				opacity: 0.5;
			}

			/* Modal Styles */
			.bonus-modal-overlay {
				position: fixed;
				top: 0; left: 0; right: 0; bottom: 0;
				background: rgba(0,0,0,0.7);
				backdrop-filter: blur(8px);
				-webkit-backdrop-filter: blur(8px);
				z-index: 9999;
				display: flex;
				align-items: center;
				justify-content: center;
				animation: bonusModalFadeIn 0.25s ease;
			}
			@keyframes bonusModalFadeIn {
				from { opacity: 0; }
				to { opacity: 1; }
			}
			@keyframes bonusModalSlideIn {
				from { opacity: 0; transform: scale(0.95) translateY(12px); }
				to { opacity: 1; transform: scale(1) translateY(0); }
			}
			.bonus-modal-box {
				background: linear-gradient(165deg, #1e1e2e 0%, #16161f 100%);
				border: 1px solid rgba(255,215,0,0.1);
				border-radius: 20px;
				width: min(520px, 92%);
				max-height: 85vh;
				overflow: hidden;
				display: flex;
				flex-direction: column;
				box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(255,215,0,0.03);
				animation: bonusModalSlideIn 0.3s ease;
			}
			.bonus-modal-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 20px 24px 16px;
				border-bottom: 1px solid rgba(255,255,255,0.06);
			}
			.bonus-modal-title {
				font-size: 18px;
				font-weight: 700;
				color: #ffd700;
				margin: 0;
				display: flex;
				align-items: center;
				gap: 10px;
			}
			.bonus-modal-close {
				width: 36px;
				height: 36px;
				border-radius: 10px;
				border: 1px solid rgba(255,255,255,0.08);
				background: rgba(255,255,255,0.04);
				color: rgba(255,255,255,0.5);
				font-size: 18px;
				cursor: pointer;
				display: flex;
				align-items: center;
				justify-content: center;
				transition: all 0.2s;
			}
			.bonus-modal-close:hover {
				background: rgba(255,70,70,0.15);
				border-color: rgba(255,70,70,0.2);
				color: #ff6b6b;
			}
			.bonus-modal-body {
				padding: 20px 24px;
				overflow-y: auto;
				flex: 1;
				font-size: 14px;
				line-height: 1.7;
				color: rgba(255,255,255,0.75);
			}
			.bonus-modal-body h1, .bonus-modal-body h2, .bonus-modal-body h3 {
				color: #fff;
				margin-top: 16px;
				margin-bottom: 8px;
			}
			.bonus-modal-body ul, .bonus-modal-body ol {
				padding-left: 20px;
				margin: 8px 0;
			}
			.bonus-modal-body li {
				margin-bottom: 4px;
			}
			.bonus-modal-body a {
				color: #ffd700;
			}
			.bonus-modal-footer {
				display: flex;
				gap: 12px;
				padding: 16px 24px 20px;
				border-top: 1px solid rgba(255,255,255,0.06);
			}
			.bonus-modal-btn {
				flex: 1;
				padding: 13px 20px;
				border-radius: 12px;
				border: none;
				font-size: 14px;
				font-weight: 700;
				cursor: pointer;
				transition: all 0.2s;
				font-family: inherit;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}
			.bonus-modal-btn-cancel {
				background: rgba(255,255,255,0.06);
				color: rgba(255,255,255,0.6);
				border: 1px solid rgba(255,255,255,0.08);
			}
			.bonus-modal-btn-cancel:hover {
				background: rgba(255,255,255,0.1);
				color: #fff;
			}
			.bonus-modal-btn-confirm {
				background: linear-gradient(135deg, #ffd700, #ffb800);
				color: #1a1a24;
				box-shadow: 0 4px 16px rgba(255,215,0,0.25);
			}
			.bonus-modal-btn-confirm:hover {
				background: linear-gradient(135deg, #ffe44d, #ffc933);
				box-shadow: 0 6px 24px rgba(255,215,0,0.35);
			}
			.bonus-modal-btn-confirm:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}

			/* Responsive */
			@media (max-width: 768px) {
				.bonus-layout {
					flex-direction: column;
				}
				.bonus-sidebar {
					width: 100% !important;
					min-width: unset !important;
					display: flex;
					overflow-x: auto;
					padding: 6px;
					gap: 4px;
					-webkit-overflow-scrolling: touch;
					scrollbar-width: none;
				}
				.bonus-sidebar::-webkit-scrollbar { display: none; }
				.bonus-sidebar-item {
					white-space: nowrap;
					flex-shrink: 0;
					padding: 10px 14px;
					font-size: 11px;
					margin-bottom: 0;
				}
				.bonus-grid {
					grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
					gap: 10px;
				}
			}
			@media (min-width: 769px) and (max-width: 1024px) {
				.bonus-grid {
					grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
				}
			}
		`;
		document.head.appendChild(style);
	}

	function getFilteredBonuses() {
		if (activeCategory === "all") return bonusses;
		return bonusses.filter((b) => b.category === activeCategory);
	}

	function getCategoriesWithAll() {
		return [
			{ key: "all", label: "HEPSİ", icon: "🎰" },
			...categories.map((c) => ({ key: c.slug, label: c.label.toUpperCase(), icon: c.icon || "🎁" })),
		];
	}

	function renderLayout(container) {
		if (!container) return;
		isRendering = true;
		container.innerHTML = "";
		injectStyles();

		const layout = document.createElement("div");
		layout.className = "bonus-layout";
		layout.setAttribute(DATA_ATTR, "");

		const CATEGORIES_WITH_ALL = getCategoriesWithAll();
		const sidebar = document.createElement("div");
		sidebar.className = "bonus-sidebar";
		sidebar.setAttribute(DATA_ATTR, "");

		CATEGORIES_WITH_ALL.forEach((cat) => {
			const item = document.createElement("div");
			item.className = "bonus-sidebar-item" + (activeCategory === cat.key ? " active" : "");
			item.setAttribute(DATA_ATTR, "");

			const icon = document.createElement("span");
			icon.className = "bonus-sidebar-icon";
			icon.textContent = cat.icon;

			const label = document.createElement("span");
			label.textContent = cat.label;

			item.appendChild(icon);
			item.appendChild(label);

			item.onclick = () => {
				activeCategory = cat.key;
				renderLayout(container);
			};

			sidebar.appendChild(item);
		});

		// Main content
		const main = document.createElement("div");
		main.className = "bonus-main";
		main.setAttribute(DATA_ATTR, "");

		const grid = document.createElement("div");
		grid.className = "bonus-grid";
		grid.setAttribute(DATA_ATTR, "");

		const filtered = getFilteredBonuses();

		if (filtered.length === 0) {
			const empty = document.createElement("div");
			empty.className = "bonus-empty";
			empty.setAttribute(DATA_ATTR, "");
			const emptyIcon = document.createElement("span");
			emptyIcon.className = "bonus-empty-icon";
			emptyIcon.textContent = "🎁";
			const emptyText = document.createElement("span");
			emptyText.textContent = "Bu kategoride bonus bulunmuyor";
			empty.appendChild(emptyIcon);
			empty.appendChild(emptyText);
			grid.appendChild(empty);
		} else {
			filtered.forEach((b) => {
				const card = document.createElement("div");
				card.className = "bonus-card-new";
				card.setAttribute(DATA_ATTR, "");

				// Image wrapper
				const imgWrap = document.createElement("div");
				imgWrap.className = "bonus-card-img-wrap";
				imgWrap.setAttribute(DATA_ATTR, "");

				const img = document.createElement("img");
				img.src = window?.toAssetUrl ? window.toAssetUrl(b.banner) : b.banner;
				img.alt = b.title || "Bonus";
				img.loading = "lazy";
				img.setAttribute(DATA_ATTR, "");
				imgWrap.appendChild(img);

				// Reward badge
				if (b.rewardAmount > 0) {
					const badge = document.createElement("span");
					badge.className = "bonus-card-reward";
					badge.textContent = `${b.rewardAmount.toLocaleString()} ₺`;
					badge.setAttribute(DATA_ATTR, "");
					imgWrap.appendChild(badge);
				}

				card.appendChild(imgWrap);

				// Action button
				const btn = document.createElement("button");
				btn.className = "bonus-card-action";
				btn.setAttribute(DATA_ATTR, "");

				if (b.mode === "manual") {
					if (b.claimed) {
						btn.textContent = "Alındı";
						btn.classList.add("claim-disabled");
						btn.disabled = true;
					} else if (b.terms) {
						btn.textContent = "Talep Et";
						btn.classList.add("claim-terms");
						btn.onclick = (e) => { e.stopPropagation(); showTermsModal(b); };
					} else {
						btn.textContent = "Talep Et";
						btn.classList.add("claim-disabled");
						btn.disabled = true;
					}
				} else if (b.enabled) {
					if (window.__IS_AUTH__ !== true) {
						btn.textContent = "Giriş Yap";
						btn.classList.add("claim-login");
						btn.onclick = (e) => {
							e.stopPropagation();
							window._app_store_.dispatch("notificationShow", {type: "error", message: "Bu bonusu almak için giriş yapmalısınız."});
						};
					} else if (b.claimed) {
						btn.textContent = "Kullanıldı";
						btn.classList.add("claim-disabled");
						btn.disabled = true;
					} else if (b.claimable) {
						btn.textContent = "Talep Et";
						btn.classList.add("claim-active");
						btn.onclick = async (e) => {
							e.stopPropagation();
							if (b.terms) {
								showTermsModal(b);
							} else {
								btn.disabled = true;
								btn.textContent = "İşleniyor...";
								await claimWelcome(b.id);
							}
						};
					} else {
						btn.textContent = "Koşullar Sağlanmadı";
						btn.classList.add("claim-disabled");
						btn.disabled = true;
					}
				} else if (b.terms) {
					btn.textContent = "Talep Et";
					btn.classList.add("claim-terms");
					btn.onclick = (e) => { e.stopPropagation(); showTermsModal(b); };
				} else {
					btn.textContent = "Talep Et";
					btn.classList.add("claim-disabled");
					btn.disabled = true;
				}

				card.appendChild(btn);
				grid.appendChild(card);
			});
		}

		main.appendChild(grid);
		layout.appendChild(sidebar);
		layout.appendChild(main);
		container.appendChild(layout);

		isRendering = false;
	}

	async function tryMount() {
		const container = document.querySelector(CONTAINER_SELECTOR);
		if (!container) return false;
		if (mountedContainer === container && container.getAttribute("data-bonus-mounted") === "1") return true;

		container.innerHTML = "";
		await fetchCategories();
		await fetchCampaigns();
		renderLayout(container);
		container.setAttribute("data-bonus-mounted", "1");
		mountedContainer = container;
		return true;
	}

	if (document.readyState !== "loading") {
		tryMount();
	} else {
		document.addEventListener("DOMContentLoaded", tryMount);
	}

	let observer = new MutationObserver(() => {
		if (isRendering) return;

		if (mountedContainer && !document.body.contains(mountedContainer)) mountedContainer = null;

		const container = document.querySelector(CONTAINER_SELECTOR);
		if (container && mountedContainer !== container) tryMount();
	});
	observer.observe(document.documentElement, {childList: true, subtree: true});

	async function fetchCategories() {
		try {
			const res = await fetch("https://apibizzocasino.site/auth/campaign-categories");
			if (!res.ok) return;
			const json = await res.json();
			if (json && json.success && Array.isArray(json.categories)) {
				categories = json.categories;
			}
		} catch (e) {}
	}

	async function fetchCampaigns() {
		try {
			const token = localStorage.getItem("token");
			const headers = token ? {"x-auth-token": token} : {};
			const res = await fetch("https://apibizzocasino.site/auth/campaigns", {headers});
			if (!res.ok) return;
			const json = await res.json();
			if (json && json.success && Array.isArray(json.campaigns)) {
				bonusses = json.campaigns.filter((c) => c.active !== false).map((c) => ({
					title: c.title,
					desc: c.description,
					claimable: !!c.claimable,
					enabled: c.active && c.mode === "auto",
					banner: c.banner,
					id: c.id,
					terms: c.terms || null,
					rewardAmount: c.rewardAmount || 0,
					claimed: !!c.claimed,
					mode: c.mode,
					category: c.category || null,
				}));
			}
		} catch (e) {}
	}

	async function claimWelcome(id = "welcome-bonus2") {
		try {
			const res = await fetch(`https://apibizzocasino.site/auth/campaign/claim?id=${encodeURIComponent(id)}`, {method: "GET", headers: {"x-auth-token": localStorage.getItem("token")}});
			if (!res.ok) {
				return;
			}
			await fetchCampaigns();
			const container = document.querySelector(CONTAINER_SELECTOR);
			if (container) renderLayout(container);
			window._app_store_.dispatch("notificationShow", {type: "success", message: "Başarıyla bonus alındı!"});
		} catch (e) {}
	}

	function showTermsModal(bonus) {
		const existing = document.getElementById("bonus-terms-modal");
		if (existing) existing.remove();

		injectStyles();

		const overlay = document.createElement("div");
		overlay.id = "bonus-terms-modal";
		overlay.className = "bonus-modal-overlay";

		const modal = document.createElement("div");
		modal.className = "bonus-modal-box";

		// Header
		const header = document.createElement("div");
		header.className = "bonus-modal-header";

		const title = document.createElement("h3");
		title.className = "bonus-modal-title";
		title.innerHTML = "📋 Şartlar ve Koşullar";

		const closeBtn = document.createElement("button");
		closeBtn.className = "bonus-modal-close";
		closeBtn.innerHTML = "✕";
		closeBtn.onclick = () => overlay.remove();

		header.appendChild(title);
		header.appendChild(closeBtn);
		modal.appendChild(header);

		// Body
		const body = document.createElement("div");
		body.className = "bonus-modal-body";
		body.innerHTML = bonus.terms || "<p>Şartlar bulunamadı.</p>";
		modal.appendChild(body);

		// Footer
		const footer = document.createElement("div");
		footer.className = "bonus-modal-footer";

		const canClaim = bonus.enabled && bonus.claimable && !bonus.claimed && bonus.mode === "auto";

		if (canClaim) {
			const acceptBtn = document.createElement("button");
			acceptBtn.className = "bonus-modal-btn bonus-modal-btn-confirm";
			acceptBtn.textContent = "Onayla ve Al";
			acceptBtn.onclick = async () => {
				acceptBtn.disabled = true;
				acceptBtn.textContent = "İşleniyor...";
				await claimWelcome(bonus.id);
				overlay.remove();
			};
			footer.appendChild(acceptBtn);
		}

		const cancelBtn = document.createElement("button");
		cancelBtn.className = "bonus-modal-btn bonus-modal-btn-cancel";
		cancelBtn.textContent = "Kapat";
		cancelBtn.onclick = () => overlay.remove();
		footer.appendChild(cancelBtn);

		modal.appendChild(footer);
		overlay.appendChild(modal);

		// Click outside to close
		overlay.onclick = (e) => {
			if (e.target === overlay) overlay.remove();
		};

		document.body.appendChild(overlay);
	}
})();
