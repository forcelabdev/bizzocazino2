import { ref } from "vue";
import axios from "@axios";
import {
	DEFAULT_PROVIDER_DISPLAY_NAMES,
	getProviderDisplayName,
	normalizeProviderDisplayNames,
	toProviderDisplayItems,
} from "@/utils/providerDisplayNames";

const providerDisplayNames = ref({ ...DEFAULT_PROVIDER_DISPLAY_NAMES });
let loadPromise = null;

export const useProviderDisplayNames = () => {
	const loadProviderDisplayNames = async ({ force = false } = {}) => {
		if (loadPromise && !force) return loadPromise;

		loadPromise = axios
			.get("/admin/provider/display-names")
			.then(({ data }) => {
				providerDisplayNames.value = normalizeProviderDisplayNames(
					data?.data?.providerDisplayNames,
				);

				return providerDisplayNames.value;
			})
			.catch((error) => {
				console.error("Provider display names could not be loaded:", error);
				return providerDisplayNames.value;
			});

		return loadPromise;
	};

	const formatProviderDisplayName = (code, fallback = "") =>
		getProviderDisplayName(code, providerDisplayNames.value, fallback);

	const getProviderDisplayItems = (codes = []) =>
		toProviderDisplayItems(codes, providerDisplayNames.value);

	return {
		formatProviderDisplayName,
		getProviderDisplayItems,
		loadProviderDisplayNames,
		providerDisplayNames,
	};
};
