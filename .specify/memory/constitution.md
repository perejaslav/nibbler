<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- Template principle 1 -> I. Source Is the Product
- Template principle 2 -> II. Preserve Engine Compatibility
- Template principle 3 -> III. Manual Verification Is Mandatory
- Template principle 4 -> IV. Minimal Vanilla Renderer Changes
- Template principle 5 -> V. User Configuration Safety
Added sections:
- Project Constraints
- Development Workflow
Removed sections:
- None
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
- ✅ .specify/templates/commands/*.md (directory absent)
- ✅ README.md (reviewed; no principle references required changes)
- ✅ AGENTS.md (reviewed; already aligned with project constraints)
Follow-up TODOs:
- None
-->
# Nibbler Constitution

## Core Principles

### I. Source Is the Product

Nibbler's runnable application source lives under `files/src`. Changes MUST keep the
development path runnable with `cd files/src && electron .` and MUST NOT introduce a
required build, bundling, transpilation, or framework step for normal development.

Rationale: Nibbler is distributed as an Electron application whose development model is
the app source itself; extra build layers increase maintenance risk for a small desktop
tool.

### II. Preserve Engine Compatibility

Changes that affect engine startup, analysis flow, UCI command handling, Leela Chess Zero
integration, or traditional UCI engine behavior MUST preserve existing user workflows
unless the feature specification explicitly approves a breaking change. Engine-facing
behavior MUST account for Lc0 first and MUST avoid assumptions that exclude Stockfish-like
engines when the existing code supports them.

Rationale: The primary product value is reliable real-time chess engine analysis, and
small protocol regressions can make the GUI unusable.

### III. Manual Verification Is Mandatory

Every behavior change MUST include a documented manual verification path because the
project has no automated test suite. The minimum verification path MUST state how to run
the app, which UI or engine workflow was exercised, and what observable result proves the
change works. Automated tests MAY be added when practical, but they do not replace manual
Electron verification for UI or engine behavior.

Rationale: The app depends on Electron UI state and external engine processes, so passing
static checks alone is insufficient evidence.

### IV. Minimal Vanilla Renderer Changes

Renderer changes MUST use the existing vanilla JavaScript, HTML, and CSS structure under
`files/src/renderer`, `files/src/nibbler.html`, and `files/src/nibbler.css`. New
frameworks, package managers, generated assets, or broad file reorganizations MUST NOT be
introduced unless the specification includes a concrete migration plan and compatibility
risk review. Script load order and numbered renderer file conventions MUST be preserved.

Rationale: The renderer is intentionally simple and order-dependent; framework or
structure churn creates regressions disproportionate to typical feature size.

### V. User Configuration Safety

Changes that read, write, migrate, or reinterpret user configuration MUST preserve
existing user settings unless a documented migration is required. Config changes MUST
handle missing or partial data and MUST avoid deleting unknown user-provided fields.

Rationale: User engine paths, options, and preferences are difficult to reconstruct and
are stored outside the repository in Electron's user data path.

## Project Constraints

- The supported development Electron baseline is the existing application runtime; newer
  Electron behavior MUST NOT be assumed without manual verification.
- The main process entry point is `files/src/main.js`; renderer scripts are loaded from
  `files/src/ibbler.html` and related HTML/CSS files.
- The app runs with `contextIsolation: false` and `nodeIntegration: true`; security or
  dependency changes MUST account for that runtime model.
- Build changes for packaged releases MUST remain compatible with
  `python files/scripts/builder.py` and Electron release archives under
  `files/scripts/electron_zipped/`.

## Development Workflow

- Feature specs MUST identify impacted user workflows, including chess engine workflows
  when applicable.
- Implementation plans MUST include a Constitution Check covering runtime path, engine
  compatibility, manual verification, renderer architecture, and config safety.
- Task lists MUST include explicit manual verification tasks for each changed behavior.
- Reviews MUST reject changes that cannot be exercised from source or that omit the
  verification evidence required by Principle III.

## Governance

This constitution supersedes conflicting project guidance for Spec Kit planning and task
generation. Amendments require a documented rationale, an explicit semantic version bump,
and synchronization of affected templates or runtime guidance in the same change.

Versioning follows semantic versioning:
- MAJOR for removing or redefining principles in a backward-incompatible way.
- MINOR for adding principles, sections, or materially expanding governance.
- PATCH for clarifications, wording fixes, and non-semantic refinements.

Compliance review is required during planning and before completion. Any approved
exception MUST be recorded in the feature plan's Complexity Tracking section with the
reason, rejected simpler alternative, and verification impact.

**Version**: 1.0.0 | **Ratified**: 2026-05-12 | **Last Amended**: 2026-05-12
