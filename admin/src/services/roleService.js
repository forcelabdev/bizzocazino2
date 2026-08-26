import axios from "@/plugins/axios";

/**
 * Role Service
 *
 * Admin paneli için rol ve permission API çağrıları
 */

// =====================================================
// PERMISSIONS
// =====================================================

/**
 * Tüm permission'ları getir
 */
export const getPermissions = async (params = {}) => {
	const { data } = await axios.get("/admin/permissions", { params });
	return data;
};

// =====================================================
// ROLES
// =====================================================

/**
 * Tüm rolleri getir
 */
export const getRoles = async (params = {}) => {
	const { data } = await axios.get("/admin/roles", { params });
	return data;
};

/**
 * Tek bir rolü getir
 */
export const getRole = async (id) => {
	const { data } = await axios.get(`/admin/roles/${id}`);
	return data;
};

/**
 * Yeni rol oluştur
 */
export const createRole = async (roleData) => {
	const { data } = await axios.post("/admin/roles", roleData);
	return data;
};

/**
 * Rol güncelle
 */
export const updateRole = async (id, roleData) => {
	const { data } = await axios.put(`/admin/roles/${id}`, roleData);
	return data;
};

/**
 * Rol sil
 */
export const deleteRole = async (id) => {
	const { data } = await axios.delete(`/admin/roles/${id}`);
	return data;
};

// =====================================================
// FIELD RESTRICTIONS (Alan Kısıtlamaları)
// =====================================================

/**
 * Alan Kısıtlaması kataloğunu getir.
 * Her kaynak (örn. "users") için, o kaynağın formundaki tekil alanları
 * (Ad Soyad, Telefon, vb.) ve bunların kısıtlama kodlarını döner.
 */
export const getFieldRestrictionsRegistry = async () => {
	const { data } = await axios.get("/admin/roles/field-restrictions-registry");
	return data;
};

// =====================================================
// USER ROLE ASSIGNMENT
// =====================================================

/**
 * Kullanıcıya rol ata
 */
export const assignRoleToUser = async (userId, roleId) => {
	const { data } = await axios.post(`/admin/users/${userId}/assign-role`, {
		roleId,
	});
	return data;
};

/**
 * Admin kullanıcıları getir
 */
export const getAdminUsers = async (params = {}) => {
	const { data } = await axios.get("/admin/admin-users", { params });
	return data;
};

/**
 * Mevcut kullanıcının permission'larını getir
 */
export const getMyPermissions = async () => {
	const { data } = await axios.get("/admin/my-permissions");
	return data;
};

export default {
	// Permissions
	getPermissions,

	// Roles
	getRoles,
	getRole,
	createRole,
	updateRole,
	deleteRole,

	// Field Restrictions
	getFieldRestrictionsRegistry,

	// User Role
	assignRoleToUser,
	getAdminUsers,
	getMyPermissions,
};
