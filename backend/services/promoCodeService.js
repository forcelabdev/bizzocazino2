const mongoose = require("mongoose");
const PromoCode = require("../database/models/PromoCode");
const PromoCodeClaim = require("../database/models/PromoCodeClaim");
const User = require("../database/models/User");
const ForcelabFinanceTransaction = require("../database/models/ForcelabFinanceTransaction");
const BalanceTransaction = require("../database/models/BalanceTransaction");
const { evaluateConditions } = require("../utils/promoConditionEngine");

class PromoCodeError extends Error {
	constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}

const claimPromoCode = async ({ code, userId }) => {
	const normalizedCode = String(code || "").trim().toUpperCase();
	if (!normalizedCode) throw new PromoCodeError("CODE_REQUIRED", "Promosyon kodu zorunludur.");

	const session = await mongoose.startSession();
	try {
		let result;
		await session.withTransaction(async () => {
			const [promo, user] = await Promise.all([
				PromoCode.findOne({ code: normalizedCode }).session(session),
				User.findById(userId).session(session),
			]);
			if (!promo) throw new PromoCodeError("CODE_NOT_FOUND", "Promosyon kodu bulunamadı.", 404);
			if (!user) throw new PromoCodeError("USER_NOT_FOUND", "Kullanıcı bulunamadı.", 404);

			const now = new Date();
			if (!promo.isActive) throw new PromoCodeError("CODE_INACTIVE", "Promosyon kodu aktif değil.");
			if (promo.startsAt && now < promo.startsAt) throw new PromoCodeError("CODE_NOT_STARTED", "Promosyon kodu henüz başlamadı.");
			if (promo.expiresAt && now > promo.expiresAt) throw new PromoCodeError("CODE_EXPIRED", "Promosyon kodunun süresi doldu.");
			if (promo.redeemptionsMax > 0 && promo.redeemptionsTotal >= promo.redeemptionsMax) throw new PromoCodeError("TOTAL_LIMIT_REACHED", "Promosyon kodu kullanım limitine ulaştı.");

			const affiliateCode = String(user.affiliates?.redeemedCode || "").trim();
			if (promo.affiliateCodes.length && !promo.affiliateCodes.includes(affiliateCode)) throw new PromoCodeError("AFFILIATE_NOT_ELIGIBLE", "Bu promosyon kodu affiliate grubunuza uygun değil.", 403);

			const userLevel = Math.floor(Math.pow(Number(user.xp || 0) / 100000, 1 / 3));
			if (userLevel < promo.levelMin) throw new PromoCodeError("VIP_LEVEL_REQUIRED", `En az VIP ${promo.levelMin} seviyesi gerekli.`);

			const claimCount = await PromoCodeClaim.countDocuments({ promoCode: promo._id, user: user._id }).session(session);
			if (claimCount >= promo.perUserLimit) throw new PromoCodeError("USER_LIMIT_REACHED", "Bu kod için kullanıcı limitinize ulaştınız.", 409);

			let lastDepositAmount = null;
			if (promo.minLastDeposit > 0) {
				const deposit = await ForcelabFinanceTransaction.findOne({ user: user._id, status: "approved" }).sort({ approvedAt: -1, createdAt: -1 }).session(session).lean();
				lastDepositAmount = deposit ? Number(deposit.amount || 0) : null;
				if (!deposit || lastDepositAmount < promo.minLastDeposit) throw new PromoCodeError("DEPOSIT_REQUIRED", `Son onaylı yatırım en az ${promo.minLastDeposit} ₺ olmalıdır.`);
			}

			// 🎯 Segment/koşul motoru: PromoCode.conditions içindeki tüm koşullar (AND).
			// Not: bu sorgular session dışında (aggregate session desteklemez) ama
			// transaction commit edilmeden hesaplanan sonuçlar sadece okunur, veri
			// tutarlılığını bozmaz.
			let evaluatedConditions = [];
			if (Array.isArray(promo.conditions) && promo.conditions.length) {
				const evaluation = await evaluateConditions(user, promo.conditions);
				evaluatedConditions = evaluation.results;
				if (!evaluation.allPassed) {
					throw new PromoCodeError(
						"CONDITION_NOT_MET",
						`Koşul karşılanmadı: ${evaluation.firstFailed.label} (mevcut değer: ${evaluation.firstFailed.observedValue})`,
					);
				}
			}

			user.balance = Number(user.balance || 0) + promo.reward;
			if (promo.applyWageringLock) {
				user.limits.betToWithdraw = Number(user.limits.betToWithdraw || 0) + (promo.reward * promo.wageringMultiplier);
				user.limits.minWithdraw = Math.max(Number(user.limits.minWithdraw || 0), promo.minWithdraw);
			}
			await user.save({ session });
			promo.redeemers.push({ user: user._id, claimedAt: now });
			promo.redeemptionsTotal += 1;
			await promo.save({ session });
			await PromoCodeClaim.create([{
				promoCode: promo._id,
				user: user._id,
				code: promo.code,
				reward: promo.reward,
				affiliateCode,
				conditions: {
					levelMin: promo.levelMin,
					userLevel,
					minLastDeposit: promo.minLastDeposit,
					lastDepositAmount,
					applyWageringLock: promo.applyWageringLock,
					wageringMultiplier: promo.wageringMultiplier,
					minWithdraw: promo.minWithdraw,
				},
				evaluatedConditions,
			}], { session });
			await BalanceTransaction.create([{ amount: promo.reward, type: "promoCodeClaim", user: user._id, state: "completed" }], { session });
			result = {
				code: promo.code,
				reward: promo.reward,
				balance: user.balance,
				claimedAt: now,
				wagering: promo.applyWageringLock ? {
					required: promo.reward * promo.wageringMultiplier,
					multiplier: promo.wageringMultiplier,
					minWithdraw: promo.minWithdraw,
				} : null,
			};
		});
		return result;
	} finally { await session.endSession(); }
};

module.exports = { claimPromoCode, PromoCodeError };
