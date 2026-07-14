"use strict";

function requested_threads(session) {
	let value = Number(session && session.requestedThreads);
	return Number.isInteger(value) && value > 0 ? value : 1;
}

function createEngineResourceScheduler(options = {}) {
	let configured_total = Number(options.totalThreads);
	let total_threads = Number.isInteger(configured_total) && configured_total > 0 ? configured_total : 1;

	return {
		allocate(sessions, mode = "balanced", custom = {}) {
			let list = Array.isArray(sessions) ? sessions : [];
			let result = {};
			if (mode === "sequential") {
				list.forEach((session, index) => {
					result[session.sessionId] = index === 0 ? total_threads : 0;
				});
				return result;
			}
			if (mode === "custom") {
				list.forEach(session => {
					let value = Number(custom[session.sessionId]);
					result[session.sessionId] = Number.isInteger(value) && value >= 0 ? Math.min(value, total_threads) : 0;
				});
				return result;
			}
			if (mode === "unlimited") {
				list.forEach(session => {
					result[session.sessionId] = requested_threads(session);
				});
				return result;
			}

			let share = list.length > 0 ? Math.max(1, Math.floor(total_threads / list.length)) : 0;
			list.forEach(session => {
				result[session.sessionId] = Math.min(requested_threads(session), share);
			});
			return result;
		},
	};
}

module.exports = {createEngineResourceScheduler};
