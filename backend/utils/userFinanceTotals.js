const mongoose = require("mongoose");

const Deposit = require("../database/models/Deposit");
const Withdrawal = require("../database/models/Withdrawal");
const CryptoTransaction = require("../database/models/CryptoTransaction");
const BankTransfer = require("../database/models/BankTransfer");
const ForcelabFinanceTransaction = require("../database/models/ForcelabFinanceTransaction");
const MeelDevTransaction = require("../database/models/MeelDevTransaction");
const GalaxyPayTransaction = require("../database/models/GalaxyPayTransaction");
const FluxKriptoTransaction = require("../database/models/FluxKriptoTransaction");
const XPaymentTransaction = require("../database/models/XPaymentTransaction");

// Bonus adları artık ManualBonusCategory koleksiyonunda (DB) yönetiliyor.
// Bkz. controllers/admin/manualBonusCategoryController.js
// Admin panelinde: Finans > Promosyonlar > Bonus Adları
const APPROVED_PAYMENT_STATUS = "approved";
const APPROVED_CRYPTO_STATES = ["completed", "success"];

/**
 * Onaylı (approved) yatırım/çekim toplamlarını ve yatırım (deposit) adedini
 * kullanıcı bazında hesaplar. Deposit/Withdrawal/CryptoTransaction/BankTransfer
 * ve yerel ödeme sağlayıcıları (Forcelab, MeelDev, GalaxyPay, FluxKripto,
 * XPayments) dahil edilir.
 *
 * @param {Array<string|mongoose.Types.ObjectId>} userIds
 * @returns {Promise<Map<string, { totalDeposit: number, totalWithdrawal: number, depositCount: number }>>}
 */
const getUserApprovedFinanceTotals = async (userIds) => {
	const normalizedUserIds = userIds
		.filter((userId) => mongoose.Types.ObjectId.isValid(userId))
		.map((userId) => new mongoose.Types.ObjectId(userId));

	const totalsByUser = new Map(
		normalizedUserIds.map((userId) => [
			userId.toString(),
			{ totalDeposit: 0, totalWithdrawal: 0, depositCount: 0 },
		]),
	);

	if (!normalizedUserIds.length) return totalsByUser;

	const groupByUserAndType = (type) => ({
		$group: {
			_id: { user: "$user", type },
			total: { $sum: "$amount" },
			count: { $sum: 1 },
		},
	});

	const [
		cryptoAgg,
		fiatDepositAgg,
		fiatWithdrawalAgg,
		bankAgg,
		forcelabAgg,
		meelDevAgg,
		galaxyPayAgg,
		fluxKriptoAgg,
		xPaymentsAgg,
	] = await Promise.all([
		CryptoTransaction.aggregate([
			{
				$match: {
					user: { $in: normalizedUserIds },
					state: { $in: APPROVED_CRYPTO_STATES },
				},
			},
			groupByUserAndType("$type"),
		]),
		Deposit.aggregate([
			{
				$match: {
					user: { $in: normalizedUserIds },
					status: APPROVED_PAYMENT_STATUS,
				},
			},
			groupByUserAndType("deposit"),
		]),
		Withdrawal.aggregate([
			{
				$match: {
					user: { $in: normalizedUserIds },
					status: APPROVED_PAYMENT_STATUS,
				},
			},
			groupByUserAndType("withdraw"),
		]),
		BankTransfer.aggregate([
			{
				$match: {
					user: { $in: normalizedUserIds },
					status: APPROVED_PAYMENT_STATUS,
				},
			},
			groupByUserAndType("$type"),
		]),
		ForcelabFinanceTransaction.aggregate([
			{
				$match: {
					user: { $in: normalizedUserIds },
					status: APPROVED_PAYMENT_STATUS,
				},
			},
			groupByUserAndType({ $ifNull: ["$providerType", "deposit"] }),
		]),
		MeelDevTransaction.aggregate([
			{
				$match: {
					user: { $in: normalizedUserIds },
					status: APPROVED_PAYMENT_STATUS,
				},
			},
			groupByUserAndType("$type"),
		]),
		GalaxyPayTransaction.aggregate([
			{
				$match: {
					user: { $in: normalizedUserIds },
					status: APPROVED_PAYMENT_STATUS,
				},
			},
			groupByUserAndType("$type"),
		]),
		FluxKriptoTransaction.aggregate([
			{
				$match: {
					user: { $in: normalizedUserIds },
					status: APPROVED_PAYMENT_STATUS,
				},
			},
			groupByUserAndType("$type"),
		]),
		XPaymentTransaction.aggregate([
			{
				$match: {
					user: { $in: normalizedUserIds },
					status: APPROVED_PAYMENT_STATUS,
				},
			},
			groupByUserAndType("$type"),
		]),
	]);

	const addRowsToTotals = (rows) => {
		for (const row of rows) {
			const userTotals = totalsByUser.get(row._id.user.toString());
			if (!userTotals) continue;

			if (row._id.type === "deposit") {
				userTotals.totalDeposit += Number(row.total || 0);
				userTotals.depositCount += Number(row.count || 0);
			} else if (row._id.type === "withdraw") {
				userTotals.totalWithdrawal += Number(row.total || 0);
			}
		}
	};

	[
		cryptoAgg,
		fiatDepositAgg,
		fiatWithdrawalAgg,
		bankAgg,
		forcelabAgg,
		meelDevAgg,
		galaxyPayAgg,
		fluxKriptoAgg,
		xPaymentsAgg,
	].forEach(addRowsToTotals);

	return totalsByUser;
};

