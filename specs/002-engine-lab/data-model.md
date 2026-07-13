# Data Model: Engine Laboratory MVP

## EngineSession

```javascript
{
  sessionId,
  role: "primary" | "secondary",
  profileKey,
  enginePath,
  processGeneration,
  lifecycleState,
  uciState,
  name,
  knownOptions,
  sentOptions,
  temporaryOptions,
  activeTabId,
  activeNodeId,
  nextSearchId,
  activeSearch,
  pendingSearch,
  completedSearch,
  multipvResults,
  lastBestmove,
  lastError,
  startedAt,
  stoppedAt,
  shutdownRequested
}
```

`lifecycleState` is one of `not_started`, `starting`, `ready`, `failed`,
`shutting_down`, `terminated`. `uciState` is one of `idle`, `searching`,
`stopping`, `waiting_ready`.

## Search

```javascript
{
  searchId,
  processGeneration,
  tabId,
  nodeId,
  rootFen,
  moves,
  chess960,
  limitType,
  limitValue,
  searchmoves,
  startedAt,
  stoppedAt,
  state
}
```

Search state is one of `queued`, `running`, `stop_requested`, `completed`, `cancelled`,
`superseded`, `failed`. A new search becomes `pendingSearch`; `go` is sent only after the
previous search produces `bestmove` or reaches the stop timeout.

## Normalized result

```javascript
{
  sessionId,
  processGeneration,
  searchId,
  tabId,
  nodeId,
  multipv,
  depth,
  seldepth,
  timeMs,
  nodes,
  nps,
  score: {
    rawType: "cp" | "mate" | null,
    rawValue,
    normalizedQ,
    bound: "lower" | "upper" | null
  },
  wdl: {win, draw, loss} | null,
  pv,
  receivedAt
}
```

The MVP uses side-to-move perspective. `cp` uses `QfromPawns(cp / 100)` and WDL uses
the existing `QfromWDL` semantics. Mate remains a separate score domain.

## Comparison row

```javascript
{
  move,
  first: {rank, result, pv} | null,
  second: {rank, result, pv} | null,
  supportCount,
  rankPoints,
  comparable,
  consensusScore
}
```

Rows are sorted by support count, then rank points, then a deterministic move string.
No average is produced when score domains are incompatible.

## Tab state

Add to the tab state and `TAB_STATE_KEYS`:

```javascript
{
  engine_session_ids: [],
  engine_group_id: null,
  comparison_mode: false,
  comparison_results: null
}
```

Comparison sessions are bound to the active tab only in the MVP.

## Persistent configuration

Extend the existing `engines.json` root with a reserved `engine_lab` object:

```json
{
  "engine_lab": {
    "groups": [
      {
        "id": "stockfish-lc0",
        "name": "Stockfish + Lc0",
        "profiles": [
          {"profileId": "path-to-stockfish", "weight": 1},
          {"profileId": "path-to-lc0", "weight": 1}
        ],
        "schedulerMode": "balanced",
        "threadBudget": 8,
        "multiPV": 3
      }
    ]
  }
}
```

Existing path-keyed entries, unknown root fields and unknown entry fields must be preserved.
Group references use existing profile keys; no new UUID migration is introduced.
