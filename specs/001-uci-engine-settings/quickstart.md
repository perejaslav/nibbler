# Quickstart: UCI Engine Settings Dialog

## Prerequisites

- Have Electron available for running the app from source.
- Have at least one UCI engine configured in Nibbler.
- Use an engine that reports common UCI option types, such as a boolean/check option and a
  numeric/spin or combo option.

## Run From Source

```powershell
Set-Location files/src
electron .
```

Expected result: Nibbler opens without a build step.

## Verify Current Engine Settings Dialog

1. Start Nibbler and load a known UCI engine.
2. Open `Engine > Engine settings...`.
3. Confirm the dialog title or header identifies the current engine.
4. Confirm standard options render as visual controls:
   - checkbox for boolean/check options
   - numeric input with bounds for spin options
   - select list for combo options
   - text input for string options
   - action button for button options
5. Change one editable option and click Save.

Expected result: The changed value is saved and sent to the current engine immediately
when the engine accepts live updates. If it cannot be applied immediately, Nibbler shows a
message saying reinitialization or restart is needed.

## Verify Cancel Does Not Save

1. Open `Engine > Engine settings...`.
2. Change an editable value.
3. Click Cancel or close the dialog without saving.
4. Reopen the dialog.

Expected result: The previously saved value is still shown; the canceled draft value was
not saved or sent.

## Verify Manual Configuration Preservation

1. Add or keep an existing custom option in the engine's manual configuration.
2. Open the settings dialog and save a different supported option.
3. Inspect the engine configuration through the existing manual workflow.

Expected result: The custom manual option remains present and unchanged.

## Verify Unknown or Non-Standard Option Handling

1. Use an engine or fixture that reports an option type outside standard editable types.
2. Open the settings dialog.

Expected result: The option is visible as read-only and includes guidance to edit it
through the existing manual configuration workflow.

## Verify Button Option Handling

1. Use an engine that reports a `button` option.
2. Open the settings dialog.
3. Click the rendered button action.
4. Inspect saved settings through the existing manual workflow.

Expected result: The action is sent to the engine, but no persistent setting value is
created or changed for that button.

## Verify Multiple Engines

1. Configure two engines with different option sets.
2. Open settings for the first engine and note visible options.
3. Switch to the second engine.
4. Open settings again.

Expected result: The dialog shows the second engine's options and does not show stale
options from the first engine.
