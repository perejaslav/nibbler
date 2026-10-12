"use strict";

// Engine benchmark core: fixed positions, per-search records, summaries, report text, and the run
// controller. Nothing here touches the GUI or spawns a process. The controller gets an engine
// adapter and timers from its caller, so tests can drive it with a fake engine.

const engine_game_analysis = require("./engine_game_analysis");

const DEFAULT_MOVETIME_MS = 3000;
const GRACE_MS = 3000;							// Extra time after movetime before a search is stopped.
const TIME_TO_DEPTH_TARGETS = [5, 10, 15, 20];

const BENCHMARK_POSITIONS = [
	// Stockfish's default bench positions (src/benchmark.cpp, Defaults): the first 20 plain FENs,
	// without move lists or Chess960 entries. Same order as in Stockfish.
	{id: "sf-01", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"},
	{id: "sf-02", fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 10"},
	{id: "sf-03", fen: "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 11"},
	{id: "sf-04", fen: "4rrk1/pp1n3p/3q2pQ/2p1pb2/2PP4/2P3N1/P2B2PP/4RRK1 b - - 7 19"},
	{id: "sf-05", fen: "r3r1k1/2p2ppp/p1p1bn2/8/1q2P3/2NPQN2/PPP3PP/R4RK1 b - - 2 15"},
	{id: "sf-06", fen: "r1bbk1nr/pp3p1p/2n5/1N4p1/2Np1B2/8/PPP2PPP/2KR1B1R w kq - 0 13"},
	{id: "sf-07", fen: "r1bq1rk1/ppp1nppp/4n3/3p3Q/3P4/1BP1B3/PP1N2PP/R4RK1 w - - 1 16"},
	{id: "sf-08", fen: "4r1k1/r1q2ppp/ppp2n2/4P3/5Rb1/1N1BQ3/PPP3PP/R5K1 w - - 1 17"},
	{id: "sf-09", fen: "2rqkb1r/ppp2p2/2npb1p1/1N1Nn2p/2P1PP2/8/PP2B1PP/R1BQK2R b KQ - 0 11"},
	{id: "sf-10", fen: "r1bq1r1k/b1p1npp1/p2p3p/1p6/3PP3/1B2NN2/PP3PPP/R2Q1RK1 w - - 1 16"},
	{id: "sf-11", fen: "3r1rk1/p5pp/bpp1pp2/8/q1PP1P2/b3P3/P2NQRPP/1R2B1K1 b - - 6 22"},
	{id: "sf-12", fen: "r1q2rk1/2p1bppp/2Pp4/p6b/Q1PNp3/4B3/PP1R1PPP/2K4R w - - 2 18"},
	{id: "sf-13", fen: "4k2r/1pb2ppp/1p2p3/1R1p4/3P4/2r1PN2/P4PPP/1R4K1 b - - 3 22"},
	{id: "sf-14", fen: "3q2k1/pb3p1p/4pbp1/2r5/PpN2N2/1P2P2P/5PP1/Q2R2K1 b - - 4 26"},
	{id: "sf-15", fen: "6k1/6p1/6Pp/ppp5/3pn2P/1P3K2/1PP2P2/3N4 b - - 0 1"},
	{id: "sf-16", fen: "3b4/5kp1/1p1p1p1p/pP1PpP1P/P1P1P3/3KN3/8/8 w - - 0 1"},
	{id: "sf-17", fen: "8/6pk/1p6/8/PP3p1p/5P2/4KP1q/3Q4 w - - 0 1"},
	{id: "sf-18", fen: "7k/3p2pp/4q3/8/4Q3/5Kp1/P6b/8 w - - 0 1"},
	{id: "sf-19", fen: "8/2p5/8/2kPKp1p/2p4P/2P5/3P4/8 w - - 0 1"},
	{id: "sf-20", fen: "8/1p3pp1/7p/5P1P/2k3P1/8/2K2P2/8 w - - 0 1"},
];

// The first entry is the warm-up when withWarmup is set. Its result is never reported.
function buildRunPlan(positions, withWarmup) {
	let plan = positions.map(p => ({id: p.id, fen: p.fen, warmup: false}));
	if (withWarmup && plan.length > 0) plan.unshift({id: "warm-up", fen: plan[0].fen, warmup: true});
	return plan;
}

function createSearchRecord(positionId, warmup = false) {
	return {
		positionId,
		warmup,
		depth: null,
		seldepth: null,
		nodes: null,
		timeMs: null,
		nps: null,
		score: null,
		bestmove: null,
		status: null,
		depthLog: [],						// First time each depth was reached: [{depth, timeMs}, ...]
	};
}

// Folds one parsed info line (engine_lab.parseInfoLine output) into a record. Only MultiPV 1 counts.
// nodes and time are cumulative, so the newest line wins.
function foldInfo(record, info) {
	if (!info || info.multipv !== 1 || info.depth === null || info.nodes === null || info.timeMs === null) {
		return record;
	}
	record.depth = Math.max(record.depth || 0, info.depth);
	record.seldepth = info.seldepth;
	record.nodes = info.nodes;
	record.timeMs = info.timeMs;
	record.nps = info.nps !== null ? info.nps : (info.timeMs > 0 ? Math.round(info.nodes * 1000 / info.timeMs) : null);
	record.score = info.score;
	let last = record.depthLog[record.depthLog.length - 1];
	if (!last || info.depth > last.depth) record.depthLog.push({depth: info.depth, timeMs: info.timeMs});
	return record;
}

// stopReason is "timeout" or "stopped" when we stopped the search ourselves, otherwise null.
function finishSearchRecord(record, bestmove, stopReason) {
	record.bestmove = bestmove || null;
	if (stopReason === "timeout" || stopReason === "stopped") {
		record.status = stopReason;
	} else if (record.bestmove === null) {
		record.status = "no-bestmove";
	} else if (record.depth === null) {
		record.status = "no-info";
	} else {
		record.status = "ok";
	}
	return record;
}

function median(values) {
	let sorted = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
	if (sorted.length === 0) return null;
	let mid = sorted.length >> 1;
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function timeToDepth(record, depth) {
	let hit = record.depthLog.find(entry => entry.depth >= depth);
	return hit ? hit.timeMs : null;
}

function summarize(records) {
	let measured = records.filter(r => !r.warmup);
	let ok = measured.filter(r => r.status === "ok");
	let totalNodes = ok.reduce((sum, r) => sum + r.nodes, 0);
	let totalTimeMs = ok.reduce((sum, r) => sum + r.timeMs, 0);
	let depths = ok.map(r => r.depth);

	let failures = {};
	for (let r of measured) {
		if (r.status !== "ok") failures[r.status] = (failures[r.status] || 0) + 1;
	}

	let timeToDepthSummary = {};
	for (let d of TIME_TO_DEPTH_TARGETS) {
		let times = ok.map(r => timeToDepth(r, d)).filter(t => t !== null);
		timeToDepthSummary[d] = {reached: times.length, medianMs: median(times)};
	}

	return {
		positions: measured.length,
		ok: ok.length,
		failures,
		totalNodes,
		totalTimeMs,
		npsWeighted: totalTimeMs > 0 ? Math.round(totalNodes * 1000 / totalTimeMs) : null,
		npsMedian: median(ok.map(r => r.nps)),
		depthAvg: depths.length ? depths.reduce((a, b) => a + b, 0) / depths.length : null,
		depthMin: depths.length ? Math.min(...depths) : null,
		depthMax: depths.length ? Math.max(...depths) : null,
		timeToDepth: timeToDepthSummary,
	};
}

function groupDigits(value) {
	if (value === null || value === undefined) return "-";
	return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function cell(value, width) {
	let s = value === null || value === undefined ? "-" : String(value);
	return s.length >= width ? s + " " : s.padEnd(width);
}

// meta: {engineName, options, movetimeMs, clearHash, machine, date}
function formatReport(meta, records, summary) {
	let measured = records.filter(r => !r.warmup);
	let lines = [
		"Nibbler engine benchmark",
		`Engine:  ${meta.engineName}`,
		`Options: ${meta.options || "(defaults)"}`,
		`Setup:   ${meta.movetimeMs / 1000} s per position, ${measured.length} position${measured.length === 1 ? "" : "s"} after warm-up, clear hash ${meta.clearHash ? "yes" : "no"}, MultiPV 1`,
		`Machine: ${meta.machine}, ${meta.date}`,
		"",
		cell("#", 4) + cell("position", 17) + cell("depth", 7) + cell("seldepth", 10) + cell("nodes", 14) +
			cell("time ms", 10) + cell("nps", 11) + cell("best", 8) + "status",
	];
	measured.forEach((r, i) => {
		lines.push(
			cell(i + 1, 4) + cell(r.positionId, 17) + cell(r.depth, 7) + cell(r.seldepth, 10) +
			cell(groupDigits(r.nodes), 14) + cell(groupDigits(r.timeMs), 10) + cell(groupDigits(r.nps), 11) +
			cell(r.bestmove, 8) + r.status
		);
	});

	let seconds = (summary.totalTimeMs / 1000).toFixed(1);
	let failureText = Object.keys(summary.failures).map(k => `${k} ${summary.failures[k]}`).join(", ") || "none";
	lines.push("");
	lines.push(`Time:    ${seconds} s, ${groupDigits(summary.totalNodes)} nodes`);
	lines.push(`NPS:     ${groupDigits(summary.npsWeighted)} weighted (sum of nodes / sum of time), ${groupDigits(summary.npsMedian)} median`);
	lines.push(`Depth:   avg ${summary.depthAvg === null ? "-" : summary.depthAvg.toFixed(1)}, min ${summary.depthMin === null ? "-" : summary.depthMin}, max ${summary.depthMax === null ? "-" : summary.depthMax}`);
	lines.push("Time to depth (median over positions that reached it):");
	for (let d of TIME_TO_DEPTH_TARGETS) {
		let t = summary.timeToDepth[d];
		lines.push(`  depth ${d}: ${t.medianMs === null ? "not reached" : groupDigits(t.medianMs) + " ms"} (${t.reached}/${summary.ok})`);
	}
	lines.push(`Failed:  ${summary.positions - summary.ok} (${failureText})`);
	return lines.join("\n");
}

// engine: {setOption(name, value), sendUcinewgame(), search(node, movetimeMs), stop(), shutdown()}
// options also carries makeRoot(fen) -> node, destroyRoot(node), setTimer(fn, ms) -> id, clearTimer(id),
// onUpdate(snapshot), movetimeMs, graceMs, clearHash, positions, warmup.
function createBenchmarkRun(options) {
	let engine = options.engine;
	let movetimeMs = options.movetimeMs || DEFAULT_MOVETIME_MS;
	let graceMs = options.graceMs === undefined ? GRACE_MS : options.graceMs;
	let plan = buildRunPlan(options.positions || BENCHMARK_POSITIONS, options.warmup !== false);
	let queue = engine_game_analysis.createGameAnalysisQueue(plan.map((_, index) => ({positionId: String(index)})));

	let run = {
		phase: "waiting",				// waiting -> running -> stopping -> finished
		error: null,
		current: null,					// {index, node, record, stopReason}
		timer: null,
	};

	function records() {
		return queue.results().map(item => item.result);
	}

	function snapshot() {
		let list = records();
		return {
			phase: run.phase,
			error: run.error,
			total: plan.length,
			completed: list.length,
			currentId: run.current ? plan[run.current.index].id : null,
			records: list,
			summary: summarize(list),
		};
	}

	function notify() {
		if (typeof options.onUpdate === "function") options.onUpdate(snapshot());
	}

	function clearWatchdog() {
		if (run.timer !== null) {
			options.clearTimer(run.timer);
			run.timer = null;
		}
	}

	function finish(error) {
		if (run.phase === "finished") return;
		clearWatchdog();
		run.phase = "finished";
		run.error = error || null;
		run.current = null;
		engine.shutdown();
		notify();
	}

	// Asks the engine to stop the current search and gives it one more grace period to answer.
	function requestStop() {
		clearWatchdog();
		engine.stop();
		run.timer = options.setTimer(() => {
			run.timer = null;
			finish("Engine did not answer stop");
		}, graceMs);
	}

	function startNext() {
		let item = queue.next();
		if (!item) return finish(null);
		let index = Number(item.positionId);
		let position = plan[index];
		try {
			if (options.clearHash) engine.sendUcinewgame();
			let node = options.makeRoot(position.fen);
			run.current = {index, node, record: createSearchRecord(position.id, position.warmup), stopReason: null};
			run.timer = options.setTimer(onMovetimeExpired, movetimeMs + graceMs);
			engine.search(node, movetimeMs);
		} catch (err) {
			finish(err ? err.toString() : "Unknown benchmark error");
			return;
		}
		notify();
	}

	function onMovetimeExpired() {
		run.timer = null;
		if (!run.current) return;
		run.current.stopReason = "timeout";
		requestStop();
	}

	function onReady() {
		if (run.phase !== "waiting") return;
		run.phase = "running";
		engine.setOption("MultiPV", 1);
		startNext();
	}

	function onInfo(event) {
		if (!run.current || !event || event.node !== run.current.node) return;
		foldInfo(run.current.record, event);
		notify();
	}

	function onBestmove(event) {
		if (!run.current || !event || event.node !== run.current.node) return;
		clearWatchdog();
		let current = run.current;
		run.current = null;
		queue.complete(finishSearchRecord(current.record, event.move, current.stopReason));
		options.destroyRoot(current.node);
		if (run.phase === "stopping") return finish(null);
		startNext();
	}

	function stop() {
		if (run.phase === "finished") return;
		if (run.phase === "waiting" || !run.current) return finish(null);
		run.phase = "stopping";
		run.current.stopReason = "stopped";
		requestStop();
		notify();
	}

	function fail(message) {
		finish(message || "Engine error");
	}

	return {
		onReady,
		onInfo,
		onBestmove,
		stop,
		fail,
		snapshot,
	};
}

module.exports = {
	DEFAULT_MOVETIME_MS,
	GRACE_MS,
	TIME_TO_DEPTH_TARGETS,
	BENCHMARK_POSITIONS,
	buildRunPlan,
	createSearchRecord,
	foldInfo,
	finishSearchRecord,
	median,
	timeToDepth,
	summarize,
	formatReport,
	createBenchmarkRun,
};
