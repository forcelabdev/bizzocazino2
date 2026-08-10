const Campaign = require("../../database/models/Campaign");
const CampaignTransaction = require("../../database/models/CampaignTransaction");
const User = require("../../database/models/User");
const mongoose = require("mongoose");
const {
	createAdminManualAdjustment,
} = require("../../services/adminManualAdjustmentService");

/**
 * @desc    Get all campaigns (with pagination)
 * @route   GET /admin/campaigns
 * @access  Admin
 */
exports.getAllCampaigns = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 20;
		const skip = (page - 1) * limit;

		const [campaigns, total] = await Promise.all([
			Campaign.find()
				.sort({ order: 1, createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.populate("claimedBy", "username local.email")
				.lean(),
			Campaign.countDocuments(),
		]);

		res.status(200).json({
			success: true,
			data: campaigns,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Get single campaign by ID
 * @route   GET /admin/campaigns/:id
 * @access  Admin
 */
exports.getCampaignById = async (req, res) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "INVALID_CAMPAIGN_ID" });
		}

		const campaign = await Campaign.findById(id)
			.populate("claimedBy", "username local.email createdAt")
			.lean();

		if (!campaign) {
			return res
				.status(404)
				.json({ success: false, message: "CAMPAIGN_NOT_FOUND" });
		}

		res.status(200).json({ success: true, data: campaign });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Create new campaign
 * @route   POST /admin/campaigns
 * @access  Admin
 */
exports.createCampaign = async (req, res) => {
	try {
		const {
			title,
			description,
			banner,
			category,
			mode,
			rewardAmount,
			maxClaims,
			startDate,
			endDate,
			requirements,
			terms,
			active,
			order,
		} = req.body;

		if (!title || !description || !banner) {
			return res
				.status(400)
				.json({ success: false, message: "MISSING_REQUIRED_FIELDS" });
		}

		const campaign = await Campaign.create({
			title,
			description: description || null,
			banner,
			category: category || "ozel",
			mode: mode || "auto",
			rewardAmount: rewardAmount || 0,
			maxClaims: maxClaims || 0,
			startDate: startDate || null,
			endDate: endDate || null,
			requirements: requirements || [],
			terms: terms || null,
			active: active !== undefined ? (active === true || active === "true") : true,
			order: order || 0,
		});

		res.status(201).json({ success: true, data: campaign });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Update campaign
 * @route   PUT /admin/campaigns/:id
 * @access  Admin
 */
exports.updateCampaign = async (req, res) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "INVALID_CAMPAIGN_ID" });
		}

		const {
			title,
			description,
			banner,
			category,
			mode,
			rewardAmount,
			maxClaims,
			startDate,
			endDate,
			requirements,
			terms,
			active,
			order,
		} = req.body;

		const campaign = await Campaign.findById(id);
		if (!campaign) {
			return res
				.status(404)
				.json({ success: false, message: "CAMPAIGN_NOT_FOUND" });
		}

		// Güncelleme
		if (title !== undefined) campaign.title = title;
		if (description !== undefined) campaign.description = description;
		if (banner !== undefined) campaign.banner = banner;
		if (category !== undefined) campaign.category = category;
		if (mode !== undefined) campaign.mode = mode;
		if (rewardAmount !== undefined) campaign.rewardAmount = rewardAmount;
		if (maxClaims !== undefined) campaign.maxClaims = maxClaims;
		if (startDate !== undefined) campaign.startDate = startDate;
		if (endDate !== undefined) campaign.endDate = endDate;
		if (requirements !== undefined) campaign.requirements = requirements;
		if (terms !== undefined) campaign.terms = terms;
		if (active !== undefined) campaign.active = active === true || active === "true";
		if (order !== undefined) campaign.order = order;

		await campaign.save();

		res.status(200).json({ success: true, data: campaign });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Delete campaign
 * @route   DELETE /admin/campaigns/:id
 * @access  Admin
 */
exports.deleteCampaign = async (req, res) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "INVALID_CAMPAIGN_ID" });
		}

		const campaign = await Campaign.findByIdAndDelete(id);
		if (!campaign) {
			return res
				.status(404)
				.json({ success: false, message: "CAMPAIGN_NOT_FOUND" });
		}

		res.status(200).json({ success: true, message: "CAMPAIGN_DELETED" });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Manually assign campaign to user (for manual mode)
 * @route   POST /admin/campaigns/:id/assign
 * @access  Admin
 * @body    { userId: string }
 */
