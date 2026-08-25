import {
	AppContentLayoutNav,
	ContentWidth,
	FooterType,
	NavbarType,
} from "@layouts/enums";
import { breakpointsVuetify } from "@vueuse/core";

export const config = {
	app: {
		title: "Bizzocasino",
		logo: h(
			"svg",
			{
				xmlns: "http://www.w3.org/2000/svg",
				viewBox: "0 0 150 150",
				style: { width: "28px", height: "28px" },
			},
			[
				h("defs", {}, [
					h(
						"linearGradient",
						{
							id: "forcelab-logo-gradient-1",
							x1: "87.93",
							y1: "90.2",
							x2: "57.79",
							y2: "90.2",
							gradientTransform: "matrix(1, 0, 0, -1, 0, 152)",
							gradientUnits: "userSpaceOnUse",
						},
						[
							h("stop", { offset: "0", "stop-color": "#0050ff" }),
							h("stop", { offset: "1", "stop-color": "#053ba8" }),
						]
					),
					h("linearGradient", {
						id: "forcelab-logo-gradient-2",
						x1: "59.89",
						y1: "72.68",
						x2: "92.43",
						y2: "33.18",
						"xlink:href": "#forcelab-logo-gradient-1",
					}),
				]),
				h("path", { d: "M0,0H150V150H0Z", fill: "none" }),
				h("path", {
					d: "M77.71,47h0c-13.49.09-31,10.38-14,29.69L96,76.5a16.52,16.52,0,0,0,14.23-8.26L122.53,47H77.71Z",
					fill: "url(#forcelab-logo-gradient-1)",
				}),
				h("path", {
					d: "M71.82,47c-26.45,0-43,28.63-29.75,51.54l25.35,43.93,12.34-21.37a16.54,16.54,0,0,0,0-16.49l-16-27.9a34.66,34.66,0,0,1-3.06-6.83C56,54.77,68.05,47,77.71,47Z",
					fill: "url(#forcelab-logo-gradient-2)",
				}),
				h("path", {
					d: "M36,12a16.53,16.53,0,0,0-14.31,8.26L9.29,41.71H116a16.52,16.52,0,0,0,14.31-8.27L142.71,12H36Z",
					fill: "#0050ff",
				}),
			]
		),

		// logo: () => h('img', { src: 'assets/colored-logo.png' }, null),
		contentWidth: ref(ContentWidth.Boxed),
		contentLayoutNav: ref(AppContentLayoutNav.Vertical),
		overlayNavFromBreakpoint: breakpointsVuetify.md,
		enableI18n: true,
		isRtl: ref(false),
	},
	navbar: {
		type: ref(NavbarType.Sticky),
		navbarBlur: ref(true),
	},
	footer: { type: ref(FooterType.Static) },
	verticalNav: {
		isVerticalNavCollapsed: ref(false),
		defaultNavItemIconProps: { icon: "tabler-circle" },
	},
	horizontalNav: {
		type: ref("sticky"),
	},
	icons: {
		chevronDown: { icon: "tabler-chevron-down" },
		chevronRight: { icon: "tabler-chevron-right" },
		close: { icon: "tabler-x" },
		verticalNavPinned: { icon: "tabler-circle-dot" },
		verticalNavUnPinned: { icon: "tabler-circle" },
		sectionTitlePlaceholder: { icon: "tabler-minus" },
	},
};
