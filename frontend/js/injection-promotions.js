(() => {
	const CONTAINER_SELECTOR = "main.main-background";
	const PATH_PATTERN = /^\/promosyonlar\/?$/;
	let mountedContainer = null;
	let isRendering = false;
	let promotions = [];
	let categories = [];
	let activeCategory = "all";

	const styles = `
		.promo-page-root {
			width: 100%;
			min-height: 80vh;
			font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
			padding: 0 24px 40px;
			box-sizing: border-box;
		}

		/* — Category Tabs — */
		.promo-tabs {
			display: flex;
			gap: 6px;
			padding: 16px 0 20px;
			overflow-x: auto;
			scrollbar-width: none;
			-webkit-overflow-scrolling: touch;
		}
		.promo-tabs::-webkit-scrollbar { display: none; }

		.promo-tab {
			display: inline-flex;
			align-items: center;
			gap: 7px;
			padding: 9px 18px;
			border-radius: 8px;
			border: 1px solid rgba(255,255,255,0.08);
			background: rgba(255,255,255,0.03);
			color: rgba(255,255,255,0.5);
			font-size: 12px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			cursor: pointer;
			transition: all 0.2s ease;
			white-space: nowrap;
			user-select: none;
		}
		.promo-tab:hover {
			background: rgba(255,215,0,0.06);
			border-color: rgba(255,215,0,0.15);
			color: rgba(255,255,255,0.75);
		}
		.promo-tab.active {
			background: linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,180,0,0.08));
			border-color: rgba(255,215,0,0.3);
			color: #ffd700;
			box-shadow: 0 0 16px rgba(255,215,0,0.06);
		}
		.promo-tab-icon {
			font-size: 15px;
		}

		/* — Grid — */
		.promo-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
			gap: 18px;
			width: 100%;
		}

		/* — Card — */
		.promo-card {
			background: linear-gradient(165deg, #1c1c28 0%, #141420 100%);
			border-radius: 14px;
			overflow: hidden;
			border: 1px solid rgba(255,255,255,0.04);
			cursor: pointer;
			transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
			display: flex;
			flex-direction: column;
		}
		.promo-card:hover {
			transform: translateY(-5px);
			border-color: rgba(255,215,0,0.18);
			box-shadow: 0 16px 48px rgba(0,0,0,0.45), 0 0 24px rgba(255,215,0,0.04);
		}
		.promo-card-img {
			width: 100%;
			aspect-ratio: 16/9;
			overflow: hidden;
			position: relative;
		}
		.promo-card-img img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			transition: transform 0.4s ease;
		}
		.promo-card:hover .promo-card-img img {
			transform: scale(1.04);
		}
		.promo-card-body {
			padding: 14px 16px;
			flex: 1;
			display: flex;
			flex-direction: column;
		}
		.promo-card-title {
			font-size: 13px;
			font-weight: 700;
			color: #fff;
			margin: 0 0 4px;
			line-height: 1.3;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.promo-card-subtitle {
			font-size: 11px;
			color: rgba(255,255,255,0.4);
			margin: 0;
			line-height: 1.4;
		}
		.promo-card-footer {
			padding: 0 16px 14px;
			margin-top: auto;
		}
		.promo-card-btn {
			display: block;
			width: 100%;
			padding: 10px 0;
			text-align: center;
			font-size: 12px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.8px;
			border: none;
			border-radius: 8px;
			cursor: pointer;
			transition: all 0.2s ease;
			font-family: inherit;
			background: linear-gradient(135deg, #ffd700 0%, #ffb800 100%);
			color: #1a1a24;
		}
		.promo-card-btn:hover {
			background: linear-gradient(135deg, #ffe44d 0%, #ffc933 100%);
			box-shadow: 0 4px 16px rgba(255,215,0,0.3);
		}

		/* — Empty State — */
		.promo-empty {
			grid-column: 1 / -1;
			text-align: center;
			padding: 80px 20px;
			color: rgba(255,255,255,0.25);
		}
		.promo-empty-icon {
			font-size: 52px;
			display: block;
			margin-bottom: 16px;
			opacity: 0.5;
		}
		.promo-empty-text {
			font-size: 15px;
		}

		/* — Modal — */
		.promo-modal-overlay {
			position: fixed;
			top: 0; left: 0; right: 0; bottom: 0;
			background: rgba(0,0,0,0.75);
			backdrop-filter: blur(10px);
			-webkit-backdrop-filter: blur(10px);
			z-index: 9999;
			display: flex;
			align-items: center;
			justify-content: center;
			animation: promoFadeIn 0.2s ease;
			padding: 20px;
		}
		@keyframes promoFadeIn {
			from { opacity: 0; }
			to { opacity: 1; }
		}
		@keyframes promoSlideIn {
			from { opacity: 0; transform: scale(0.94) translateY(16px); }
			to { opacity: 1; transform: scale(1) translateY(0); }
		}
		.promo-modal {
			background: linear-gradient(170deg, #1e1e2e 0%, #15151f 100%);
			border: 1px solid rgba(255,215,0,0.1);
			border-radius: 20px;
			width: min(720px, 100%);
			max-height: 90vh;
			overflow: hidden;
			display: flex;
			flex-direction: column;
			box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(255,215,0,0.03);
			animation: promoSlideIn 0.3s ease;
		}
		.promo-modal-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 20px 24px;
			border-bottom: 1px solid rgba(255,255,255,0.06);
			flex-shrink: 0;
		}
		.promo-modal-title {
			font-size: 18px;
			font-weight: 700;
			color: #fff;
			margin: 0;
			display: flex;
			align-items: center;
			gap: 10px;
		}
		.promo-modal-close {
			width: 38px;
			height: 38px;
			border-radius: 10px;
			border: 1px solid rgba(255,255,255,0.08);
			background: rgba(255,255,255,0.04);
			color: rgba(255,255,255,0.5);
			font-size: 20px;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s;
		}
		.promo-modal-close:hover {
			background: rgba(255,70,70,0.15);
			border-color: rgba(255,70,70,0.2);
			color: #ff6b6b;
		}
		.promo-modal-banner {
			width: 100%;
			max-height: 280px;
			overflow: hidden;
			flex-shrink: 0;
		}
		.promo-modal-banner img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
		.promo-modal-body {
			padding: 24px;
			overflow-y: auto;
			flex: 1;
			font-size: 14px;
			line-height: 1.75;
			color: rgba(255,255,255,0.75);
		}
		.promo-modal-body h1, .promo-modal-body h2, .promo-modal-body h3 {
			color: #fff;
			margin-top: 20px;
			margin-bottom: 10px;
		}
		.promo-modal-body h1 { font-size: 22px; }
		.promo-modal-body h2 { font-size: 18px; }
		.promo-modal-body h3 { font-size: 16px; }
		.promo-modal-body p {
			margin: 0 0 12px;
		}
		.promo-modal-body ul, .promo-modal-body ol {
			padding-left: 22px;
			margin: 10px 0;
		}
		.promo-modal-body li {
			margin-bottom: 6px;
		}
		.promo-modal-body a {
			color: #ffd700;
			text-decoration: underline;
		}
		.promo-modal-body img {
			max-width: 100%;
			border-radius: 10px;
			margin: 12px 0;
		}
		.promo-modal-body table {
			width: 100%;
			border-collapse: collapse;
			margin: 12px 0;
		}
		.promo-modal-body th, .promo-modal-body td {
			padding: 8px 12px;
			border: 1px solid rgba(255,255,255,0.1);
			text-align: left;
		}
		.promo-modal-body th {
			background: rgba(255,215,0,0.08);
			color: #ffd700;
			font-weight: 600;
		}
		.promo-modal-footer {
			padding: 16px 24px;
			border-top: 1px solid rgba(255,255,255,0.06);
			display: flex;
			justify-content: flex-end;
			flex-shrink: 0;
		}
		.promo-modal-footer-btn {
			padding: 11px 28px;
			border-radius: 10px;
			border: 1px solid rgba(255,255,255,0.08);
			background: rgba(255,255,255,0.04);
			color: rgba(255,255,255,0.6);
			font-size: 13px;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.2s;
			font-family: inherit;
		}
		.promo-modal-footer-btn:hover {
			background: rgba(255,255,255,0.1);
			color: #fff;
		}

		/* Responsive */
		@media (max-width: 768px) {
			.promo-page-root {
				padding: 0 12px 30px;
			}
			.promo-grid {
				grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
				gap: 12px;
			}
			.promo-tab {
				padding: 8px 14px;
				font-size: 11px;
			}
			.promo-modal {
				border-radius: 14px;
			}
			.promo-modal-body {
				padding: 16px;
			}
		}
		@media (max-width: 480px) {
			.promo-grid {
				grid-template-columns: 1fr 1fr;
				gap: 10px;
			}
			.promo-card-body {
				padding: 10px 12px;
			}
			.promo-card-title {
				font-size: 12px;
			}
		}
	`;

	function injectStyles() {
		if (document.getElementById("promo-injection-styles")) return;
		const el = document.createElement("style");
		el.id = "promo-injection-styles";
		el.textContent = styles;
		document.head.appendChild(el);
	}

	function getFilteredPromotions() {
		if (activeCategory === "all") return promotions;
		return promotions.filter((p) => p.category === activeCategory);
	}

	function getTabsData() {
		return [
			{ key: "all", label: "HEPSİ", icon: "🏠" },
			...categories.map((c) => ({ key: c.slug, label: c.label.toUpperCase(), icon: c.icon || "🎁" })),
		];
	}

	function renderPage(container) {
		if (isRendering) return;
		isRendering = true;
		injectStyles();

		// Remove old injection
		const existing = document.getElementById("promo-injection-root");
		if (existing) existing.remove();

		const root = document.createElement("div");
		root.className = "promo-page-root";
		root.id = "promo-injection-root";

		// Category Tabs
		const tabs = getTabsData();
		const tabsBar = document.createElement("div");
		tabsBar.className = "promo-tabs";

		tabs.forEach((tab) => {
			const el = document.createElement("div");
			el.className = "promo-tab" + (activeCategory === tab.key ? " active" : "");
			const icon = document.createElement("span");
			icon.className = "promo-tab-icon";
			icon.textContent = tab.icon;
			const label = document.createElement("span");
			label.textContent = tab.label;
			el.appendChild(icon);
			el.appendChild(label);
			el.onclick = () => {
				activeCategory = tab.key;
				renderPage(container);
			};
			tabsBar.appendChild(el);
		});
		root.appendChild(tabsBar);

		// Grid
		const grid = document.createElement("div");
		grid.className = "promo-grid";

		const filtered = getFilteredPromotions();

		if (filtered.length === 0) {
			const empty = document.createElement("div");
			empty.className = "promo-empty";
			const emptyIcon = document.createElement("span");
			emptyIcon.className = "promo-empty-icon";
			emptyIcon.textContent = "📢";
			empty.appendChild(emptyIcon);
			const emptyText = document.createElement("span");
			emptyText.className = "promo-empty-text";
			emptyText.textContent = "Bu kategoride promosyon bulunmuyor";
			empty.appendChild(emptyText);
			grid.appendChild(empty);
		} else {
			filtered.forEach((p) => {
				const card = document.createElement("div");
				card.className = "promo-card";

				// Image
				const imgWrap = document.createElement("div");
				imgWrap.className = "promo-card-img";
				const img = document.createElement("img");
				img.src = window?.toAssetUrl ? window.toAssetUrl(p.banner) : p.banner;
				img.alt = p.title || "Promosyon";
				img.loading = "lazy";
				imgWrap.appendChild(img);
				card.appendChild(imgWrap);

				// Body
				const body = document.createElement("div");
				body.className = "promo-card-body";
				const title = document.createElement("h3");
				title.className = "promo-card-title";
				title.textContent = p.title;
				body.appendChild(title);
				if (p.subtitle) {
					const sub = document.createElement("p");
					sub.className = "promo-card-subtitle";
					sub.textContent = p.subtitle;
					body.appendChild(sub);
				}
				card.appendChild(body);

				// Footer / Button
				if (p.content) {
					const footer = document.createElement("div");
					footer.className = "promo-card-footer";
					const btn = document.createElement("button");
					btn.className = "promo-card-btn";
					btn.textContent = "HEMEN İNCELE";
					btn.onclick = (e) => {
						e.stopPropagation();
						openModal(p);
					};
					footer.appendChild(btn);
					card.appendChild(footer);
				}

				card.onclick = () => {
					if (p.content) openModal(p);
				};

				grid.appendChild(card);
			});
		}

		root.appendChild(grid);

		// Insert as first child of container
		const existingRoot = container.querySelector("#promo-injection-root");
		if (existingRoot) existingRoot.remove();
		if (container.firstChild) {
			container.insertBefore(root, container.firstChild);
		} else {
			container.appendChild(root);
		}

		isRendering = false;
	}

	function openModal(promo) {
		const existing = document.getElementById("promo-detail-modal");
		if (existing) existing.remove();
		injectStyles();

		const overlay = document.createElement("div");
		overlay.id = "promo-detail-modal";
		overlay.className = "promo-modal-overlay";

		const modal = document.createElement("div");
		modal.className = "promo-modal";

		// Header
		const header = document.createElement("div");
		header.className = "promo-modal-header";
		const title = document.createElement("h3");
		title.className = "promo-modal-title";
		title.textContent = promo.title;
		const closeBtn = document.createElement("button");
		closeBtn.className = "promo-modal-close";
		closeBtn.innerHTML = "✕";
		closeBtn.onclick = () => overlay.remove();
		header.appendChild(title);
		header.appendChild(closeBtn);
		modal.appendChild(header);

		// Banner inside modal
		if (promo.banner) {
			const bannerWrap = document.createElement("div");
			bannerWrap.className = "promo-modal-banner";
			const img = document.createElement("img");
			img.src = window?.toAssetUrl ? window.toAssetUrl(promo.banner) : promo.banner;
			img.alt = promo.title;
			bannerWrap.appendChild(img);
			modal.appendChild(bannerWrap);
		}

		// Body (HTML content)
		const body = document.createElement("div");
		body.className = "promo-modal-body";
		body.innerHTML = promo.content || "<p>İçerik bulunamadı.</p>";
		modal.appendChild(body);

		// Footer
		const footer = document.createElement("div");
		footer.className = "promo-modal-footer";
		const closeFooterBtn = document.createElement("button");
		closeFooterBtn.className = "promo-modal-footer-btn";
		closeFooterBtn.textContent = "Kapat";
		closeFooterBtn.onclick = () => overlay.remove();
		footer.appendChild(closeFooterBtn);
		modal.appendChild(footer);

		// Click outside
		overlay.onclick = (e) => {
			if (e.target === overlay) overlay.remove();
		};

		// ESC key
		const onEsc = (e) => {
			if (e.key === "Escape") {
				overlay.remove();
				document.removeEventListener("keydown", onEsc);
			}
		};
		document.addEventListener("keydown", onEsc);

		overlay.appendChild(modal);
		document.body.appendChild(overlay);
	}

	async function fetchCategories() {
		try {
			const res = await fetch("https://apibizzocasino.site/auth/promotion-categories");
			if (!res.ok) return;
			const json = await res.json();
			if (json && json.success && Array.isArray(json.categories)) {
				categories = json.categories;
			}
		} catch (e) {}
	}

	async function fetchPromotions() {
		try {
			const res = await fetch("https://apibizzocasino.site/auth/promotions");
			if (!res.ok) return;
			const json = await res.json();
			if (json && json.success && Array.isArray(json.promotions)) {
				promotions = json.promotions.filter((p) => p.active !== false);
			}
		} catch (e) {}
	}

	function shouldMount() {
		return PATH_PATTERN.test(window.location.pathname);
	}

	async function tryMount() {
		if (!shouldMount()) {
			const existing = document.getElementById("promo-injection-root");
			if (existing) existing.remove();
			mountedContainer = null;
			return false;
		}

		const container = document.querySelector(CONTAINER_SELECTOR);
		if (!container) return false;

		if (mountedContainer === container && document.getElementById("promo-injection-root")) {
			return true;
		}

		await fetchCategories();
		await fetchPromotions();
		renderPage(container);
		mountedContainer = container;
		return true;
	}

	// Initial mount
	if (document.readyState !== "loading") {
		tryMount();
	} else {
		document.addEventListener("DOMContentLoaded", tryMount);
	}

	// MutationObserver for SPA navigation
	let observer = new MutationObserver(() => {
		if (isRendering) return;

		if (mountedContainer && !document.body.contains(mountedContainer)) {
			mountedContainer = null;
		}

		if (shouldMount()) {
			const container = document.querySelector(CONTAINER_SELECTOR);
			if (container && mountedContainer !== container) {
				tryMount();
			}
		} else {
			const existing = document.getElementById("promo-injection-root");
			if (existing) existing.remove();
			mountedContainer = null;
		}
	});

	observer.observe(document.documentElement, { childList: true, subtree: true });

	// SPA navigation listeners
	window.addEventListener("popstate", () => {
		setTimeout(tryMount, 100);
	});

	const originalPushState = history.pushState;
	const originalReplaceState = history.replaceState;

	history.pushState = function (...args) {
		originalPushState.apply(this, args);
		setTimeout(tryMount, 100);
	};

	history.replaceState = function (...args) {
		originalReplaceState.apply(this, args);
		setTimeout(tryMount, 100);
	};
})();
