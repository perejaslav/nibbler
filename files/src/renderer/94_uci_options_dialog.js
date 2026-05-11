"use strict";

const uci_options_dialog = (() => {

	function token_after(tokens, key) {
		let i = tokens.indexOf(key);
		return (i >= 0 && i + 1 < tokens.length) ? tokens[i + 1] : null;
	}

	function value_after(tokens, key, start) {
		let i = tokens.indexOf(key, start || 0);
		if (i < 0 || i + 1 >= tokens.length) return null;
		let end = tokens.length;
		for (let j = i + 2; j < tokens.length; j++) {
			if (["type", "default", "min", "max", "var"].includes(tokens[j])) {
				end = j;
				break;
			}
		}
		return tokens.slice(i + 1, end).join(" ");
	}

	function values_after_all(tokens, key) {
		let ret = [];
		for (let i = 0; i < tokens.length; i++) {
			if (tokens[i] === key) {
				let value = value_after(tokens, key, i);
				if (value !== null) ret.push(value);
			}
		}
		return ret;
	}

	function display_name_from_key(key) {
		if (typeof key !== "string") return "";
		let common = {
			"multipv": "MultiPV",
			"uci_chess960": "UCI_Chess960",
			"syzygypath": "SyzygyPath",
			"weightsfile": "WeightsFile",
			"evalfile": "EvalFile",
		};
		if (common[key.toLowerCase()]) return common[key.toLowerCase()];
		return key.replace(/_/g, " ").replace(/\b\w/g, s => s.toUpperCase());
	}

	function optionLabel(option) {
		return SafeStringHTML(option && option.name ? option.name : "");
	}

	function parseOptionLine(rawMetadata, fallbackKey) {
		let raw = typeof rawMetadata === "string" ? rawMetadata : "";
		let key = typeof fallbackKey === "string" ? fallbackKey : "";
		let tokens = raw.split(/\s+/).filter(s => s !== "");
		let type = token_after(tokens, "type") || "unknown";
		let known = ["check", "spin", "combo", "string", "button"].includes(type);
		let option = {
			key: key.toLowerCase(),
			name: display_name_from_key(key),
			type: known ? type : "unknown",
			defaultValue: value_after(tokens, "default"),
			currentValue: null,
			min: token_after(tokens, "min"),
			max: token_after(tokens, "max"),
			choices: values_after_all(tokens, "var"),
			rawMetadata: raw,
			editable: ["check", "spin", "combo", "string"].includes(type),
			persistent: ["check", "spin", "combo", "string"].includes(type),
		};

		if (option.type === "check" && option.defaultValue === null) {
			option.defaultValue = "false";
		}
		if (option.type === "combo" && option.defaultValue === null && option.choices.length > 0) {
			option.defaultValue = option.choices[0];
		}
		if (option.type === "string" && option.defaultValue === null) {
			option.defaultValue = "";
		}
		return option;
	}

	function lower_value_map(obj) {
		let ret = Object.create(null);
		if (typeof obj !== "object" || obj === null) return ret;
		for (let key of Object.keys(obj)) {
			ret[key.toLowerCase()] = {name: key, value: obj[key]};
		}
		return ret;
	}

	function string_value(value) {
		if (value === null || value === undefined) return "";
		return value.toString();
	}

	function buildOptionList(engine, savedOptions) {
		if (!engine || typeof engine.known_options !== "object") return [];
		let saved = lower_value_map(savedOptions);
		let sent = lower_value_map(engine.sent_options);
		let rows = [];

		for (let key of Object.keys(engine.known_options).sort()) {
			let option = parseOptionLine(engine.known_options[key], key);
			if (engine.known_option_names && engine.known_option_names[key]) {
				option.name = engine.known_option_names[key];
			}
			if (saved[key] !== undefined) {
				option.name = saved[key].name;
				option.currentValue = string_value(saved[key].value);
			} else if (sent[key] !== undefined) {
				option.currentValue = string_value(sent[key].value);
			} else {
				option.currentValue = string_value(option.defaultValue);
			}
			rows.push(option);
		}
		return rows;
	}

	function validateDraftValue(option, rawValue) {
		let value = string_value(rawValue);
		if (!option || !option.editable) return [value, null];

		if (option.type === "check") {
			return [value === "true" ? "true" : "false", null];
		}

		if (option.type === "spin") {
			let n = parseInt(value, 10);
			if (Number.isNaN(n)) return [value, `${option.name} must be a number`];
			if (option.min !== null && n < parseInt(option.min, 10)) return [value, `${option.name} must be at least ${option.min}`];
			if (option.max !== null && n > parseInt(option.max, 10)) return [value, `${option.name} must be at most ${option.max}`];
			return [n, null];
		}

		if (option.type === "combo") {
			if (option.choices.length > 0 && !option.choices.includes(value)) {
				return [value, `${option.name} must be one of the listed choices`];
			}
			return [value, null];
		}

		return [value, null];
	}

	function renderControl(option) {
		let key = SafeStringHTML(option.key);
		let value = SafeStringHTML(option.currentValue);

		if (option.type === "check") {
			let checked = option.currentValue === "true" ? " checked" : "";
			return `<input class="uci_option_input" data-key="${key}" type="checkbox"${checked}>`;
		}
		if (option.type === "spin") {
			let min = option.min !== null ? ` min="${SafeStringHTML(option.min)}"` : "";
			let max = option.max !== null ? ` max="${SafeStringHTML(option.max)}"` : "";
			let bounds = [];
			if (option.min !== null) bounds.push(`min ${SafeStringHTML(option.min)}`);
			if (option.max !== null) bounds.push(`max ${SafeStringHTML(option.max)}`);
			return `<input class="uci_option_input" data-key="${key}" type="number" value="${value}"${min}${max}> <span class="uci_option_hint">${bounds.join(", ")}</span>`;
		}
		if (option.type === "combo") {
			let choices = option.choices.map(choice => {
				let safe = SafeStringHTML(choice);
				let selected = choice === option.currentValue ? " selected" : "";
				return `<option value="${safe}"${selected}>${safe}</option>`;
			}).join("");
			return `<select class="uci_option_input" data-key="${key}">${choices}</select>`;
		}
		if (option.type === "string") {
			return `<input class="uci_option_input" data-key="${key}" type="text" value="${value}">`;
		}
		if (option.type === "button") {
			return `<span class="uci_option_readonly">Action button (not saved in MVP)</span>`;
		}
		return `<span class="uci_option_readonly">Unsupported type; use manual configuration</span>`;
	}

	function renderDialog(engine, rows, errors) {
		let engineName = engine && engine.filepath ? path.basename(engine.filepath) : "current engine";
		let lines = [];
		let errorMap = errors || Object.create(null);

		lines.push(`<div class="uci_options_dialog">`);
		lines.push(`<div class="infoline">UCI settings for <span class="green">${SafeStringHTML(engineName)}</span></div>`);
		lines.push(`<div class="uci_option_help">Change supported options visually, then Save. Cancel closes without saving.</div>`);

		if (rows.length === 0) {
			lines.push(`<div class="yellow">No configurable UCI options are available for this engine.</div>`);
		} else {
			for (let option of rows) {
				lines.push(`<div class="uci_option_row">`);
				lines.push(`<label class="uci_option_label">${optionLabel(option)}</label>`);
				lines.push(`<div class="uci_option_control">${renderControl(option)}</div>`);
				if (errorMap[option.key]) {
					lines.push(`<div class="uci_option_error">${SafeStringHTML(errorMap[option.key])}</div>`);
				}
				lines.push(`</div>`);
			}
		}

		lines.push(`<div class="uci_option_actions"><button id="uci_option_save">Save</button> <button id="uci_option_cancel">Cancel</button></div>`);
		lines.push(`</div>`);
		return lines.join("");
	}

	function collectDraftValues(container) {
		let values = Object.create(null);
		if (!container) return values;
		let controls = container.querySelectorAll(".uci_option_input");
		for (let control of controls) {
			let key = control.getAttribute("data-key");
			if (!key) continue;
			if (control.type === "checkbox") {
				values[key] = control.checked ? "true" : "false";
			} else {
				values[key] = control.value;
			}
		}
		return values;
	}

	return {
		parseOptionLine,
		optionLabel,
		buildOptionList,
		validateDraftValue,
		renderDialog,
		collectDraftValues,
	};

})();