exports.assignCampaignToUser = async (req, res) => {
	try {
		const { id } = req.params;
		const { userId } = req.body;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "INVALID_CAMPAIGN_ID" });
		}
		if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
			return res
				.status(400)
				.json({ success: false, message: "INVALID_USER_ID" });
		}

		const campaign = await Campaign.findById(id);
		if (!campaign) {
			return res
				.status(404)
				.json({ success: false, message: "CAMPAIGN_NOT_FOUND" });
		}

		// Kullanıcı daha önce almış mı?
		const claimedByIds = (campaign.claimedBy || []).map((cid) =>
			cid.toString()
		);
		if (claimedByIds.includes(userId)) {
			return res.status(400).json({
				success: false,
				message: "CAMPAIGN_ALREADY_CLAIMED_BY_USER",
			});
		}

		const user = await User.findById(userId);
		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: "USER_NOT_FOUND" });
		}

		const rivoWallet = (user.wallets || []).find(
			(wallet) =>
				wallet.coinType === "Rivo" &&
				wallet.chain === "TRON" &&
				wallet.type === "trc-20"
		) || (user.wallets || []).find((wallet) => wallet.coinType === "Rivo");
		if (!rivoWallet) {
			return res
				.status(400)
				.json({ success: false, message: "USER_WALLET_NOT_FOUND" });
		}

		const rewardAmount = campaign.rewardAmount || 0;
		const { balanceAfter: newBalance } = await createAdminManualAdjustment({
			targetUser: user,
			actorUser: req.adminUser || null,
			wallet: {
				coinType: rivoWallet.coinType,
				chain: rivoWallet.chain,
				type: rivoWallet.type,
			},
			kind: "bonus",
			direction: "credit",
			category: campaign.category || "campaign",
			note: `Campaign assigned: ${campaign.title}`,
			amount: rewardAmount,
			source: "campaign_assign",
			sourceRef: {
				campaignId: campaign._id,
				campaignTitle: campaign.title,
			},
			metadata: {
				campaignMode: campaign.mode,
			},
		});

		// Kampanyaya kullanıcıyı ekle
		campaign.claimedBy.push(user._id);
		await campaign.save();

		// CampaignTransaction kaydı oluştur (admin assign)
		await CampaignTransaction.create({
			user: user._id,
			campaign: campaign._id,
			campaignTitle: campaign.title,
			rewardAmount: rewardAmount,
			mode: campaign.mode,
			requirements: campaign.requirements || [],
			terms: campaign.terms || null,
			assignedByAdmin: req.adminUser?._id || null,
			status: "completed",
		});

		res.status(200).json({
			success: true,
			message: "CAMPAIGN_ASSIGNED",
			rewardAmount,
			newBalance,
		});
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Remove campaign claim from user (refund option)
 * @route   POST /admin/campaigns/:id/revoke
 * @access  Admin
 * @body    { userId: string, refund?: boolean }
 */
exports.revokeCampaignFromUser = async (req, res) => {
	try {
		const { id } = req.params;
		const { userId, refund } = req.body;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "INVALID_CAMPAIGN_ID" });
		}
		if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
			return res
				.status(400)
				.json({ success: false, message: "INVALID_USER_ID" });
		}

		const campaign = await Campaign.findById(id);
		if (!campaign) {
			return res
				.status(404)
				.json({ success: false, message: "CAMPAIGN_NOT_FOUND" });
		}

		// Kullanıcı kampanyayı almış mı?
		const claimedByIds = (campaign.claimedBy || []).map((cid) =>
			cid.toString()
		);
		const idx = claimedByIds.indexOf(userId);
		if (idx === -1) {
			return res.status(400).json({
				success: false,
				message: "USER_HAS_NOT_CLAIMED_CAMPAIGN",
			});
		}

		// Kampanyadan kullanıcıyı çıkar
		campaign.claimedBy.splice(idx, 1);
		await campaign.save();

		// Refund istenmişse bakiyeyi geri al
		if (refund) {
			const user = await User.findById(userId);
			if (user) {
				const rivoWallet = (user.wallets || []).find(
					(wallet) =>
						wallet.coinType === "Rivo" &&
						wallet.chain === "TRON" &&
						wallet.type === "trc-20"
				) || (user.wallets || []).find((wallet) => wallet.coinType === "Rivo");
				if (rivoWallet) {
					const rewardAmount = campaign.rewardAmount || 0;
					if (rewardAmount > 0 && Number(rivoWallet.balance || 0) > 0) {
						await createAdminManualAdjustment({
							targetUser: user,
							actorUser: req.adminUser || null,
							wallet: {
								coinType: rivoWallet.coinType,
								chain: rivoWallet.chain,
								type: rivoWallet.type,
							},
							kind: "bonus",
							direction: "debit",
							category: campaign.category || "campaign",
							note: `Campaign revoked: ${campaign.title}`,
							amount: rewardAmount,
							source: "campaign_revoke",
							sourceRef: {
								campaignId: campaign._id,
								campaignTitle: campaign.title,
							},
							metadata: {
								campaignMode: campaign.mode,
							},
						});
					}
				}
			}
		}

		res.status(200).json({ success: true, message: "CAMPAIGN_REVOKED" });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};
