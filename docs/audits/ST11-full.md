# ST11 full collection audit

Date: 2026-08-20

Scope: ST11, descending to the lowest locally identifiable card ID. The
repository's committed catalog defines the audit inventory; it contains no
ST11 entries, so no card implementation can be audited or corrected without
inventing evidence.

## Inventory result

| Source | Result |
| --- | --- |
| `packages/shared/src/cards/data/cards.json` | 0 cards where `set === "ST11"` |
| `apps/api/src/cards/ST11/` | Directory absent |
| `packages/shared/src/effects/effects.json` | No `ST11` record |
| `apps/api/src/engine/effects/interpreter/compiledCards.ts` | No `ST11` record |
| `data/kb` via `node tools/kb/query.mjs card <ID>` | No entries for ST11-01 through ST11-16 |
| Git history in this checkout | No ST11 card or module path |

The adjacent committed starter decks use the `ST11-01` form (for example,
ST10 and ST12), not `SET-001`. The conventional candidate IDs ST11-01 through
ST11-16 were queried only to establish the blocker; they are not claimed to
be the authoritative ST11 inventory.

## Per-card ledger

Every candidate below is **N/V (not verified)**. No score is assigned and no
card receives 10/10 because the catalog, KB, direct module, compiled IR, and
behavioral proof are all unavailable.

| Card | Catalog | KB | Direct module | Compiled IR | Colocated test | Score/blocker |
| --- | --- | --- | --- | --- | --- | --- |
| ST11-16 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-15 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-14 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-13 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-12 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-11 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-10 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-09 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-08 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-07 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-06 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-05 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-04 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-03 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-02 | absent | no entry | absent | absent | absent | N/V — collection source absent |
| ST11-01 | absent | no entry | absent | absent | absent | N/V — collection source absent |

## Verification commands

- `corepack pnpm --filter @aegis/shared build`: blocked by missing
  `node_modules`; `tsc: not found`.
- `/home/vinicius/.local/bin/pnpm --filter @aegis/shared build`: blocked because
  the repository wrapper executes `corepack pnpm ""` and only prints pnpm
  help.
- Serial ST11 Vitest from `apps/api`: not runnable because the wrapper fails
  and no dependencies are installed; no pass is claimed.
- `pnpm typecheck`: not runnable for the same dependency/wrapper blocker.
- `git diff --check`: passed.

## Blockers and handoff

This audit cannot proceed to clause, timing, cost, target, zone, face, order,
or OPT verification until committed ST11 catalog records, KB entries, direct
modules, and compiled IR are supplied. No implementation or unrelated
collection was changed. The only delivery in this commit is this evidence
ledger.
