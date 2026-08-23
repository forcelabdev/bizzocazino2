import http from "node:http";
import { fileURLToPath } from "node:url";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import httpProxy from "http-proxy";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { defineConfig, loadEnv } from "vite";
import Pages from "vite-plugin-pages";
import Layouts from "vite-plugin-vue-layouts";
import vuetify from "vite-plugin-vuetify";

// @ts-expect-error Known error: https://github.com/sxzz/unplugin-vue-macros/issues/257#issuecomment-1410752890
import DefineOptions from "unplugin-vue-define-options/vite";

// https://vitejs.dev/config/
// (dev proxy config reload trigger)
// Backend route prefixes that are mounted at the API server root (see
// backend/routes/index.js). The admin dev server proxies these to the local
// backend so the browser only ever talks to a single origin (no CORS).
const BACKEND_ROUTE_PREFIXES = [
	"/auth",
	"/admin",
	"/affiliate",
	"/avatar",
	"/banner",
	"/battlepass",
	"/betcolabs_api",
	"/betinovi_api",
	"/binance",
	"/bonus",
	"/bonus-settings",
	"/callback",
	"/captcha",
	"/customerservices",
	"/deposit",
	"/drakon_api",
	"/exchange",
	"/gamehistory",
	"/games",
	"/gold_api",
	"/maxicallback",
	"/news",
	"/notices",
	"/payment",
	"/poker_api",
	"/public",
	"/settings",
	"/shop",
	"/telegram",
	"/telegram-settings",
	"/users",
	"/vip",
	"/wallet",
	"/wingo",
	"/withdrawal",
	"/uploads",
];

// Quick check for whether a local backend process is already listening on
// the given port. Used so the dev proxy always prefers a live local backend
// (which has the freshest routes/code) over a possibly-stale deployed URL.
function isLocalBackendUp(port) {
	return new Promise((resolve) => {
		const req = http.get(
			{ host: "127.0.0.1", port, path: "/", timeout: 800 },
			(res) => {
				res.resume();
				resolve(true);
			}
		);
		req.on("error", () => resolve(false));
		req.on("timeout", () => {
			req.destroy();
			resolve(false);
		});
	});
}

// 🎯 Kök sebep: Eskiden backendTarget SADECE vite başlangıcında bir kez
// seçiliyordu (yerel backend o an ayaktaysa yerel, değilse SERVER_BACKEND_URL
// -yani "olası bakımsız/eski" deploy edilmiş backend-). Sandbox'ta yerel
// backend süreci zaman zaman durup yeniden başlayabildiğinden, bu tek seferlik
// karar donup kalıyor ve widget'lar (örn. "Bugünkü Özet") ya hep eski/deploy
// edilmiş backend'e (henüz yeni alanları döndürmeyen) ya da hiç yanıt
// vermeyen bir hedefe takılı kalıyordu - bu da "bir açılıp bir kayboluyor"
// hissi veriyordu. Çözüm: canlılık her istekte (kısa bir cache ile, gereksiz
// health-check trafiğini önlemek için) YENİDEN kontrol edilir, böylece yerel
// backend ayağa kalktığı anda (en fazla CACHE_MS gecikmeyle) proxy otomatik
// olarak ona geçer.
const LOCAL_BACKEND_PORT = 5000;
const LIVENESS_CACHE_MS = 3000;
let livenessCache = { value: false, checkedAt: 0 };

async function resolveBackendTarget(explicitOverride, deployedFallback) {
	if (explicitOverride) return explicitOverride;

	const now = Date.now();
	if (now - livenessCache.checkedAt > LIVENESS_CACHE_MS) {
		livenessCache = {
			value: await isLocalBackendUp(LOCAL_BACKEND_PORT),
			checkedAt: now,
		};
	}

	return livenessCache.value
		? `http://127.0.0.1:${LOCAL_BACKEND_PORT}`
		: deployedFallback || `http://localhost:${LOCAL_BACKEND_PORT}`;
}

