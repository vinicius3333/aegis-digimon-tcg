# Rush lifecycle audit

Status: in progress. Bounded public attack and turn-end proof; neither keyword nor collection certification.

## Rules and consumers

Reviewed `comprehensive-0233`, §16-15, SHA-256 `6f597fcf757c2632ff18ed331c9d1fd671a194944ac62dfdc95564ba4305b7aa`, states that Rush permits attacking in the turn the Digimon was played and is persistent. The conformance suite verifies this fingerprint in its Rush group hook. ST17-10 separately grants Rush for the turn after its selected host evolves; the grant duration comes from the committed card contract rather than interpreting persistent Rush as an unlimited grant.

## Reproducible public proof

`apps/api/src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts` publicly plays BT4-038 and BT8-077 in separate cases, alongside a freshly played vanilla BT1-009. The neutral Digimon's attack is rejected without suspension; the printed Rush Digimon's attack succeeds and completes a security check. Weak BT1-011 security preserves the attacker. A reserve hand card keeps the Main phase open until explicit public phase ending. Printed Rush remains on the same permanent after the turn ends.

`apps/api/src/cards/ST17/ST17-10.test.ts` publicly plays ST17-02, proves its fresh attack refusal, then activates Henry's Main effect. The same permanent evolves to ST17-08, receives Rush, attacks and completes a security check. Memory is ten minus three for playing and four for evolution. Explicit public turn ending removes the temporary Rush while retaining the permanent identity and exact paid stack.

Temporarily removing the shared `isSummoningSick` Rush exception made all three public attack cases fail at attack acceptance (three failures / seventeen skipped). Temporarily changing Henry's grant from `forTheTurn` to `permanent` made its expiry case fail (one failure / seven passes). Both mutations were restored in `finally`; no engine, card module or persisted IR change is retained. Final focused proof passed two files / twenty tests. Independent read-only review found no blockers in fresh-play controls, security survival, phase milestones or grant expiry.

## Remaining obligations

This does not establish a complete Rush inventory or normative denominator. Inherited and multiple grants, top-card changes, departure and re-entry, interactions with other attack restrictions, grants ending on other players' turns, and other duration domains remain open. The wider engine audit and other keyword obligations remain open.

Delivery gates: conformance/combat/effects/ST17/BT4/BT8 regression passed 385 files / 2919 tests. API typecheck, scoped Oxlint, changed-file Oxfmt, audit document layout (4/4) and `git diff --check` passed. These gates apply to this bounded proof rather than the full engine audit denominator.

## Printed Rush becoming a digivolution card

The ordinary `loses printed Rush after public digivolution without resetting its fresh-play restriction` conformance case publicly plays BT8-077 and evolves the same permanent to vanilla BT8-078. Both committed cards have the appropriate purple evolution match; costs five plus two leave three memory. The original physical top becomes the sole source, permanent identity and entry-turn metadata remain unchanged, and Rush is absent on the evolved host. Its attack is rejected without suspension, security removal or pending choice. Explicit public turn ending completes the fixture.

Temporarily extending combat Rush recognition to every card in the stack reproduced one failed / twelve skipped tests at the public attack refusal. The mutation was fully restored. Focused conformance passed thirteen tests before mutation. This proves loss of that printed top effect, not genuine inherited Rush, re-entry or preservation of independent grants across evolution. The earlier open top-change obligation is narrowed only for this consumer pair.

## Implementation trace and obligation ledger

Combat declaration uses `apps/api/src/engine/combat/legality.ts`: `isSummoningSick` checks entry turn and `hasRush`, which consults the active continuous reader and the top card's printed effect. Public play/evolution and ordinary turn processing supply the actual lifecycle in these tests.

