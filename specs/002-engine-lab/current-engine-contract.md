# Current Engine Contract

## Scope

This document records the single-engine behavior that the MVP must preserve while
adding a second independent UCI session.

## Creation and ownership

- `NewHub()` creates a dummy `hub.engine` in `files/src/renderer/95_hub.js`.
- `hub.engine_start()` creates a replacement with `NewEngine(this)`.
- The old engine is shut down only after the replacement has been created successfully.
- `hub.engine` is the compatibility reference used by the existing single-engine mode.

## Process and streams

- `NewEngine.setup(filepath, args)` starts a local child process with `child_process.spawn`.
- The working directory is the executable directory.
- Lc0 receives `--show-hidden` when that argument is absent.
- `readline.createInterface` reads `stdout` and `stderr` line by line.
- `stderr` is routed to `hub.err_receive()` and the shared log.
- `stdout` routes `bestmove`, `info`, UCI option lines and other messages to the engine or hub.

## UCI readiness

1. The hub sends `uci` after setup.
2. `option` lines populate `known_options` and `known_option_names`.
3. `uciok` sets `ever_received_uciok` and causes standard and saved options to be sent.
4. The hub sends `isready`.
5. `readyok` sets `ever_received_readyok`, halts the hub behavior and sends `ucinewgame`.
6. Searches are rejected until both readiness flags are true.

## Search state

The current engine exposes three `SearchParams` references:

- `search_running`: search currently sent to the process;
- `search_desired`: newest search requested by the hub;
- `search_completed`: search that produced the last relevant `bestmove`.

Changing a running search sends `stop`, stores the new request as `search_desired`,
waits for `bestmove`, and only then sends the new position and `go`. A halted search
uses the same stop/bestmove transition.

## Public compatibility surface

The following members must remain available through `hub.engine` in single-engine mode:

```javascript
send(msg, force)
set_search_desired(node, limit, limit_by_time, searchmoves)
send_ucinewgame()
in_960_mode()
setoption(name, value)
pressbutton(name)
shutdown()
known(name)
get_uci_option_rows()
send_ack_engine()
send_ack_setoption(name)
filepath
name
exe
known_options
known_option_names
sent_options
leelaish
ever_received_uciok
ever_received_readyok
search_running
search_desired
search_completed
setoption_queue
```

The following hub methods remain the legacy routing targets for the primary session:

```javascript
receive_misc(line)
receive_bestmove(line, node)
info_handler.receive(engine, search, line)
err_receive(line)
find_tab_for_node(node)
with_tab(tab, callback)
```

## Engine switching and persistence

- `switch_engine()` and `restart_engine()` replace the primary engine object only after
  the new process starts successfully.
- `engineconfig[filepath]` is the persistent entry selected by `filepath`.
- Existing `args`, `options`, search limits and unknown fields must remain intact.
- `set_uci_option(..., true)` persists an option and applies it to the primary process.

## Shutdown

- `hub.quit()` currently calls `hub.engine.shutdown()`, saves configuration, and sends
  `terminate` to the main process.
- The MVP must replace the direct shutdown call with `engine_manager.stop_all()` while
  preserving the existing Electron close fallback.

## Compatibility rule

The primary session must continue to serve all existing workflows. The secondary session
is comparison-only and must not enter play, self-play, legacy auto-analysis or the normal
single-engine `searchmoves` flow.
