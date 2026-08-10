/* eslint-disable import/order */
import "@/@fake-db/db";
import "@/@iconify/icons-bundle";
import App from "@/App.vue";
import ability from "@/plugins/casl/ability";
import i18n from "@/plugins/i18n";
import layoutsPlugin from "@/plugins/layouts";
import vuetify from "@/plugins/vuetify";
import { loadFonts } from "@/plugins/webfontloader";
import router from "@/router";
import { abilitiesPlugin } from "@casl/vue";
import "@core/scss/template/index.scss";
import "@styles/styles.scss";
import { createPinia } from "pinia";
import { createApp } from "vue";

import { usePermissionStore } from "@/stores/permissionStore";

loadFonts();

// Create vue app
const app = createApp(App);

const pinia = createPinia();

// Use plugins
app.use(vuetify);
app.use(pinia);
app.use(router);
app.use(layoutsPlugin);
app.use(i18n);
app.use(abilitiesPlugin, ability, {
	useGlobalProperties: true,
});

// Keep CASL abilities in sync with backend permissions.
// This fixes cases where a user's role/superadmin status changes after login.
const bootstrapAcl = async () => {
	const hasToken = !!localStorage.getItem("accessToken");
	if (!hasToken) return;

	try {
		const permissionStore = usePermissionStore(pinia);
		await permissionStore.fetchPermissions();

		const abilities = permissionStore.getAbilities();
		localStorage.setItem("userAbilities", JSON.stringify(abilities));
		ability.update(abilities);

		// Also keep userData aligned for any UI that reads it.
		const userData = JSON.parse(localStorage.getItem("userData") || "{}");
		userData.isSuperAdmin = permissionStore.isSuperAdmin;
		userData.adminRole = permissionStore.role;
		localStorage.setItem("userData", JSON.stringify(userData));
	} catch (err) {
		// Non-fatal: app can still run with whatever was in storage.
		console.warn("ACL bootstrap failed:", err);
	}
};

// Mount vue app
bootstrapAcl().finally(() => {
	app.mount("#app");
});
