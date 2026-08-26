import axios from "@/plugins/axios";

/**
 * Security Service
 *
 * Güvenlik Ve Risk Yönetimi paneli için API çağrıları:
 * - IP çakışmaları (aynı IP'yi kullanan farklı üyeler)
 * - Sistem Ayrıntıları (admin işlem/denetim logu)
 * - Log (oyuncu giriş/kayıt aktivite logu)
 * - Şüpheli Manuel Krediler (reddedilen yatırım ↔ manuel kredi korelasyonu)
 */

export const getIpCollisions = async (params = {}) => {
	const { data } = await axios.get("/admin/security/ip-collisions", { params });
	return data;
};

export const getSystemLogs = async (params = {}) => {
	const { data } = await axios.get("/admin/security/system-logs", { params });
	return data;
};

export const getActivityLogs = async (params = {}) => {
	const { data } = await axios.get("/admin/security/activity-logs", { params });
	return data;
};

export const getSuspiciousManualCredits = async (params = {}) => {
	const { data } = await axios.get("/admin/security/suspicious-manual-credits", { params });
	return data;
};

export default {
	getIpCollisions,
	getSystemLogs,
	getActivityLogs,
	getSuspiciousManualCredits,
};
