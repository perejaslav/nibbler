---

description: "Task list for UCI Engine Settings Dialog implementation"
---

# Tasks: UCI Engine Settings Dialog

**Input**: Design documents from `/specs/001-uci-engine-settings/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/uci-engine-settings-ui.md, quickstart.md

**Tests**: No automated test suite exists in this project. Manual Electron verification tasks are REQUIRED for every behavior change.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Source app: `files/src/`
- Renderer scripts: `files/src/renderer/`
- Feature docs: `specs/001-uci-engine-settings/`
- No build output paths are introduced

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the existing vanilla renderer structure for a focused UCI settings dialog without adding a build step.

- [ ] T001 Add `files/src/renderer/94_uci_options_dialog.js` as an empty strict-mode renderer module placeholder
- [ ] T002 Load `files/src/renderer/94_uci_options_dialog.js` in `files/src/nibbler.html` between `renderer/90_engine.js` and `renderer/95_hub.js`
- [ ] T003 [P] Add CSS section placeholders for UCI settings dialog classes in `files/src/nibbler.css`
- [ ] T004 [P] Review existing Engine menu location in `files/src/main.js` and identify insertion point for `Engine settings...` action

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared parsing and state access that all user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Implement `uci_options_dialog.parseOptionLine(rawMetadata, fallbackKey)` in `files/src/renderer/94_uci_options_dialog.js` for UCI `check`, `spin`, `combo`, `string`, `button`, and unknown option metadata
- [ ] T006 Implement `uci_options_dialog.optionLabel(option)` and HTML escaping usage in `files/src/renderer/94_uci_options_dialog.js` so option names and raw metadata render safely
- [ ] T007 Implement `uci_options_dialog.buildOptionList(engine, savedOptions)` in `files/src/renderer/94_uci_options_dialog.js` using `engine.known_options`, `engine.sent_options`, and `engineconfig[engine.filepath].options`
- [ ] T008 Implement `uci_options_dialog.validateDraftValue(option, rawValue)` in `files/src/renderer/94_uci_options_dialog.js` for `check`, `spin`, `combo`, and `string` values
- [ ] T009 Expose `get_uci_option_rows()` helper on the engine object in `files/src/renderer/90_engine.js` without changing existing `known_options` population behavior
- [ ] T010 Add `press_uci_button_option(name)` helper to `hub` in `files/src/renderer/95_hub.js` that calls existing `this.engine.pressbutton(name)` without writing to `engineconfig`

**Checkpoint**: Parser helpers can derive typed option rows from current engine metadata, and no UI entry point exists yet.

---

## Phase 3: User Story 1 - Edit Current Engine Settings Visually (Priority: P1) MVP

**Goal**: User opens a current-engine settings dialog, edits standard UCI options visually, saves changes, and applies them immediately when possible.

**Independent Test**: Start with a configured UCI engine, open `Engine > Engine settings...`, edit one checkbox-style option and one numeric or selectable option, save, and confirm values are sent to the running engine or the app explains restart/reinitialization is needed.

### Implementation for User Story 1

- [ ] T011 [US1] Add `Engine settings...` menu item in `files/src/main.js` that sends `win.webContents.send("call", "show_uci_engine_settings")`
- [ ] T012 [US1] Implement `show_uci_engine_settings()` in `files/src/renderer/95_hub.js` to show a user-facing message when no current engine path is available
- [ ] T013 [US1] Implement `show_uci_engine_settings()` in `files/src/renderer/95_hub.js` to show a user-facing message when `engine.known_options` is empty or options are not ready
- [ ] T014 [US1] Implement `uci_options_dialog.renderDialog(engine, rows)` in `files/src/renderer/94_uci_options_dialog.js` with header identifying the current engine
- [ ] T015 [US1] Render `check` options as checkbox controls in `files/src/renderer/94_uci_options_dialog.js`
- [ ] T016 [US1] Render `spin` options as numeric controls with visible `min` and `max` bounds in `files/src/renderer/94_uci_options_dialog.js`
- [ ] T017 [US1] Render `combo` options as select controls containing all parsed `var` choices in `files/src/renderer/94_uci_options_dialog.js`
- [ ] T018 [US1] Render `string` options as text inputs in `files/src/renderer/94_uci_options_dialog.js`
- [ ] T019 [US1] Add Save and Cancel controls with `uci_option_save` and `uci_option_cancel` IDs in `files/src/renderer/94_uci_options_dialog.js`
- [ ] T020 [US1] Route `uci_option_cancel` clicks in `hub.fullbox_click(event)` in `files/src/renderer/95_hub.js` to `this.hide_fullbox()` without saving
- [ ] T021 [US1] Implement `uci_options_dialog.collectDraftValues(fullbox_content)` in `files/src/renderer/94_uci_options_dialog.js` to collect editable controls by option key
- [ ] T022 [US1] Route `uci_option_save` clicks in `hub.fullbox_click(event)` in `files/src/renderer/95_hub.js` to validate and apply collected draft values
- [ ] T023 [US1] Apply valid changed persistent values through `this.set_uci_option(name, value, true)` in `files/src/renderer/95_hub.js`
- [ ] T024 [US1] Keep the dialog open and show inline validation messages from `files/src/renderer/94_uci_options_dialog.js` when `spin` or `combo` values are invalid
- [ ] T025 [US1] Add UCI settings dialog CSS for layout, labels, controls, validation text, and action buttons in `files/src/nibbler.css`
- [ ] T026 [US1] Manually verify P1 flow from `specs/001-uci-engine-settings/quickstart.md` using `cd files/src && electron .`

**Checkpoint**: User Story 1 is functional and independently testable as the MVP.

---

## Phase 4: User Story 2 - Preserve Manual Configuration Workflow (Priority: P2)

**Goal**: Existing manual text-file and `engines.json` configuration remains available and unchanged unless the user explicitly saves editable dialog values.

**Independent Test**: Add or keep a manual engine option, open and close the dialog without changing it, then save a different supported option and confirm the manual option remains intact.

### Implementation for User Story 2

- [ ] T027 [US2] Ensure `uci_options_dialog.buildOptionList(engine, savedOptions)` in `files/src/renderer/94_uci_options_dialog.js` includes saved manual option values when they match known editable options
- [ ] T028 [US2] Ensure save handling in `files/src/renderer/95_hub.js` updates only submitted editable option names and never replaces the whole `engineconfig[this.engine.filepath].options` object
- [ ] T029 [US2] Render unknown or non-standard option rows as read-only with manual configuration guidance in `files/src/renderer/94_uci_options_dialog.js`
- [ ] T030 [US2] Add CSS for read-only unsupported option rows in `files/src/nibbler.css`
- [ ] T031 [US2] Add manual-workflow guidance text to the dialog footer in `files/src/renderer/94_uci_options_dialog.js`
- [ ] T032 [US2] Manually verify manual configuration preservation from `specs/001-uci-engine-settings/quickstart.md` using `cd files/src && electron .`

**Checkpoint**: Manual configuration remains compatible with the new dialog.

---

## Phase 5: User Story 3 - Handle Engines With Different Option Sets (Priority: P3)

**Goal**: The dialog always reflects the currently selected engine's actual options and handles button-style UCI actions separately from saved settings.

**Independent Test**: Switch between two engines with different option sets, open settings for each, confirm no stale options appear, and trigger a button option without creating a saved setting value.

### Implementation for User Story 3

- [ ] T033 [US3] Reset any dialog draft state in `hub.hide_fullbox()` or UCI dialog close handling in `files/src/renderer/95_hub.js` so stale values cannot leak between engines
- [ ] T034 [US3] Ensure `show_uci_engine_settings()` in `files/src/renderer/95_hub.js` rebuilds rows from the current engine every time the dialog opens
- [ ] T035 [US3] Render `button` options as action buttons separate from Save and Cancel controls in `files/src/renderer/94_uci_options_dialog.js`
- [ ] T036 [US3] Route `uci_option_button_` clicks in `hub.fullbox_click(event)` in `files/src/renderer/95_hub.js` to `press_uci_button_option(name)` without saving a setting
- [ ] T037 [US3] Show a user-facing message in `files/src/renderer/95_hub.js` if the engine becomes unavailable before a button action or save is applied
- [ ] T038 [US3] Manually verify multiple-engine and button-option flows from `specs/001-uci-engine-settings/quickstart.md` using `cd files/src && electron .`

**Checkpoint**: Different engines and button actions are handled independently and safely.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, regression checks, and documentation alignment.

- [ ] T039 Review `files/src/renderer/94_uci_options_dialog.js`, `files/src/renderer/95_hub.js`, and `files/src/renderer/90_engine.js` to confirm no new build step, framework, package manager, or renderer script reordering was introduced
- [ ] T040 Verify current analysis controls still work in `files/src/renderer/95_hub.js` after opening, saving, canceling, and closing the UCI settings dialog
- [ ] T041 Verify existing Engine menu UCI option entries in `files/src/main.js` still send `set_uci_option_permanent` and keep menu acknowledgements working
- [ ] T042 Verify `files/src/modules/engineconfig_io.js` still preserves existing engine entries and unknown fields after dialog saves
- [ ] T043 Update user-facing documentation in `README.md` to mention the new visual UCI engine settings dialog while preserving manual advanced options
- [ ] T044 Run the full manual checklist in `specs/001-uci-engine-settings/quickstart.md` and record results in the implementation notes or PR description

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user story work.
- **User Story 1 (Phase 3)**: Depends on Foundational; delivers MVP dialog/edit/save flow.
- **User Story 2 (Phase 4)**: Depends on User Story 1 because it extends save/render behavior.
- **User Story 3 (Phase 5)**: Depends on User Story 1 and Foundational; can partly overlap with User Story 2 after MVP exists.
- **Polish (Phase 6)**: Depends on all selected user stories.

### User Story Dependencies

- **US1**: No dependency on US2 or US3 after Foundational; MVP scope.
- **US2**: Depends on US1 save/render paths to verify preservation behavior.
- **US3**: Depends on US1 dialog opening/rendering and Foundational parser behavior.

### Within Each User Story

- Parser/state helpers before UI rendering.
- UI rendering before click routing.
- Click routing before manual verification.
- Manual verification before marking a story complete.

---

## Parallel Opportunities

- T003 and T004 can run in parallel after T001 is planned because they touch different files.
- T005, T006, T007, and T008 are related and should be done sequentially in one file to avoid parser conflicts.
- In US1, T015 through T018 can be parallelized only after T014 if separate workers coordinate within `files/src/renderer/94_uci_options_dialog.js`; otherwise keep sequential to avoid same-file conflicts.
- T029 and T030 can run in parallel after US1 rendering exists because they touch different files.
- T035 and T037 can run in parallel after T034 because one handles rendering and the other handles unavailable-engine messaging.

## Parallel Example: User Story 1

```text
After T014 completes:
- Worker A: T015 render check options in files/src/renderer/94_uci_options_dialog.js
- Worker B: T016 render spin options in files/src/renderer/94_uci_options_dialog.js
- Worker C: T017 render combo options in files/src/renderer/94_uci_options_dialog.js
- Worker D: T018 render string options in files/src/renderer/94_uci_options_dialog.js
```

## Parallel Example: User Story 2

```text
After US1 save/render path exists:
- Worker A: T029 render read-only unsupported option rows in files/src/renderer/94_uci_options_dialog.js
- Worker B: T030 style read-only unsupported option rows in files/src/nibbler.css
```

## Parallel Example: User Story 3

```text
After T034 completes:
- Worker A: T035 render button options in files/src/renderer/94_uci_options_dialog.js
- Worker B: T037 add unavailable-engine messages in files/src/renderer/95_hub.js
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 parser and state helpers.
3. Complete Phase 3 visual dialog, save, cancel, and manual verification.
4. Stop and validate P1 independently with a configured UCI engine.

### Incremental Delivery

1. Deliver US1 visual edit/save dialog.
2. Add US2 manual configuration preservation and unsupported option guidance.
3. Add US3 multiple-engine rebuild behavior and button actions.
4. Run cross-cutting manual regression checks against existing analysis workflows.

### Regression Guardrails

- Do not add a build step or package dependency.
- Do not move existing renderer scripts except adding `94_uci_options_dialog.js` between `90_engine.js` and `95_hub.js`.
- Do not replace `engineconfig[this.engine.filepath].options`; update only explicit saved option keys.
- Do not change existing analysis behavior except the existing `set_uci_option` path halting search when applying an option.
- Do not persist UCI `button` options.
