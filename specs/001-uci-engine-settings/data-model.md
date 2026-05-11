# Data Model: UCI Engine Settings Dialog

## CurrentEngine

Represents the engine currently selected or active in Nibbler.

**Fields**:
- `filepath`: Absolute path used as the key into `engineconfig`.
- `displayName`: Human-readable engine name or executable path shown in the dialog.
- `isReadyForOptions`: True after the engine has reported enough UCI startup state for
  options to be known.
- `knownOptions`: Map of lower-case option name to raw UCI option metadata string.
- `savedOptions`: Existing persisted option values from `engineconfig[filepath].options`.

**Relationships**:
- Has many `EngineOption` records derived from `knownOptions`.
- Has one `SavedEngineSettings` record in `engines.json`.

**Validation rules**:
- `filepath` must match the current renderer engine path before applying edits.
- Empty or missing current engine produces a user-facing no-engine message.

## EngineOption

Represents one option reported by the current UCI engine.

**Fields**:
- `name`: Original option name as reported by the engine.
- `key`: Lower-case option name used for lookups.
- `type`: One of `check`, `spin`, `combo`, `string`, `button`, or `unknown`.
- `defaultValue`: Optional default value parsed from UCI metadata.
- `currentValue`: Current saved/sent value, falling back to the default when no saved
  value exists.
- `min`: Numeric lower bound for `spin` options.
- `max`: Numeric upper bound for `spin` options.
- `choices`: Ordered list of `combo` choices.
- `rawMetadata`: Original UCI metadata for display/debugging.
- `editable`: True for `check`, `spin`, `combo`, and `string`; false for `button` and
  `unknown`.
- `persistent`: True for editable settings; false for `button` actions.

**Validation rules**:
- `check` values must normalize to true/false strings accepted by UCI.
- `spin` values must be numeric and within `min`/`max` when bounds are present.
- `combo` values must match one of `choices`.
- `string` values may be empty and are sent as text.
- `button` values must not be stored in saved settings.
- `unknown` values must not be editable from the dialog.

## DialogDraft

Represents the user's unsaved edits while the dialog is open.

**Fields**:
- `engineFilepath`: Current engine path captured when the dialog opens.
- `values`: Map of option key to draft value for editable persistent options.
- `dirtyKeys`: Set of option keys whose draft value differs from the current saved/sent
  value.
- `validationErrors`: Map of option key to user-facing validation message.

**State transitions**:
- `Opened`: Draft created from current engine metadata and saved settings.
- `Edited`: User changes one or more editable controls.
- `Validated`: User clicks save and all edited values pass validation.
- `Applied`: Valid edited values are sent to the current engine and saved.
- `Canceled`: Dialog closes without saving draft values.

## SavedEngineSettings

Represents persisted settings for one engine in `engines.json`.

**Fields**:
- `args`: Existing command-line arguments array.
- `options`: Existing object of option name to string/boolean/number-like value.
- `search_nodes`: Existing normal search limit.
- `search_nodes_special`: Existing auto-eval/play search limit.
- `limit_by_time`: Existing search limit mode.
- `unknownFields`: Any existing fields not interpreted by this feature.

**Validation rules**:
- Saving dialog edits may add, update, or remove only explicit option keys submitted from
  editable controls.
- Saving dialog edits must preserve `args`, search limit fields, and unknown fields.
- Unknown manual `options` entries not represented by editable controls must remain
  present.
