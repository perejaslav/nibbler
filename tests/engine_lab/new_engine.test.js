"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadNewEngine() {
	let processes = [];
	let scanners = [];
	let ipcMessages = [];

	class FakeProcess {
		constructor(filepath) {
			this.filepath = filepath;
			this.stdin = {write: () => {}};
			this.stdout = {};
			this.stderr = {};
			this.listeners = Object.create(null);
		}

		on(event, callback) {
			(this.listeners[event] ||= []).push(callback);
			return this;
		}

		once(event, callback) {
			return this.on(event, (...args) => {
				this.listeners[event] = [];
				callback(...args);
			});
		}

		kill() {}
	}

	class FakeScanner {
		constructor() {
			this.listeners = Object.create(null);
		}

		on(event, callback) {
			(this.listeners[event] ||= []).push(callback);
			return this;
		}

		emit(event, value) {
			for (let callback of this.listeners[event] || []) callback(value);
		}
	}

	let context = {
		console,
		Object,
		Array,
		Map,
		Number,
		String,
		Math,
		JSON,
		performance: {now: () => 0},
		alert: () => {},
		Log: () => {},
		SafeStringHTML: value => value,
		path: {
			basename: value => path.basename(value),
			dirname: value => path.dirname(value),
		},
		child_process: {
			spawn: filepath => {
				let process = new FakeProcess(filepath);
				processes.push(process);
				return process;
			},
		},
		readline: {
			createInterface: () => {
				let scanner = new FakeScanner();
				scanners.push(scanner);
				return scanner;
			},
		},
		ipcRenderer: {
			send: (...args) => ipcMessages.push(args),
		},
		config: {
			searchmoves_buttons: false,
			log_positions: false,
			log_info_lines: false,
		},
	};
	vm.createContext(context);
	let source = fs.readFileSync(path.join(__dirname, "../../files/src/renderer/90_engine.js"), "utf8");
	vm.runInContext(`${source}\nthis.__NewEngine = NewEngine;`, context);

	return {NewEngine: context.__NewEngine, processes, scanners, ipcMessages};
}

function makeRoute() {
	return {
		misc: [],
		errors: [],
		receive_misc(line) {
			this.misc.push(line);
		},
		err_receive(line) {
			this.errors.push(line);
		},
		find_tab_for_node() {
			return null;
		},
		active_tab() {
			return null;
		},
		with_tab(tab, callback) {
			return callback(tab);
		},
		info_handler: {
			engine_cycle: 0,
			engine_subcycle: 0,
			receive() {},
			err_receive() {},
		},
	};
}

function makeNode(id) {
	return {
		id,
		destroyed: false,
		terminal_reason() {
			return null;
		},
		validate_searchmoves(moves) {
			return Array.isArray(moves) ? moves.slice() : [];
		},
		get_root() {
			return this;
		},
		board: {
			fen() {
				return `fen-${id}`;
			},
		},
		history_old_format() {
			return [];
		},
		history() {
			return [];
		},
	};
}

test("two NewEngine instances keep process state and UCI events isolated", () => {
	let harness = loadNewEngine();
	let firstRoute = makeRoute();
	let secondRoute = makeRoute();
	let first = harness.NewEngine({}, {event_sink: firstRoute, ack_to_main: false});
	let second = harness.NewEngine({}, {event_sink: secondRoute, ack_to_main: false});

	assert.equal(first.setup("C:\\engines\\first.exe", []), true);
	assert.equal(second.setup("C:\\engines\\second.exe", []), true);
	assert.equal(harness.processes.length, 2);
	assert.notEqual(first.exe, second.exe);

	harness.scanners[0].emit("line", "id name First Engine");
	harness.scanners[0].emit("line", "option name Threads type spin default 1 min 1 max 8");
	harness.scanners[2].emit("line", "id name Second Engine");
	harness.scanners[2].emit("line", "option name Hash type spin default 16 min 1 max 1024");

	assert.deepEqual(firstRoute.misc, [
		"id name First Engine",
		"option name Threads type spin default 1 min 1 max 8",
	]);
	assert.deepEqual(secondRoute.misc, [
		"id name Second Engine",
		"option name Hash type spin default 16 min 1 max 1024",
	]);
	assert.equal(first.known("Threads"), true);
	assert.equal(first.known("Hash"), false);
	assert.equal(second.known("Hash"), true);
	assert.equal(second.known("Threads"), false);
	assert.deepEqual(harness.ipcMessages, []);
});

test("NewEngine assigns search ids and waits for bestmove before replacing a search", () => {
	let harness = loadNewEngine();
	let route = makeRoute();
	let engine = harness.NewEngine({}, {event_sink: route, ack_to_main: false});
	engine.setup("C:\\engines\\first.exe", []);
	let stdout = harness.scanners[0];
	stdout.emit("line", "uciok");
	stdout.emit("line", "readyok");

	let firstNode = makeNode("first");
	let secondNode = makeNode("second");
	engine.set_search_desired(firstNode, 100, false, []);

	assert.equal(engine.search_running.searchId, 1);
	assert.equal(engine.search_state, "searching");
	assert.equal(engine.process_generation, 1);

	engine.set_search_desired(secondNode, 200, false, []);

	assert.equal(engine.search_running.searchId, 1);
	assert.equal(engine.search_desired.searchId, 2);
	assert.equal(engine.search_state, "stopping");

	stdout.emit("line", "bestmove e2e4");

	assert.equal(engine.search_running.searchId, 2);
	assert.equal(engine.search_state, "searching");
});

test("NewEngine ignores output from an older process generation", () => {
	let harness = loadNewEngine();
	let route = makeRoute();
	let engine = harness.NewEngine({}, {event_sink: route, ack_to_main: false});
	engine.setup("C:\\engines\\first.exe", []);
	let oldStdout = harness.scanners[0];
	engine.setup("C:\\engines\\second.exe", []);
	let currentStdout = harness.scanners[2];

	oldStdout.emit("line", "id name Old Process");
	currentStdout.emit("line", "id name Current Process");

	assert.equal(engine.process_generation, 2);
	assert.deepEqual(route.misc, ["id name Current Process"]);
});
