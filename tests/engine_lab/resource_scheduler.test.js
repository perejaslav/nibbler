"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {createEngineResourceScheduler} = require("../../files/src/modules/engine_resource_scheduler");

const sessions = [
	{sessionId: "stockfish", requestedThreads: 8},
	{sessionId: "lc0", requestedThreads: 4},
];

test("balanced mode divides the total thread budget", () => {
	const scheduler = createEngineResourceScheduler({totalThreads: 8});
	assert.deepEqual(scheduler.allocate(sessions, "balanced"), {
		stockfish: 4,
		lc0: 4,
	});
});

test("sequential mode gives the budget to one session", () => {
	const scheduler = createEngineResourceScheduler({totalThreads: 8});
	assert.deepEqual(scheduler.allocate(sessions, "sequential"), {
		stockfish: 8,
		lc0: 0,
	});
});

test("custom mode respects per-session limits without changing input", () => {
	const scheduler = createEngineResourceScheduler({totalThreads: 8});
	const custom = {stockfish: 6, lc0: 2};
	assert.deepEqual(scheduler.allocate(sessions, "custom", custom), custom);
	assert.deepEqual(sessions, [
		{sessionId: "stockfish", requestedThreads: 8},
		{sessionId: "lc0", requestedThreads: 4},
	]);
});
