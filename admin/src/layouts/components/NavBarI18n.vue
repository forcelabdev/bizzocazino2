<script setup>
import NavBarI18n from "@core/components/I18n.vue";
import { useThemeConfig } from "@core/composable/useThemeConfig";

const { isAppRtl } = useThemeConfig();

const i18nCompLanguages = [
	{
		label: "English",
		i18nLang: "en",
	},
	// {
	// 	label: "简体中文",
	// 	i18nLang: "zh-CN",
	// },
	{
		label: "Türkçe",
		i18nLang: "tr",
	},
	// {
	// 	label: "Português",
	// 	i18nLang: "pt",
	// },
];

const handleLangChange = (lang) => {
	isAppRtl.value = lang === "ar";
};
</script>

<template>
	<NavBarI18n :languages="i18nCompLanguages" @change="handleLangChange" />
</template>
