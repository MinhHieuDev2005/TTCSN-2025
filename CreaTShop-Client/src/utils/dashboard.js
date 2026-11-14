export function dashboardRange(days, now = new Date()) {
	const parts = new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now);
	const value = type => parts.find(part => part.type === type).value;
	const toDate = `${value('year')}-${value('month')}-${value('day')}`;
	const start = new Date(`${toDate}T00:00:00Z`);
	start.setUTCDate(start.getUTCDate() - days + 1);
	return {fromDate: start.toISOString().slice(0, 10), toDate};
}

export function validDashboardRange({fromDate, toDate}) {
	const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1970-01-01'
		&& Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
	return validDate(fromDate) && validDate(toDate) && fromDate <= toDate
		&& (Date.parse(toDate) - Date.parse(fromDate)) / 86400000 <= 365;
}
