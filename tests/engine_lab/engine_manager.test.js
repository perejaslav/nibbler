"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadManager() {
	let created = [];
	let source = fs.readFileSync(path.join(__dirname, "../../files/src/renderer/91_engine_manager.js"), "utf8");
	let context = {
		console,
		Object,
		Array,
		Map,
		Promise,
		setTimeout,
		clearTimeout,
		engineconfig: {
			first: {args: ["--first"], options: {}},
			second: {args: ["--second"], options: {}},
		},
		NewEngine: (hub, options) => {
			let engine = {
				role: options.role,
				event_sink: options.event_sink,
				ack_to_main: options.ack_to_main,
				exe: null,
				setupCalls: [],
				sent: [],
				stopped: [],
				shutdownCalls: 0,
				ever_received_uciok: false,
				ever_received_readyok: false,
				setup(filepath, args) {
					this.exe = {filepath};
					this.setupCalls.push({filepath, args});
					return true;
				},
				send(line) {
					this.sent.push(line);
				},
				set_search_desired(value) {
					this.stopped.push(value);
				},
				send_ucinewgame() {
					this.sent.push("ucinewgame");
				},
				shutdown() {
					this.shutdownCalls++;
					this.exe = null;
				},
			};
			created.push(engine);
			return engine;
		},
	};
	vm.createContext(context);
	vm.runInContext(`${source}\nthis.__NewEngineManager = NewEngineManager;`, context);
	return {
		NewEngineManager: context.__NewEngineManager,
		created,
		makeEngine: () => context.NewEngine({}, {role: "primary", ack_to_main: true}),
	};
}

function makeHub() {
	return {
		active_tab() {
			return {id: 1};
		},
		find_tab_for_node() {
			return null;
		},
		with_tab(tab, callback) {
			return callback(tab);
		},
	};
}

test("EngineManager creates a primary and one secondary session", () => {
	let harness = loadManager();
	let manager = harness.NewEngineManager(makeHub());
	let primaryEngine = harness.makeEngine();

	manager.attach_primary(primaryEngine, "first");
	let secondaryId = manager.create_session("second", "secondary");

	assert.equal(manager.list_sessions().length, 2);
	assert.equal(manager.primary(), primaryEngine);
	assert.equal(manager.secondary().role, "secondary");
	assert.equal(secondaryId, manager.secondary_session_id());
	assert.equal(manager.secondary().ack_to_main, false);
	assert.throws(() => manager.create_session("second", "secondary"), /maximum of two/);
});

test("EngineManager starts both sessions and handles secondary readiness locally", () => {
	let harness = loadManager();
	let manager = harness.NewEngineManager(makeHub());
	manager.attach_primary(harness.makeEngine(), "first");
	let secondaryId = manager.create_session("second", "secondary");
	let primaryId = manager.primary_session_id();

	assert.equal(manager.start_session(primaryId), true);
	assert.equal(manager.start_session(secondaryId), true);

	let secondary = manager.secondary();
	assert.deepEqual(secondary.setupCalls, [{filepath: "second", args: ["--second"]}]);
	assert.deepEqual(secondary.sent, ["uci"]);

	secondary.event_sink.receive_misc("uciok");
	secondary.event_sink.receive_misc("readyok");
	assert.equal(manager.get_session(secondaryId).lifecycleState, "ready");
	assert.deepEqual(secondary.sent, ["uci", "isready", "ucinewgame"]);
});

test("stopping one session does not shut down the other", () => {
	let harness = loadManager();
	let manager = harness.NewEngineManager(makeHub());
	manager.attach_primary(harness.makeEngine(), "first");
	let secondaryId = manager.create_session("second", "secondary");
	manager.start_session(secondaryId);

	manager.stop_session(secondaryId);

	assert.deepEqual(harness.created[1].stopped, [null]);
	assert.equal(harness.created[1].shutdownCalls, 0);
	assert.equal(harness.created[0].shutdownCalls, 0);
});

test("stop_all shuts down every session and clears the manager", async () => {
	let harness = loadManager();
	let manager = harness.NewEngineManager(makeHub());
	manager.attach_primary(harness.makeEngine(), "first");
	manager.create_session("second", "secondary");

	await manager.stop_all();

	assert.equal(harness.created[0].shutdownCalls, 1);
	assert.equal(harness.created[1].shutdownCalls, 1);
	assert.deepEqual(manager.list_sessions(), []);
	assert.equal(manager.primary(), null);
	assert.equal(manager.secondary(), null);
});

test("EngineManager stores normalized secondary session events", () => {
	let harness = loadManager();
	let manager = harness.NewEngineManager(makeHub());
	manager.attach_primary(harness.makeEngine(), "first");
	let secondaryId = manager.create_session("second", "secondary");
	let secondary = manager.secondary();

	secondary.event_sink.onReady(secondary, {processGeneration: 2, name: "Second"});
	secondary.event_sink.onStateChanged(secondary, {processGeneration: 2, searchState: "searching", searchId: 4});
	secondary.event_sink.onInfo(secondary, {processGeneration: 2, searchId: 4, depth: 10, pv: ["e2e4"]});
	secondary.event_sink.onBestmove(secondary, {processGeneration: 2, searchId: 4, move: "e2e4"});

	let session = manager.get_session(secondaryId);
	assert.equal(session.lifecycleState, "ready");
	assert.equal(session.processGeneration, 2);
	assert.equal(session.name, "Second");
	assert.equal(session.searchState, "searching");
	assert.equal(session.activeSearchId, 4);
	assert.equal(session.lastInfo.depth, 10);
	assert.equal(session.lastBestmove.move, "e2e4");
});
