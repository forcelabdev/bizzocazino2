(() => {
	const CONTAINER_SELECTOR = "main.main-background";
	const PATH_PATTERN = /^\/bets\/?$/;
	let mountedContainer = null;
	let isRendering = false;
	let currentPage = 1;
	let currentStatus = "";
	let isLoading = false;

	const styles = `
		.bets-page-container {
			max-width: 1200px;
			margin: 0 auto;
			padding: 20px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		}
		.bets-header {
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			padding: 24px;
			border-radius: 12px;
			margin-bottom: 24px;
		}
		.bets-header h1 {
			margin: 0 0 8px 0;
			font-size: 24px;
			font-weight: 700;
		}
		.bets-header p {
			margin: 0;
			opacity: 0.9;
			font-size: 14px;
		}
		.bets-stats {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
			gap: 16px;
			margin-bottom: 24px;
		}
		.bets-stat-card {
			background: #1e1e22;
			border-radius: 12px;
			padding: 16px;
			text-align: center;
			border: 1px solid #2a2a2e;
		}
		.bets-stat-value {
			font-size: 24px;
			font-weight: 700;
			color: #fff;
			margin-bottom: 4px;
		}
		.bets-stat-value.green { color: #2ecc71; }
		.bets-stat-value.red { color: #e74c3c; }
		.bets-stat-value.yellow { color: #f1c40f; }
		.bets-stat-value.purple { color: #9b59b6; }
		.bets-stat-label {
			font-size: 12px;
			color: #888;
			text-transform: uppercase;
		}
		.bets-filters {
			background: #1e1e22;
			border-radius: 12px;
			padding: 16px;
			margin-bottom: 24px;
			display: flex;
			gap: 12px;
			flex-wrap: wrap;
			align-items: center;
			border: 1px solid #2a2a2e;
		}
		.bets-filter-btn {
			padding: 8px 16px;
			border-radius: 20px;
			border: 1px solid #3a3a3e;
			background: transparent;
			color: #aaa;
			font-size: 13px;
			cursor: pointer;
			transition: all 0.2s;
		}
		.bets-filter-btn:hover {
			border-color: #667eea;
			color: #667eea;
		}
		.bets-filter-btn.active {
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			border-color: transparent;
			color: white;
		}
		.bets-list {
			display: flex;
			flex-direction: column;
			gap: 16px;
		}
		.bet-card {
			background: #1e1e22;
			border: 1px solid #2a2a2e;
			border-radius: 12px;
			padding: 16px;
			transition: all 0.3s;
		}
		.bet-card:hover {
			border-color: #3a3a3e;
			transform: translateY(-2px);
			box-shadow: 0 8px 24px rgba(0,0,0,0.3);
		}
		.bet-card-header {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			margin-bottom: 12px;
			padding-bottom: 12px;
			border-bottom: 1px solid #2a2a2e;
		}
		.bet-card-header-left {
			display: flex;
			flex-direction: column;
			gap: 6px;
		}
		.bet-badges {
			display: flex;
			gap: 8px;
			flex-wrap: wrap;
		}
		.bet-type-badge {
			background: rgba(102, 126, 234, 0.15);
			color: #667eea;
			padding: 3px 8px;
			border-radius: 4px;
			font-size: 10px;
			font-weight: 600;
			text-transform: uppercase;
		}
		.bet-event-count {
			background: rgba(149, 165, 166, 0.15);
			color: #95a5a6;
			padding: 3px 8px;
			border-radius: 4px;
			font-size: 10px;
			font-weight: 600;
		}
		.bet-live-badge {
			background: rgba(231, 76, 60, 0.15);
			color: #e74c3c;
			padding: 3px 8px;
			border-radius: 4px;
			font-size: 10px;
			font-weight: 600;
		}
		.bet-id {
			font-weight: 600;
			color: #667eea;
			font-size: 14px;
		}
		.bet-coupon-id {
			color: #666;
			font-size: 11px;
			margin-left: 8px;
		}
		.bet-status {
			padding: 4px 12px;
			border-radius: 20px;
			font-size: 11px;
			font-weight: 600;
			text-transform: uppercase;
		}
		.bet-status.pending {
			background: rgba(241, 196, 15, 0.2);
			color: #f1c40f;
		}
		.bet-status.won {
			background: rgba(46, 204, 113, 0.2);
			color: #2ecc71;
		}
		.bet-status.lost {
			background: rgba(231, 76, 60, 0.2);
			color: #e74c3c;
		}
		.bet-status.cancelled {
			background: rgba(149, 165, 166, 0.2);
			color: #95a5a6;
		}
		.bet-info-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
			gap: 12px;
			margin-bottom: 16px;
		}
		.bet-info-item {
			display: flex;
			flex-direction: column;
		}
		.bet-info-label {
			font-size: 11px;
			color: #666;
			margin-bottom: 4px;
			text-transform: uppercase;
		}
		.bet-info-value {
			font-weight: 600;
			color: #fff;
			font-size: 14px;
		}
		.bet-info-value.highlight {
			color: #2ecc71;
		}
		.bet-details-toggle {
			display: flex;
			align-items: center;
			justify-content: space-between;
			background: #16161a;
			padding: 12px 16px;
			border-radius: 8px;
			cursor: pointer;
			transition: all 0.2s;
			border: 1px solid #2a2a2e;
		}
		.bet-details-toggle:hover {
			border-color: #667eea;
			background: #1a1a1e;
		}
		.bet-details-toggle-text {
			font-size: 13px;
			font-weight: 600;
			color: #888;
			display: flex;
			align-items: center;
			gap: 8px;
		}
		.bet-details-toggle-text span {
			color: #667eea;
			font-size: 12px;
		}
		.bet-details-toggle-icon {
			color: #667eea;
			font-size: 18px;
			font-weight: bold;
			transition: transform 0.3s ease;
		}
		.bet-details-toggle.open .bet-details-toggle-icon {
			transform: rotate(180deg);
		}
		.bet-details {
			margin-top: 12px;
			max-height: 0;
			overflow: hidden;
			transition: max-height 0.3s ease-out, padding 0.3s ease-out;
		}
		.bet-details.open {
			max-height: 2000px;
			padding-top: 4px;
		}
		.bet-details-title {
			font-size: 13px;
			font-weight: 600;
			color: #888;
			margin-bottom: 12px;
			display: none;
		}
		.bet-event {
			background: #16161a;
			padding: 14px;
			border-radius: 10px;
			margin-bottom: 10px;
			border-left: 3px solid #667eea;
			border: 1px solid #2a2a2e;
		}
		.bet-event:last-child {
			margin-bottom: 0;
		}
		.bet-event-header {
			display: flex;
			align-items: flex-start;
			gap: 12px;
			margin-bottom: 10px;
		}
		.bet-event-number {
			width: 24px;
			height: 24px;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 12px;
			font-weight: 700;
			color: white;
			flex-shrink: 0;
		}
		.bet-event-main {
			flex: 1;
			min-width: 0;
		}
		.bet-event-match {
			font-weight: 600;
			color: #fff;
			font-size: 14px;
			margin-bottom: 4px;
		}
		.bet-event-league {
			font-size: 11px;
			color: #888;
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			align-items: center;
		}
		.sport-badge {
			background: rgba(102, 126, 234, 0.2);
			color: #667eea;
			padding: 2px 6px;
			border-radius: 4px;
			font-size: 10px;
			text-transform: uppercase;
			font-weight: 600;
		}
		.event-time {
			color: #666;
		}
		.bet-event-odds {
			display: flex;
			flex-direction: column;
			align-items: flex-end;
			gap: 4px;
		}
		.bet-event-selection {
			display: flex;
			align-items: center;
			gap: 12px;
			background: #1a1a1e;
			padding: 10px 12px;
			border-radius: 8px;
			margin-top: 8px;
		}
		.selection-market {
			font-size: 11px;
			color: #888;
			text-transform: uppercase;
		}
		.selection-pick {
			flex: 1;
			font-weight: 600;
			color: #fff;
			font-size: 13px;
		}
		.selection-odds {
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			padding: 4px 10px;
			border-radius: 6px;
			font-weight: 700;
			font-size: 13px;
			color: white;
		}
		.bet-event-score {
			margin-top: 8px;
			padding: 6px 10px;
			background: rgba(46, 204, 113, 0.1);
			border-radius: 6px;
			font-size: 12px;
			color: #2ecc71;
		}
		.bet-event-info {
			font-size: 12px;
			color: #888;
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			align-items: center;
		}
		.bet-event-status {
			padding: 2px 8px;
			border-radius: 10px;
			font-size: 10px;
			font-weight: 600;
		}
		.bet-event-status.pending { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
		.bet-event-status.won { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
		.bet-event-status.lost { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
		.bet-event-live {
			background: rgba(231, 76, 60, 0.2);
			color: #e74c3c;
			padding: 2px 6px;
			border-radius: 4px;
			font-size: 10px;
			font-weight: 700;
		}
		.bets-empty {
			text-align: center;
			padding: 60px 20px;
			background: #1e1e22;
			border-radius: 12px;
			border: 1px solid #2a2a2e;
		}
		.bets-empty-icon {
			font-size: 48px;
			margin-bottom: 16px;
		}
		.bets-empty-title {
			font-size: 18px;
			font-weight: 600;
			color: #fff;
			margin-bottom: 8px;
		}
		.bets-empty-text {
			color: #666;
			font-size: 14px;
		}
		.bets-loading {
			text-align: center;
			padding: 40px;
			color: #888;
		}
		.bets-pagination {
			display: flex;
			justify-content: center;
			gap: 8px;
			margin-top: 24px;
		}
		.bets-page-btn {
			padding: 8px 16px;
			border-radius: 8px;
			border: 1px solid #3a3a3e;
			background: #1e1e22;
			color: #aaa;
			cursor: pointer;
			transition: all 0.2s;
		}
		.bets-page-btn:hover:not(:disabled) {
			border-color: #667eea;
			color: #667eea;
		}
		.bets-page-btn:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
		.bets-page-btn.active {
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			border-color: transparent;
			color: white;
		}
		.bets-login-required {
			text-align: center;
			padding: 60px 20px;
			background: #1e1e22;
			border-radius: 12px;
			border: 1px solid #2a2a2e;
		}
		.bets-login-btn {
			margin-top: 16px;
			padding: 12px 32px;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			border: none;
			border-radius: 8px;
			color: white;
			font-weight: 600;
			cursor: pointer;
			font-size: 14px;
		}
		.bets-login-btn:hover {
			opacity: 0.9;
		}
	`;

	function injectStyles() {
		if (document.getElementById("bets-injection-styles")) return;
		const styleEl = document.createElement("style");
		styleEl.id = "bets-injection-styles";
		styleEl.textContent = styles;
		document.head.appendChild(styleEl);
	}

	function formatDate(dateStr) {
		if (!dateStr) return "-";
		const date = new Date(dateStr);
		return date.toLocaleString("tr-TR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	function formatMoney(amount) {
		return (
			parseFloat(amount || 0).toLocaleString("tr-TR", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}) + " ₺"
		);
	}

	function getStatusText(status) {
		const map = {
			pending: "Beklemede",
			won: "Kazandı",
			lost: "Kaybetti",
			cancelled: "İptal",
		};
		return map[status] || status;
	}

	async function fetchBets(status = "", page = 1) {
		const token = localStorage.getItem("token");
		if (!token) return null;

		const params = new URLSearchParams({page, limit: 20});
		if (status) params.append("status", status);
		https://apibizzocasino.site;
		try {
			const res = await fetch(`https://apibizzocasino.site/auth/sports-bets?${params.toString()}`, {
				headers: {"x-auth-token": token},
			});
			if (!res.ok) return null;
			return await res.json();
		} catch (e) {
			console.error("fetchBets error:", e);
			return null;
		}
	}

	async function fetchStats() {
		const token = localStorage.getItem("token");
		if (!token) return null;
		https://apibizzocasino.site;
		try {
			const res = await fetch("https://apibizzocasino.site/auth/sports-bets-stats", {
				headers: {"x-auth-token": token},
			});
			if (!res.ok) return null;
			return await res.json();
		} catch (e) {
			console.error("fetchStats error:", e);
			return null;
		}
	}

	function renderStats(stats) {
		if (!stats) {
			return `<div class="bets-stats">
				<div class="bets-stat-card">
					<div class="bets-stat-value">0</div>
					<div class="bets-stat-label">Toplam Bahis</div>
				</div>
				<div class="bets-stat-card">
					<div class="bets-stat-value">0.00 ₺</div>
					<div class="bets-stat-label">Toplam Yatırım</div>
				</div>
				<div class="bets-stat-card">
					<div class="bets-stat-value green">0</div>
					<div class="bets-stat-label">Kazanan</div>
				</div>
				<div class="bets-stat-card">
					<div class="bets-stat-value red">0</div>
					<div class="bets-stat-label">Kaybeden</div>
				</div>
				<div class="bets-stat-card">
					<div class="bets-stat-value yellow">0</div>
					<div class="bets-stat-label">Bekleyen</div>
				</div>
			</div>`;
		}

		return `
			<div class="bets-stats">
				<div class="bets-stat-card">
					<div class="bets-stat-value purple">${stats.totalBets || 0}</div>
					<div class="bets-stat-label">Toplam Bahis</div>
				</div>
				<div class="bets-stat-card">
					<div class="bets-stat-value">${formatMoney(stats.totalAmount)}</div>
					<div class="bets-stat-label">Toplam Yatırım</div>
				</div>
				<div class="bets-stat-card">
					<div class="bets-stat-value green">${stats.totalWon || 0}</div>
					<div class="bets-stat-label">Kazanan</div>
				</div>
				<div class="bets-stat-card">
					<div class="bets-stat-value red">${stats.totalLost || 0}</div>
					<div class="bets-stat-label">Kaybeden</div>
				</div>
				<div class="bets-stat-card">
					<div class="bets-stat-value yellow">${stats.totalPending || 0}</div>
					<div class="bets-stat-label">Bekleyen</div>
				</div>
				<div class="bets-stat-card">
					<div class="bets-stat-value green">${formatMoney(stats.totalWinAmount)}</div>
					<div class="bets-stat-label">Toplam Kazanç</div>
				</div>
			</div>
		`;
	}

	function renderFilters() {
		const filters = [
			{value: "", label: "Tümü"},
			{value: "pending", label: "Beklemede"},
			{value: "won", label: "Kazandı"},
			{value: "lost", label: "Kaybetti"},
			{value: "cancelled", label: "İptal"},
		];

		return `
			<div class="bets-filters">
				${filters
					.map(
						(f) => `
					<button class="bets-filter-btn ${currentStatus === f.value ? "active" : ""}" data-status="${f.value}">
						${f.label}
					</button>
				`
					)
					.join("")}
			</div>
		`;
	}

	function renderBetCard(bet) {
		const eventsHtml = (bet.details || [])
			.map((ev, idx) => {
				const matchTitle = ev.matchTitle || ev.match_title || "";
				const homeTeam = ev.homeTeam || ev.home_team || "";
				const awayTeam = ev.awayTeam || ev.away_team || "";
				const sportType = ev.sportType || ev.sport_type || "";
				const leagueName = ev.leagueName || ev.league_name || "";
				const marketName = ev.marketName || ev.market_name || ev.marketType || "";
				const pick = ev.displayText || ev.display_text || ev.pick || "";
				const odds = parseFloat(ev.odds || ev.price || 1).toFixed(2);
				const eventStatus = ev.status || "pending";
				const isLive = ev.isLive || ev.is_live;
				const finalScore = ev.finalScore || ev.scores?.final || "";
				const startTime = ev.startTimestamp
					? new Date(ev.startTimestamp).toLocaleString("tr-TR", {
							day: "2-digit",
							month: "2-digit",
							hour: "2-digit",
							minute: "2-digit",
					  })
					: "";

				// Determine display title
				let displayMatch = matchTitle;
				if (!displayMatch && homeTeam && awayTeam) {
					displayMatch = `${homeTeam} vs ${awayTeam}`;
				}
				if (!displayMatch) displayMatch = "Maç Bilgisi";

				return `
				<div class="bet-event">
					<div class="bet-event-header">
						<div class="bet-event-number">${idx + 1}</div>
						<div class="bet-event-main">
							<div class="bet-event-match">${displayMatch}</div>
							${
								leagueName || sportType
									? `
							<div class="bet-event-league">
								${sportType ? `<span class="sport-badge">${sportType}</span>` : ""}
								${leagueName || ""}
								${startTime ? `<span class="event-time">⏰ ${startTime}</span>` : ""}
							</div>
							`
									: ""
							}
						</div>
						<div class="bet-event-odds">
							<span class="bet-event-status ${eventStatus}">${getStatusText(eventStatus)}</span>
							${isLive ? '<span class="bet-event-live">🔴 CANLI</span>' : ""}
						</div>
					</div>
					<div class="bet-event-selection">
						<div class="selection-market">${marketName}</div>
						<div class="selection-pick">${pick}</div>
						<div class="selection-odds">@${odds}</div>
					</div>
					${
						finalScore
							? `
					<div class="bet-event-score">
						<span>📊 Skor: ${finalScore}</span>
					</div>
					`
							: ""
					}
				</div>
			`;
			})
			.join("");

		return `
			<div class="bet-card">
				<div class="bet-card-header">
					<div class="bet-card-header-left">
						<span class="bet-id">Kupon #${bet.externalCouponId || bet._id}</span>
						${bet.externalBetId ? `<span class="bet-coupon-id">Bet ID: ${bet.externalBetId}</span>` : ""}
						<div class="bet-badges">
							${bet.betType ? `<span class="bet-type-badge">${bet.betType === "single" ? "Tekli" : bet.betType === "multiple" ? "Çoklu" : bet.betType === "system" ? "Sistem" : bet.betType}</span>` : ""}
							${bet.eventCount > 0 ? `<span class="bet-event-count">${bet.eventCount} maç</span>` : bet.details?.length > 0 ? `<span class="bet-event-count">${bet.details.length} maç</span>` : ""}
							${bet.isLive ? '<span class="bet-live-badge">🔴 CANLI</span>' : ""}
						</div>
					</div>
					<span class="bet-status ${bet.status}">${getStatusText(bet.status)}</span>
				</div>
				<div class="bet-info-grid">
					<div class="bet-info-item">
						<span class="bet-info-label">Tutar</span>
						<span class="bet-info-value">${formatMoney(bet.amount)}</span>
					</div>
					<div class="bet-info-item">
						<span class="bet-info-label">Toplam Oran</span>
						<span class="bet-info-value">${parseFloat(bet.totalOdds || 1).toFixed(2)}</span>
					</div>
					<div class="bet-info-item">
						<span class="bet-info-label">Potansiyel Kazanç</span>
						<span class="bet-info-value highlight">${formatMoney(bet.potentialWin)}</span>
					</div>
					${
						bet.status === "won"
							? `
					<div class="bet-info-item">
						<span class="bet-info-label">Kazanılan</span>
						<span class="bet-info-value highlight">${formatMoney(bet.actualWin)}</span>
					</div>
					`
							: ""
					}
					<div class="bet-info-item">
						<span class="bet-info-label">Tarih</span>
						<span class="bet-info-value">${formatDate(bet.createdAt)}</span>
					</div>
					${
						bet.settledAt
							? `
					<div class="bet-info-item">
						<span class="bet-info-label">Sonuçlanma</span>
						<span class="bet-info-value">${formatDate(bet.settledAt)}</span>
					</div>
					`
							: ""
					}
				</div>
				${
					bet.details && bet.details.length > 0
						? `
				<div class="bet-details-toggle" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('open');">
					<div class="bet-details-toggle-text">
						📋 Bahis Detayları <span>(${bet.details.length} seçim)</span>
					</div>
					<span class="bet-details-toggle-icon">▼</span>
				</div>
				<div class="bet-details">
					${eventsHtml}
				</div>
				`
						: ""
				}
			</div>
		`;
	}

	function renderPagination(pagination) {
		if (!pagination || pagination.totalPages <= 1) return "";

		const {page, totalPages} = pagination;
		let buttons = [];

		// Previous button
		buttons.push(`<button class="bets-page-btn" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>‹ Önceki</button>`);

		// Page numbers
		const start = Math.max(1, page - 2);
		const end = Math.min(totalPages, page + 2);

		if (start > 1) {
			buttons.push(`<button class="bets-page-btn" data-page="1">1</button>`);
			if (start > 2) buttons.push(`<span style="color:#666;">...</span>`);
		}

		for (let i = start; i <= end; i++) {
			buttons.push(`<button class="bets-page-btn ${i === page ? "active" : ""}" data-page="${i}">${i}</button>`);
		}

		if (end < totalPages) {
			if (end < totalPages - 1) buttons.push(`<span style="color:#666;">...</span>`);
			buttons.push(`<button class="bets-page-btn" data-page="${totalPages}">${totalPages}</button>`);
		}

		// Next button
		buttons.push(`<button class="bets-page-btn" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>Sonraki ›</button>`);

		return `<div class="bets-pagination">${buttons.join("")}</div>`;
	}

	function renderEmpty() {
		return `
			<div class="bets-empty">
				<div class="bets-empty-icon">🎫</div>
				<div class="bets-empty-title">Henüz bahisiniz bulunmuyor</div>
				<div class="bets-empty-text">Spor bahisleri yaptığınızda kuponlarınız burada görünecektir.</div>
			</div>
		`;
	}

	function renderLoginRequired() {
		return `
			<div class="bets-login-required">
				<div class="bets-empty-icon">🔒</div>
				<div class="bets-empty-title">Giriş Yapmanız Gerekiyor</div>
				<div class="bets-empty-text">Bahis geçmişinizi görmek için lütfen giriş yapın.</div>
				<button class="bets-login-btn" onclick="window._app_store_ && window._app_store_.dispatch('modalsSetShow', 'Login')">
					Giriş Yap
				</button>
			</div>
		`;
	}

	function renderLoading() {
		return `<div class="bets-loading">Bahisler yükleniyor...</div>`;
	}

	async function renderPage(container) {
		if (isRendering) return;
		isRendering = true;

		injectStyles();

		const token = localStorage.getItem("token");

		// Create wrapper
		const wrapper = document.createElement("div");
		wrapper.className = "bets-page-container";
		wrapper.id = "bets-injection-root";

		// Header
		wrapper.innerHTML = `
			<div class="bets-header">
				<h1>🎫 Bahis Geçmişim</h1>
				<p>Spor bahislerinizi ve kupon durumlarınızı buradan takip edebilirsiniz.</p>
			</div>
		`;

		// Check if logged in
		if (!token) {
			wrapper.innerHTML += renderLoginRequired();
			insertAsFirstChild(container, wrapper);
			isRendering = false;
			return;
		}

		// Show loading initially
		wrapper.innerHTML += `<div id="bets-stats-container"></div>`;
		wrapper.innerHTML += renderFilters();
		wrapper.innerHTML += `<div id="bets-list-container">${renderLoading()}</div>`;
		wrapper.innerHTML += `<div id="bets-pagination-container"></div>`;

		insertAsFirstChild(container, wrapper);

		// Attach filter listeners
		attachFilterListeners();

		// Load data
		await loadData();

		isRendering = false;
	}

	function insertAsFirstChild(container, element) {
		// Remove existing injection if any
		const existing = document.getElementById("bets-injection-root");
		if (existing) existing.remove();

		if (container.firstChild) {
			container.insertBefore(element, container.firstChild);
		} else {
			container.appendChild(element);
		}
	}

	async function loadData() {
		if (isLoading) return;
		isLoading = true;

		const statsContainer = document.getElementById("bets-stats-container");
		const listContainer = document.getElementById("bets-list-container");
		const paginationContainer = document.getElementById("bets-pagination-container");

		if (listContainer) listContainer.innerHTML = renderLoading();

		// Fetch stats and bets in parallel
		const [statsRes, betsRes] = await Promise.all([fetchStats(), fetchBets(currentStatus, currentPage)]);

		// Render stats
		if (statsContainer) {
			statsContainer.innerHTML = renderStats(statsRes?.stats);
		}

		// Render bets
		if (listContainer) {
			if (!betsRes || !betsRes.success || !betsRes.bets || betsRes.bets.length === 0) {
				listContainer.innerHTML = renderEmpty();
			} else {
				listContainer.innerHTML = `<div class="bets-list">${betsRes.bets.map(renderBetCard).join("")}</div>`;
			}
		}

		// Render pagination
		if (paginationContainer && betsRes?.pagination) {
			paginationContainer.innerHTML = renderPagination(betsRes.pagination);
			attachPaginationListeners();
		}

		isLoading = false;
	}

	function attachFilterListeners() {
		document.querySelectorAll(".bets-filter-btn").forEach((btn) => {
			btn.addEventListener("click", async (e) => {
				const status = e.target.dataset.status;
				currentStatus = status;
				currentPage = 1;

				// Update active state
				document.querySelectorAll(".bets-filter-btn").forEach((b) => b.classList.remove("active"));
				e.target.classList.add("active");

				await loadData();
			});
		});
	}

	function attachPaginationListeners() {
		document.querySelectorAll(".bets-page-btn").forEach((btn) => {
			btn.addEventListener("click", async (e) => {
				const page = parseInt(e.target.dataset.page);
				if (isNaN(page) || e.target.disabled) return;

				currentPage = page;
				await loadData();

				// Scroll to top of bets list
				const listContainer = document.getElementById("bets-list-container");
				if (listContainer) {
					listContainer.scrollIntoView({behavior: "smooth", block: "start"});
				}
			});
		});
	}

	function shouldMount() {
		return PATH_PATTERN.test(window.location.pathname);
	}

	async function tryMount() {
		if (!shouldMount()) {
			// If not on /bets page, cleanup
			const existing = document.getElementById("bets-injection-root");
			if (existing) existing.remove();
			mountedContainer = null;
			return false;
		}

		const container = document.querySelector(CONTAINER_SELECTOR);
		if (!container) return false;

		// Already mounted to this container
		if (mountedContainer === container && document.getElementById("bets-injection-root")) {
			return true;
		}

		await renderPage(container);
		mountedContainer = container;
		return true;
	}

	// Initial mount
	if (document.readyState !== "loading") {
		tryMount();
	} else {
		document.addEventListener("DOMContentLoaded", tryMount);
	}

	// Observer for SPA navigation
	let observer = new MutationObserver(() => {
		if (isRendering) return;

		// Check if container was removed
		if (mountedContainer && !document.body.contains(mountedContainer)) {
			mountedContainer = null;
		}

		// Try to mount if on correct path
		if (shouldMount()) {
			const container = document.querySelector(CONTAINER_SELECTOR);
			if (container && mountedContainer !== container) {
				tryMount();
			}
		} else {
			// Cleanup if navigated away
			const existing = document.getElementById("bets-injection-root");
			if (existing) existing.remove();
			mountedContainer = null;
		}
	});

	observer.observe(document.documentElement, {childList: true, subtree: true});

	// Listen for popstate (back/forward navigation)
	window.addEventListener("popstate", () => {
		setTimeout(tryMount, 100);
	});

	// Listen for pushState/replaceState
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
