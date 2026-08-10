import { fileURLToPath } from "node:url";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
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

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const newSiteMode = String(env.NEW_SITE_MODE ?? "true").toLowerCase();
	const backendTarget = env.VITE_BACKEND_PROXY_TARGET || "http://localhost:5000";

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
		proxy: Object.fromEntries(
			BACKEND_ROUTE_PREFIXES.map((prefix) => [
				prefix,
				{
					target: backendTarget,
					changeOrigin: true,
				},
			])
		),
	},
};
});
