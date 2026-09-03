# BT15 Completed Card Audit

Status: complete — 102/102 cards have reproducible 10/10 evidence.

Audit date: 2026-09-01

Typed revalidation date: 2026-09-02

This report supersedes `BT15-STATIC-AUDIT.md` and the provisional range reports
in `internal-docs/audits/BT15/`. The earlier files remain as historical review
notes.

## Scope and score

- Catalog scope: exactly `BT15-001` through `BT15-102`.
- Production scope: 102 direct TypeScript modules and 102 persisted IR records.
- Registration invariant: every production module has exactly one
  `registerIrCard(cardId, compiled)` call and no `registerCard` call.
- Runtime contract: every record has `coverage: "full"` and `residual: []`.
- Score model: catalog/rules, IR trace, behavioral proof, peer/stack proof, and
  delivery gates are each worth 2 points. Every card earned 2/2 in every
  component.

## Reproducible card evidence

Every card below has a direct focused test at
`apps/api/src/cards/BT15/<card-id>.test.ts`, a direct executable module at
`apps/api/src/cards/BT15/<card-id>.ts`, and a persisted-equality assertion in
`BT15-catalog-sync.test.ts`.

| Cards             | Focused evidence                                                                                                             | Final score |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------- |
| BT15-001–BT15-010 | Natural attacks and battles, inherited conditions, deletion origins, exact Security boundaries, and legal evolution stacks   | 10/10 each  |
| BT15-011–BT15-020 | Reveal routing, public play/evolution origins, optional branches, source costs, target limits, and inherited behavior        | 10/10 each  |
| BT15-021–BT15-030 | Source-count comparisons, effect-play provenance, Blast Digivolve, all-target effects, Blocker, and legal predecessor stacks | 10/10 each  |
| BT15-031–BT15-040 | End-turn play, stack comparisons, Security replacement, cost aliases, ACE paths, and inherited-effect exclusions             | 10/10 each  |
| BT15-041–BT15-050 | Opponent-end timing, recovery direction, suspension, immunity, Counter, reveal ordering, and breeding-area play              | 10/10 each  |
| BT15-051–BT15-060 | Alternate evolution gates, phase behavior, watcher ownership, deletion libraries, Blocker, Reboot, and reveal aliases        | 10/10 each  |
| BT15-061–BT15-070 | Legal stacks, suspension provenance, source placement, scoped costs, effect-play watchers, and battle deletion               | 10/10 each  |
| BT15-071–BT15-080 | Processing costs, leave prevention, battle binding, opponent choices, ACE behavior, redirect, and target ceilings            | 10/10 each  |
| BT15-081–BT15-090 | Breeding exclusions, reveal ordering, Security removal, attack redirect, Mind Link, Alliance, and lowest-level selection     | 10/10 each  |
| BT15-091–BT15-100 | Compound costs, replacement, mandatory follow-ups, duration, multi-hit reveal, cross-kind selection, and trash evolution     | 10/10 each  |
| BT15-101–BT15-102 | Deletion prevention, alternate evolution, mixed-zone reduction, top-card shedding, and last-placed entry behavior            | 10/10 each  |

## Corrections completed in this pass

- BT15-032 now interprets `[Plesiomon]/[X Antibody]` as a name-or-trait
  condition. Natural opponent-turn attack proof covers a non-Plesiomon Digimon
  with the X Antibody trait.
- BT15-065 now scopes both Numemon payment routes to this Digimon's evolution
  cards or the hand. Its natural evolution proof includes a competing Numemon
  beneath another friendly Digimon.
- BT15-072 now uses the supported `deleteOwn` cost primitive. Natural block and
  opponent-effect return paths prove both Blocker and the printed leave-area
  replacement, including the required Vilemon sacrifice.
- BT15-074 now requires an actual effect-play origin for its inherited watcher.
  Its tests prove the opponent's choice, fallback behavior, the positive
  effect-play path, and the negative manual-play boundary.
- BT15-071 through BT15-080 gained or strengthened natural public-action proof
  for costs, exact DP changes, inherited frequencies, Blast Digivolve,
  Overflow, breeding play, redirection, end-turn play, battle causes, and
  target ceilings. BT15-081 gained the Q2575 negative breeding-area boundary.
- The synchronized-array test helpers now accept the iterable contract exposed
  by `ArraySchema`, restoring the workspace typecheck without changing runtime
  behavior.
- The persisted catalog is recalculated from executable modules through
  `pnpm effects:sync:set -- --set BT15`; `pnpm effects:check:set -- --set BT15`
  is the reproducible drift check, and adding `--base origin/main` verifies the
  semantic diff scope.

## Typed revalidation

- Removed the remaining TypeScript suppressions from 100 direct modules; BT15-033 and BT15-092
  were already typed. BT15 now has zero `@ts-nocheck` directives, zero production
  `registerCard` calls, and zero `RawUnparsed` actions.
- Replaced stale IR shapes without casts: selection references carry typed targets, battle
  opponents use the target-level source reference, Apocalymon's mixed source zone is canonical,
  and self-scoped evolution and keyword targets use their supported filter forms.
- Added the printed turn duration to the white-only evolution restrictions on BT15-031,
  BT15-052, BT15-066, and BT15-079; scoped BT15-095's granted security trash to its owner; and
  made BT15-060 pay its reduced evolution cost.
- Limited BT15-040 to Digimon with Numemon in their name, BT15-072 to Apocalymon by name, and
  BT15-054/BT15-058 suspension choices to unsuspended targets. Positive and negative filter
  evidence prevents effect-text mentions from satisfying the name clauses.
- Made BT15-088's Sora-gated trash return mandatory, matching its printed `Then` clause, while
  preserving the preceding optional Tamer play.
- Added precise shared IR event types for opponent breeding moves, effect-driven security
  removal, and trash-to-hand returns. Each event was already emitted and consumed by the runtime.
- Reconciled an EX11-026 shared regression test left stale by the latest `main` merge: its ordinary
  green level-2 EvoCost is not exposed as an alternate digivolution requirement.
- `packages/shared/src/effects/effects.json` was regenerated with the scoped synchronization tool;
  it was not edited manually.

## Executed gates

- Typed/semantic focused cards: 25 files, 143 tests passed.
- Persisted catalog contract: 104 tests passed.
- BT15 collection: 103 files, 646 tests passed, one fork, no file parallelism.
- Core mechanisms: 9 files, 774 tests passed, one fork, no file parallelism.
- Shared suite: 8 files, 133 tests passed, one fork, no file parallelism.
- Synchronized state arrays: 6 files, 49 tests passed, one fork, no file parallelism.
- Web effect projection: 4 files, 131 tests passed, one fork, no file parallelism.
- Effect-snapshot synchronization tool: 10 tests passed.
- Shared build and shared, API, and web typechecks passed serially.
- Oxlint and Oxfmt passed on all changed TypeScript and documentation files.
- `git diff --check` passed.
- Persisted semantic diff: 80 changed records, all 80 within BT15, with zero semantic or byte
  changes outside the audited set; the subsequent scoped `--check` passed.

All Vitest commands used explicit timeouts, a single fork, and `--no-file-parallelism`. Builds,
synchronization, formatting, and workspace typechecks also used explicit limits and ran serially.
