# Feature Specification: UCI Engine Settings Dialog

**Feature Branch**: `001-uci-engine-settings`  
**Created**: 2026-05-12  
**Status**: Draft  
**Input**: User description: "В текущей версии приложения не хватает окна с вызовом настроек текущего UCI-движка. Пока что настройки и вызовы команд реализованы через текстовый файл где их надо забивать вручную, это очень неудобно Эту опцию можно оставить, но я хочу, чтобы настройки UCI движков вызывались стандартно в виде окошек где можно было ставить галочки, выбирать параметры и так далее"

## Clarifications

### Session 2026-05-12

- Q: How should confirmed changes to current UCI engine settings be applied? → A: Apply immediately to the running engine when possible.
- Q: How should the dialog handle unknown or non-standard engine option types? → A: Show them read-only with guidance to edit them manually.
- Q: How should the dialog handle UCI button options? → A: Show them as separate action buttons and do not save them as settings.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit Current Engine Settings Visually (Priority: P1)

As a chess analysis user, I want to open a settings window for the currently selected
UCI engine so I can change engine options with appropriate controls instead of editing a
text file manually.

**Why this priority**: This is the core user value and removes the most painful current
workflow.

**Independent Test**: Start the app with a configured UCI engine, open the engine
settings window, change at least one checkbox-style option and one numeric or selectable
option, save, and confirm the selected values are applied immediately when the engine
accepts live updates; if not, confirm the app explains that reinitialization or restart is
needed.

**Acceptance Scenarios**:

1. **Given** a current UCI engine is configured and running, **When** the user opens the
   engine settings window, **Then** the window displays the engine's configurable options
   with user-friendly controls matching each option type.
2. **Given** the settings window is open, **When** the user changes option values and
   confirms the dialog, **Then** the app saves the selected values and applies them to the
   current engine immediately when possible, without requiring a full app restart.

---

### User Story 2 - Preserve Manual Configuration Workflow (Priority: P2)

As an advanced user, I want the existing text-file based configuration workflow to remain
available so I can keep using custom or uncommon engine settings that are easier to manage
manually.

**Why this priority**: The new dialog must improve the common workflow without removing
existing power-user behavior.

**Independent Test**: Configure an engine option manually using the existing text-file
workflow, open and close the new settings dialog without changing that option, and confirm
the manual configuration remains intact.

**Acceptance Scenarios**:

1. **Given** a user has existing engine options saved through the manual configuration
   method, **When** the new settings dialog is opened and closed, **Then** existing options
   are not deleted or reset.
2. **Given** a user prefers manual configuration, **When** they access existing manual
   settings files or commands, **Then** those paths remain available.

---

### User Story 3 - Handle Engines With Different Option Sets (Priority: P3)

As a user switching between UCI engines, I want the settings window to reflect the current
engine's actual options so that Leela Chess Zero and traditional UCI engines can each be
configured correctly.

**Why this priority**: Nibbler supports multiple engine families, and engine-specific
option differences must not make the dialog misleading.

**Independent Test**: Open the settings window for two different configured UCI engines
with different option sets and confirm that each dialog displays only the options reported
or known for that current engine.

**Acceptance Scenarios**:

1. **Given** engine A and engine B expose different configurable options, **When** the user
   switches the current engine and opens settings, **Then** the dialog shows the options
   for the selected engine rather than stale options from another engine.
2. **Given** the current engine exposes an option type that can be represented as a
   checkbox, numeric field, text field, or dropdown, **When** the dialog renders the option,
   **Then** the user sees the matching control type with the current value.

---

### Edge Cases

- The current engine is not running or does not provide discoverable options when the
  dialog is opened.
- The engine reports no configurable options.
- An option value is invalid, outside the allowed range, or incompatible with the current
  engine state.
- The user cancels the dialog after making changes.
- The user has existing manually configured values not present in the currently displayed
  option list.
- The engine exposes an unknown or non-standard option type that cannot be safely edited
  with a standard visual control.
- The engine exposes a button-style option that triggers an action rather than storing a
  persistent value.
