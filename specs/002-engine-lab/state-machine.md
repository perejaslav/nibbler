# State Machine: Engine Laboratory MVP

## Session lifecycle

```text
not_started -> starting -> ready
starting -> failed
ready -> shutting_down -> terminated
ready -> failed
failed -> starting
```

`failed` is local to one session. The other session remains unchanged.

## Search lifecycle

```text
queued -> running -> stop_requested -> completed
queued -> cancelled
queued -> superseded
running -> failed
stop_requested -> failed
```

Rules:

1. `go` creates an internal `searchId` and binds the search to the current
   `processGeneration`, tab and node.
2. UCI output has no search ID; while a process is alive, `info` belongs to
   `activeSearch`.
3. A replacement search is stored as `pendingSearch` and sends `stop` first.
4. No replacement `position` or `go` is sent before `bestmove` or the 3000 ms stop timeout.
5. On replacement, old MultiPV results are discarded before the new search starts.
6. Output captured by an old process-generation handler is ignored.
7. A result is accepted only when its session, process generation, search, tab and node match
   the active comparison request.

## Stop and restart

Analysis stop sends `stop` and keeps the process alive. Restart stops the search, sends
`quit`, waits for `exit`, force-kills after the timeout if necessary, increments
`processGeneration`, starts a fresh process and performs the complete UCI handshake.

## Tab switching

When comparison mode is active and the user switches tabs:

1. Stop both searches.
2. Wait for `bestmove` or the stop timeout.
3. Clear displayed comparison results.
4. Keep sessions ready but detach them from the old node.
5. Do not automatically analyze the new tab.

Closing the bound tab stops both sessions and clears their node association before the tab
is removed.

## Application shutdown

`engine_manager.stop_all()` stops active searches, sends `quit` to every session, force-kills
remaining processes after the bounded timeout, and resolves only after all sessions are
terminated. The existing Electron close fallback remains as a final safety net.
