<script setup>
import navItems from "@/navigation/vertical";
import { useThemeConfig } from "@core/composable/useThemeConfig";

// Components
import Footer from "@/layouts/components/Footer.vue";
import NavBarI18n from "@/layouts/components/NavBarI18n.vue";
import NavBarNotifications from '@/layouts/components/NavBarNotifications.vue'
// import NavbarShortcuts from "@/layouts/components/NavbarShortcuts.vue";
import NavbarThemeSwitcher from "@/layouts/components/NavbarThemeSwitcher.vue";
import NavSearchBar from "@/layouts/components/NavSearchBar.vue";
import UserProfile from "@/layouts/components/UserProfile.vue";

// @layouts plugin
import { VerticalNavLayout } from "@layouts";

const { appRouteTransition, isLessThanOverlayNavBreakpoint } = useThemeConfig();
const { width: windowWidth } = useWindowSize();
const isDev = import.meta.env.DEV;
</script>

<template>
	<VerticalNavLayout :nav-items="navItems">
		<!-- 👉 navbar -->
		<template #navbar="{ toggleVerticalOverlayNavActive }">
			<div class="d-flex h-100 align-center">
				<IconBtn
					v-if="isLessThanOverlayNavBreakpoint(windowWidth)"
					id="vertical-nav-toggle-btn"
					class="ms-n3"
					@click="toggleVerticalOverlayNavActive(true)"
				>
					<VIcon size="26" icon="tabler-menu-2" />
				</IconBtn>

				<NavSearchBar class="ms-lg-n3" />

				<VSpacer />

				<NavBarI18n class="me-1" />
				<NavbarThemeSwitcher class="me-1" />
				<!-- <NavbarShortcuts class="me-1" /> -->
				<NavBarNotifications class="me-2" />
				<UserProfile />
			</div>
		</template>

		<RouterView v-slot="{ Component, route }">
			<Transition :name="appRouteTransition" mode="out-in">
				<component :is="Component" :key="route.fullPath" />
			</Transition>
		</RouterView>

		<!-- 👉 Footer -->
		<template #footer>
			<Footer />
		</template>

		<!-- 👉 Customizer (only in dev mode) -->
		<TheCustomizer v-if="isDev" />
	</VerticalNavLayout>
</template>