export default defineConfig(async ({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const newSiteMode = String(env.NEW_SITE_MODE ?? "true").toLowerCase();
	// Vercel already provides SERVER_BACKEND_URL. Expose only this public API
	// origin to the browser when the optional VITE-prefixed alias is absent.
	const apiBaseUrl = String(
		env.VITE_API_BASE_URL || env.SERVER_BACKEND_URL || ""
	).replace(/\/$/, "");

	// http-proxy instance reused across all requests/plugin reloads.
	const backendProxy = httpProxy.createProxyServer({});

	backendProxy.on("error", (err, _req, res) => {
		console.error("[dev-proxy] backend isteği başarısız:", err.message);
		if (res && !res.headersSent) {
			res.writeHead(502, { "Content-Type": "application/json" });
		}
		res?.end(JSON.stringify({ success: false, message: "Backend proxy error" }));
	});

	return {
	plugins: [
		vue(),
		vueJsx(),

		// https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vite-plugin
		vuetify({
			styles: {
				configFile: "src/styles/variables/_vuetify.scss",
			},
		}),
		Pages({
			dirs: ["./src/pages"],

			// ℹ️ We need three routes using single routes so we will ignore generating route for this SFC file
			onRoutesGenerated: (routes) => [
				// Email filter
				{
					path: "/apps/email/:filter",
					name: "apps-email-filter",
					component: "/src/pages/apps/email/index.vue",
					meta: {
						navActiveLink: "apps-email",
						layoutWrapperClasses: "layout-content-height-fixed",
					},
				},

				// Email label
				{
					path: "/apps/email/label/:label",
					name: "apps-email-label",
					component: "/src/pages/apps/email/index.vue",
					meta: {
						// contentClass: 'email-application',
						navActiveLink: "apps-email",
						layoutWrapperClasses: "layout-content-height-fixed",
					},
				},
				...routes,
			],
		}),
		Layouts({
			layoutsDirs: "./src/layouts/",
		}),
		Components({
			dirs: ["src/@core/components", "src/views/demos", "src/components"],
			dts: true,
		}),
		AutoImport({
			eslintrc: {
				enabled: true,
				filepath: "./.eslintrc-auto-import.json",
			},
			imports: [
				"vue",
				"vue-router",
				"@vueuse/core",
				"@vueuse/math",
				"vue-i18n",
				"pinia",
			],
			vueTemplate: true,
		}),
		VueI18nPlugin({
			runtimeOnly: true,
			compositionOnly: true,
			include: [
				fileURLToPath(
					new URL("./src/plugins/i18n/locales/**", import.meta.url)
				),
			],
		}),
		DefineOptions(),

		// Backend istekleri için dinamik proxy: her istekte (kısa cache'li)
		// yerel backend'in canlı olup olmadığını yeniden kontrol eder ve
		// hedefi buna göre seçer (bkz. resolveBackendTarget üstteki yorum).
		{
			name: "dynamic-backend-proxy",
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					const url = req.url || "";
					const matchesPrefix = BACKEND_ROUTE_PREFIXES.some(
						(prefix) => url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`)
					);

					if (!matchesPrefix) return next();

					resolveBackendTarget(env.VITE_BACKEND_PROXY_TARGET, env.SERVER_BACKEND_URL)
						.then((target) => {
							backendProxy.web(req, res, { target, changeOrigin: true });
						})
						.catch((err) => {
							console.error("[dev-proxy] hedef çözümlenemedi:", err.message);
							res.writeHead(502, { "Content-Type": "application/json" });
							res.end(JSON.stringify({ success: false, message: "Backend proxy error" }));
						});
				});
			},
		},
	],
	define: {
		"process.env": {},
		"import.meta.env.NEW_SITE_MODE": JSON.stringify(newSiteMode),
	},
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@themeConfig": fileURLToPath(
				new URL("./themeConfig.js", import.meta.url)
			),
			"@core": fileURLToPath(new URL("./src/@core", import.meta.url)),
			"@layouts": fileURLToPath(
				new URL("./src/@layouts", import.meta.url)
			),
			"@images": fileURLToPath(
				new URL("./src/assets/images/", import.meta.url)
			),
			"@styles": fileURLToPath(new URL("./src/styles/", import.meta.url)),
			"@configured-variables": fileURLToPath(
				new URL(
					"./src/styles/variables/_template.scss",
					import.meta.url
				)
			),
			"@axios": fileURLToPath(
				new URL("./src/plugins/axios", import.meta.url)
			),
			"@validators": fileURLToPath(
				new URL("./src/@core/utils/validators", import.meta.url)
			),
			apexcharts: fileURLToPath(
				new URL("node_modules/apexcharts-clevision", import.meta.url)
			),
		},
	},
	build: {
		chunkSizeWarningLimit: 5000,
	},
	optimizeDeps: {
		exclude: ["vuetify"],
		entries: ["./src/**/*.vue"],
	},
	server: {
		host: true,
		hmr: {
			clientPort: 443,
		},
		// Proxy artık statik değil: yukarıdaki "dynamic-backend-proxy" plugin'i
		// (configureServer) her isteği canlılık kontrolüyle doğru hedefe yönlendirir.
	},
};
});
