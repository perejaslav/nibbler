"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const engine_lab = require("../files/src/modules/engine_lab");
const benchmark = require("../files/src/modules/engine_benchmark");

// ---- helpers -----------------------------------------------------------------------------------

// Mirrors the engine sink: only lines that parse are delivered, tagged with their search node.
function parsed(line, node) {
	let info = engine_lab.parseInfoLine(line);
	return info ? Object.assign(info, {node}) : null;
}

function fakeEngine() {
	let engine = {
		calls: [],
		searched: [],
		setOption(name, value) { this.calls.push(["setOption", name, value]); },
		sendUcinewgame() { this.calls.push(["ucinewgame"]); },
		search(node, movetimeMs) { this.calls.push(["search", node.fen, movetimeMs]); this.searched.push(node); },
		stop() { this.calls.push(["stop"]); },
		shutdown() { this.calls.push(["shutdown"]); },
	};
	return engine;
}

function fakeTimers() {
	let timers = new Map();
	let next = 1;
	return {
		timers,
		setTimer(fn, ms) {
			let id = next++;
			timers.set(id, {fn, ms});
			return id;
		},
		clearTimer(id) {
			timers.delete(id);
		},
		fireNext() {
			let [id, timer] = timers.entries().next().value;
			timers.delete(id);
			timer.fn();
		},
	};
}

function setup(overrides = {}) {
	let engine = fakeEngine();
	let timers = fakeTimers();
	let updates = [];
	let run = benchmark.createBenchmarkRun(Object.assign({
		engine,
		positions: [{id: "a", fen: "fen-a"}, {id: "b", fen: "fen-b"}],
		movetimeMs: 1000,
		graceMs: 500,
		clearHash: true,
		makeRoot: fen => ({fen}),
		destroyRoot: node => { node.destroyed = true; },
		setTimer: timers.setTimer,
		clearTimer: timers.clearTimer,
		onUpdate: snapshot => updates.push(snapshot),
	}, overrides));
	return {engine, timers, run, updates};
}

function record(positionId, status, extra = {}) {
	return Object.assign(benchmark.createSearchRecord(positionId), {status}, extra);
}

// ---- built-in positions ------------------------------------------------------------------------

test("built-in positions are well-formed FENs with one king per side", () => {
	assert.equal(benchmark.BENCHMARK_POSITIONS.length, 20);
	let ids = new Set(benchmark.BENCHMARK_POSITIONS.map(p => p.id));
	assert.equal(ids.size, 20, "ids must be unique");

	for (let {id, fen} of benchmark.BENCHMARK_POSITIONS) {
		let fields = fen.split(" ");
		assert.equal(fields.length, 6, `${id}: six FEN fields`);
		assert.ok(["w", "b"].includes(fields[1]), `${id}: side to move`);

		let ranks = fields[0].split("/");
		assert.equal(ranks.length, 8, `${id}: eight ranks`);
		for (let rank of ranks) {
			let squares = 0;
			for (let ch of rank) {
				squares += /\d/.test(ch) ? Number(ch) : 1;
			}
			assert.equal(squares, 8, `${id}: rank ${rank} has eight squares`);
		}
		assert.equal(fields[0].split("K").length - 1, 1, `${id}: one white king`);
		assert.equal(fields[0].split("k").length - 1, 1, `${id}: one black king`);
	}
});

test("buildRunPlan puts the warm-up first and keeps it out of the positions", () => {
	let plan = benchmark.buildRunPlan([{id: "a", fen: "fen-a"}, {id: "b", fen: "fen-b"}], true);
	assert.deepEqual(plan.map(p => [p.id, p.warmup]), [["warm-up", true], ["a", false], ["b", false]]);
	assert.equal(benchmark.buildRunPlan([{id: "a", fen: "fen-a"}], false).length, 1);
});

// ---- info folding ------------------------------------------------------------------------------

