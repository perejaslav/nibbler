# Feature Specification: Engine Laboratory MVP

**Feature Branch**: `002-engine-lab`
**Status**: Planned

## Goal

Add an optional comparison mode that analyzes the active position with two independent
local UCI processes while preserving the existing one-engine mode as the default.

## In scope

- Select two already configured engine profiles.
- Start two independent processes and send both the same position.
- Maintain independent UCI, search, MultiPV and error state.
- Display two result cards and a combined candidate table.
- Compare `cp`, `mate`, `wdl` and `multipv` results.
- Stop or restart either session independently.
- Apply a temporary total `Threads` budget without changing profile settings.
- Add a selected complete PV to the active tab's tree as one Undo operation.
- Save and restore the selected pair as an analysis group.
- Shut down all child processes on application exit.

## Out of scope

Background-tab analysis, more than two engines, whole-game analysis, tournaments, remote
or cloud engines, GPU scheduling, profile UUIDs, profile import/export, automatic engine
downloads, persistent `Threads`/`Hash` changes, mate/centipawn averaging and natural-language
explanations.

## User flow

1. The user opens `Engine -> Compare engines...`.
2. The user selects two different existing profile keys, a group name, total thread budget
   and MultiPV.
3. The manager starts the primary and secondary sessions.
4. Both sessions receive the active tab's FEN, move history, Chess960 state and limits.
5. Each card updates independently; the combined table is derived from the latest complete
   MultiPV line per engine.
6. The user can stop, restart or add a selected PV from either card.
7. The user can save the pair as a group in the existing engine configuration file.

## Compatibility requirements

- `hub.engine` remains the primary session compatibility reference.
- Single-engine analysis, play modes, auto-analysis, `searchmoves`, UCI settings, tabs,
  PGN, Undo/Redo and Chess960 keep their existing behavior.
- Entering comparison mode must not make the secondary session visible to legacy hub logic.
- Leaving comparison mode stops the secondary session and restores the normal primary mode.

## Acceptance criteria

- Two different configured engines run concurrently on the same node.
- A delayed line from an old search or process generation is ignored.
- Stopping or crashing one process leaves the other usable.
- Each card shows state, engine name, best move, score, depth, seldepth, nodes, NPS, time,
  MultiPV, PV and an error message when applicable.
- The table does not display an average when score types are not comparable.
- Mate is kept separate from centipawn and never averaged with it.
- A complete legal PV is inserted atomically and appears as one Undo operation.
- Groups persist without deleting legacy engine entries or unknown configuration fields.
- Closing the app leaves no child engine processes.
