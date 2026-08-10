function checkSingleRequirement(user, requirement) {
	const { type, operator, value } = requirement;

	switch (type) {
		case "reg_date": {
			const userRegDate = user.createdAt
				? new Date(user.createdAt)
				: null;
			if (!userRegDate) return false;
			const targetDate = new Date(value);
			if (isNaN(targetDate.getTime())) return false;

			return compareValues(
				userRegDate.getTime(),
				operator,
				targetDate.getTime()
			);
		}

		//TODO?
		// case "deposit_count": { ... }
		// case "wagered_amount": { ... }
		// case "vip_level": { ... }

		default:
			console.warn(
				`[CampaignRequirementEngine] Unknown requirement type: ${type}`
			);
			return false;
	}
}

function compareValues(left, operator, right) {
	switch (operator) {
		case ">=":
			return left >= right;
		case ">":
			return left > right;
		case "<=":
			return left <= right;
		case "<":
			return left < right;
		case "==":
			return left === right;
		default:
			return false;
	}
}

function checkRequirements(user, requirements) {
	if (!requirements || requirements.length === 0) {
		return true;
	}

	if (!user) {
		return false;
	}

	return requirements.every((req) => checkSingleRequirement(user, req));
}

function isWithinDateRange(campaign) {
	const now = new Date();

	if (campaign.startDate && new Date(campaign.startDate) > now) {
		return false;
	}

	if (campaign.endDate && new Date(campaign.endDate) < now) {
		return false;
	}

	return true;
}

function canUserClaimCampaign(user, campaign) {
	if (!campaign.active) {
		return { claimable: false, reason: "CAMPAIGN_DISABLED" };
	}

	if (!isWithinDateRange(campaign)) {
		return { claimable: false, reason: "CAMPAIGN_NOT_IN_DATE_RANGE" };
	}

	if (campaign.mode === "manual") {
		return { claimable: false, reason: "CAMPAIGN_MANUAL_ONLY" };
	}

	// Maksimum kullanım limiti kontrolü
	if (campaign.maxClaims > 0) {
		const claimedCount = (campaign.claimedBy || []).length;
		if (claimedCount >= campaign.maxClaims) {
			return { claimable: false, reason: "CAMPAIGN_MAX_CLAIMS_REACHED" };
		}
	}

	if (user) {
		const campaignId = campaign._id.toString();
		const claimedByIds = (campaign.claimedBy || []).map((id) =>
			id.toString()
		);
		if (claimedByIds.includes(user._id.toString())) {
			return { claimable: false, reason: "CAMPAIGN_ALREADY_CLAIMED" };
		}
	}

	if (!checkRequirements(user, campaign.requirements)) {
		return { claimable: false, reason: "REQUIREMENTS_NOT_MET" };
	}

	return { claimable: true };
}

/**
 * Kampanyanın maksimum kullanım limitine ulaşıp ulaşmadığını kontrol eder
 * @param {Object} campaign - Kampanya objesi
 * @returns {boolean}
 */
function isMaxClaimsReached(campaign) {
	if (!campaign.maxClaims || campaign.maxClaims === 0) {
		return false;
	}
	const claimedCount = (campaign.claimedBy || []).length;
	return claimedCount >= campaign.maxClaims;
}

module.exports = {
	checkRequirements,
	checkSingleRequirement,
	isWithinDateRange,
	canUserClaimCampaign,
	isMaxClaimsReached,
};