test("foldInfo takes the newest MultiPV 1 line and ignores other lines", () => {
	let rec = benchmark.createSearchRecord("a");
	benchmark.foldInfo(rec, parsed("info depth 1 seldepth 1 multipv 1 score cp 18 nodes 20 nps 4000 time 5 pv e2e4"));
	benchmark.foldInfo(rec, parsed("info depth 2 seldepth 2 multipv 2 score cp 12 nodes 66 nps 11000 time 6 pv g1f3"));
	benchmark.foldInfo(rec, parsed("info string NNUE evaluation using nn.nnue enabled")); // null: not delivered
	benchmark.foldInfo(rec, parsed("info depth 5 seldepth 7 multipv 1 score cp 58 nodes 609 nps 15225 time 40 pv e2e4 d7d5"));
	benchmark.foldInfo(rec, parsed("info depth 4 seldepth 6 multipv 1 score cp 50 nodes 500 nps 15000 time 35 pv e2e4"));

	assert.equal(rec.depth, 5, "depth never goes down");
	assert.equal(rec.nodes, 500, "nodes come from the newest line");
	assert.equal(rec.timeMs, 35);
	assert.equal(rec.nps, 15000);
	assert.deepEqual(rec.depthLog, [{depth: 1, timeMs: 5}, {depth: 5, timeMs: 40}], "the MultiPV 2 line adds nothing");
});

test("foldInfo computes NPS when the engine does not send it", () => {
	let rec = benchmark.createSearchRecord("a");
	benchmark.foldInfo(rec, parsed("info depth 9 seldepth 9 multipv 1 nodes 1000 time 500 pv e2e4"));
	assert.equal(rec.nps, 2000);
});

test("timeToDepth reports the first time a depth or deeper was reached", () => {
	let rec = benchmark.createSearchRecord("a");
	benchmark.foldInfo(rec, parsed("info depth 4 multipv 1 nodes 100 time 11 pv e2e4"));
	benchmark.foldInfo(rec, parsed("info depth 8 multipv 1 nodes 4000 time 333 pv e2e4"));
	assert.equal(benchmark.timeToDepth(rec, 5), 333);
	assert.equal(benchmark.timeToDepth(rec, 8), 333);
	assert.equal(benchmark.timeToDepth(rec, 10), null);
});

test("finishSearchRecord classifies the outcome", () => {
	let good = benchmark.foldInfo(benchmark.createSearchRecord("a"), parsed("info depth 3 multipv 1 nodes 9 time 2 pv e2e4"));
	assert.equal(benchmark.finishSearchRecord(good, "e2e4", null).status, "ok");

	let noInfo = benchmark.createSearchRecord("b");
	assert.equal(benchmark.finishSearchRecord(noInfo, "e2e4", null).status, "no-info");

	assert.equal(benchmark.finishSearchRecord(benchmark.createSearchRecord("c"), null, null).status, "no-bestmove");
	assert.equal(benchmark.finishSearchRecord(benchmark.createSearchRecord("d"), "e2e4", "timeout").status, "timeout");
	assert.equal(benchmark.finishSearchRecord(benchmark.createSearchRecord("e"), "e2e4", "stopped").status, "stopped");
});

// ---- summary and report ------------------------------------------------------------------------

test("median handles odd, even and empty lists", () => {
	assert.equal(benchmark.median([3, 1, 2]), 2);
	assert.equal(benchmark.median([4, 1, 3, 2]), 2.5);
	assert.equal(benchmark.median([]), null);
	assert.equal(benchmark.median([null, 5]), 5);
});

test("summarize weights NPS by time, skips warm-up and counts failures by status", () => {
	let records = [
		record("warm-up", "ok", {warmup: true, nodes: 1, timeMs: 1, nps: 1, depth: 1}),
		record("a", "ok", {nodes: 300000, timeMs: 1500, nps: 200000, depth: 12, depthLog: [{depth: 9, timeMs: 490}, {depth: 12, timeMs: 1500}]}),
		record("b", "ok", {nodes: 190000, timeMs: 1266, nps: 150079, depth: 10, depthLog: [{depth: 8, timeMs: 333}, {depth: 10, timeMs: 1266}]}),
		record("c", "timeout", {nodes: 500, timeMs: 10, nps: 50000, depth: 3, depthLog: [{depth: 3, timeMs: 10}]}),
	];
	let s = benchmark.summarize(records);

	assert.equal(s.positions, 3);
	assert.equal(s.ok, 2);
	assert.deepEqual(s.failures, {timeout: 1});
	assert.equal(s.totalNodes, 490000);
	assert.equal(s.totalTimeMs, 2766);
	assert.equal(s.npsWeighted, Math.round(490000 * 1000 / 2766));
	assert.equal(s.npsMedian, (200000 + 150079) / 2);
	assert.equal(s.depthAvg, 11);
	assert.equal(s.depthMin, 10);
	assert.equal(s.depthMax, 12);
	assert.deepEqual(s.timeToDepth[10], {reached: 2, medianMs: 1383});
	assert.deepEqual(s.timeToDepth[15], {reached: 0, medianMs: null});
});