| Obligation                                                              | KB chunk / ruling                                      | Engine path                    | Public action and observable result                                   | Test                       | Consumers                   | Status   |
| ----------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------- | -------------------------- | --------------------------- | -------- |
| Printed Rush permits same-turn attack                                   | comprehensive-0233 §16-15-1                            | combat/legality.ts             | Play, attack, complete security check; fresh neutral refused          | ch16b `publicly attacks`   | BT4-038, BT8-077            | verified |
| Printed Rush is persistent                                              | comprehensive-0233 §16-15-2                            | combat keyword reader          | End real turn; same holder retains Rush                               | ch16b `publicly attacks`   | BT4-038, BT8-077            | verified |
| Henry's conditional grant permits attack and expires                    | ST17-10 committed contract; comprehensive-0233         | shared IR and duration cleanup | Play, evolve, attack, end turn; Rush removed, identity/stack retained | ST17-10 lifecycle test     | ST17-10 / ST17-02 / ST17-08 | verified |
| Top printed Rush does not become inherited Rush                         | BT8-077 has inherited Retaliation, BT8-078 has no Rush | combat/legality.ts             | Public evolution; same fresh host's attack refused                    | ch16b `loses printed Rush` | BT8-077 / BT8-078           | verified |
| Genuine inherited Rush and distinct granting shapes                     | Sources and complete consumer denominator to reconcile | keyword synthesis              | To establish                                                          | To establish               | Inventory incomplete        | queued   |
| Multiple grants and other attack restrictions                           | Sources to reconcile                                   | continuous store / combat      | To establish                                                          | To establish               | Inventory incomplete        | queued   |
| Departure/re-entry and independent grant preservation through evolution | Identity and duration sources to reconcile             | movement / duration / combat   | To establish                                                          | To establish               | Inventory incomplete        | queued   |

This table is a current obligation ledger, not a claim that the normative denominator is complete.

## Commands and history

- `pnpm --filter @aegis/api exec vitest run src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts --maxWorkers=1 --no-file-parallelism`
- `pnpm --filter @aegis/api exec vitest run src/engine/conformance src/engine/combat src/cards/BT8 --maxWorkers=1 --no-file-parallelism`
- `pnpm --filter @aegis/api typecheck`
- `pnpm exec oxlint apps/api/src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts`
- `pnpm --filter @aegis/api exec vitest run src/cards/audit-docs.test.ts --maxWorkers=1 --no-file-parallelism`

Initial public printed/granted proof was delivered in `4edc1fa42`, based on `3214e07c5`. The top-change extension uses `4edc1fa42` as its baseline. Its comparative gate passed 174 files / 1207 tests; audit layout passed 4/4, scoped lint and diff checks passed. Independent read-only review found no blocker.

Final API typecheck passed for the top-change extension. Executable engine/card/IR remained unchanged after the restored mutation.

## Catalog and persisted IR discovery inventory

Baseline `6cbed4620`. Discovery reads `packages/shared/src/cards/data/cards.json` and `packages/shared/src/effects/effects.json`; it does not execute or certify these consumers. The explicit text-field scan includes `optionEffect`, so dual-card Option behavior is retained. There are 101 cards with a literal Rush mention across these fields, 105 with a structured Rush keyword node in persisted IR, and 105 in their union. No literal-text consumer is absent from persisted Rush IR. Four IR-only entries have missing keyword names in committed text: BT15-025, EX4-006, EX4-020 and LM-009. Their explanatory text suggests Rush, but glyph/source reconciliation remains required. BT25-057 is included through `optionEffect`.

The table lists discovery forms rather than exhaustive parameter equivalence classes. Conditions, target filters, raw-text-only references, token definitions, executable registration and module/persisted-IR equivalence still require exhaustive reconciliation. Each entry remains queued except for the separately identified public proofs above.