/**
 * Tek bir kullanıcının belirli bir tarih aralığındaki (createdAt bazlı)
 * onaylı yatırım/çekim toplamlarını hesaplar. Kayıp Bonusu gibi dönemsel
 * hesaplamalar için kullanılır.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {{ from?: Date, to?: Date }} range
 * @returns {Promise<{ totalDeposit: number, totalWithdrawal: number }>}
 */
const getUserApprovedFinanceTotalsInRange = async (userId, range = {}) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		return { totalDeposit: 0, totalWithdrawal: 0 };
	}

	const objectId = new mongoose.Types.ObjectId(userId);
	const { from, to } = range;

	const createdAtFilter = {};
	if (from) createdAtFilter.$gte = from;
	if (to) createdAtFilter.$lte = to;

	const baseMatch = {
		user: objectId,
		...(Object.keys(createdAtFilter).length
			? { createdAt: createdAtFilter }
			: {}),
	};

	const groupByType = (type) => ({
		$group: {
			_id: type,
			total: { $sum: "$amount" },
		},
	});

	const [
		cryptoAgg,
		fiatDepositAgg,
		fiatWithdrawalAgg,
		bankAgg,
		forcelabAgg,
		meelDevAgg,
		galaxyPayAgg,
		fluxKriptoAgg,
		xPaymentsAgg,
	] = await Promise.all([
		CryptoTransaction.aggregate([
			{
				$match: {
					...baseMatch,
					state: { $in: APPROVED_CRYPTO_STATES },
				},
			},
			groupByType("$type"),
		]),
		Deposit.aggregate([
			{ $match: { ...baseMatch, status: APPROVED_PAYMENT_STATUS } },
			groupByType("deposit"),
		]),
		Withdrawal.aggregate([
			{ $match: { ...baseMatch, status: APPROVED_PAYMENT_STATUS } },
			groupByType("withdraw"),
		]),
		BankTransfer.aggregate([
			{ $match: { ...baseMatch, status: APPROVED_PAYMENT_STATUS } },
			groupByType("$type"),
		]),
		ForcelabFinanceTransaction.aggregate([
			{ $match: { ...baseMatch, status: APPROVED_PAYMENT_STATUS } },
			groupByType({ $ifNull: ["$providerType", "deposit"] }),
		]),
		MeelDevTransaction.aggregate([
			{ $match: { ...baseMatch, status: APPROVED_PAYMENT_STATUS } },
			groupByType("$type"),
		]),
		GalaxyPayTransaction.aggregate([
			{ $match: { ...baseMatch, status: APPROVED_PAYMENT_STATUS } },
			groupByType("$type"),
		]),
		FluxKriptoTransaction.aggregate([
			{ $match: { ...baseMatch, status: APPROVED_PAYMENT_STATUS } },
			groupByType("$type"),
		]),
		XPaymentTransaction.aggregate([
			{ $match: { ...baseMatch, status: APPROVED_PAYMENT_STATUS } },
			groupByType("$type"),
		]),
	]);

	const totals = { totalDeposit: 0, totalWithdrawal: 0 };

	const addRows = (rows) => {
		for (const row of rows) {
			if (row._id === "deposit") {
				totals.totalDeposit += Number(row.total || 0);
			} else if (row._id === "withdraw") {
				totals.totalWithdrawal += Number(row.total || 0);
			}
		}
	};

	[
		cryptoAgg,
		fiatDepositAgg,
		fiatWithdrawalAgg,
		bankAgg,
		forcelabAgg,
		meelDevAgg,
		galaxyPayAgg,
		fluxKriptoAgg,
		xPaymentsAgg,
	].forEach(addRows);

	return totals;
};

module.exports = {
	APPROVED_PAYMENT_STATUS,
	APPROVED_CRYPTO_STATES,
	getUserApprovedFinanceTotals,
	getUserApprovedFinanceTotalsInRange,
};
