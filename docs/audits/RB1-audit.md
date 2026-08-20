# RB1 card-by-card audit

Scope: committed RB1 catalog entries, descending from `RB1-036` to `RB1-001`.
The catalog contains 33 cards (the published IDs are not contiguous). Each
entry was checked against `packages/shared/src/cards/data/cards.json`,
`node tools/kb/query.mjs card <ID>`, the direct module, and the corresponding
`packages/shared/src/effects/effects.json` entry.

Runtime status: **not verified**. `corepack pnpm` is available, but the
workspace has no Vitest executable/dependencies (`Command "vitest" not found`).
Consequently no card receives 10/10: the ten-point rubric requires behavioral
runtime evidence, and the focused Vitest, serial low-memory suite, and
typecheck cannot currently be executed.

## Atomic wave 01 — RB1-036 through RB1-030

| Card | Catalog | KB | Direct module | Compiled IR | Colocated behavior test | Result |
| --- | --- | --- | --- | --- | --- | --- |
| RB1-036 | checked | Q4112 | `apps/api/src/cards/RB1/RB1-036.ts` | `effects.json` / full | missing | not verified; no 10/10 |
| RB1-035 | checked | Q4109–Q4111 | `apps/api/src/cards/RB1/RB1-035.ts` | `effects.json` / full | `RB1-035.test.ts` | not verified; no 10/10 |
| RB1-034 | checked | Q4101, Q4108 | `apps/api/src/cards/RB1/RB1-034.ts` | handwritten module | missing | not verified; no 10/10 |
| RB1-033 | checked | no entry | `apps/api/src/cards/RB1/RB1-033.ts` | handwritten module | `RB1-033.test.ts` | implementation corrected; runtime not verified |
| RB1-032 | checked | no entry | `apps/api/src/cards/RB1/RB1-032.ts` | `effects.json` / full | missing | not verified; no 10/10 |
| RB1-031 | checked | Q4107 | `apps/api/src/cards/RB1/RB1-031.ts` | `effects.json` / full | missing | not verified; no 10/10 |
| RB1-030 | checked | Q4104–Q4106 | `apps/api/src/cards/RB1/RB1-030.ts` | `effects.json` / full | `RB1-030.test.ts` | not verified; no 10/10 |

Evidence notes for this wave:

- RB1-033's previously documented residual was real: its printed unsuspend
  clause was absent from the direct module. It now uses the existing
  `OnUnTappedAnyone` seam, gates on the exact self permanent and owner turn,
  and uses the existing per-turn timing builder. The test covers the positive
  production unsuspend path.
- RB1-034's former `intoInstanceId` comment was reviewed against the actual
  `whenOneOfYoursDigivolves` payload. `subjectPermanentId` is the completed
  evolution permanent and its top card is the printed destination card, so no
  correction was justified from the available evidence.
- RB1-036, RB1-031, RB1-030, RB1-015, RB1-009, and RB1-005 were checked for
  alternate evolution requirements, text/name filters, placement costs, order,
  optionality, and once-per-turn identity. Their compiled records report full
  coverage, but this is static evidence only.

## Collection inventory and remaining waves

| Wave | IDs | Status |
| --- | --- | --- |
| 01 | 036–030 | audited statically; runtime blocked |
| 02 | 029–025 | statically audited; RB1-025 has an explicit missing primitive; runtime blocked |
| 03 | 024–020 | statically audited; runtime blocked |
| 04 | 019–015 | statically audited; RB1-019 has an explicit missing primitive; runtime blocked |
| 05 | 014–008 | statically audited; runtime blocked |
| 06 | 005–001 | statically audited; runtime blocked |

All 33 catalog IDs currently have a direct RB1 module, a registry import in
`apps/api/src/cards/RB1/index.ts`, and a compiled-IR key or handwritten module.
Only `RB1-030.test.ts`, `RB1-033.test.ts`, and `RB1-035.test.ts` existed before
this audit.

## Static findings for waves 02–06

The following entries reached the same four-source comparison, but cannot be
called complete without colocated behavioral proof and runnable verification:

| Card range | Paths inspected | Evidence result |
| --- | --- | --- |
| RB1-029–RB1-025 | `apps/api/src/cards/RB1/RB1-029.ts` through `RB1-025.ts`; matching catalog/KB/IR records | RB1-025 compiled IR explicitly retains `missing-primitive(unaudited)` for `[End of Your Turn]` attack; the remaining cards have no catalog-vs-KB contradiction found statically |
| RB1-024–RB1-020 | direct modules, catalog, KB Q&A where present, compiled entries | no correction justified statically; no colocated tests for these cards |
| RB1-019–RB1-015 | direct modules, catalog, KB Q&A where present, compiled entries | RB1-019 explicitly retains `missing-primitive(unaudited)` for placing all level 3 Digimon face down on security; no correction made without a verified zone/face/order primitive |
| RB1-014–RB1-008 | direct modules, catalog, KB Q&A where present, compiled entries | no correction justified statically; no colocated tests for these cards |
| RB1-005–RB1-001 | direct modules, catalog, KB Q&A where present, compiled entries | no correction justified statically; no colocated tests for these cards |

The compiled IR entries for RB1-033 and RB1-034 retain stale partial/residual
metadata from before their handwritten implementations. This is a provenance
discrepancy, not evidence that the handwritten modules are correct at runtime;
it remains a blocker until the runtime suite can exercise the direct modules.

## Verification blockers

1. `pnpm` is absent from PATH; `corepack pnpm --version` succeeds.
2. Vitest is not installed in the workspace, so focused tests and the serial
   low-memory collection run are not verifiable.
3. TypeScript dependencies/tooling are likewise not runnable until workspace
   dependencies are present.
4. RB1-033's new test and implementation require the missing runtime before
   the correction can be promoted from evidence-backed static change to a
   completed behavioral result.
5. Atomic commit delivery is blocked by the linked worktree's shared Git
   object database being read-only. The requested temporary-index,
   `write-tree`/`commit-tree`/`update-ref` route was attempted and failed
   before an object could be written; no ref was changed and no user change
   was discarded.
