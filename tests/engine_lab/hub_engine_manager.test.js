"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "files/src/nibbler.html"), "utf8");
const hub = fs.readFileSync(path.join(root, "files/src/renderer/95_hub.js"), "utf8");

test("renderer loads EngineManager before Hub and keeps the primary session registered", () => {
	assert.ok(html.indexOf('src="renderer/90_engine.js"') < html.indexOf('src="renderer/91_engine_manager.js"'));
	assert.ok(html.indexOf('src="renderer/91_engine_manager.js"') < html.indexOf('src="renderer/92_tab.js"'));
	assert.match(hub, /hub\.engine_manager\s*=\s*NewEngineManager\(hub\)/);
	assert.match(hub, /this\.engine_manager\.attach_primary\(new_engine/);
	assert.match(hub, /this\.engine_manager\.stop_all\(\)/);
});
