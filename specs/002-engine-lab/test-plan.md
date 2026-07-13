# Test Plan: Engine Laboratory MVP

## Pure module tests

Implement tests for `files/src/modules/engine_lab.js` before connecting it to the renderer.

### UCI parser

- Parse `cp`, `mate`, `wdl`, `multipv`, depth, seldepth, nodes, NPS, time and PV.
- Accept arbitrary token order and missing optional fields.
- Preserve `lowerbound` and `upperbound` as non-exact scores.
- Ignore `info string` as a normal search result.
- Return `null` for malformed or empty input.

### MultiPV and stale output

- Update only the matching `multipv` line.
- Default missing `multipv` to `1`.
- Clear all lines when a new search begins.
- Reject mismatched `sessionId`, `processGeneration`, `searchId`, `tabId` or `nodeId`.

### Comparison

- Detect equal and different best moves.
- Build the union of two MultiPV sets.
- Sort by support, rank points and deterministic move key.
- Handle cp versus WDL without false averaging.
- Keep mate separate from cp and detect opposite mate directions.
- Mark bound scores as preliminary.

### Thread allocation

- Even and odd budgets.
- Minimum budget for two sessions.
- Missing or invalid `Threads` support.
- Confirm that profile values are not mutated.

### State transitions

- Normal `stop -> bestmove`.
- Position replacement while searching.
- Two rapid position replacements.
- Process restart and generation invalidation.
- Missing `bestmove` timeout.
- Independent session failure.

## Renderer and integration verification

Run JavaScript syntax checks on changed files and `git diff --check`.

Manual checks from `files/src`:

- Stockfish + Stockfish.
- Stockfish + Lc0.
- Engine without MultiPV.
- Engine without WDL.
- Chess960.
- Rapid position changes.
- Independent stop and restart.
- Tab switching and tab closing.
- PV insertion as one Undo operation.
- Group persistence after restart.
- Application close during active search.
- Legacy analysis, play, auto-analysis, `searchmoves`, UCI settings, PGN and Undo/Redo.

Acceptance requires no remaining child engine processes after normal or forced application
shutdown.
