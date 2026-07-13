"use strict";

function number_or_null(value) {
	if (typeof value !== "string" || value === "") {
		return null;
	}

	let result = Number(value);
	return Number.isFinite(result) ? result : null;
}

function integer_or_null(value) {
	let result = number_or_null(value);
	return Number.isInteger(result) ? result : null;
}

function parseInfoLine(line) {
	if (typeof line !== "string") {
		return null;
	}

	let tokens = line.trim().split(/\s+/).filter(token => token !== "");
	if (tokens.length === 0 || tokens[0] !== "info" || tokens[1] === "string") {
		return null;
	}

	let result = {
		depth: null,
		seldepth: null,
		timeMs: null,
		nodes: null,
		nps: null,
		multipv: 1,
		score: null,
		wdl: null,
		pv: [],
	};

	let scalarFields = {
		depth: "depth",
		seldepth: "seldepth",
		time: "timeMs",
		nodes: "nodes",
		nps: "nps",
		multipv: "multipv",
	};

	for (let i = 1; i < tokens.length - 1; i++) {
		let field = scalarFields[tokens[i]];
		if (field) {
			let value = integer_or_null(tokens[i + 1]);
			if (value !== null) {
				result[field] = value;
			}
		}
	}

	for (let i = 1; i < tokens.length - 2; i++) {
		if (tokens[i] === "score" && (tokens[i + 1] === "cp" || tokens[i + 1] === "mate")) {
			let value = integer_or_null(tokens[i + 2]);
			if (value !== null) {
				let bound = null;
				if (tokens.includes("lowerbound")) bound = "lower";
				if (tokens.includes("upperbound")) bound = "upper";
				result.score = {type: tokens[i + 1], value, bound};
			}
			break;
		}
	}

	for (let i = 1; i < tokens.length - 3; i++) {
		if (tokens[i] !== "wdl") continue;
		let win = integer_or_null(tokens[i + 1]);
		let draw = integer_or_null(tokens[i + 2]);
		let loss = integer_or_null(tokens[i + 3]);
		if (win !== null && draw !== null && loss !== null) {
			result.wdl = {win, draw, loss};
		}
		break;
	}

	let pvIndex = tokens.indexOf("pv");
	if (pvIndex !== -1) {
		for (let i = pvIndex + 1; i < tokens.length; i++) {
			if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(tokens[i])) break;
			result.pv.push(tokens[i]);
		}
	}

	return result;
}

function clamp_q(value) {
	return Math.max(-0.998, Math.min(0.998, value));
}

function q_from_pawns(pawns) {
	let winrate = 1 / (1 + Math.pow(10, -pawns / 4));
	return clamp_q(winrate * 2 - 1);
}

function q_from_wdl(wdl) {
	let winrate = (wdl.win + (wdl.draw * 0.5)) / 1000;
	return clamp_q(winrate * 2 - 1);
}

function normalizeScore(score, wdl) {
	if (score && score.type === "mate" && Number.isInteger(score.value)) {
		return {
			source: "mate",
			normalizedQ: null,
			mate: score.value,
		};
	}

	if (score && score.type === "cp" && Number.isFinite(score.value)) {
		return {
			source: "cp",
			normalizedQ: q_from_pawns(score.value / 100),
		};
	}

	if (wdl && Number.isFinite(wdl.win) && Number.isFinite(wdl.draw) && Number.isFinite(wdl.loss)) {
		return {
			source: "wdl",
			normalizedQ: q_from_wdl(wdl),
		};
	}

	return null;
}

function createMultiPVStore() {
	let activeSearchId = null;
	let lines = new Map();

	return {
		beginSearch(searchId) {
			activeSearchId = searchId;
			lines = new Map();
		},

		update(result) {
			if (!result || result.searchId !== activeSearchId) {
				return false;
			}

			let multipv = Number.isInteger(result.multipv) && result.multipv > 0 ? result.multipv : 1;
			lines.set(multipv, Object.assign({}, result, {multipv}));
			return true;
		},

		results() {
			return Array.from(lines.values()).sort((a, b) => a.multipv - b.multipv);
		},
	};
}

module.exports = {
	createMultiPVStore,
	normalizeScore,
	parseInfoLine,
};