| Card     | Literal text fields  | Persisted Rush forms (trigger / source scope / action / duration)                                                    |
| -------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| AD1-002  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| AD1-008  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| AD1-021  | effectText           | EndOfYourTurn / top or effect / GainKeyword / forTheTurn                                                             |
| BT10-008 | inheritedEffectText  | YourTurn / inherited / Aura / unspecified                                                                            |
| BT10-024 | effectText           | OnPlay / top or effect / GainKeyword / forTheTurn                                                                    |
| BT10-070 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT11-019 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT11-054 | inheritedEffectText  | YourTurn / inherited / GainKeyword / forTheTurn                                                                      |
| BT11-080 | effectText           | YourTurn / top or effect / Aura / unspecified                                                                        |
| BT11-086 | effectText           | AllTurns / top or effect / GainKeyword / permanent                                                                   |
| BT11-089 | effectText           | YourTurn / top or effect / GainKeyword / forTheTurn                                                                  |
| BT11-104 | effectText           | Main / top or effect / ModifyDP / forTheTurn                                                                         |
| BT12-077 | effectText           | WhenDigivolving / top or effect / GainKeyword / forTheTurn                                                           |
| BT13-020 | effectText           | WhenDigivolving / top or effect / GrantStatic with SetBaseDP keyword / forTheTurn                                    |
| BT13-110 | effectText           | Main / top or effect / GainKeyword / forTheTurn                                                                      |
| BT13-111 | effectText           | Static / top or effect / GainKeyword / permanent                                                                     |
| BT13-112 | effectText           | OnPlay / top or effect / GainKeyword / forTheTurn; WhenDigivolving / top or effect / GainKeyword / forTheTurn        |
| BT14-018 | effectText           | OnPlay / top or effect / PlayToken / unspecified; WhenDigivolving / top or effect / PlayToken / unspecified          |
| BT14-058 | effectText           | OnPlay / top or effect / GainKeyword / forTheTurn; WhenDigivolving / top or effect / GainKeyword / forTheTurn        |
| BT14-076 | effectText           | OnDeletion / top or effect / GainKeyword / forTheTurn                                                                |
| BT15-025 | missing keyword name | Static / top or effect / printed keyword / unspecified                                                               |
| BT16-011 | effectText           | YourTurn / top or effect / GainKeyword / forTheTurn                                                                  |
| BT16-054 | effectText           | OnPlay / top or effect / GainKeyword / forTheTurn; WhenDigivolving / top or effect / GainKeyword / forTheTurn        |
| BT16-075 | inheritedEffectText  | YourTurn / inherited / GainKeyword / forTheTurn                                                                      |
| BT16-077 | effectText           | WhenDigivolving / top or effect / GainKeyword / forTheTurn                                                           |
| BT17-060 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT17-082 | effectText           | YourTurn / top or effect / GainKeyword / forTheTurn                                                                  |
| BT18-014 | effectText           | OnPlay / top or effect / GainKeyword / forTheTurn; WhenDigivolving / top or effect / GainKeyword / forTheTurn        |
| BT19-008 | inheritedEffectText  | YourTurn / inherited / GainKeyword / permanent                                                                       |
| BT19-012 | inheritedEffectText  | YourTurn / inherited / GainKeyword / permanent                                                                       |
| BT19-020 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT19-025 | effectText           | OnPlay / top or effect / GainKeyword / forTheTurn                                                                    |
| BT19-062 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT20-077 | effectText           | AllTurns / top or effect / GainKeyword / permanent                                                                   |
| BT20-098 | effectText           | Main / top or effect / GainKeyword / untilOpponentTurnEnd                                                            |
| BT20-102 | effectText           | EndOfYourTurn / top or effect / GainKeyword / forTheTurn                                                             |
| BT21-011 | inheritedEffectText  | YourTurn / inherited / GainKeyword / permanent                                                                       |
| BT21-018 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT21-021 | inheritedEffectText  | YourTurn / inherited / GainKeyword / permanent                                                                       |
| BT21-026 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT21-044 | effectText           | OnPlay / top or effect / GainKeyword / forTheTurn; WhenDigivolving / top or effect / GainKeyword / forTheTurn        |
| BT21-096 | effectText           | Main / top or effect / GainKeyword / forTheTurn                                                                      |
| BT22-078 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT22-095 | inheritedEffectText  | AllTurns / inherited / Aura / unspecified                                                                            |
| BT23-013 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT23-070 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT23-072 | effectText           | AllTurns / top or effect / GainKeyword / untilOpponentTurnEnd                                                        |
| BT23-087 | effectText           | YourTurn / top or effect / GainKeyword / forTheTurn                                                                  |
| BT24-011 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT24-051 | effectText           | YourTurn / top or effect / Aura / unspecified                                                                        |
| BT24-081 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT25-057 | optionEffect         | Main / top or effect / GainKeyword / forTheTurn                                                                      |
| BT25-075 | effectText           | AllTurns / top or effect / GainKeyword / permanent                                                                   |
| BT25-076 | effectText           | Static / top or effect / GainKeyword / permanent                                                                     |
| BT25-094 | effectText           | YourTurn / top or effect / GainKeyword / permanent                                                                   |
| BT25-095 | effectText           | AllTurns / top or effect / GainKeyword / permanent                                                                   |
| BT25-104 | effectText           | YourTurn / top or effect / GainKeyword / permanent                                                                   |
| BT26-078 | effectText           | Trash / top or effect / GainKeyword / forTheTurn                                                                     |
| BT26-083 | effectText           | top-level / printed top / printed keyword / unspecified                                                              |
| BT26-086 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT4-038  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT4-074  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT4-086  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT4-087  | effectText           | YourTurn / top or effect / GainKeyword / forTheTurn                                                                  |
| BT5-063  | inheritedEffectText  | YourTurn / inherited / GainKeyword / permanent                                                                       |
| BT5-085  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT6-075  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT8-077  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT9-026  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| BT9-102  | effectText           | Main / top or effect / GainKeyword / forTheTurn                                                                      |
| EX1-057  | inheritedEffectText  | YourTurn / inherited / GainKeyword / permanent                                                                       |
| EX10-045 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| EX10-053 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| EX10-061 | effectText           | OnPlay / top or effect / GainKeyword / forTheTurn; WhenDigivolving / top or effect / GainKeyword / forTheTurn        |
| EX10-065 | effectText           | AllTurns / top or effect / GainKeyword / forTheTurn                                                                  |
| EX11-012 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| EX12-019 | effectText           | Static / top or effect / GainKeyword / permanent                                                                     |
| EX12-048 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| EX12-076 | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| EX13-064 | effectText           | YourTurn / top or effect / GainKeyword / forTheTurn                                                                  |
| EX2-052  | effectText           | YourTurn / top or effect / Aura / unspecified                                                                        |
| EX2-055  | effectText           | Static / top or effect / GainKeyword / permanent                                                                     |
| EX3-014  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| EX3-030  | inheritedEffectText  | YourTurn / inherited / GainKeyword / forTheTurn                                                                      |
| EX3-031  | inheritedEffectText  | YourTurn / inherited / GainKeyword / forTheTurn                                                                      |
| EX3-049  | inheritedEffectText  | YourTurn / inherited / GainKeyword / forTheTurn                                                                      |
| EX4-006  | missing keyword name | OnPlay / top or effect / GainKeyword / forTheTurn                                                                    |
| EX4-020  | missing keyword name | OnPlay / top or effect / GainKeyword / forTheTurn                                                                    |
| EX5-033  | effectText           | WhenDigivolving / top or effect / GainKeyword / forTheTurn; WhenAttacking / top or effect / GainKeyword / forTheTurn |
| EX5-042  | effectText           | YourTurn / top or effect / GainKeyword / permanent                                                                   |
| EX6-055  | effectText           | YourTurn / top or effect / Aura / unspecified                                                                        |
| EX6-056  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| EX8-037  | effectText           | WhenDigivolving / top or effect / PlayToken / unspecified                                                            |
| EX8-054  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| EX9-047  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| EX9-074  | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| LM-009   | missing keyword name | YourTurn / top or effect / GainKeyword / forTheTurn                                                                  |
| P-098    | inheritedEffectText  | YourTurn / inherited / GainKeyword / forTheTurn                                                                      |
| P-186    | effectText           | Static / top or effect / printed keyword / unspecified                                                               |
| P-213    | effectText           | WhenDigivolving / top or effect / GainKeyword / untilOpponentTurnEnd                                                 |
| P-219    | effectText           | Main / top or effect / GainKeyword / untilOpponentTurnEnd                                                            |
| ST14-09  | effectText           | AllTurns / top or effect / GainKeyword / forTheTurn                                                                  |
| ST17-10  | effectText           | Main / top or effect / GainKeyword / forTheTurn                                                                      |
| ST19-14  | effectText           | YourTurn / top or effect / GainKeyword / forTheTurn                                                                  |
| ST21-13  | effectText           | YourTurn / top or effect / GainKeyword / permanent                                                                   |

