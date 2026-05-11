# Contract: UCI Engine Settings UI

This contract describes the user-visible behavior and renderer integration boundaries for
the current-engine settings dialog.

## Entry Point

**Action**: User chooses `Engine > Engine settings...` from the app menu.

**Preconditions**:
- Nibbler is running from source or packaged app.
- A current UCI engine may or may not be selected.

**Expected outcomes**:
- If a current engine with known options exists, the dialog opens and identifies the
  engine being configured.
- If no current engine exists, the app shows a user-facing message and preserves existing
  settings.
- If options are not yet available, the app shows a user-facing message explaining that
  options cannot be loaded now.

## Option Row Rendering

| UCI Type | Control | Editable | Persistent |
|----------|---------|----------|------------|
| `check` | Checkbox | Yes | Yes |
| `spin` | Numeric input with visible bounds | Yes | Yes |
| `combo` | Select list containing reported choices | Yes | Yes |
| `string` | Text input | Yes | Yes |
| `button` | Action button | Yes, as action | No |
| Unknown/non-standard | Read-only row with manual-edit guidance | No | No |

## Save Behavior

**Action**: User clicks Save.

**Expected outcomes**:
- Valid edited persistent options are saved for the current engine.
- Valid edited persistent options are sent to the running engine immediately when the
  engine accepts live updates.
- If an option cannot be applied immediately, the saved value is preserved and the user is
  told that reinitialization or restart is needed.
- Unknown manual settings are not deleted.
- Button actions are not saved as settings.

## Cancel Behavior

**Action**: User clicks Cancel or closes the dialog without saving.

**Expected outcomes**:
- No draft values are saved.
- No persistent engine options are sent because of canceled draft values.
- Existing manual settings remain unchanged.

## Button Action Behavior

**Action**: User clicks a rendered `button` option.

**Expected outcomes**:
- The app sends the corresponding button action to the current engine.
- The action is not written to `engines.json`.
- The dialog remains open unless the user explicitly closes it.

## Validation Behavior

**Action**: User enters an invalid value and clicks Save.

**Expected outcomes**:
- The dialog stays open.
- The invalid option is identified with a user-facing message.
- No invalid value is sent to the engine or saved.

## Manual Configuration Compatibility

**Action**: User opens and saves or cancels the dialog while `engines.json` contains manual
options not represented by editable controls.

**Expected outcomes**:
- Existing manual options remain present.
- The dialog may display unsupported current-engine option types read-only, with guidance
  to use the manual workflow.
