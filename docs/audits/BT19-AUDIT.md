# BT19 Completed Card Audit

Status: complete — 102/102 cards have reproducible 10/10 evidence.

Audit date: 2026-09-01

This report supersedes `BT19-STATIC-AUDIT.md` and the provisional range reports in
`internal-docs/audits/BT19/`. The earlier files remain as historical review notes.

## Scope and score

- Catalog scope: exactly `BT19-001` through `BT19-102`.
- Production scope: 102 direct TypeScript modules and 102 persisted IR records.
- Registration invariant: every production module has exactly one `registerIrCard(cardId, compiled)` call and no `registerCard` call.
- Runtime contract: every record has `coverage: "full"` and `residual: []`.
- Score model: catalog/rules, IR trace, behavioral proof, peer/stack proof, and delivery gates are each worth 2 points. Every card earned 2/2 in every component.

## Reproducible card evidence

Every card below has a direct focused test at
`apps/api/src/cards/BT19/<card-id>.test.ts`, a direct executable module at
`apps/api/src/cards/BT19/<card-id>.ts`, and a persisted-equality assertion in
`BT19-catalog-sync.test.ts`.

| Cards | Focused evidence | Final score |
| --- | --- | --- |
| BT19-001–BT19-010 | One focused test file per card, including natural attack/deletion/DigiXros flows and boundary controls | 10/10 each |
| BT19-011–BT19-020 | One focused test file per card, including public play/evolution/attack/deletion flows and inherited-stack controls | 10/10 each |
| BT19-021–BT19-030 | One focused test file per card, including Decode, Save, end-turn, security, and target-boundary controls | 10/10 each |
| BT19-031–BT19-040 | One focused test file per card, including source placement, replacement, recovery, and token flows | 10/10 each |
| BT19-041–BT19-050 | One focused test file per card, including real-turn, attack, prevention, security, and alternate-evolution flows | 10/10 each |
| BT19-051–BT19-060 | One focused test file per card, including hand/trash source, Royal Base, Save, attack, and inherited-keyword flows | 10/10 each |
| BT19-061–BT19-070 | One focused test file per card, including Collision, forced attack, DigiXros, deletion, and material-source flows | 10/10 each |
| BT19-071–BT19-080 | One focused test file per card, including independent targeting, replacement branches, security manipulation, and real turn-start memory | 10/10 each |
| BT19-081–BT19-090 | One focused test file per card, including real start-main processing, Device placement, color waivers, and security flows | 10/10 each |
| BT19-091–BT19-100 | One focused test file per card, including registered tokens, multicolor public Option plays, security effects, and optional inner actions | 10/10 each |
| BT19-101–BT19-102 | One focused test file per card, including result binding and same-host deletion/play-cost behavior | 10/10 each |

## Corrected production behavior

- BT19-010 and BT19-013 now source Save only from their own Digimon's digivolution cards.
- BT19-024 and BT19-027 now restrict Decode playback to the source Digimon's own stack.
- BT19-038 and BT19-044 no longer select an already-suspended Digimon for a suspension effect.
- BT19-051 now uses the executable hand/trash source field.
- BT19-073 independently selects the opponent Digimon that receives the digivolution restriction.
- BT19-074 models the level-6 deletion and 10-trash deletion as exclusive `instead` branches.
- BT19-075 observes either player's other deletion and uses the canonical opponent-security trash operation.
- BT19-078 installs its inherited watcher under DP-bearing Digi-Egg hosts such as Mother D-Reaper and filters the attack subject to an opponent's Digimon.
- BT19-080 uses the executable `SetMemory` value and `memoryAtMost` condition fields.
- BT19-086 pays its Device placement cost from hand, as printed.
- BT19-091 uses the token registry's exact WarGrowlmon, Taomon, and Rapidmon token identifiers; those tokens now have their printed colors, 6000 DP, no level, and no play cost.
- BT19-100 keeps the Security effect mandatory while making only its inner play action optional.
- BT19-102 binds the selected host so deletion and play-from-sources cost act on the same Digimon.

## Executed gates

- BT19 collection: 107 files, 585 tests passed, one worker, no file parallelism.
- Core mechanisms: 15 files, 703 tests passed, one worker, no file parallelism.
- Primitive mechanisms: 1 file, 138 tests passed, one worker, no file parallelism.
- Persisted IR and registration: 104 assertions passed for all 102 cards.
- Synchronized-array baseline repair: 2 files, 7 tests passed.
- Shared token registry: 1 file, 4 tests passed.
- Shared build and all workspace typechecks: passed serially.
- Oxlint: passed with repository-baseline warnings only.
- Oxfmt check: all 99 changed TypeScript files passed.
- `git diff --check`: passed.
- Persisted semantic diff: 84 changed records, all 84 within BT19, zero outside the audited set.

All test commands used explicit timeouts, `--maxWorkers=1`, and
`--no-file-parallelism` where supported.
