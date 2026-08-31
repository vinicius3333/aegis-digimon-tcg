# ST17 Audit Ledger

Date: 2026-08-30. The 13 catalog cards were audited in ascending order against
the complete catalog contract and local rules KB, then traced through compiled
IR, shared primitives, and colocated behavioral tests. Each row has five
independently verified 2/2 components and a 10/10 total.

| Card (exact name)        | Catalog | KB/rules       | Direct implementation                                                               | Behavioral evidence                                                                                                                                           | Gates                                   | Total |
| ------------------------ | ------- | -------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----- |
| ST17-01 — Gummymon       | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST17/ST17-01.ts); exclusive `registerIrCard`; 2/2 | [test](../../apps/api/src/cards/ST17/ST17-01.test.ts): green-Tamer inherited draw and once-per-turn boundary; 2/2                                             | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST17-02 — Terriermon     | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST17/ST17-02.ts); exclusive `registerIrCard`; 2/2 | [test](../../apps/api/src/cards/ST17/ST17-02.test.ts): trait-gated hand play, cost reduction, and suspended inherited DP; 2/2                                 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST17-03 — Lopmon         | 2/2     | Q825; 2/2      | [module](../../apps/api/src/cards/ST17/ST17-03.ts); exclusive `registerIrCard`; 2/2 | [test](../../apps/api/src/cards/ST17/ST17-03.test.ts): Alliance target/once-per-turn and suspended inherited DP; 2/2                                          | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST17-04 — Wendigomon     | 2/2     | Q826–Q827; 2/2 | [module](../../apps/api/src/cards/ST17/ST17-04.ts); exclusive `registerIrCard`; 2/2 | [test](../../apps/api/src/cards/ST17/ST17-04.test.ts): level boundary, optional trash play, and inherited trigger; 2/2                                        | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST17-05 — Gargomon       | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST17/ST17-05.ts); exclusive `registerIrCard`; 2/2 | [test](../../apps/api/src/cards/ST17/ST17-05.test.ts): suspended Jamming grant and inherited DP condition; 2/2                                                | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST17-06 — Rapidmon       | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST17/ST17-06.ts); exclusive `registerIrCard`; 2/2 | [test](../../apps/api/src/cards/ST17/ST17-06.test.ts): Blocker/Armor Purge, opponent-turn DP boundary, and inherited DP; 2/2                                  | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST17-07 — Rapidmon       | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST17/ST17-07.ts); exclusive `registerIrCard`; 2/2 | [test](../../apps/api/src/cards/ST17/ST17-07.test.ts): De-Digivolve, Tamer protection duration, and battle deletion recovery; 2/2                             | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST17-08 — MegaGargomon   | 2/2     | Q828–Q831; 2/2 | [module](../../apps/api/src/cards/ST17/ST17-08.ts); exclusive `registerIrCard`; 2/2 | [test](../../apps/api/src/cards/ST17/ST17-08.test.ts): Counter Blast Digivolve, multi-target suspension lock, Reboot, and optional unsuspend; 2/2             | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST17-09 — Cherubimon     | 2/2     | Q832; 2/2      | [module](../../apps/api/src/cards/ST17/ST17-09.ts); exclusive `registerIrCard`; 2/2 | [test](../../apps/api/src/cards/ST17/ST17-09.test.ts): Alliance, level deletion boundary, and optional hand/trash play; 2/2                                   | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST17-10 — Henry Wong     | 2/2     | Q835–Q836; 2/2 | [module](../../apps/api/src/cards/ST17/ST17-10.ts); exclusive `registerIrCard`; 2/2 | [test](../../apps/api/src/cards/ST17/ST17-10.test.ts): memory condition, stack assembly from trash, free MegaGargomon evolution, Rush, and security play; 2/2 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST17-11 — Double Typhoon | 2/2     | Q837; 2/2      | [module](../../apps/api/src/cards/ST17/ST17-11.ts); exclusive `registerIrCard`; 2/2 | [test](../../apps/api/src/cards/ST17/ST17-11.test.ts): top-three dual search, bottom placement, Delay, and security suspension; 2/2                           | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST17-12 — Giant Missile  | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST17/ST17-12.ts); exclusive `registerIrCard`; 2/2 | [test](../../apps/api/src/cards/ST17/ST17-12.test.ts): suspend-then-bottom-deck sequence, unsuspend restriction, and security activation; 2/2                 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST17-13 — Magnamon       | 2/2     | Q833–Q834; 2/2 | [module](../../apps/api/src/cards/ST17/ST17-13.ts); exclusive `registerIrCard`; 2/2 | [test](../../apps/api/src/cards/ST17/ST17-13.test.ts): security De-Digivolve/evolution, Armor Purge, source-color filtering, and hand return; 2/2             | focused/gate/type/lint/format/diff; 2/2 | 10/10 |

## Verification commands

Material evidence correction: ST17-05 and ST17-06 now trigger suspension watchers through the public effect-suspension verb. ST17-07 now proves its inherited security trash through a real attack that deletes an opposing Digimon in battle and survives.

- All 13 focused card tests passed serially, one process per card.
- Collection gate `src/cards/ST17/ST17.audit.test.ts` passed 3/3.
- `pnpm typecheck`, repository lint, changed-file format check, and `git diff --check` passed; repo-wide formatting retains pre-existing baseline findings.

# Evidence remediation (2026-08-31)

ST17-08/09/10 now use public Digivolve, attack, turn, and activated-effect operations for their
triggered clauses. Assertions settle on suspension/restriction, Alliance revival, exact memory,
Security play, and the MegaGargomon stack/Rush result.
