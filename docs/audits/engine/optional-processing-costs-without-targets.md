# Optional processing costs without a resolvable payload

Investigation date: 2026-09-20. Base: `af6fd390b` (local main). Branch: `investigate/optional-effect-costs`.

## Finding

The reported behavior is real for some cards, but not all optional effects. Three additional BT26 cards reproduce it through public intents: **BT26-023 Mojyamon, BT26-072 Peckmon, BT26-082 Ravemon**. The originally reported Wizardmon BT26-067, likely Aegiochusmon: Dark BT26-073 (the report did not specify an ID), and suggested Plutomon BT26-059 already pass their no-target tests at this base. No production deployment/version was inspected.

The three reproduced gaps are fixed by marking their printed processing-condition actions with `allowCostWithoutTarget: true`. No collection scores were recalculated; the broader inventory remains triage evidence rather than proof that every listed card is affected.

## Rules evidence

[Official Comprehensive Rules, section 15-7-5](https://world.digimoncard.com/rule/pdf/general_rule.pdf?20260220=) permits executing an optional processing condition even when its subsequent content cannot execute. Local source: `data/kb/rules/comprehensive.md:2121`. Sections 15-7-1 through 15-7-4 distinguish the optional processing condition, full payment, and subsequent processing. Explicit activation prerequisites and activation-type Main restrictions still require separate analysis.

`node tools/kb/query.mjs card BT26-059` returns Q7076: the hand-trash cost is allowed on the opponent's turn, but the portion after “if it's your turn” is not. Q7123 for BT26-082 requires the full two-card alternative cost. Wizardmon BT26-067 has no card-specific local KB entry; the general rule applies. Printed card contracts are in `packages/shared/src/cards/data/cards.json`.

## Reproduction and causal experiment

| Card              | Trigger and payable cost                          | Before fix              | With target control | After semantic annotation   |
| ----------------- | ------------------------------------------------- | ----------------------- | ------------------- | --------------------------- |
| BT26-023 Mojyamon | On Play; place one hand card face down under self | Cost card stays in hand | Cost paid           | Cost paid without target    |
| BT26-072 Peckmon  | On Play; trash one hand card                      | Cost card stays in hand | Cost paid           | Cost paid without target    |
| BT26-082 Ravemon  | Digivolve from BT26-076; delete self              | Ravemon stays in battle | Self deleted        | Self deleted without target |

All scenarios auto-answer optional, target, card, and modal decisions and assert no pending decision remains. Each has an otherwise identical control containing ST1-03 on the opponent's board. The initial six-case run had **3 passed, 3 failed**, all failures at the paid-cost assertion. Adding only `allowCostWithoutTarget: true` to the relevant Return/Delete actions gave **6 passed**, ruling out an unanswered modal prompt and isolating target preflight/classification as the cause.

The retained regression test exercises all three fixed no-target paths and their otherwise identical with-target controls:

```sh
TEST_HEAP_MB=1536 NODE_OPTIONS=--max-old-space-size=1536 pnpm --filter @aegis/api exec vitest run src/engine/optionalCostInvestigation.test.ts --maxWorkers=1 --no-file-parallelism
```

## Implementation cause

`apps/api/src/engine/effects/interpreter/processingCondition.ts` recognizes an explicit flag, or an action with `optional: true` and cost text beginning with `By`, plus a narrow placement exception. Mojyamon has an optional Return with a cost but no preserved By text. Peckmon and Ravemon put optionality on an enclosing Modal; their inner Delete costs have neither the flag nor preserved By text. `actions/runAction.ts` preflights Return and Delete before paying costs, and `effect.ts` also uses the classifier during target availability checks. These representations therefore miss the exception.

The existing fix in `38cfb36cc` (2026-09-20, “Correct effect resolution and decision semantics”) already covers many other representations. Wizardmon and Aegiochusmon: Dark carry explicit flags. Plutomon uses CostGatedBlock, paying the hand cost before the nested conditional play. A broader fix should preserve processing-condition semantics through nested IR and distinguish actual Main declaration restrictions, rather than treating every optional effect/cost as equivalent.

## Inventory method and limits

The scanner imports the actual card modules and inspects `registeredCompiledCards`, not only the generated shared aggregate. It scanned **4485 registered compiled cards**, finding **1543 cost-bearing object occurrences across 1096 cards**. **1115 occurrences across 798 cards** are recognized by the classifier; **97 CostGatedBlock occurrences across 66 cards** form another representation (these counts overlap and are not additive guarantees of correctness). Legacy cards without registered compiled IR are outside this inventory.

The original **66-card triage list** selects cards whose catalog contains “by”, with an unrecognized cost-bearing action in a target-sensitive family, excluding CostGatedBlock itself. After the three fixes, rerunning the scanner leaves **63 unverified candidates**. This is deliberately broad: the word can belong to a different clause, a cost can create its own target, self-targets may always exist, nested optionality differs, and Main/ruling guards can be legitimate. Only the three fixed rows were proven bugs. Other rows are leads, including explicitly identified caveats. Classifier recognition also does not prove all resolver branches are correct.

Rebuild raw inventory outside the audit directory:

```sh
NODE_OPTIONS=--max-old-space-size=1536 apps/api/node_modules/.bin/tsx tools/diagnostics/optional-cost-inventory.mjs /tmp/aegis-optional-cost-inventory.json
```

| Card     | Name                         | Action families                       | Top-level timings                      | Evidence / caveat                                                                   |
| -------- | ---------------------------- | ------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| AD1-017  | Dynasmon                     | ModifyDP                              | OnPlay, WhenDigivolving                | Unverified static candidate                                                         |
| BT1-039  | Cerberusmon                  | Unsuspend                             | WhenAttacking                          | Unverified static candidate                                                         |
| BT1-081  | HerculesKabuterimon          | Unsuspend                             | EndOfAttack                            | Unverified static candidate                                                         |
| BT10-025 | Cyberdramon                  | PlaceUnder                            | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT10-070 | Blastmon                     | Delete                                | OpponentsTurn                          | Unverified static candidate                                                         |
| BT11-070 | Destromon                    | RedirectAttack                        | OpponentsTurn                          | Unverified static candidate                                                         |
| BT11-076 | Ignitemon                    | Delete                                | WhenAttacking                          | Unverified static candidate                                                         |
| BT12-108 | Super Eradication Attack     | Delete                                | Security                               | Unverified static candidate                                                         |
| BT13-033 | MirageGaogamon: Burst Mode   | Unsuspend                             | WhenAttacking                          | Unverified static candidate                                                         |
| BT13-046 | Kentaurosmon                 | Unsuspend                             | WhenAttacking                          | Unverified static candidate                                                         |
| BT13-107 | Vulcan Crusher               | Unsuspend                             | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT14-088 | Gennai                       | MovePermanent                         | OpponentsTurn                          | Q2463 breeding eligibility guard; do not assume the guard is a bug                  |
| BT15-093 | Celestial Arrow              | ModifyDP                              | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT15-097 | Ultimate Slicer              | Delete                                | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT15-100 | Seventh Lightning            | Delete                                | AllTurns, Main                         | Unverified; includes Main activation restrictions                                   |
| BT16-081 | MaloMyotismon                | Delete                                | WhenDigivolving, WhenAttacking         | Unverified static candidate                                                         |
| BT16-083 | Big Ukkomon                  | Delete                                | EndOfYourTurn                          | Unverified static candidate                                                         |
| BT17-001 | Gigimon                      | Delete                                | WhenAttacking                          | Explicit opponentHas condition; no target makes printed prerequisite false          |
| BT17-014 | Aldamon                      | Digivolve                             | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT17-026 | Beowolfmon                   | Digivolve                             | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT18-026 | DaiPenmon                    | Digivolve                             | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT18-047 | Arbormon                     | Suspend                               | OnPlay, WhenDigivolving                | Unverified static candidate                                                         |
| BT18-053 | JetSilphymon                 | Digivolve                             | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT18-081 | Rhihimon                     | Digivolve                             | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT19-084 | Winr                         | Digivolve                             | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT20-083 | Omekamon                     | PlayWithoutCost                       | OpponentsTurn                          | Unverified static candidate                                                         |
| BT20-085 | Shoto Kazama                 | Suspend                               | EndOfYourTurn                          | Unverified static candidate                                                         |
| BT20-096 | Black Sabbath                | Return                                | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT22-041 | Kentaurosmon                 | Unsuspend                             | AllTurns                               | Unverified static candidate                                                         |
| BT23-008 | Greymon                      | PlayWithoutCost                       | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT23-018 | Garurumon                    | PlayWithoutCost                       | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT23-045 | TigerVespamon                | Return                                | OnPlay, WhenDigivolving                | Unverified static candidate                                                         |
| BT26-005 | Pinamon                      | PlayWithoutCost                       | OnDeletion                             | Hidden-source cost has a special cost-creates-target bypass; investigate separately |
| BT26-006 | Monimon                      | PlayWithoutCost, UseOptionWithoutCost | WhenAttacking                          | Modal play/use merge and hidden-source bypass need separate validation              |
| BT26-023 | Mojyamon                     | Return                                | OnPlay, WhenAttacking                  | FIXED: no-target hand-to-stack cost is explicitly permitted                         |
| BT26-069 | Dobermon                     | Delete                                | OnPlay, WhenDigivolving                | Self is normally a valid level-4 target; empty opponent board alone is insufficient |
| BT26-070 | NightChiropmon               | UseOptionWithoutCost                  | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT26-072 | Peckmon                      | Delete                                | OnPlay, WhenDigivolving                | FIXED: both no-target alternate costs are explicitly permitted                      |
| BT26-074 | Cerberusmon                  | UseOptionWithoutCost                  | OnPlay, WhenDigivolving, WhenAttacking | Unverified static candidate                                                         |
| BT26-075 | ScourgeChiropmon             | PlayWithoutCost                       | Security, OnDeletion                   | Hidden-source cost has a special cost-creates-target bypass; investigate separately |
| BT26-078 | Cherubimon                   | PlayWithoutCost                       | OnPlay, WhenDigivolving                | Self-deletion may itself supply a legal trash play; investigate separately          |
| BT26-082 | Ravemon                      | Delete                                | WhenDigivolving, EndOfAttack           | FIXED: both no-target alternate costs are explicitly permitted                      |
| BT26-090 | Kanan Yuki                   | UseOptionWithoutCost                  | EndOfYourTurn                          | Unverified static candidate                                                         |
| BT26-091 | Yoshino Fujieda              | Digivolve                             | YourTurn                               | Unverified static candidate                                                         |
| BT26-096 | Kosuke Misono                | PlayWithoutCost                       | Main                                   | Unverified; includes Main activation restrictions                                   |
| BT26-104 | Kunlun                       | UseOptionWithoutCost                  | EndOfYourTurn                          | Unverified static candidate                                                         |
| BT5-070  | MetalGarurumon               | ModifyDP                              | WhenDigivolving                        | Digi-Burst cost, not a confirmed By processing-condition gap                        |
| BT8-112  | Imperialdramon: Paladin Mode | TrashDigivolution                     | WhenDigivolving, WhenAttacking         | Unverified static candidate                                                         |
| EX10-011 | MaloMyotismon                | PlayWithoutCost                       | Main                                   | Unverified; includes Main activation restrictions                                   |
| EX10-054 | VenomMyotismon               | PlayWithoutCost                       | Main                                   | Unverified; includes Main activation restrictions                                   |
| EX11-032 | GrandGalemon                 | Digivolve                             | Main                                   | Unverified; includes Main activation restrictions                                   |
| EX11-055 | Chitose Horaiji              | PlayWithoutCost                       | AllTurns                               | Unverified static candidate                                                         |
| EX12-047 | Amaterasumon                 | ModifyDP                              | OnPlay, WhenDigivolving                | Unverified static candidate                                                         |
| EX12-077 | Proximamon                   | Delete                                | OnPlay, WhenDigivolving                | Unverified static candidate                                                         |
| EX13-029 | FlameWizardmon               | ModifyDP                              | WhenDigivolving, WhenAttacking         | Unverified static candidate                                                         |
| EX13-035 | KingEtemon                   | PlayWithoutCost                       | OnPlay, WhenDigivolving                | Unverified static candidate                                                         |
| EX3-072  | Megiddo Flame                | Delete                                | Main                                   | Unverified; includes Main activation restrictions                                   |
| EX4-045  | MetalGreymon                 | RedirectAttack                        | OpponentsTurn                          | Unverified static candidate                                                         |
| EX4-046  | WereGarurumon                | RedirectAttack                        | OpponentsTurn                          | Unverified static candidate                                                         |
| EX4-071  | Ame-no-Ohabari               | Delete                                | Main                                   | Unverified; includes Main activation restrictions                                   |
| EX5-023  | WereGarurumon (X Antibody)   | Unsuspend                             | WhenDigivolving, WhenAttacking         | Unverified static candidate                                                         |
| EX5-065  | Sayo & Koh                   | DnaDigivolve                          | StartOfOpponentsTurn                   | Unverified static candidate                                                         |
| EX5-069  | Biting Crush                 | Delete                                | Main                                   | Unverified; includes Main activation restrictions                                   |
| EX8-055  | Pyramidimon                  | Unsuspend                             | WhenDigivolving, WhenAttacking         | Unverified static candidate                                                         |
| LM-005   | Amphimon                     | TrashDigivolution                     | OnPlay, WhenDigivolving                | Unverified static candidate                                                         |
| ST23-13  | Tomoro Tenma & Kyo Sawashiro | ModifyDP                              | AllTurns                               | Unverified static candidate                                                         |

## Exhaustive text and engine follow-up

A catalog-wide clause scan found **250 matching clauses across 246 cards** containing a printed `By` together with either `[Once Per Turn]` or a later `may`: 41 clauses contain all three, 97 contain `[Once Per Turn]` plus `By`, and 112 contain `By` plus a later `may`. This is the complete textual population, not a claim that 246 cards shared the same resolver bug. The executable-IR scanner remains the narrower way to locate target-sensitive implementations.

The engine follow-up found a separate receipt bug: target preflights could return before recording that an optional action was never chosen. `stack.ts` then registered the `[Once Per Turn]` use. All central no-candidate preflights now route through one receipt helper, which clears `lastEffectActed` and preserves the use when the optional activation was not previously chosen. A regression proves the full sequence: no play candidate, first trigger skipped, candidate added, second same-turn trigger succeeds.

The engine now also derives pay-before-payload behavior directly from a recognized printed `By` processing condition. Therefore declining the later `may` cannot undo a paid cost or restore the Once Per Turn use. Focused stale expectations were corrected for BT22-011, BT25-080, BT26-006, BT26-070, BT26-074, and EX13-006. BT26-006/070/074 had omitted their printed `By` text from handwritten IR; that text is now preserved in both the direct modules and shared aggregate.

The engine review confirmed the remaining boundaries: declining before any payment preserves the use; successful payment consumes it; declining a payload after payment leaves it consumed; shared-use keys follow the same receipt; mandatory no-ops remain consumed. BT26-059 provides the card-level shared-timing decline proof, while the generic receipt suite covers paid-cost then declined-payload consumption.

## Validation scope and resource budget

Tests ran sequentially, one worker, with 1536 MiB V8 old-space ceilings for runner and worker. This is a heap ceiling, not a total RSS limit. No full card suite, build, browser/server, or parallel test processes were started.

Original report cards: 3 files / 45 tests passed (12.11 s cold). Red regression: 3 passed / 3 failed (8.38 s after rebuilding shared). Fixed regression: 6 passed / 6 (2.80 s). Focused card and mechanism verification: 6 files, **48 passed** (3.55 s). Scoped Oxlint/Oxfmt and `git diff --check` passed. Shared typecheck passed; API typecheck exceeded 1.5 GiB and 2 GiB heap limits, and the 3 GiB retry was stopped when another worktree's concurrent `tsc` made the machine unresponsive. No TypeScript diagnostic was emitted before those resource stops.
