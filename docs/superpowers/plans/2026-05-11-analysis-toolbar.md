# Analysis Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact analysis-focused toolbar to Nibbler so the most common engine-analysis and navigation actions are available without opening menus.

**Architecture:** Add one new renderer-owned toolbar block in `files/src/nibbler.html`, style it in `files/src/nibbler.css`, and route all clicks through a delegated handler in `files/src/renderer/99_start.js` into thin command wrappers in `files/src/renderer/95_hub.js`. Reuse existing hub methods for behaviour changes, navigation, board flip, and focus clearing, with a small toolbar state updater to keep button enablement synchronized with current analysis state.

**Tech Stack:** Electron 9 renderer, vanilla JavaScript, CSS Grid, existing Nibbler renderer hub/state architecture.

---

## File Map

- Modify: `files/src/nibbler.html`
  Responsibility: insert a dedicated `analysistoolbar` container and stable button ids near the existing `statusbox` and `infobox` area.

- Modify: `files/src/nibbler.css`
  Responsibility: add toolbar layout, wrapping, button styling, disabled state, and small group spacing without disturbing the existing grid.

- Modify: `files/src/renderer/99_start.js`
  Responsibility: attach delegated click handling for the toolbar container during renderer startup.

- Modify: `files/src/renderer/95_hub.js`
  Responsibility: dispatch toolbar clicks to existing commands, add small helper functions for lock/auto/focus/MultiPV control, and update toolbar button enablement during normal redraw/state refresh.

- Check only: `files/src/main.js`
  Responsibility: reference for parity with existing menu actions and current `MultiPV` menu values `1..5`; no planned modification in v1.

## Task 1: Add Toolbar Markup

**Files:**
- Modify: `files/src/nibbler.html:21-27`

- [ ] **Step 1: Add the toolbar container and button markup**

Replace the `rightgridder` contents with a status line, then a dedicated toolbar, then the infobox and graph. Use short labels and stable ids so the hub can route by prefix.

```html
		<div id="rightgridder">

			<div id="statusbox">Starting up...</div>
			<div id="analysistoolbar">
				<button id="toolbar_go">Go</button>
				<button id="toolbar_halt">Halt</button>
				<button id="toolbar_lock">Lock</button>
				<button id="toolbar_return">Return</button>
				<button id="toolbar_auto">Auto</button>

				<span class="toolbar_gap"></span>

				<button id="toolbar_root">Root</button>
				<button id="toolbar_back">Back</button>
				<button id="toolbar_forward">Forward</button>
				<button id="toolbar_end">End</button>

				<span class="toolbar_gap"></span>

				<button id="toolbar_flip">Flip</button>
				<button id="toolbar_multipv_down">MultiPV -</button>
				<button id="toolbar_multipv_up">MultiPV +</button>
				<button id="toolbar_clear_focus">Clear Focus</button>
			</div>
			<div id="infobox"></div>
			<canvas id="graph"></canvas>

		</div>
```

- [ ] **Step 2: Manual static verification**

Open the file and verify by inspection that:

- `statusbox` still appears first,
- the new toolbar sits between `statusbox` and `infobox`,
- all button ids begin with `toolbar_`,
- no other existing ids were renamed.

Expected result: HTML contains one new `div id="analysistoolbar"` and 13 buttons with stable ids.

## Task 2: Add Toolbar Layout and Styling

**Files:**
- Modify: `files/src/nibbler.css:38-49`
- Modify: `files/src/nibbler.css:81-111`
- Modify: `files/src/nibbler.css` near the generic element styles at the end of file

- [ ] **Step 1: Expand the right-side grid to include a toolbar row**

Update `#rightgridder` from three rows to four rows so the toolbar gets its own slot between status and infobox.

```css
#rightgridder {
	grid-area: b;
	display: grid;
	margin: 1em 0 0 0;
	height: 0;
	grid-template-columns: none;
	grid-template-rows: min-content min-content 1fr min-content;
	grid-template-areas:
		"c"
		"t"
		"d"
		"e";
}
```

- [ ] **Step 2: Add toolbar container styles**

Insert a new block after `#statusbox` and before `#infobox`.

```css
#analysistoolbar {
	grid-area: t;
	margin: 0.5em 1em 0 1em;
	display: flex;
	flex-wrap: wrap;
	gap: 0.4em;
	align-items: center;
	pointer-events: auto;
	font-family: monospace, monospace;
}

#analysistoolbar .toolbar_gap {
	width: 0.8em;
	height: 1px;
	flex: 0 0 auto;
}
```

