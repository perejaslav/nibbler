# Feature Specification: Engine Benchmark

**Feature Branch**: `003-engine-benchmark`
**Status**: Implemented in 3.2.0; checked by hand in the Electron app on a full 20-position run

## Goal

Measure the speed and search depth of a configured UCI engine on a fixed set of positions, with a
fixed time per position, so that engines, option sets (Threads, Hash, Backend, WeightsFile) and
machines can be compared with each other.

## In scope

- `Engine -> Benchmark...` opens a dialog.
- Choose an existing engine profile (default: the current engine), seconds per position (1-600),
  number of positions (1-20) and whether to clear the hash before each position (on by default).
- The 20 built-in positions are the first 20 plain FENs of Stockfish's default bench list
  (`src/benchmark.cpp`, `Defaults`), in the same order. Entries with a move list or Chess960 are skipped.
- One warm-up position runs first (the first built-in position) and is never reported. Then the
  chosen positions run with `go movetime`.
- Per position: depth, seldepth, nodes, time, NPS, best move, status.
- Summary: total nodes and time, weighted NPS (sum of nodes / sum of time), median NPS, depth
  average / min / max, time to depth 5, 10, 15 and 20 (median over the positions that reached it),
  and failures grouped by status.
- Report copied to the clipboard as plain text. The header names the engine, its saved options,
  the time per position, the number of positions, the platform and the date.
- Stop at any time. The run also stops when the engine exits or fails.

## Out of scope

- A node- or depth-limited mode (a possible later option, like Stockfish `bench`).
- Saving a history of runs, charts, or a two-engine comparison in one run.
- User-supplied position files.
- Repeated runs and averaging. The user repeats a run by hand.
- Changing engine options. The benchmark uses the profile's saved options and forces MultiPV 1.

## User flow

1. `Engine -> Benchmark...`
2. Check the settings and press Run. Analysis must be halted first; the dialog says so if it is not.
3. Results appear per position. Stop ends the run early.
4. Copy report.

## Compatibility requirements

- The benchmark runs in its own engine process. It never sends commands to the primary engine or to
  comparison sessions.
- It refuses to start while the primary engine is searching, while the behaviour is not Halt, while
  a comparison session exists, or while a game analysis queue is still running.
- No new packages and no build step. Renderer scripts are loaded by `nibbler.html`, and the pure
  logic lives in `files/src/modules`.

## Acceptance criteria

- Every benchmark position is a legal-looking FEN with one king per side and six fields. Tests check
  this for the built-in list.
- The warm-up result never appears in the summary, the table or the report.
- MultiPV lines other than 1, and `info string` lines, do not change any result.
- A search that has no `bestmove` within the time limit plus a grace period is stopped and recorded
  as `timeout`. An engine that does not answer `stop` ends the run with an error.
- Info and bestmove events from another search (another node) are ignored.
- An engine exit or error ends the run with an error and shuts the benchmark engine down.
- Closing the app leaves no benchmark engine process running.

## Manual checks (Electron, from source)

- Run `cd files/src && electron .`, pick an engine with a saved profile, halt analysis, run the
  benchmark with 3 positions, and check that the table fills in and the report copies.
- Run it with analysis still going. The dialog must refuse to start.
- Stop in the middle. The run must end with `stopped` for that position.
- Compare the NPS roughly with the engine's own benchmark on the same machine (`lc0 benchmark`, or
  Stockfish `bench`). The methods differ, so only the order of magnitude should match.
