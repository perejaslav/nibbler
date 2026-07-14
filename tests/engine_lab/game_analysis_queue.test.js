"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {createGameAnalysisQueue} = require("../../files/src/modules/engine_game_analysis");

test("game analysis queue visits positions in order and stores results", () => {
	const queue = createGameAnalysisQueue([
		{positionId: "p1", node: {id: "node-1"}},
		{positionId: "p2", node: {id: "node-2"}},
	]);

	assert.equal(queue.next().positionId, "p1");
	assert.equal(queue.complete({bestMove: "e2e4"}).positionId, "p1");
	assert.equal(queue.next().positionId, "p2");
	assert.equal(queue.complete({bestMove: "d2d4"}).positionId, "p2");
	assert.equal(queue.next(), null);
	assert.equal(queue.done(), true);
	assert.deepEqual(queue.results(), [
		{positionId: "p1", result: {bestMove: "e2e4"}},
		{positionId: "p2", result: {bestMove: "d2d4"}},
	]);
});

test("game analysis queue records a failed position and continues", () => {
	const queue = createGameAnalysisQueue([{positionId: "p1"}, {positionId: "p2"}]);

	queue.next();
	assert.equal(queue.fail("engine error").positionId, "p1");
	assert.equal(queue.next().positionId, "p2");
	assert.equal(queue.pending(), 0);
	assert.equal(queue.done(), false);
});
