"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
	createMultiPVStore,
	createConsensus,
	normalizeScore,
	parseInfoLine,
} = require("../../files/src/modules/engine_lab");

test("parseInfoLine parses a standard cp info line", () => {
	const result = parseInfoLine(
		"info depth 24 seldepth 36 time 1315 nodes 1250098 nps 950000 score cp 34 multipv 2 pv e2e4 e7e5 g1f3"
	);

	assert.deepEqual(result, {
		depth: 24,
		seldepth: 36,
		timeMs: 1315,
		nodes: 1250098,
		nps: 950000,
		multipv: 2,
		score: {type: "cp", value: 34, bound: null},
		wdl: null,
		pv: ["e2e4", "e7e5", "g1f3"],
	});
});

test("parseInfoLine accepts arbitrary token order and defaults missing multipv", () => {
	const result = parseInfoLine(
		"info wdl 412 522 66 pv d2d4 g8f6 depth 18 score cp -12"
	);

	assert.equal(result.multipv, 1);
	assert.deepEqual(result.wdl, {win: 412, draw: 522, loss: 66});
	assert.deepEqual(result.score, {type: "cp", value: -12, bound: null});
	assert.deepEqual(result.pv, ["d2d4", "g8f6"]);
});

test("parseInfoLine parses mate scores and score bounds", () => {
	assert.deepEqual(
		parseInfoLine("info depth 30 score mate 5 upperbound pv e2e4"),
		{
			depth: 30,
			seldepth: null,
			timeMs: null,
			nodes: null,
			nps: null,
			multipv: 1,
			score: {type: "mate", value: 5, bound: "upper"},
			wdl: null,
			pv: ["e2e4"],
		}
	);
});

test("parseInfoLine accepts info without a PV and rejects info string", () => {
	const result = parseInfoLine("info depth 4 nodes 12");

	assert.equal(result.depth, 4);
	assert.equal(result.nodes, 12);
	assert.deepEqual(result.pv, []);
	assert.equal(parseInfoLine("info string backend started"), null);
	assert.equal(parseInfoLine("bestmove e2e4"), null);
});

test("normalizeScore uses Nibbler cp and WDL normalization", () => {
	const cp = normalizeScore({type: "cp", value: 400, bound: null}, null);
	const wdl = normalizeScore(null, {win: 750, draw: 200, loss: 50});

	assert.equal(cp.source, "cp");
	assert.equal(cp.normalizedQ, 0.8181818181818181);
	assert.equal(wdl.source, "wdl");
	assert.equal(wdl.normalizedQ, 0.7);
});

test("normalizeScore keeps mate outside the normalized pawn domain", () => {
	const mate = normalizeScore({type: "mate", value: -3, bound: null}, null);

	assert.deepEqual(mate, {
		source: "mate",
		normalizedQ: null,
		mate: -3,
	});
});

test("MultiPV store keeps only the latest result for each line", () => {
	const store = createMultiPVStore();

	store.beginSearch("search-1");
	assert.equal(store.update({searchId: "search-1", multipv: 1, depth: 10}), true);
	assert.equal(store.update({searchId: "search-1", multipv: 1, depth: 12}), true);
	assert.equal(store.update({searchId: "search-1", multipv: 2, depth: 11}), true);

	assert.deepEqual(store.results(), [
		{searchId: "search-1", multipv: 1, depth: 12},
		{searchId: "search-1", multipv: 2, depth: 11},
	]);
});

test("MultiPV store rejects stale search results and clears on a new search", () => {
	const store = createMultiPVStore();

	store.beginSearch("search-1");
	store.update({searchId: "search-1", multipv: 1, depth: 10});
	assert.equal(store.update({searchId: "search-0", multipv: 1, depth: 99}), false);

	store.beginSearch("search-2");
	assert.deepEqual(store.results(), []);
	assert.equal(store.update({searchId: "search-1", multipv: 1, depth: 99}), false);
});

test("createConsensus combines candidate moves and reports agreement", () => {
	const result = createConsensus({
		stockfish: [
			{multipv: 1, pv: ["e2e4"], score: {type: "cp", value: 34}},
			{multipv: 2, pv: ["d2d4"], score: {type: "cp", value: 12}},
		],
		lc0: [
			{multipv: 1, pv: ["e2e4"], wdl: {win: 520, draw: 460, loss: 20}},
			{multipv: 2, pv: ["c2c4"], wdl: {win: 500, draw: 450, loss: 50}},
		],
	});

	assert.equal(result.candidates[0].move, "e2e4");
	assert.equal(result.candidates[0].support, 2);
	assert.equal(result.candidates[0].ranks.stockfish, 1);
	assert.equal(result.candidates[0].ranks.lc0, 1);
	assert.equal(result.bestMove, "e2e4");
	assert.equal(result.agreement.level, "high");
	assert.ok(result.candidates[0].averageQ > 0);
});
