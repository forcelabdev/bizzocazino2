<script setup>
import navItems from "@/navigation/horizontal";
import { useThemeConfig } from "@core/composable/useThemeConfig";
import { themeConfig } from "@themeConfig";

// Components
import Footer from "@/layouts/components/Footer.vue";
import NavBarBalanceIndicator from "@/layouts/components/NavBarBalanceIndicator.vue";
import NavBarClock from "@/layouts/components/NavBarClock.vue";
import NavBarI18n from "@/layouts/components/NavBarI18n.vue";
import NavBarNotifications from '@/layouts/components/NavBarNotifications.vue'
// import NavbarShortcuts from "@/layouts/components/NavbarShortcuts.vue";
import NavbarThemeSwitcher from "@/layouts/components/NavbarThemeSwitcher.vue";
import NavSearchBar from "@/layouts/components/NavSearchBar.vue";
import UserProfile from "@/layouts/components/UserProfile.vue";
import { HorizontalNavLayout } from "@layouts";
import { VNodeRenderer } from "@layouts/components/VNodeRenderer";

const { appRouteTransition } = useThemeConfig();
const isDev = import.meta.env.DEV;
</script>

<template>
	<HorizontalNavLayout :nav-items="navItems">
		<!-- 👉 navbar -->
		<template #navbar>
			<RouterLink to="/" class="app-logo d-flex align-center gap-x-3">
				<VNodeRenderer :nodes="themeConfig.app.logo" />

				<h1
					class="app-title font-weight-bold leading-normal text-xl text-capitalize"
				>
					{{ themeConfig.app.title }}
				</h1>
			</RouterLink>
			<VSpacer />

			<NavSearchBar trigger-btn-class="ms-lg-n3" />

			<NavBarBalanceIndicator class="me-3" />
			<NavBarClock class="me-3" />
			<NavBarI18n class="me-1" />
			<NavbarThemeSwitcher class="me-1" />
			<!-- <NavbarShortcuts class="me-1" /> -->
			<NavBarNotifications class="me-2" />
			<UserProfile />
		</template>

		<!-- 👉 Pages -->
		<RouterView v-slot="{ Component }">
			<Transition :name="appRouteTransition" mode="out-in">
				<Component :is="Component" />
			</Transition>
		</RouterView>

		<!-- 👉 Footer -->
		<template #footer>
			<Footer />
		</template>

		<!-- 👉 Customizer (only in dev mode) -->
		<TheCustomizer v-if="isDev" />
	</HorizontalNavLayout>
</template>