- [ ] **Step 3: Add button styling and disabled appearance**

Append compact button rules near the end of the stylesheet.

```css
#analysistoolbar button {
	background-color: #101010;
	border: 1px solid #444444;
	color: #dddddd;
	cursor: pointer;
	font-family: inherit;
	font-size: 100%;
	margin: 0;
	padding: 0.15em 0.55em;
	pointer-events: auto;
}

#analysistoolbar button:hover:enabled {
	border-color: #6cccee;
	color: #6cccee;
}

#analysistoolbar button:disabled {
	border-color: #2a2a2a;
	color: #666666;
	cursor: default;
}
```

- [ ] **Step 4: Run the app for a layout smoke check**

Run:

```powershell
electron .
```

Workdir: `D:\github\nibbler\files\src`

Expected result:

- the renderer starts,
- a toolbar row appears above the infobox,
- buttons wrap instead of clipping when the window is narrowed,
- board, statusbox, infobox, graph, fenbox, and movelist still render.

## Task 3: Wire Toolbar Click Handling

**Files:**
- Modify: `files/src/renderer/99_start.js:157-179`
- Modify: `files/src/renderer/95_hub.js:2100-2123`

- [ ] **Step 1: Attach toolbar event delegation in startup**

Add a delegated `mousedown` listener beside the existing `statusbox` and `infobox` handlers.

```javascript
analysistoolbar.addEventListener("mousedown", (event) => {
	hub.toolbar_click(event);
});
```

- [ ] **Step 2: Add a toolbar click dispatcher in the hub**

Insert a new method near `statusbox_click()` so all toolbar actions route through one prefix-based decoder.

```javascript
toolbar_click: function(event) {

	let action = EventPathString(event, "toolbar_");
	if (typeof action !== "string") {
		return;
	}

	switch (action) {
	case "go":
		this.set_behaviour("analysis_free");
		return;
	case "halt":
		this.set_behaviour("halt");
		return;
	case "lock":
		this.set_behaviour("analysis_locked");
		return;
	case "return":
		this.return_to_lock();
		return;
	case "auto":
		this.set_behaviour("auto_analysis");
		return;
	case "root":
		this.goto_root();
		return;
	case "back":
		this.prev();
		return;
	case "forward":
		this.next();
		return;
	case "end":
		this.goto_end();
		return;
	case "flip":
		this.toggle_flip();
		return;
	case "clear_focus":
		this.clear_searchmoves();
		return;
	case "multipv_down":
		this.adjust_toolbar_multipv(-1);
		return;
	case "multipv_up":
		this.adjust_toolbar_multipv(1);
		return;
	}
},
```

- [ ] **Step 3: Run a click-path smoke check**

Run:

```powershell
electron .
```

Workdir: `D:\github\nibbler\files\src`

Expected result:

- app starts without renderer exceptions,
- clicking a toolbar button does not crash even if some actions are not fully enabled yet,
- DevTools console has no `hub.toolbar_click is not a function` or missing-element errors.

## Task 4: Add Toolbar Helpers and State Synchronization

**Files:**
- Modify: `files/src/renderer/95_hub.js:225-231`
- Modify: `files/src/renderer/95_hub.js:1292-1343`
- Modify: `files/src/renderer/95_hub.js` near the UI draw/update methods

- [ ] **Step 1: Add a helper to clear focus explicitly**

If `clear_searchmoves()` already exists elsewhere in `95_hub.js`, reuse it and skip this insertion. If not, add a thin wrapper near other analysis helpers.

```javascript
clear_searchmoves: function() {
	if (this.tree.node.searchmoves.length === 0) {
		return;
	}
	this.tree.node.searchmoves = [];
	this.handle_search_params_change();
	this.draw();
},
```

- [ ] **Step 2: Add a helper for toolbar MultiPV changes**

Use the existing menu contract from `main.js`, where normal engines expose `MultiPV` values `1..5`, and preserve the existing Leela guard in `set_uci_option()`.

```javascript
adjust_toolbar_multipv: function(delta) {

	let current = engineconfig[this.engine.filepath].options["MultiPV"];
	if (typeof current !== "number") {
		current = 1;
	}

	let next = current + delta;
	if (next < 1) next = 1;
	if (next > 5) next = 5;

	if (next === current) {
		return;
	}

	this.set_uci_option_permanent("MultiPV", next);
},
```

