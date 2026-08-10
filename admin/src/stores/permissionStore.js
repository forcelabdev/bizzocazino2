import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "@/plugins/axios";

/**
 * Permission Store
 *
 * Admin paneli için yetkilendirme state'ini yönetir.
 * Login sonrası kullanıcının permission'larını depolar ve kontrol eder.
 */
export const usePermissionStore = defineStore("permission", () => {
	// State
	const permissions = ref([]);
	const role = ref(null);
	const isSuperAdmin = ref(false);
	const isLoaded = ref(false);
	const loading = ref(false);

	// Getters
	const hasAnyPermission = computed(
		() => permissions.value.length > 0 || isSuperAdmin.value
	);

	const permissionsByResource = computed(() => {
		if (isSuperAdmin.value) return {};

		return permissions.value.reduce((acc, code) => {
			const [resource, action] = code.split(".");
			if (!acc[resource]) acc[resource] = [];
			acc[resource].push(action);
			return acc;
		}, {});
	});

	// Actions

	/**
	 * localStorage'dan permission'ları yükle
	 */
	const loadFromStorage = () => {
		try {
			const storedPermissions = localStorage.getItem("userPermissions");
			const userData = localStorage.getItem("userData");

			if (storedPermissions) {
				permissions.value = JSON.parse(storedPermissions);
			}

			if (userData) {
				const data = JSON.parse(userData);
				isSuperAdmin.value = data.isSuperAdmin || false;
				role.value = data.adminRole || null;
			}

			isLoaded.value = true;
		} catch (err) {
			console.error("Error loading permissions from storage:", err);
		}
	};

	/**
	 * Login sonrası permission'ları set et
	 */
	const setPermissions = (perms, roleData, superAdmin = false) => {
		permissions.value = perms || [];
		role.value = roleData || null;
		isSuperAdmin.value = superAdmin;
		isLoaded.value = true;

		// localStorage'a kaydet
		localStorage.setItem(
			"userPermissions",
			JSON.stringify(permissions.value)
		);
	};

	/**
	 * Permission'ları temizle (logout)
	 */
	const clearPermissions = () => {
		permissions.value = [];
		role.value = null;
		isSuperAdmin.value = false;
		isLoaded.value = false;

		localStorage.removeItem("userPermissions");
	};

	/**
	 * Backend'den güncel permission'ları al
	 */
	const fetchPermissions = async () => {
		loading.value = true;
		try {
			const { data } = await axios.get("/admin/my-permissions");

			if (data.success) {
				permissions.value = data.data.permissions || [];
				role.value = data.data.role || null;
				isSuperAdmin.value = data.data.isSuperAdmin || false;
				isLoaded.value = true;

				localStorage.setItem(
					"userPermissions",
					JSON.stringify(permissions.value)
				);
			}
		} catch (err) {
			console.error("Error fetching permissions:", err);
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Belirli bir permission'a sahip mi kontrol et
	 * @param {string} permission - Permission kodu (örn: "users.read", "finance.bankTransfers.read")
	 * @returns {boolean}
	 */
	const can = (permission) => {
		// Süper admin her şeye erişebilir
		if (isSuperAdmin.value) return true;
		if (permissions.value.includes("*")) return true;

		// Direkt permission kontrolü
		if (permissions.value.includes(permission)) return true;

		// Parse: "finance.bankTransfers.read" -> resource: "finance.bankTransfers", action: "read"
		const parts = permission.split(".");
		const action = parts.pop();
		const resource = parts.join(".");

		// "manage" yetkisi kontrolü
		if (permissions.value.includes(`${resource}.manage`)) return true;

		// Parent resource kontrolü (örn: "finance.manage" -> "finance.bankTransfers.read" için geçerli)
		const parentResource = parts[0];
		if (parentResource && parentResource !== resource) {
			if (permissions.value.includes(`${parentResource}.manage`))
				return true;
		}

		return false;
	};

	/**
	 * Birden fazla permission'dan en az birine sahip mi (OR)
	 * @param {string[]} perms - Permission kodları
	 * @returns {boolean}
	 */
	const canAny = (perms) => {
		if (isSuperAdmin.value) return true;
		return perms.some((p) => can(p));
	};

	/**
	 * Tüm permission'lara sahip mi (AND)
	 * @param {string[]} perms - Permission kodları
	 * @returns {boolean}
	 */
	const canAll = (perms) => {
		if (isSuperAdmin.value) return true;
		return perms.every((p) => can(p));
	};

	/**
	 * Belirli bir resource'a erişim var mı (herhangi bir action)
	 * @param {string} resource - Resource adı (örn: "users")
	 * @returns {boolean}
	 */
	const canAccessResource = (resource) => {
		if (isSuperAdmin.value) return true;
		if (permissions.value.includes("*")) return true;

		return permissions.value.some((p) => p.startsWith(`${resource}.`));
	};

	/**
	 * CASL formatında ability al
	 */
	const getAbilities = () => {
		if (isSuperAdmin.value) {
			return [{ action: "manage", subject: "all" }];
		}

		const abilities = [];
		const resourceMap = {};

		permissions.value.forEach((code) => {
			// Parse: "finance.bankTransfers.read" -> resource: "finance.bankTransfers", action: "read"
			const parts = code.split(".");
			const action = parts.pop(); // Last part is action
			const resource = parts.join("."); // Rest is resource

			if (!resource || !action) return;

			if (!resourceMap[resource]) {
				resourceMap[resource] = [];
			}
			resourceMap[resource].push(action);
		});

		Object.entries(resourceMap).forEach(([resource, actions]) => {
			if (actions.includes("manage")) {
				abilities.push({ action: "manage", subject: resource });
			} else {
				actions.forEach((action) => {
					abilities.push({ action, subject: resource });
				});
			}
		});

		// Always allow Auth
		abilities.push({ action: "read", subject: "Auth" });

		return abilities;
	};

	// Initialize from storage
	loadFromStorage();

	return {
		// State
		permissions,
		role,
		isSuperAdmin,
		isLoaded,
		loading,

		// Getters
		hasAnyPermission,
		permissionsByResource,

		// Actions
		loadFromStorage,
		setPermissions,
		clearPermissions,
		fetchPermissions,
		can,
		canAny,
		canAll,
		canAccessResource,
		getAbilities,
	};
});
