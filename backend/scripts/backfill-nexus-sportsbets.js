/**
 * Backfill script — Nexus (SB) sportsbook transactions that failed to create
 * a SportsBet record because the SportsBet schema's `provider` enum did not
 * include "nexusggr" (fixed in database/models/SportsBet.js).
 *
 * This reconstructs a minimal SportsBet coupon record from the existing
 * Transaction rows (game_type: "SB"). Match/market details (SportsBetEvent)
 * are NOT recoverable because the original webhook payload's `info` field
 * was never persisted — only bet/win/round_id/txn_id/created_at survive.
 *
 * Safe to re-run: skips any round_id that already has a SportsBet.
 *
 * Usage:
 *   node --env-file-if-exists=/vercel/share/.env.project scripts/backfill-nexus-sportsbets.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("../database/models/Transaction");
const SportsBet = require("../database/models/SportsBet");
const User = require("../database/models/User");

async function run() {
	await mongoose.connect(process.env.DATABASE_URI);
	console.log("Connected to DB");

	const txns = await Transaction.find({ game_type: "SB" })
		.sort({ created_at: 1 })
		.lean();

	console.log(`Found ${txns.length} SB transactions`);

	// Group by round_id (fallback to txn_id if round_id missing)
	const groups = new Map();
	for (const t of txns) {
		const key = String(t.round_id ?? t.txn_id);
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(t);
	}

	console.log(`Grouped into ${groups.size} coupons (by round_id)`);

	let created = 0;
	let skipped = 0;
	let failed = 0;

	for (const [roundId, rows] of groups) {
		try {
			const existing = await SportsBet.findOne({
				provider: "nexusggr",
				externalCouponId: roundId,
			});
			if (existing) {
				skipped++;
				continue;
			}

			rows.sort(
				(a, b) => new Date(a.created_at) - new Date(b.created_at),
			);
			const first = rows[0];
			const last = rows[rows.length - 1];

			const betMoney = rows.reduce(
				(sum, r) => sum + Number(r.bet_money || 0),
				0,
			);
			const winMoney = rows.reduce(
				(sum, r) => sum + Number(r.win_money || 0),
				0,
			);

			const hasDebit = rows.some((r) =>
				["debit", "bet", "debit_credit"].includes(r.txn_type),
			);
			const hasCredit = rows.some((r) =>
				["credit", "win", "payout", "debit_credit"].includes(
					r.txn_type,
				) && Number(r.win_money || 0) > 0,
			);

			let status = "pending";
			if (hasDebit && (hasCredit || winMoney > 0)) status = "won";
			else if (hasDebit && rows.length > 1 && winMoney === 0)
				status = "lost";

			const user = await User.findById(first.user_code)
				.select("numericId")
				.lean();
			if (!user) {
				console.warn(
					`Skipping round ${roundId}: user ${first.user_code} not found`,
				);
				failed++;
				continue;
			}

			await SportsBet.create({
				user: first.user_code,
				userNumericId: user.numericId || 0,
				provider: "nexusggr",
				externalBetId: first.txn_id,
				externalCouponId: roundId,
				amount: betMoney,
				totalOdds: betMoney > 0 ? Math.max(winMoney / betMoney, 1) : 1,
				potentialWin: winMoney,
				actualWin: winMoney,
				status,
				balanceBefore: first.balance_before,
				balanceAfter: last.balance_after,
				rakeback: rows.reduce((s, r) => s + Number(r.rakeback || 0), 0),
				affiliateCommission: rows.reduce(
					(s, r) => s + Number(r.affiliate || 0),
					0,
				),
				betType: "single",
				eventCount: 1,
				isLive: false,
				settledAt: hasCredit ? last.created_at : undefined,
				extra: {
					backfilled: true,
					backfilledAt: new Date(),
					sourceTxnIds: rows.map((r) => r.txn_id),
				},
				createdAt: first.created_at,
			});

			created++;
		} catch (err) {
			console.error(`Failed for round ${roundId}:`, err.message);
			failed++;
		}
	}

	console.log(
		`Done. created=${created} skipped=${skipped} failed=${failed}`,
	);
	await mongoose.disconnect();
	process.exit(0);
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
