# Analysis Toolbar Design

## Context

Nibbler currently exposes most analysis actions through the application menu in `files/src/main.js`, while a small subset of quick actions appears as clickable text inside `statusbox` and `infobox`. There is no dedicated toolbar in `files/src/nibbler.html`.

The goal of this change is to add a compact, always-visible toolbar focused on human game analysis, so common engine and navigation actions are available without opening menus.

## Goals

- Reduce menu hunting during analysis sessions.
- Expose the most frequent human-analysis actions in one fixed location.
- Reuse existing renderer commands instead of duplicating analysis logic.
- Preserve the current menu structure and keyboard shortcuts.

## Non-Goals

- No redesign of the full UI layout.
- No toolbar for engine configuration, tree maintenance, or debugging actions.
- No attempt to replace all shortcuts or all menu items.
- No context-sensitive advanced control groups in the first version.

## Recommended Toolbar Scope

The first version should expose these actions:

- `Go`
- `Halt`
- `Lock`
- `Return`
- `Root`
- `Back`
- `Forward`
- `End`
- `Auto`
- `Flip`
- `MultiPV -`
- `MultiPV +`
- `Clear Focus`

These buttons cover the main analysis loop:

- start or stop engine analysis,
- lock and revisit a reference position,
- navigate through the game and current line,
- trigger automatic line evaluation,
- flip the board for the side being studied,
- adjust line breadth with MultiPV,
- clear searchmove-based focus restrictions.

The following actions stay in menus and shortcuts for now:

- `Auto Back`
- `Previous sibling` / `Next sibling`
- `Promote line` actions
- `Forget all analysis`
- engine setup and maintenance actions
- tree deletion and PGN-management actions

This keeps the toolbar narrow and centered on frequent over-the-board style analysis tasks.

## UX Layout

Add a new toolbar container to `files/src/nibbler.html` as a dedicated renderer block, instead of expanding `statusbox`.

The toolbar should:

- sit close to the existing analysis/status area,
- render as one compact horizontal row on desktop widths,
- allow wrapping on narrower widths instead of overflowing off screen,
- use short text labels rather than icon-only buttons,
- visually separate action groups with small spacing.

Recommended visual grouping:

1. Analysis control: `Go`, `Halt`, `Lock`, `Return`, `Auto`
2. Navigation: `Root`, `Back`, `Forward`, `End`
3. View and scope: `Flip`, `MultiPV -`, `MultiPV +`, `Clear Focus`

This grouping matches how players work: run the engine, move through the line, then tune what they see.

## Behaviour Rules

The toolbar must call existing renderer functions in `files/src/renderer/95_hub.js` or thin wrappers added there. No analysis state should be reimplemented in DOM code.

Expected button behaviour:

- `Go`: starts normal free analysis.
- `Halt`: stops analysis.
- `Lock`: switches to locked analysis mode for the current position.
- `Return`: returns to the saved locked position.
- `Root`: jump to game root.
- `Back`: previous move.
- `Forward`: next move.
- `End`: jump to end of current line.
- `Auto`: start auto-evaluate line.
- `Flip`: flip the board orientation.
- `MultiPV -`: decrement MultiPV by one, respecting the existing minimum.
- `MultiPV +`: increment MultiPV by one, respecting the existing maximum or current engine limits.
- `Clear Focus`: clear active focus/searchmoves restrictions.

State-dependent enablement:

- disable `Go` while analysis is already running,
- disable `Halt` while the engine is halted,
- disable `Return` when no locked reference position exists,
- disable `Clear Focus` when there is no active focus restriction,
- keep navigation buttons enabled only when their underlying action is valid if the current hub state already exposes that knowledge cheaply; otherwise they may remain enabled in v1.

The toolbar should update together with existing UI refreshes so button state always matches current analysis state.

## File-Level Design

### `files/src/nibbler.html`

- Add a new toolbar container with stable button ids.
- Place it near the existing status and analysis information area, not inside the board canvas.

### `files/src/nibbler.css`

- Add compact toolbar layout and button styling.
- Preserve the existing grid structure.
- Ensure wrapping works on smaller window sizes.
- Keep styling aligned with the current plain, utility-focused visual language.

### `files/src/renderer/99_start.js`

- Register click handling for the new toolbar container.
- Reuse the existing delegated-click style already used for statusbox and infobox where practical.

### `files/src/renderer/95_hub.js`

- Add a `toolbar_click` handler or equivalent thin dispatch.
- Reuse existing commands such as `set_behaviour(...)`, `return_to_lock()`, `goto_root()`, `prev()`, `next()`, `goto_end()`, `flip()`, `clear_focus()`, and the existing auto-analysis entrypoint.
- Add minimal helper functions if needed to increment or decrement MultiPV through current config/menu plumbing.
- Expose a small toolbar-state update path so the renderer can mark buttons enabled or disabled during normal redraws.

### Optional: `files/src/renderer/83_statusbox.js`

- No functional move is required here.
- Only touch this file if sharing small status-state helpers makes the toolbar-state update cleaner.

### Optional: `files/src/main.js`

- No change required for the initial toolbar itself.
- Only change if a future follow-up adds a menu toggle for showing or hiding the toolbar.

## Why This Approach

This design intentionally avoids a smart or mode-swapping toolbar. A fixed compact toolbar is preferable in the first version because:

- the codebase already mixes menu actions, clickable text, and keyboard shortcuts,
- predictability matters more than cleverness in analysis workflows,
- a fixed set of high-frequency actions is easier to learn,
- the renderer on Electron 9 should keep DOM and state logic simple.

It also avoids overloading the toolbar with engine-management and tree-editing actions that are important but not constant companions during move-by-move analysis.

## Risks

- Old layout CSS may make row placement or wrapping awkward without small grid adjustments.
- Existing state for lock/focus availability may not be exposed cleanly enough for perfect enable/disable behaviour in the first pass.
- MultiPV quick controls may require tracing how engine options are currently synchronized to config and UI.

## Validation Strategy

Since the project has no automated test harness, validate manually in the running Electron app:

1. Start app with `cd files/src && electron .`
2. Confirm toolbar renders without breaking the existing grid.
3. Verify each button triggers the same behaviour as its corresponding menu action.
4. Verify `Go`, `Halt`, `Return`, and `Clear Focus` enable or disable sensibly.
5. Verify MultiPV buttons update analysis output as expected.
6. Verify wrapping or compact display remains usable on narrower windows.
7. Recheck existing shortcuts and statusbox clicks still work.

## Must Not Break

- Existing menu commands in `Analysis`, `Tree`, `Display`, and `Engine`
- Existing keyboard shortcuts
- Existing clickable actions in `statusbox` and `infobox`
- Current board, graph, move list, and status layout stability
- Existing analysis mode transitions in `renderer/95_hub.js`
