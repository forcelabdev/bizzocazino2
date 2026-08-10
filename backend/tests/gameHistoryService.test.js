const test = require("node:test");
const assert = require("node:assert/strict");

const {
	matchesHistoryResult,
	normalizeHistoryResultFilter,
	parseHistoryDate,
	summarizeHistory,
} = require("../services/gameHistoryService");

test("Turkish transaction timestamps are parsed with inclusive end-of-second support", () => {
	const start = parseHistoryDate("19.07.2026 16:03:13");
	const end = parseHistoryDate("19.07.2026 16:03:13", { endOfSecond: true });

	assert.equal(start.getFullYear(), 2026);
	assert.equal(start.getMonth(), 6);
	assert.equal(start.getDate(), 19);
	assert.equal(start.getHours(), 16);
	assert.equal(start.getMilliseconds(), 0);
	assert.equal(end.getMilliseconds(), 999);
	assert.equal(parseHistoryDate("31.02.2026 12:00:00"), null);
});

test("history result filters use the net round result", () => {
	const winner = { bet_money: 10, win_money: 15 };
	const loser = { bet_money: 10, win_money: 0 };
	const creditOnly = { bet_money: 0, win_money: 5 };

	assert.equal(matchesHistoryResult(winner, "wins"), true);
	assert.equal(matchesHistoryResult(loser, "losses"), true);
	assert.equal(matchesHistoryResult(winner, "bets"), true);
	assert.equal(matchesHistoryResult(creditOnly, "bets"), false);
	assert.equal(normalizeHistoryResultFilter("WINS"), "wins");
	assert.equal(normalizeHistoryResultFilter("unknown"), null);
});

test("history summary covers all supplied filtered records", () => {
	assert.deepEqual(
		summarizeHistory([
			{ bet_money: 10, win_money: 15 },
			{ amount: 20, payout: 0 },
		]),
		{ totalRecords: 2, totalBet: 30, totalWin: 15, netProfit: -15 },
	);
});
