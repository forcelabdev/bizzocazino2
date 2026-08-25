import { resolveVuetifyTheme } from "@core/utils/vuetify";
import { themeConfig } from "@themeConfig";

export const staticPrimaryColor = "#3B82F6";

const theme = {
	defaultTheme: resolveVuetifyTheme(),
	themes: {
		light: {
			dark: false,
			colors: {
				primary:
					localStorage.getItem(
						`${themeConfig.app.title}-lightThemePrimaryColor`
					) || "#2563EB",
				"on-primary": "#fff",
				secondary: "#64748B",
				"on-secondary": "#fff",
				success: "#16A34A",
				"on-success": "#fff",
				info: "#0284C7",
				"on-info": "#fff",
				warning: "#D97706",
				"on-warning": "#fff",
				error: "#DC2626",
				"on-error": "#fff",
				background: "#F5F6F8",
				"on-background": "#12141C",
				surface: "#FFFFFF",
				"on-surface": "#12141C",
				"grey-50": "#FAFAFB",
				"grey-100": "#F1F2F5",
				"grey-200": "#E6E8ED",
				"grey-300": "#D7DAE1",
				"grey-400": "#B7BCC7",
				"grey-500": "#8D93A2",
				"grey-600": "#6B7180",
				"grey-700": "#4C515E",
				"grey-800": "#2E323C",
				"grey-900": "#171920",
				"perfect-scrollbar-thumb": "#D7DAE1",
				"skin-bordered-background": "#fff",
				"skin-bordered-surface": "#fff",
			},
			variables: {
				"code-color": "#0284C7",
				"overlay-scrim-background": "#12141C",
				"tooltip-background": "#2E323C",
				"overlay-scrim-opacity": 0.5,
				"hover-opacity": 0.04,
				"focus-opacity": 0.12,
				"selected-opacity": 0.06,
				"activated-opacity": 0.16,
				"pressed-opacity": 0.14,
				"dragged-opacity": 0.1,
				"disabled-opacity": 0.42,
				"border-color": "#12141C",
				"border-opacity": 0.12,
				"high-emphasis-opacity": 0.85,
				"medium-emphasis-opacity": 0.6,
				"switch-opacity": 0.2,
				"switch-disabled-track-opacity": 0.3,
				"switch-disabled-thumb-opacity": 0.4,
				"switch-checked-disabled-opacity": 0.3,

				// Shadows
				"shadow-key-umbra-color": "#12141C",
			},
		},
		dark: {
			dark: true,
			colors: {
				primary:
					localStorage.getItem(
						`${themeConfig.app.title}-darkThemePrimaryColor`
					) || "#3B82F6",
				"on-primary": "#fff",
				secondary: "#8B93A7",
				"on-secondary": "#fff",
				success: "#22C55E",
				"on-success": "#fff",
				info: "#38BDF8",
				"on-info": "#0B0E14",
				warning: "#F59E0B",
				"on-warning": "#0B0E14",
				error: "#EF4444",
				"on-error": "#fff",
				background: "#0B0E14",
				"on-background": "#E4E7EE",
				surface: "#12141C",
				"on-surface": "#E4E7EE",
				"grey-50": "#161922",
				"grey-100": "#1C1F2A",
				"grey-200": "#22252F",
				"grey-300": "#2E323F",
				"grey-400": "#454A5A",
				"grey-500": "#5C6274",
				"grey-600": "#7A8094",
				"grey-700": "#9AA0B4",
				"grey-800": "#C2C6D4",
				"grey-900": "#E4E7EE",
				"perfect-scrollbar-thumb": "#2E323F",
				"skin-bordered-background": "#12141C",
				"skin-bordered-surface": "#12141C",
			},
			variables: {
				"code-color": "#38BDF8",
				"overlay-scrim-background": "#05070B",
				"tooltip-background": "#22252F",
				"overlay-scrim-opacity": 0.6,
				"hover-opacity": 0.04,
				"focus-opacity": 0.12,
				"selected-opacity": 0.06,
				"activated-opacity": 0.16,
				"pressed-opacity": 0.14,
				"dragged-opacity": 0.1,
				"disabled-opacity": 0.42,
				"border-color": "#E4E7EE",
				"border-opacity": 0.1,
				"high-emphasis-opacity": 0.85,
				"medium-emphasis-opacity": 0.6,
				"switch-opacity": 0.4,
				"switch-disabled-track-opacity": 0.4,
				"switch-disabled-thumb-opacity": 0.8,
				"switch-checked-disabled-opacity": 0.3,

				// Shadows
				"shadow-key-umbra-color": "#000000",
			},
		},
	},
};

export default theme;