Discovery input SHA-256 `packages/shared/src/cards/data/cards.json`: `95e18fef42e8580cf33aca7db1d49c5febc78cfb358ec6ec2f1819a830ab1caa`. This fingerprint is provenance, not behavioral evidence.

Discovery input SHA-256 `packages/shared/src/effects/effects.json`: `7f0474cd26f786f281de507f7bf7cde52fb9aaf3d13a5b0c7e1ee7620c7f9522`. This fingerprint is provenance, not behavioral evidence.

Static module discovery read all 105 corresponding `apps/api/src/cards/<SET>/<CARD>.ts` files. Each contains exactly one literal `registerIrCard(` call and no literal `registerCard(` call. BT12-077 loads and clones `getCompiledCard("BT12-077")` and adjusts its condition; its Rush node therefore comes from persisted IR rather than a local literal. This establishes registration layout only: full module/IR equality and correct parameters are not proved by textual searches.

Independent inventory review verified counts, table membership and input fingerprints. Its two scope corrections are incorporated: BT13-020 inherits `forTheTurn` from the containing `GrantStatic`; BT26-083 has a top-level printed Rush node. A full ancestor-duration scan found only BT13-020 required that duration correction. An independent Node reconciliation verified 105 unique table rows exactly match the union. Layout passed 4/4; changed-document formatting and diff checks passed.

