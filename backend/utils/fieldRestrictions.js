/**
 * Alan Kısıtlaması (Field Restriction) — Sunucu Taraflı Kontrol Yardımcıları
 * ===========================================================================
 *
 * Bu dosya, backend/config/fieldRestrictionRegistry.js'de tanımlı alan
 * kataloğunu kullanarak, bir güncelleme isteğinin admin'in rolünde
 * kısıtlanmış bir alanı DEĞİŞTİRMEYE çalışıp çalışmadığını tespit eder.
 *
 * ÖNEMLİ: Bu kontrol sadece UI'deki "disabled" durumunun bir tekrarı değildir.
 * Postman/curl gibi doğrudan API istekleriyle bypass edilemesin diye, bu
 * kontrol ilgili route handler'ında ZORUNLU olarak çalıştırılmalıdır.
 */

const { getResourceFields } = require("../config/fieldRestrictionRegistry");

/**
 * Nokta gösterimli bir path'i ("local.email" gibi) verilen obje üzerinden okur.
 * @param {object} obj
 * @param {string} path
 * @returns {*}
 */
function getByPath(obj, path) {
	if (!obj || !path) return undefined;
	return path.split(".").reduce((acc, key) => {
		if (acc === undefined || acc === null) return undefined;
		return acc[key];
	}, obj);
}

/**
 * Bir admin kullanıcısının (populate edilmiş adminRole ile) hangi alan
 * kısıtlama kodlarına sahip olduğunu döner.
 *
 * Süper adminler ve legacy (adminRole atanmamış) adminler için her zaman
 * boş bir Set döner — kısıtlamalardan muaftırlar.
 *
 * @param {object} adminUser - req.adminUser (populate edilmiş adminRole ile)
 * @returns {Set<string>}
 */
function getRestrictedFieldSet(adminUser) {
	const adminRole = adminUser?.adminRole;

	// Legacy admin (rol atanmamış) veya süper admin: tam yetkili, muaf.
	if (!adminRole || adminRole.isSuperAdmin) {
		return new Set();
	}

	const restrictedFields = Array.isArray(adminRole.restrictedFields)
		? adminRole.restrictedFields
		: [];

	return new Set(restrictedFields);
}

/**
 * Bir güncelleme isteğinde, kısıtlanmış alanlardan herhangi birinin GERÇEKTEN
 * değiştirilmeye çalışıldığını tespit eder. Değer mevcut değerle aynıysa
 * (no-op güncelleme) ihlal sayılmaz — bu, formun diğer alanlarını
 * güncellerken kısıtlı alanın "aynı değerle" tekrar gönderilmesine izin verir.
 *
 * @param {object} params
 * @param {string} params.resource - Kaynak adı, örn. "users"
 * @param {object} params.updates - İstekten gelen düz (flat) alan-değer haritası
 *   (registry'deki field.path'lerin SON parçasına karşılık gelen anahtarlarla
 *   değil, doğrudan aynı anahtar isimleriyle çağıran taraf tarafından
 *   hazırlanmış olmalı — bkz. kullanım örneği route içinde)
 * @param {object} params.currentDoc - path'leri okumak için kullanılacak,
 *   veritabanındaki GÜNCEL doküman (nested yapı korunmuş)
 * @param {Set<string>} params.restrictedSet - getRestrictedFieldSet() sonucu
 * @returns {Array<{code: string, label: string}>}
 */
function findRestrictedFieldViolations({
	resource,
	updates,
	currentDoc,
	restrictedSet,
}) {
	if (!restrictedSet || restrictedSet.size === 0) return [];

	const violations = [];
	const resourceFields = getResourceFields(resource);

	for (const field of resourceFields) {
		if (!restrictedSet.has(field.code)) continue;

		// field.path'in SON parçasını al (örn. "local.email" -> "email",
		// "currency.fiatCurrency" -> "fiatCurrency") — çağıran taraf,
		// updates objesini bu düz anahtarla hazırlar.
		const flatKey = field.path.split(".").pop();

		if (!Object.prototype.hasOwnProperty.call(updates, flatKey)) continue;

		const requestedValue = updates[flatKey];
		if (requestedValue === undefined) continue;

		const currentValue = getByPath(currentDoc, field.path);

		// Değer gerçekten değişmiyorsa (no-op), ihlal sayma.
		if (String(requestedValue ?? "") === String(currentValue ?? "")) continue;

		violations.push({ code: field.code, label: field.label });
	}

	return violations;
}

module.exports = {
	getByPath,
	getRestrictedFieldSet,
	findRestrictedFieldViolations,
};
