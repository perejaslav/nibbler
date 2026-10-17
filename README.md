# Nibbler

Nibbler is a real-time chess analysis GUI for Leela Chess Zero (Lc0) and other UCI-compatible chess engines such as Stockfish.

It runs an engine in the background, continuously evaluates the current position, shows candidate moves visually, and lets you force analysis of selected moves. The project is historically based on the original Nibbler by Rooklift and is loosely inspired by Lizzie and Sabaki.

Current maintained fork: https://github.com/perejaslav/nibbler

Latest Windows release: https://github.com/perejaslav/nibbler/releases/tag/v3.3.3

![Screenshot](docs/images/screenshot.png?v=3.3.2)

## Highlights

- Real-time engine analysis for Lc0 and traditional UCI engines.
- Graphical display of top candidate moves.
- Winrate graph.
- Optional Leela statistics such as N, P, Q, S, U, V, and WDL.
- UCI `searchmoves` support.
- Automatic full-game analysis.
- Play against the engine from any position.
- Engine self-play from any position.
- PGN loading through menu, clipboard (Ctrl+V), or drag-and-drop.
- PGN variation support with arbitrary depth.
- FEN loading from clipboard or menu.
- Chess960 support.
- Analysis toolbar with quick access to engine controls, New game, FEN/PGN paste and copy, board flip, MultiPV, and focus clearing.
- Visual UCI engine settings dialog for standard engine options.
- Undo/Redo stack for tree operations (Edit menu, Ctrl+Z / Ctrl+Y).
- Own application icon (board with an evaluation graph) instead of the Electron default.
- Highlighted first moves of side variations in the move list.
- Modern Electron 44 (Chromium 152) platform.
- Automatic restoration of the last chess session, including all open games, variations, annotations, selected moves and active tab.

The current chess session is saved automatically every three seconds and when Nibbler closes normally. On the next launch, your game tabs and selected positions are restored. Snapshots are stored in `last-session.json` in Nibbler's `data` folder (with a `.bak` fallback); no manual PGN export is needed. Engine searches are not resumed automatically.

## What's new in 3.3.3

- **Fully portable.** The Windows build keeps all its data in a `data` folder next to `nibbler.exe`: settings (`config.json`), engines (`engines.json`), the last session, custom UCI scripts and the browser cache. Nothing is written to `%APPDATA%`. Copy the whole folder to another place or a USB drive, and it keeps working with the same settings.

## Installation

### Windows

1. Open the latest release page:
   https://github.com/perejaslav/nibbler/releases
2. Download `nibbler-3.3.3-windows.zip` or the newest available Windows archive.
3. Extract the archive to a folder of your choice.
4. Run `nibbler.exe`.
5. Configure your engine path from inside Nibbler if needed.

The 3.x Windows builds use Electron 44.7.0. Builds up to 2.9.5 used Electron 9.4.4.

Nibbler 3.3.3 and later is portable: all data lives in the `data` folder next to `nibbler.exe`. Extract it to a folder you can write to (not `Program Files`).

Upgrading from 3.3.2 or older: these versions kept data in `%APPDATA%\Nibbler`. Close Nibbler, then move that folder's contents into the `data` folder next to the new `nibbler.exe` (create the folder if needed). Without this step, the new build starts with default settings. Upgrading to a newer portable build: copy the old `data` folder next to the new `nibbler.exe`.

When you run from source (`electron .`), data still goes to `%APPDATA%\Nibbler`.

### Run from source

Nibbler can also be run directly from source. This is useful for development or quick local checks.

Requirements:

- Node.js / npm
- Electron

From the repository root:

```bash
cd files/src
npx electron .
```

A global Electron install also works:

```bash
npm install -g electron
electron .
```

Nibbler is a classic Electron application. It does not require a modern JavaScript build step for normal development.

### Linux and macOS

The upstream project historically provided install scripts for Linux and macOS. They may still be useful, but they may not install this fork's latest release.

Legacy upstream Linux script:

```bash
curl -L https://raw.githubusercontent.com/rooklift/nibbler/master/files/scripts/install.sh | bash
```

Legacy upstream macOS script:

```bash
curl -L https://raw.githubusercontent.com/rooklift/nibbler/master/files/scripts/install_mac.sh | bash
```

For this fork, prefer the Releases page unless you specifically want to build or run from source.

## Engine setup

Nibbler works best when a UCI-compatible engine is configured correctly.

For Lc0, see the official Lc0 quickstart and configuration documentation:

- https://lczero.org/play/quickstart/
- https://lczero.org/play/configuration/flags/

For Stockfish and other traditional UCI engines, typical important options include:

- `Threads`
- `Hash`
- `MultiPV`

For maximum strength in some engines, `MultiPV` should often be kept at `1`, while `Threads` and `Hash` should be set appropriately for your hardware.

## Engine options

Engine options can be configured in several ways.

### Visual UCI settings dialog

Use:

```text
Engine > Engine settings...
```

The dialog shows known options for the current engine and provides visual controls for standard UCI option types:

- `check` — checkbox
- `spin` — numeric input
- `combo` — dropdown list
- `string` — text field

Confirmed changes are saved and applied through the existing engine configuration flow where possible.

### Manual configuration

Advanced users can still use manual configuration:

- Lc0 can load options from `lc0.config` at startup.
- Nibbler can send UCI options stored in its own `engines.json` file, available from the Dev menu.

Manual configuration remains the safest option for engine-specific, unusual, or unsupported settings.

## Analysis tips

The UCI `searchmoves` feature is available from the Analysis menu. Once enabled, one or more moves can be selected as focus moves. The engine will ignore other moves. This is useful when a move appears under-analysed.

When browsing principal variations on the right side of the interface, Nibbler can show the PV on the board without changing the actual analysed position. Halting the engine while inspecting PVs can make this easier, because the displayed lines will not keep changing.

Long searches can consume significant memory. If your engine runs out of RAM, consider setting a reasonable node limit from the Engine menu.

## Development notes

Nibbler's runnable source lives under:

```text
files/src
```

Important files include:

```text
files/src/main.js
files/src/nibbler.html
files/src/nibbler.css
files/src/renderer/
```

The project intentionally keeps the renderer simple and does not require React, Vue, TypeScript migration, or a bundler for ordinary changes.

To run syntax checks on changed JavaScript files:

```bash
node --check files/src/main.js
node --check files/src/renderer/90_engine.js
node --check files/src/renderer/95_hub.js
node --check files/src/renderer/94_uci_options_dialog.js
```

To run the app locally:

```bash
cd files/src
npx electron .
```

## Releases

Current release:

- v3.3.3 — https://github.com/perejaslav/nibbler/releases/tag/v3.3.3
- Windows package: `releases/nibbler-3.3.3-windows.zip`

All releases:

- https://github.com/perejaslav/nibbler/releases

## Upstream and credits

This repository is a maintained fork of the original Nibbler project by Rooklift:

- https://github.com/rooklift/nibbler

Thanks to everyone in the original Discord and GitHub community who contributed advice, testing, and suggestions. Thanks also to all Lc0 developers and GPU-hours contributors.

The chess pieces are from Lichess:

- https://lichess.org/

Icon design by ciriousjoker, based on this icon:

- https://github.com/ciriousjoker
- https://www.svgrepo.com/svg/155301/chess

## License

Nibbler is licensed under GPL-3.0. See `LICENSE.md` for details.
