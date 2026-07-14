"use strict";

function createGameAnalysisQueue(positions) {
	let items = Array.isArray(positions) ? positions.map((position, index) => ({
		positionId: position.positionId || String(index),
		node: position.node || null,
		status: "pending",
		result: null,
		error: null,
	})) : [];
	let cursor = 0;
	let current = null;

	return {
		next() {
		if (current || cursor >= items.length) return current;
		current = items[cursor++];
		current.status = "analyzing";
		return current;
	},

		complete(result) {
			if (!current) return null;
			current.status = "complete";
			current.result = result;
			let completed = current;
			current = null;
			return completed;
		},

		fail(error) {
			if (!current) return null;
			current.status = "failed";
			current.error = error ? String(error) : "Unknown error";
			let failed = current;
			current = null;
			return failed;
		},

		pending() {
			return items.slice(cursor).filter(item => item.status === "pending").length;
		},

		done() {
			return current === null && cursor >= items.length;
		},

		results() {
			return items.filter(item => item.status === "complete").map(item => ({
				positionId: item.positionId,
				result: item.result,
			}));
		},

		failures() {
			return items.filter(item => item.status === "failed").map(item => ({
				positionId: item.positionId,
				error: item.error,
			}));
		},
	};
}

module.exports = {createGameAnalysisQueue};