test("summarize of nothing usable has no averages", () => {
	let s = benchmark.summarize([record("warm-up", "ok", {warmup: true})]);
	assert.equal(s.positions, 0);
	assert.equal(s.npsWeighted, null);
	assert.equal(s.depthAvg, null);
});

test("formatReport shows measured rows only, plus the totals", () => {
	let records = [
		record("warm-up", "ok", {warmup: true, nodes: 1, timeMs: 1, nps: 1, depth: 1, bestmove: "e2e4"}),
		record("startpos", "ok", {nodes: 1250098, timeMs: 1315, nps: 950000, depth: 24, seldepth: 36, bestmove: "e2e4", depthLog: [{depth: 10, timeMs: 120}]}),
	];
	let text = benchmark.formatReport({
		engineName: "Test Engine",
		options: "Threads=4, Hash=256",
		movetimeMs: 3000,
		clearHash: true,
		machine: "win32 x64",
		date: "2026-10-12",
	}, records, benchmark.summarize(records));

	assert.match(text, /^Nibbler engine benchmark/);
	assert.match(text, /Engine:  Test Engine/);
	assert.match(text, /3 s per position, 1 position after warm-up/);
	assert.match(text, /startpos\s+24\s+36\s+1 250 098/);
	assert.doesNotMatch(text, /^\d+\s+warm-up/m, "the warm-up is never reported");
	assert.match(text, /NPS:\s+950 645 weighted/);
	assert.match(text, /depth 10: 120 ms \(1\/1\)/);
	assert.match(text, /depth 15: not reached \(0\/1\)/);
	assert.match(text, /Failed:  0 \(none\)/);
});

// ---- run controller ----------------------------------------------------------------------------

test("a run warms up, sends MultiPV 1 and clears the hash before each position", () => {
	let s = setup();
	s.run.onReady();

	assert.deepEqual(s.engine.calls.slice(0, 3), [
		["setOption", "MultiPV", 1],
		["ucinewgame"],
		["search", "fen-a", 1000],
	], "warm-up search comes first");
	assert.equal(s.engine.searched.length, 1);
});

test("a complete run reports every measured position and shuts the engine down once", () => {
	let s = setup();
	s.run.onReady();

	let lines = {
		0: ["info depth 6 seldepth 8 multipv 1 score cp 30 nodes 2000 nps 100000 time 20 pv e2e4"],
		1: ["info depth 10 seldepth 12 multipv 1 score cp 20 nodes 300000 nps 200000 time 1500 pv e2e4 e7e5"],
		2: ["info depth 8 seldepth 9 multipv 1 score cp -35 nodes 40000 nps 120000 time 333 pv e7e5"],
	};
	let moves = ["e2e4", "e2e4", "e7e5"];
	for (let i = 0; i < 3; i++) {
		let node = s.engine.searched[i];
		for (let line of lines[i]) s.run.onInfo(parsed(line, node));
		s.run.onBestmove({node, move: moves[i]});
	}

	let snap = s.run.snapshot();
	assert.equal(snap.phase, "finished");
	assert.equal(snap.error, null);
	assert.equal(snap.completed, 3, "warm-up plus two positions");
	assert.equal(snap.summary.positions, 2, "the warm-up is not in the summary");
	assert.equal(snap.summary.ok, 2);
	assert.equal(snap.summary.totalNodes, 340000);
	assert.equal(s.engine.calls.filter(c => c[0] === "shutdown").length, 1);
	assert.equal(s.engine.searched.every(node => node.destroyed), true, "root nodes are destroyed");
});