## Public inherited Aura and continuous grant

Baseline `ad3ee4a46`. Four ordinary parameterized `inherited Rush matches the publicly evolved host` cases publicly play BT10-008 or BT19-008, reject the fresh top card's attack, then publicly evolve the same permanent. BT19-012 is the positive host: its alternate exact Shoutmon requirement permits evolution for four memory and it satisfies both BT10's name condition and BT19's Xros Heart condition. AD1-001 is the negative red level-four host, evolving normally for two memory and satisfying neither inherited condition. Playing either source costs four; final memory is two or four respectively.

The exact played source identity becomes the sole digivolution card; permanent identity and entry-turn metadata remain unchanged. Neither source has top Rush. Positive evolved hosts gain Rush and complete a public security attack against weak BT1-011, while negative hosts are refused without suspension or security movement. Reserve hand cards preserve explicit Main phase ending. The Rush group hook now additionally pins reviewed `comprehensive-0160` §15-3 SHA-256 `2c055b02ffa9c5dbe1734f499d80029364ab320d2d5543f76237a9fcc2f9d487`: inherited effects are gained from digivolution cards.

BT10-008 supplies an inherited conditional `Aura`; BT19-008 supplies inherited `YourTurn` / `GainKeyword` with a trait filter. Temporarily replacing only their inherited Rush keyword with Blocker reproduced two positive failures, two negative passes and thirteen skipped tests. Both source modules were fully restored in `finally`; no card module or persisted IR correction is retained. Focused conformance passed seventeen tests before the mutation. These are public consumer parameter proofs for these two forms, not source-removal, opponent-turn gate expiry, multiple-source accumulation or certification of all inherited shapes.

| Obligation                                                             | KB chunk / ruling                                          | Engine path                                         | Public action and observable result                        | Test                               | Consumers                     | Status   |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------- | ----------------------------- | -------- |
| Conditional inherited Aura on a fresh evolved host                     | comprehensive-0160 / comprehensive-0233; BT10-008 contract | inherited synthesis / Aura / combat legality        | Play then evolve; named host attacks, neutral host refused | ch16b parameterized inherited Rush | BT10-008 / BT19-012 / AD1-001 | verified |
| Conditional inherited continuous keyword grant on a fresh evolved host | comprehensive-0160 / comprehensive-0233; BT19-008 contract | inherited synthesis / GainKeyword / combat legality | Play then evolve; trait host attacks, neutral host refused | ch16b parameterized inherited Rush | BT19-008 / BT19-012 / AD1-001 | verified |

The earlier queued inherited-form obligation is superseded only for these two executed shapes. Other inherited triggers, controller changes, source removal, numeric thresholds, other filters and lifecycle interactions remain open.

Inherited-form delivery gates: comparative conformance/combat/effects/BT10/BT19/AD1 regression passed 378 files / 4155 tests; full API typecheck passed. Scoped lint first identified conditional assertions; they were replaced by unconditional parameterized result, suspension, security and pending-decision assertions. Final scoped lint was clean and final focused conformance passed seventeen tests. Changed-file formatting, audit layout (4/4) and diff checks passed. Independent read-only review found no fixture, evolution-route, memory or lifecycle milestone blocker.

## Public security removal of inherited sources

Baseline `02618f533`. Two additional ordinary matrix cases use BT1-101 Howling Crusher in security after publicly playing and evolving BT10-008 or BT19-008 into OmniShoutmon. Howling Crusher's committed Security effect activates its Main effect, trashing all of the attacking player's digivolution cards; it does not require paying the seven-memory Option use cost or meeting hand-use color requirements during security activation.

The fresh host has Rush before its accepted public attack. After the entire security effect resolves, its exact played Shoutmon source is in player zero's trash, the host stack is empty, and Rush is absent. The live battle area still contains the same permanent object and evolved top instance, with entry-turn metadata retained. It remains suspended, checked security count falls from three to two, a Howling Crusher is in the defending player's trash, memory remains two, and no decision remains. All three initial security cards are identical and defending trash is initially empty; the checked Option assertion identifies its card ID rather than pinning its physical instance. The four existing matching/neutral controls additionally verify final stack, Rush and trash state.

