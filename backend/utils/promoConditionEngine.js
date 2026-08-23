const { getUserApprovedFinanceTotalsInRange } = require("./userFinanceTotals");

/**
 * Promosyon kodu / site içi mesaj segmentasyonu için ortak koşul motoru.
 * `PromoCode.conditions` (ve ileride `Notice.audience.conditions`) ile aynı
 * şemayı kullanır: { metric, operator, value, dateFrom, dateTo }
 * Tüm koşullar birbirine AND ile bağlanır.
 *
 * Desteklenen metrikler:
 * - "deposit": [dateFrom, dateTo] aralığındaki onaylı yatırım toplamı (₺)
 * - "withdraw": [dateFrom, dateTo] aralığındaki onaylı çekim toplamı (₺)
 * - "membershipAgeDays": kullanıcının üyelik yaşı (gün)
 * - "depositSinceDate": dateFrom'dan itibaren (dateTo yoksa bugüne kadar) onaylı yatırım toplamı (₺)
 *   (deposit ile aynı hesaplama; UI'da "belirli tarihten itibaren" senaryosu için ayrı isimle sunulur)
 */

const compare = (observed, operator, target) => {
	switch (operator) {
		case "gte": return observed >= target;
		case "lte": return observed <= target;
		case "eq": return observed === target;
		case "gt": return observed > target;
		case "lt": return observed < target;
		default: return false;
	}
};

const OPERATOR_LABELS = {
	gte: "≥", lte: "≤", eq: "=", gt: ">", lt: "<",
};

const METRIC_LABELS = {
	deposit: "Yatırım tutarı",
	withdraw: "Çekim tutarı",
	membershipAgeDays: "Üyelik yaşı (gün)",
	depositSinceDate: "Belirli tarihten itibaren yatırım",
};

/**
 * Bir kullanıcı için tek bir koşulu değerlendirir.
 * @param {import('mongoose').Document} user - `createdAt` alanı olan User dokümanı
 * @param {{ metric: string, operator: string, value: number, dateFrom?: Date, dateTo?: Date }} condition
 * @returns {Promise<{ metric, operator, value, observedValue: number, passed: boolean, label: string }>}
 */
const evaluateCondition = async (user, condition) => {
	const { metric, operator, value } = condition;
	let observedValue = 0;

	if (metric === "deposit" || metric === "depositSinceDate" || metric === "withdraw") {
		const range = {
			from: condition.dateFrom || null,
			to: condition.dateTo || null,
		};
		const totals = await getUserApprovedFinanceTotalsInRange(user._id, range);
		observedValue = metric === "withdraw" ? totals.totalWithdrawal : totals.totalDeposit;
	} else if (metric === "membershipAgeDays") {
		const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
		observedValue = Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
	}

	const passed = compare(observedValue, operator, Number(value));

	return {
		metric,
		operator,
		value: Number(value),
		observedValue,
		passed,
		label: `${METRIC_LABELS[metric] || metric} ${OPERATOR_LABELS[operator] || operator} ${value}`,
	};
};

/**
 * Bir kullanıcı için koşul listesinin TAMAMINI (AND) değerlendirir.
 * @returns {Promise<{ allPassed: boolean, results: Array, firstFailed: object|null }>}
 */
const evaluateConditions = async (user, conditions = []) => {
	const results = [];
	for (const condition of conditions) {
		// eslint-disable-next-line no-await-in-loop
		const result = await evaluateCondition(user, condition);
		results.push(result);
	}
	const firstFailed = results.find((result) => !result.passed) || null;

	return { allPassed: !firstFailed, results, firstFailed };
};

module.exports = { evaluateCondition, evaluateConditions, METRIC_LABELS, OPERATOR_LABELS };
