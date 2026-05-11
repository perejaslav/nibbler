# Implementation Plan: UCI Engine Settings Dialog

**Branch**: `001-uci-engine-settings` | **Date**: 2026-05-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-uci-engine-settings/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a visual settings dialog for the currently selected UCI engine so users can view and
edit standard UCI options without manually editing script files. The implementation will
reuse the existing renderer-owned engine state: `engine.known_options` for discovered UCI
option metadata, `hub.set_uci_option(..., true)` for saving and applying persistent
options, and the existing `fullbox` overlay for modal-like UI.

## Technical Context

**Language/Version**: Vanilla JavaScript running in Electron 9.4.4  
**Primary Dependencies**: Existing Electron runtime, Node APIs already available in renderer, no new packages  
**Storage**: Existing `engines.json` entries loaded through `files/src/modules/engineconfig_io.js`; preserve existing `options` object and unknown fields  
**Testing**: Manual Electron verification from source; no automated test suite exists  
**Target Platform**: Desktop app on Windows/Linux source run path; packaged builds remain unchanged  
**Project Type**: Electron desktop app with main process menus and vanilla renderer scripts  
**Performance Goals**: Open the dialog and render a typical engine option list in under 1 second after options are known; keep option edits responsive during normal use  
**Constraints**: Preserve `cd files/src && electron .`; no build step, framework, package manager, or renderer script reordering; support Lc0 and traditional UCI engines; preserve manual configuration workflow  
**Scale/Scope**: One current-engine settings dialog; standard UCI option types (`check`, `spin`, `combo`, `string`, `button`) plus read-only unknown/non-standard option rows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Source is the product**: PASS. The plan keeps `cd files/src && electron .` as the
  development run path and adds only source files under `files/src` plus Spec Kit docs.
- **Engine compatibility**: PASS. The design reads options reported by the current UCI
  engine and routes edits through existing `setoption` behavior. Lc0-specific hidden
  options remain available because the existing engine startup already adds
  `--show-hidden` for lc0 executables.
- **Manual verification**: PASS. `quickstart.md` defines manual checks for opening the
  dialog, saving live option updates, canceling edits, read-only unknown options, button
  actions, and persistence.
- **Vanilla renderer architecture**: PASS. The dialog uses existing vanilla JS renderer
  scripts and the existing `fullbox` overlay. No framework or generated assets are added.
- **Configuration safety**: PASS. Persistent changes go through `engineconfig[filepath].options`;
  unknown manual fields are not rewritten by the dialog.

## Project Structure

### Documentation (this feature)

```text
specs/001-uci-engine-settings/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── uci-engine-settings-ui.md
└── tasks.md
```

### Source Code (repository root)

```text
files/src/
├── main.js                         # Add Engine menu action to open current engine settings
├── nibbler.html                    # Load new renderer script after engine and before hub
├── nibbler.css                     # Style fullbox-based settings dialog controls
├── modules/
│   └── engineconfig_io.js          # Existing persistence path; no schema-breaking changes
└── renderer/
    ├── 90_engine.js                # Expose parsed UCI option metadata and button action helper
    ├── 94_uci_options_dialog.js    # New dialog parser/render/apply helpers
    └── 95_hub.js                   # Open dialog, route fullbox clicks, apply option edits
```

**Structure Decision**: Add one focused renderer file, `94_uci_options_dialog.js`, loaded
after `90_engine.js` and before `95_hub.js`. This preserves the numbered load-order
convention while keeping parsing/rendering separate from the already-large hub file.

## Complexity Tracking

No constitution violations identified.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|

## Phase 0: Research Summary

See [research.md](./research.md). Key decisions:
- Parse UCI option metadata from existing `engine.known_options` strings instead of adding
  a second discovery path.
- Reuse `fullbox` for the dialog instead of introducing a new window or framework.
- Save/apply edits through existing hub option methods to preserve menu acknowledgements
  and `engines.json` persistence.

## Phase 1: Design Summary

See [data-model.md](./data-model.md) and [contracts/uci-engine-settings-ui.md](./contracts/uci-engine-settings-ui.md).
The feature introduces renderer-side value objects for option metadata and dialog draft
state, but persistent storage remains the existing per-engine `options` object.

## Post-Design Constitution Check

- **Source is the product**: PASS. All source changes are plain files loaded directly by
  Electron.
- **Engine compatibility**: PASS. Existing UCI send/ack flow remains the only way to
  apply options; unknown option types are read-only.
- **Manual verification**: PASS. Quickstart covers source-run verification for all user
  stories and clarified edge cases.
- **Vanilla renderer architecture**: PASS. One new numbered renderer script keeps load
  order explicit and avoids broad hub refactoring.
- **Configuration safety**: PASS. The data model requires preserving unknown manual
  settings and never treating button actions as persisted values.