- [ ] **Step 3: Add toolbar state rendering**

Create one method that updates button disabled states from existing hub/config state, and call it from the standard redraw path.

```javascript
update_toolbar_state: function() {

	document.getElementById("toolbar_go").disabled = (config.behaviour !== "halt");
	document.getElementById("toolbar_halt").disabled = (config.behaviour === "halt");
	document.getElementById("toolbar_return").disabled = !this.leela_lock_node;
	document.getElementById("toolbar_clear_focus").disabled = (this.tree.node.searchmoves.length === 0);
	document.getElementById("toolbar_multipv_down").disabled = this.toolbar_multipv_value() <= 1;
	document.getElementById("toolbar_multipv_up").disabled = this.toolbar_multipv_value() >= 5;
},

toolbar_multipv_value: function() {
	let current = engineconfig[this.engine.filepath].options["MultiPV"];
	return (typeof current === "number") ? current : 1;
},
```

Call it from the existing draw/update loop after DOM-driven areas are safe to touch. The intended call site is the same normal redraw path that already keeps statusbox and infobox in sync.

```javascript
this.update_toolbar_state();
```

- [ ] **Step 4: Verify toolbar state transitions manually**

Run:

```powershell
electron .
```

Workdir: `D:\github\nibbler\files\src`

Expected result:

- initial state: `Go` enabled, `Halt` disabled,
- after `Go`: `Go` disabled, `Halt` enabled,
- after `Lock`: `Return` becomes meaningful once a lock node exists,
- after setting focus with existing infobox focus buttons: `Clear Focus` becomes enabled,
- `MultiPV -` stops disabling below `1`, `MultiPV +` stops increasing above `5`.

## Task 5: End-to-End Manual Regression Check

**Files:**
- No new code; verify the modified files together.

- [ ] **Step 1: Launch the application for final verification**

Run:

```powershell
electron .
```

Workdir: `D:\github\nibbler\files\src`

Expected result: app launches cleanly with no startup alert caused by the toolbar changes.

- [ ] **Step 2: Verify action parity with existing menu commands**

Check these pairs manually in the running app:

- toolbar `Go` matches `Analysis > Go`
- toolbar `Halt` matches `Analysis > Halt`
- toolbar `Lock` matches `Analysis > Go and lock engine`
- toolbar `Return` matches `Analysis > Return to locked position`
- toolbar `Auto` matches `Analysis > Auto-evaluate line`
- toolbar `Root/Back/Forward/End` match the `Tree` menu actions
- toolbar `Flip` matches `Display > Flip board`
- toolbar `Clear Focus` matches `Analysis > Clear focus`

Expected result: each toolbar button triggers the same visible behaviour as the corresponding menu action.

- [ ] **Step 3: Verify non-regression of old quick-access paths**

Check manually that these still work:

- `statusbox` clickable `go?` / `halt?` / `return?`
- `Space` toggles go/halt
- mouse wheel over board or graph still calls `prev()` / `next()`
- infobox PV clicks still navigate/add lines
- movelist clicks still navigate tree

Expected result: existing quick controls remain functional and are not intercepted by the new toolbar.

- [ ] **Step 4: Record changed files and commit**

Run:

```powershell
git status --short
```

Expected result:

- modified: `files/src/nibbler.html`
- modified: `files/src/nibbler.css`
- modified: `files/src/renderer/99_start.js`
- modified: `files/src/renderer/95_hub.js`
- no unrelated accidental edits created by the toolbar work

Commit:

```bash
git add files/src/nibbler.html files/src/nibbler.css files/src/renderer/99_start.js files/src/renderer/95_hub.js
git commit -m "feat: add analysis toolbar quick controls"
```

## Self-Review Against Spec

- Spec coverage:
  - dedicated toolbar block: covered in Task 1
  - compact styling and wrapping: covered in Task 2
  - delegated event handling: covered in Task 3
  - button actions and state enablement: covered in Task 4
  - manual Electron validation and non-regression checks: covered in Task 5

- Placeholder scan:
  - no `TODO`, `TBD`, or deferred implementation markers remain
  - all touched files are named explicitly
  - all verification steps include exact commands or explicit manual checks

- Type consistency:
  - toolbar button ids consistently use the `toolbar_` prefix
  - hub methods consistently use `set_behaviour`, `return_to_lock`, `goto_root`, `prev`, `next`, `goto_end`, `toggle_flip`, `clear_searchmoves`, and `set_uci_option_permanent`