test("info and bestmove from another node are ignored", () => {
	let s = setup();
	s.run.onReady();
	let foreign = {fen: "elsewhere"};
	s.run.onInfo(parsed("info depth 20 multipv 1 nodes 1 time 1 pv e2e4", foreign));
	s.run.onBestmove({node: foreign, move: "d2d4"});

	assert.equal(s.engine.searched.length, 1, "no new search started");
	assert.equal(s.run.snapshot().phase, "running");
	assert.equal(s.run.snapshot().records.length, 0);
});

test("a search that overruns is stopped and recorded as timeout, and the run goes on", () => {
	let s = setup();
	s.run.onReady();
	let node = s.engine.searched[0];
	s.run.onInfo(parsed("info depth 7 multipv 1 nodes 800 time 900 pv e2e4", node));

	s.timers.fireNext();										// movetime + grace expires
	assert.ok(s.engine.calls.some(c => c[0] === "stop"));
	assert.equal(s.run.snapshot().phase, "running");

	s.run.onBestmove({node, move: "e2e4"});
	assert.equal(s.engine.searched.length, 2, "the next position starts");
	assert.equal(s.run.snapshot().records[0].status, "timeout");
});

test("an engine that never answers stop fails the run", () => {
	let s = setup();
	s.run.onReady();
	s.run.stop();
	s.timers.fireNext();										// the stop grace period runs out

	let snap = s.run.snapshot();
	assert.equal(snap.phase, "finished");
	assert.equal(snap.error, "Engine did not answer stop");
	assert.equal(s.engine.calls.filter(c => c[0] === "shutdown").length, 1);
});

test("stopping mid-search records the position as stopped and starts nothing new", () => {
	let s = setup();
	s.run.onReady();
	let node = s.engine.searched[0];
	s.run.stop();
	assert.ok(s.engine.calls.some(c => c[0] === "stop"));

	s.run.onBestmove({node, move: "e2e4"});
	let snap = s.run.snapshot();
	assert.equal(snap.phase, "finished");
	assert.equal(snap.error, null);
	assert.equal(s.engine.searched.length, 1, "no further search");
	assert.equal(snap.records[0].status, "stopped");
});

test("stopping before the engine is ready finishes at once", () => {
	let s = setup();
	s.run.stop();
	assert.equal(s.run.snapshot().phase, "finished");
	assert.equal(s.engine.searched.length, 0);
});

test("an engine failure ends the run with the message and shuts the engine down", () => {
	let s = setup();
	s.run.onReady();
	s.run.fail("Engine exited");

	let snap = s.run.snapshot();
	assert.equal(snap.phase, "finished");
	assert.equal(snap.error, "Engine exited");
	assert.equal(s.engine.calls.filter(c => c[0] === "shutdown").length, 1);

	s.run.fail("second error");
	assert.equal(s.run.snapshot().error, "Engine exited", "only the first failure is kept");
});

test("a position that cannot be set up ends the run with an error", () => {
	let s = setup({makeRoot: () => { throw "Invalid FEN - token count"; }});
	s.run.onReady();
	let snap = s.run.snapshot();
	assert.equal(snap.phase, "finished");
	assert.equal(snap.error, "Invalid FEN - token count");
});

test("a position with a bestmove but no info is recorded as no-info", () => {
	let s = setup({positions: [{id: "a", fen: "fen-a"}], warmup: false});
	s.run.onReady();
	s.run.onBestmove({node: s.engine.searched[0], move: "e2e4"});

	let snap = s.run.snapshot();
	assert.equal(snap.phase, "finished");
	assert.equal(snap.records[0].status, "no-info");
	assert.equal(snap.summary.ok, 0);
});

test("updates are pushed as the run moves on", () => {
	let s = setup();
	s.run.onReady();
	assert.ok(s.updates.length > 0);
	assert.equal(s.updates[s.updates.length - 1].currentId, "warm-up");
});
