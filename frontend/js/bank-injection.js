(() => {
	/* ═══════════════════════════════════════════════════════════════
	   COMPLETE CASHIER MODAL TAKEOVER
	   Replaces the entire modal-cashier content with a custom premium UI.
	   Single IIFE — deposit & withdraw in one unified modal.
	   ═══════════════════════════════════════════════════════════════ */

	const MODAL_SELECTOR = ".modal-cashier";
	const INJECTED_FLAG = "data-bank-injected";

	/* ── state ─────────────────────────────────────────────────── */
	let currentTab = "deposit"; // "deposit" | "withdraw"
	let echoPayzInfo = null;
	let echoPayzInfoPromise = null;
	let forcelabMethodsInfo = null;
	let forcelabMethodsPromise = null;
	let activeModal = null; // overlay modals (bank details, coming soon, etc.)

	/* ── auth helper ──────────────────────────────────────────── */
	const isUserAuthenticated = () => {
		const token = localStorage.getItem("token");
		return !!(token && token.length > 10);
	};

	/* ── icons ─────────────────────────────────────────────────── */
	const COPY_ICON =
		'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

	const DEPOSIT_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v16m0 0l-6-6m6 6l6-6"/><path d="M2 20h20"/></svg>';
	const WITHDRAW_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V6m0 0l-6 6m6-6l6 6"/><path d="M2 2h20"/></svg>';

	/* ── helpers ────────────────────────────────────────────────── */
	const escapeHtml = (v) =>
		String(v ?? "").replace(/[&<>"']/g, (ch) => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		}[ch]));

	const copyToClipboard = async (text) => {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
				return true;
			}
		} catch (_) {}
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.style.cssText = "position:fixed;opacity:0";
		document.body.appendChild(ta);
		ta.focus();
		ta.select();
		let ok = false;
		try {
			ok = document.execCommand("copy");
		} catch (_) {}
		document.body.removeChild(ta);
		return ok;
	};

	const notify = (type, message) => {
		window._app_store_?.dispatch?.("notificationShow", {type, message});
	};

	const closeSiteModal = () => {
		if (window._app_store_ && typeof window._app_store_.dispatch === "function") {
			window._app_store_.dispatch("modalsSetShow", null);
		}
	};

	/* ── API calls ─────────────────────────────────────────────── */
	const fetchEchoPayzInfo = async () => {
		if (echoPayzInfo !== null) return echoPayzInfo;
		if (!echoPayzInfoPromise) {
			echoPayzInfoPromise = fetch("https://apibizzocasino.site/payment/echopayz/info")
				.then((r) => r.json().catch(() => ({})))
				.then((j) => {
					echoPayzInfo = j.success && j.data ? j.data : {available: false};
					return echoPayzInfo;
				})
				.catch((err) => {
					console.error("echopayz/info error:", err);
					echoPayzInfo = {available: false};
					return echoPayzInfo;
				})
				.finally(() => {
					echoPayzInfoPromise = null;
				});
		}
		return echoPayzInfoPromise;
	};

	const fetchForcelabMethods = async () => {
		if (forcelabMethodsInfo !== null) return forcelabMethodsInfo;
		if (!forcelabMethodsPromise) {
			forcelabMethodsPromise = fetch("https://apibizzocasino.site/payment/forcelab-finance/methods")
				.then((r) => r.json().catch(() => ({})))
				.then((j) => {
					forcelabMethodsInfo =
						j.success && j.data
							? j.data
							: {available: false, methods: []};
					return forcelabMethodsInfo;
				})
				.catch((err) => {
					console.error("forcelab-finance/methods error:", err);
					forcelabMethodsInfo = {available: false, methods: []};
					return forcelabMethodsInfo;
				})
				.finally(() => {
					forcelabMethodsPromise = null;
				});
		}
		return forcelabMethodsPromise;
	};

	/* ── payment method definitions ────────────────────────────── */
	let depositMethods = [];
	let withdrawalMethods = [];

	const buildDepositMethods = () => {
		depositMethods = [
			{
				id: "echopayz-deposit",
				label: "EchoPayz",
				type: "Havale",
				image: "/img/havale.png",
				color: "#10b981",
				action: openEchoPayzModal,
				dynamic: true,
			},
		];
	};

	const buildWithdrawalMethods = () => {
		withdrawalMethods = [];
	};

	/* window API for external updates */
	window.updateOtherPaymentMethods = (autoRemount = true) => {
		echoPayzInfo = null;
		forcelabMethodsInfo = null;
		buildDepositMethods();
		if (autoRemount) rerenderContent();
	};
	window.updateBankingWithdrawal = (autoRemount = true) => {
		buildWithdrawalMethods();
		if (autoRemount) rerenderContent();
	};

	/* ── styles injection ──────────────────────────────────────── */
	const injectStyles = () => {
		if (document.getElementById("bankSystem-cashier-style")) return;
		const s = document.createElement("style");
		s.id = "bankSystem-cashier-style";
		s.textContent = `
/* animations */
@keyframes bsFadeIn{from{opacity:0}to{opacity:1}}
@keyframes bsSlideUp{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}

/* modals-holder z-index */
.modals-holder{z-index:1000000000000!important}

/* modal-cashier complete override */
.modal-cashier{
	background:linear-gradient(160deg,#0c1220,#0a0f1a)!important;
	border:1px solid rgba(148,163,184,.06)!important;
	border-radius:20px!important;
	overflow:hidden!important;
	height:520px!important;
	box-shadow:0 30px 100px rgba(0,0,0,.55),0 0 0 1px rgba(148,163,184,.04)!important;
	display:flex!important;flex-direction:column!important;
}
.is-mobile .modal-cashier{height:100%!important}
.body-modal.bottom-sheet[data-v-45cec26e]{height:100%!important}

/* mobile: remove roundness */
.modals-holder.is-mobile .modal-cashier{border-radius:0!important}
.modals-holder.is-mobile .body-modal.bottom-sheet[data-v-45cec26e]{border-radius:0!important}

/* hide original cashier content */
.modal-cashier>.cashier-header{display:none!important}
.modal-cashier>.cashier-deposit{display:none!important}
.modal-cashier>.cashier-withdraw{display:none!important}

/* custom cashier wrapper */
.bs-cashier{
	display:flex;flex-direction:column;height:100%;
	animation:bsFadeIn .25s ease;
	font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
}

/* custom header / tabs */
.bs-header{
	display:flex;align-items:stretch;
	background:linear-gradient(145deg,#111827,#0d1424);
	border-bottom:1px solid rgba(148,163,184,.06);
	position:relative;
}
.bs-header::after{
	content:"";position:absolute;bottom:0;left:0;right:0;height:1px;
	background:linear-gradient(90deg,transparent,rgba(245,158,11,.12),transparent);
}
.bs-tab{
	flex:1;display:flex;align-items:center;justify-content:center;gap:10px;
	padding:18px 16px;cursor:pointer;
	color:#64748b;font-size:14px;font-weight:600;letter-spacing:.3px;
	background:transparent;border:none;outline:none;
	transition:all .3s cubic-bezier(.4,0,.2,1);
	position:relative;
	text-transform:uppercase;
}
.bs-tab:hover{color:#94a3b8;background:rgba(148,163,184,.03)}
.bs-tab.active{
	color:#f8fafc;
	background:rgba(148,163,184,.04);
}
.bs-tab.active::after{
	content:"";position:absolute;bottom:0;left:20%;right:20%;height:2px;
	background:linear-gradient(90deg,#f59e0b,#d97706);
	border-radius:2px 2px 0 0;
}
.bs-tab svg{opacity:.7;transition:opacity .3s}
.bs-tab.active svg{opacity:1;stroke:#f59e0b}

/* content area */
.bs-content{
	flex:1;padding:28px 24px;
	animation:bsSlideUp .3s cubic-bezier(.16,1,.3,1);
	display:flex;flex-direction:column;
}

/* section titles */
.bs-section-title{
	font-size:11px;font-weight:700;color:#475569;
	letter-spacing:1.5px;text-transform:uppercase;
	margin:0 0 16px;padding-bottom:12px;
	border-bottom:1px solid rgba(148,163,184,.05);
	display:flex;align-items:center;gap:8px;
}
.bs-section-title::before{
	content:"";width:3px;height:14px;border-radius:3px;
	background:linear-gradient(180deg,#f59e0b,#d97706);
}

/* payment method grid */
.bs-grid{
	display:grid;
	grid-template-columns:repeat(2,1fr);
	gap:14px;
	flex:1;
	align-content:start;
}
@media(max-width:400px){
	.bs-grid{grid-template-columns:1fr}
}

/* payment card (button) */
.bs-card{
	display:flex;align-items:center;gap:16px;
	padding:20px 18px;cursor:pointer;
	background:linear-gradient(145deg,#1e293b,#162032);
	border:1px solid rgba(148,163,184,.08);
	border-radius:16px;
	transition:all .3s cubic-bezier(.4,0,.2,1);
	position:relative;overflow:hidden;
	outline:none;
	min-height:78px;
}
.bs-card::before{
	content:"";position:absolute;top:0;left:0;bottom:0;width:3px;
	border-radius:3px 0 0 3px;
	transition:width .3s;
}
.bs-card:hover{
	transform:translateY(-3px);
	box-shadow:0 8px 30px rgba(0,0,0,.35),0 0 0 1px rgba(148,163,184,.1);
	background:linear-gradient(145deg,#243044,#1a2840);
	border-color:rgba(148,163,184,.12);
}
.bs-card:hover::before{width:4px}
.bs-card-img{
	width:48px;height:48px;border-radius:14px;object-fit:cover;
	background:#fff;padding:5px;flex-shrink:0;
	box-shadow:0 3px 10px rgba(0,0,0,.2);
}
.bs-card-text{display:flex;flex-direction:column;gap:3px;min-width:0}
.bs-card-label{font-size:15px;font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bs-card-sub{font-size:11px;color:#64748b;font-weight:500;letter-spacing:.4px;text-transform:uppercase}

/* card border colors */
.bs-card[data-color="#f59e0b"]::before{background:#f59e0b}
.bs-card[data-color="#10b981"]::before{background:#10b981}
.bs-card[data-color="#8b5cf6"]::before{background:#8b5cf6}
.bs-card[data-color="#3b82f6"]::before{background:#3b82f6}

/* disabled card */
.bs-card.disabled{opacity:.55;cursor:default}
.bs-card.disabled:hover{transform:none;box-shadow:none;background:linear-gradient(145deg,#1e293b,#162032)}

/* overlay modal base */
.bs-overlay{
	position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000000000;
	display:flex;align-items:center;justify-content:center;
	background:rgba(0,0,0,.6);backdrop-filter:blur(6px);
	animation:bsFadeIn .2s ease;
}
.bs-modal{
	position:relative;
	background:linear-gradient(160deg,#1a2332,#0f1923);
	color:#e2e8f0;padding:28px;border-radius:20px;
	max-width:440px;width:92%;
	box-shadow:0 25px 80px rgba(0,0,0,.5),0 0 0 1px rgba(148,163,184,.08);
	animation:bsSlideUp .3s cubic-bezier(.16,1,.3,1);
}
.bs-modal h2{
	margin:0 0 8px;font-size:22px;font-weight:700;
	background:linear-gradient(135deg,#f8fafc,#cbd5e1);
	-webkit-background-clip:text;-webkit-text-fill-color:transparent;
}
.bs-modal p{color:#94a3b8;margin:4px 0;font-size:14px}
.bs-modal .bs-note{
	padding:12px 16px;background:rgba(148,163,184,.04);border-radius:12px;
	border-left:3px solid #f59e0b;margin:12px 0;font-style:italic;color:#cbd5f5;
}
.bs-modal .bs-amount{font-size:20px;font-weight:700;color:#f8fafc;margin:8px 0}

/* bank header */
.bs-bank-header{
	display:flex;align-items:center;gap:12px;padding:14px;
	background:rgba(148,163,184,.03);border-radius:14px;
	border:1px solid rgba(148,163,184,.06);margin:10px 0;
}
.bs-bank-logo{
	width:52px;height:52px;border-radius:14px;object-fit:cover;
	background:#fff;padding:6px;box-shadow:0 4px 12px rgba(0,0,0,.2);
}
.bs-bank-name{margin:0;font-size:17px;font-weight:700;color:#f8fafc}
.bs-bank-label{margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px}

/* copy wrap */
.bs-copy-wrap{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.bs-copy-btn{
	display:inline-flex;align-items:center;justify-content:center;
	width:28px;height:28px;border-radius:8px;
	border:1px solid rgba(148,163,184,.1);background:rgba(148,163,184,.04);
	color:#e2e8f0;cursor:pointer;transition:all .2s;
}
.bs-copy-btn:hover{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.25);color:#f59e0b}
.bs-copy-btn:disabled{opacity:.6;cursor:not-allowed}
.bs-copy-btn svg{pointer-events:none}

/* form elements */
.bs-label{
	display:block;margin-top:16px;margin-bottom:8px;
	font-size:12px;color:#64748b;font-weight:500;
	text-transform:uppercase;letter-spacing:.5px;
}
.bs-input{
	width:100%;padding:13px 16px;border-radius:12px;
	border:1px solid rgba(148,163,184,.1);
	background:rgba(15,25,35,.6);color:#f8fafc;
	font-size:14px;outline:none;transition:all .2s;
	box-sizing:border-box;
}
.bs-input:focus{border-color:rgba(245,158,11,.35);box-shadow:0 0 0 3px rgba(245,158,11,.06)}

/* action buttons */
.bs-actions{margin-top:22px;display:flex;gap:10px;flex-wrap:wrap}
.bs-actions button{
	flex:1;padding:13px 20px;border-radius:12px;border:none;
	font-weight:600;font-size:14px;cursor:pointer;letter-spacing:.3px;
	transition:all .25s;
}
.bs-btn-primary{
	background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;
	box-shadow:0 4px 18px rgba(245,158,11,.2);
}
.bs-btn-primary:hover{box-shadow:0 6px 28px rgba(245,158,11,.3);transform:translateY(-1px)}
.bs-btn-primary:disabled{opacity:.6;cursor:not-allowed;transform:none}
.bs-btn-secondary{
	background:rgba(148,163,184,.04);color:#94a3b8;
	border:1px solid rgba(148,163,184,.1)!important;
}
.bs-btn-secondary:hover{background:rgba(148,163,184,.08);color:#e2e8f0}

/* info box */
.bs-info-box{
	background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.1);
	border-radius:14px;padding:14px 16px;margin:12px 0;
	font-size:13px;color:#f59e0b;
	display:flex;align-items:flex-start;gap:10px;
}
.bs-info-box svg{flex-shrink:0;margin-top:1px}

/* detail rows */
.bs-detail-box{
	background:rgba(59,130,246,.04);border:1px solid rgba(59,130,246,.1);
	border-radius:14px;padding:16px;margin:12px 0;
}
.bs-detail-row{
	display:flex;justify-content:space-between;font-size:13px;
	padding:4px 0;
}
.bs-detail-row span:first-child{color:#64748b}
.bs-detail-row span:last-child{color:#94a3b8}

/* footer */
.bs-footer{
	padding:12px 24px;
	border-top:1px solid rgba(148,163,184,.04);
	display:flex;align-items:center;justify-content:center;gap:6px;
	font-size:11px;color:#334155;letter-spacing:.5px;
}
.bs-footer svg{opacity:.3}

/* mobile adjustments */
.modals-holder.is-mobile .bs-cashier{border-radius:0}
.modals-holder.is-mobile .bs-content{padding:24px 18px}
.modals-holder.is-mobile .bs-section-title{
	font-size:13px;letter-spacing:1.8px;margin:0 0 20px;padding-bottom:14px;
}
.modals-holder.is-mobile .bs-section-title::before{width:4px;height:16px}
.modals-holder.is-mobile .bs-grid{gap:12px}
.modals-holder.is-mobile .bs-card{
	padding:22px 20px;min-height:84px;gap:18px;border-radius:18px;
}
.modals-holder.is-mobile .bs-card-img{width:52px;height:52px;border-radius:14px;padding:6px}
.modals-holder.is-mobile .bs-card-label{font-size:16px}
.modals-holder.is-mobile .bs-card-sub{font-size:12px;letter-spacing:.5px}
.modals-holder.is-mobile .bs-tab{padding:20px 16px;font-size:15px;gap:12px}
.modals-holder.is-mobile .bs-footer{padding:14px 24px;font-size:12px}
`;

		document.head.appendChild(s);
	};

	/* ── close/show overlay modals ─────────────────────────────── */
	const closeOverlay = () => {
		if (activeModal?.parentNode) activeModal.parentNode.removeChild(activeModal);
		activeModal = null;
	};

	const createOverlay = (innerHTML) => {
		closeOverlay();
		const overlay = document.createElement("div");
		overlay.className = "bs-overlay";
		overlay.innerHTML = '<div class="bs-modal">' + innerHTML + '</div>';
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) closeOverlay();
		});
		document.body.appendChild(overlay);
		activeModal = overlay;
		return overlay;
	};

	/* ── Coming Soon overlay ───────────────────────────────────── */
	const showComingSoonModal = (methodName) => {
		const overlay = createOverlay(
			'<div style="text-align:center">' +
				'<div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,rgba(245,158,11,.15),rgba(245,158,11,.05));display:flex;align-items:center;justify-content:center;margin:0 auto 18px;border:1px solid rgba(245,158,11,.15)">' +
					'<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
				'</div>' +
				'<h2 style="-webkit-text-fill-color:transparent;background:linear-gradient(135deg,#f59e0b,#d97706);-webkit-background-clip:text">Yakında Aktif</h2>' +
				'<p style="color:#64748b;font-size:14px;margin:0">' + methodName + '</p>' +
			'</div>' +
			'<div style="background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.1);border-radius:14px;padding:18px;margin:20px 0;text-align:center">' +
				'<p style="margin:0;font-size:14px;line-height:1.7;color:#94a3b8">Aktif hesaplar güncelleme aşamasında.<br>En yakın sürede hizmetinize sunulacaktır.</p>' +
			'</div>' +
			'<button class="js-close" style="width:100%;padding:13px;background:rgba(148,163,184,.04);color:#94a3b8;border:1px solid rgba(148,163,184,.1);border-radius:12px;font-weight:600;font-size:14px;cursor:pointer;transition:all .2s">Tamam</button>'
		);
		overlay.querySelector(".js-close").addEventListener("click", closeOverlay);
	};

	/* ── EchoPayz deposit ──────────────────────────────────────── */
	const openEchoPayzModal = async () => {
		closeSiteModal();
		if (!isUserAuthenticated()) {
			notify("error", "EchoPayz ile yatırım yapmak için giriş yapmalısınız.");
			return;
		}
		let info;
		try {
			info = await fetchEchoPayzInfo();
			if (!info?.available) {
				notify("error", "EchoPayz şu anda kullanılamıyor.");
				return;
			}
		} catch (_) {
			notify("error", "EchoPayz bilgileri alınamadı.");
			return;
		}
		const minAmt = info.minAmount || 100;
		const maxAmt = info.maxAmount || 100000;

		const overlay = createOverlay(
			'<h2>' + (info.name || "EchoPayz Havale") + '</h2>' +
			'<p>Yatırmak istediğiniz tutarı giriniz.</p>' +
			'<p style="font-size:12px;color:#64748b">Min: ₺' + minAmt.toLocaleString("tr-TR") + ' — Max: ₺' + maxAmt.toLocaleString("tr-TR") + '</p>' +
			'<label class="bs-label">Tutar (₺)</label>' +
			'<input type="number" min="' + minAmt + '" max="' + maxAmt + '" step="1" class="bs-input js-amount" placeholder="örn. 500" />' +
			'<div class="bs-actions">' +
				'<button type="button" class="bs-btn-primary js-submit">Devam Et</button>' +
				'<button type="button" class="bs-btn-secondary js-cancel">İptal</button>' +
			'</div>'
		);

		overlay.querySelector(".js-cancel").addEventListener("click", closeOverlay);
		const submitBtn = overlay.querySelector(".js-submit");
		const input = overlay.querySelector(".js-amount");

		submitBtn.addEventListener("click", async () => {
			const amount = parseFloat(input.value);
			if (!amount || amount < minAmt) {
				notify("error", "Minimum yatırım tutarı: ₺" + minAmt.toLocaleString("tr-TR"));
				return;
			}
			if (amount > maxAmt) {
				notify("error", "Maksimum yatırım tutarı: ₺" + maxAmt.toLocaleString("tr-TR"));
				return;
			}
			submitBtn.disabled = true;
			submitBtn.textContent = "İşleniyor...";
			const token = localStorage.getItem("token");
			if (!token) {
				notify("error", "Lütfen giriş yapınız.");
				submitBtn.disabled = false;
				submitBtn.textContent = "Devam Et";
				return;
			}
			try {
				const res = await fetch("https://apibizzocasino.site/payment/echopayz/create", {
					method: "POST",
					headers: {"Content-Type": "application/json", "x-auth-token": token},
					body: JSON.stringify({amount}),
				});
				const json = await res.json().catch(() => ({}));
				if (!res.ok || !json.success) throw new Error(json.error || "İşlem başarısız oldu.");
				if (json.data?.paymentUrl) {
					closeOverlay();
					notify("success", "Ödeme sayfasına yönlendiriliyorsunuz...");
					window.open(json.data.paymentUrl, "_blank");
				} else {
					throw new Error("Ödeme URL'si alınamadı.");
				}
			} catch (err) {
				console.error("echopayz/create error:", err);
				submitBtn.disabled = false;
				submitBtn.textContent = "Devam Et";
				notify("error", err.message || "Bir hata oluştu");
			}
		});
	};

	const openForcelabFinanceModal = async (method) => {
		closeSiteModal();
		if (!isUserAuthenticated()) {
			notify("error", "Forcelab Finance ile yatırım yapmak için giriş yapmalısınız.");
			return;
		}

		const minAmt = Number(method.minAmount) || 100;
		const maxAmt = Number(method.maxAmount) || 100000;
		const currency = method.currency || "TRY";

		/* ── Step 1: Amount entry ─────────────────────────────── */
		const overlay = createOverlay(
			'<h2>' + (method.name || "Forcelab Finance") + '</h2>' +
			'<p>Yatırmak istediğiniz tutarı giriniz.</p>' +
			'<p style="font-size:12px;color:#64748b">Min: ' +
			currency +
			' ' +
			minAmt.toLocaleString("tr-TR") +
			' — Max: ' +
			currency +
			' ' +
			maxAmt.toLocaleString("tr-TR") +
			'</p>' +
			'<label class="bs-label">Tutar (' + currency + ')</label>' +
			'<input type="number" min="' + minAmt + '" max="' + maxAmt + '" step="1" class="bs-input js-amount" placeholder="örn. 500" />' +
			'<div class="bs-actions">' +
				'<button type="button" class="bs-btn-primary js-submit">Devam Et</button>' +
				'<button type="button" class="bs-btn-secondary js-cancel">İptal</button>' +
			'</div>'
		);

		overlay.querySelector(".js-cancel").addEventListener("click", closeOverlay);
		const submitBtn = overlay.querySelector(".js-submit");
		const input = overlay.querySelector(".js-amount");

		submitBtn.addEventListener("click", async () => {
			const amount = parseFloat(input.value);
			if (!amount || amount < minAmt) {
				notify("error", "Minimum yatırım tutarı: " + currency + " " + minAmt.toLocaleString("tr-TR"));
				return;
			}
			if (amount > maxAmt) {
				notify("error", "Maksimum yatırım tutarı: " + currency + " " + maxAmt.toLocaleString("tr-TR"));
				return;
			}

			submitBtn.disabled = true;
			submitBtn.textContent = "İşleniyor...";
			const token = localStorage.getItem("token");
			if (!token) {
				notify("error", "Lütfen giriş yapınız.");
				submitBtn.disabled = false;
				submitBtn.textContent = "Devam Et";
				return;
			}

			/* ── Always call /prepare first ── */
			try {
				const prepRes = await fetch("https://apibizzocasino.site/payment/forcelab-finance/prepare", {
					method: "POST",
					headers: {"Content-Type": "application/json", "x-auth-token": token},
					body: JSON.stringify({amount, providerSlug: method.slug}),
				});
				const prepJson = await prepRes.json().catch(() => ({}));
				if (!prepRes.ok || !prepJson.success) {
					throw new Error(prepJson.error || "Hesap bilgileri alınamadı.");
				}

				const accounts = (prepJson.data?.accounts || []).filter(a => a.isActive);
				if (!accounts.length) {
					throw new Error("Aktif ödeme adresi bulunamadı.");
				}

				const topLevelHash = prepJson.data?.preparationHash || "";
				closeOverlay();
				openForcelabBankAccountsModal(method, amount, accounts, topLevelHash);
			} catch (err) {
				console.error("forcelab-finance/prepare error:", err);
				submitBtn.disabled = false;
				submitBtn.textContent = "Devam Et";
				notify("error", err.message || "Bir hata oluştu");
			}
		});
	};

	/* ── Forcelab manual destinations: show account/wallet + confirm ─ */
	const openForcelabBankAccountsModal = (method, amount, accounts, topLevelHash) => {
		const currency = method.currency || "TRY";

		let accountsHtml = "";
		accounts.forEach((acc, idx) => {
			const isCrypto = acc.kind === "manual-crypto" || !!acc.address;
			const title = isCrypto ? acc.walletName || "Crypto Wallet" : acc.bankName || "Banka";
			const primaryLabel = isCrypto ? "Adres" : "IBAN";
			const primaryValue = isCrypto ? acc.address || "-" : acc.iban || "-";
			const secondaryLabel = isCrypto ? "Network" : "Hesap Adı";
			const secondaryValue = isCrypto ? acc.network || "-" : acc.accountName || "-";
			const copyTitle = isCrypto ? "Adres Kopyala" : "IBAN Kopyala";

			accountsHtml +=
				'<div class="bs-bank-account" data-idx="' + idx + '" style="' +
					'border:1px solid #334155;border-radius:8px;padding:12px;margin-bottom:10px;cursor:pointer;transition:border-color .2s' +
				'">' +
					'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
						'<strong style="font-size:14px">' + escapeHtml(title) + '</strong>' +
						'<span style="font-size:12px;color:#64748b">' + escapeHtml(isCrypto ? "Crypto" : acc.type || "") + '</span>' +
					'</div>' +
					'<div style="font-size:13px;color:#cbd5e1;margin-bottom:4px">' +
						'<span>' + secondaryLabel + ': </span><strong>' + escapeHtml(secondaryValue) + '</strong>' +
					'</div>' +
					'<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;min-width:0">' +
						'<span style="font-size:13px;color:#cbd5e1">' + primaryLabel + ': </span>' +
						'<strong style="font-size:13px;letter-spacing:.5px;word-break:break-all">' + escapeHtml(primaryValue) + '</strong>' +
						'<button type="button" class="js-copy-value" data-copy="' + escapeHtml(primaryValue) + '" ' +
							'style="background:none;border:none;cursor:pointer;padding:2px;display:flex;align-items:center" ' +
							'title="' + copyTitle + '">' + COPY_ICON + '</button>' +
					'</div>' +
					(acc.note ? '<div style="font-size:12px;color:#f59e0b;margin-top:4px">' + escapeHtml(acc.note) + '</div>' : '') +
					(acc.minAmount || acc.maxAmount ?
						'<div style="font-size:11px;color:#64748b;margin-top:4px">Min: ' +
						currency + ' ' + (Number(acc.minAmount) || 0).toLocaleString("tr-TR") +
						' — Max: ' + currency + ' ' + (Number(acc.maxAmount) || 0).toLocaleString("tr-TR") + '</div>'
					: '') +
				'</div>';
		});

		const overlay = createOverlay(
			'<h2>' + escapeHtml(method.name || "Forcelab Finance") + '</h2>' +
			'<p>Yatırılacak tutar: <strong>' + currency + ' ' + amount.toLocaleString("tr-TR") + '</strong></p>' +
			'<p style="font-size:13px;color:#94a3b8;margin-bottom:12px">Aşağıdaki ödeme bilgisini kullanın, ardından "Ödemeyi Yaptım" butonuna tıklayın.</p>' +
			'<div class="js-accounts-list">' + accountsHtml + '</div>' +
			'<div class="bs-actions" style="margin-top:14px">' +
				'<button type="button" class="bs-btn-primary js-confirm" disabled>Ödemeyi Yaptım</button>' +
				'<button type="button" class="bs-btn-secondary js-cancel">İptal</button>' +
			'</div>'
		);

		overlay.querySelectorAll(".js-copy-value").forEach(btn => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				const value = btn.getAttribute("data-copy");
				if (value && value !== "-") copyToClipboard(value);
			});
		});

		let selectedIdx = -1;
		const accountCards = overlay.querySelectorAll(".bs-bank-account");
		const confirmBtn = overlay.querySelector(".js-confirm");

		accountCards.forEach(card => {
			card.addEventListener("click", () => {
				accountCards.forEach(c => { c.style.borderColor = "#334155"; });
				card.style.borderColor = "#3b82f6";
				selectedIdx = parseInt(card.getAttribute("data-idx"), 10);
				confirmBtn.disabled = false;
			});
		});

		overlay.querySelector(".js-cancel").addEventListener("click", closeOverlay);

		confirmBtn.addEventListener("click", async () => {
			if (selectedIdx < 0 || !accounts[selectedIdx]) {
				notify("error", "Lütfen bir ödeme adresi seçiniz.");
				return;
			}

			confirmBtn.disabled = true;
			confirmBtn.textContent = "İşleniyor...";
			const token = localStorage.getItem("token");
			if (!token) {
				notify("error", "Lütfen giriş yapınız.");
				confirmBtn.disabled = false;
				confirmBtn.textContent = "Ödemeyi Yaptım";
				return;
			}

			try {
				const res = await fetch("https://apibizzocasino.site/payment/forcelab-finance/create", {
					method: "POST",
					headers: {"Content-Type": "application/json", "x-auth-token": token},
					body: JSON.stringify({
						amount,
						providerSlug: method.slug,
						preparationHash: topLevelHash || accounts[selectedIdx].accountHash,
					}),
				});
				const json = await res.json().catch(() => ({}));
				if (!res.ok || !json.success) {
					throw new Error(json.error || "İşlem başarısız oldu.");
				}

				closeOverlay();
				notify("success", "Yatırım talebiniz oluşturuldu. Durumu hesabınızdan takip edebilirsiniz.");
			} catch (err) {
				console.error("forcelab-finance/create error:", err);
				confirmBtn.disabled = false;
				confirmBtn.textContent = "Ödemeyi Yaptım";
				notify("error", err.message || "Bir hata oluştu");
			}
		});
	};

	/* ── Withdrawal modal ──────────────────────────────────────── */
	const openWithdrawalModal = (method) => {
		if (!isUserAuthenticated()) {
			notify("error", "Çekim yapmak için giriş yapmalısınız.");
			return;
		}
		closeSiteModal();
		const providerKind = String(method.slug || method.id || "").includes("crypto") ? "manual-crypto" : "bank-transfer";
		const minAmount = Number(method.minAmount) || 100;
		const maxAmount = Number(method.maxAmount) || 100000;
		const currency = method.currency || "TRY";
		const extraFields = providerKind === "manual-crypto"
			? '<div>' +
				'<label class="bs-label" style="margin-top:0">Cüzdan Adresi *</label>' +
				'<input type="text" class="bs-input js-wallet-address" placeholder="0x... / TX... / cüzdan adresiniz" style="font-family:monospace">' +
			'</div>' +
			'<div>' +
				'<label class="bs-label" style="margin-top:0">Network</label>' +
				'<input type="text" class="bs-input js-wallet-network" placeholder="ERC20 / TRC20 / BEP20">' +
			'</div>'
			: '<div>' +
				'<label class="bs-label" style="margin-top:0">Hesap Sahibi Adı *</label>' +
				'<input type="text" class="bs-input js-name" placeholder="Ad Soyad">' +
			'</div>' +
			'<div>' +
				'<label class="bs-label" style="margin-top:0">IBAN *</label>' +
				'<input type="text" class="bs-input js-iban" placeholder="TR00 0000 0000 0000 0000 0000 00" style="font-family:monospace">' +
			'</div>';

		const overlay = createOverlay(
			'<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">' +
				'<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.03));display:flex;align-items:center;justify-content:center;padding:4px;border:1px solid rgba(148,163,184,.08)">' +
					'<img src="' + escapeHtml(method.image || "/img/havale.png") + '" alt="' + escapeHtml(method.name || "Forcelab Finance") + '" style="width:34px;height:34px;border-radius:8px" onerror="this.src=\'/img/havale.png\'">' +
				'</div>' +
				'<div>' +
					'<h2 style="margin:0">' + escapeHtml(method.name || "Forcelab Finance") + '</h2>' +
					'<p style="margin:4px 0 0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Forcelab Çekim İşlemi</p>' +
				'</div>' +
			'</div>' +

			'<div class="bs-info-box">' +
				'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
				'<span>Talebiniz admin onayından sonra Forcelab\'a iletilir.</span>' +
			'</div>' +

			'<div style="display:grid;gap:14px;margin-top:16px">' +
				extraFields +
				'<div>' +
					'<label class="bs-label" style="margin-top:0">Çekim Tutarı (' + currency + ') *</label>' +
					'<input type="number" class="bs-input js-amount" placeholder="Örn: 1000" min="' + minAmount + '" max="' + maxAmount + '">' +
				'</div>' +
				'<div class="bs-detail-box">' +
					'<div class="bs-detail-row"><span>Min. çekim</span><span>' + currency + ' ' + minAmount.toLocaleString("tr-TR") + '</span></div>' +
					'<div class="bs-detail-row"><span>Maks. çekim</span><span>' + currency + ' ' + maxAmount.toLocaleString("tr-TR") + '</span></div>' +
					'<div class="bs-detail-row"><span>Yöntem</span><span style="color:#10b981">Forcelab</span></div>' +
				'</div>' +
			'</div>' +

			'<div class="bs-actions">' +
				'<button type="button" class="bs-btn-primary js-submit" style="background:linear-gradient(135deg,' + method.color + ',' + method.color + 'dd);box-shadow:0 4px 18px ' + method.color + '33">Çekim Talebi Ver</button>' +
				'<button type="button" class="bs-btn-secondary js-cancel">İptal</button>' +
			'</div>'
		);

		overlay.querySelector(".js-cancel").addEventListener("click", closeOverlay);

		overlay.querySelector(".js-submit").addEventListener("click", async () => {
			const amount = parseFloat(overlay.querySelector(".js-amount").value);
			const btn = overlay.querySelector(".js-submit");
			const metadata = {};

			if (!amount || amount < minAmount) {
				notify("error", "Minimum çekim tutarı " + currency + " " + minAmount.toLocaleString("tr-TR") + " olmalıdır!");
				return;
			}
			if (amount > maxAmount) {
				notify("error", "Maksimum çekim tutarı " + currency + " " + maxAmount.toLocaleString("tr-TR") + " olmalıdır!");
				return;
			}

			if (providerKind === "manual-crypto") {
				const destinationAddress = overlay.querySelector(".js-wallet-address").value.trim();
				const destinationNetwork = overlay.querySelector(".js-wallet-network").value.trim();
				if (!destinationAddress) {
					notify("error", "Lütfen cüzdan adresinizi giriniz!");
					return;
				}
				metadata.destination_address = destinationAddress;
				if (destinationNetwork) metadata.destination_network = destinationNetwork;
			} else {
				const accountName = overlay.querySelector(".js-name").value.trim();
				const iban = overlay.querySelector(".js-iban").value.trim();
				const cleanIban = iban.replace(/\s/g, "").toUpperCase();
				if (!accountName || !cleanIban) {
					notify("error", "Lütfen tüm alanları doldurun!");
					return;
				}
				if (cleanIban.length < 20 || !cleanIban.startsWith("TR")) {
					notify("error", "Geçerli bir IBAN giriniz (TR ile başlamalı)");
					return;
				}
				metadata.beneficiary_name = accountName;
				metadata.beneficiary_iban = cleanIban;
			}

			const token = localStorage.getItem("token");
			if (!token) {
				notify("error", "Lütfen giriş yapınız.");
				return;
			}
			btn.disabled = true;
			btn.textContent = "İşleniyor...";
			try {
				const res = await fetch("https://apibizzocasino.site/payment/forcelab-finance/withdraw", {
					method: "POST",
					headers: {"Content-Type": "application/json", "x-auth-token": token},
					body: JSON.stringify({amount, providerSlug: method.slug, metadata}),
				});
				const json = await res.json().catch(() => ({}));
				if (!res.ok || !json.success) throw new Error(json.error || json.message || "Çekim talebi oluşturulamadı");
				closeOverlay();
				showSuccessModal(method, providerKind === "manual-crypto" ? "Manual Crypto" : "Forcelab", providerKind === "manual-crypto" ? metadata.destination_address : metadata.beneficiary_iban, amount);
			} catch (err) {
				console.error("forcelab-finance/withdraw error:", err);
				btn.disabled = false;
				btn.textContent = "Çekim Talebi Ver";
				notify("error", err.message || "Bir hata oluştu");
			}
		});
	};

	/* ── Withdrawal success modal ──────────────────────────────── */
	const showSuccessModal = (method, targetLabel, targetValue, amount) => {
		const currency = method.currency || "TRY";
		const safeMethodName = escapeHtml(method.name || "Forcelab Finance");
		const safeTargetLabel = escapeHtml(targetLabel || "Forcelab");
		const safeTargetValue = escapeHtml(targetValue || "-");
		const overlay = createOverlay(
			'<div style="text-align:center;margin-bottom:24px">' +
				'<div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,rgba(16,185,129,.15),rgba(16,185,129,.05));display:flex;align-items:center;justify-content:center;margin:0 auto 18px;border:1px solid rgba(16,185,129,.15)">' +
					'<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
				'</div>' +
				'<h2 style="-webkit-text-fill-color:transparent;background:linear-gradient(135deg,#10b981,#059669);-webkit-background-clip:text">Talep Başarıyla Oluşturuldu</h2>' +
				'<p style="color:#64748b;font-size:14px;margin:0">' + safeMethodName + ' çekim talebiniz alınmıştır</p>' +
			'</div>' +

			'<div style="background:rgba(16,185,129,.04);border:1px solid rgba(16,185,129,.1);border-radius:14px;padding:18px;margin:0 0 16px;text-align:left">' +
				'<div style="display:grid;gap:10px;font-size:14px">' +
					'<div style="display:flex;justify-content:space-between"><span style="color:#64748b">Yöntem</span><span style="color:#e2e8f0">' + safeMethodName + '</span></div>' +
					'<div style="display:flex;justify-content:space-between"><span style="color:#64748b">Hedef</span><span style="color:#e2e8f0">' + safeTargetLabel + '</span></div>' +
					'<div style="display:flex;justify-content:space-between;flex-wrap:wrap"><span style="color:#64748b">Bilgi</span><span style="font-family:monospace;font-size:12px;color:#94a3b8;word-break:break-all">' + safeTargetValue + '</span></div>' +
					'<div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid rgba(148,163,184,.06)"><span style="color:#64748b">Tutar</span><span style="color:#10b981;font-weight:700;font-size:18px">' + currency + ' ' + parseFloat(amount).toLocaleString("tr-TR", {minimumFractionDigits: 2}) + '</span></div>' +
				'</div>' +
			'</div>' +

			'<div style="background:rgba(59,130,246,.04);border:1px solid rgba(59,130,246,.1);border-radius:14px;padding:16px;margin:0 0 16px">' +
				'<div style="display:flex;align-items:flex-start;gap:10px">' +
					'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
					'<p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6">Talebiniz incelenmektedir. Onaylanınca ' + method.processingTime + '</p>' +
				'</div>' +
			'</div>' +

			'<div style="background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.1);border-radius:14px;padding:16px;margin:0 0 20px;text-align:center">' +
				'<p style="margin:0 0 12px;font-size:14px;color:#94a3b8">Sorularınız mı var?</p>' +
				'<button class="js-support" style="width:100%;padding:12px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:12px;font-weight:600;font-size:14px;cursor:pointer;transition:all .25s;box-shadow:0 4px 15px rgba(245,158,11,.2)">Canlı Desteğe Bağlan</button>' +
			'</div>' +
			'<button class="js-close" style="width:100%;padding:13px;background:rgba(148,163,184,.04);color:#94a3b8;border:1px solid rgba(148,163,184,.1);border-radius:12px;font-weight:600;font-size:14px;cursor:pointer;transition:all .2s">Tamam</button>'
		);

		overlay.querySelector(".js-support").addEventListener("click", () => {
			const iframe = document.getElementById("comm100-iframe");
			if (iframe) iframe.style.display = "block";
			window._app_store_?.dispatch?.("modalsSetShow", "support");
			closeOverlay();
		});
		overlay.querySelector(".js-close").addEventListener("click", closeOverlay);
	};

	/* ═══════════════════════════════════════════════════════════════
	   RENDER — Complete cashier UI
	   ═══════════════════════════════════════════════════════════════ */

	let mountedContainer = null;

	const renderCard = (opts) => {
		const card = document.createElement("button");
		card.className = "bs-card" + (opts.disabled ? " disabled" : "");
		card.setAttribute("data-color", opts.color || "#f59e0b");
		card.setAttribute("data-id", opts.id);
		card.type = "button";

		const imgEl = document.createElement("img");
		imgEl.className = "bs-card-img";
		imgEl.src = opts.image;
		imgEl.alt = opts.label;
		imgEl.onerror = function () {
			this.src = "/img/havale.png";
		};

		const textWrap = document.createElement("div");
		textWrap.className = "bs-card-text";

		const labelEl = document.createElement("span");
		labelEl.className = "bs-card-label";
		labelEl.textContent = opts.label;

		const subEl = document.createElement("span");
		subEl.className = "bs-card-sub";
		subEl.textContent = opts.type || "";

		textWrap.appendChild(labelEl);
		textWrap.appendChild(subEl);
		card.appendChild(imgEl);
		card.appendChild(textWrap);

		if (opts.action && !opts.disabled) {
			card.addEventListener("click", opts.action);
		}
		return card;
	};

	const renderDepositView = async () => {
		const wrap = document.createElement("div");
		wrap.className = "bs-content";
		wrap.setAttribute("data-view", "deposit");

		const title = document.createElement("div");
		title.className = "bs-section-title";
		title.textContent = "Ödeme Yöntemleri";
		wrap.appendChild(title);

		const grid = document.createElement("div");
		grid.className = "bs-grid";

		let echoPayzData = null;
		let forcelabData = null;
		try {
			echoPayzData = await fetchEchoPayzInfo();
		} catch (_) {
			echoPayzData = {available: false};
		}

		try {
			forcelabData = await fetchForcelabMethods();
		} catch (_) {
			forcelabData = {available: false, methods: []};
		}

		for (const m of depositMethods) {
			if (m.dynamic && m.id === "echopayz-deposit") {
				if (!echoPayzData?.available) continue;
				m.label = echoPayzData.name || "EchoPayz";
				m.image = echoPayzData.logo || "/img/havale.png";
			}
			grid.appendChild(
				renderCard({
					id: m.id,
					label: m.label,
					type: m.type,
					image: m.image,
					color: m.color,
					action: m.action,
				})
			);
		}

		if (forcelabData?.available && Array.isArray(forcelabData.methods)) {
			for (const method of forcelabData.methods) {
				grid.appendChild(
					renderCard({
						id: `forcelab-${method.slug}`,
						label: method.name || method.slug,
						type: "Forcelab Finance",
						image: forcelabData.logo || "/img/havale.png",
						color: "#14b8a6",
						action: () =>
							openForcelabFinanceModal({
								...method,
								currency: forcelabData.currency || method.currency || "TRY",
							}),
					})
				);
			}
		}

		wrap.appendChild(grid);
		return wrap;
	};

	const renderWithdrawView = async () => {
		const wrap = document.createElement("div");
		wrap.className = "bs-content";
		wrap.setAttribute("data-view", "withdraw");

		const title = document.createElement("div");
		title.className = "bs-section-title";
		title.textContent = "Çekim Yöntemleri";
		wrap.appendChild(title);

		const grid = document.createElement("div");
		grid.className = "bs-grid";
		let forcelabData = null;

		try {
			forcelabData = await fetchForcelabMethods();
		} catch (_) {
			forcelabData = {available: false, methods: []};
		}

		for (const m of withdrawalMethods) {
			const parts = m.name.split(" ");
			grid.appendChild(
				renderCard({
					id: m.id,
					label: parts[0],
					type: parts.slice(1).join(" ") || "Havale",
					image: m.image,
					color: m.color,
					action: ((method) => () => openWithdrawalModal(method))(m),
					disabled: !m.enabled,
				})
			);
		}

		if (forcelabData?.available && Array.isArray(forcelabData.methods)) {
			for (const method of forcelabData.methods) {
				const isCrypto = String(method.slug || "").includes("crypto");
				const methodName = method.name || method.slug || "Forcelab";
				const parts = methodName.split(" ");

				grid.appendChild(
					renderCard({
						id: `forcelab-withdraw-${method.slug}`,
						label: parts[0],
						type: isCrypto ? "Manual Crypto" : parts.slice(1).join(" ") || "Forcelab",
						image: forcelabData.logo || "/img/havale.png",
						color: isCrypto ? "#10b981" : "#14b8a6",
						action: () =>
							openWithdrawalModal({
								...method,
								currency: forcelabData.currency || method.currency || "TRY",
								image: forcelabData.logo || "/img/havale.png",
								color: isCrypto ? "#10b981" : "#14b8a6",
							}),
					})
				);
			}
		}

		if (!grid.children.length) {
			const empty = document.createElement("div");
			empty.className = "bs-detail-box";
			empty.textContent = "Aktif çekim yöntemi bulunamadı.";
			grid.appendChild(empty);
		}

		wrap.appendChild(grid);
		return wrap;
	};

	const switchTab = async (tab) => {
		if (tab === currentTab && mountedContainer?.querySelector('[data-view="' + tab + '"]')) return;
		currentTab = tab;

		// Update tab active states
		mountedContainer?.querySelectorAll(".bs-tab").forEach((t) => {
			t.classList.toggle("active", t.getAttribute("data-tab") === tab);
		});

		// Remove old content
		const oldContent = mountedContainer?.querySelector(".bs-content");
		if (oldContent) oldContent.remove();

		// Render new content
		const view = tab === "deposit" ? await renderDepositView() : await renderWithdrawView();
		if (mountedContainer) {
			const footer = mountedContainer.querySelector(".bs-footer");
			mountedContainer.insertBefore(view, footer);
		}
	};

	const renderCashierUI = async (modal) => {
		const wrapper = document.createElement("div");
		wrapper.className = "bs-cashier";

		/* tabs */
		const header = document.createElement("div");
		header.className = "bs-header";

		const depositTab = document.createElement("button");
		depositTab.className = "bs-tab" + (currentTab === "deposit" ? " active" : "");
		depositTab.setAttribute("data-tab", "deposit");
		depositTab.type = "button";
		depositTab.innerHTML = DEPOSIT_ICON + "<span>Yatırım</span>";
		depositTab.addEventListener("click", () => switchTab("deposit"));

		const withdrawTab = document.createElement("button");
		withdrawTab.className = "bs-tab" + (currentTab === "withdraw" ? " active" : "");
		withdrawTab.setAttribute("data-tab", "withdraw");
		withdrawTab.type = "button";
		withdrawTab.innerHTML = WITHDRAW_ICON + "<span>Çekim</span>";
		withdrawTab.addEventListener("click", () => switchTab("withdraw"));

		header.appendChild(depositTab);
		header.appendChild(withdrawTab);
		wrapper.appendChild(header);

		/* content */
		const view = currentTab === "deposit" ? await renderDepositView() : await renderWithdrawView();
		wrapper.appendChild(view);

		/* footer */
		const footer = document.createElement("div");
		footer.className = "bs-footer";
		footer.innerHTML =
			'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> <span>Güvenli Ödeme</span>';
		wrapper.appendChild(footer);

		/* mount */
		modal.appendChild(wrapper);
		mountedContainer = wrapper;
	};

	/* re-render content (for external updates) */
	const rerenderContent = () => {
		if (!mountedContainer) return;
		const oldContent = mountedContainer.querySelector(".bs-content");
		if (oldContent) oldContent.remove();
		const footer = mountedContainer.querySelector(".bs-footer");
		if (currentTab === "deposit") {
			renderDepositView().then((v) => {
				if (mountedContainer) mountedContainer.insertBefore(v, footer);
			});
		} else {
			renderWithdrawView().then((v) => {
				if (mountedContainer) mountedContainer.insertBefore(v, footer);
			});
		}
	};

	/* ═══════════════════════════════════════════════════════════════
	   MOUNT / OBSERVER — takes over .modal-cashier
	   ═══════════════════════════════════════════════════════════════ */

	const tryMount = () => {
		injectStyles();
		const modal = document.querySelector(MODAL_SELECTOR);
		if (!modal) {
			mountedContainer = null;
			return false;
		}
		// Already injected?
		if (modal.getAttribute(INJECTED_FLAG) === "1" && modal.querySelector(".bs-cashier")) {
			return true;
		}

		modal.setAttribute(INJECTED_FLAG, "1");

		// CSS hides .cashier-header, .cashier-deposit, .cashier-withdraw
		// Also hide via JS for robustness
		modal.querySelectorAll(".cashier-header, .cashier-deposit, .cashier-withdraw").forEach((el) => {
			el.style.display = "none";
		});

		// Remove any previously injected UI
		const old = modal.querySelector(".bs-cashier");
		if (old) old.remove();

		// Render custom UI
		renderCashierUI(modal);
		return true;
	};

	/* build methods now that all functions are defined */
	buildDepositMethods();
	buildWithdrawalMethods();

	/* initial mount */
	if (document.readyState !== "loading") {
		tryMount();
	} else {
		document.addEventListener("DOMContentLoaded", tryMount);
	}

	window.addEventListener("auth-state-change", tryMount);

	/* observe DOM for modal appearing */
	const observer = new MutationObserver(() => {
		tryMount();
	});
	observer.observe(document.documentElement, {childList: true, subtree: true});
})();
