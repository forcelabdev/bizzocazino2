import { getCurrentInstance } from "vue";

import ability from "@/plugins/casl/ability";
import navItems from "@/navigation/vertical/app-and-pages";

const buildNavAclMap = (items) => {
	const map = new Map();

	const walk = (list) => {
		if (!Array.isArray(list)) return;

		list.forEach((item) => {
			if (!item) return;

			if (item.to && item.action && item.subject)
				map.set(item.to, {
					action: item.action,
					subject: item.subject,
				});

			if (Array.isArray(item.children)) walk(item.children);
		});
	};

	walk(items || []);
	return map;
};

// Single source of truth: use navigation config to infer ACL for routes lacking meta.
const navAclMap = buildNavAclMap(navItems);

/**
 * Returns ability result if ACL is configured or else just return true
 * We should allow passing string | undefined to can because for admin ability we omit defining action & subject
 *
 * Useful if you don't know if ACL is configured or not
 * Used in @core files to handle absence of ACL without errors
/**
 * @param {String} action CASL Actions // https://casl.js.org/v4/en/guide/intro#basics
 * @param {String} subject CASL Subject // https://casl.js.org/v4/en/guide/intro#basics
 */
const canWithFallback = (action, subject) => {
	// Guard: if no action or subject, allow by default
	if (!action || !subject) return true;

	try {
		// Direct check first
		if (ability.can(action, subject)) return true;

		// Allow broader resource-level permissions to unlock page-level subjects
		// e.g., finance.read allows access to finance.deposits page
		const parts = String(subject).split(".");
		const resource = parts[0];
		if (resource && resource !== subject) {
			if (ability.can(action, resource)) return true;
			if (ability.can("manage", resource)) return true;
		}

		// Reverse check: if checking a parent resource (e.g., "finance"),
		// allow if user has permission on ANY child resource (e.g., "finance.deposits")
		// This enables showing the category menu when user has any sub-page permission
		const userAbilities = ability.rules || [];
		if (Array.isArray(userAbilities)) {
			const hasChildPermission = userAbilities.some((rule) => {
				if (!rule || !rule.subject) return false;
				const ruleSubject = String(rule.subject);
				// Check if rule subject starts with the requested subject + "."
				return ruleSubject.startsWith(subject + ".");
			});
			if (hasChildPermission) return true;
		}

		return false;
	} catch (error) {
		console.error("canWithFallback error:", error);
		return false;
	}
};

export const can = (action, subject) => {
	try {
		const vm = getCurrentInstance();
		const localCan = vm?.proxy && "$can" in vm.proxy;

		if (localCan) return vm.proxy?.$can(action, subject);

		return canWithFallback(action, subject);
	} catch (error) {
		console.error("can() error:", error);
		return false;
	}
};

/**
 * Check if user can view item based on it's ability
 * Based on item's action and subject & Hide group if all of it's children are hidden
 * @param {Object} item navigation object item
 */
export const canViewNavMenuGroup = (item) => {
	// Guard: if no children or empty array, check item's own permission
	if (
		!item?.children ||
		!Array.isArray(item.children) ||
		item.children.length === 0
	) {
		// If the group itself has action/subject, check that
		if (item?.action && item?.subject) {
			return canWithFallback(item.action, item.subject);
		}
		return true; // No ACL defined, allow by default
	}

	// Recursively check if any child (or nested child) is visible
	const hasAnyVisibleChild = item.children.some((child) => {
		if (!child) return false;

		// If child has its own children, check recursively
		if (Array.isArray(child.children) && child.children.length > 0) {
			return canViewNavMenuGroup(child);
		}
		// Otherwise check the child's own permission using canWithFallback
		// This ensures parent resource permissions unlock child pages
		return canWithFallback(child.action, child.subject);
	});

	// Show the group if any child is visible (regardless of group's own permission)
	return hasAnyVisibleChild;
};
export const canNavigate = (to) => {
	try {
		// 1) Prefer explicit route meta
		const withMeta =
			to.matched?.filter(
				(route) => route.meta?.action && route.meta?.subject
			) || [];
		if (withMeta.length)
			return withMeta.some((route) =>
				canWithFallback(route.meta.action, route.meta.subject)
			);

		// 2) Otherwise look up by route name from navigation config
		const aclFromNav = navAclMap.get(to.name);
		if (aclFromNav)
			return canWithFallback(aclFromNav.action, aclFromNav.subject);

		// 3) Fallback: no ACL declared anywhere; deny by default
		return false;
	} catch (error) {
		console.error("canNavigate error:", error);
		return false;
	}
};
