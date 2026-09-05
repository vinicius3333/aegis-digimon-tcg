# EX2 Card-by-Card Runtime Audit — 2026-09-03

Scope: all 74 catalog cards from `EX2-001` through `EX2-074`. Every card was checked in ascending ID order against the committed catalog record, the local card knowledge base, its direct `registerIrCard` module, the shared primitives it uses, relevant peer implementations, and observable runtime behavior.

## Result

- Catalog: 74 contiguous records, `EX2-001` through `EX2-074`.
- Direct modules/tests: 74/74 present.
- Registration: every EX2 module uses `registerIrCard`; no EX2 module calls `registerCard`.
- Focused serial proof: 74/74 files and 310/310 tests passed after the matching `node tools/kb/query.mjs card <CARD-ID>` query.
- Full collection proof: 85/85 files and 328/328 tests passed twice consecutively, including 11 EX2 line/deck suites.
- Final verdict: 74/74 cards are complete at 10/10; no residual EX2 rules gap remains.

## Corrected runtime findings

| Area                        | Finding and correction                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX2-028 Parasitemon         | Its End of Attack relocation now excludes itself, moves the permanent under the chosen other Digimon at the bottom, and trashes its former digivolution cards.                                                                                                                                                                                        |
| EX2-048 ADR-04 Bubbles      | `PlaceUnder` now models a destination Mother D-Reaper and a source selected across hand/battle area; the Security effect is marked as Security execution.                                                                                                                                                                                             |
| EX2-051 ADR-07 Palates Head | Declaration-time deletion targeting now rejects activation with no legal target while preserving dynamic/scaled deletion paths; declining the suspension cost aborts the payload.                                                                                                                                                                     |
| EX2-057 Kenta Kitagawa      | Passive `wouldBePlayed` cost reducers are now consulted, blocked, stacked, consumed, and kept distinct from interactive replacement reducers.                                                                                                                                                                                                         |
| EX2-058 Jeri Kato           | Suspending Jeri is now the optional SubTrigger cost, so declining or being unable to pay prevents the entire attack-response draw.                                                                                                                                                                                                                    |
| EX2-060 Rika Nonaka         | Suspending Rika is now the activation cost for the complete Plug-In sequence rather than a separate optional action.                                                                                                                                                                                                                                  |
| Continuous recomputation    | Concurrent continuous-effect rebuilds previously exposed the clear-before-refill interval and could erase Ryo's armed `whenAttacking` watcher. External requests now wait and coalesce one final pass; true re-entrancy inside the pass remains a no-op. A deterministic scheduler regression and the real Ryo/Cyberdramon attack prove the boundary. |
| Collection fixtures         | Active EX2 fixture modules are imported explicitly, optional reactions are resolved deliberately, turn-transition fixtures retain a legal Main action, and Blue Card now proves Renamon/Kyubimon follow-up timing under Q3305 and Q3363–Q3364. This removes file-order dependence under Vitest's intentional `isolate: false` mode.                   |

Previously corrected EX2-037, EX2-043, EX2-046, EX2-049, and EX2-055 behavior was re-exercised through the strengthened focused and collection suites. EX2-034's apparent transition failure was a fixture auto-end: giving the opponent a legal Main action proved the production aura transition without an engine change.

## Card ledger

