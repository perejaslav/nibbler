"use strict";

const engine_benchmark = require("./modules/engine_benchmark");

// Engine -> Benchmark... The engine logic lives in modules/engine_benchmark.js. This view only
// wires a private NewEngine() instance (role "benchmark", no acks to main) into the run controller,
// and draws the dialog. Nothing here touches the primary engine.

function NewEngineBenchmarkView(hub) {
	let view = Object.create(null);

	let ctx = null;			// Current or most recent run: {profileKey, engine, run, engineName, options, movetimeMs, clearHash, startedAt, stderr}
	let message = "";
	let last_html = null;

	function safe(value) {
		return SafeStringHTML(value === null || value === undefined ? "" : String(value));
	}

	function busy_reason() {
		if (hub.behaviour !== "halt") return "Halt the analysis first, then run the benchmark.";
		if (hub.engine.search_state !== "idle") return "The engine is still searching. Wait for it to halt.";
		if (hub.engine_manager.secondary_session) return "Stop the engine comparison before running a benchmark.";
		let game_analysis_running = Object.values(hub.engine_manager.game_analysis_queues).some(job => !job.queue.done());
		if (game_analysis_running) return "Game analysis is running. Stop it before running a benchmark.";
		return null;
	}

	function read_form() {
		let profile_key = document.getElementById("benchmark_profile").value;
		let seconds = Number(document.getElementById("benchmark_seconds").value);
		let count = parseInt(document.getElementById("benchmark_count").value, 10);
		let clear_hash = document.getElementById("benchmark_clear_hash").checked;
		if (!profile_key) return {error: "Choose an engine profile."};
		if (!Number.isFinite(seconds) || seconds < 1 || seconds > 600) return {error: "Seconds per position must be from 1 to 600."};
		if (!Number.isInteger(count) || count < 1 || count > engine_benchmark.BENCHMARK_POSITIONS.length) {
			return {error: `Positions must be from 1 to ${engine_benchmark.BENCHMARK_POSITIONS.length}.`};
		}
		return {profile_key, movetimeMs: Math.round(seconds * 1000), count, clearHash: clear_hash};
	}

	function saved_options_text(profile_key) {
		let saved = engineconfig[profile_key] && engineconfig[profile_key].options;
		if (!saved || typeof saved !== "object") return "";
		return Object.keys(saved).map(key => `${key}=${saved[key]}`).join(", ");
	}

	// NewEngine passes stderr lines through SafeStringHTML(), so undo that before the text is shown again.
	function remember_stderr(run_ctx, line) {
		let text = String(line).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
		run_ctx.stderr.push(text);
		if (run_ctx.stderr.length > 5) run_ctx.stderr.shift();
	}

	// Mirrors the handshake of the comparison's second engine (see 91_engine_manager.js receive_misc).
	function handle_misc(run_ctx, line) {
		if (typeof line !== "string") return;
		if (line.startsWith("id name ")) {
			run_ctx.engineName = line.slice("id name ".length).trim();
			run_ctx.engine.name = run_ctx.engineName;
			let names = typeof config !== "undefined" && Array.isArray(config.leelaish_names) ? config.leelaish_names : [];
			run_ctx.engine.leelaish = names.some(name => line.includes(name));
			return;
		}
		if (line.startsWith("uciok")) {
			hub.engine_send_all_options(run_ctx.engine);
			run_ctx.engine.send("isready");
		}
	}

	function make_sink(run_ctx) {
		return {
			onReady() {
				if (run_ctx.run) run_ctx.run.onReady();
			},
			onInfo(engine, event) {
				if (run_ctx.run) run_ctx.run.onInfo(event);
			},
			onBestmove(engine, event) {
				if (run_ctx.run) run_ctx.run.onBestmove(event);
			},
			onError(engine, event) {
				// Only process failures end the run. Stderr lines and "info string ERROR" are logged, not fatal.
				if (event && event.kind === "process" && run_ctx.run) run_ctx.run.fail(event.message);
			},
			onExit(engine, event) {
				if (!event.expected && run_ctx.run) run_ctx.run.fail("Engine exited");
			},
			onStateChanged() {},
			on_error(engine, error) {
				if (run_ctx.run) run_ctx.run.fail(error ? error.toString() : "Engine error");
			},
			err_receive(line) {
				remember_stderr(run_ctx, line);
			},
			receive_misc(line) {
				handle_misc(run_ctx, line);
			},
			receive_bestmove() {},
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
				err_receive(line) {
					remember_stderr(run_ctx, line);
				},
			},
		};
	}

	// The adapter is the only way the run controller touches the engine.
	function adapter_for(engine) {
		return {
			setOption(name, value) {
				engine.setoption(name, value);
			},
			sendUcinewgame() {
				engine.send_ucinewgame();
			},
			search(node, movetimeMs) {
				engine.set_search_desired(node, movetimeMs, true, []);
			},
			stop() {
				engine.set_search_desired(null);
			},
			shutdown() {
				engine.shutdown();
			},
		};
	}

	function start_run() {
		if (ctx && ctx.run && ctx.run.snapshot().phase !== "finished") {
			message = "A benchmark is already running.";
			return draw();
		}
		let reason = busy_reason();
		if (reason) {
			message = reason;
			return draw();
		}
		let form = read_form();
		if (form.error) {
			message = form.error;
			return draw();
		}
		if (!fs.existsSync(form.profile_key)) {
			message = "The engine file for this profile is missing.";
			return draw();
		}

		let run_ctx = {
			profileKey: form.profile_key,
			engine: null,
			run: null,
			engineName: "",
			options: saved_options_text(form.profile_key),
			movetimeMs: form.movetimeMs,
			clearHash: form.clearHash,
			startedAt: new Date(),
			stderr: [],
		};
		ctx = run_ctx;

		let engine = NewEngine(hub, {event_sink: make_sink(run_ctx), role: "benchmark", ack_to_main: false});
		run_ctx.engine = engine;

		let saved = engineconfig[form.profile_key];
		let args = saved && Array.isArray(saved.args) ? saved.args : [];
		if (!engine.setup(form.profile_key, args)) {
			message = "The engine could not be started.";
			return draw();
		}

		run_ctx.run = engine_benchmark.createBenchmarkRun({
			engine: adapter_for(engine),
			positions: engine_benchmark.BENCHMARK_POSITIONS.slice(0, form.count),
			movetimeMs: form.movetimeMs,
			clearHash: form.clearHash,
			warmup: true,
			makeRoot: fen => NewNode(null, null, LoadFEN(fen)),
			destroyRoot: node => DestroyTree(node),
			setTimer: (fn, ms) => setTimeout(fn, ms),
			clearTimer: id => clearTimeout(id),
			onUpdate: () => draw(),
		});

		message = "";
		engine.send("uci");
		draw();
	}

	function stop_run() {
		if (ctx && ctx.run) ctx.run.stop();
		draw();
	}

	function build_report() {
		let snap = ctx.run.snapshot();
		return engine_benchmark.formatReport({
			engineName: ctx.engineName || ctx.profileKey,
			options: ctx.options,
			movetimeMs: ctx.movetimeMs,
			clearHash: ctx.clearHash,
			machine: `${process.platform} ${process.arch}`,
			date: ctx.startedAt.toISOString(),
		}, snap.records, snap.summary);
	}

	function copy_report() {
		if (!ctx || !ctx.run || ctx.run.snapshot().records.length === 0) {
			message = "Nothing to copy yet.";
			return draw();
		}
		clipboard.writeText(build_report());
		message = "Report copied to the clipboard.";
		draw();
	}

	function close_dialog() {
		stop_run();
		hub.hide_fullbox();
	}

	function results_html() {
		let parts = [];
		if (message) parts.push(`<div class="yellow">${safe(message)}</div>`);
		if (!ctx || !ctx.run) return parts.join("");

		let snap = ctx.run.snapshot();
		let progress;
		if (snap.phase === "finished") {
			if (snap.error) {
				let last = ctx.stderr[ctx.stderr.length - 1];
				let detail = last ? ` Last engine output: ${safe(last)}` : "";
				progress = `<span class="red">Stopped with an error: ${safe(snap.error)}.${detail}</span>`;
			} else if (snap.records.some(r => r.status === "stopped")) {
				progress = `<span class="yellow">Stopped after ${snap.completed} of ${snap.total} searches.</span>`;
			} else {
				progress = `<span class="green">Finished: ${snap.completed} of ${snap.total} searches.</span>`;
			}
		} else {
			let current = snap.currentId ? ` (${safe(snap.currentId)})` : "";
			progress = `Running ${snap.completed + 1} of ${snap.total}${current}. Do not start analysis during a run.`;
		}
		parts.push(`<div class="infoline">${progress}</div>`);

		if (snap.records.length > 0) {
			parts.push(`<pre class="benchmark_report">${safe(build_report())}</pre>`);
		}
		return parts.join("");
	}

	function draw() {
		let box = document.getElementById("benchmark_results");
		if (!box) return;
		let html = results_html();
		if (html !== last_html) {
			box.innerHTML = html;
			last_html = html;
		}
	}

	view.open = function() {
		let current = hub.engine && hub.engine.filepath;
		let profiles = Object.keys(engineconfig || {}).filter(key => key);
		let options = profiles.map(key => {
			let selected = key === current ? " selected" : "";
			return `<option value="${safe(key)}"${selected}>${safe(path.basename(key))}</option>`;
		}).join("");
		let count = engine_benchmark.BENCHMARK_POSITIONS.length;

		fullbox_content.innerHTML = `<div class="uci_options_dialog benchmark_dialog">
			<div class="infoline">Engine benchmark</div>
			<div class="uci_option_help">Each position is searched for a fixed time (go movetime). Close stops a running benchmark.</div>
			<div class="uci_option_row"><label class="uci_option_label">Engine</label>
				<div class="uci_option_control"><select id="benchmark_profile">${options}</select></div></div>
			<div class="uci_option_row"><label class="uci_option_label">Seconds per position</label>
				<div class="uci_option_control"><input id="benchmark_seconds" type="number" min="1" max="600" value="3"></div></div>
			<div class="uci_option_row"><label class="uci_option_label">Positions</label>
				<div class="uci_option_control"><input id="benchmark_count" type="number" min="1" max="${count}" value="${count}">
				<span class="uci_option_hint">max ${count}, plus one warm-up that is not reported</span></div></div>
			<div class="uci_option_row"><label class="uci_option_label">Clear hash between positions</label>
				<div class="uci_option_control"><input id="benchmark_clear_hash" type="checkbox" checked></div></div>
			<div class="uci_option_actions">
				<button data-benchmark-action="run">Run</button>
				<button data-benchmark-action="stop">Stop</button>
				<button data-benchmark-action="copy">Copy report</button>
				<button data-benchmark-action="close">Close</button>
			</div>
			<div id="benchmark_results"></div>
		</div>`;
		last_html = null;
		hub.show_fullbox();
		draw();
	};

	view.click = function(event) {
		let target = event.target && event.target.closest ? event.target.closest("[data-benchmark-action]") : null;
		if (!target) return false;
		if (event.button === 2) return true;			// Right-click does nothing, as in the other dialogs.
		switch (target.dataset.benchmarkAction) {
		case "run":
			start_run();
			break;
		case "stop":
			stop_run();
			break;
		case "copy":
			copy_report();
			break;
		case "close":
			close_dialog();
			break;
		}
		return true;
	};

	// Called on quit, so no benchmark engine is left running after the app closes.
	view.shutdown = function() {
		if (ctx && ctx.run) ctx.run.fail("The app is closing");
	};

	return view;
}
