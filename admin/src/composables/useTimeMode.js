import { computed, ref } from "vue";

/**
 * Panel genelinde saat/tarih gösterim modunu yönetir.
 * - "tr": Sabit GMT+3 (Europe/Istanbul) Türkiye saati
 * - "pc": Kullanıcının cihazının yerel saat dilimi
 *
 * Tercih localStorage'da saklanır ve tüm panelde tek bir instance paylaşılır.
 */

const STORAGE_KEY = "bizzo-time-mode";
export const TR_LABEL = "TR Saati (GMT+3)";
export const PC_LABEL = "Cihaz Saati";
export const TR_TIMEZONE = "Europe/Istanbul";

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const readInitialMode = () => {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored === "pc" ? "pc" : "tr";
	} catch {
		return "tr";
	}
};

// Modül seviyesinde tek ref -> tüm bileşenler aynı state'i paylaşır
const mode = ref(readInitialMode());

const setMode = (next) => {
	const value = next === "pc" ? "pc" : "tr";
	mode.value = value;
	try {
		localStorage.setItem(STORAGE_KEY, value);
	} catch {
		/* localStorage erişilemezse sessizce yoksay */
	}
};

const activeTimeZone = computed(() =>
	mode.value === "tr" ? TR_TIMEZONE : localTimeZone,
);

export const useTimeMode = () => {
	/**
	 * Seçili moda göre tarih+saat formatlar.
	 * @param {Date|string|number} value
	 * @param {Intl.DateTimeFormatOptions} options
	 */
	const formatDateTime = (value, options = {}) => {
		if (!value) return "-";
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return "-";

		return new Intl.DateTimeFormat("tr-TR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
			timeZone: activeTimeZone.value,
			...options,
		}).format(date);
	};

	const formatDate = (value, options = {}) =>
		formatDateTime(value, {
			hour: undefined,
			minute: undefined,
			...options,
		});

	const formatTime = (value, options = {}) =>
		formatDateTime(value, {
			day: undefined,
			month: undefined,
			year: undefined,
			second: "2-digit",
			...options,
		});

	return {
		mode,
		setMode,
		activeTimeZone,
		localTimeZone,
		formatDateTime,
		formatDate,
		formatTime,
		TR_LABEL,
		PC_LABEL,
		TR_TIMEZONE,
	};
};
