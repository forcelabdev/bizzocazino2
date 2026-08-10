const HISTORY_RESULT_FILTERS = new Set(["all", "wins", "losses", "bets"]);

const parseHistoryDate = (value, { endOfSecond = false } = {}) => {
	if (value == null || value === "") return null;

	let parsed;
	if (value instanceof Date) {
		parsed = new Date(value.getTime());
	} else {
		const raw = String(value).trim();
		const turkishDateTime = raw.match(
			/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/,
		);

		if (turkishDateTime) {
			const [, day, month, year, hour = "00", minute = "00", second = "00"] =
				turkishDateTime;
			parsed = new Date(
				Number(year),
				Number(month) - 1,
				Number(day),
				Number(hour),
				Number(minute),
				Number(second),
				0,
			);

			if (
				parsed.getFullYear() !== Number(year) ||
				parsed.getMonth() !== Number(month) - 1 ||
				parsed.getDate() !== Number(day) ||
				parsed.getHours() !== Number(hour) ||
				parsed.getMinutes() !== Number(minute) ||
				parsed.getSeconds() !== Number(second)
			) {
				return null;
			}
		} else {
			parsed = new Date(raw);
		}
	}

	if (Number.isNaN(parsed.getTime())) return null;
	if (endOfSecond) parsed.setMilliseconds(999);

	return parsed;
};

const normalizeHistoryResultFilter = (value) => {
	const normalized = String(value || "all").trim().toLowerCase();
	return HISTORY_RESULT_FILTERS.has(normalized) ? normalized : null;
};

const matchesHistoryResult = (entry, resultFilter) => {
	const bet = Number(entry?.bet_money ?? entry?.amount ?? 0) || 0;
	const win = Number(entry?.win_money ?? entry?.payout ?? 0) || 0;
	const profit = win - bet;

	if (resultFilter === "wins") return profit > 0;
	if (resultFilter === "losses") return profit < 0;
	if (resultFilter === "bets") return bet > 0;
	return true;
};

const summarizeHistory = (entries) =>
	entries.reduce(
		(summary, entry) => {
			const bet = Number(entry?.bet_money ?? entry?.amount ?? 0) || 0;
			const win = Number(entry?.win_money ?? entry?.payout ?? 0) || 0;

			summary.totalRecords += 1;
			summary.totalBet += bet;
			summary.totalWin += win;
			summary.netProfit += win - bet;
			return summary;
		},
		{ totalRecords: 0, totalBet: 0, totalWin: 0, netProfit: 0 },
	);

const buildHistoryResultMatch = (resultFilter) => {
	const bet = { $ifNull: ["$bet_money", 0] };
	const win = { $ifNull: ["$win_money", 0] };
	const profit = { $subtract: [win, bet] };

	if (resultFilter === "wins") return { $match: { $expr: { $gt: [profit, 0] } } };
	if (resultFilter === "losses") return { $match: { $expr: { $lt: [profit, 0] } } };
	if (resultFilter === "bets") return { $match: { $expr: { $gt: [bet, 0] } } };
	return null;
};

module.exports = {
	buildHistoryResultMatch,
	matchesHistoryResult,
	normalizeHistoryResultFilter,
	parseHistoryDate,
	summarizeHistory,
};
