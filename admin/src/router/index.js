import { setupLayouts } from "virtual:generated-layouts";
import { createRouter, createWebHistory } from "vue-router";
import { isUserLoggedIn } from "./utils";
import routes from "~pages";
import { canNavigate } from "@layouts/plugins/casl";

const readJson = (key, fallback) => {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
};

const hasAbility = (abilities, action, subject) => {
	if (!Array.isArray(abilities)) return false;
	return abilities.some((a) => {
		if (!a) return false;
		const aAction = a.action;
		const aSubject = a.subject;
		if (aAction === "manage" && aSubject === "all") return true;
		if (aSubject === "all" && aAction === action) return true;
		if (aAction === "manage" && aSubject === subject) return true;
		return aAction === action && aSubject === subject;
	});
};

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		// ℹ️ We are redirecting to different pages based on role.
		// NOTE: Role is just for UI purposes. ACL is based on abilities.
		{
			path: "/",
			redirect: (to) => {
				const userData = readJson("userData", {});
				const userRole =
					userData && userData.role ? userData.role : null;
				if (userRole === "admin") {
					const abilities = readJson("userAbilities", []);
					// Check dashboard access first
					if (hasAbility(abilities, "read", "dashboard"))
						return { name: "dashboards-analytics" };
					// Then check other common pages
					if (hasAbility(abilities, "read", "finance"))
						return { name: "apps-finance-deposit" };
					if (hasAbility(abilities, "read", "users"))
						return { name: "apps-user-list" };

					// No specific page access - show welcome page
					return { name: "welcome" };
				}
				if (userRole === "client") return { name: "access-control" };

				return { name: "login", query: to.query };
			},
		},
		{
			path: "/pages/user-profile",
			redirect: () => ({
				name: "pages-user-profile-tab",
				params: { tab: "profile" },
			}),
		},
		{
			path: "/pages/account-settings",
			redirect: () => ({
				name: "pages-account-settings-tab",
				params: { tab: "account" },
			}),
		},
		...setupLayouts(routes),
	],
});

// Docs: https://router.vuejs.org/guide/advanced/navigation-guards.html#global-before-guards
router.beforeEach((to) => {
	const isLoggedIn = isUserLoggedIn();

	/*
  
    ℹ️ Commented code is legacy code
  
    if (!canNavigate(to)) {
      // Redirect to login if not logged in
      // ℹ️ Only add `to` query param if `to` route is not index route
      if (!isLoggedIn)
        return next({ name: 'login', query: { to: to.name !== 'index' ? to.fullPath : undefined } })
  
      // If logged in => not authorized
      return next({ name: 'not-authorized' })
    }
  
    // Redirect if logged in
    if (to.meta.redirectIfLoggedIn && isLoggedIn)
      next('/')
  
    return next()
  
    */
	if (canNavigate(to)) {
		if (to.meta.redirectIfLoggedIn && isLoggedIn) return "/";
	} else {
		if (isLoggedIn) {
			// Dashboard'a veya anasayfaya yetkisiz erişim → welcome sayfasına yönlendir
			const isDashboardRoute = 
				to.name?.startsWith("dashboards") || 
				to.name === "index" || 
				to.path === "/" ||
				to.path.startsWith("/dashboards");
			
			if (isDashboardRoute) {
				return { name: "welcome" };
			}
			// Diğer sayfalara yetkisiz erişim → not-authorized
			return { name: "not-authorized" };
		} else {
			return {
				name: "login",
				query: { to: to.name !== "index" ? to.fullPath : undefined },
			};
		}
	}
});
export default router;
