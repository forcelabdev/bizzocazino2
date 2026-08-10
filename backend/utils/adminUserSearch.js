const mongoose = require("mongoose");

const escapeRegex = (value = "") =>
	String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildFlexibleDigitSearchPattern = (value = "") =>
	String(value)
		.replace(/\D/g, "")
		.split("")
		.join("\\D*");

const buildExactDigitSearchPattern = (value = "") => {
	const flexiblePattern = buildFlexibleDigitSearchPattern(value);

	return flexiblePattern ? `^\\D*${flexiblePattern}\\D*$` : "";
};

const buildRegexMatchExpression = (field, regex) => ({
	$regexMatch: {
		input: { $ifNull: [`$${field}`, ""] },
		regex,
	},
});

const buildAdminUserSearch = (search = "") => {
	const trimmedSearch = String(search || "").trim();
	if (!trimmedSearch) {
		return {
			trimmedSearch: "",
			partialQuery: null,
			exactQuery: null,
			exactMatchExpression: false,
		};
	}

	const escapedSearch = escapeRegex(trimmedSearch);
	const normalizedNumericSearch = trimmedSearch.replace(/\D/g, "");
	const compactSearch = trimmedSearch.replace(/\s+/g, "");
	const flexibleNumericSearch = buildFlexibleDigitSearchPattern(
		normalizedNumericSearch,
	);
	const isNumericSearch = /^[+\d\s().-]+$/.test(trimmedSearch);
	const exactTextRegex = new RegExp(`^${escapedSearch}$`, "i");
	const exactNumericRegex = isNumericSearch && normalizedNumericSearch
		? new RegExp(buildExactDigitSearchPattern(normalizedNumericSearch), "i")
		: null;
	const objectId = mongoose.Types.ObjectId.isValid(trimmedSearch)
		? new mongoose.Types.ObjectId(trimmedSearch)
		: null;
	const numericId = /^\d+$/.test(trimmedSearch)
		? Number(trimmedSearch)
		: null;
	const hasNumericId = Number.isSafeInteger(numericId);
	const partialNumericId = normalizedNumericSearch
		? Number(normalizedNumericSearch)
		: null;
	const hasPartialNumericId = Number.isSafeInteger(partialNumericId);

	const partialMatches = [
		...(objectId ? [{ _id: objectId }] : []),
		...(hasPartialNumericId ? [{ numericId: partialNumericId }] : []),
		...(compactSearch && compactSearch !== trimmedSearch
			? [{ username: { $regex: escapeRegex(compactSearch), $options: "i" } }]
			: []),
		{ "local.email": { $regex: escapedSearch, $options: "i" } },
		{ username: { $regex: escapedSearch, $options: "i" } },
		{ name: { $regex: escapedSearch, $options: "i" } },
		{ phone: { $regex: escapedSearch, $options: "i" } },
		{ "identity.idNumber": { $regex: escapedSearch, $options: "i" } },
		{ "affiliates.code": { $regex: escapedSearch, $options: "i" } },
		{ "affiliates.redeemedCode": { $regex: escapedSearch, $options: "i" } },
	];

	if (flexibleNumericSearch) {
		partialMatches.push(
			{ username: { $regex: normalizedNumericSearch, $options: "i" } },
			{ phone: { $regex: flexibleNumericSearch, $options: "i" } },
			{
				"identity.idNumber": {
					$regex: flexibleNumericSearch,
					$options: "i",
				},
			},
		);
	}

	const exactMatches = [
		...(objectId ? [{ _id: objectId }] : []),
		...(hasNumericId ? [{ numericId }] : []),
		{ "local.email": exactTextRegex },
		{ username: exactTextRegex },
		{ name: exactTextRegex },
		{ "affiliates.code": exactTextRegex },
		{ "affiliates.redeemedCode": exactTextRegex },
		...(exactNumericRegex
			? [
				{ phone: exactNumericRegex },
				{ "identity.idNumber": exactNumericRegex },
			]
			: []),
	];

	const exactMatchExpressions = [
		...(objectId ? [{ $eq: ["$_id", objectId] }] : []),
		...(hasNumericId ? [{ $eq: ["$numericId", numericId] }] : []),
		buildRegexMatchExpression("local.email", exactTextRegex),
		buildRegexMatchExpression("username", exactTextRegex),
		buildRegexMatchExpression("name", exactTextRegex),
		buildRegexMatchExpression("affiliates.code", exactTextRegex),
		buildRegexMatchExpression("affiliates.redeemedCode", exactTextRegex),
		...(exactNumericRegex
			? [
				buildRegexMatchExpression("phone", exactNumericRegex),
				buildRegexMatchExpression("identity.idNumber", exactNumericRegex),
			]
			: []),
	];

	return {
		trimmedSearch,
		partialQuery: { $or: partialMatches },
		exactQuery: { $or: exactMatches },
		exactMatchExpression: { $or: exactMatchExpressions },
	};
};

const isTrueQueryValue = (value) => value === true || value === "true" || value === "1";

const resolveAdminUserSearch = ({
	searchMode,
	hasSearch,
	includeSimilar,
	exactCount,
	partialCount,
}) => {
	if (searchMode !== "smart" || !hasSearch) {
		return { useExactQuery: false, searchMeta: null };
	}

	const similarCount = Math.max(0, partialCount - exactCount);
	if (exactCount === 0) {
		return {
			useExactQuery: false,
			searchMeta: {
				resolvedMode: "partial",
				exactMatchCount: 0,
				similarMatchCount: partialCount,
			},
		};
	}

	return {
		useExactQuery: !includeSimilar,
		searchMeta: {
			resolvedMode: includeSimilar ? "all" : "exact",
			exactMatchCount: exactCount,
			similarMatchCount: similarCount,
		},
	};
};

module.exports = {
	buildAdminUserSearch,
	buildExactDigitSearchPattern,
	isTrueQueryValue,
	resolveAdminUserSearch,
};
