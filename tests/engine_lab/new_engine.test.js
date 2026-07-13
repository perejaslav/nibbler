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