Temporarily replacing only Howling Crusher's Main actions with an empty list reproduced two failed / seventeen skipped tests at the missing source-removal assertion. The module was restored in `finally`. This mutation verifies that the public security effect actually performs the source removal; it is not an isolated mutation of continuous cleanup itself. Focused conformance passed nineteen tests before the mutation. No executable module or persisted IR change is retained.

| Obligation                                                         | KB chunk / ruling                                                  | Engine path                                                    | Public action and observable result                                     | Test                                | Consumers                     | Status   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------- | ----------------------------- | -------- |
| Inherited conditional Aura disappears when its source is trashed   | comprehensive-0160 / comprehensive-0233; BT1-101 Security contract | Security ActivateMain / TrashDigivolution / continuous rebuild | Play, evolve, attack; exact source discarded, surviving host loses Rush | ch16b inherited matrix with BT1-101 | BT10-008 / BT19-012 / BT1-101 | verified |
| Inherited continuous keyword disappears when its source is trashed | comprehensive-0160 / comprehensive-0233; BT1-101 Security contract | Security ActivateMain / TrashDigivolution / continuous rebuild | Play, evolve, attack; exact source discarded, surviving host loses Rush | ch16b inherited matrix with BT1-101 | BT19-008 / BT19-012 / BT1-101 | verified |

Earlier source-removal limitations are superseded only for these two public security paths. Opponent-turn gates, selective removal among multiple Rush sources, independent grants, return/re-entry and the complete inherited consumer denominator remain open. Independent read-only review found no semantic blocker and its requested explicit live attacker-membership assertion was incorporated.

## Actual opponent-turn gate and owner-turn return

The final six-case matrix runs `engine.startTurnLoop()` rather than separate hand-laid turns. Public end-phase intents and authoritative Main-controller waits advance from owner zero to opponent one and back to owner zero. No `turnSeat` or turn-count metadata is assigned during the proof. Rush is absent at the opponent's Main in every case; on the owner's following Main it returns only for the matching host with its inherited source still present. Neutral hosts and hosts stripped by security remain without Rush. Entry metadata and live host identity remain retained. Public surrender and awaiting the loop terminate the fixture.

Temporarily changing the two source modules' sole `YourTurn` trigger to `AllTurns` reproduced two failed / four passing / thirteen skipped tests. Both failures occur at the opponent-turn Rush-absence assertion for the eligible hosts whose sources remain; stripped and neutral controls still pass. Both modules were restored in `finally`. Final focused conformance passed nineteen tests before this mutation. Independent read-only review found no controller-wait, turn-transition or teardown blocker.

| Obligation                                                             | KB chunk / ruling                               | Engine path                                       | Public action and observable result                                                             | Test                              | Consumers                                | Status   |
| ---------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------- | -------- |
| Inherited Your Turn Aura follows actual controller turns               | comprehensive-0160; BT10-008 Your Turn contract | production turn loop / Aura synthesis             | End owner phase, observe opponent Rush absent, return owner with preserved source Rush restored | ch16b six-case inherited matrix   | BT10-008 / BT19-012 / AD1-001            | verified |
| Inherited Your Turn continuous keyword follows actual controller turns | comprehensive-0160; BT19-008 Your Turn contract | production turn loop / continuous synthesis       | End owner phase, observe opponent Rush absent, return owner with preserved source Rush restored | ch16b six-case inherited matrix   | BT19-008 / BT19-012 / AD1-001            | verified |
| Removed source does not restore Rush on a later owner turn             | comprehensive-0160; both source contracts       | source removal / continuous synthesis / turn loop | Security removes source, opponent and following owner Main remain without Rush                  | ch16b matrix with Howling Crusher | BT10-008 / BT19-008 / BT19-012 / BT1-101 | verified |

Earlier opponent-turn limitations are superseded only for these two inherited shapes and their positive/neutral/security-removal paths. Triggered temporary inherited grants, multiple concurrent grants/sources, other controller/duration domains and re-entry remain open.