| Card    | Name                     | Focused runtime proof | Score |
| ------- | ------------------------ | --------------------- | ----- |
| EX2-001 | Gigimon                  | 2/2 passed            | 10/10 |
| EX2-002 | Xiaomon                  | 3/3 passed            | 10/10 |
| EX2-003 | Viximon                  | 2/2 passed            | 10/10 |
| EX2-004 | Gummymon                 | 2/2 passed            | 10/10 |
| EX2-005 | Hopmon                   | 3/3 passed            | 10/10 |
| EX2-006 | Yaamon                   | 3/3 passed            | 10/10 |
| EX2-007 | Mother D-Reaper          | 9/9 passed            | 10/10 |
| EX2-008 | Guilmon                  | 4/4 passed            | 10/10 |
| EX2-009 | Growlmon                 | 4/4 passed            | 10/10 |
| EX2-010 | WarGrowlmon              | 4/4 passed            | 10/10 |
| EX2-011 | Gallantmon               | 4/4 passed            | 10/10 |
| EX2-012 | Megidramon               | 11/11 passed          | 10/10 |
| EX2-013 | Labramon                 | 2/2 passed            | 10/10 |
| EX2-014 | IceDevimon               | 2/2 passed            | 10/10 |
| EX2-015 | Seasarmon                | 2/2 passed            | 10/10 |
| EX2-016 | Gorillamon               | 4/4 passed            | 10/10 |
| EX2-017 | Leomon                   | 3/3 passed            | 10/10 |
| EX2-018 | MarineAngemon            | 2/2 passed            | 10/10 |
| EX2-019 | Renamon                  | 2/2 passed            | 10/10 |
| EX2-020 | Lopmon                   | 3/3 passed            | 10/10 |
| EX2-021 | Kyubimon                 | 2/2 passed            | 10/10 |
| EX2-022 | Antylamon                | 5/5 passed            | 10/10 |
| EX2-023 | Taomon                   | 2/2 passed            | 10/10 |
| EX2-024 | Sakuyamon                | 3/3 passed            | 10/10 |
| EX2-025 | Terriermon               | 3/3 passed            | 10/10 |
| EX2-026 | Gargomon                 | 3/3 passed            | 10/10 |
| EX2-027 | Rapidmon                 | 3/3 passed            | 10/10 |
| EX2-028 | Parasitemon              | 4/4 passed            | 10/10 |
| EX2-029 | MegaGargomon             | 2/2 passed            | 10/10 |
| EX2-030 | Monodramon               | 2/2 passed            | 10/10 |
| EX2-031 | Guardromon               | 2/2 passed            | 10/10 |
| EX2-032 | Strikedramon             | 5/5 passed            | 10/10 |
| EX2-033 | Locomon                  | 2/2 passed            | 10/10 |
| EX2-034 | Andromon                 | 3/3 passed            | 10/10 |
| EX2-035 | Cyberdramon              | 4/4 passed            | 10/10 |
| EX2-036 | GroundLocomon            | 3/3 passed            | 10/10 |
| EX2-037 | Reapermon                | 3/3 passed            | 10/10 |
| EX2-038 | Justimon: Blitz Arm      | 5/5 passed            | 10/10 |
| EX2-039 | Impmon                   | 6/6 passed            | 10/10 |
| EX2-040 | Devidramon               | 3/3 passed            | 10/10 |
| EX2-041 | Dobermon                 | 3/3 passed            | 10/10 |
| EX2-042 | Mephistomon              | 3/3 passed            | 10/10 |
| EX2-043 | Gulfmon                  | 7/7 passed            | 10/10 |
| EX2-044 | Beelzemon                | 5/5 passed            | 10/10 |
| EX2-045 | Calumon                  | 10/10 passed          | 10/10 |
| EX2-046 | ADR-02 Searcher          | 6/6 passed            | 10/10 |
| EX2-047 | ADR-03 Pendulum Feet     | 3/3 passed            | 10/10 |
| EX2-048 | ADR-04 Bubbles           | 5/5 passed            | 10/10 |
| EX2-049 | ADR-01 Jeri              | 4/4 passed            | 10/10 |
| EX2-050 | ADR-05 Creep Hands       | 3/3 passed            | 10/10 |
| EX2-051 | ADR-07 Palates Head      | 3/3 passed            | 10/10 |
| EX2-052 | ADR-06 Horn Striker      | 4/4 passed            | 10/10 |
| EX2-053 | ADR-08 Optimizer         | 6/6 passed            | 10/10 |
| EX2-054 | ADR-09 Gatekeeper        | 5/5 passed            | 10/10 |
| EX2-055 | Reaper                   | 8/8 passed            | 10/10 |
| EX2-056 | Takato Matsuki           | 6/6 passed            | 10/10 |
| EX2-057 | Kenta Kitagawa           | 6/6 passed            | 10/10 |
| EX2-058 | Jeri Kato                | 4/4 passed            | 10/10 |
| EX2-059 | Shu-Chong Wong           | 4/4 passed            | 10/10 |
| EX2-060 | Rika Nonaka              | 14/14 passed          | 10/10 |
| EX2-061 | Henry Wong               | 4/4 passed            | 10/10 |
| EX2-062 | Ryo Akiyama              | 4/4 passed            | 10/10 |
| EX2-063 | Kazu Shioda              | 5/5 passed            | 10/10 |
| EX2-064 | Alice McCoy              | 5/5 passed            | 10/10 |
| EX2-065 | Ai & Mako                | 7/7 passed            | 10/10 |
| EX2-066 | Offensive Plug-In A      | 4/4 passed            | 10/10 |
| EX2-067 | Fire Ball                | 4/4 passed            | 10/10 |
| EX2-068 | High-Speed Plug-In D     | 4/4 passed            | 10/10 |
| EX2-069 | Fist of the Beast King   | 4/4 passed            | 10/10 |
| EX2-070 | Digivolution Plug-In S   | 6/6 passed            | 10/10 |
| EX2-071 | Death Slinger            | 4/4 passed            | 10/10 |
| EX2-072 | Blue Card                | 6/6 passed            | 10/10 |
| EX2-073 | Gallantmon: Crimson Mode | 4/4 passed            | 10/10 |
| EX2-074 | Beelzemon: Blast Mode    | 4/4 passed            | 10/10 |

## Validation gates

- Effects projection: `pnpm effects:sync:set -- --set EX2` synchronized 74 records; `pnpm effects:check:set -- --set EX2` passed.
- Focused serial: 74 files, 310 tests, all passing; no focused result was inferred from a grouped run.
- Full collection: `pnpm --filter @aegis/api exec vitest run src/cards/EX2 --reporter=dot` passed twice consecutively with 85 files, 328 tests, and no skips (11.20 s and 13.41 s).
- Shared mechanism/conformance/lifecycle suites: 56 files, 1,610 tests, and no skips passed after the final concurrency regression was added.
- Post-review focused scheduler/combat/security gate: 5 files and 58 tests passed after the stale fixed-tick combat fixture was changed to await the closing `securityChecked` event.
- Typecheck/build: root typecheck and shared/API/web builds passed.
- Quality: scoped Oxlint and Oxfmt checks passed for every branch-modified source, test, and documentation file; the generated effects projection was validated through its canonical sync/check commands. `git diff --check` passed. The repository-wide formatter still reports unrelated pre-existing debt outside this branch.
- Independent review: the scheduler-related test synchronization finding was corrected and its focused gate passed; no Critical or remaining Important finding blocks EX2. The final delta review reported no findings and marked the branch ready.

## Remaining queue

EX2 has no remaining card. Continue with EX3.
