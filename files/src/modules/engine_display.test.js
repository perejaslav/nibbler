"use strict";

const assert = require("assert");
const engine_display = require("./engine_display");

function test_extracts_uci_engine_name() {
	assert.strictEqual(engine_display.name_from_id_line("id name Lc0 v0.31.2"), "Lc0 v0.31.2");
}

function test_ignores_other_uci_lines() {
	assert.strictEqual(engine_display.name_from_id_line("id author The Author"), "");
	assert.strictEqual(engine_display.name_from_id_line("id named Wrong"), "");
	assert.strictEqual(engine_display.name_from_id_line("uciok"), "");
}

test_extracts_uci_engine_name();
test_ignores_other_uci_lines();