Final comparative command: `pnpm --filter @aegis/api exec vitest run src/engine/conformance src/engine/combat src/engine/effects src/cards/BT1 src/cards/BT10 src/cards/BT19 src/cards/AD1 --maxWorkers=1 --no-file-parallelism`. The earlier source-removal checkpoint passed 1388 files / 10684 tests and API typecheck; the final production-loop gate is recorded below after terminal completion.

Final production-loop delivery gates passed 1388 files / 10684 tests and full API typecheck. Scoped Oxlint was clean; changed-file Oxfmt, audit layout (4/4), `git diff --check` and independent final review passed. No executable engine/card/persisted-IR correction remains after the restored mutations.

## Public effect-play inherited triggers

Baseline `836728fa8`. Two ordinary `inherited trigger distinguishes ordinary and effect plays` cases exercise BT11-054 and BT16-075. Their inherited effects are staged under legal same-color level-six neutral hosts BT1-080 and BT3-089 respectively. Seeded yellow T.K. BT1-087 establishes Impulse Memory Boost's hand-use color requirement; ten initial memory avoids its start-turn setter, and its On Play effect is not fired. BT7-032 Pulsemon has no top effect or Rush; its inherited effect is inactive on a single top card.

Each production turn publicly plays one Pulsemon normally for three memory, verifies no Rush on it or the source host, and rejects its fresh attack. Publicly using BT10-100 Impulse Memory Boost for three memory then plays the other physical Pulsemon without paying its play cost. Preferred exact instance selection grants inherited Rush to that new recipient; the source host and ordinarily played Pulsemon remain without Rush. Memory is ten minus three minus three, with no extra Pulsemon charge. The recipient attacks and completes security against weak BT1-011, remaining alive and suspended, while the ordinary control stays unsuspended. Actual public phase ending reaches the opponent's Main; Rush expires while the live recipient identity, top instance and source-host stack remain. Public surrender and awaiting the production loop cleanly terminate the fixture.

Temporarily changing both source filters from `byEffect: true` to `byEffect: false` reproduced two failed / nineteen skipped tests: the ordinary play wrongly grants Rush to the source host before Impulse is used. Temporarily changing their grant durations from `forTheTurn` to `permanent` reproduced two failed / nineteen skipped tests at next-turn grant absence. Each mutation restored both modules in `finally`; no executable module or persisted IR change remains. Focused conformance passed twenty-one tests before the mutations. Independent read-only review found no neutral-fixture, recipient-selection, memory, security-survival or expiration blocker.

| Obligation                                                            | KB chunk / ruling                                           | Engine path                                     | Public action and observable result                                                | Test                             | Consumers                                | Status   |
| --------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------- | -------- |
| Inherited effect-play provenance excludes ordinary plays              | comprehensive-0160; BT11-054 / BT16-075 committed contracts | inherited SubTrigger / whenPlayed source filter | Ordinary play grants no Rush; public Option free play grants Rush                  | ch16b triggered inherited matrix | BT11-054 / BT16-075 / BT10-100 / BT7-032 | verified |
| Selectable triggered Rush reaches a real fresh recipient              | comprehensive-0233; both source contracts                   | GainKeyword / public attack legality            | Exact new instance selected, host and ordinary control unaffected; complete attack | ch16b triggered inherited matrix | BT11-054 / BT16-075 / BT7-032            | verified |
| Triggered for-the-turn grant expires independently of source presence | both source contracts                                       | duration cleanup / actual turn loop             | Opponent Main has no Rush, live recipient/source retained                          | ch16b triggered inherited matrix | BT11-054 / BT16-075 / BT7-032            | verified |

Once-per-turn repetition, reset, simultaneous sources, alternative selected recipients, opponent-origin plays and other inherited triggered filters remain open. The earlier unproved triggered-form obligation is superseded only for these two executed source shapes. This does not certify all triggered inherited consumers or the keyword denominator.

Comparative command: `pnpm --filter @aegis/api exec vitest run src/engine/conformance src/engine/combat src/engine/effects src/cards/BT11 src/cards/BT16 src/cards/BT10/BT10-100.test.ts --maxWorkers=1 --no-file-parallelism`.

Triggered-form delivery gates: comparative regression passed 341 files / 3233 tests, full API typecheck passed, scoped Oxlint was clean, changed-file Oxfmt and audit layout (4/4) passed, and `git diff --check` was clean. Independent final review found no blocker. The six triggered inherited literal consumers remain subject to complete shape reconciliation and the unproved obligations above.