- The engine becomes unavailable while the dialog is open.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide a user-accessible action to open settings for the
  currently selected UCI engine.
- **FR-002**: The settings view MUST display the current engine's configurable options in
  a visual dialog rather than requiring direct text-file editing for common changes.
- **FR-003**: The settings view MUST represent boolean options as checkbox-style controls.
- **FR-004**: The settings view MUST represent bounded numeric options with a control that
  communicates the allowed range and prevents accidental invalid values.
- **FR-005**: The settings view MUST represent enumerated options as a list of available
  choices.
- **FR-006**: The settings view MUST represent free-form text options as editable text
  fields.
- **FR-007**: The user MUST be able to confirm changes, cancel changes, and close the
  dialog without saving.
- **FR-008**: Confirmed changes MUST be saved so they remain available for later use with
  the same engine.
- **FR-009**: Confirmed changes MUST be applied to the running current engine immediately
  when possible, without requiring manual text-file editing.
- **FR-010**: The existing manual text-file configuration workflow MUST remain available.
- **FR-011**: Opening or saving through the dialog MUST NOT delete unknown or manually
  configured engine settings.
- **FR-012**: If engine options cannot be loaded, the app MUST explain the problem to the
  user and preserve existing settings.
- **FR-013**: The dialog MUST identify which engine is being configured to avoid editing
  the wrong engine by mistake.
- **FR-014**: The app MUST handle engines with different option sets independently.
- **FR-015**: If a confirmed change cannot be applied immediately, the app MUST preserve
  the saved value and clearly indicate that the engine must be reinitialized or restarted
  before the change takes effect.
- **FR-016**: Unknown or non-standard option types MUST be shown as read-only entries
  with an explanation that they can be changed through the existing manual configuration
  workflow.
- **FR-017**: Button-style engine options MUST be shown as separate user-triggered actions
  and MUST NOT be saved as persistent engine settings.

### Nibbler Compatibility Requirements *(mandatory for behavior changes)*

- **NC-001**: Affected app UI workflows include opening the engine settings action,
  editing values in the dialog, confirming changes, canceling changes, and reopening the
  app from the normal development run path to confirm persistence.
- **NC-002**: Affected Lc0/UCI engine workflows include reading configurable UCI options,
  applying selected option values, preserving existing option behavior, and supporting
  both Lc0 and traditional UCI engines where available.
- **NC-003**: Affected user configuration fields include stored engine option values and
  any existing manual configuration entries; unknown fields must be preserved.

### Key Entities *(include if feature involves data)*

- **Current Engine**: The UCI engine currently selected or active in the app, including its
  display name and configurable option set.
- **Engine Option**: A configurable setting exposed for an engine, including name, type,
  current value, default value, and any allowed values or range.
- **Saved Engine Settings**: The persisted option values associated with a specific engine
  that are reused across app sessions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open the current engine's settings dialog and change a common
  option in under 30 seconds without editing a text file.
- **SC-002**: At least four common option types are represented visually: checkbox,
  numeric, text, and choice list.
- **SC-003**: 100% of unchanged existing manual engine settings remain present after
  opening and closing the dialog.
- **SC-004**: A saved option change remains available after the app is closed and opened
  again.
- **SC-005**: A user can cancel edits without changing the saved engine settings.
- **SC-006**: When the engine accepts an option update while running, the changed value is
  reflected in the current engine session without restarting the app.
- **SC-007**: Unknown or non-standard option types are visible without being editable from
  the dialog, and users are directed to the manual configuration workflow.
- **SC-008**: Button-style engine actions can be triggered from the dialog without creating
  or changing saved engine setting values.

## Assumptions

- The primary user is a Nibbler user who already has at least one UCI engine configured.
- The settings dialog targets the current engine first; managing settings for inactive
  engines can be added later if needed.
- Existing manual configuration remains supported for advanced or unsupported options.
- If an engine cannot report options at the moment the dialog opens, the app shows a
  user-friendly message rather than guessing settings.
