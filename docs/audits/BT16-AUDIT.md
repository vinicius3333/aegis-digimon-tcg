# BT16 Completed Card Audit

Status: complete — 102/102 cards have reproducible 10/10 evidence.

Audit date: 2026-09-01

This report supersedes `BT16-STATIC-AUDIT.md` and the provisional range reports
in `internal-docs/audits/BT16/`. The earlier files remain as historical review
notes.

## Scope and score

- Catalog scope: exactly `BT16-001` through `BT16-102`.
- Production scope: 102 direct TypeScript modules and 102 persisted IR records.
- Registration invariant: every production module has exactly one
  `registerIrCard(cardId, compiled)` call and no `registerCard` call.
- Runtime contract: every record has `coverage: "full"` and `residual: []`.
- Score model: catalog/rules, IR trace, behavioral proof, peer/stack proof, and
  delivery gates are each worth 2 points. Every card earned 2/2 in every
  component.

## Reproducible card evidence

Every card below has a direct focused test at
`apps/api/src/cards/BT16/<card-id>.test.ts`, a direct executable module at
`apps/api/src/cards/BT16/<card-id>.ts`, and a persisted-equality assertion in
`BT16-catalog-sync.test.ts`.

| Cards             | Focused evidence                                                                                                                  | Final score |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| BT16-001–BT16-010 | Inherited conditions, natural attacks, battles, deletion costs, Raid, Armor Purge, Retaliation, and legal alternate stacks        | 10/10 each  |
| BT16-011–BT16-020 | Natural play/evolution triggers, DNA and Partition, source-text gates, security removal, protection, and attack timing            | 10/10 each  |
| BT16-021–BT16-030 | Source trashing, exact-three branches, Search, DNA-only restrictions, Blast Digivolve provenance, and trash evolution             | 10/10 each  |
| BT16-031–BT16-040 | Exact color counts, Collision, security branches, DNA, reveal unions, cost replacement, and start-main evolution                  | 10/10 each  |
| BT16-041–BT16-050 | Retaliation, suspension, mandatory follow-ups, delayed restrictions, battle-source identity, and live trait auras                 | 10/10 each  |
| BT16-051–BT16-060 | Leave protection, token behavior, attack restrictions, security placement, source relocation, and effective play-cost scaling     | 10/10 each  |
| BT16-061–BT16-070 | Deleter provenance, Collision target switching, effect-play watchers, opponent choices, inherited attack effects, and Armor Purge | 10/10 each  |
| BT16-071–BT16-080 | Attack evolution, simultaneous deletion, name exclusions, reveal routing, DNA, Partition, and security behavior                   | 10/10 each  |
| BT16-081–BT16-090 | Option costs, Delay, targeting unions, digivolution routes, play-cost boundaries, and security activation                         | 10/10 each  |
| BT16-091–BT16-100 | DNA result binding, effect immunity, modal Delay, lowest-DP routing, Recovery, and security-origin effects                        | 10/10 each  |
| BT16-101–BT16-102 | Live DP auras, deletion causes, security-stack direction, once-per-turn behavior, and alternate evolution                         | 10/10 each  |

## Corrections completed in this pass

- BT16-015 now keeps its projected end-of-attack effects inside the printed
  `[Your Turn]` window. BT16-016 pays the printed evolution cost after applying
  its reduction, and BT16-025 limits the DNA unsuspend lock to opposing Digimon
  with one or fewer evolution cards.
- BT16-022 now allows the controller to choose any eligible evolution card to
  trash instead of implicitly selecting one position.
- BT16-023 and BT16-034 make their security-top costs explicit, preserving the
  printed zone and ordering constraint.
- BT16-051 now enforces the printed “can't leave the battle area except by
  deletion” rule across return-to-hand/deck/security, placement under another
  permanent, Link detachment, and movement to breeding. Normal deletion and
  rule removal at 0 DP remain legal, matching Q2642–Q2643.
- BT16-061 now fires when the host deletes another Digimon in battle or by an
  effect. The shared resolution and combat paths preserve the deleting
  permanent's identity, including copied/borrowed effects, while excluding
  deletions caused by another friendly Digimon and deletions of Tamers.
- BT16-066 assigns the printed choice to the opponent. BT16-067 and BT16-068
  now require an actual effect-play origin for their inherited watchers.
- BT16-074 explicitly trashes the top security card for its inherited cost and
  has natural proof that the bottom card remains in place.
- BT16-091, BT16-093, and BT16-094 gained natural behavioral proof for their
  DNA, immunity, modal, Delay, and Security paths. BT16-028 and BT16-030's
  natural scenarios now answer the legal printed-versus-alternate evolution
  cost choice instead of leaving the resolution pending.
- The synchronized-array test helpers now accept the iterable contract exposed
  by `ArraySchema`, restoring the workspace typecheck without changing runtime
  behavior.
- The persisted catalog is recalculated from the executable modules through
  `pnpm effects:sync:set -- --set BT16`; `pnpm effects:check:set -- --set BT16`
  is the reproducible drift check, and adding `--base origin/main` verifies the
  semantic diff scope. Exactly 88 BT16 records changed semantically and zero
  records outside BT16 changed.

## Executed gates

- Corrected-card focused suites: 17 files, 89 tests passed.
- Persisted catalog contract: 104 tests passed.
- BT16 collection: 107 files, 630 tests passed, one worker, no file parallelism.
- Core mechanisms: 9 files, 442 tests passed, one worker, no file parallelism.
- Synchronized-array regression suite: 2 files, 7 tests passed.
- Synchronization-tool unit suite: 5 tests passed.
- Shared and API builds passed with explicit 180- and 240-second limits.
- Workspace typechecks passed serially with an explicit 300-second limit.
- Oxlint and Oxfmt checks passed on the changed source files.
- `git diff --check` passed.
- Persisted semantic diff: 88 changed records, all 88 within BT16, zero outside
  the audited set.

All Vitest commands used explicit timeouts, `--maxWorkers=1`, and
`--no-file-parallelism`. Build, synchronization, formatting, and typecheck
commands also used explicit limits; workspace typechecks ran with concurrency 1.
