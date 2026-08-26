import axios from "@/plugins/axios";

/**
 * Security Service
 *
 * Güvenlik Ve Risk Yönetimi paneli için API çağrıları:
 * - IP çakışmaları (aynı IP'yi kullanan farklı üyeler)
 * - Sistem Ayrıntıları (admin işlem/denetim logu)
 * - Log (oyuncu giriş/kayıt aktivite logu)
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

export default {
	getIpCollisions,
	getSystemLogs,
	getActivityLogs,
};
