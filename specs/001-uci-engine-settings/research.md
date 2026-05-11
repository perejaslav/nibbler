# Research: UCI Engine Settings Dialog

## Decision: Use Existing UCI Option Discovery

Use `engine.known_options` populated in `files/src/renderer/90_engine.js` from engine
output lines beginning with `option`. Each entry already stores the metadata fragment after
`type`, keyed by lower-case option name.

**Rationale**: The renderer already receives option metadata during normal UCI startup.
Reusing it avoids a second engine probing path and keeps Lc0/Stockfish compatibility tied
to behavior that already works.

**Alternatives considered**:
- Re-run `uci` when opening the dialog: rejected because it risks duplicating startup
  behavior and confusing engine state.
- Maintain a static catalog of known engine options: rejected because UCI engines vary and
  users can configure arbitrary engines.

## Decision: Add a Small Parser for Standard UCI Option Metadata

Parse standard UCI option forms into renderer-side metadata:
- `check` as boolean checkbox with `default` and current value.
- `spin` as numeric input with `min`, `max`, `default`, and current value.
- `combo` as select control with all `var` choices and current value.
- `string` as text input with `default` and current value.
- `button` as a non-persistent action.

**Rationale**: UCI option lines are textual, but the UI needs typed controls. A small
parser keeps the UI deterministic while preserving unknown metadata as read-only.

**Alternatives considered**:
- Treat every option as free-form text: rejected because it fails checkbox/range/dropdown
  user expectations.
- Only support hard-coded Lc0 options: rejected because Nibbler also supports traditional
  UCI engines.

## Decision: Reuse the Existing Fullbox Overlay

Render the settings dialog in the existing `fullbox` overlay and route clicks through
`hub.fullbox_click()` with new `uci_option_*` element IDs.

**Rationale**: Nibbler already uses `fullbox` for chooser/editor UI. Reusing it avoids
new windows, keeps focus behavior familiar, and preserves the no-framework renderer.

**Alternatives considered**:
- Add a separate Electron child window: rejected because it adds main/renderer lifecycle
  complexity for a settings panel.
- Add native OS dialogs for each option: rejected because multi-option editing and cancel
  semantics would be poor.

## Decision: Save and Apply Through Existing Hub Methods

Confirmed editable values call existing option behavior that saves to
`engineconfig[this.engine.filepath].options` and sends `setoption` to the current engine.
Button options call `engine.pressbutton(name)` and are not written to configuration.

**Rationale**: Existing menu-based options already depend on this path for acknowledgements,
search halting, and persistence. Reusing it reduces behavior drift.

**Alternatives considered**:
- Write `engines.json` directly from the dialog: rejected because it bypasses current
  engine acknowledgements and live application behavior.
- Apply values only after restart: rejected by clarification; users want immediate apply
  when the engine accepts it.

## Decision: Preserve Manual Configuration Entries

The dialog only modifies options the user confirms from editable controls. Unknown manual
fields in `engines.json` remain untouched, and unknown/non-standard option types render as
read-only rows with manual-edit guidance.

**Rationale**: The existing text-file workflow is a required compatibility path and users
may have custom options outside the visible standard controls.

**Alternatives considered**:
- Normalize the whole options object on save: rejected because it could delete custom
  manual values.
- Hide unknown/non-standard options: rejected by clarification because visibility helps
  users understand why manual editing may still be needed.
