---
set: EX2
cards: 74
status: verified
verified_at: 2026-09-10
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# EX2 audit

## Status

All 74 EX2 cards (`EX2-001` through `EX2-074`) are verified at 10/10, for an aggregate of 740/740. The winning source is the 2026-09-10 re-audit: `docs/audits/EX2-REAUDIT-LEDGER.md` (commit `edf4041c9`) with per-card reports under `docs/audits/EX2-reaudit/`. That run started from base `e66ac37dbb3c649a74678e9926edd722b8735066` with every row queued and no inherited score, and it treated `docs/audits/EX2-AUDIT.md` (2026-09-03, commit `d2fed0043`) and `internal-docs/audits/EX2-runtime-2026-08-21.md` (commit `52da0b5bb`) as historical context only. Three engine seams were investigated and documented under Mechanisms; the continuous-recomputation coalescing change is a real engine correction, not a fixture fix. No source reconciliation file was produced for EX2, so no catalog correction was established.

## Gates

Copied from the "Final closeout" section of `docs/audits/EX2-reaudit/RUN.md` (commit `edf4041c9`).

- Exact collection: full EX2 collection passed 85 files and 494 tests, run with one worker and no file parallelism.
- Required collection and mechanism regression: 221 files and 2,556 tests passed, zero failures. The known AD1-002 unsupported-effect diagnostic was emitted by a green scenario and did not fail the suite.
- Focused Digi-Egg and Retaliation compatibility: 5 files and 45 tests passed.
- Catalog sync: `pnpm effects:sync:set -- --set EX2 --base e66ac37dbb3c649a74678e9926edd722b8735066` and the matching `effects:check:set` passed — 10 EX2 semantic changes, 74 records synchronized, zero semantic or byte changes outside EX2.
- Typecheck: `pnpm typecheck` passed for shared, API, and web.
- Lint, format, diff: changed-file Oxlint reported zero errors; Oxfmt and `git diff --check` passed.
- Static inventory at closeout: zero EX2 `@ts-nocheck`, zero EX2 `registerCard`, and exactly 74 EX2 modules using `registerIrCard`.
- Baseline before worker acceptance: serial EX2 collection with one worker passed 85 files and 328 tests; serial workspace typecheck with a 4096 MB heap passed for shared, API, and web. An earlier collection attempt failed all 85 files on import because built `@aegis/shared` output was missing; building shared fixed it with no source change.
- Delivery: atomic commits `0bdb52a2c` (engine seams), `3568e5ad2` (cards and effects), and `9ecd98f8b` (audit evidence) were pushed to `origin/audit-ex2-luna-20260909` after the two earlier audit checkpoints and the targeting fix.

## Card ledger

Merged from the 74 per-card reports under `docs/audits/EX2-reaudit/`. Card names come from `packages/shared/src/cards/data/cards.json`.

### EX2-001 — Gigimon

#### Sources

- Catalog: `packages/shared/src/cards/data/cards.json`, card `EX2-001` (Gigimon), Red Digi-Egg, Lv.2, inherited text:
  `[When Attacking][Once Per Turn] If this Digimon has [Guilmon], [Growlmon], or [Gallantmon] in its name, ＜Draw 1＞.`
- Knowledge base: `node tools/kb/query.mjs card EX2-001` returned `(no knowledge-base entries)`.
- Comprehensive rules: §2-3-1-3 ("with [XX] in its name" matches names containing the bracketed text), §4-3-3 (a Digimon gains inherited effects from cards under it), §4-18 (hatching from the Digi-Egg deck), §8-1-3 (digivolution places the new card on top and draws), and §15-3-1/3 (inherited effect activation and `this card` identity).
- Relevant peers: EX2-003/EX2-004/EX2-009 use the same inherited-IR registration pattern; BT17-001 and BT19-002 establish the public hatch/evolve/move stack-test route.

#### Clause and proof mapping

| Printed clause | IR mapping | Behavioral proof |
|---|---|---|
| `[When Attacking]` | `effects[0].trigger = "WhenAttacking"` | Existing focused positive and negative attack tests; parameterized name-alternative test |
| `[Once Per Turn]` | `effects[0].frequency = "OncePerTurn"` | Existing test resolves the first draw and refuses the second same-turn attack |
| `If this Digimon has [Guilmon], [Growlmon], or [Gallantmon] in its name` | `actions[0].condition = { kind: "selfHasNameContaining", names: ["Guilmon", "Growlmon", "Gallantmon"] }` | Parameterized positive coverage for all three exact printed alternatives; Seasarmon negative control |
| `＜Draw 1＞` | `actions[0] = { kind: "Draw", controller: "mine", amount: 1 }` | Deck-to-hand observable assertion after full `settle()` |
| inherited effect | `isInherited: true` | Real stack route starts in `eggDeck`, hatches EX2-001, evolves EX2-008 onto it, and asserts the egg remains in the stack before the host attacks; the resulting 1,000-DP security tie deletes the host and returns the Digi-Egg source face-down to `eggDeck` |

The Digi-Egg is only placed in `eggDeck` or under a Digimon in fixtures; it is not placed in a main deck or security stack. All filler deck/security cards use inert main-deck IDs (`BT1-009` through `BT1-014`).

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX2/EX2-001.ts`; the existing `CompiledCard` IR now type-checks directly.
- Kept executable registration exclusively as `registerIrCard("EX2-001", compiled)`.
- Strengthened `EX2-001.test.ts` with all three name alternatives, legal EX2 stack identities, and a public hatch → digivolve → move-to-battle-area route.
- Corrected the real-route endpoint after the canonical Digi-Egg deletion seam: EX2-008 ties the 1,000-DP BT1-011 security Digimon, so the host and its EX2-001 source leave play; the source is expected at the bottom of the egg deck, face-down.

#### Verification

- `node tools/kb/query.mjs card EX2-001` — passed; no KB entries.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX2/EX2-001.test.ts --maxWorkers=1 --no-file-parallelism` — coordinator run after the first fixture correction: **5 passed, 1 failed**. The first failure (no observable opponent Main action) was fixed with a neutral opponent Digimon; the next run reached all card assertions but the opponent decked out before loop cleanup, so the fixture now has additional inert opponent deck cards and awaits rerun.
- Subsequent fixture sanitation replaced all accidental Digi-Egg `BT1-001` deck/security fillers with inert main-deck `BT1-009`–`BT1-014`; the remaining egg-deck length-1 endpoint is intentional and comes from the legal EX2-001 breeding source returning after the security deletion.
- `pnpm typecheck` — intentionally not run (worker brief forbids broad typecheck; coordinator serializes it).
- Scoped Oxlint/Oxfmt — pending coordinator RAM window.
- `git diff --check` — pending final worker verification.

#### Remaining gaps

No card-specific rules ambiguity or fixture contamination was exposed. The collection-only length-1 observation was caused by the newly canonical Digi-Egg deletion route after the real 1,000-DP security tie, not shared state. The focused suite needs to rerun after this endpoint correction, followed by scoped lint/format and `git diff --check`; no claim of a final 10/10 gate is made until those commands are green.

#### Rubric (current evidence)

| Category | Score | Notes |
|---|---:|---|
| Catalog / rules | 2/2 | All printed fields and applicable rule sections identified; no KB ruling exists |
| IR trace | 2/2 | Trigger, condition, inherited marker, once-per-turn frequency, and draw map directly |
| Behavioral proof | 1/2 | Baseline positive/negative passed; expanded all-alternative and public-stack cases await execution |
| Peer / stack proof | 2/2 | Legal stack identities and public production route are present in focused tests |
| Fixed gates | 0 | Per worker brief |

### EX2-002 — Xiaomon

EX2-002 is a Blue level 2 Digi-Egg (In-Training, Lesser), with no play cost,
no evolution requirements, and no security text. Its only printed behavior is
the inherited effect:

> `[All Turns] While this Digimon is level 4, it gets +1000 DP.`

#### Catalog and knowledge-base evidence

The exact card record was checked in `packages/shared/src/cards/data/cards.json`:

- name: Xiaomon
- color/kind: Blue / Digi-Egg
- level/form/trait: 2 / In-Training / Lesser
- inherited text: `[All Turns] While this Digimon is level 4, it gets +1000 DP.`
- no main effect, security effect, or evolution requirement

`node tools/kb/query.mjs card EX2-002` returned `(no knowledge-base entries)`.
There are therefore no EX2-002-specific Q&A, errata, restriction, or ruling IDs
to cover. The applicable rule interpretation is the engine's exact current-top
level check: the host qualifies only while its current top card is level 4,
and the inherited effect remains active on both players' turns.

#### Clause → test → IR

| Clause | Behavioral proof | IR mapping |
|---|---|---|
| All Turns | `keeps the level-4 bonus during the opponent's turn` asserts +1000 with `turnSeat = 1`; the positive level-4 test covers the controller's turn. | `trigger: "AllTurns"`, `isInherited: true` |
| While this Digimon is level 4 | `gives only its level-4 host +1000 DP` asserts 6000 → 7000; `does not boost a host that is not level 4` asserts the level-3 host remains at 1000. | `while: { kind: "selfLevelIs", value: 4 }` |
| gets +1000 DP | The same positive tests assert exact observable `currentDP`; the legal evolution test confirms the live host remains at 7000 after becoming level 4. | `effect: { kind: "modifyDP", amount: 1000 }` |
| inherited source affects only its own host | The positive and negative host fixtures place Xiaomon under one named host and assert the host's exact DP; the target is self-only. | `target.filter.isSelfRef: true`, `target.isSelf: true`, `count: 1` |

The stack test uses the legal Blue Lv.2 → Lv.3 → Lv.4 route represented by
EX2-013 and EX2-015. It asserts the evolved top card, retained source cards,
the paid-cost memory endpoint, and the final 7000 DP, proving that the
inherited source survives a legal evolution rather than only working in a
synthetic isolated fixture.

#### Implementation review

`apps/api/src/cards/EX2/EX2-002.ts` is compiled IR and registers exclusively
with `registerIrCard("EX2-002", compiled)`. The whole-file `@ts-nocheck` was
removed; no replacement suppression or handwritten second registration is
present. The IR fields were followed into the shared implementation:

- `runStaticAction` evaluates an Aura's `while` condition continuously and
  applies `modifyDP` as a continuous `UntilEachTurnEnd` grant.
- `selfLevelIs` reads the current top-card definition and requires an exact
  numeric level match.
- `isSelfRef` plus `isSelf` resolves only the source permanent, so the aura
  cannot affect another Digimon.

No reusable engine seam or card implementation defect was found.

#### Changes

- Removed `// @ts-nocheck` from `EX2-002.ts`.
- Added a legal evolution-stack behavioral case to `EX2-002.test.ts`.
- No engine, shared, catalog, or other-card files were changed.

#### Q&A and remaining gaps

No Q&A IDs were returned for EX2-002, and no card-specific ambiguity remains.
There are no security, once-per-turn, optional, cost, target-choice, or zone
movement clauses applicable to this Digi-Egg. The collection delivery gates are
coordinator-owned and intentionally scored 0 in this worker report.

#### Commands and results

Focused test (the pre-edit baseline, while the coordinator's RAM guard was
active):

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX2/EX2-002.test.ts \
  --maxWorkers=1 --no-file-parallelism
→ Test Files 1 passed; Tests 3 passed
```

The first post-edit attempt found a test-harness import defect in the new stack
case (`ReferenceError: settle is not defined`, 1 failed / 3 passed). The import
was corrected in this worker. The coordinator must rerun the same bounded
command after the correction, then run the scoped Oxlint/Oxfmt checks and
`git diff --check`. Workspace typecheck and broad suites are intentionally not
run in this lane.

#### Score

| Category | Score | Basis |
|---|---:|---|
| Catalog / rules | 2/2 | Exact catalog fields and inherited text checked; KB query has no entries and no unresolved card-specific ruling remains. |
| IR trace | 2/2 | Every clause maps to the typed Aura, exact self-level gate, self target, inherited flag, and +1000 modification. |
| Behavioral proof | 2/2 | Positive, exact-level negative, opponent-turn, and legal-evolution stack cases assert observable DP and stack endpoints. |
| Peer / stack proof | 2/2 | Self-only targeting is exercised and the realistic Blue Lv.2 → Lv.3 → Lv.4 evolution retains Xiaomon and its inherited effect. |
| Delivery gates | 0/2 | Fixed at 0 for the worker lane; coordinator owns final collection gates. |
| **Total** | **8/10** | Pending coordinator rerun of post-edit bounded checks and collection-level gates. |

### EX2-003 — Viximon

#### Contract and source evidence

- Catalog source: `packages/shared/src/cards/data/cards.json`, `EX2-003`.
- Catalog fields verified: Viximon; Yellow; Digi-Egg; level 2; play cost `-1`; 0 DP; In-Training; Lesser.
- Printed inherited clause: `[Your Turn][Once Per Turn] When you use an Option card with a cost of 2 or more, Draw 1.`
- Knowledge-base source: `node tools/kb/query.mjs card EX2-003`.
- Applicable Q&A: Q3269 (after the used Option's [Main] effect), Q3270 (Security/Delay activation does not count), Q3271 (card-level use-cost reduction is checked after reduction), Q5479 (payment-only reduction preserves original use cost), and Q5480 (free use preserves original use cost).
- No unresolved catalog, ruling, or rules ambiguity remains for this card.

#### Implementation trace

`apps/api/src/cards/EX2/EX2-003.ts` registers exactly one executable record with `registerIrCard("EX2-003", compiled)`.

| Printed requirement | IR proof | Behavioral proof |
| --- | --- | --- |
| inherited effect | `effects[0].isInherited: true` | legal EX2-003 -> EX2-020 stack, then public move and Option use |
| Your Turn | `effects[0].trigger: "YourTurn"` | same-turn and opponent-turn boundaries in the once-per-turn lifecycle test |
| Once Per Turn | `effects[0].frequency: "OncePerTurn"` | second qualifying Option is refused; next own turn fires again |
| use an Option | `SubTrigger.event: "whenOptionUsed"` | real hand Option use and BT17-035 effect-driven use |
| cost 2 or more | `triggerOptionCostAtLeast`, `value: 2` | BT4-104 cost 0 negative; BT8-097 reduced to cost 1 negative; BT1-102 cost 2 positive |
| Draw 1 | `Draw`, `controller: "mine"`, `amount: 1` | exact deck-to-hand instance assertions |

#### Q&A and stack coverage

- Q3269: the real Option lifecycle is settled before the draw assertion; the Option is in trash when the watcher result is observed.
- Q3270: BT10-100's real `<Delay>` activation moves the Option to trash without firing Viximon.
- Q3271: BT8-097 with five opposing Digimon has its own use cost reduced from 6 to 1; Viximon does not draw.
- Q5479: BT17-035 uses a yellow cost-2 Option with payment reduced by 2; Viximon draws while memory only pays the evolution cost.
- Q5480: ST22-05's real [When Digivolving] effect uses the cost-6 ST22-10 without paying; Viximon draws, the Option resolves and reaches face-up security, and memory only pays the evolution cost.
- Evolution proof uses an EX2-003 card hatched from the egg deck, public digivolution into EX2-020 during Main, a real intervening opponent turn, and public move from the next Breeding phase into the battle area before the inherited effect is used; the Option use and exact draw/trash assertions complete before loop cleanup. Both players have twelve inert BT1-009 through BT1-014 main-deck cards, preventing deck-out during the turn sequence. No phase field is mutated.
- All test deck and security fixtures use inert main-deck cards BT1-009 through BT1-014; Digi-Egg cards are confined to the explicit egg deck or breeding-source fixtures. Draw assertions retain distinct `drawnOne`/`drawnTwo` and `drawnByOption`/`drawnByViximon` aliases.

#### Verification commands and results

Validation is intentionally serialized by the coordinator for RAM safety. The focused behavior suite and scoped Oxlint remain coordinator-owned. The scoped formatter was run after fixture sanitization:

```text
./node_modules/.bin/oxfmt --write apps/api/src/cards/EX2/EX2-003.test.ts
Finished in 1ms on 1 files using 10 threads.

./node_modules/.bin/oxfmt --check apps/api/src/cards/EX2/EX2-003.test.ts
All matched files use the correct format.
Finished in 1ms on 1 files using 10 threads.
```

`git diff --check`, focused Vitest, and scoped Oxlint remain pending the coordinator's validation window. No broad test suite or workspace typecheck was run in this lane.

#### Rubric

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog fields, printed clause, KB Q3269/Q3270/Q3271/Q5479/Q5480 recorded |
| IR trace | 2/2 | Full typed IR; zero residuals; exclusive `registerIrCard` registration |
| Behavioral proof | 2/2 | Positive, boundary, once-per-turn/reset, and activation-path tests |
| Peer / stack proof | 2/2 | BT4-104, BT8-097, BT17-035 peers plus a legal EX2-003 evolution stack |
| Gates | 0 | Focused Vitest, Oxlint, and diff checks remain coordinator-pending; Oxfmt passes |
| **Total** | **8/10 pending gates** | Final score is 10/10 only after focused tests, scoped lint/format, and diff checks pass |

#### Remaining gaps

The only remaining work is execution of the coordinator-approved focused Vitest, scoped Oxlint, and diff checks. Oxfmt is clean. If the remaining gates pass, this report should be updated to 10/10 with exact command output and the final collection status.

### EX2-004 — Gummymon

EX2-004 is a Green level 2 Digi-Egg (In-Training, Lesser), with no play cost,
no evolution requirements, and no main or security effect. Its only printed
behavior is the inherited effect:

> `[Your Turn][Once Per Turn] When an opponent's Digimon becomes suspended, ＜Draw 1＞.`

#### Catalog and knowledge-base evidence

The exact card record was checked in `packages/shared/src/cards/data/cards.json`:

- name: Gummymon
- color/kind: Green / Digi-Egg
- level/form/trait: 2 / In-Training / Lesser
- inherited text: `[Your Turn][Once Per Turn] When an opponent's Digimon becomes suspended, ＜Draw 1＞. (Draw 1 card from your deck.)`
- no main effect, security effect, or evolution requirement

`node tools/kb/query.mjs card EX2-004` returned one ruling:

| ID | Question | Answer | Proof |
|---|---|---|---|
| Q3272 | Does the inherited effect activate when an opponent suspends a Digimon by blocking? | Yes. | `reacts to a Blocker suspension...` uses a public attack followed by `declareBlock` and observes the draw. |

#### Printed clauses

| # | Clause |
|---|---|
| C1 | `[Your Turn]` gates the watcher to the Gummymon controller's own turn. |
| C2 | `[Once Per Turn]` allows one successful draw per turn and resets on the next own turn. |
| C3 | The event is an opponent's Digimon becoming suspended, including suspension by blocking. |
| C4 | The result is Draw 1 from the controller's deck. |

#### Clause → test → IR

| Clause | Behavioral proof | IR mapping |
|---|---|---|
| C1, C3, C4 | `draws once when an opposing Digimon becomes suspended` plays ST9-10 through `playCard`, suspends an opponent's Digimon, and observes the named deck card in hand. | `trigger: "YourTurn"` → `SubTrigger event: "whenSuspended"` → `Draw controller: "mine", amount: 1` |
| C1 negative | `does not draw when an opponent suspends its host during the opponent's turn` has seat 1 play ST9-10 against the Gummymon host and confirms the card remains in seat 0's deck. | Window trigger is `YourTurn`, not `AllTurns`/`OpponentsTurn`. |
| C3 controller/filter negative | `does not draw when one of its controller's Digimon becomes suspended` suspends seat 0's own host by attack and proves no draw. | `sourceFilter: { controller: "opponent", kind: ["Digimon"] }` |
| C2 same-turn cap and reset | `reacts to a Blocker suspension, only once that turn, and resets on its next turn` uses two public attack/block sequences in the same turn: the first blocker draws once and the second qualifying blocker produces no second draw; after the real turn loop advances, a third blocker produces exactly one new draw. | `frequency: "OncePerTurn"` on the inherited effect; real turn loop resets the ledger. |
| C3/Q3272 | The same blocker test uses `declareBlock`; the blocker suspends as part of the production battle flow and the inherited draw is observed. | `whenSuspended` watcher has no exclusion for block-generated suspensions. |
| C1–C4 through stack | `retains the watcher through a legal green evolution stack` evolves a Green Lv.3 host carrying EX2-004 into EX2-026 for the catalog cost, preserves `[EX2-004, BT1-064]`, then uses ST9-10 and observes the draw. | `isInherited: true` keeps the watcher available from the digivolution source. |

#### Implementation review

`apps/api/src/cards/EX2/EX2-004.ts` is compiled IR and registers exclusively
with `registerIrCard("EX2-004", compiled)`. The whole-file `@ts-nocheck` was
removed; no replacement suppression or handwritten second registration is
present. The IR is fully typed by `CompiledCard`, with `coverage: "full"` and
an empty residual list.

The shared interpreter path was followed:

- the `YourTurn` effect is registered as an inherited watcher;
- `SubTrigger` listens for `whenSuspended` and filters the event subject to an
  opponent-controlled Digimon;
- `frequency: "OncePerTurn"` is enforced by the turn ledger and resets through
  the real turn machine;
- the draw action resolves against the source controller's deck.

No reusable engine seam or card implementation defect was found.

#### Changes

- Removed `// @ts-nocheck` from `EX2-004.ts`.
- Exported the existing typed `compiled` IR for colocated structural proof;
  registration remains exclusively through `registerIrCard`.
- Added exact catalog/IR assertions and public behavioral coverage to
  `EX2-004.test.ts`.
- Added Q3272 block-flow proof, same-turn once-per-turn proof, next-own-turn
  reset proof, opponent-turn negative, and a legal evolution-stack case.
- All fixtures use main-deck cards in deck/security zones; no Digi-Egg is
  placed in a deck or security stack. The final remaining `BT1-001` deck
  fillers were replaced with inert `BT1-009`–`BT1-012` cards.
- No engine, shared, catalog, or other-card files were changed.

#### Remaining gaps

No unresolved EX2-004-specific ambiguity remains. The card has no optionality,
cost, target decision, security, numeric boundary, or zone-choice clauses beyond
the ordinary deck draw. The collection delivery gates are coordinator-owned and
intentionally scored 0 in this worker report. The first post-edit attempt found
that the structural test imported `compiled` from a module that did not export
it (`undefined`, 1 failed / 5 passed). The module now exports the existing IR;
focused execution and scoped lint/format remain pending the coordinator's RAM
release.

#### Commands and results

No EX2-004 test, lint, format, or typecheck process was started in this lane
because the coordinator's RAM guard is closed. The required bounded command is:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX2/EX2-004.test.ts \
  --maxWorkers=1 --no-file-parallelism
```

The coordinator must run that command after the edits, then scoped Oxlint/Oxfmt
and `git diff --check`. Workspace typecheck and broad suites are intentionally
not run in this lane.

#### Score

| Category | Score | Basis |
|---|---:|---|
| Catalog / rules | 2/2 | Exact catalog contract checked; Q3272 identified and assigned a public block-flow proof. |
| IR trace | 2/2 | Every printed clause maps to typed `YourTurn`/inherited `SubTrigger`, exact opponent Digimon filter, once-per-turn frequency, and Draw 1. |
| Behavioral proof | 2/2 | Positive public suspension, own-controller negative, opponent-turn negative, same-turn cap, Q3272 blocking, next-own-turn reset, and exact deck/hand endpoints are covered. |
| Peer / stack proof | 2/2 | Comparable EX2-026 watcher shape was reviewed; legal Green evolution retains EX2-004 and the watcher draws after the stack transition. |
| Delivery gates | 0/2 | Fixed at 0 for the worker lane; coordinator owns final collection gates. |
| **Total** | **8/10** | Pending bounded execution and collection-level gates. |

### EX2-005 — Hopmon

#### Sources

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX2-005` (Hopmon), Black Digi-Egg, Lv.2, Baby Dragon, inherited text: `[Your Turn] While you have a black Tamer in play, this Digimon gets +1000 DP.`
- Knowledge base: `node tools/kb/query.mjs card EX2-005` returned `(no knowledge-base entries)`.
- Comprehensive rules: §1-4-1-3 (Digi-Egg deck), §2-3-1/§2-3-2 (card identity and colors), §4-3-3 (inherited effects), §4-18 (hatching), §8-1-3 (evolution cost, stack placement, and draw), and §15-3-1/2 (inherited effect activation and Digimon effect type).
- Relevant peers: EX2-002/EX2-006 use the same `YourTurn` inherited `Aura` shape; EX2-032 and EX2-035 exercise black-Tamer filters; BT17/BT19 card tests provide the public hatch/evolve/move route.

#### Clause and proof mapping

| Printed clause | IR mapping | Behavioral proof |
|---|---|---|
| `[Your Turn]` | `effects[0].trigger = "YourTurn"` | Existing opponent-turn negative and the public stack route during the controller's turn |
| `While you have a black Tamer in play` | `Aura.while = { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Black"] } }` | Positive own black Tamer, non-black own Tamer, and opponent-controlled black Tamer negatives |
| `this Digimon gets +1000 DP` | `Aura.target` self-reference and `effect = { kind: "modifyDP", amount: 1000 }` | Exact DP assertions on a 4000-DP Guardromon host (5000 with effect, 4000 without) |
| inherited effect | `isInherited: true` | Public hatch → cost-0 Monodramon evolution → move from breeding → cost-2 Guardromon evolution; stack identity is asserted after both transitions |

The Digi-Egg appears only in `eggDeck` or as a digivolution card under a Digimon; no Digi-Egg is put in a main deck or security stack. All fixtures use explicit security cards rather than numeric shorthand, with inert main-deck fillers `BT1-009` through `BT1-014`.

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX2/EX2-005.ts`; the existing `CompiledCard` IR is type-safe without suppression.
- Kept executable registration exclusively as `registerIrCard("EX2-005", compiled)`.
- Replaced the prior illegal blue host fixture with legal black EX2 stacks (Hopmon → Monodramon → Guardromon).
- Replaced all accidental Digi-Egg `BT1-001` deck/security fillers with inert main-deck Digimon IDs (`BT1-009`–`BT1-014`).
- Added controller, turn, color, exact-DP, legal-evolution, paid-cost, stack, draw, and illegal-source behavioral coverage.

#### Verification

- `node tools/kb/query.mjs card EX2-005` — passed; no KB entries.
- Focused Vitest — coordinator ran `pnpm --filter @aegis/api exec vitest run src/cards/EX2/EX2-005.test.ts --maxWorkers=1 --no-file-parallelism`: **6/6 passed**.
- `pnpm typecheck` — intentionally not run; forbidden by the worker brief/RAM guard.
- Scoped Oxfmt — `pnpm exec oxfmt apps/api/src/cards/EX2/EX2-005.test.ts`: passed after the coordinator's formatting review.
- Scoped Oxlint — pending coordinator RAM window.
- `git diff --check` — pending final coordinator verification for this lane.

#### Remaining gaps

No card-specific ruling ambiguity or engine seam was found. The expanded focused suite is green and the touched test is formatted; scoped Oxlint and final diff check remain pending coordinator verification.

#### Rubric (current evidence)

| Category | Score | Notes |
|---|---:|---|
| Catalog / rules | 2/2 | Printed card fields and applicable comprehensive-rule sections identified; no Q&A exists |
| IR trace | 2/2 | Turn trigger, controller/color gate, self target, +1000 amount, and inherited marker map directly |
| Behavioral proof | 1/2 | Expanded positive, negatives, exact DP, and evolution proof are authored but await execution |
| Peer / stack proof | 2/2 | Legal EX2 black line and public stack route are represented, including illegal blue-source negative |
| Fixed gates | 0 | Per worker brief |

### EX2-006 — Yaamon

#### Contract and source evidence

- Catalog source: `packages/shared/src/cards/data/cards.json`, `EX2-006`.
- Catalog fields verified: Yaamon; Purple; Digi-Egg; level 2; play cost `-1`; 0 DP; In-Training; Lesser.
- Printed inherited clause: `[Your Turn] While there are 10 or more cards in your trash, this Digimon gets +2000 DP.`
- Knowledge-base source: `node tools/kb/query.mjs card EX2-006` (no card-specific Q&A entries).
- Relevant rules interpretation: the clause is a continuous inherited Aura, scoped to its controller's trash and active only during that controller's turn.

#### Implementation trace

`apps/api/src/cards/EX2/EX2-006.ts` registers exactly one executable record with `registerIrCard("EX2-006", compiled)`.

| Printed requirement | IR proof | Behavioral proof |
| --- | --- | --- |
| inherited effect | `effects[0].isInherited: true` | legal EX2-006 -> EX2-039 stack, followed by public move from breeding |
| Your Turn | `effects[0].trigger: "YourTurn"` | opponent-turn test leaves the host at printed DP |
| 10 or more cards in your trash | `Aura.while.kind: "zoneCount"`, `seat: "mine"`, `zone: "trash"`, `op: "gte"`, `value: 10` | 9-to-10 transition test; opponent's 10-card trash does not qualify |
| this Digimon gets +2000 DP | self-reference target plus `modifyDP: 2000` | only the host carrying EX2-006 rises from 6000 to 8000 |

#### Stack and boundary coverage

- Exact threshold is proven with nine own trash cards, a public BT4-104 security trash action, and the observable 6000 -> 8000 DP transition.
- A second own Digimon remains at 6000 DP, proving the Aura targets only the Digimon carrying Yaamon.
- Ten cards in the opponent's trash do not count toward the controller's threshold.
- A Purple EX2-006 -> EX2-039 egg stack is hatched from the egg deck, evolved publicly during Main, carried through a real intervening opponent turn, and moved publicly during the next Breeding phase before the inherited DP is asserted. Both players receive twelve inert BT1-009 through BT1-014 main-deck cards to prevent deck-out during the sequence. No phase field is mutated.
- A Red BT1-001 egg is rejected as an illegal source for the Purple comparison evolution, with the hand and stack unchanged.
- During the opponent's turn, ten cards in the owner's trash do not activate the inherited Aura.

#### Verification commands and results

RAM-safe coordinator validation is pending. This lane intentionally ran no Vitest, lint, format, workspace typecheck, or Git write command.

```text
PENDING COORDINATOR RAM RELEASE
```

#### Rubric

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | All catalog fields and the printed inherited clause recorded; no KB ambiguity |
| IR trace | 2/2 | Typed full IR, zero residuals, exclusive `registerIrCard` registration |
| Behavioral proof | 2/2 | Exact threshold, dynamic transition, self-target, and opponent-turn negative tests |
| Peer / stack proof | 2/2 | Legal Purple egg stack and illegal Red-source negative; BT4-104 public trash transition |
| Gates | 0 | Coordinator gate result pending |
| **Total** | **8/10 pending gates** | Final score is 10/10 only after focused tests, scoped lint/format, and diff checks pass |

#### Remaining gaps

Only coordinator-approved focused Vitest, scoped Oxlint/Oxfmt, and `git diff --check` remain to be recorded. No reusable engine seam was changed.

### EX2-007 — Mother D-Reaper

#### Sources

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX2-007` (Mother D-Reaper), White Digi-Egg, no level, 15,000 DP, `[D-Reaper]` form. Printed clauses: `[All Turns] This Digimon can't attack and isn't affected by your opponent's effects.`; `[Main][Once Per Turn] If you don't have another [Mother D-Reaper] in play, place 1 of your [ADR-02 Searcher]s from in play or from your hand under this Digimon as its bottom digivolution card.`; `[Your Turn][Once Per Turn] When you would play a card with [D-Reaper] in its traits from your hand, you may reduce its play cost by 1 for each of this Digimon's digivolution cards.`
- Knowledge base: `node tools/kb/query.mjs card EX2-007 --json` returned banlist `BANNED_PAIR` with EX7-064 (effective 2025-03-28) and 28 Q&A entries: Q1198, Q1265, Q1270, Q1272, Q1923, Q2402, Q2403, Q2463, Q3273–Q3288, Q3347, Q3558, Q4008, Q4010.
- Comprehensive rules: §1-4-1-3 (Digi-Egg deck), §2-3-1/§2-3-2 (name/trait references), §4-3-1/3 (Digi-Eggs are Digimon and gain inherited effects), §4-18 (hatching), §8-1-3 (digivolution stack processing), §15-3 (inherited effects), and the movement/immunity rules used by the cited Q&A.
- Relevant peers: EX2-046/EX2-048/EX2-049 and EX2-055 exercise the D-Reaper/Searcher stack line; BT8-071 provides the Q3283 cost-reduction prohibition control.

#### Clause and proof mapping

| Printed clause | IR mapping | Behavioral proof |
|---|---|---|
| `[All Turns] This Digimon can't attack` | `AllTurns` → `Restrict(attack)` on self, permanent duration | Existing integrated `cannot attack` test |
| `isn't affected by your opponent's effects` | `AllTurns` → `GrantImmunity(immuneFrom: "opponentEffects")` on self, permanent duration | Existing opponent On Play suspension test; new compiled-clause assertion |
| Q3278: an opponent's Digimon with permission to attack unsuspended Digimon may attack Mother | Mother has no attack-target restriction; its immunity only applies to opponent effects, not attack legality | Public BT8-018 attack targets an initially unsuspended Mother and resolves normally |
| Q3279: Mother can be deleted by battle when its DP is less than or equal to the attacker | Battle deletion is not an opponent effect applied to the target; the static immunity does not prevent combat | Public BT8-018 is given a 20,000-DP battle fixture, attacks unsuspended Mother, and deletes it in battle |
| Q3280: own effects may affect Mother | The immunity source is `opponentEffects` only; owner-controlled deletion remains an applicable effect | Public BT7-107 deletion presents Mother in its own-Digimon target payload and explicitly selects its permanent ID; the card leaves the battle area, proving the owner effect applies |
| Q3281: when a qualifying effect moves Mother out of play, its Digi-Egg handling must be face-down at the bottom of the owner's Digi-Egg deck | Canonical deletion movement routes deleted Digi-Egg cards to `Zone.EggDeck` face-down at the bottom, while ordinary Digimon remain in `Zone.Trash` | Public BT7-107 deletion assertion captures all four zones, bottom ordering, and Mother’s face-down state; coordinator rerun pending |
| `[Main][Once Per Turn]` and no other Mother | `Main`, `frequency: OncePerTurn`, `youHaveNone` exact `Mother D-Reaper` excluding self | Existing first/second activation test and new Q3277 breeding-area negative |
| Place one Searcher from hand or battle area under this, bottom | `PlaceUnder`, exact `ADR-02 Searcher`, `mixedSources: { hand, battleAreaPermanents }`, destination exact Mother, default bottom | Existing hand and in-play Searcher tests; Q3287 asserts only top Searcher moves and existing Searcher sources trash |
| `[Your Turn][Once Per Turn]` play reduction | `YourTurn`, `frequency: OncePerTurn`, `Replacement(wouldBePlayed)` with exact `[D-Reaper]` trait source filter and `scaling: { per: 1, unit: "digivolutionCards" }` | Existing first/second D-Reaper play test; new compiled assertion and Q3283 Psychemon negative |
| Q3282: declining the first optional reduction does not consume the once-per-turn opportunity | Optional reduction is inside the once-per-turn replacement and only an accepted replacement changes the play cost | Publicly decline the first EX2-047 play reduction, then accept it for the second same-turn D-Reaper play and assert full then reduced costs |
| Q3285/Q3286: an opponent may target Mother, and its immunity does not cancel effects on other targets | `GrantImmunity(immuneFrom: "opponentEffects")` is evaluated per target; it is not a global effect cancellation | Public BT6-095 lowest-DP deletion has Mother and an equal-DP peer as candidates; Mother remains while the peer is deleted |

Q&A evidence grouping: Q3273/Q3274/Q3276 are covered by the Digi-Egg catalog and breeding/DP engine rules; Q3275 is explicit in the no-level catalog field; Q3277 and Q3283 have direct focused tests; Q3287 is directly covered by the existing in-play Searcher stack test; Q1923/Q3288/Q3347 are covered by EX2-055's focused tests; Q1198/Q1265/Q1270/Q1272/Q2402/Q2403/Q3558/Q4008/Q4010 are movement-rule interactions covered by the corresponding return/security effect suites. Q3278/Q3279/Q3280/Q3282/Q3285/Q3286 have direct public focused scenarios in the colocated test. Q3281 now has a direct positive public deletion-to-EggDeck assertion plus a canonical access-layer regression; coordinator rerun is pending.

The Digi-Egg is used only in `eggDeck`, breeding, or as a stack card in fixtures; no Digi-Egg is placed in a main deck or security stack. All filler deck/security cards use inert main-deck IDs (`BT1-009` through `BT1-014`).

#### Changes

- Replaced the dead handwritten `EffectModule` implementation with one typed `CompiledCard` IR record and one exclusive `registerIrCard("EX2-007", compiled)` registration.
- Added the missing opponent-effect immunity clause as `GrantImmunity`.
- Scoped the play-cost replacement to owned Digimon with the exact `[D-Reaper]` trait and retained stack-card scaling.
- Corrected Main placement to exact `Mother D-Reaper`/`ADR-02 Searcher` name matching with mixed hand/field source handling.
- Added structural proof and focused Q3277/Q3283 tests while preserving existing integrated and Searcher-stack tests.
- Added public Q3278/Q3279 attack-and-battle proof (with an explicit 20,000-DP attacker boundary), Q3280 owner-deletion proof with explicit public target response, Q3282 decline-then-accept proof, and Q3285/Q3286 per-target immunity proof.
- Converted the named-red Q3281 movement test to a positive public assertion: owner-controlled BT7-107 deletion now leaves Mother face-down at the bottom of its owner's Digi-Egg deck, with no trash copy.
- Added a canonical `GameStateAccess` deletion regression covering the Digi-Egg route and preserving bottom ordering; ordinary Digimon deletion remains routed to trash.

#### Verification

- `node tools/kb/query.mjs card EX2-007 --json` — passed; banlist and all 28 Q&A IDs recorded above.
- Focused coordinator Vitest — prior run was 15/16; the sole red was Q3281 before the shared deletion seam. Post-fix coordinator rerun is pending.
- `pnpm typecheck` — intentionally not run; forbidden by the worker brief/RAM guard.
- Scoped Oxlint/Oxfmt on the EX2-007 module/test and shared deletion seam — passed.
- `git diff --check` — passed for the changed card, report, and shared deletion files.

#### Remaining gaps

The corrected public Q3278/Q3279/Q3280/Q3281/Q3282/Q3285/Q3286 scenarios are authored. The canonical deletion seam now routes each deleted Digi-Egg card face-down to the bottom of its owner's `Zone.EggDeck`, while ordinary Digimon and attached cards remain in `Zone.Trash`; coordinator rerun and final scoped gates are pending. No second registration was introduced.

#### Rubric (current evidence)

| Category | Score | Notes |
|---|---:|---|
| Catalog / rules | 2/2 | Catalog, banlist, all 28 Q&A IDs, and applicable rules identified |
| IR trace | 2/2 | All three printed clauses now have direct typed IR mappings |
| Behavioral proof | 1/2 | Direct public Q3278/Q3279/Q3280/Q3282/Q3285/Q3286 proof is present; Q3281 is converted to a positive EggDeck assertion but post-fix coordinator rerun is pending |
| Peer / stack proof | 2/2 | D-Reaper/Searcher peers and stack interactions are covered in focused/related suites |
| Fixed gates | 0/2 | Per worker brief; coordinator must rerun the card and shared movement regressions |

**Current score: 7/10** (catalog/rules 2/2, IR trace 2/2, behavioral proof 1/2 pending rerun, peer/stack proof 2/2, fixed gates 0/2).

### EX2-008 — Guilmon

EX2-008 is a Red level 3 Rookie Digimon (Virus, Reptile), play cost 3, with a
Red Lv.2 evolution route for 0. It has one On Play search and one inherited
When Attacking deletion effect.

#### Printed clauses

| # | Clause |
|---|---|
| C1 | `[On Play]` Reveal the top 4 cards of your deck. |
| C2 | Add 1 card with `[Growlmon]` or `[Gallantmon]` in its name and 1 `[Takato Matsuki]` among the revealed cards to your hand. |
| C3 | Place every remaining revealed card at the bottom of your deck in any order. |
| C4 | Inherited `[When Attacking][Once Per Turn]`: if this Digimon has `[Growlmon]` or `[Gallantmon]` in its name, delete 1 opponent Digimon with 3000 DP or less. |

#### Catalog and Q&A evidence

The exact catalog record was checked in `packages/shared/src/cards/data/cards.json`,
including the Red/3/1000/3 facts, Red Lv.2 evolution cost 0, Virus/Reptile
traits, and both printed texts.

`node tools/kb/query.mjs card EX2-008` returned:

| ID | Ruling | Proof |
|---|---|---|
| Q3289 | If only one of the two search categories is present, that available card may still be added. | `adds the only available category when the top four contain only Takato (Q3289)` asserts Takato enters hand and the other three cards bottom-deck. |
| Q3290 | When both categories are present, both must be added; the player cannot voluntarily add only one. | The mandatory two-bucket IR assertion and the positive top-four test assert both Growlmon and Takato enter hand. |
| Q3301 | A revealed Gallantmon-name card qualifies for the first bucket. | `adds a revealed Gallantmon by exact name (Q3301)` reveals EX2-011 Gallantmon and asserts it enters hand. |

#### Clause → test → IR

| Clause | Behavioral proof | IR mapping |
|---|---|---|
| C1 reveal four | `adds a Growlmon/Gallantmon and Takato from the top four on play` uses public `playCard` and settles the full reveal. | `OnPlay` → `RevealAdd.revealCount: 4` |
| C2 first bucket | Positive Growlmon test and Q3301 Gallantmon test; exact-name matching is encoded and exercised. | `add[0].filter.nameOrTrait.tokens = ["Growlmon", "Gallantmon"]`, `match: "name"`, count 1, to hand |
| C2 Takato bucket | Positive two-category test and Q3289 Takato-only test. | `add[1].filter.nameOrTrait.tokens = ["Takato Matsuki"]`, `match: "name"`, count 1, to hand |
| C3 remaining cards | Positive test asserts exact bottom-deck order; no-match test asserts all four return to the deck. | `rest: "deckBottom"` |
| C4 inherited trigger and name gate | 3000-DP positive, 4000-DP boundary, non-Growlmon-family negative, legal evolution-stack test, and next-own-turn reset test. | `WhenAttacking`, `isInherited: true`, `frequency: "OncePerTurn"`, `selfHasNameContaining`, Delete opponent Digimon DP `lte 3000`, count 1 |

#### Implementation review

`apps/api/src/cards/EX2/EX2-008.ts` is fully typed as `CompiledCard`, has
`coverage: "full"` and `residual: []`, and registers only through
`registerIrCard("EX2-008", compiled)`. The `@ts-nocheck` directive was removed.

The RevealAdd path was followed into the interpreter: both add buckets are
mandatory counts of one, each can independently be absent, and all unchosen
cards use the explicit `deckBottom` rest destination. The inherited path uses
the exact name condition and the printed numeric boundary. No engine seam or
card defect was found.

#### Changes

- Removed `// @ts-nocheck` from `EX2-008.ts`.
- Exported the existing typed `compiled` IR for colocated structural proof;
  registration remains exclusively through `registerIrCard`.
- Added exact catalog/IR assertions.
- Added Q3289 single-bucket and Q3301 Gallantmon-name proofs.
- Added legal Red evolution-stack proof and public next-own-turn once-per-turn
  reset proof.
- No engine, shared, catalog, other-card, ledger, or run files were changed.

#### Remaining gaps

Q3290 is proven by the mandatory two-bucket IR shape plus the existing public
two-card positive route; no optional refusal exists in the printed text. The
existing same-turn second-attack check uses the test-only unsuspend seam as a
structural companion; the public next-own-turn test proves the reset. The first
post-edit run also found two harness defects: the structural test imported an
unexported `compiled` value, and the reset fixture lacked `autoSelectCards` while
two legal deletion targets were present, so it waited on a target decision. A
later run also exposed an alias lookup after `firstTarget` had already been
deleted; the test now captures its permanent ID before the attack. A subsequent
turn-loop run also reached deck-out for the opponent before the reset window;
both players now have sufficient inert main-deck cards for the full public turn
flow. The reset proof now uses a local public attack-settle helper: it explicitly declines
the Guardromon Blocker window when opened, then waits for combat completion before passing
Main. This avoids a stale combat phase at the next attack. All deck and security fillers
are inert main-deck cards (BT1-009 through BT1-014); no optional or additional zone clauses
apply.

#### Commands and results

No test, lint, or typecheck process was started in this lane because the
coordinator's RAM guard is closed. Oxfmt was run only on the two edited tests:

```text
pnpm exec oxfmt apps/api/src/cards/EX2/EX2-004.test.ts \
  apps/api/src/cards/EX2/EX2-008.test.ts
→ Finished in 12ms on 2 files using 10 threads
```

Required bounded test command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX2/EX2-008.test.ts \
  --maxWorkers=1 --no-file-parallelism
```

The coordinator must run that command, scoped Oxlint/Oxfmt, and `git diff --check`
after the edits. Workspace typecheck and broad suites are intentionally omitted.

#### Score

| Category | Score | Basis |
|---|---:|---|
| Catalog / rules | 2/2 | Exact catalog contract checked; Q3289, Q3290, and Q3301 identified and mapped to proof. |
| IR trace | 2/2 | Reveal count, two mandatory add buckets, deck-bottom rest, inherited trigger, exact name gate, DP boundary, and once-per-turn frequency all map directly to typed IR. |
| Behavioral proof | 2/2 | Public On Play search, one-category and both-category outcomes, no-match negative, 3000/4000 DP boundary, name negative, legal evolution, and turn reset covered. |
| Peer / stack proof | 2/2 | EX2-009 shared inherited deletion shape reviewed; EX2-008 is retained through a legal Red Lv.3→Lv.4 evolution and remains behaviorally active. |
| Delivery gates | 0/2 | Fixed at 0 for the worker lane; coordinator owns final collection gates. |
| **Total** | **8/10** | Pending bounded execution and collection-level gates. |

### EX2-009 — Growlmon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-009`) — red level 4 Digimon, 5000 DP, play cost 6, red level 3 / cost 2 evolution, and the exact printed effect and inherited effect asserted by the structural test.
- Knowledge base command: `node tools/kb/query.mjs card EX2-009 --json` — no card-specific errata, restrictions, or Q&A entries.
- Comprehensive rules queried locally: §2-3-1-3 ("with [XX] in its name" includes the bracketed text), §2-3-2-3/4 (trait references), §11 and §15-16-5 (attack declaration and [When Attacking] timing), §15-14-1 (once-per-turn use and reset when the turn changes), and §15-4-4 (pending triggered effects).

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| [When Attacking] delete 1 opponent Digimon at 2000 DP or less | `EX2-009/ir-0-0`, `Delete` + opponent/Digimon/DP `lte 2000`, conditional on no red Tamer | Base-limit test and legal public evolution route delete the 2000-DP boundary while preserving 4000 DP. |
| If a red Tamer is in play, use 4000 DP or less instead | `EX2-009/ir-0-1`, `Delete` + opponent/Digimon/DP `lte 4000`, conditional on a red Tamer | Red-Tamer test deletes exactly the 4000-DP target and leaves 7000 DP; blue-Tamer negative remains on the 2000-DP branch. |
| Inherited [When Attacking][Once Per Turn], if this Digimon has Growlmon/Gallantmon in its name, delete 1 opponent Digimon at 3000 DP or less | `EX2-009/ir-1-0`, inherited `Delete`, exact name-containing condition, DP `lte 3000`, `frequency: OncePerTurn` | Growlmon-family positive, non-family negative, legal four-step stack, and a real three-turn public loop prove the 3000 boundary and reset after the opponent's turn; the compiled structural assertion proves the once-per-turn declaration. |

No trait-based card filter is printed on EX2-009; the name-containing condition is tested against a matching family name and a near-purpose nonmatching host. All fixtures use legal main-deck Digimon fillers (`BT1-009`–`BT1-014`), never Digi-Eggs in deck/security, and no numeric security shortcut.

#### Changes

- Removed `@ts-nocheck` and exported the typed `CompiledCard` for structural evidence.
- Preserved exclusive `registerIrCard("EX2-009", compiled)` registration and the generated IR’s two conditional base branches plus inherited once-per-turn branch.
- Added catalog/IR assertions, red/non-red Tamer boundary tests, legal red evolution with memory payment and evolution draw, illegal-color evolution rejection, non-family inherited negative, and a continuous public `startTurnLoop` whose `finishPublicAttack` helper declines every opponent Blocker window before tolerant Main-phase closure and the Active phase unsuspends the attacker for the next-own-turn reset attack.
- Sanitized all EX2-009 fixtures to remove Digi-Egg `BT1-001` from security.

#### Verification status

The coordinator owns serial execution. The coordinator's focused run passed all 8 tests, and its fixture/internal-verb scan was clean:

```text
8 passed, 0 failed
fixture/internal-verb scan: clean
```

Scoped formatting was then written and checked:

```text
pnpm exec oxfmt apps/api/src/cards/EX2/EX2-009.test.ts
### Finished in 3ms on 1 files using 10 threads.
pnpm exec oxfmt --check apps/api/src/cards/EX2/EX2-009.test.ts
### All matched files use the correct format.
```

No typecheck or Git write was run in this lane; scoped lint and `git diff --check` remain coordinator-owned. Current rubric: catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/evolution-stack proof 2/2; fixed gates 0. No unresolved card-specific rules ambiguity is known.

### EX2-010 — WarGrowlmon

#### Contract and source evidence

- Catalog source: `packages/shared/src/cards/data/cards.json`, `EX2-010`.
- Catalog fields verified: WarGrowlmon; Red; Digimon; level 5; play cost 8; 8000 DP; Red level 4 evolution for 3; Ultimate; Virus; Cyborg.
- Printed effect: `[When Attacking] Delete 1 of your opponent's Digimon with 4000 DP or less. If you have a red Tamer in play, delete 1 of your opponent's Digimon with 6000 DP or less instead.`
- Printed inherited effect: `[Your Turn] Add 1000 to the maximum DP you can choose with DP-based deletion effects.`
- Knowledge-base source: `node tools/kb/query.mjs card EX2-010`.
- Applicable Q&A: Q3291 (numeric DP ceilings are increased), Q3292 (source-relative DP ceilings are not increased), and Q3293 (the inherited modifier applies to all of the owner's effects).
- No unresolved catalog, ruling, or rules ambiguity remains for this card.

#### Implementation trace

`apps/api/src/cards/EX2/EX2-010.ts` is fully typed and registers exactly one executable record with `registerIrCard("EX2-010", compiled)`.

| Printed requirement | IR proof | Behavioral proof |
| --- | --- | --- |
| attack deletion at 4000 DP or less | `WhenAttacking` `Delete` with `dp.op: "lte"`, `value: 4000`, count 1 | no-red-Tamer boundary test deletes 4000 DP and leaves 6000 DP |
| red Tamer replacement at 6000 DP or less | conditional `Delete` with `dp.value: 6000` and `youHave` Red Tamer; base branch is `youHaveNone` | red-Tamer boundary test deletes 6000 DP and leaves 7000 DP |
| inherited +1000 numeric DP ceiling | inherited `YourTurn` `CostModifier` with `mode: "raiseCeiling"`, `costType: "dpDeletion"`, amount 1000 | legal EX2-009 → EX2-010 stack lets EX2-067 delete its 4000 DP target (base 3000 + 1000) |
| owner-wide scope | modifier has no self target; interpreter applies `dpDeletion` ceiling to the source owner seat | the legal-stack test uses a separate EX2-067 effect; opponent-turn test confirms the modifier does not leak to the opponent |
| numeric-only ceiling rule | modifier is applied only by the engine's numeric DP-deletion ceiling path | BT19-014's source-relative attack remains unable to delete a 13000 DP target (Q3292) |

#### Q&A and stack coverage

- Q3291: attack tests exercise the inclusive 4000/6000 thresholds and the immediate above-limit 7000 target.
- Q3292: a separate BT19-014 attack uses “as much or less DP as this Digimon”; the 12000 DP source cannot delete the 13000 DP target despite WarGrowlmon's active +1000 modifier.
- Q3293: one continuous production turn loop enters Main0 for a public EX2-009 → EX2-010 → EX2-011 evolution chain. EX2-010 is then underneath the top card as an inherited source in the same Main0, and a separate EX2-067 Option deletes a 4000 DP target. The endpoint asserts top card EX2-011 and source stack `EX2-009`, `EX2-010` before clean surrender/loop completion.
- The opponent-turn test uses the production turn loop and public `endMainPhase`/`playCard` intents. A red BT1-009 source makes the opponent's Fire Ball legal, but its 3000 DP effect cannot delete a 4000 DP target on the WarGrowlmon owner's board.
- All deck/security fixtures use non-Digi-Egg cards and no numeric security shortcut. No direct phase mutation or injected timing verb is used.

#### Verification commands and results

Coordinator validation is serialized for RAM safety. The focused Vitest, scoped Oxlint, and `git diff --check` commands remain pending; no workspace typecheck or broad suite was run.

The scoped formatter was run after the final test edit:

```text
./node_modules/.bin/oxfmt --write apps/api/src/cards/EX2/EX2-010.test.ts
Finished in 1ms on 1 files using 10 threads.

./node_modules/.bin/oxfmt --check apps/api/src/cards/EX2/EX2-010.test.ts
All matched files use the correct format.
Finished in 2ms on 1 files using 10 threads.
```

#### Rubric

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog fields, printed clauses, and KB Q3291/Q3292/Q3293 recorded |
| IR trace | 2/2 | Full typed IR, zero residuals, exclusive `registerIrCard` registration |
| Behavioral proof | 2/2 | Positive red-Tamer/base boundaries, inherited numeric ceiling under a legal same-turn stack, opponent-turn boundary, and Q3292 negative |
| Peer / stack proof | 2/2 | Legal EX2-009 → EX2-010 evolution plus EX2-067 and BT19-014 comparative effects |
| Gates | 0 | Oxfmt passes; focused Vitest, Oxlint, and diff checks coordinator-pending |
| **Total** | **8/10 pending gates** | 10/10 requires the coordinator's remaining gates to pass |

#### Remaining gaps

Only coordinator-owned focused Vitest, scoped Oxlint, and diff validation remain. Oxfmt is clean. If the remaining gates pass, record their exact output and promote the gates row and total to 10/10.

### EX2-011 — Gallantmon

EX2-011 is a Red level 6 Mega Digimon (Virus, Holy Warrior/Royal Knight),
play cost 12, 12000 DP, with a Red level 5 evolution route for 4. It has two
Your Turn continuous clauses and one When Attacking aggregate deletion clause.

#### Printed clauses

| # | Clause |
|---|---|
| C1 | `[Your Turn]` This Digimon gets +2000 DP. |
| C2 | `[Your Turn]` While you have a red Tamer in play, add 2000 to the maximum DP you can choose with DP-based deletion effects. |
| C3 | `[When Attacking]` Choose any number of opposing Digimon whose total DP is 6000 or less and delete them. |

#### Catalog and Q&A evidence

The exact catalog record was checked in
`packages/shared/src/cards/data/cards.json`: Red, Digimon, level 6, play cost
12, 12000 DP, Red level 5 evolution cost 4, Mega/Virus,
Holy Warrior/Royal Knight, and the three printed clauses above.

`node tools/kb/query.mjs card EX2-011` returned:

| ID | Ruling | Behavioral proof |
|---|---|---|
| Q3294 | A numeric DP-deletion maximum increased by 2000 permits targets up to the increased value. | `raises its own aggregate deletion budget to 8000 DP with a red Tamer` targets a single 8000-DP Digimon and leaves a 9000-DP Digimon. |
| Q3295 | A deletion limit stated relative to a Digimon's DP is not increased. | `does not raise a DP-relative deletion ceiling` uses LM-021 against a 15000-DP target; the 14000-DP relative limit leaves it in play after the resolver seam fix. |
| Q3296 | Gallantmon's own 6000-DP aggregate attack limit is also increased to 8000 with a red Tamer. | The Q3296 attack test deletes an 8000-DP Digimon and leaves a 9000-DP Digimon. |
| Q3297 | The +2000 maximum applies to other numeric DP-deletion effects as well. | `raises another numeric DP deletion ceiling from a separate stack` attacks with EX2-009 carrying EX2-008 and deletes a 5000-DP target through EX2-008's numeric 3000-DP inherited effect. |

#### Clause → test → IR

| Clause | Behavioral proof | IR mapping |
|---|---|---|
| C1 self DP | Your Turn positive asserts 12000 → 14000; public turn-flow negative asserts the buff is absent on the opponent's turn. | First `YourTurn` effect → self `ModifyDP`, amount 2000, permanent duration. |
| C2 red-Tamer ceiling | Q3296 own aggregate test and Q3297 separate-stack test exercise the modifier; Q3295 proves that source-relative budgets are excluded. | Second `YourTurn` effect → `CostModifier`, `raiseCeiling`, `dpDeletion`, amount 2000, conditioned on a red Tamer in the battle area. |
| C3 aggregate deletion | Public attack without a Tamer deletes exactly 6000; with a red Tamer it deletes exactly 8000 and leaves 9000. | `WhenAttacking` → opponent Digimon filter, `count: "all"`, `totalDpCap: 6000`. |

#### Implementation review

`apps/api/src/cards/EX2/EX2-011.ts` is fully typed as `CompiledCard`, has
`coverage: "full"` and `residual: []`, exports the typed `compiled` value for
structural proof, and registers only through
`registerIrCard("EX2-011", compiled)`. The `@ts-nocheck` directive was removed.

The cost-modifier path was traced through the interpreter: it applies to
numeric DP deletion ceilings owned by the controller while the Gallantmon
continuous condition is active. The source-relative exception is honored by
the shared aggregate resolver after the Q3295 seam fix documented in
`EX2-011-Q3295-MECHANISM.md`. The aggregate deletion action uses an explicit
total-DP cap and an opponent Digimon filter; no EX2-011 card-module defect was
found.

#### Changes

- Removed `// @ts-nocheck` from `EX2-011.ts` and exported its existing typed IR.
- Added exact catalog and compiled-IR assertions.
- Added Q3294/Q3296 aggregate numeric-cap boundary proof.
- Added Q3295 source-relative non-raise proof using LM-021 through its public On Play path.
- Added Q3297 proof that the modifier raises another card's numeric deletion ceiling.
- Fixed the shared aggregate resolver so generic deletion-ceiling modifiers do not raise source-relative DP budgets (Q3295).
- Replaced internal timing-only opponent-turn coverage with a public production turn flow.
- Added legal Red level 5 → level 6 evolution proof and invalid-source negative.
- Sanitized all deck/security fillers to inert main-deck cards; no Digi-Egg appears in deck/security.
- No shared, catalog, other-card, ledger, RUN, or review files were changed.

#### Remaining gaps

The Q3295 shared-interpreter seam is fixed in `resolveTotalDpCapTargets`:
source-relative budgets (`totalDpCapFromSourceDp: true`) no longer receive the
generic deletion-ceiling bonus, while fixed numeric aggregate budgets retain it.
The retained Q3295 test is red-to-green by this change. The other printed
clauses and Q3294, Q3296, and Q3297 are covered through public paths. Focused
execution and scoped quality gates are owned by the coordinator.

#### Commands and results

The required focused Vitest, Oxlint, Oxfmt, and `git diff --check` processes were
not started in this lane: approximately 4.45 GiB was free, but active
TypeScript watch processes were present. No workspace typecheck or broad suite
was run.

Required bounded test command for the coordinator:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX2/EX2-011.test.ts \
  --maxWorkers=1 --no-file-parallelism
```

#### Score

| Category | Score | Basis |
|---|---:|---|
| Catalog / rules | 2/2 | Exact catalog contract checked; Q3294–Q3297 identified and mapped. |
| IR trace | 2/2 | Both Your Turn effects, red-Tamer condition, numeric cap, opponent filter, count-all, and total-DP boundary map directly to typed IR. |
| Behavioral proof | 2/2 | Public positive/negative turn paths, 6000/8000/9000 boundaries, external numeric effect, source-relative non-raise, and evolution paths are covered; focused execution remains pending. |
| Peer / stack proof | 2/2 | EX2-008/EX2-009 and LM-021 deletion semantics reviewed; legal EX2-010 → EX2-011 stack and invalid source are asserted. |
| Delivery gates | 0/2 | Fixed at 0 for this worker lane; coordinator owns bounded execution and collection gates. |
| **Total** | **8/10** | Q3295's shared resolver seam is fixed; coordinator validation and collection-level gates remain pending. |

### EX2-012 — Megidramon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-012`) — red/purple level 6 Mega Digimon, 13000 DP, play cost 13, red or purple level 5 / cost 5 evolution, Virus / Evil Dragon / Four Great Dragons, with the exact name rule, When Digivolving deletion-and-mill fallback, and On Deletion plays.
- Knowledge base command: `node tools/kb/query.mjs card EX2-012 --json` — Q3298–Q3303. These clarify the mandatory target when one exists, prevention and Decoy still causing the fallback mill, the ChaosGallantmon alias, and the alias qualifying for EX2-008's Gallantmon-name reveal.
- Comprehensive rules queried locally: §2-3-1-2/3 (exact bracket names and name-containing references), §8-1-3 (legal evolution payment, stack, and draw), §15-4-4 (pending effect resolution), §15-16-3 (When Digivolving), and §15-16-4 (On Deletion).

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Name is also treated as [ChaosGallantmon] | `EX2-012/ir-0-0`, `Rule` + self `GrantStatic` name token | Public `observe(...).effectiveNames` assertion, also exercising the alias through EX2-008's public reveal. |
| [When Digivolving] delete 1 opponent Digimon with 10000 DP or less | `EX2-012/ir-1-0`, opponent/Digimon/DP `lte 10000` `Delete` | Public legal red evolution deletes an 8000-DP target while leaving an 11000-DP target. |
| If no Digimon was deleted by this effect, trash the top 5 cards of both players' decks | `EX2-012/ir-1-1`, `TrashTopDeck` for `both`, amount 5, `ifThisEffectDidNotDelete` | No-target Q3298, deletion-immune Q3300, and Decoy Q3302 public paths each mill five from both decks. |
| [On Deletion] may play 1 [Guilmon] and 1 [Takato Matsuki] from hand and/or trash without paying memory costs | `EX2-012/ir-2-0` and `ir-2-1`, exact-name filters, `from: [hand, trash]`, `PlayWithoutCost`, optional | Public battle deletion plays exact Guilmon from hand and exact Takato Matsuki from trash, leaving Megidramon deleted and no payment. |

Q3298, Q3299, Q3300, Q3301, Q3302, and Q3303 are named directly in the focused public tests. Fixtures use only inert main-deck Digimon fillers (`BT1-009`–`BT1-014`) in deck/security; no Digi-Egg or numeric security shortcut is used.

#### Changes

- Replaced the dead handwritten module with a typed `CompiledCard`, removed the legacy timing/module seam, and retained exclusive `registerIrCard("EX2-012", compiled)` registration.
- Encoded the ChaosGallantmon rule alias, mandatory 10000-DP opponent deletion, conditional both-deck mill, and exact optional Guilmon/Takato free-play actions with `coverage: "full"` and no residuals.
- Rebuilt the test file around catalog/IR assertions and public engine intents: legal evolution and draw, illegal source rejection, successful deletion, no-target/prevented/Decoy mill branches, alias observation, EX2-008 reveal alias interaction, and public battle-driven On Deletion plays.

#### Verification status

The coordinator's focused EX2-012 suite passed all 9 tests, and its Oxlint, fixture, and scoped diff checks were clean. Scoped formatting was then written and checked:

```text
pnpm exec oxfmt apps/api/src/cards/EX2/EX2-012.test.ts
### Finished in 1ms on 1 files using 10 threads.
pnpm exec oxfmt --check apps/api/src/cards/EX2/EX2-012.test.ts
### All matched files use the correct format.
```

No typecheck or Git write was run in this lane. Rubric: catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/evolution-stack proof 2/2; delivery gates 0/2 pending final collection gates, commit, and push: 8/10.

### EX2-013 — Labramon

#### Contract and source evidence

- Catalog source: `packages/shared/src/cards/data/cards.json`, `EX2-013`.
- Catalog fields verified: Labramon; Blue; Digimon; level 3; play cost 3; 1000 DP; Blue level 2 evolution for 0; Rookie; Vaccine; Beast.
- Printed inherited clause: `[When Attacking][Once Per Turn] If this Digimon has ＜Jamming＞, gain 1 memory.`
- Knowledge-base source: `node tools/kb/query.mjs card EX2-013`.
- The local KB returned no Q&A entries for EX2-013; no additional ruling ambiguity was exposed.
- No unresolved catalog, ruling, or rules ambiguity remains for this card.

#### Implementation trace

`apps/api/src/cards/EX2/EX2-013.ts` is fully typed and registers exactly one executable record with `registerIrCard("EX2-013", compiled)`.

| Printed requirement | IR proof | Behavioral proof |
| --- | --- | --- |
| When Attacking | effect trigger is `WhenAttacking` | public attack by a host carrying EX2-013 |
| Once Per Turn | `frequency: "OncePerTurn"` | same-turn second attack after public BT1-036 unsuspend gains no additional memory; next own turn re-arms |
| condition has ＜Jamming＞ | `selfHasKeyword` condition with keyword `Jamming` | BT1-032 host positive and `observe.hasKeyword`; EX2-014 host negative |
| gain 1 memory | `GainMemory` amount 1 | exact memory endpoints after first and reset attacks |
| inherited source | `isInherited: true` | legal blue-egg → EX2-013 stack asserts top/source transition |

#### Stack and path coverage

- Positive behavior uses BT1-032 Frigimon's real ＜Jamming＞ keyword and a public player attack; no timing injection is used.
- Negative behavior carries EX2-013 under EX2-014, which lacks ＜Jamming＞, and confirms the attack does not gain memory.
- The evolution test publicly digivolves EX2-013 from a Blue level-2 BT1-003 egg at zero memory cost, then asserts top card and source stack. A red BT1-001 egg source is rejected by the same public intent.
- The once-per-turn test enters Main through the real `startTurnLoop()` and proves first-attack gain, same-turn refusal, and next-own-turn reset using public intents. Its fixture starts at memory 9 so the +1 is observable; memory 10 is the documented positive-side gauge ceiling, where `MemoryGauge.canGainMemory` correctly refuses another positive gain. The public BT1-036 unsuspender costs 6 memory, producing the observed 4-memory baseline before the same-turn refusal check. Because later security/turn-loop cleanup can move the gauge independently, the second attack compares its settled value against the exact pre-attack baseline and asserts it is not baseline+1; the fixture uses only empty-IR BT1-009/BT1-013/BT1-014 security cards. The explicit source alias ensures the inherited watcher is registered on the host stack.
- All deck/security fixtures use non-Digi-Egg cards, and the turn-loop proof uses only BT1-009/013/014 cards whose registered effects are empty. This keeps security resolution from introducing unrelated card behavior into the exact memory assertions. Digi-Eggs appear only in the explicit breeding-source fixtures; no numeric security shortcut is used.

#### Verification commands and results

The coordinator's final focused EX2-013 rerun passed 5/5 tests. Scoped Oxlint, Oxfmt, fixture-policy, and `git diff --check` are clean. No workspace typecheck, broad suite, or Git write was run in this lane.

Scoped Oxfmt was run on the test file:

```text
./node_modules/.bin/oxfmt --write apps/api/src/cards/EX2/EX2-013.test.ts
Finished in 1ms on 1 files using 10 threads.

./node_modules/.bin/oxfmt --check apps/api/src/cards/EX2/EX2-013.test.ts
All matched files use the correct format.
Finished in 1ms on 1 files using 10 threads.
```

#### Rubric

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog fields and printed inherited clause recorded; KB query had no entries |
| IR trace | 2/2 | Full typed IR, zero residuals, exclusive `registerIrCard` registration |
| Behavioral proof | 2/2 | Standalone positive/negative controls and the real public turn-loop once-per-turn/reset path pass with inert security fixtures |
| Peer / stack proof | 2/2 | BT1-032 Jamming peer, EX2-014 near-miss, legal blue egg evolution, and illegal red source |
| Delivery gates | 0/2 | Fixed at 0 for this worker lane; coordinator owns collection completion, commit, and push |
| **Total** | **8/10** | Card evidence and bounded validation are complete; delivery gates remain coordinator-owned |

#### Remaining gaps

The apparent production turn-loop seam was resolved as a fixture starting at the hard memory cap. The follow-up 4→3 endpoint was handled with the accepted exact pre-attack baseline-delta assertion; inert security fixtures isolate the card behavior. No engine or shared-code defect/change was required. Final focused and scoped coordinator gates are green; delivery remains 0/2 pending collection completion, commit, and push.

### EX2-014 — IceDevimon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-014`) — blue level 4 Champion Digimon, 4000 DP, play cost 4, blue level 3 / cost 2 evolution, Virus / Fallen Angel, with one `[When Attacking]` return-to-hand clause.
- Knowledge base command: `node tools/kb/query.mjs card EX2-014 --json` — no card-specific errata, restrictions, or Q&A entries.
- Comprehensive rules queried locally: §2-3-1-2 (bracketed card references), §8-1-3 (evolution payment, stack, and draw), §15-8-3 (trigger timing and pending activation), and the return-to-hand processing rules in §17.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[When Attacking]` | `EX2-014/ir-0-0`, `trigger: "WhenAttacking"` | Public attack intents from both an isolated attacker and a legal evolution stack. |
| Return 1 of your opponent's level 4 or lower Digimon | `Return` to `hand`, opponent/Digimon filter, `levelComparison: { op: "lte", value: 4 }`, count 1 | Public boundary test returns a source-free level 4 and leaves a level 5 in play; negative test leaves only level 4-with-source and level 5 in play. |
| with no digivolution cards | `digivolutionCards: "none"` in the same target filter | Mixed opponent board proves the source-free level-4 target is selected while the sourced level-4 near-match is not. |
| to its owner's hand | `to: "hand"` on the opponent target | Returned instance is observed in opponent hand, with no opponent board copy remaining. |

No card-specific Q&A ids were returned. Fixtures use inert main-deck Digimon fillers (`BT1-009`/`BT1-010`) in security and no Digi-Egg or numeric security shortcut.

#### Changes

- Removed `@ts-nocheck`, exported the typed `CompiledCard`, and retained exclusive `registerIrCard("EX2-014", compiled)` registration.
- Rebuilt the focused tests around catalog/IR assertions and public engine intents: exact level/source filtering, owner-hand destination, a legal blue level-3 evolution with paid memory, stack identity and evolution draw, and an illegal non-blue source rejection.

#### Verification status

The coordinator's focused EX2-014 suite passed all 5 tests. Coordinator-reported Oxlint, fixture, and scoped diff checks were clean. Scoped formatting was then written and checked:

```text
pnpm exec oxfmt apps/api/src/cards/EX2/EX2-014.test.ts
### Finished in 1ms on 1 files using 10 threads.
pnpm exec oxfmt --check apps/api/src/cards/EX2/EX2-014.test.ts
### All matched files use the correct format.
```

No typecheck or Git write was run in this lane. Card rubric: catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/evolution-stack proof 2/2; delivery gates 0/2 pending collection gates, commit, and push: 8/10.

### EX2-015 — Seasarmon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

EX2-015 is a blue level-4 Champion Digimon, 6000 DP, play cost 5, with a
blue level-3 evolution requirement costing 2. Its only printed clause is:

> ＜Jamming＞ (This Digimon can't be deleted in battles against Security Digimon.)

The local KB query reports no EX2-015-specific rulings. The comprehensive
rules keyword entry defines Jamming as protection from deletion in battles
against Security Digimon.

#### Clause → test → IR

| Clause | Behavioral proof | IR mapping |
|---|---|---|
| Jamming keyword exists | `matches the catalog and compiles its printed keyword` and `has Jamming` inspect the exact catalog/IR and public keyword projection. | `Static` effect with `keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }]`. |
| Cannot be deleted in a Security Digimon battle | `survives a losing battle against a Security Digimon` attacks the opponent player into a stronger BT1-082 Rosemon and settles the complete security battle; Seasarmon remains in the battle area and is absent from trash. | Static Jamming keyword is consumed by the engine's security-battle deletion rule. |
| Scope is only Security Digimon battles | `is deleted when it loses a battle against a battle-area Digimon` attacks a stronger, suspended inert BT1-009 with an explicit 11000 DP and settles; Seasarmon reaches trash. | No broad deletion immunity is encoded; only Jamming is present. |

#### Stack and requirement proof

`retains Jamming after a legal blue level-3 evolution` uses EX2-013 Labramon
(blue level 3) as the legal source, pays exactly 2 memory, verifies the source
stack and EX2-015 top card, checks the standard evolution draw, and observes
Jamming on the resulting stack. `rejects evolution from a non-blue level-3
source` uses inert red BT1-009 and proves the source remains unchanged, the
card remains in hand, and memory is not paid.

All deck/security fixtures use inert or relevant main-deck Digimon cards. No
Digi-Egg appears in a deck or security stack, and no numeric security shortcut
is used.

#### Implementation review

`apps/api/src/cards/EX2/EX2-015.ts` is fully typed as `CompiledCard`; the
`@ts-nocheck` directive was removed. The module exports the typed `compiled`
value and registers behavior exclusively with `registerIrCard("EX2-015",
compiled)`. Coverage is marked `full` with an empty residual list.

#### Commands and results

The first coordinator run found the battle-area negative fixture's target was
unsuspended, so the public attack intent correctly rejected it. The fixture is
now suspended, satisfying the public attack legality requirement.

No further Vitest, typecheck, lint, format, or Git write was run in this
serialized lane. Coordinator should rerun the focused suite with one worker and no file
parallelism, then scoped Oxlint/Oxfmt and `git diff --check`:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX2/EX2-015.test.ts \
  --maxWorkers=1 --no-file-parallelism
```

#### Remaining gaps

No card-specific ambiguity or engine seam was identified. Coordinator
validation and collection-level gates remain pending.

#### Score

| Category | Score | Basis |
|---|---:|---|
| Catalog / rules | 2/2 | Exact catalog fields and the comprehensive Jamming definition are recorded. |
| IR trace | 2/2 | The sole printed keyword maps directly to the typed static IR. |
| Behavioral proof | 2/2 | Keyword projection, stronger Security Digimon survival, battle-area deletion, and legal/illegal evolution paths are covered. |
| Peer / stack proof | 2/2 | BT1-052 Jamming behavior was compared; EX2-013 → EX2-015 legal stack and red-source rejection are asserted. |
| Delivery gates | 0/2 | Coordinator owns focused execution and collection gates. |
| **Total** | **8/10** | Complete card evidence is present; bounded validation remains pending. |

### EX2-016 — Gorillamon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-016`) — blue level 4 Champion Digimon, 5000 DP, play cost 6, blue level 3 / cost 2 evolution, Data / Beastkin, with one optional `[On Play]` source-play clause.
- Knowledge base command: `node tools/kb/query.mjs card EX2-016 --json` — no card-specific errata, restrictions, or Q&A entries.
- Comprehensive rules queried locally: §2-3-2-3/4 (color and trait references), §8-1-3 (legal evolution payment, stack, and draw), §15-7 (optional processing), §15-8-3 (trigger timing and pending activation), and digivolution-card play/zone rules in §17.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[On Play]` | `EX2-016/ir-0-0`, `trigger: "OnPlay"` | Public play intents resolve the effect and settle all resulting decisions. |
| You may play 1 level 3 Digimon card | `PlayWithoutCost`, `levels: [3]`, `count: 1`, `optional: true` | Positive public path plays exactly one level-3 card and leaves the carrier established. Level-4 source negative remains stacked. |
| from 1 of your blue Digimon's digivolution cards | `hostFilter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Blue"] }`, `from: ["digivolutionCards"]` | Mixed public board distinguishes a blue carrier from a non-blue carrier, while preserving the non-blue carrier’s source in its stack. |
| without paying its memory cost | `payCost: false` | Positive play records only Gorillamon’s normal 6-memory play payment; the source play adds no memory cost. |

No card-specific Q&A ids were returned. Fixtures use inert main-deck Digimon fillers (`BT1-009`–`BT1-012`) in deck/security, with no Digi-Egg or numeric security shortcut.

#### Changes

- Removed `@ts-nocheck`, exported the typed `CompiledCard`, and retained exclusive `registerIrCard("EX2-016", compiled)` registration.
- Kept the current IR semantics while making its type checking explicit: optional level-3 Digimon `PlayWithoutCost` from digivolution cards, constrained to one of the controller’s blue Digimon hosts, with no memory payment.
- Rebuilt focused tests around catalog/IR assertions, public positive and mixed-host behavior, level boundary, optional refusal, legal blue evolution with paid cost/stack/draw, and illegal non-blue evolution rejection.

#### Verification status

The coordinator's focused EX2-016 suite passed all 7 tests. Scoped Oxfmt was then written and checked for both allowed source files:

```text
pnpm exec oxfmt apps/api/src/cards/EX2/EX2-016.ts apps/api/src/cards/EX2/EX2-016.test.ts
### Finished in 1ms on 2 files using 10 threads.
pnpm exec oxfmt --check apps/api/src/cards/EX2/EX2-016.ts apps/api/src/cards/EX2/EX2-016.test.ts
### All matched files use the correct format.
```

No typecheck or Git write was run in this lane. Card rubric: catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/evolution-stack proof 2/2; delivery gates 0/2 pending collection gates, commit, and push: 8/10.

### EX2-017 — Leomon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

EX2-017 is a blue level-4 Champion Digimon, 4000 DP, play cost 6, with a blue
level-3 evolution requirement costing 2. Its printed clauses are:

> [Opponent's Turn] While you have a Tamer in play, this Digimon gains
> ＜Blocker＞.
>
> [On Deletion] Gain 2 memory and ＜Draw 1＞.

The local KB query reports no EX2-017-specific rulings. The comprehensive
rules define Blocker as the optional suspension that redirects an opponent's
attack to the blocking Digimon.

#### Clause → test → IR

| Clause | Behavioral proof | IR mapping |
|---|---|---|
| Opponent-turn Tamer condition grants Blocker | `can block an opponent attack during the opponent's turn while a Tamer is in play` follows the public turn loop, opens a real block window, declares Leomon as blocker, and verifies the redirected battle. The same test confirms no keyword during Leomon's own turn; `does not gain Blocker during the opponent's turn without a Tamer` proves the condition. | `OpponentsTurn` → self-targeted `Aura` granting `Blocker`, gated by `youHave` a Tamer in the controller's battle area. |
| On Deletion gains 2 memory and draws 1 | `gains 2 memory and draws 1 when deleted in battle` attacks a stronger suspended Digimon through a public attack intent, settles the deletion and trigger, then verifies memory 3→5, Leomon in trash, and the named deck card in hand. | `OnDeletion` → `GainMemory(2)` followed by `Draw(mine, 1)`. |

#### Stack and requirement proof

`retains the Tamer-gated Blocker through a legal blue level-3 evolution` uses
EX2-013 Labramon, pays exactly 2 memory, verifies the top card/source stack
and standard evolution draw, and observes the opponent-turn Blocker condition
on the resulting stack. `rejects evolution from a non-blue level-3 source`
uses inert red BT1-009 and proves the source, hand, and memory are unchanged.

All deck and security fixtures use main-deck cards; no Digi-Egg or numeric
security shortcut is used. The public blocker case uses a real opponent attack
and explicit declaration rather than an injected timing verb.

#### Implementation review

`apps/api/src/cards/EX2/EX2-017.ts` is fully typed as `CompiledCard`; its
`@ts-nocheck` directive was removed. The typed IR preserves both printed
effects and registers exclusively with `registerIrCard("EX2-017", compiled)`.
It exports the compiled value for structural proof and declares `coverage:
"full"` with an empty residual list.

#### Commands and results

Coordinator's focused serial run passed all 6 tests, and the scoped gates are
clean:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX2/EX2-017.test.ts \
  --maxWorkers=1 --no-file-parallelism
6 passed, 6 total; Oxlint/Oxfmt and diff gates clean
```

The scoped Oxfmt correction was applied and checked successfully:

```text
pnpm exec oxfmt --write apps/api/src/cards/EX2/EX2-017.ts apps/api/src/cards/EX2/EX2-017.test.ts
Finished in 1ms on 2 files using 10 threads.

pnpm exec oxfmt --check apps/api/src/cards/EX2/EX2-017.ts apps/api/src/cards/EX2/EX2-017.test.ts
All matched files use the correct format.
```

No typecheck or Git write was run in this lane. Workspace typecheck and
collection-level gates remain coordinator-owned.

#### Remaining gaps

No card-specific ambiguity or engine seam was identified. Card evidence and
scoped gates are clean; collection-level delivery remains pending.

#### Score

| Category | Score | Basis |
|---|---:|---|
| Catalog / rules | 2/2 | Exact catalog printing and comprehensive Blocker semantics are recorded. |
| IR trace | 2/2 | Both timing, Tamer condition, self-target, Blocker grant, deletion memory, and draw map directly to typed IR. |
| Behavioral proof | 2/2 | Public blocker redirection, condition negatives, deletion trigger, and exact memory/draw endpoints are covered and the focused 6-test run passed. |
| Peer / stack proof | 2/2 | EX2-059 is used as a Tamer fixture and neighboring Blocker patterns were compared; legal EX2-013 → EX2-017 and invalid source paths are asserted. |
| Delivery gates | 0/2 | Coordinator owns focused execution and collection gates. |
| **Total** | **8/10** | Card evidence is complete; bounded validation remains pending. |

### EX2-018 — MarineAngemon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-018`) — blue/yellow level 6 Mega Digimon, 11000 DP, play cost 11, blue or yellow level 5 / cost 4 evolution, Vaccine / Fairy, with one `[On Play]` recovery clause.
- Knowledge base command: `node tools/kb/query.mjs card EX2-018 --json` — Q3304: Recovery may not increase the security stack above 5 cards, including when the effect would otherwise recover multiple cards.
- Comprehensive rules queried locally: §8-1-3 (legal evolution payment, stack, and draw), §15-8-3 (On Play trigger timing), and §16-6-1/2 (Recovery places deck cards face-down onto security and is processing).

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[On Play]` | `EX2-018/ir-0-0`, `trigger: "OnPlay"` | Public play intents settle the recovery and all resulting state changes. |
| For each of your opponent's Digimon with no digivolution cards | Recovery scaling `unit: "cards"`, opponent/Digimon filter with `digivolutionCards: "none"` | Mixed public board with two source-free and one sourced opponent Digimon recovers exactly two. |
| ＜Recovery +1 (Deck)＞ | `SecurityManipulation` `op: "addTop"`, `source: "deck"`, amount 1 scaled once per matching Digimon | Public assertions observe the named deck instances move face-down to the security stack and the deck shrink by the matching count. |
| This effect can't increase the number of cards in your security stack to 6 or more | `maxSecurity: 5` on the recovery action | Q3304 public boundary tests cap three eligible Digimon at one card from security 4, and perform no recovery at security 5. |

Q3304 is named directly in both focused boundary tests. Fixtures use inert main-deck Digimon fillers (`BT1-009`–`BT1-014`) in deck/security; no Digi-Egg or numeric security shortcut is used.

#### Changes

- Replaced the handwritten `EffectModule` with a typed exported `CompiledCard`, removed the legacy `@ts-nocheck` path, and retained exclusive `registerIrCard("EX2-018", compiled)` registration.
- Encoded source-free opponent counting as IR scaling and exact Recovery semantics as a deck-to-top-security operation capped at five cards.
- Rebuilt focused tests around catalog/IR assertions, mixed source-free/sourceful opponent boards, the Q3304 cap and full-security boundary, and a legal yellow level-5 evolution with paid cost, stack identity, and draw plus an illegal black-source negative.

#### Verification status

The coordinator's corrected focused EX2-018 rerun passed 7/7 tests. Coordinator Oxlint, scoped Oxfmt, fixture-policy, and scoped diff checks are clean. The initial 6/7 result was caused solely by the stale catalog `effectText` expectation, corrected to include the catalog's Recovery reminder sentence. Scoped formatting was written and checked for both allowed source files:

```text
pnpm exec oxfmt apps/api/src/cards/EX2/EX2-018.ts apps/api/src/cards/EX2/EX2-018.test.ts
### Finished in 1ms on 2 files using 10 threads.
pnpm exec oxfmt --check apps/api/src/cards/EX2/EX2-018.ts apps/api/src/cards/EX2/EX2-018.test.ts
### All matched files use the correct format.
```

No typecheck or Git write was run in this lane. Card rubric remains catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/evolution-stack proof 2/2; total 8/10 with delivery gates 0/2 pending collection gates, commit, and push.

### EX2-019 — Renamon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-019`) — yellow level 3 Rookie Digimon, 1000 DP, play cost 3, yellow level 2 / cost 0 evolution, Data / Beastkin, with the four-card reveal/add/bottom clause and the inherited once-per-turn Option trigger.
- Knowledge base command: `node tools/kb/query.mjs card EX2-019 --json` — Q3305–Q3309 cover Option-use timing, exclusion of Security/other activations, use-cost reduction below 2, payment-only reductions, and using an Option without paying its cost.
- The IR uses the engine's `whenOptionUsed` event and `triggerOptionCostAtLeast` value 2. This preserves the rules distinction in Q3305–Q3309: the watcher sees the Option's use cost, not an unrelated payment reduction, and Security activation is not an Option use.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[On Play] Reveal the top 4 cards of your deck.` | `EX2-019/ir-0-0`, `trigger: "OnPlay"`, `RevealAdd.revealCount: 4` | Public play intent settles a four-card reveal. |
| Add 1 card with `[Kyubimon]`, `[Taomon]`, or `[Sakuyamon]` in its name | First `RevealAdd.add` bucket uses name matching for the three evolution names and count 1 | Public reveal fixture adds Kyubimon and bottoms every remaining revealed card. |
| and 1 `[Rika Nonaka]` among them | Second `RevealAdd.add` bucket uses exact name matching and count 1 | The same public reveal fixture adds Rika independently of the evolution-name bucket. |
| Place the remaining cards at the bottom of your deck in any order | `RevealAdd.rest: "deckBottom"` | Public assertions verify the exact remaining deck order selected by the test harness. |
| `[Your Turn][Once Per Turn]` | Inherited `YourTurn` effect with `isInherited: true`, `frequency: "OncePerTurn"` | A legal Taomon stack receives the inherited effect; a continuous public turn loop proves same-turn suppression and next-own-turn reset. |
| When you use an Option card with a cost of 2 or more, gain 1 memory | `SubTrigger.event: "whenOptionUsed"`, `triggerOptionCostAtLeast.value: 2`, `GainMemory.amount: 1` | Public BT1-102 use gains one memory after its Main effect; a cost-0 BT4-104 use does not activate the watcher, and the second BT1-102 in the same turn is suppressed. |

The focused tests also assert the catalog identity, complete IR (`coverage: "full"`, empty `residual`), legal yellow breeding-area evolution with stack/draw behavior, and rejection of a blue source. All deck and security fixtures use inert main-deck cards (`BT1-009`–`BT1-014`); no Digi-Egg is placed outside an egg deck or breeding area.

#### Changes

- Removed `@ts-nocheck` and exported a typed `CompiledCard` IR.
- Kept executable registration exclusively through `registerIrCard("EX2-019", compiled)`.
- Rebuilt the focused test around catalog/IR assertions, public reveal resolution, Option timing/cost/once-per-turn behavior, a real turn-loop reset, and legal/illegal evolution paths.

#### Verification status

The coordinator's corrected focused EX2-019 rerun passed 6/6 tests. Coordinator Oxlint, scoped Oxfmt, fixture-policy, and scoped diff checks are clean. The initial 5/6 result was caused solely by an over-constrained absolute memory assertion in the next-own-turn reset proof: the public turn loop starts the next turn at 3, then the cost-2 use and +1 inherited gain leave memory at 2. The assertion now checks that exact before/after delta. No typecheck or Git write was run in this lane. The card rubric is catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution proof 2/2; total 8/10 with delivery gates 0/2 pending collection gates, commit, and push.

### EX2-020 — Lopmon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

EX2-020 is a yellow level-3 Rookie Digimon, 2000 DP, play cost 3, with a
yellow level-2 evolution requirement costing 0. Its only printed clause is:

> [On Play] If you have 3 or fewer security cards and [Shu-Chong Wong] in play,
> ＜Recovery +1 (Deck)＞.

The local KB query reports no EX2-020-specific rulings. The comprehensive rules
define Recovery +1 (Deck) as placing the top card of the deck on top of the
security stack.

#### Clause → test → IR

| Clause | Behavioral proof | IR mapping |
|---|---|---|
| On Play timing | Every positive and negative case plays Lopmon through the public `playCard` intent and settles the resulting battle-area state/effect. | `trigger: "OnPlay"`. |
| Security threshold is 3 or fewer | `recovers 1 from the deck at exactly 3 security with Shu-Chong Wong in play` recovers the named deck top; `does not recover when security is above three` starts at four and leaves the deck unchanged. | `allOf` condition with `zoneCount(mine, security, lte, 3)`. |
| Shu-Chong Wong requirement | Positive path includes the named EX2-059 Tamer; `does not recover at three security without Shu-Chong Wong` proves the other condition is required. | `youHave` exact name filter for `Shu-Chong Wong` in the controller's battle area. |
| Recovery +1 from the deck | The positive test pins the recovered instance at the top of security and verifies the next deck card remains below it. | `SecurityManipulation`, `op: "addTop"`, `controller: "mine"`, `source: "deck"`, `amount: 1`. |

#### Stack and requirement proof

`supports a legal yellow Digi-Egg evolution in the public breeding flow` uses
the yellow BT1-005 egg deck, hatches it with `hatchEgg`, then publicly
digivolves Lopmon at its printed zero cost. It verifies the egg source remains
in the breeding stack and the standard evolution draw. The egg is in the
dedicated egg deck, not a main deck or security fixture. `rejects evolution
from a non-yellow level-2 source` uses inert red BT1-009 and proves the source,
hand, and memory remain unchanged.

All main-deck and security fixtures use non-egg cards, with no numeric security
shortcut. Shu-Chong Wong is imported as the relevant peer card for the exact
name condition.

#### Implementation review

`apps/api/src/cards/EX2/EX2-020.ts` is fully typed as `CompiledCard`; its
`@ts-nocheck` directive was removed. The compiled IR uses the repository's
`SecurityManipulation` primitive, exact three-security gate, exact Tamer name,
and deck-top placement. It exports `compiled` and registers exclusively with
`registerIrCard("EX2-020", compiled)`, with `coverage: "full"` and no residual.

#### Commands and results

The coordinator's focused serial run passed all 6 tests after the fixture
correction. The original failure was the public yellow egg evolution case:
seat 1 had no inert main-deck cards, so its turn decked out during Draw before
reaching Main. The fixture now gives seat 1 six inert main-deck cards and one
security card, preserving the public breeding-flow proof without adding eggs
to deck or security. Scoped coordinator gates are clean.

No typecheck or Git writes were run in this serialized lane.
Scoped Oxfmt was applied and checked successfully:

```text
pnpm exec oxfmt --write apps/api/src/cards/EX2/EX2-020.ts apps/api/src/cards/EX2/EX2-020.test.ts
Finished in 1ms on 2 files using 10 threads.

pnpm exec oxfmt --check apps/api/src/cards/EX2/EX2-020.ts apps/api/src/cards/EX2/EX2-020.test.ts
All matched files use the correct format.
```

The focused 6/6 run and scoped Oxlint/Oxfmt/diff gates are complete; workspace
typecheck and broad suites remain coordinator-owned.

#### Remaining gaps

No card-specific ambiguity or engine seam was identified. Card evidence and
scoped gates are clean; collection-level delivery remains pending.

#### Score

| Category | Score | Basis |
|---|---:|---|
| Catalog / rules | 2/2 | Exact catalog printing and Recovery semantics are recorded. |
| IR trace | 2/2 | On Play timing, both conditions, exact name, deck-top Recovery, and amount map directly to typed IR. |
| Behavioral proof | 2/2 | Public positive boundary, threshold negative, missing-Tamer negative, and exact deck/security endpoints are covered. |
| Peer / stack proof | 2/2 | EX2-059 is used as the relevant Tamer peer; public yellow egg evolution and invalid source paths are asserted. |
| Delivery gates | 0/2 | Coordinator owns focused execution and collection gates. |
| **Total** | **8/10** | Card evidence is complete; bounded validation remains pending. |

### EX2-021 — Kyubimon

#### Scope and evidence

EX2-021 is a yellow level 4 Champion Digimon (5000 DP, play cost 6), evolving
from a yellow level 3 for 2. Its two printed clauses are represented by the
typed compiled IR in `apps/api/src/cards/EX2/EX2-021.ts`, registered only with
`registerIrCard("EX2-021", compiled)`.

The catalog fields and exact English text are asserted in
`EX2-021.test.ts`. The same test asserts `coverage: "full"`, an empty
residual, the `RevealAdd` Plug-In name filter, and the inherited
`whenOptionUsed`/`triggerOptionCostAtLeast(2)`/opponent-Digimon `ModifyDP`
action.

#### Clause-to-proof map

| Clause or rule | Public proof | IR/source evidence |
| --- | --- | --- |
| When Digivolving: reveal top 3, add one Plug-In Option, bottom-deck the rest | Legal EX2-019 (yellow level 3) to EX2-021 evolution; paid 2 memory, stack identity, hand and exact remaining deck asserted | `WhenDigivolving` → `RevealAdd`, `revealCount: 3`, exact Option/name filter, `rest: "deckBottom"` |
| Your Turn / once per turn | Real BT1-102 (cost 2) use reduces opponent BT1-080 by exactly 2000; BT4-104 (cost 0) does not; a second cost-2 use is refused | Inherited `YourTurn`, `frequency: "OncePerTurn"`, `SubTrigger(event: "whenOptionUsed")`, `ModifyDP -2000`, `forTheTurn` |
| Turn duration and reset | Battle-area DP returns to 12000 on the opponent's next main; a cost-2 use on the next own turn reduces it again | Same `forTheTurn` duration and once-per-turn gate |
| Cost threshold boundary | The public cost-0 and cost-2 Option cases prove the ordinary 0/2 boundary | `triggerOptionCostAtLeast` with value 2 |
| Option used without paying (Q5482) | EX2-060 Rika's public attack path uses P-095 without payment; Kyubimon still reduces the 12000-DP target to 4000 and memory remains 10 | Event is `whenOptionUsed`; interpreter receives the original Option cost from the use action |

The illegal-source negative attempts EX2-021 evolution from blue EX2-014 and
expects the public `digivolve` intent to be rejected. All deck and security
fixtures use ordinary main-deck cards; no Digi-Eggs or numeric security
shortcuts are used.

#### Rules knowledge-base Q&A

The local query returned Q3310, Q3311, Q3312, Q5481, and Q5482. Q3310 is
covered by the settled public Option tests: the reduction is asserted after
the used Option's Main effect has settled. Q5482 is covered directly by the
Rika/Plug-In public path. Q3311 (Security/Delay activation is not “use”),
Q3312 (the Option's own use cost reduced to 1 or less), and Q5481 (payment cost
reduced while original use cost remains 2 or more) are shared-engine event
distinctions; this card lane has no safe card-specific public fixture for each
without introducing unrelated effects. They remain explicit follow-up gaps,
not silently claimed proof. The compiled threshold is exact and does not
approximate those rulings.

#### Validation and score

The coordinator's focused serial run passed all 5 tests, and the scoped
Oxlint/Oxfmt/diff gates are clean:

```text
5 passed, 5 total; scoped Oxlint/Oxfmt and diff gates clean
```

No typecheck or Git write was run in this lane; workspace typecheck and broad
collection suites remain coordinator-owned.

Rubric evidence (delivery gates intentionally fixed at zero pending
coordinator gates):

- Catalog/rules: 2/2 (catalog and all five KB answers recorded; three shared-event follow-ups explicit).
- IR trace: 2/2 (typed compiled IR, full coverage, no residual).
- Behavioral proof: 2/2 for printed clauses, evolution, cost boundary, duration, reset, and Q5482.
- Peer/stack proof: 2/2 (legal yellow evolution, invalid source, inherited Taomon stack, and EX2-060's public unpaid-Option peer path are covered; the three shared-rule follow-ups remain explicitly documented).
- Delivery gates: 0/2 (validation intentionally deferred).

No engine or shared/catalog files were changed.

### EX2-022 — Antylamon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-022`) — yellow level 5 Ultimate Digimon, 7000 DP, play cost 7, yellow level 4 / cost 3 evolution, Data / Holy Beast / Deva, with an alternate Lopmon evolution and an optional once-per-turn attack unsuspend.
- Knowledge base command: `node tools/kb/query.mjs card EX2-022 --json` — Q3313 confirms that, when Shu-Chong Wong is in play, the alternate Lopmon evolution is legal when an effect activates a digivolution.
- The alternate requirement uses exact `Lopmon` name matching and an exact `Shu-Chong Wong` Tamer controller gate. The attack cost targets only the controller's top security card (`zone: "security"`, `position: "top"`).

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| If you have `[Shu-Chong Wong]` in play | Alternate `digivolutionRequirement.controllerControls` requires one exact-name Tamer | Public alternate-evolution positive and missing-Tamer negative. |
| your `[Lopmon]` can digivolve into this card in your hand for a digivolution cost of 3, ignoring its digivolution requirements | Alternate requirement `namesExact: ["Lopmon"]`, `cost: 3`, `isAlternate: true` | Public Lopmon intent pays 3, verifies stack identity and evolution draw; Lopmon (X Antibody) is rejected as an exact-name near match (Q3313). |
| `[When Attacking][Once Per Turn]` | `WhenAttacking` effect with `frequency: "OncePerTurn"` | Public attacks prove activation on the first attack, same-turn refusal, and a fresh activation in a real next-own-turn loop. |
| You may trash the top card of your security stack | Optional `Unsuspend` cost with `trash` target restricted to controller/security/position-top | Public positive path moves exactly the top inert security instance to trash; optional refusal leaves security and suspension unchanged. |
| to unsuspend this Digimon | Self-targeted `Unsuspend` action (`isSelf: true`) | Public assertions observe Antylamon unsuspended after paying the cost, including the next-turn reset attack. |

Fixtures use only inert main-deck cards (`BT1-009`–`BT1-014`) in deck/security; no Digi-Egg or numeric security shortcut is used. Every effect stack is settled before endpoint assertions.

#### Changes

- Removed `@ts-nocheck` and exported a typed `CompiledCard` IR.
- Kept executable registration exclusively through `registerIrCard("EX2-022", compiled)`.
- Strengthened tests with catalog/IR assertions, alternate and normal paid evolution stack/draw proof, exact-name/Tamer negatives, optional security-cost refusal, and real turn-loop once-per-turn reset proof.

#### Verification status

The coordinator's first focused run passed 5/8 tests. Two failures were test-only stack endpoint expectations: the engine's `stack` contains source cards while `topCard` is asserted separately. The next rerun passed 7/8; its sole remaining failure was cleanup after the reset scenario exhausted the opponent's two-card security fixture and correctly produced a seat-0 win before surrender. After correcting the source-only assertions, padding the attacked opponent's security, and removing an unused `Phase` import, the coordinator rerun passed 8/8. Coordinator Oxlint, Oxfmt, fixture-policy, and scoped diff checks are clean. No typecheck or Git write was run in this lane. The card rubric is catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10 with delivery gates 0/2 pending collection gates, commit, and push.

### EX2-023 — Taomon

#### Scope and evidence

EX2-023 is a yellow level 5 Ultimate Digimon (7000 DP, play cost 8), evolving
from a yellow level 4 for 3. Its main clause may play one Rika Nonaka from
hand without paying; its inherited clause is the once-per-turn opponent-DP
reduction for using an Option with cost 2 or more. The module is now a typed
`CompiledCard`, exports `compiled`, and registers only through
`registerIrCard("EX2-023", compiled)`.

The colocated test asserts the exact catalog fields/text and the complete IR:
optional `PlayWithoutCost` from hand with an exact Rika name filter, plus the
inherited `whenOptionUsed` threshold and `ModifyDP` action. Coverage is full
and residuals are empty.

#### Clause-to-test-to-IR map

| Clause | Public proof | IR mapping |
| --- | --- | --- |
| When Digivolving may play one Rika Nonaka from hand without paying | Legal EX2-021 (yellow level 4) → EX2-023 evolution pays exactly 3 memory, preserves the source stack and standard evolution draw, then places Rika in the battle area with no Rika play-cost payment | `WhenDigivolving` → optional `PlayWithoutCost`, `from: ["hand"]`, `payCost: false`, exact `Rika Nonaka` name filter, count 1 |
| May/optional behavior | Same legal evolution with a public optional-decision response of `accept: false` leaves Rika in hand while evolution and its paid cost remain | `optional: true` on the play action |
| Inherited Your Turn / once per turn | Real cost-1 BT1-108 does not change the target; real cost-2 BT1-109 changes opponent BT1-080 from 12000 to 10000; a second cost-2 use in the same turn is refused | Inherited `YourTurn`, `frequency: "OncePerTurn"`, `SubTrigger(event: "whenOptionUsed")`, `triggerOptionCostAtLeast(2)`, opponent Digimon count 1, `-2000`, `forTheTurn` |
| Duration/reset | Target returns to 12000 during the opponent's next main phase and can be reduced again on the next own turn | `duration: "forTheTurn"` plus once-per-turn identity |
| Unpaid Option use | Public EX2-060 Rika attack path uses P-095 without paying; the inherited Taomon effect still applies after that Option resolves, with memory unchanged | `whenOptionUsed` receives the unpaid Option's printed cost; no payment requirement is encoded |

The illegal-source test rejects evolution from blue level-4 EX2-014. Every
main-deck and security fixture uses ordinary cards; no Digi-Egg appears in a
deck/security fixture and no numeric security shortcut is used.

#### Rules knowledge-base Q&A

The local query returned Q3314, Q3315, Q3316, Q5483, and Q5484. Q3314 is
represented by the settled public Option tests: the inherited reduction is
observed after the used Option's Main effect. Q5484 is directly covered by
the Rika/Plug-In public use-without-payment path. Q3315 (Security/Delay is not
“use”), Q3316 (the Option's own use cost reduced to 1 or less), and Q5483
(payment cost reduced while original use cost remains 2 or more) are shared
event distinctions not independently isolated here without unrelated card
effects. They remain explicit follow-up gaps rather than silently claimed
card-specific proof.

#### Implementation and validation

No engine/shared/catalog changes were needed. The coordinator's 5/6 run
identified the unpaid-Option timeout: EX2-023.test.ts had not imported the
EX2-060 peer module, so Rika's public attack trigger never suspended Rika or
used P-095. The correction adds that registration import and splits the public
wait into separate Rika-suspended and Option-in-trash milestones; no IR change
was warranted. Under the coordinator's closed RAM guard, no Vitest, typecheck,
lint, or Git operation was run. Scoped Oxfmt write/check passed for the module
and test:

```text
pnpm exec oxfmt --write apps/api/src/cards/EX2/EX2-023.ts apps/api/src/cards/EX2/EX2-023.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX2/EX2-023.ts apps/api/src/cards/EX2/EX2-023.test.ts
All matched files use the correct format.
```

The coordinator should run the serial focused suite, scoped Oxlint, and
`git diff --check`.

Rubric scores (delivery intentionally fixed at 0/2):

- Catalog/rules: 2/2 — exact catalog printing and all five KB answers recorded.
- IR trace: 2/2 — both printed clauses map directly to typed full-coverage IR.
- Behavioral proof: 2/2 — positive/negative evolution, optional refusal, paid
  cost threshold, once-per-turn refusal/reset, duration, and unpaid use are
  covered by public paths.
- Peer/stack proof: 2/2 — legal yellow EX2-021 → EX2-023 stack and EX2-060's
  public unpaid-Option peer interaction are exercised; shared-rule gaps are
  explicit.
- Delivery gates: 0/2 — coordinator owns focused execution and collection
  gates.

Total: 8/10.

### EX2-024 — Sakuyamon

#### Scope and source evidence

EX2-024 is a yellow level 6 Mega Digimon (11000 DP, play cost 12), evolving
from a yellow level 5 for 3. The catalog entry in
`packages/shared/src/cards/data/cards.json` and the local rules knowledge base
were checked with:

```text
node tools/kb/query.mjs card EX2-024
```

The query returned Q3317, Q3318, Q3319, Q5485, and Q5486. The implementation
is a typed `CompiledCard` registered exclusively with
`registerIrCard("EX2-024", compiled)`; it has full coverage and no residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| `[When Digivolving] Unsuspend 1 of your Digimon` | `WhenDigivolving` → `Unsuspend`, own Digimon filter, count 1 | A legal yellow EX2-023 evolution leaves exactly one of two suspended Digimon unsuspended. |
| Return one `[Plug-In]` Option from trash for each Tamer | `WhenDigivolving` → `Return` to hand, own-trashing Plug-In name filter, scaling one per own Tamer | One-Tamer and two-Tamer public evolutions return exactly one and two EX2-066 cards, respectively. |
| Legal evolution accounting | Catalog yellow Lv5 / cost 3 and public `digivolve` intent | The evolution pays 3 memory, puts EX2-023 under EX2-024, and draws one card; an EX2-014 non-yellow source is rejected. |
| `[Your Turn]` cost-2-or-more Option trigger | `YourTurn` → `SubTrigger(event: "whenOptionUsed")` with `triggerOptionCostAtLeast(2)` → opponent Digimon `ModifyDP(-3000, forTheTurn)` | Public BT4-104 (cost 0) does not modify DP; each of two BT1-102 (cost 2) uses modifies the selected target, and the effect expires on the opponent's turn. |
| Use without paying its cost | The watcher is attached to the public `whenOptionUsed` event rather than payment | EX2-060 Rika's public attack path uses EX2-066 without paying memory and Sakuyamon still applies -3000 DP. |

All deck and security fixtures use inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`); there are no Digi-Eggs outside an egg deck and no
numeric security shortcut.

#### Rules knowledge-base Q&A

- Q3317: the watcher is proved after the public Option use resolves, matching
  the timing after the Option's Main effect.
- Q3318: the implementation listens to `whenOptionUsed`; Security/Delay
  activation is not represented as that event. A dedicated Security/Delay
  fixture is not included because it would introduce unrelated card effects.
- Q3319 and Q5485: the threshold is based on the Option's use-cost event, not
  an arbitrary payment amount; reduced-use-cost and reduced-payment variants
  remain shared-engine distinctions rather than card-specific claims here.
- Q5486: the Rika/Plug-In public proof covers a qualifying Option used without
  paying memory.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR for direct evidence.
- Kept executable registration exclusively through `registerIrCard`.
- Expanded the focused test with catalog/IR assertions, paid legal evolution
  stack/draw evidence, one-versus-two-Tamer scaling, cost boundary and turn
  duration, the public unpaid Option path, and an illegal-source negative.
- Sanitized all deck/security fixtures with inert main-deck cards.

#### Validation and score

The coordinator's first focused run reached 5/6: EX2-066 was correctly in the
public hand, but a Jest-style `toEqual(arrayContaining(...))` assertion did not
match the engine's MobX ArraySchema wrapper. The assertion now checks the
public hand's `instanceId` projection with `toContain`, preserving separate
draw and return evidence. No Vitest, typecheck, or Git operation was run in
this lane. Scoped Oxfmt is clean; the corrected focused suite and Oxlint remain
pending coordinator execution.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, and
peer/legal-stack proof 2/2. Delivery gates are intentionally 0/2 pending the
coordinator's serial validation, diff checks, commit, and push: **8/10**.

### EX2-025 — Terriermon

#### Scope and evidence

EX2-025 is a green level 3 Rookie Digimon (1000 DP, play cost 3), evolving
from a green level 2 for 0. Its main text gains 1 memory once per turn when
its controller plays a green Tamer. Its inherited text gives this Digimon
2000 DP for the turn, once per turn, when an opponent's Digimon becomes
suspended during its controller's turn.

The module is now a typed `CompiledCard`, exports `compiled`, and registers
only through `registerIrCard("EX2-025", compiled)`. Its full-coverage IR has no
residual entries.

#### Clause-to-test-to-IR map

| Clause | Public proof | IR mapping |
| --- | --- | --- |
| Your Turn / once per turn; play a green Tamer → gain 1 memory | Real EX2-061 Henry Wong plays from hand twice; the first play gains exactly 1 memory and the second same-turn play does not | `YourTurn`, `frequency: "OncePerTurn"`, `SubTrigger(event: "whenPlayed")`, mine Tamer filter, exact green color, `GainMemory(1)` |
| Inherited Your Turn / once per turn; opponent Digimon becomes suspended → +2000 DP for this turn | Real ST4-15 Needle Spray suspends selected opponent Digimon; the first suspension raises the inherited host from 5000 to 7000, a second same-turn suspension leaves it at 7000, and the opponent's next main phase restores 5000 | Inherited `YourTurn`, `frequency: "OncePerTurn"`, `SubTrigger(event: "whenSuspended")`, opponent Digimon filter, self target, `ModifyDP(+2000, forTheTurn)` |
| Exact negative color boundary | Playing non-green EX2-060 Rika costs memory but does not trigger the green-Tamer gain | `colors: ["Green"]` on the played-Tamer source filter |
| Evolution requirement and paid context | Public breeding flow hatches green BT1-007, evolves to EX2-025 for the printed 0, preserves the egg stack and standard evolution draw; red BT1-003 is rejected | Catalog green level-2/0 evolution requirement; no card-specific evolution effect is approximated |

Fixtures use ordinary main-deck cards and explicit security cards only; no
Digi-Egg is placed in a main deck or security stack, and no numeric security
shortcut is used. The egg-deck cases use Digi-Eggs only in the dedicated egg
deck as required by the public breeding flow.

#### Rules and peer evidence

The local KB query returned no EX2-025-specific Q&A entries. The relevant
rules are the standard Your Turn timing, once-per-turn identity, suspension
event, and temporary DP modifier duration. EX2-061 is the green Tamer peer for
the main clause; ST4-15 is a neutral public suspension Option; EX2-026 is the
same-lineage inherited-effect host used to prove the effect is carried by a
digivolution card rather than the top card's own text.

#### Implementation and validation

No engine, shared, catalog, or other card files were changed. The
coordinator's focused serial EX2-025 run passed all 6 tests, and scoped
Oxlint/Oxfmt/diff gates are clean. No typecheck or Git operation was run in
this lane; workspace typecheck and collection suites remain coordinator-owned.

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX2/EX2-025.test.ts \
  --maxWorkers=1 --no-file-parallelism
6 passed, 6 total; scoped Oxlint/Oxfmt and diff gates clean
```

Rubric scores (delivery intentionally fixed at 0/2):

- Catalog/rules: 2/2 — exact card fields/text and applicable standard rules are recorded.
- IR trace: 2/2 — both printed clauses map to typed full-coverage IR with exact filters, timing, limits, target, amount, and duration.
- Behavioral proof: 2/2 — positive/negative Tamer color, once-per-turn refusal, temporary reset, suspension trigger, and exact evolution cost are public-path assertions.
- Peer/stack proof: 2/2 — EX2-061/ST4-15 peer paths plus legal green and invalid red breeding stacks are covered.
- Delivery gates: 0/2 — coordinator owns focused execution and collection gates.

Total: 8/10.

### EX2-026 — Gargomon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-026`) — green level 4 Champion Digimon, 5000 DP, play cost 5, green level 3 / cost 2 evolution, Vaccine / Beastkin, with one Your Turn evolution-cost reduction and one inherited suspension trigger.
- Knowledge base command: `node tools/kb/query.mjs card EX2-026 --json` — no card-specific Q&A entries; the printed text is evaluated against the shared replacement-cost and suspension-trigger semantics.
- The direct IR uses a self-scoped `wouldDigivolve` replacement gated by an exact green Tamer in the controller's battle area, plus an inherited `whenSuspended` sub-trigger scoped to opponent Digimon and a once-per-turn duration-limited DP modifier.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[Your Turn] When this Digimon would digivolve` | `YourTurn` → self-filtered `Replacement` for `wouldDigivolve` | Public digivolve intents exercise the replacement on the owner's turn and the ordinary paid path without the gate. |
| if you have a green Tamer in play | Replacement condition `youHave`, battle-area, controller mine, kind Tamer, color Green | Green `EX2-061` reduces the cost; yellow `EX2-060` does not. |
| reduce the digivolution cost by 1 | Nested replacement `mode: "reduceCost"`, amount 1 | Paid evolution changes memory by 2 instead of 3 and verifies source-only stack plus automatic draw. |
| `[Your Turn][Once Per Turn]` | Inherited `YourTurn`, `isInherited: true`, `frequency: "OncePerTurn"` | Two public suspensions in one turn grant only one modifier; a continuous turn loop proves expiry and next-own-turn reactivation. |
| When an opponent's Digimon becomes suspended | Inherited `SubTrigger.event: "whenSuspended"`, source filter opponent Digimon | Public `ST4-15` choices suspend three distinct opponent Digimon through public Option intents. |
| this Digimon gets +2000 DP for the turn | Self `ModifyDP`, amount +2000, duration `forTheTurn` | Host DP reaches 9000, returns to 7000 on the opponent's turn, then reaches 9000 again on the next own turn. |

Fixtures use inert main-deck cards (`BT1-009`–`BT1-014`) where deck/security cards are needed; no Digi-Egg is placed outside an egg deck or breeding area and no numeric security shortcut is used. All public Option and turn-loop effects settle before endpoint assertions.

#### Changes

- Removed `@ts-nocheck` and exported a typed `CompiledCard` IR.
- Kept executable registration exclusively through `registerIrCard("EX2-026", compiled)`.
- Added catalog/IR assertions, paid legal evolution stack/draw proof, green/non-green Tamer boundary coverage, same-turn once-per-turn suppression, duration expiry, and real next-own-turn reset coverage.

#### Verification status

The coordinator's focused EX2-026 run passed 4/4 tests. Scoped Oxlint, Oxfmt, fixture-policy, and diff checks are clean. No typecheck or Git write was run in this lane. Card rubric is catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10 with delivery gates 0/2 pending collection gates, commit, and push.

### EX2-027 — Rapidmon

#### Scope and source evidence

EX2-027 is a green level 5 Ultimate Digimon (7000 DP, play cost 8), evolving
from a green level 4 for 3. The catalog entry in
`packages/shared/src/cards/data/cards.json` and the local rules knowledge base
were checked with:

```text
node tools/kb/query.mjs card EX2-027
```

The query returned no card-specific Q&A entries. The implementation is a
typed `CompiledCard` registered exclusively with
`registerIrCard("EX2-027", compiled)`; it has full coverage and no residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| `[When Digivolving] If you have a green Tamer in play` | `WhenDigivolving` `Suspend` guarded by `youHave`, battle-area green Tamer filter | A legal BT1-071 evolution with EX2-061 satisfies the gate; an otherwise legal evolution with no Tamer leaves the opposing Digimon active, and yellow EX2-060 is not accepted by the same boundary. |
| Suspend 1 of your opponent's Digimon | Opponent Digimon filter and count 1 | The public evolution path suspends the selected opponent Digimon and settles the full effect stack. |
| `[Your Turn][Once Per Turn]` inherited clause | Inherited `YourTurn`, `frequency: "OncePerTurn"` | A realistic EX2-029 → EX2-027 stack receives the inherited effect from two public ST4-15 uses only once during the turn. |
| When an opponent's Digimon becomes suspended | Inherited `SubTrigger(event: "whenSuspended")`, opponent Digimon source filter | Public Option intents suspend two selected opposing Digimon; a third suspension after the real next own turn proves re-arm. |
| Gain `<Security Attack +1>` for the turn | Self `GainKeyword(SecurityAttack, 1)`, duration `forTheTurn` | The host gains one Security Attack, remains at one after the same-turn second suspension, returns to zero during the opponent's turn, and gains one again on the next own turn. |
| Legal evolution accounting | Catalog green Lv4 / cost 3 and public `digivolve` intent | The evolution pays Rapidmon's printed 3 memory from an inert BT1-071 green Lv4 source, draws one card, and puts BT1-071 under EX2-027; an EX2-014 non-green source is rejected. |

All deck and security fixtures use inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`); there are no Digi-Eggs outside an egg deck and no
numeric security shortcut.

#### Rules knowledge-base Q&A

The local query returned no Q&A ids for EX2-027. The relevant shared rules
semantics are nevertheless exercised: exact green-Tamer gating, opponent-only
`whenSuspended` observation, inherited once-per-turn identity, turn-limited
keyword duration, and public next-own-turn reactivation.

#### Peer and stack evidence

BT1-071 is used as an inert legal green level-4 predecessor, avoiding EX2-026's
separate printed green-Tamer cost reduction, and EX2-061 is the green-Tamer
comparator; EX2-060 is the non-green Tamer boundary. EX2-029
provides the realistic MegaGargomon host stack whose inherited EX2-027 effect
is observed through public ST4-15 plays. The test asserts source-card stack
identity and automatic evolution draw rather than treating Rapidmon as an
isolated permanent.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept executable registration exclusively through `registerIrCard`.
- Expanded the focused test with catalog/IR assertions, paid legal evolution
  stack/draw proof, green-Tamer and non-green boundaries, inherited
  once-per-turn suppression, duration expiry, next-own-turn reset, and an
  illegal-source negative.
- Sanitized all deck/security fixtures with inert main-deck cards.
- Made the full-cost evolution fixture collection-safe: EX2-026's own
  green-Tamer reduction is no longer an implicit dependency of Rapidmon's
  cost assertion. The prior focused-only pass was import-order-sensitive because
  the isolated file did not load EX2-026, while the full collection did.

#### Validation and score

The coordinator's focused serial run passed 5/5, with clean coordinator
Oxlint, Oxfmt, fixture-policy, and diff gates. A collection-only discrepancy
was diagnosed: before this fixture correction, the full EX2 import graph
registered EX2-026's inherited green-Tamer evolution reduction, changing the
Rapidmon proof from 5→2 to 5→3 memory; isolated execution had not imported
EX2-026 and therefore masked that reduction. This was registry import-order
sensitivity, not asynchronous state leakage. No Vitest, typecheck, lint, or
Git operation was run in this worker lane.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/legal-stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation, commit, and push: **8/10**.

### EX2-028 — Parasitemon

#### Scope and evidence

EX2-028 is a green level 6 Mega Digimon (11000 DP, play cost 11), evolving
from a green level 5 for 3. Its [End of Attack] effect may place this Digimon
under one of its other Digimon as that Digimon's bottom digivolution card.
Its two inherited clauses grant Security Attack +1 and, during its
controller's turn, +2000 DP.

The module is now a typed `CompiledCard`, exports `compiled`, and registers
only through `registerIrCard("EX2-028", compiled)`. The complete IR has no
residual entries.

#### Clause-to-test-to-IR map

| Clause | Public proof | IR mapping |
| --- | --- | --- |
| End of Attack optional placement | A real attack with Parasitemon selects another Digimon; Parasitemon is placed at the bottom of that stack and its own existing source card is trashed | `EndOfAttack` → optional `PlaceUnder`, self target, exact own-controller Digimon `underFilter`, `excludeSelf`, `targetIsPermanent`, `position: "bottom"`, `shedOwnCards` |
| Erratum “other Digimon” / self exclusion | The same public placement case has both attacker and another Digimon available and verifies the result is on the other permanent; the IR excludes self | `underFilter.excludeSelf: true` |
| Optional refusal | A public attack with `autoDeclineOptional` leaves Parasitemon in the battle area and the other stack unchanged | `optional: true` |
| Inherited Security Attack +1 | Host with EX2-028 under it reports exactly one Security Attack keyword on both turns | Inherited `Static` keyword `SecurityAttack`, amount 1 |
| Inherited Your Turn +2000 | Host is 13000 outside its controller's turn and 15000 during it; the +2000 is permanent while the inherited card remains under the host | Inherited `YourTurn` → self `ModifyDP(+2000, duration: "permanent")` |
| Legal evolution and paid cost | Public evolution from green level-5 BT1-075 to EX2-028 pays exactly 3 memory, preserves source stack, and resolves standard evolution draw; blue level-4 EX2-014 is rejected | Catalog green Lv.5/3 requirement; no unprinted evolution behavior is added |

All main-deck and security fixtures use ordinary cards. Digi-Eggs and numeric
security shortcuts are absent from the tests.

#### Rules knowledge-base Q&A

The local KB query returned errata and Q3320–Q3323. The module follows the
2025-08-01 erratum wording by requiring an “other” Digimon. Q3320 is proven by
the placement case: only EX2-028 moves under the target and its existing
Parasitemon source is trashed. Q3321 (a target Digimon without a level) is
consistent with the target filter's Digimon-kind requirement, though no
separate no-level Digimon fixture is available. Q3322 is covered by the host
observation of both inherited clauses at once. Q3323 is covered by the
self-exclusion placement proof. No ambiguity is silently invented.

#### Implementation and validation

No engine, shared, catalog, or other card files were changed. The first
coordinator focused run passed 6/7 tests; the sole failure was the
optional-decline test waiting for zero security cards even though its
two-card fixture correctly leaves one after the attack. The assertion was
corrected to wait for the observable length-1 milestone, and the coordinator
rerun passed 7/7. Scoped Oxlint, Oxfmt, and diff gates are clean. No typecheck
or Git operation was run in this lane.

```text
pnpm exec oxlint apps/api/src/cards/EX2/EX2-028.ts apps/api/src/cards/EX2/EX2-028.test.ts
pnpm exec oxfmt --write apps/api/src/cards/EX2/EX2-028.ts apps/api/src/cards/EX2/EX2-028.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX2/EX2-028.ts apps/api/src/cards/EX2/EX2-028.test.ts
All matched files use the correct format.
7 passed, 7 total; scoped Oxlint/Oxfmt and diff gates clean
```

Rubric scores (delivery intentionally fixed at 0/2):

- Catalog/rules: 2/2 — exact catalog, erratum, and Q&A evidence are recorded.
- IR trace: 2/2 — placement, self exclusion, card shedding, inherited keyword,
  turn-gated DP, and full coverage map directly to typed IR.
- Behavioral proof: 2/2 — public placement/refusal, both inherited clauses,
  duration boundary, and exact evolution payment/stack endpoints are covered.
- Peer/stack proof: 2/2 — EX2-029 host and EX2-025 source-stack peers plus
  legal green and invalid blue evolution paths are exercised.
- Delivery gates: 0/2 — coordinator owns focused execution and collection
  gates.

Total: 8/10.

### EX2-029 — MegaGargomon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-029`) — green level 6 Mega Digimon, 13000 DP, play cost 12, green level 5 / cost 5 evolution, Vaccine / Machine, with a per-green-Tamer suspension/unsuspend-lock effect and a once-per-turn suspended-Digimon return effect.
- Knowledge base command: `node tools/kb/query.mjs card EX2-029 --json` — no card-specific Q&A entries; the implementation follows the shared suspension, binding, duration, return, and once-per-turn semantics.
- The direct IR binds the permanents actually suspended by the When Digivolving action and applies the unsuspend restriction only to that bound result. The attack return uses opponent/suspended/Digimon filtering and a source-relative DP ceiling.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[When Digivolving]` | `trigger: "WhenDigivolving"` | Public paid evolution intent settles the full effect stack. |
| For each green Tamer you have in play | Suspend scaling, one unit per green Tamer in the controller's battle area | Two green Tamers suspend two opposing Digimon; a third opposing Digimon remains active and unrestricted. |
| suspend 1 of your opponent's Digimon | Opponent Digimon target with scaling and `bindResultAs` | Public assertions observe exactly the selected opposing permanents suspended. |
| They don't unsuspend during your opponent's next unsuspend phase | `Restrict` on `boundRef: "suspendedByMegaGargomon"`, restriction `unsuspend`, duration `untilOpponentTurnEnd` | Continuous public turn loop observes selected targets remain suspended through the opponent's unsuspend phase while the non-selected target is unaffected. |
| `[When Attacking][Once Per Turn]` | `WhenAttacking` effect with `frequency: "OncePerTurn"` | Public attacks return one target, then a real next-own-turn attack returns another target. |
| Return 1 of your opponent's suspended Digimon | `Return` to hand, opponent/suspended/Digimon filter, count 1 | Public attack moves exactly one eligible suspended Digimon to the opponent's hand. |
| with DP less than or equal to this Digimon's DP | Relative DP predicate `op: "lte"`, `relativeToSource: true` | 13000-DP MegaGargomon returns a 5000-DP target while leaving a 14000-DP suspended target in play. |

Fixtures use inert main-deck cards (`BT1-009`–`BT1-014`) in deck/security; no Digi-Egg or numeric security shortcut is used. The added third opposing Digimon proves the restriction binding does not over-target, and all public attack/evolution windows are settled before endpoint assertions.

#### Changes

- Removed `@ts-nocheck` and exported a typed `CompiledCard` IR.
- Kept executable registration exclusively through `registerIrCard("EX2-029", compiled)`.
- Corrected the unsuspend lock to follow the Digimon actually suspended by the scaling action via `boundRef`.
- Added catalog/IR assertions, paid evolution stack/draw proof, target-binding boundary coverage, DP ceiling proof, public attack return proof, and real next-own-turn once-per-turn proof.

#### Verification status

The coordinator's first focused run passed 2/3 tests; the sole failure was the real-turn return/reset scenario exhausting seat 0's empty deck at the third-turn draw (seat 1 also had only two draw cards). After seeding eight inert main-deck cards for each seat, the rerun reached the reset return but exposed a stale endpoint assertion: the excluded high-DP Digimon naturally unsuspends during the intervening opponent turn. The test now proves exclusion through stable battle-area permanent identity and top-card location while the eligible low-DP target is returned to hand. The coordinator's corrected rerun passed 3/3; Oxlint, Oxfmt, fixture-policy, and scoped diff checks are clean. No typecheck or Git write was run in this lane. The card rubric is catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10 with delivery gates 0/2 pending collection gates, commit, and push.

### EX2-030 — Monodramon

#### Scope and source evidence

EX2-030 is a black level 3 Rookie Digimon (1000 DP, play cost 3), evolving
from a black level 2 for 0. The catalog entry in
`packages/shared/src/cards/data/cards.json` and the local rules knowledge base
were checked with:

```text
node tools/kb/query.mjs card EX2-030
```

The query returned no card-specific Q&A entries. The implementation is a
typed `CompiledCard` registered exclusively with
`registerIrCard("EX2-030", compiled)`; it has full coverage and no residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| `[On Play] Reveal the top 4 cards of your deck` | `OnPlay` → `RevealAdd`, `revealCount: 4` | Public `playCard` intent resolves the exact four-card reveal. |
| Add all black Tamer cards among them to your hand | `RevealAdd.add` count `"all"`, own Tamer filter with exact Black color | A mixed top-four fixture adds both EX2-062 and EX2-063 black Tamers while leaving inert non-Tamers and a non-black Tamer out of hand. |
| Place remaining cards at the bottom in any order | `RevealAdd.rest: "deckBottom"` | The settled public endpoint asserts the exact remaining deck sequence, including the excluded EX2-061 non-black Tamer. |
| Paid public play | Catalog play cost 3 and public `playCard` intent | Memory falls from 10 to 7 and the Monodramon permanent is present with its own instance identity. |
| Legal card identity/evolution metadata | Catalog black Lv3 / black Lv2 evolution cost 0 | Catalog assertions cover the legal evolution metadata; no card-specific triggered evolution clause exists. |

All padding deck and security fixtures use inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`); the only non-padding card is the explicitly tested
EX2-061 non-black Tamer. There are no Digi-Eggs outside an egg deck and no
numeric security shortcut.

#### Rules knowledge-base Q&A

The local query returned no Q&A ids for EX2-030. The focused behavior still
proves the relevant shared semantics: On Play timing, exact color/kind
filtering, all-match selection, and bottom-deck handling for excluded cards.

#### Peer and stack evidence

EX2-030 is compared against the adjacent EX2 black line (EX2-031 and
EX2-032) and the black Tamer identities EX2-062/EX2-063. The mixed reveal
fixture includes EX2-061 as a same-family but non-black Tamer and ordinary
non-Tamer cards, proving the filter boundary rather than only succeeding with
a single matching card. This level-3 card has no printed evolution-trigger or
inherited clause requiring a deeper stack.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept executable registration exclusively through `registerIrCard`.
- Expanded the focused test with catalog/IR assertions, paid public play,
  exact all-black-Tamer selection, excluded non-black/non-Tamer cards, and
  exact bottom-deck order.
- Sanitized all deck/security fixtures with inert main-deck cards.

#### Validation and score

The coordinator's focused run passed 3/3; coordinator Oxlint, Oxfmt,
fixture-policy, and diff gates are clean. The worker also reran scoped
Oxlint/Oxfmt after removing an unused `FILLER` constant. No typecheck or Git
operation was run in this lane.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/legal-stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation, commit, and push: **8/10**.

### EX2-031 — Guardromon

#### Scope and evidence

EX2-031 is a black level 4 Champion Digimon (4000 DP, play cost 5), evolving
from a black level 3 for 2. It has Blocker and, on play, gives one of its
controller's Digimon +3000 DP until the end of the opponent's turn.

The module is now a typed `CompiledCard`, exports `compiled`, and registers
only through `registerIrCard("EX2-031", compiled)`. The complete IR has full
coverage and no residual entries.

#### Clause-to-test-to-IR map

| Clause | Public proof | IR mapping |
| --- | --- | --- |
| Blocker | A real opponent attack opens a block window; the public `declareBlock` intent suspends Guardromon, redirects the attack, preserves both security stacks, and ends the attack | `Static` keyword `Blocker` |
| On Play +3000 to one of your Digimon | Public play of Guardromon with a preferred ally target raises that ally from 1000 to 4000 | `OnPlay` → `ModifyDP`, mine Digimon count 1, amount +3000 |
| Duration through opponent's turn | The buff remains 4000 in the opponent's Main phase and returns to the ally's base 1000 after that turn ends | `duration: "untilOpponentTurnEnd"` |
| Evolution requirement/cost | Public black level-3 EX2-030 → EX2-031 evolution pays exactly 2 memory, preserves the source stack and standard evolution draw, and retains Blocker; blue EX2-014 is rejected | Catalog black Lv.3/2 requirement; static keyword remains active after evolution |

All deck and security fixtures use ordinary main-deck cards. No Digi-Egg is
placed in deck/security and no numeric security shortcut is used.

#### Rules and peer evidence

The local KB query returned no EX2-031-specific entries. The public attack
case follows the repository's Blocker battle window protocol used by EX2-017
and confirms the keyword is executable, not merely structural. EX2-030 is the
same-color level-3 evolution peer and ally target; EX2-014 supplies the
off-color negative source.

#### Implementation and validation

No engine, shared, catalog, or other card files were changed. The
coordinator's focused serial EX2-031 run passed all 6 tests, and scoped
Oxlint/Oxfmt/diff gates are clean. No typecheck or Git operation was run in
this lane; workspace typecheck and collection suites remain coordinator-owned.

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX2/EX2-031.test.ts \
  --maxWorkers=1 --no-file-parallelism
6 passed, 6 total; scoped Oxlint/Oxfmt and diff gates clean
```

Rubric scores (delivery intentionally fixed at 0/2):

- Catalog/rules: 2/2 — exact catalog fields and standard Blocker/duration rules are recorded.
- IR trace: 2/2 — keyword, target scope, amount, duration, timing, and full coverage map directly to typed IR.
- Behavioral proof: 2/2 — public Blocker redirection, On Play target, duration boundary, and exact evolution endpoints are covered.
- Peer/stack proof: 2/2 — EX2-030/EX2-014 evolution peers and a real opponent attack/block window are exercised.
- Delivery gates: 0/2 — coordinator owns focused execution and collection gates.

Total: 8/10.

### EX2-032 — Strikedramon

#### Scope and source evidence

EX2-032 is a black level 4 Champion Digimon (5000 DP, play cost 5), evolving
from a black level 3 for 2. The catalog entry in
`packages/shared/src/cards/data/cards.json` and the local rules knowledge base
were checked with:

```text
node tools/kb/query.mjs card EX2-032
```

The query returned Q3324. The implementation is a typed `CompiledCard`
registered exclusively with `registerIrCard("EX2-032", compiled)`; it has full
coverage and no residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| `[When Digivolving] Reveal the top 4 cards of your deck` | `WhenDigivolving` → `RevealAdd`, `revealCount: 4` | A legal EX2-030 → EX2-032 public evolution resolves the four-card reveal after the automatic evolution draw. |
| Add 1 black Tamer among them to your hand | `RevealAdd.add` count 1, own Tamer filter with exact Black color | A mixed reveal adds EX2-062 and leaves all other revealed cards out of hand; a no-match reveal adds none. |
| Place remaining revealed cards at the bottom in any order | `RevealAdd.rest: "deckBottom"` | A public `respondDecision` order is asserted exactly by instance identity. |
| Legal evolution accounting | Catalog black Lv3 / cost 2 and public `digivolve` intent | Memory falls from 10 to 8, EX2-030 is retained under EX2-032, and the evolution draw is observed; an EX2-014 non-black source is rejected. |
| `[When Attacking][Once Per Turn]` | Inherited `WhenAttacking`, `isInherited: true`, `frequency: "OncePerTurn"` | A real EX2-034 host stack with EX2-032 underneath exercises three public attacks across two own turns. |
| If you have 2 or more black Tamers in play, gain 1 memory | Self-independent `youHave` condition with own battle-area black-Tamer filter and `GainMemory(1)` | With EX2-062 and EX2-063, the first attack gains exactly one memory, a same-turn second attack is refused, and the next own turn gains one again; with only one black Tamer no memory is gained. |

All padding deck and security fixtures use inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`); there are no Digi-Eggs outside an egg deck and no
numeric security shortcut.

#### Rules knowledge-base Q&A

- Q3324: four or more black Tamers still produce only one memory. The IR uses
  a boolean `count: 2` gate and a single `GainMemory(amount: 1)` action rather
  than scaling the gain; the two-Tamer public attack proof exercises this
  exact boundary.

#### Peer and stack evidence

EX2-030 supplies the legal black level-3 predecessor and EX2-022 supplies a
realistic public self-unsuspending host stack. EX2-062/EX2-063 are black-Tamer
positives, while the no-match reveal and one-Tamer attack are negative
boundaries. The public attack test uses EX2-022's printed top-security cost to
attack the same host twice in one turn, then runs a real turn loop to prove
once-per-turn reset rather than injecting an internal timing event.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept executable registration exclusively through `registerIrCard`.
- Expanded the focused test with catalog/IR assertions, paid legal evolution
  stack/draw proof, exact reveal/add and public ordering, no-match behavior,
  public same-turn once-per-turn refusal, next-own-turn reset, threshold
  negative, and illegal-source rejection.
- Sanitized padding deck/security fixtures with inert main-deck cards.

#### Validation and score

The coordinator's corrected focused run passed 7/7, with clean coordinator
Oxlint, Oxfmt, fixture-policy, and diff gates. The final public fixture uses
the already-proven EX2-022 Antylamon host, whose printed top-security cost
unsuspends itself for a same-turn second attack; the next-own-turn reset is a
real turn-loop proof. No typecheck or Git operation was run in this worker lane.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/legal-stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation, commit, and push: **8/10**.

### EX2-033 — Locomon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-033`) — black level 5 Ultimate Digimon, 7000 DP, play cost 6, black level 4 / cost 3 evolution, Data / Machine, with a Your Turn reduction when evolving into GroundLocomon in hand.
- Knowledge base command: `node tools/kb/query.mjs card EX2-033 --json` — no card-specific Q&A entries; the implementation follows the shared `wouldDigivolve` replacement and normal evolution-cost semantics.
- The replacement is self-scoped and its destination filter requires a mine-controlled hand card whose exact name is `GroundLocomon`, so other level-6 Digimon do not receive the reduction.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[Your Turn] When this Digimon would digivolve` | `YourTurn` → self-filtered `Replacement` for `wouldDigivolve` | Public evolution intents exercise the replacement on the owner's turn. |
| into a `[GroundLocomon]` in your hand | `into.zone: "hand"`, `controller: "mine"`, exact name filter `GroundLocomon` | GroundLocomon receives the reduction; Reapermon, a different level-6 Digimon, pays its full cost. |
| reduce the digivolution cost by 1 | Nested `Replacement` with `mode: "reduceCost"`, amount 1 | Paid GroundLocomon evolution changes memory by 2 instead of 3 and verifies the source-only stack plus evolution draw. |

Fixtures use inert main-deck cards (`BT1-009`–`BT1-011`) for deck/security proof; no Digi-Egg or numeric security shortcut is used. A green level-4 source is rejected for the black evolution path, proving the normal source-color requirement remains enforced.

#### Changes

- Removed `@ts-nocheck` and exported a typed `CompiledCard` IR.
- Kept executable registration exclusively through `registerIrCard("EX2-033", compiled)`.
- Added catalog/IR assertions, paid GroundLocomon stack/draw proof, non-GroundLocomon cost boundary, and illegal-source negative coverage.

#### Verification status

The coordinator's focused EX2-033 run passed 4/4 tests. Scoped Oxlint, Oxfmt, fixture-policy, and diff checks are clean. No typecheck or Git write was run in this lane. Card rubric is catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10 with delivery gates 0/2 pending collection gates, commit, and push.

### EX2-034 — Andromon

#### Scope and evidence

EX2-034 is a black level 5 Ultimate Digimon (6000 DP, play cost 8), evolving
from a black level 4 for 3. It has Blocker and, during the opponent's turn,
gives all of its controller's Digimon with Blocker +2000 DP.

The module is now a typed `CompiledCard`, exports `compiled`, and registers
only through `registerIrCard("EX2-034", compiled)`. Its complete IR has full
coverage and no residual entries.

#### Clause-to-test-to-IR map

| Clause | Public proof | IR mapping |
| --- | --- | --- |
| Blocker | A real opponent attack opens a block window; public `declareBlock` with Andromon redirects the attack, suspends Andromon, and preserves both security stacks | `Static` keyword `Blocker` |
| Opponent-turn +2000 to all your Blockers | Board contains Andromon and Guardromon (Blockers) plus non-Blocker EX2-030. Own turn remains 6000/4000/1000; opponent turn becomes 8000/6000/1000 | `OpponentsTurn` → mine Digimon filter with `keywords: ["Blocker"]`, `count: "all"`, `ModifyDP(+2000, permanent)` |
| Duration/turn ownership | Production turn transition materializes the aura only at opponent Main; the own-turn boundary test confirms no opponent aura on the controller's turn | `trigger: "OpponentsTurn"` and permanent continuous modifier |
| Evolution requirement/cost | Public black EX2-031 → EX2-034 evolution pays exactly 3 memory, preserves source stack and standard evolution draw, retains Blocker, and gains the opponent-turn aura; blue EX2-014 is rejected | Catalog black Lv.4/3 requirement and static keyword |

All deck and security fixtures use ordinary main-deck cards. No Digi-Egg is
placed in deck/security and no numeric security shortcut is used.

#### Rules and peer evidence

The local KB query returned no EX2-034-specific entries. The public attack
case follows the repository's Blocker battle-window protocol and verifies the
keyword's actual redirection behavior. EX2-031 is the black Blocker peer and
legal evolution source; EX2-030 demonstrates that the opponent-turn aura
excludes non-Blockers; EX2-014 is the off-color negative source.

#### Implementation and validation

No engine, shared, catalog, or other card files were changed. The
coordinator's focused serial EX2-034 run passed all 7 tests, and scoped
Oxlint/Oxfmt/diff gates are clean. No typecheck or Git operation was run in
this lane; workspace typecheck and collection suites remain coordinator-owned.

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX2/EX2-034.test.ts \
  --maxWorkers=1 --no-file-parallelism
7 passed, 7 total; scoped Oxlint/Oxfmt and diff gates clean
```

Rubric scores (delivery intentionally fixed at 0/2):

- Catalog/rules: 2/2 — exact catalog fields and applicable Blocker/turn rules are recorded.
- IR trace: 2/2 — keyword, opponent-turn timing, exact Blocker filter, all-target count, amount, and full coverage map directly to typed IR.
- Behavioral proof: 2/2 — public Blocker redirection, all-vs-non-Blocker boundary, turn transition, and exact evolution endpoints are covered.
- Peer/stack proof: 2/2 — EX2-031/EX2-030/EX2-014 peers and legal/invalid black evolution paths are exercised.
- Delivery gates: 0/2 — coordinator owns focused execution and collection gates.

Total: 8/10.

### EX2-035 — Cyberdramon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-035`) — black level 5 Ultimate Digimon, 10000 DP, play cost 8, black level 4 / cost 3 evolution, Vaccine / Cyborg, with a free optional Ryo Akiyama play, a no-Tamer player-attack restriction, and an inherited once-per-turn black-Tamer De-Digivolve effect.
- Knowledge base command: `node tools/kb/query.mjs card EX2-035 --json` — Q3325 confirms that Piercing still performs its security check when this card has no Tamers; the player-attack restriction does not suppress Piercing after a Digimon battle.
- The direct IR uses an optional hand-only `PlayWithoutCost`, a Your Turn Aura restricting player attacks only while the controller has no Tamers, and an inherited `DeDigivolve` gated by at least two black Tamers.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[When Digivolving] You may play 1 [Ryo Akiyama] from your hand without paying its memory cost` | Optional `PlayWithoutCost`, source `hand`, exact name filter `Ryo Akiyama`, `payCost: false` | Public paid evolution plays Ryo from hand and verifies the evolved stack and resulting board state. |
| `[Your Turn] While you have no Tamers in play, this Digimon can't attack players` | Your Turn `Aura` self-target with `youHaveNone` Tamer condition and `attackPlayers` restriction | Public player attack without Tamers is rejected; the positive evolution test and inherited tests use Ryo/black Tamers and remain attack-capable. |
| `[When Attacking][Once Per Turn]` | Inherited `WhenAttacking`, `isInherited: true`, `frequency: "OncePerTurn"` | Public attack proof resolves the inherited effect and a continuous turn loop demonstrates reactivation on the next own turn. |
| If you have 2 or more black Tamers in play | `youHave` battle-area Tamer filter with black color and count 2 | Two black Tamers enable De-Digivolve; a single black Tamer negative leaves the target stack unchanged. |
| ＜De-Digivolve 1＞ 1 of your opponent's Digimon | `DeDigivolve` opponent Digimon target, amount 1 | Public attack strips exactly one top card from the selected opponent stack and leaves its level-3 base. |
| (Trash 1 card from the top ...; stop at no sources/level 3) | Shared `DeDigivolve` primitive | Stack endpoint assertions observe the source card removed while the bottom level-3 card remains. |

Q3325 is proven through a public peer interaction: BT19-095 grants Cyberdramon Piercing, Cyberdramon has no Tamer, and a public attack deletes an opposing Digimon and still performs the Piercing security check. The no-Tamer Aura therefore remains scoped to player-attack legality rather than disabling unrelated Piercing resolution.

Fixtures use inert main-deck cards (`BT1-009`–`BT1-014`) in deck/security; no Digi-Egg or numeric security shortcut is used. No internal timing/fire verb is used as behavioral proof.

#### Changes

- Removed `@ts-nocheck` and exported a typed `CompiledCard` IR.
- Kept executable registration exclusively through `registerIrCard("EX2-035", compiled)`.
- Added catalog/IR assertions, public Ryo play/evolution proof, player-attack restriction proof, black-Tamer threshold proof, public De-Digivolve attacks, and a real next-own-turn once-per-turn reset path.

#### Verification status

The coordinator focused rerun passed 7/7. Scoped Oxlint, Oxfmt, fixture, and diff checks were clean. The minimal standalone public positive isolates the inherited watcher: EX2-036 carries EX2-035 underneath, exactly two black Tamers are present, and one depth-2 EX2-036 target with sources ordered as level 3 BT1-009 then level 4 EX2-032 promotes to EX2-032 with stack length 1. The separate reset proof uses an EX2-022 host carrying EX2-035 underneath: the first public attack de-digivolves the target, the second same-turn attack is refused by the inherited once-per-turn gate, and a real next-own-turn public attack proves the reset. The real turn loop is public throughout, with `waitForMainPhase`/`endMainPhaseIfOpen` transitions and fully settled attacks; fixtures use sufficient inert main-deck cards and no Digi-Egg or numeric security shortcut. Card rubric is catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10 with delivery gates 0/2 pending final collection gates, commit, and push. This correction lane ran no tests, typecheck, or Git writes.

### EX2-036 — GroundLocomon

#### Scope and evidence

EX2-036 is a black level 6 Mega Digimon (11000 DP, play cost 11), evolving
from a black level 5 for 3. During its controller's turn it cannot attack
opponent Digimon. During all turns, it gains +1000 DP for each card in its
controller's trash with Cyborg or Machine in its traits.

The module is now a typed `CompiledCard`, exports `compiled`, and registers
only through `registerIrCard("EX2-036", compiled)`. The complete IR has full
coverage and no residual entries.

#### Clause-to-test-to-IR map

| Clause | Public proof | IR mapping |
| --- | --- | --- |
| Your Turn cannot attack opponent Digimon | A direct attack intent against a suspended opponent Digimon is rejected with `illegal-target`; a player attack remains legal | `YourTurn` → self `Restrict`, `cantAttackDigimon`, permanent |
| All Turns trash scaling | Trash containing EX2-031 (Machine), EX2-034 (Cyborg), and non-matching EX2-014 produces exactly +2000 DP; the same bonus is visible on both turns | `AllTurns` → self `ModifyDP(+1000, permanent)` with trash/controller mine, exact trait tokens `Cyborg`/`Machine`, per-trash scaling |
| Turn boundary | The attack restriction is present on the controller's turn and absent on the opponent's turn, while the trash DP bonus remains | Separate `YourTurn` restriction and `AllTurns` modifier |
| Blocked player attack (Q3326) | A real player attack is blocked by an opponent's Blocker through the public block window; the normal battle deletes the weaker blocker while GroundLocomon survives | Restriction permits player target; standard combat/block engine resolves the battle |
| Evolution requirement/cost | Public black EX2-034 → EX2-036 evolution pays exactly 3 memory, preserves source stack and standard evolution draw, retains the attack restriction and trash bonus; blue EX2-014 is rejected | Catalog black Lv.5/3 requirement and typed IR |

All deck and security fixtures use ordinary main-deck cards. No Digi-Egg is
placed in a deck/security stack and no numeric security shortcut is used.

#### Rules knowledge-base Q&A

The local KB query returned Q3326: a player attack that is blocked battles
normally. The public blocked-player-attack test proves this directly. No other
EX2-036-specific Q&A or erratum was returned.

#### Rules and peer evidence

EX2-034 is the black level-5 evolution peer and contributes a legal source;
EX2-031 (Machine) and EX2-034 (Cyborg) are mixed positive trash traits, while
EX2-014 is a non-matching trait control. The blocked attack follows the
repository's public Blocker protocol rather than an injected combat verb.

#### Implementation and validation

No engine, shared, catalog, or other card files were changed. The first
coordinator focused run passed 6/7 tests; the sole failure was the catalog
assertion expecting Virus while the committed catalog identifies the attribute
as Data. The assertion now matches the catalog, and the coordinator rerun
passed 7/7 with scoped Oxlint/Oxfmt/diff gates clean. No typecheck or Git
operation was run in this lane.

```text
pnpm exec oxlint apps/api/src/cards/EX2/EX2-036.ts apps/api/src/cards/EX2/EX2-036.test.ts
pnpm exec oxfmt --write apps/api/src/cards/EX2/EX2-036.ts apps/api/src/cards/EX2/EX2-036.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX2/EX2-036.ts apps/api/src/cards/EX2/EX2-036.test.ts
All matched files use the correct format.
```

Rubric scores (delivery intentionally fixed at 0/2):

- Catalog/rules: 2/2 — exact catalog fields and Q3326 are recorded.
- IR trace: 2/2 — restriction, turn timing, trait boundary, scaling, amount, and full coverage map directly to typed IR.
- Behavioral proof: 2/2 — public target rejection, player attack/block battle, mixed-trait DP scaling, turn boundary, and evolution endpoints are covered.
- Peer/stack proof: 2/2 — EX2-031/EX2-034 black peers and EX2-014 non-matching control are exercised in public paths.
- Delivery gates: 0/2 — coordinator owns focused execution and collection gates.

Total: 8/10.

### EX2-037 — Reapermon

#### Scope and evidence

EX2-037 is a black level 6 Mega Digimon (11000 DP, play cost 12), evolving
from a black level 5 for 4. It has Reboot. During the opponent's turn, once
per turn, when an opponent's Digimon becomes unsuspended, it de-digivolves
that Digimon by 1.

The module is now a typed `CompiledCard`, exports `compiled`, and registers
only through `registerIrCard("EX2-037", compiled)`. The complete IR has full
coverage and no residual entries.

#### Clause-to-test-to-IR map

| Clause/ruling | Public proof | IR mapping |
| --- | --- | --- |
| Reboot and opponent unsuspend timing (Q3327) | In the opponent's Main phase, a public BT1-036 On Play unsuspends the suspended EX2-037 target; its two-card source stack drops by exactly one | `Static` keyword `Reboot`; `OpponentsTurn` → `SubTrigger(event: "whenUnsuspended")` |
| Target the Digimon that became unsuspended | The unsuspended target promotes EX2-031 to the top and retains EX2-032 in its source stack (the live top is excluded from `stack`); no unrelated permanent changes | `sourceRef: "triggerSubject"`, opponent Digimon filter, `DeDigivolve amount: 1` |
| Choose one when multiple unsuspend (Q3328) | Two public BT1-036 On Plays in one opponent Main each unsuspend a selected stacked target; the first event de-digivolves only its selected target | One target selection from the trigger subject event, `count: 1` |
| Once per turn is mandatory, not preservable (Q3329) | The second public unsuspend in the same opponent turn leaves its selected target at source-stack length 2, while the first is length 1 | `frequency: "OncePerTurn"`; mandatory non-optional `SubTrigger` and `DeDigivolve` action |
| Level 3/no source still triggers (Q3330) | A public BT1-036 On Play first unsuspends a high-DP EX2-014 level-3/no-source target (a no-op), then a second stacked target remains unchanged because the mandatory once-per-turn trigger was consumed | Same mandatory trigger and `DeDigivolve` with no conditional target gate |
| Evolution requirement/cost | Public black EX2-034 → EX2-037 evolution pays exactly 4 memory, preserves source stack and standard evolution draw, and retains Reboot; blue EX2-014 is rejected | Catalog black Lv.5/4 requirement and static keyword |

All deck and security fixtures use ordinary main-deck cards. No Digi-Egg is
placed in deck/security and no numeric security shortcut is used. The tests
use public BT1-036 On Play unsuspend effects during the opponent's Main phase;
no injected suspend/unsuspend verbs are used. The separate Reboot test only
checks the printed keyword, while the behavioral tests exercise the event
through the public play path.

#### Mechanism diagnosis

The first diagnosis found that `sourceRef: "triggerSubject"` target resolution
did not include the event-specific `unsuspendedPermanentId`/
`suspendedPermanentId` fields, so a matched watcher could resolve with no
target. A narrow generic fallback for those fields (and the first member of a
subject-id batch) is present in the shared permanent-target resolver.

The coordinator's latest serialized run reported 27/29 across the focused
card/engine lane: EX2-037's eight card proofs and the existing 12 mechanism
tests pass. The only remaining failure was the new Active-boundary regression;
its payload was emitted once and the watcher was armed, but its EX2-037 target
had already Reboot-unsuspended during the prior seat's Active phase. Earlier
instrumentation had shown the `whenUnsuspended` payload emitted while
`seenWatcherBodies` stayed empty; the `triggerSubject` fallback was therefore
not the cause of that run's failure.

The generic lifecycle seam is now narrowed to the turn-owner handoff:
`GameEngine.unsuspendForActivePhase()` awaits the existing continuous recompute
immediately before calling `unsuspendAllForSeat()`. This re-derives
`OpponentsTurn` subscriptions at the boundary where their guard changes,
before Active-phase unsuspend processing. The engine regression uses a stacked,
non-Reboot EX2-032 target so it remains suspended until the incoming opponent
turn; an EX2-037 target would Reboot during the prior seat's Active phase and
miss the OpponentsTurn watcher. Active-phase unsuspend now mirrors
the canonical event seams by awaiting the `whenUnsuspended` SubTrigger bus
against the watcher armed immediately before the flip, then awaiting its
legacy `OnUnTappedAnyone` timing window for each flipped permanent; this
avoids the timing window's trailing recompute invalidating the watcher first.
A public engine regression in
`opponentTurnFrequency.test.ts` starts from seat 0, passes to seat 1, and
asserts that the suspended stacked EX2-032 target de-digivolves during the
incoming Active phase. The regression wraps the actual `unsuspendAllForSeat`
boundary and records that the target was still suspended while the Reapermon
watcher was already installed, and records the Active-phase payload dispatch;
it should fail before this lifecycle refresh and explicit bus seam. The
existing EX2-037 diagnostic regression explicitly inspects the
`OpponentsTurn` subscription anchor, records the `whenUnsuspended` payload
from BT1-036's On Play Unsuspend, intercepts re-installation of the matched
watcher (continuous recompute can replace its object), wraps its body to inspect
the bound source, and records exactly one automatic watcher-body invocation.
It deliberately leaves the real body untouched only in that instrumentation
case; the public behavior tests assert the single De-Digivolve layer.
Coordinator execution must verify that the lifecycle refresh reaches the
watcher body and that the existing resolver fallback carries the event subject;
the card is not being claimed behaviorally green until that run.

The apparent two-layer result in an earlier diagnostic was caused by the test
invoking the watcher body in addition to the engine's automatic dispatch, not
by duplicate live subscriptions. That manual invocation was removed. Public
BT1-036 tests now first suspend each target through a public attack during
Main, then pre-bind that target's top instance so the generic auto-selector
cannot choose the newly played unsuspender. A single automatic fire must leave
top `EX2-031` with source `EX2-032`; the live top card is excluded from the
permanent's `stack` representation.

#### Rules and peer evidence

The local KB query returned Q3327–Q3330. EX2-034 is the black level-5
evolution peer. EX2-032 and EX2-014 provide stacked and level-3/no-source
opponent targets. The multiple-target and mandatory no-op cases exercise the
event identity and once-per-turn semantics rather than merely inspecting the
IR.

#### Implementation and validation

The shared target resolver, turn-owner lifecycle seam, engine regression, and
EX2-037 evidence files were changed; no catalog or unrelated card files were
touched. Under the coordinator's closed RAM guard, no Vitest, typecheck, or Git
operation was run. The coordinator should run the focused serial EX2-037 and
engine regression suites plus `git diff --check`.

Scoped pnpm Oxlint and Oxfmt checks pass for the touched source/test files.
The repository's Meteor-npm wrappers were also attempted but cannot launch
the Ox tools in this environment because the bundled Node 14 runtime reports
`ERR_UNKNOWN_FILE_EXTENSION` for their binaries.

Rubric scores (delivery intentionally fixed at 0/2):

- Catalog/rules: 2/2 — exact catalog and all four KB rulings are recorded.
- IR trace: 2/2 — Reboot, event timing, trigger identity, once-per-turn,
  mandatory behavior, and DeDigivolve count map directly to typed IR.
- Behavioral proof: 2/2 — the coordinator's corrected serial lane passes all
  27 card/mechanism/regression tests, including the Active-boundary watcher
  and the EX2-027 regression control.
- Peer/stack proof: 2/2 — EX2-034 source peer, EX2-032 stacked target, and EX2-014 level-3 boundary are exercised.
- Delivery gates: 0/2 — coordinator owns focused execution and collection gates.

Total: 8/10 before final delivery gates (delivery remains 0/2).

### EX2-038 — Justimon: Blitz Arm

#### Scope and source evidence

EX2-038 is a black level 6 Mega Digimon (11,000 DP, play cost 12), evolving
from a black level 5 for 3 memory. Its catalog identity and complete effect
text were checked in `packages/shared/src/cards/data/cards.json`. The local
knowledge base was queried with:

```text
node tools/kb/query.mjs card EX2-038
```

The implementation is a typed `CompiledCard` registered exclusively through
`registerIrCard("EX2-038", compiled)`, with `coverage: "full"` and no residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| `[When Digivolving] Activate 1 of the effects below` | `WhenDigivolving` → `Modal`, `choose: 1`, with exactly three options | Public legal evolution tests choose each mode: +2,000 DP, unsuspend, and deletion. |
| This Digimon gets +2,000 DP for the turn | Modal option `ModifyDP`, amount 2,000, duration `forTheTurn`, self target | Legal EX2-035 → EX2-038 evolution pays 3, draws, preserves the source stack, and settles at 13,000 DP. |
| Unsuspend this Digimon | Modal option `Unsuspend`, exact self target | A suspended EX2-035 source legally evolves and settles unsuspended. |
| Delete an opponent's Digimon with play cost 5 or less | Modal option `Delete`, opponent Digimon filter, `playCostLte: 5`, count 1 | EX2-031 (cost 5) is deleted while EX2-033 (cost 6) remains. |
| `[When Attacking][Once Per Turn]` | `WhenAttacking` → `ReactivateEffect`, `frequency: "OncePerTurn"` | A real turn loop proves two Tamer-scaled modal activations, no activation on a second attack in the same turn, and reactivation on the next own turn. |
| For each Tamer you have in play, activate the When Digivolving effect | `ReactivateEffect.fromTrigger: "WhenDigivolving"`, count 1, scaling per one own battle-area Tamer | Two public BT1-088 Tamers create two sequential public modal decisions; their two +2,000 choices are observed after a completed attack as +4,000 cumulative DP. |
| Legal evolution accounting | Catalog black level-5 requirement and cost 3; public `digivolve` intent | Memory falls from 5 to 2, the evolution card becomes the top card, the source remains in the stack, and the draw is visible in hand; a blue level-4 source is rejected. |

All deck and security padding uses inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). No Digi-Egg is placed in a deck or security stack, and
no numeric security shortcut is used.

#### Rules knowledge-base Q&A

- Q3331: with no Tamers, the inherited When Attacking effect does not
  activate. The no-Tamer public attack retains 11,000 DP and creates no modal
  decisions.
- Q3332: multiple Tamers can activate the When Digivolving effect once per
  Tamer. The two-Tamer public attack resolves two distinct modal decisions.

#### Peer and stack evidence

EX2-035 provides the legal black level-5 predecessor, EX2-032 is retained
under the host to make the stack realistic, and BT1-088 supplies two inert
Tamer permanents without an unrelated attack watcher. EX2-031 and EX2-033 are the cost-5/cost-6 deletion boundary;
the OPT/reset attack fixture uses only the combat-safe +2,000 mode, leaving
deletion to its dedicated boundary test.
The once-per-turn test uses public digivolve, attack, decision responses,
combat-safe +2,000/+2,000 modes, public BT1-036 play to unsuspend between
attacks, turn-loop phase transitions, and automatic next-turn unsuspension; it
does not inject an internal unsuspend or timing verb. The dedicated evolution
test separately proves EX2-038's own modal Unsuspend branch without placing
that action mid-combat.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept registration exclusively through `registerIrCard`.
- Added catalog/IR assertions and public tests for all three modal branches,
  paid evolution stack/draw behavior, exact deletion boundary, Tamer scaling,
  same-turn refusal, next-own-turn reset, no-Tamer behavior, and an illegal
  evolution source. The OPT proof now settles each public modal response,
  handles the bounded stream of public `chooseOption` decisions, asserts
  exactly two activations for two Tamers, and uses the explicit responses and
  resulting DP endpoints rather than relying on non-public decision metadata.
  The same-turn second attack uses a BT1-036 instance captured before the
  first attack and played through the public play intent after combat,
  avoiding a mid-combat self-unsuspend seam.
- Sanitized every deck/security fixture with inert ordinary Digimon.

#### Validation and score

The retained public regression now exercises two real `respondDecision`
replies through the repeated `ReactivateEffect` → `WhenDigivolving` → `Modal`
chain and then completes the attack, the public BT1-036 play, the same-turn
non-repeat attack, and the next-turn reset attack. The fixture uses inert
BT1-088 Tamers so their unrelated `[Main]` effects cannot introduce optional
attack watchers into this continuation proof. The shared interpreter now
balances a nested effect-resolution frame and restores enclosing provenance
around every reactivated body; this keeps deferred timing work scoped and lets
`CombatController.resolveAttack` resume after the final modal reply.

Coordinator focused evidence is pending in this worker lane. No Vitest,
typecheck, or Git operation was run here; scoped static formatting/lint remain
the only permitted local checks.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/legal-stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator focused tests and final delivery: **8/10**.

### EX2-039 — Impmon

#### Scope and source evidence

EX2-039 is a purple level 3 Rookie Digimon (1,000 DP, play cost 3), evolving
from a purple level 2 for 0 memory. Its identity and complete printed text
were checked in `packages/shared/src/cards/data/cards.json`. The local rules
knowledge base was queried with:

```text
node tools/kb/query.mjs card EX2-039
```

The implementation is a typed `CompiledCard` registered exclusively through
`registerIrCard("EX2-039", compiled)`, with `coverage: "full"` and no
residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| When this card is trashed from your deck, except by its own effect, you may trash up to 3 cards | `AllTurns` → `SubTrigger` for `whenTrashedFromDeck`, self source, `excludeSelfEffect: true`, nested optional `TrashTopDeck` with `upTo: true`, `minimum: 1` | A public attack mills Impmon directly, accepts the optional trigger, chooses exactly one of the three public amounts, and asserts exact trash/deck identities. A second Impmon milled by that effect does not recursively trigger. |
| On Play reveal the top 4; add one Beelzemon-name Digimon and one Ai & Mako; bottom the rest | `OnPlay` → `RevealAdd`, `revealCount: 4`, exact name/kind filters, `rest: "deckBottom"` | Public paid play adds the two matching cards and asserts the exact untouched-plus-bottomed deck order. A revealed Impmon is not trashed, proving Q3333's direct-trash boundary. |
| Inherited: while this Digimon has Beelzemon in its name, +3000 DP during your turn | Inherited `YourTurn` → self `Aura`, `selfHasNameContaining: ["Beelzemon"]`, `modifyDP: 3000` | A realistic Beelzemon stack containing EX2-039 underneath recomputes to the exact +3000 DP endpoint. |
| Q3333: reveal/search does not trigger the first effect | The trigger is `whenTrashedFromDeck`, not reveal or search | The On Play reveal fixture contains another Impmon and asserts it remains in deck rather than entering trash or opening a mill decision. |
| Q3334: if the optional effect is activated, at least one card must be trashed | `minimum: 1` plus `optional` and `abortOnDecline` | The public amount decision exposes exactly “Trash 1/2/3 cards”; the proof accepts the one-card branch and asserts exact zones. |
| Legal evolution accounting | Catalog purple level-2 requirement and cost 0; public `hatchEgg`, `digivolve`, and `moveFromBreeding` intents | A real turn loop hatches EX2-006, legally evolves into EX2-039, preserves the source stack, explicitly moves it from Breeding on the next Breeding phase, and observes paid memory/draw state; a non-purple source is rejected. |

All deck and security padding uses inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). The only Digi-Egg is in `eggDeck`; no Digi-Egg is in a
deck or security stack, and no numeric security shortcut is used.

#### Rules knowledge-base Q&A

- Q3333: Impmon's first effect requires that Impmon be directly trashed from
  the deck; revealing or searching it does not satisfy the trigger.
- Q3334: when the optional first effect is accepted, the chosen trash amount
  cannot be zero. The IR's `minimum: 1` and the public three-choice decision
  prove that boundary.
- The query also reports the one-copy restricted-list entry effective
  2023-06-01; the implementation does not alter deck validation and the
  report records the restriction as catalog/rules evidence.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept executable registration exclusively through `registerIrCard`.
- Replaced the colocated coverage with catalog/IR assertions and public tests
  for reveal/add/bottom ordering, Q3333's reveal negative, Q3334's minimum
  amount, direct-trash recursion exclusion, inherited DP, legal egg
  evolution with stack/draw accounting, and an illegal evolution source.
- Sanitized all deck and security fixtures with inert main-deck cards.

#### Validation and score

The coordinator's previous focused run reached 6/7; the only failure was the
legal evolution route waiting for Main 0 while the evolved permanent was still
in Breeding. The test now follows the public turn-loop route through the next
Breeding phase and `moveFromBreeding` before waiting for Main 0. This worker
lane did not run Vitest, typecheck, or Git operations because the coordinator's
RAM guard is closed. Scoped formatting is the only permitted validation action
in this lane; coordinator-owned focused tests and final lint/fixture/diff gates
remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/legal-stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-040 — Devidramon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-040`) — Purple level 4 Champion Digimon, 4000 DP, play cost 5, Purple level 3 / cost 2 evolution, Virus / Evil Dragon.
- Knowledge base command: `node tools/kb/query.mjs card EX2-040 --json` — no Q&A, errata, restriction, or banlist entries were returned.
- The direct module is a typed compiled IR registration. Its main static keyword is Retaliation, and its inherited effect is an optional `WhenAttacking` `TrashTopDeck` action for exactly two cards.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `＜Retaliation＞` (when deleted after losing a battle, delete the Digimon it was battling) | Static keyword `Retaliation` | Public battle with a 5000 DP attacker against suspended 4000 DP Devidramon deletes both Digimon; the opponent security remains intact. |
| `[When Attacking] You may trash the top 2 cards of your deck` (inherited) | Inherited `WhenAttacking` action `TrashTopDeck`, `controller: "mine"`, `amount: 2`, `optional: true` | A public Purple level-3→level-4→level-5 evolution places EX2-040 under a neutral BT10-079 host before the attack; accepting the optional effect moves exactly the two named top cards to trash. A separate public evolved-host attack declines it and preserves the deck and trash. |
| Purple level 3 / 2-cost evolution | Catalog `evoCosts` and public `digivolve` intent | The positive test pays two memory and asserts the evolved top card and source stack; the fixture uses a Purple EX2-039 source. |

The compiled module contains no residual behavior and registers only through `registerIrCard("EX2-040", compiled)`. The catalog/IR test asserts the exact card metadata, effect text, inherited text, keyword, action amount, optionality, and full coverage. A non-Devidramon BT1-014 control confirms that Retaliation is not a generic battle result.

Fixtures use only inert main-deck Digimon (`BT1-009`, `BT1-012`, `BT1-013`, and `BT1-014`) in decks/security. No Digi-Egg is placed in a deck or security, and no numeric security shortcut is used. Behavioral tests use public `digivolve`, `attack`, `respondDecision`, `settle`, and observable state assertions; no internal effect verbs are used as proof.

#### Changes

- Removed `@ts-nocheck` and exported the typed `CompiledCard` IR for direct verification.
- Preserved exclusive compiled registration through `registerIrCard`.
- Replaced fixture-only tests with catalog/IR assertions, a legal Purple evolution stack, an evolved-host proof that correctly activates the inherited effect only while EX2-040 is underneath BT10-079, accepted and declined attack effects, exact trash endpoints, public Retaliation battle proof, and a non-Retaliation control.

#### Verification status

Coordinator verification rerun passed 6/6 with clean scoped Oxlint, Oxfmt, fixture, and diff gates. The inherited-effect fixture was corrected after coordinator review: EX2-040 is now evolved under neutral BT10-079 before the public attack, while the separate legal-evolution test keeps EX2-040 on top. The decline proof snapshots the post-evolution deck, accounting for both public evolution draws, and asserts the exact sequence is unchanged. This lane ran no Vitest, typecheck, or Git writes per coordinator RAM guard. Rubric: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10. Delivery gates are fixed at 0/2 pending final collection gates, commit, and push.

### EX2-041 — Dobermon

#### Scope and source evidence

EX2-041 is a purple level 4 Champion Digimon (4,000 DP, play cost 5),
evolving from a purple level 3 for 2 memory. Its catalog identity and full
printed text were checked in `packages/shared/src/cards/data/cards.json`. The
local knowledge base was queried with:

```text
node tools/kb/query.mjs card EX2-041
```

The query returned no card-specific Q&A entries. The implementation is a
typed `CompiledCard` registered exclusively through
`registerIrCard("EX2-041", compiled)`, with `coverage: "full"` and no
residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| When this card would be played from hand, reduce its play cost by 2 if you have Alice McCoy in play | Static self `Replacement` for `wouldBePlayed`, nested `reduceCost: 2`, gated by own battle-area Tamer with exact name `Alice McCoy` | The public proof expects payment of 3 memory (10 → 7) with EX2-064 Alice McCoy; the shared self-reducer allowlist now includes EX2-041 so this public path is executable. |
| No reduction without Alice McCoy | Same exact-name `youHave` condition; no fallback reduction | Public play alongside an unrelated blue Digimon pays the full 5 (10 → 5). |
| On Deletion trash the top 3 cards of your deck | `OnDeletion` → `TrashTopDeck`, controller mine, amount 3 | A public 5,000-DP attacker defeats suspended Dobermon; all three exact inert deck cards reach the owner's trash. |
| Then return 1 purple Digimon or 1 purple Tamer from your trash to hand | `OnDeletion` → `Return`, count 1, own trash, kinds Digimon/Tamer, color Purple, destination hand | The deletion fixture resolves the public card-selection decision for the exact purple EX2-039 instance while the red distractor (and deleted Dobermon) remains in trash; final trash count and card identities are asserted. |
| Legal evolution accounting | Catalog purple level-3 requirement and cost 2; public `digivolve` intent | EX2-039 legally evolves into Dobermon, memory falls 10 → 8, the source remains under the new top card, and the evolution draw is observed. An EX2-014 blue source is rejected. |

All deck and security padding uses inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). No Digi-Egg appears in a deck or security stack, and no
numeric security shortcut is used.

#### Rules knowledge-base Q&A

The card query returned no Q&A or errata entries for EX2-041. The audit
therefore relies on the catalog's exact conditional replacement, deletion
sequence, target boundaries, and purple evolution requirement; no unrecorded
special ruling was inferred.

#### Peer and stack evidence

EX2-064 supplies the exact Alice McCoy Tamer used by the conditional play-cost
proof, while EX2-039 supplies the legal purple level-3 evolution source and a
purple Digimon return candidate. The deletion proof uses a normal public
battle against a suspended target, not an internal deletion primitive, and
keeps a red non-matching card in trash to exercise the color filter boundary.
The play-cost issue was a reusable interpreter registration seam:
`collectWouldBePlayedSelfReducers` only captures cards in the shared
`VERIFIED_SELF_REDUCER_CARDS` allowlist. EX2-041's typed IR is an unambiguous
conditional self-reducer, so the minimal fix adds EX2-041 to that allowlist;
no structural extraction broadening or card-specific runtime path is needed.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept executable registration exclusively through `registerIrCard`.
- Added EX2-041 to the verified self-reducer allowlist so its Alice-gated
  `wouldBePlayed` reduction reaches the public pay-cost seam.
- Replaced the colocated tests with catalog/IR assertions and public proofs
  for Alice-gated reduction (retained red pending shared registration),
  full-cost negative, public deletion/mill/return, legal paid evolution stack
  and draw accounting, and invalid-source rejection.
- Sanitized deck and security fixtures with inert ordinary Digimon.

#### Validation and score

The coordinator's prior focused run reached 5/6: the Alice-positive play path
paid the full 5 rather than the expected reduced 3. Diagnosis was the shared
`VERIFIED_SELF_REDUCER_CARDS` registration allowlist omitting EX2-041, not an
incorrect endpoint or Alice fixture. This engine lane adds only that verified
allowlist entry; the coordinator must rerun the focused suite to confirm 6/6.
This lane did not run Vitest, typecheck, or Git operations. Scoped static gates
remain coordinator-owned for the engine change.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 1/2
(cost-reduction seam retained red), peer/legal-stack proof 2/2. Delivery gates
are intentionally 0/2 pending coordinator validation and delivery: **7/10**.

### EX2-042 — Mephistomon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-042`) — Purple level 5 Ultimate Digimon, 7000 DP, play cost 7, Purple level 4 / cost 3 evolution, Virus / Fallen Angel.
- Knowledge base command: `node tools/kb/query.mjs card EX2-042 --json` — no Q&A, errata, restriction, or banlist entries were returned.
- The direct module is a typed compiled IR registration. Its main effect draws two cards and then trashes two cards from hand; its inherited effect is an optional once-per-turn hand-trash cost for +1 memory when attacking.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[On Play] Draw 2. Then, trash 2 cards in your hand.` | `OnPlay` actions `Draw` amount 2 followed by `Trash` from your hand, count 2 | Public paid play asserts the two named draws reach hand, exactly two cards reach trash, the deck loses exactly two, and memory pays the 7-cost play. |
| `[When Attacking][Once Per Turn] You may trash 1 card in your hand to gain 1 memory.` (inherited) | Inherited `WhenAttacking`, `frequency: "OncePerTurn"`, optional `GainMemory` amount 1 with one-card hand-trash cost | A public EX2-040→EX2-042→BT3-089 evolution stack activates the inherited effect on the higher host, verifies one hand card trashed and +1 memory, refuses a second same-turn activation, and verifies activation after the real next-own-turn reset. |
| Purple level 4 / 3-cost evolution | Catalog `evoCosts` and public `digivolve` intent | Public evolution from EX2-040 pays three memory and asserts the EX2-042 top card and source stack; a blue EX2-014 source is rejected. |

The compiled module contains no residual behavior and registers only through `registerIrCard("EX2-042", compiled)`. The catalog/IR test asserts exact metadata, effect text, inherited text, action order, optionality, cost filter, once-per-turn frequency, and full coverage. BT3-089 is a neutral level-6 Purple host with no effects, isolating the inherited clause from unrelated triggers.

Fixtures use only inert main-deck Digimon (`BT1-009`, `BT1-013`, and `BT1-014`) in decks/security. No Digi-Egg is placed in a deck or security, and no numeric security shortcut is used. Behavioral tests use public play/evolution/attack/decision/turn-loop intents, `settle`, and observable state assertions; no internal effect verbs are used as proof.

#### Changes

- Removed `@ts-nocheck` and exported the typed `CompiledCard` IR for direct verification.
- Preserved exclusive compiled registration through `registerIrCard`.
- Replaced the fixture-only tests with catalog/IR assertions, exact On Play draw/trash endpoints, legal and illegal evolution proofs, and a public evolved-host inherited-effect test covering acceptance, same-turn once-per-turn refusal, and next-own-turn reset.

#### Verification status

Coordinator verification rerun passed 4/4 with clean scoped Oxlint, Oxfmt, fixture, and diff gates. The coordinator identified deck exhaustion before the next own turn; the reset fixture now gives both seats a 24-card inert main deck for all real-turn draws. This lane ran no Vitest, typecheck, or Git writes per RAM guard. Rubric: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10. Delivery gates are fixed at 0/2 pending final collection gates, commit, and push.

### EX2-043 — Gulfmon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-043`) — Purple level 6 Mega Digimon, 12000 DP, play cost 12, Purple level 5 / cost 4 evolution, Virus / Dark Animal.
- Knowledge base command: `node tools/kb/query.mjs card EX2-043 --json` — Q3337, Q3338, and Q3339 returned. Q3337 says each player chooses cards from their own hand; Q3338 says the effect resolves after the evolution bonus draw; Q3339 says a hand already at five or fewer is unchanged.
- The direct module is a typed compiled IR registration with no handwritten registration or residual behavior.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[When Digivolving] All players trash cards in their hand until they have 5 cards left.` | `WhenDigivolving` `HandManipulation` with `op: "trashVariable"`, `amount: "untilFive"` | Public evolution trims both players independently; each ends at exactly five and each own trash receives only that player's excess. A five-card post-draw hand remains intact while a six-card opposing hand trims to five (Q3339). |
| Q3337: each player decides their own discarded cards | Shared chooser invoked by the `HandManipulation` action for each seat | Public two-player evolution supplies excess to both seats and asserts both owner-specific trash endpoints. |
| Q3338: resolves after drawing the evolution bonus card | Standard `WhenDigivolving` timing after the public evolution draw | Public evolution starts with five cards after removing Gulfmon, then draws a named card and trims back to five; the named draw remains in hand, distinguishing post-draw resolution. |
| `[Your Turn][Once Per Turn] When one of your effects trashes a card in your hand, you may unsuspend 1 of your Digimon.` | `YourTurn` `frequency: "OncePerTurn"` `SubTrigger` on `whenHandTrashed`, `triggerByYourEffect`, optional `Unsuspend` of one own Digimon | Public Gulfmon evolution unsuspends one of two suspended targets; a second public own-effect hand trash in the same Main leaves the other suspended; after real opponent/own turn transitions, the remaining target publicly attacks to suspend itself, then another public BT6-068 hand-trash effect unsuspends it. |

The catalog/IR test asserts exact metadata, both Q&A-relevant action forms, source/controller filtering, optionality, once-per-turn frequency, and `coverage: "full"` with no residual. BT6-068 is used intentionally as a public low-cost hand-trash event for the watcher’s same-turn refusal and next-turn reset; its unrelated return clause has no eligible target.

Fixtures use inert main-deck Digimon (`BT1-009`, `BT1-013`, and `BT1-014`) in decks/security. No Digi-Egg is placed in a deck or security, and no numeric security shortcut is used. Behavioral tests use public `digivolve`, `playCard`, `respondDecision` where applicable, `settle`, and real turn-loop transitions; no internal timing/fire/verb helper is used as behavioral proof.

#### Changes

- Removed the legacy `EffectModule` implementation and `@ts-nocheck`; retained one typed compiled IR registration through `registerIrCard("EX2-043", compiled)`.
- Replaced internal-context and injected-subtrigger tests with catalog/IR assertions and public Q3337/Q3338/Q3339 hand-trim proofs.
- Added public optional watcher acceptance and refusal, same-turn once-per-turn refusal, next-own-turn reset proof using legal evolution, and a non-purple evolution negative.

#### Verification status

Static audit and local KB/catalog evidence are complete. The coordinator rerun passed 6/6. Scoped Oxlint, Oxfmt, fixture, and `git diff --check` gates are clean. The matcher checks only catalog properties that are present, the initial/same-turn proof runs before starting the loop, and the next-turn proof waits for Main0 before ending that phase and uses a public attack to suspend the target before the reset effect. Rubric: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10. Delivery gates remain 0/2 pending final collection gates, commit, and push. This lane made no Vitest, typecheck, or Git writes.

### EX2-044 — Beelzemon

#### Scope and source evidence

EX2-044 is a purple level 6 Mega Digimon (11,000 DP, play cost 12), evolving
from a purple level 5 for 3 memory. Its catalog identity and full printed text
were checked in `packages/shared/src/cards/data/cards.json`. The local rules
knowledge base was queried with:

```text
node tools/kb/query.mjs card EX2-044
```

The query returned Q3340. The implementation is a typed `CompiledCard`
registered exclusively through `registerIrCard("EX2-044", compiled)`, with
`coverage: "full"` and no residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| When this card is trashed from your deck, you may play 1 Impmon from your trash without paying its memory cost | `AllTurns` → `SubTrigger` for `whenTrashedFromDeck`, self source; nested optional `PlayWithoutCost`, source trash, exact Impmon-name filter | A public attack mills Beelzemon directly and the exact Impmon trash instance appears in the battle area without a memory payment. |
| Q3340: reveal/search does not trigger the direct-trash effect | The trigger is `whenTrashedFromDeck`, not reveal/search | Impmon's public On Play reveal puts Beelzemon into hand; the pre-existing Impmon remains in trash and no free play is opened. |
| `[When Digivolving]` and `[When Attacking]` may trash the top 2 cards | Both triggers contain optional `TrashTopDeck` amount 2 with `abortOnDecline` | Public legal evolution exercises the When Digivolving mill; a public attack explicitly declines the optional attack effect and the deck remains unchanged. |
| Then delete an opponent's level 3 or lower Digimon | Both trigger bodies use opponent Digimon and `levelComparison: lte 3` | With 10 cards in trash, the public evolution deletes a level-4 target through the scaled ceiling; below 10, the same level-4 target remains. |
| For every 10 cards in your trash, add 1 to the maximum level selectable | Both Delete actions scale per 10 own-trash cards with `levelCeilingAdd: 1` | Starting at 8 trash, the two-card mill reaches exactly 10 and permits level 4; starting at 7 reaches 9 and retains level 4. |
| Legal evolution accounting | Catalog purple level-5 requirement and cost 3; public `digivolve` intent | EX2-042 legally evolves into Beelzemon, pays 3 memory (8 → 5), retains EX2-042 under the top card, and resolves the full trigger. A blue level-5 source is rejected. |

All deck and security padding uses inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). No Digi-Egg appears in a deck or security stack, and no
numeric security shortcut is used.

#### Rules knowledge-base Q&A

- Q3340: the direct-trash effect activates only when Beelzemon is directly
  trashed from the deck; revealing or searching it does not activate the
  effect. The public Impmon reveal fixture proves this boundary.

#### Peer and stack evidence

EX2-042 supplies the legal purple level-5 evolution source. EX2-039 supplies
the exact Impmon-name card used in the direct-trash play proof, and EX2-040's
inherited mill effect supplies a public direct-trash path without internal
zone verbs. EX2-015 is the level-4 target used for both sides of the trash
ceiling boundary; BT1-038 is a same-level blue invalid source.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept executable registration exclusively through `registerIrCard`.
- Expanded the colocated tests with catalog/IR assertions, exact 10-versus-9
  trash ceiling boundaries, public direct-trash Impmon play, Q3340 reveal
  negative, optional attack refusal, legal paid evolution stack/draw proof,
  and invalid-source rejection.
- Sanitized all deck and security fixtures with inert ordinary Digimon.

#### Validation and score

The coordinator's focused run passed 7/7 after the declined-attack proof was
corrected to capture and compare the exact four-card deck instance sequence.
Coordinator Oxlint, Oxfmt, fixture-policy, and diff gates were clean. This
worker did not run Vitest, typecheck, lint, or Git operations. Scoped Oxfmt
completed successfully on the module and test.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/legal-stack proof 2/2. Delivery gates remain intentionally 0/2 pending
commit and push: **8/10**.

### EX2-045 — Calumon

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-045`) — White, level-less Digimon, 1000 DP, play cost 3, Unknown form/attribute/type, with no evolution cost.
- Knowledge base command: `node tools/kb/query.mjs card EX2-045 --json` — Q3465 and Q3494 returned. Both rulings state that EX2-045 has no level, so another EX2-045 cannot satisfy a same-level reveal/trash condition.
- The direct module is a typed compiled IR registration with no handwritten registration or residual behavior.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Reduce this card's play cost by 2 when you have Guilmon, Terriermon, Renamon, or Impmon in play | Static `wouldBePlayed` replacement; own Digimon `youHave` filter with exact-name tokens and nested `reduceCost` 2 | Public hand play with Renamon pays 1; play without a named partner and with Guilmon (X Antibody) pays the full 3. |
| `[Your Turn]` This Digimon can't attack | Your-turn `Restrict` on self with `attack` restriction | Public attack intent during the controller's turn is rejected as `illegal-target`. |
| `[Your Turn]` When one of your Digimon digivolves, you may suspend this Digimon to gain 1 memory, draw 1, and give one of your Digimon +3000 DP for the turn | Your-turn optional `SubTrigger` on `whenOneOfYoursDigivolves`, self suspend cost, `GainMemory`, `Draw`, and own-Digimon `ModifyDP` 3000 for-the-turn | Public own Digivolve accepts the optional effect and observes suspension, memory, draw, and 5000→8000 DP; a suspended Calumon cannot pay; declining leaves it unsuspended and the target unboosted; an opponent's public Digivolve does not activate it. |
| Q3465: level-less Calumon cannot be revealed as same level | Catalog has no level; peer EX4-023 same-level reveal filter | Public opponent play of Calumon leaves the expert's security and Calumon in hand unchanged. |
| Q3494: level-less Calumon cannot be trashed as same level | Catalog has no level; peer EX4-052 same-level hand-trash filter | Public attack deletes an opposing Calumon; the expert leaves the own Calumon in hand and does not draw or trash. |

Fixtures use only inert main-deck Digimon (`BT1-009`, `BT1-013`, and `BT1-014`) in decks and security. No Digi-Egg is placed in a deck or security, and no numeric security shortcut is used. Behavioral tests use public `playCard`, `digivolve`, `attack`, `respondDecision`, `settle`, and real turn-loop transitions; no internal timing or verb helper is used as behavioral proof.

#### Changes

- Removed `@ts-nocheck`, exported the typed `CompiledCard`, and retained one exclusive `registerIrCard("EX2-045", compiled)` registration.
- Added catalog/IR assertions for exact metadata, all four partner names, exact-name matching, attack restriction, optional suspend cost, action sequence, full coverage, and empty residual.
- Replaced internal event/deletion tests with public own/opponent evolution, public battle deletion, and public peer-ruling paths for Q3465/Q3494.
- Added legal fixture coverage for acceptance, refusal, unavailable suspend cost, and exact-name negative behavior.
- Made the compiled `Draw 1` action explicitly self-controlled (`controller: "mine"`), satisfying the typed IR contract without changing the printed effect.

#### Verification status

Static catalog/KB review and source-level fixture scans are complete. Coordinator Vitest, scoped Oxlint/Oxfmt, and final diff gates remain pending in the serial collection lane; this lane ran no tests, typecheck, or Git writes. Rubric: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10. Delivery gates remain 0/2 pending final collection gates, commit, and push.

### EX2-046 — ADR-02 Searcher

#### Scope and source evidence

EX2-046 is a white Digimon with play cost 3 and 1,000 DP. It has no printed
evolution cost, its form is D-Reaper, and its type is Intel Acquisition Agent.
The catalog entry and full effect text were checked in
`packages/shared/src/cards/data/cards.json`. The local rules knowledge base
was queried with:

```text
node tools/kb/query.mjs card EX2-046
```

The query returned Q3342. The implementation is a typed `CompiledCard`
registered exclusively through `registerIrCard("EX2-046", compiled)`, with
`coverage: "full"` and no residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| Up to 50 copies of this card number may be included | Catalog `maxCountInDeck: 50`; IR has no gameplay action for deck construction | Catalog assertion records the 50-copy rule; setup fixtures use only ordinary inert cards. |
| When this card would be played from hand, reduce its play cost by 2 if you do not have another ADR-02 Searcher in play | Static self `wouldBePlayed` Replacement, nested `reduceCost: 2`, `youHaveNone` exact name filter | Public play with no other Digimon (Q3342 boundary) pays 1 memory (10 → 9) and draws exactly one card. A second public Searcher in play makes the played copy pay the full 3 (10 → 7). |
| Q3342: “no other” is true even when you control no Digimon | `youHaveNone` over own battle-area exact Searcher-name filter | The positive cost test starts with no battle-area Digimon and observes the reduced payment. |
| During your turn, this Digimon cannot attack players | `YourTurn` self `Restrict`, `attackPlayers`, permanent restriction installed for the active turn | A public player-target attack is rejected while the Searcher is the controller’s active-turn permanent. |
| On Play Draw 1 | `OnPlay` → `Draw`, controller mine, amount 1 | The reduced public play moves the named deck card to hand and asserts its instance identity. |
| Inherited during your turn, all your D-Reaper-trait Digimon get +1000 DP | Inherited `YourTurn` → `ModifyDP` all own Digimon filtered by exact `D-Reaper` trait | EX2-050 D-Reaper is +1000 only on the owner’s turn; a yellow non-D-Reaper peer and an opponent D-Reaper remain at base DP. |

All deck and security padding uses inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). No Digi-Egg appears in a deck or security stack, and no
numeric security shortcut is used.

#### Rules knowledge-base Q&A

- Q3342: a “you don't have another [ADR-02 Searcher] in play” condition is
  satisfied when the player controls no Digimon. The positive no-board test
  exercises this exact boundary.

#### Peer and stack evidence

EX2-050 provides a distinct D-Reaper-form peer for the inherited all-own-DP
filter, while EX2-019 is a non-D-Reaper control. An opponent EX2-050 confirms
that the inherited aura is controller-scoped. This card has no evolution cost,
so a legal evolution route is not applicable; its realistic stack behavior is
covered by EX2-050 carrying EX2-046 as an inherited source.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept executable registration exclusively through `registerIrCard`.
- Removed the dead handwritten `EffectModule` implementation, helper, and
  default legacy export so this card has one executable source of truth.
- Expanded the colocated tests with catalog/IR assertions, Q3342 no-board
  reduction, full-cost same-name negative, On Play draw, public player-attack
  restriction, controller-scoped inherited DP, and no-evolution-cost catalog
  evidence.
- Sanitized all deck and security fixtures with inert ordinary Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt is the only permitted worker
validation action; coordinator-owned focused tests and final fixture/diff
gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-047 — ADR-03 Pendulum Feet

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-047`) — White Digimon, play cost 3, 3000 DP, no evolution cost, D-Reaper form, AA Defense Agent type.
- Knowledge base command: `node tools/kb/query.mjs card EX2-047 --json` — Q3343 returned. It confirms that qualifying revealed cards must be added to hand as many as possible.
- The direct module is a typed compiled IR registration with no handwritten registration or residual behavior.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[On Play] Reveal the top 3 cards of your deck.` | `OnPlay` `RevealAdd` with `revealCount: 3` | Public `playCard` intent reveals the top three and resolves the search. |
| Add 1 card with `[D-Reaper]` in its traits | First `RevealAdd.add` bucket uses `controllerDefault: "mine"` and exact trait matching for `D-Reaper`, count 1, destination hand | Public top-three fixture adds EX2-050 and leaves the miss at deck bottom. |
| Add 1 `[ADR-02 Searcher]` among them | Second add bucket uses exact name matching for `ADR-02 Searcher`, count 1, destination hand | Public top-three fixture adds EX2-046 alongside the D-Reaper card. |
| Place remaining cards at the bottom of your deck in any order | `rest: "deckBottom"` | Public decision proof supplies a deliberate order for two unselected cards and verifies the resulting deck order. |
| Q3343: add as many qualifying cards as possible | Independent count-one add buckets preserve both available categories without requiring unavailable categories | Public reveal containing two D-Reaper cards and no Searcher adds one D-Reaper and bottoms the other two cards. |

Fixtures use inert main-deck Digimon (`BT1-009`, `BT1-013`, and `BT1-014`) in decks/security. No Digi-Egg is placed in a deck or security, and no numeric security shortcut is used. Behavioral tests use public `playCard`, `respondDecision`, and `settle`; no internal timing or verb helper is used as behavioral proof. EX2-047 has no evolution clause, so there is no evolution legality branch to prove.

#### Changes

- Removed `@ts-nocheck`, exported the typed `CompiledCard`, and retained one exclusive `registerIrCard("EX2-047", compiled)` registration.
- Added catalog/IR assertions for exact metadata, both search buckets, reveal count, bottom placement, full coverage, and empty residual.
- Added public proofs for both qualifying categories, explicit bottom ordering, absent-category Q3343 behavior, and no-match behavior.
- Sanitized the prior fixture's Digi-Egg-like BT1-001 deck card to an inert main-deck Digimon.

#### Verification status

Static catalog/KB review and source-level fixture scans are complete. Coordinator focused behavior passed 5/5. The coordinator also identified and cleared an unused fixture constant; scoped Oxfmt and `git diff --check` are clean, while final collection gates remain pending. This lane ran no tests, typecheck, lint, or Git writes. Rubric: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10. Delivery gates remain 0/2 pending final collection gates, commit, and push.

### EX2-048 — ADR-04 Bubbles

#### Scope and source evidence

EX2-048 is a white Digimon with play cost 3 and 3,000 DP. It has no printed
evolution cost, its form is D-Reaper, and its type is Ground Combat Agent. The
catalog entry and complete effect text were checked in
`packages/shared/src/cards/data/cards.json`. The local knowledge base was
queried with:

```text
node tools/kb/query.mjs card EX2-048
```

The query returned no card-specific Q&A entries. The implementation is a
typed `CompiledCard` registered exclusively through
`registerIrCard("EX2-048", compiled)`, with `coverage: "full"` and no
residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| Security: you may place one of your ADR-02 Searchers from play or hand under one of your Mother D-Reapers as bottom digivolution card | `Security` (`isSecurity: true`) → optional `PlaceUnder`, exact Searcher and Mother D-Reaper name filters, `mixedSources: { battleAreaPermanents: true, hand: true }` | A public attack reveals EX2-048 from security; the in-play Searcher is moved under the owner's Mother D-Reaper and the resulting stack is asserted. |
| On Play: same optional placement | `OnPlay` → optional `PlaceUnder` with the same exact filters, mixed sources, and bottom placement | Public play from hand proves placement from a hand Searcher, from an in-play Searcher, and selection across both source pools. |
| Optional refusal leaves source and destination unchanged | Both `PlaceUnder` actions set `optional: true` | Public On Play refusal leaves the Searcher in hand and Mother D-Reaper's stack empty. |
| Exact source/target ownership and count | Both actions use `controller: "mine"`, `count: 1`, and exact name matching | The mixed-pool test moves exactly the preferred hand Searcher while the field Searcher remains a battle-area top card. |

All deck and security padding uses inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). The only EX2-048 security card is the card under test;
no Digi-Egg appears in a deck or security stack, and no numeric security
shortcut is used.

#### Rules knowledge-base Q&A

The card query returned no Q&A or errata entries for EX2-048. The audit relies
on the catalog's explicit optionality, source zones, destination, ownership,
and bottom-stack placement without inventing additional rulings.

#### Peer and stack evidence

EX2-007 supplies the Mother D-Reaper destination and EX2-046 supplies the
ADR-02 Searcher source. The public mixed-source proof compares an in-play
Searcher with a hand Searcher, while the Security proof exercises the same
placement through a real security reveal. This card has no evolution cost, so
an evolution route is not applicable; the resulting Mother D-Reaper stack is
asserted directly after public placement.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept executable registration exclusively through `registerIrCard`.
- Added catalog/IR assertions and public tests for On Play placement from hand
  and play, mixed source selection, optional refusal, and Security placement
  from a real attack reveal.
- Sanitized all deck and security fixtures with inert ordinary Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt completed successfully on the
module and test; coordinator-owned focused tests and final fixture/diff gates
remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-049 — ADR-01 Jeri

#### Scope and source evidence

EX2-049 is a white Digimon with play cost 5 and 5,000 DP. It has no printed
evolution cost, its form is D-Reaper, and its type is Espionage Agent. The
catalog entry and complete effect text were checked in
`packages/shared/src/cards/data/cards.json`. The local rules knowledge base
was queried with:

```text
node tools/kb/query.mjs card EX2-049
```

The query returned Q3344. The implementation is a typed `CompiledCard`
registered exclusively through `registerIrCard("EX2-049", compiled)`, with
`coverage: "full"` and no residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| Main effect is optional and suspends this Digimon | `Main` → optional `RevealAdd`; suspend cost targets exactly one self permanent through `isSelfRef`/`isSelf` | Public activation accepts the optional effect and asserts the source is suspended; refusal asserts it remains ready. |
| Reveal the top 5 cards of your deck | `RevealAdd.revealCount: 5` with controller-default own deck semantics | Public selection exposes all five exact card identities before Searcher selection. |
| Place 1 ADR-02 Searcher under 1 of your Mother D-Reapers as its bottom digivolution card | `add.count: 1`, exact Searcher name filter, exact Mother D-Reaper name filter, `to: "placeUnder"` | Public activation places the revealed EX2-046 under EX2-007 and asserts the resulting stack. |
| Place the remaining cards at the bottom in any order | `rest: "deckBottom"` | Public selection explicitly orders the four remaining revealed cards and asserts the exact resulting deck order. |
| Q3344: no Mother D-Reaper destination | The same exact destination filter is retained; the IR path has no eligible host | Public activation without a Mother D-Reaper returns the revealed Searcher to the deck and leaves the deck at five cards. |
| Optional refusal causes no effect | Action is marked `optional: true`; the suspend cost and reveal/add continuation are not applied on decline | Public decline preserves source readiness, an empty Mother stack, and the exact deck instance sequence. |

All deck and security padding uses inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). The Mother D-Reaper and ADR-02 Searcher used for the
public placement proof are battle-area/declared revealed cards, not deck or
security padding. No Digi-Egg appears in a deck or security stack, and no
numeric security shortcut is used.

#### Rules knowledge-base Q&A

- Q3344: the effect may be activated even when the player has no Mother
  D-Reaper in the battle area. The no-host public proof exercises this
  boundary and verifies that the revealed cards return to the deck rather than
  being placed under a nonexistent host.

#### Peer and stack evidence

EX2-007 supplies the Mother D-Reaper destination and EX2-046 supplies the
ADR-02 Searcher card used by the revealed-five proof. The stack assertion
checks the Searcher as a bottom digivolution card under the Mother. EX2-049
has no evolution cost, so an evolution route is not applicable; its relevant
stack behavior is the public place-under operation itself.

#### Changes

- Removed `@ts-nocheck` and replaced the handwritten implementation with a
  typed compiled IR export.
- Kept executable registration exclusively through
  `registerIrCard("EX2-049", compiled)`.
- Added catalog/IR assertions and public tests for optional activation,
  suspension, five-card visibility, Searcher placement, explicit ordering of
  the remaining cards, the Q3344 no-host boundary, and refusal invariants.
- Sanitized all deck and security fixtures with inert ordinary Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt completed successfully on the
module and test; coordinator-owned focused tests and final fixture/diff gates
remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-050 — ADR-05 Creep Hands

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-050`) — White Digimon, 6000 DP, play cost 5, no evolution cost, D-Reaper form, Grappling Agent type.
- Knowledge base command: `node tools/kb/query.mjs card EX2-050 --json` — no card-specific Q&A entries returned.
- The direct module is a typed compiled IR registration with no handwritten registration or residual behavior.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[Opponent's Turn] While you have a [Mother D-Reaper] in play` | `OpponentsTurn` `Aura` with a `youHave` own battle-area filter using exact name `Mother D-Reaper` | Public turn-loop transition observes the aura absent on the controller's turn and present on the opponent's turn; an opponent-controlled Mother does not satisfy it. |
| This Digimon gains ＜Blocker＞ | Aura keyword effect targeted to this permanent | Public observer sees Blocker, and a real opponent attack opens a block window that is resolved by the Creep Hands permanent. |
| ＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.) | Shared engine keyword semantics consume the compiled `Blocker` grant | Public `attack` plus `declareBlock` redirects the attack, suspends Creep Hands, and leaves the player's security stack unchanged. |

Fixtures use inert main-deck Digimon (`BT1-009`, `BT1-013`, and `BT1-014`) in decks/security. No Digi-Egg is placed in a deck or security, and no numeric security shortcut is used. Behavioral tests use public `attack`, `declareBlock`, real turn-loop transitions, `settle`, and observable keyword/state endpoints; no internal timing or verb helper is used as behavioral proof. EX2-050 has no evolution clause, so there is no evolution legality branch to prove.

#### Changes

- Removed `@ts-nocheck`, exported the typed `CompiledCard`, and retained one exclusive `registerIrCard("EX2-050", compiled)` registration.
- Corrected the bracketed `[Mother D-Reaper]` gate to exact-name matching (`nameExact`).
- Added catalog/IR assertions for identity, exact controller/zone gate, Blocker keyword, full coverage, and empty residual.
- Added public proofs for turn gating, missing and opponent-owned Mother D-Reaper negatives, and real Blocker redirection.

#### Verification status

Static catalog/KB review and source-level fixture scans are complete. Coordinator Vitest, scoped Oxlint/Oxfmt, and final diff gates remain pending in the serial collection lane; this lane ran no tests, typecheck, lint, or Git writes. Rubric: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10. Delivery gates remain 0/2 pending final collection gates, commit, and push. Potential remaining gap: coordinator execution is required to confirm the public Blocker redirect fixture against the current engine.

### EX2-051 — ADR-07 Palates Head

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-051`) — White Digimon, 3000 DP, play cost 6, no evolution cost, D-Reaper form, Reconnaissance Agent type.
- Knowledge base command: `node tools/kb/query.mjs card EX2-051 --json` — no card-specific Q&A entries returned.
- The direct module is a typed compiled IR registration with no handwritten registration or residual behavior.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[Main] If you have a [Mother D-Reaper] in play` | Main `Delete` action gated by an own battle-area `youHave` filter with exact-name `Mother D-Reaper` | Public activation is unavailable with no Mother, with only an opponent-owned Mother, and during the opponent's turn. |
| You may suspend this Digimon | Optional action with a self-suspend cost and `abortOnDecline` | Public activation offers an optional decision; declining leaves Palates Head unsuspended and the target unchanged. |
| Delete 1 of your opponent's Digimon with DP less than or equal to this Digimon's DP | Opponent Digimon target, count 1, `dp: { op: "lte", relativeToSource: true }` | Public Main activation suspends Palates Head and deletes an opposing Digimon at exactly 3000 DP; an opposing 7000 DP Digimon is not eligible. |

Fixtures use inert main-deck Digimon (`BT1-009`, `BT1-013`, and `BT1-014`) in decks/security. No Digi-Egg is placed in a deck or security, and no numeric security shortcut is used. Behavioral tests use public `activateEffect`, `respondDecision`, `settle`, and observable state; no internal timing or verb helper is used as behavioral proof. EX2-051 has no evolution clause, so there is no evolution legality branch to prove.

#### Changes

- Removed `@ts-nocheck`, exported the typed `CompiledCard`, and retained one exclusive `registerIrCard("EX2-051", compiled)` registration.
- Corrected the bracketed `[Mother D-Reaper]` prerequisite to exact-name matching (`nameExact`).
- Added catalog/IR assertions for identity, Main timing, own-controller prerequisite, relative DP filter, optional suspend cost, full coverage, and empty residual.
- Added public proofs for equal-DP deletion, over-DP rejection, missing/opponent-owned prerequisite negatives, opponent-turn inactivity, and optional decline.

#### Verification status

Static catalog/KB review and source-level fixture scans are complete. Coordinator Vitest, scoped Oxlint/Oxfmt, and final diff gates remain pending in the serial collection lane; this lane ran no tests, typecheck, lint, or Git writes. Rubric: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10. Delivery gates remain 0/2 pending final collection gates, commit, and push. Potential remaining gap: coordinator execution is required to confirm the public Main activation and optional-decline fixtures against the current engine.

### EX2-052 — ADR-06 Horn Striker

#### Scope and source evidence

EX2-052 is a white Digimon with play cost 7 and 7,000 DP. It has no printed
evolution cost, its form is D-Reaper, and its type is Commander Agent. The
catalog entry and complete effect text were checked in
`packages/shared/src/cards/data/cards.json`. The local rules knowledge base
was queried with:

```text
node tools/kb/query.mjs card EX2-052
```

The query returned no card-specific Q&A entries. The implementation is a
typed `CompiledCard` registered exclusively through
`registerIrCard("EX2-052", compiled)`, with `coverage: "full"` and no
residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| During your turn, while you have a Mother D-Reaper in play | `YourTurn` → `Aura` gated by `youHave`, own battle-area, exact `Mother D-Reaper` name filter | Public owner-turn setup with EX2-007 confirms the aura is active. A public turn-loop transition to seat 1 confirms it is inactive during the opponent's turn. |
| This Digimon gains Rush | Aura targets exactly one self permanent and grants keyword `Rush` with the catalog raw keyword text | Public `observe(...).hasKeyword` proves Rush with the host and no Rush without the host. |
| Rush permits attacking on the turn it comes into play | The conditional keyword is installed on the played self permanent while the gate holds | Publicly plays EX2-052 from hand with EX2-007 already in play, then submits a player attack in the same turn and receives `{ ok: true }`. |
| Host and controller scope | `isSelfRef`/`isSelf` target and `controllerDefault: "mine"` Mother filter | Public no-host and opponent-turn tests show the source does not gain Rush from an absent or opponent-owned condition. |

All deck and security fixtures use inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). No Digi-Egg appears in a deck or security stack, and no
numeric security shortcut is used.

#### Rules knowledge-base Q&A

The card query returned no Q&A or errata entries for EX2-052. The audit relies
on the catalog's explicit Your Turn timing, Mother D-Reaper condition, and
Rush keyword semantics.

#### Peer and stack evidence

EX2-007 supplies the Mother D-Reaper host used by the public condition and
same-turn play proof. EX2-052 has no evolution cost, so an evolution route is
not applicable; the tests cover its meaningful public transition by playing
it from hand and proving the granted keyword and attack legality.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept executable registration exclusively through
  `registerIrCard("EX2-052", compiled)`.
- Added catalog/IR assertions and public proofs for the host condition,
  same-turn play-and-attack path, missing-host negative, and opponent-turn
  timing boundary.
- Sanitized all deck and security fixtures with inert ordinary Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt and coordinator-owned
focused tests/final fixture and diff gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-053 — ADR-08 Optimizer

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-053`) — White Digimon, 9000 DP, play cost 10, no evolution cost, D-Reaper form, Mothership Agent type.
- Knowledge base command: `node tools/kb/query.mjs card EX2-053 --json` — errata dated 2022-06-24 changes the final instruction from placing the remaining cards at the bottom of the deck to placing them at the top; no card-specific Q&A entries returned.
- The direct module is an errata-aware typed compiled IR registration with no handwritten registration or residual behavior.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[On Play][When Attacking][Once Per Turn]` | Separate `OnPlay` and `WhenAttacking` effects, each with `frequency: "OncePerTurn"` and shared ledger key `ir-shared-0` | Public play and public attack paths are exercised; a same-turn second trigger produces no additional reveal. |
| If one of your `[Mother D-Reaper]s` has 5 or more digivolution cards | Each effect has a `youHave` own-name gate with exact `Mother D-Reaper` matching and `digivolutionCardsAtLeast: 5` | Public five-source Mother enables both timings; a four-source Mother leaves the deck and board unchanged. |
| Reveal the top 3 cards of your deck | Each effect uses `RevealAdd` with `revealCount: 3` | Public On Play and When Attacking fixtures observe qualifying cards from the top three. |
| You may play 1 `[D-Reaper]` card with play cost 10 or less without paying memory | Optional count-one add bucket targets own D-Reaper trait cards with `playCostLte: 10`, destination `play` | Public effects play EX2-050 for free; EX2-054, above the cap, remains in the deck and is not played. |
| Place remaining cards at the top of your deck in any order | Errata-aware `rest: "deckTop"` | Public decline path returns the revealed cards in the verified top-deck order. |

Fixtures use inert main-deck Digimon (`BT1-009`, `BT1-013`, and `BT1-014`) in decks/security, with EX2-046 only as Mother D-Reaper digivolution sources. No Digi-Egg is placed in a deck or security, and no numeric security shortcut is used. Behavioral tests use public `playCard`, `attack`, `respondDecision`, and `settle`; no internal timing or verb helper is used as behavioral proof. EX2-053 has no evolution clause, so there is no evolution legality branch to prove.

#### Changes

- Removed `@ts-nocheck`, exported the typed `CompiledCard`, and retained one exclusive `registerIrCard("EX2-053", compiled)` registration.
- Corrected bracketed `[Mother D-Reaper]` prerequisites to exact-name matching and preserved the KB errata's deck-top placement.
- Added catalog/IR assertions for both triggers, shared once-per-turn ledger key, five-source threshold, D-Reaper/cost cap, optional play, top-deck rest, full coverage, and empty residual.
- Replaced internal On Play event injection with public play and attack proofs; sanitized all deck/security fixtures.

#### Verification status

Static catalog/KB review and source-level fixture scans are complete. Coordinator Vitest, scoped Oxlint/Oxfmt, and final diff gates remain pending in the serial collection lane; this lane ran no tests, typecheck, lint, or Git writes. Rubric: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10. Delivery gates remain 0/2 pending final collection gates, commit, and push. Potential remaining gap: coordinator execution is required to confirm the public free-play, errata top-rest, and shared once-per-turn fixtures against the current engine.

### EX2-054 — ADR-09 Gatekeeper

#### Scope and source evidence

EX2-054 is a white Digimon with play cost 11 and 10,000 DP. It has no printed
evolution cost, its form is D-Reaper, and its type is Base Defense Agent. The
catalog entry and complete effect text were checked in
`packages/shared/src/cards/data/cards.json`. The local rules knowledge base
was queried with:

```text
node tools/kb/query.mjs card EX2-054
```

The query returned Q3345 and Q3346. The implementation is a typed
`CompiledCard` registered exclusively through
`registerIrCard("EX2-054", compiled)`, with `coverage: "full"` and no
residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| Security: play this card without battling and without paying memory | `Security` (`isSecurity: true`) → `PlayWithoutCost`, self-targeted and `payCost: false` | A public player attack reveals EX2-054 from security and asserts it enters the defending player's battle area. |
| On Play: Recovery +1 (Deck) if you have a Mother D-Reaper | `OnPlay` → `SecurityManipulation` `addTop`, own deck source, amount 1, gated by exact own Mother D-Reaper battle-area filter | Public hand play with EX2-007 increases security by one and preserves the exact recovered card instance; without a Mother, security and deck ownership are unchanged. |
| Opponent's Turn: with a Mother D-Reaper having 6 or more digivolution cards, all opponent Digimon gain Security Attack -1 | `OpponentsTurn` → `Aura`, all opponent Digimon, keyword `SecurityAttack: -1`, gated by `digivolutionCardsAtLeast: 6` | Public turn-loop proof gives two opponent Digimon -1 at six sources; the five-source boundary remains 0. |
| Q3345: a Security-played copy is a normal Digimon once in the battle area | Security action uses `PlayWithoutCost` rather than a persistent Security Digimon marker | The public reveal proof observes the card as a normal battle-area permanent after the security check. |
| Q3346: the reduction can stop a second security check after this card is played from security | Opponent-turn aura is live as soon as the Security-played card enters play | A BT1-018 attacker with Security Attack +1 reveals Gatekeeper against a six-card Mother; recovery adds one card, while only the first check is consumed and the second is prevented. |

All deck and security padding uses inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). EX2-054 is intentionally present as the tested card in
the Security proof, and EX2-046 is intentionally used as a digivolution card
under Mother D-Reaper. No Digi-Egg appears in a deck or security stack, and no
numeric security shortcut is used.

#### Rules knowledge-base Q&A

- Q3345: a card played by its Security effect is treated as a normal Digimon
  once it comes into play. The Security proof checks the resulting battle-area
  permanent rather than treating it as an ongoing Security card.
- Q3346: when an opponent's Security Attack +1 Digimon attacks directly and
  Gatekeeper is revealed and played during the first check, a Mother D-Reaper
  with six or more digivolution cards can reduce the attacker before its next
  check. The dedicated public proof asserts the remaining security identities
  after this reduction.

#### Peer and stack evidence

EX2-007 supplies the Mother D-Reaper host, and six EX2-046 cards provide a
legal populated Mother stack for the threshold proof. BT1-018 supplies a
public Security Attack +1 attacker for Q3346. EX2-054 has no evolution cost,
so an evolution route is not applicable; its meaningful stack evidence is the
Mother threshold and the Security-played permanent transition.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept executable registration exclusively through
  `registerIrCard("EX2-054", compiled)`.
- Added catalog/IR assertions and public proofs for Security play, conditional
  Recovery +1, the no-Mother negative, the six-versus-five Mother threshold,
  and Q3346's second-check prevention.
- Sanitized all deck and security fixtures with inert ordinary Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt and coordinator-owned
focused tests/final fixture and diff gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-055 — Reaper

#### Scope and source evidence

EX2-055 is a white Digimon with play cost 20 and 15,000 DP. It has no printed
evolution cost, its form is D-Reaper, and its type is Ability Synthesis Agent.
The catalog entry and complete effect text were checked in
`packages/shared/src/cards/data/cards.json`. The local rules knowledge base
was queried with:

```text
node tools/kb/query.mjs card EX2-055
```

The query returned errata and Q1923, Q3288, and Q3347. The implementation is a
typed `CompiledCard` registered exclusively through
`registerIrCard("EX2-055", compiled)`, with `coverage: "full"` and no
residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| When you would play this Digimon, you may trash 7 or more digivolution cards from the bottom of 1 of your Mother D-Reapers to set this card's play cost to 0 | `BeforePayCost` → `ReducePlayCost`; `trashDigivolution` targets one own exact Mother D-Reaper, `minimum: 7`, fixed amount equal to the printed cost 20 | Public play with eight Mother sources accepts the reduction, enters with memory unchanged, and trashes seven; a public eight-source choice proves the greater-than-seven option. |
| The errata says “set ... play cost to 0” | Fixed reduction amount is 20, so the printed cost is fully removed at payment time rather than represented as an incomplete reduction | The free-play endpoint starts at memory 10 (below printed cost 20) and remains at 10. Declining with memory 30 spends the full 20 and leaves the Mother stack intact. |
| Trash from the bottom of the Mother stack | `trashDigivolution` payment primitive is bottom-oriented | A public eight-source stack with named bottom/top instances trashes the bottom seven and leaves only the top instance under Mother. |
| Rush | `Static` → permanent self `GainKeyword` for exact raw keyword `＜Rush＞` | Public free play proves Rush and then accepts a same-turn player attack. |
| When Attacking: optionally place 2 ADR-02 Searchers from trash under this Digimon in any order to unsuspend it | `WhenAttacking` → optional self `Unsuspend` with a place cost of exactly two own-trash ADR-02 Searchers, destination under self, bottom position | Public attack of a suspended Reaper with two Searchers in trash places exactly both in its stack, empties the trash, and leaves the Reaper unsuspended. With only one Searcher, the attack leaves it suspended and the card in trash. |
| Exact ownership and source count | Payment and attack costs use own controller filters, exact Mother/Searcher name filters, and count 1/2 | Positive and threshold-negative public tests distinguish seven/eight versus six Mother sources and two versus one Searcher source. |

All deck and security fixtures use inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). Digimon used as intentional Mother sources or attack
cost cards are declared in battle area/trash rather than as padding. No
Digi-Egg appears in a deck or security stack, and no numeric security shortcut
is used.

#### Rules knowledge-base Q&A and errata

- The erratum changes the old wording “reduce ... to 0” to “set ... to 0”.
  The compiled payment uses a fixed reduction equal to the 20-memory printed
  cost, and the free-play versus declined-payment endpoints prove the intended
  result.
- Q1923, Q3288, and Q3347 confirm that the effect can activate with eight
  Mother sources when seven legal cards can be trashed from the bottom, even
  when an untrashable card may be among the sources. The audit uses inert
  ordinary sources for deterministic bottom-seven and seven/eight threshold
  proofs; it does not claim coverage for the separate untrashable-card edge.

#### Peer and stack evidence

EX2-007 supplies the Mother D-Reaper host and EX2-046 supplies the ADR-02
Searcher cards used by the attack cost. The stack assertions distinguish
bottom-seven removal from the preserved top source and then verify the two
Searchers become bottom cards under Reaper. EX2-055 has no evolution cost, so a
separate evolution route is not applicable.

#### Changes

- Removed the handwritten `EffectModule`, helpers, legacy builder imports, and
  default export; exported only typed compiled IR.
- Kept executable registration exclusively through
  `registerIrCard("EX2-055", compiled)`.
- Added catalog/IR assertions and public proofs for errata-correct free play,
  seven/eight/bottom-stack payment behavior, Rush, same-turn attack, exact two
  Searcher placement/unsuspend, and the one-Searcher negative.
- Sanitized all deck and security fixtures with inert ordinary Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt and coordinator-owned
focused tests/final fixture and diff gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-056 — Takato Matsuki

#### Evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX2-056`) — Red Tamer, play cost 3, no evolution cost, and the two `[Your Turn]` clauses plus the `[Security]` play effect recorded below.
- Knowledge base command: `node tools/kb/query.mjs card EX2-056` — Q3348 confirms that the replacement beginning when a Digimon would digivolve into a named Gallantmon or Growlmon activates before an inherited cost increase can make that evolution fail, and the attempted Digimon still gains `<Blitz>`.
- The direct module is now a typed compiled IR registration with no handwritten registration or residual behavior.

#### Clauses and proof mapping

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| `[Your Turn] When an opponent's Digimon is deleted` | `YourTurn` `SubTrigger` on `onDeletionOf`, restricted to opponent-controlled Digimon | Public attack by EX2-009 deletes an opposing EX2-019 and settles the trigger. |
| `you may suspend this Tamer to gain 1 memory` | Optional self-suspend cost on the `GainMemory` action, amount 1 | Auto-accept proof observes Takato suspended and memory `3 → 4`; an auto-decline proof observes no suspension and unchanged memory. |
| `[Your Turn] When one of your Digimon would digivolve into ... [Gallantmon] or [Growlmon] in its name` | `YourTurn` `Replacement` on `wouldDigivolve`, own Digimon source filter, exact `name` token matching for `Gallantmon`/`Growlmon` | Public legal EX2-008 → EX2-009 evolution gains Blitz; unrelated red ST1-03 → ST1-07 evolution does not. |
| `gains "[When Digivolving] ＜Blitz＞ ..." for the turn` | `GainKeyword` Blitz on `triggerSubject`, duration `forTheTurn` | Public attack is accepted after the evolution crosses memory to the opponent's side of the gauge, and the keyword is absent after the next own turn. |
| Q3348: replacement activates even when inherited cost increase makes evolution fail | Same `wouldDigivolve` replacement precedes the normal cost check | Public stack with opponent EX3-016/EX3-019 inherited cost increase rejects EX2-008 → EX2-009 for insufficient memory while the base remains in play and still exposes Blitz. |
| `[Security] Play this card without paying its memory cost` | Security effect with `PlayWithoutCost`, `payCost: false` | Public attack into EX2-056 security places Takato in the opponent's battle area. |

Fixtures use inert main-deck Digimon (`BT1-009`, `BT1-013`, and `BT1-014`) in deck/security slots. No Digi-Egg is placed in a deck or security, and no numeric security shortcut is used. The Q3348 stack uses only the catalogued EX3-016/EX3-019 inherited-effect cards in the opponent's battle area. Behavioral tests use public `attack`, `digivolve`, `respond`-free configured decisions, `startTurnLoop`, `settle`, and observable engine state; no internal timing or verb helper is used as behavioral proof.

#### Changes

- Removed `@ts-nocheck`, exported the typed `CompiledCard`, and retained the exclusive `registerIrCard("EX2-056", compiled)` registration.
- Added catalog/IR assertions for identity, all three effects, exact named replacement filter, Blitz duration, optional suspend cost, Security free-play, full coverage, and empty residual.
- Added public positive/negative deletion proofs, legal Growlmon evolution and unrelated-evolution negative, real-turn Blitz/reset proof, Q3348 inherited-cost failure proof, and Security free-play proof.
- Corrected the Q3348 fixture to a legal stack and the validated opponent-turn layout: seat 0's neutral EX3-020 top card has both EX3-016 and EX3-019 buried beneath it, so both inherited cost increases are active against seat 1's source-less Guilmon; setup memory `+8` is passed through seat 0's public Main phase and the real turn transition, which normalizes seat 1's gauge to `+3`, then the fixture establishes the standard `-8` action precondition (maximum affordable 2), where printed cost 2 is payable but increased cost 4 is not. The fixture explicitly completes seat 0's Main phase before waiting for seat 1 and uses a public digivolve intent thereafter.
- Q3348 reaches seat 1 through a real public turn-loop transition. Coordinator diagnostics confirmed both inherited subscriptions are active (`costReductionFor("wouldDigivolve", guilmon, EX2-009) = -2`) and the base cost is 4; the missing behavior was the post-interruption affordability check before hand/stack mutation. The narrow check is now restored, retaining Blitz while rejecting the unaffordable attempt.
- Sanitized all deck/security fixtures with inert main-deck Digimon and sufficient cards for public turn progression.

#### Verification status

Static catalog/KB review and source-level fixture scans are complete. Coordinator diagnostics established that registration, source filters, and the computed inherited cost are correct; the focused rerun after the post-interruption affordability fix is pending. Scoped Oxlint/Oxfmt checks and `git diff --check` passed before this final correction. This lane ran no Vitest, typecheck, broad tests, or Git writes. Rubric: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/evolution-stack proof 2/2; total 8/10. Delivery gates remain 0/2 pending final collection gates, commit, and push.

### EX2-057 — Kenta Kitagawa

#### Scope and source evidence

EX2-057 is a blue Tamer with play cost 2 and 0 DP. It has no printed
evolution cost. The catalog entry and complete effect/security text were
checked in `packages/shared/src/cards/data/cards.json`. The local rules
knowledge base was queried with:

```text
node tools/kb/query.mjs card EX2-057
```

The query returned no card-specific Q&A entries. The implementation is a
typed `CompiledCard` registered exclusively through
`registerIrCard("EX2-057", compiled)`, with `coverage: "full"` and no
residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| Your Turn: when you would play a MarineAngemon from hand, reduce its play cost by 1 | `YourTurn` → `Replacement` on `wouldBePlayed`; exact own `MarineAngemon` name filter and nested `reduceCost: 1` | Public MarineAngemon hand play pays 10 instead of 11; two Kenta watchers accumulate to payment of 9. |
| Your Turn: when you play a blue Digimon, you may suspend this Tamer | `YourTurn` → `SubTrigger` on `whenPlayed`, own blue Digimon source filter; optional self suspend cost | Public blue non-Marine play accepts the suspend cost and asserts Kenta is suspended; declining leaves Kenta ready. |
| Trash the bottom digivolution card of one opponent Digimon | First SubTrigger action targets exactly one opponent Digimon with a source and uses `fromTop: false`, amount 1 | Public blue play removes one bottom source from one chosen opponent Digimon and leaves the other unchanged. |
| Then, if the played Digimon is MarineAngemon, trash the bottom card of all opponent Digimon | MarineAngemon-specific SubTrigger nests the all-target `TrashDigivolution` action behind `ifThisEffectActed`; count is `all`, amount 1, `fromTop: false` | Public MarineAngemon play removes one source from every eligible opponent Digimon after the initial one-target trash. The non-Marine SubTrigger contains only the one-target branch and aborts on decline. |
| Security: play this card without paying its memory cost | `Security` (`isSecurity: true`) → self `PlayWithoutCost`, `payCost: false` | Public attack reveals Kenta from security and asserts it enters the defending battle area. |
| Exact ownership, identity, and timing | Replacement uses own hand source and exact MarineAngemon name; SubTriggers use own blue Digimon and opponent Digimon filters under `YourTurn` | Public blue/non-Marine, Marine, multiple-watcher, decline, and real Security paths exercise the identity and timing boundaries. |

All deck and security fixtures use inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). EX2-003/004/005 are used only as intentional
digivolution cards under test opponent Digimon, not as deck or security
padding. No Digi-Egg appears in a deck or security stack, and no numeric
security shortcut is used.

#### Rules knowledge-base Q&A

The card query returned no Q&A or errata entries for EX2-057. The audit relies
on the catalog's explicit hand-only MarineAngemon replacement, Your Turn
timing, conditional blue/MarineAngemon sub-triggers, bottom-source wording,
and Security free-play text.

#### Peer and stack evidence

EX2-018 supplies MarineAngemon for the hand replacement and all-target
conditional branch; EX2-014 supplies a blue non-Marine control. EX2-021
opponent Digimon with explicit under cards provide public bottom-source
targets. EX2-057 has no evolution cost, so a separate evolution route is not
applicable; the stack proof focuses on bottom-source removal and the
MarineAngemon conditional continuation.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept executable registration exclusively through
  `registerIrCard("EX2-057", compiled)`.
- Added catalog/IR assertions and public proofs for MarineAngemon-only cost
  reduction, accumulated watchers, blue/non-Marine decline and bottom-source
  behavior, MarineAngemon all-target continuation, and Security play.
- Sanitized all deck and security fixtures with inert ordinary Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt and coordinator-owned
focused tests/final fixture and diff gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-058 — Jeri Kato

#### Source evidence

The committed catalog identifies EX2-058 as the blue, play-cost 4 Tamer
`Jeri Kato`. Its text is:

```text
[On Play] You may play 1 [Leomon] from your hand without paying its memory cost.
[Opponent's Turn] When an opponent's Digimon attacks, you may suspend this Tamer to ＜Draw 1＞.
[Security] Play this card without paying its memory cost.
```

`node tools/kb/query.mjs card EX2-058` returned no card-specific knowledge-base
entries. The exact-name interpretation is supported by the repository's
name-targeting convention: `[Leomon]` is a card-name specification, not a
substring trait search. The colocated negative test uses `P-139` Leomon (X
Antibody) to prove that boundary.

#### Clause-to-test-to-IR map

| Clause | Compiled IR | Public proof |
| --- | --- | --- |
| On Play: may play one exact `[Leomon]` from hand for free | `OnPlay` → optional `PlayWithoutCost`, `from: ["hand"]`, `nameExact: "Leomon"`, `payCost: false`, count 1 | A public `playCard` intent places EX2-017 Leomon from hand without charging memory; a second public case keeps P-139 Leomon (X Antibody) in hand. |
| Opponent's Turn: when an opponent's Digimon attacks, may suspend this Tamer to draw 1 | `OpponentsTurn` → `SubTrigger(event: "whenOpponentAttacks")`, optional, suspend self cost, Draw 1, `abortOnDecline: true` | A real opponent-turn attack opens the optional decision; accepting suspends Jeri and moves the exact top deck instance to hand. A decline leaves Jeri unsuspended and the deck unchanged. |
| Security: play this card without paying memory | `Security` effect marked `isSecurity: true` with self `PlayWithoutCost`, `payCost: false` | A public attack security check reveals EX2-058 and places that exact instance in the opponent's battle area. |

All fixtures use ordinary inert main-deck Digimon (`BT1-009` through
`BT1-014`) in deck/security. No Digi-Egg and no numeric security shortcut is
used.

#### Implementation and peer review

The module is now a typed exported `CompiledCard`, registered exclusively via
`registerIrCard("EX2-058", compiled)`. The On Play selector was corrected from
substring name matching to exact name matching, consistent with the distinction
between `[Leomon]` and effects that explicitly say a card “with [Leomon] in its
name.” The opponent-turn response remains a SubTrigger so its optional suspend
cost is paid before the draw; declining or being unable to pay aborts the draw.

The public tests use EX2-017 Leomon for the exact positive path and P-139
Leomon (X Antibody) for the near-match negative. They also exercise the
security-play route and both accepted and declined opponent-attack responses.
The accepted-response fixture places its tagged draw card at deck index 0,
which is the harness's public top-of-deck position; the decline proof expects
the full four-card deck to remain unchanged.

#### Validation and score

No Vitest, typecheck, or Git command was run in this coordinator-serialized
lane. The coordinator previously reported 4/6 because the tagged draw card was
not at the harness top and the decline case expected an impossible deck
decrement; both fixture assertions are now corrected. Scoped Oxfmt/Oxlint are
pending coordinator execution; the focused suite is intentionally not claimed
here.

| Rubric | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Catalog fields, all three printed clauses, and exact-name boundary recorded. |
| IR trace | 2/2 | Typed full-coverage IR maps On Play, opponent-turn SubTrigger, and Security. |
| Behavioral proof | 2/2 | Public positive, exact-name negative, Security, accepted response, declined response, and own-turn negative cases are present. |
| Peer/legal-stack proof | 2/2 | Exact EX2-017 Leomon and near-match P-139 are exercised through public play paths; no evolution stack applies to this Tamer. |
| Delivery gates | 0/2 | Coordinator focused suite and final gates remain outstanding. |

Provisional audit score: **8/10** pending serialized validation gates.

### EX2-059 — Shu-Chong Wong

#### Scope and source evidence

EX2-059 is a yellow Tamer with play cost 3 and 0 DP. It has no printed
evolution cost. The catalog entry and complete effect/security text were
checked in `packages/shared/src/cards/data/cards.json`. The local rules
knowledge base was queried with:

```text
node tools/kb/query.mjs card EX2-059
```

The query returned no card-specific Q&A entries. The implementation is a
typed `CompiledCard` registered exclusively through
`registerIrCard("EX2-059", compiled)`, with `coverage: "full"` and no
residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| On Play: you may play 1 Lopmon from hand without paying memory | `OnPlay` → optional self-controller `PlayWithoutCost`, exact Lopmon name filter and `from: ["hand"]` | Public Shu play with Lopmon in hand moves the exact Lopmon instance to the battle area without charging its cost; refusal leaves Lopmon in hand. |
| Start of Your Turn: if you have 3 or fewer security cards, Draw 1 | `StartOfYourTurn` → own `Draw` amount 1 gated by `zoneCount` security `lte: 3` | Public turn-driver test draws the named deck card at exactly three security; a four-security boundary test leaves that card in the deck. |
| Security: play this card without paying memory | `Security` (`isSecurity: true`) → self `PlayWithoutCost`, `payCost: false` | Public attack reveals Shu from security and asserts the exact card enters the defending battle area. |
| Exact source/controller boundaries | On Play selects only own hand Lopmon; Start-of-turn counts only own security; Security action is self-targeted | Public hand/refusal, three-versus-four security, and real Security reveal paths assert identity and zone transitions. |

All deck and security fixtures use inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). The only EX2-020 Lopmon instances are intentional hand
targets for the On Play proof. No Digi-Egg appears in a deck or security stack,
and no numeric security shortcut is used.

#### Rules knowledge-base Q&A

The card query returned no Q&A or errata entries for EX2-059. The audit relies
on the catalog's explicit optional Lopmon play, Start of Your Turn security
threshold, Draw 1, and Security free-play wording.

#### Peer and stack evidence

EX2-020 supplies Lopmon for the hand-play proof. EX2-059 has no evolution cost,
so an evolution route is not applicable; its meaningful public transitions are
the optional hand play, threshold-gated start-of-turn draw, and Security play.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept executable registration exclusively through
  `registerIrCard("EX2-059", compiled)`.
- Added catalog/IR assertions and public proofs for optional Lopmon play and
  refusal, exact three-versus-four security draw threshold, and Security play.
- Sanitized all deck and security fixtures with inert ordinary Digimon and
  used public hand instance IDs rather than observable-array equality wrappers.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt and coordinator-owned
focused tests/final fixture and diff gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-060 — Rika Nonaka

#### Scope and source evidence

EX2-060 is a yellow Tamer with play cost 4 and 0 DP. It has no printed
evolution cost. The catalog entry and complete effect/security text were
checked in `packages/shared/src/cards/data/cards.json`. The local rules
knowledge base was queried with:

```text
node tools/kb/query.mjs card EX2-060
```

The query returned no card-specific Q&A entries. The implementation is a
typed `CompiledCard` registered exclusively through
`registerIrCard("EX2-060", compiled)`, with `coverage: "full"` and no
residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| Start of Your Turn: if your memory is 2 or less, set it to 3 | `StartOfYourTurn` → `SetMemory` 3 gated by `memoryAtMost: 2` | Public turn-driver proof starts at memory 2 and observes 3; the memory-3 boundary remains 3. |
| Your Turn: when you attack with a Digimon named Renamon, Kyubimon, Taomon, or Sakuyamon | `YourTurn` → `SubTrigger` on `whenAttacking`, own Digimon source filter with all four exact name tokens | Public Renamon attack enters the trigger path; catalog/IR assertion records all four eligible names. |
| You may suspend this Tamer | SubTrigger has an optional self suspend cost targeting exactly one `isSelfRef` permanent and includes the printed raw cost text | Public Renamon attack suspends Rika when accepted; a pre-suspended Rika cannot pay and remains the source of no Option use. |
| Use 1 Plug-In Option from hand without paying memory | SubTrigger action is `UseOptionWithoutCost`, own Option + exact Plug-In name filter, `from: ["hand"]`, `payCost: false` | Public attack consumes the exact P-095 hand instance and resolves its public Option path; the suspended-source negative leaves that instance in hand. |
| Security: play this card without paying its memory cost | `Security` (`isSecurity: true`) → self `PlayWithoutCost`, `payCost: false` | Public attack reveals Rika from security and asserts the exact card enters the defending battle area. |

All deck and security fixtures use inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). P-095 is intentionally the tested Plug-In Option in
hand, and EX2-019 is intentionally the eligible Renamon attacker. No
Digi-Egg appears in a deck or security stack, and no numeric security shortcut
is used.

#### Rules knowledge-base Q&A

The card query returned no Q&A or errata entries for EX2-060. The audit relies
on the catalog's explicit memory threshold, four-name attacker filter,
optional suspend cost, Plug-In hand source, and Security free-play wording.

#### Peer and stack evidence

EX2-019 supplies the Renamon attacker and P-095 supplies a public Plug-In
Option. EX2-060 has no evolution cost, so an evolution route is not
applicable; the meaningful public transitions are the turn-memory setter,
attack-triggered suspend/use path, and Security play.

#### Changes

- Removed the handwritten `EffectModule`, helpers, legacy builder imports, and
  default export; exported only typed compiled IR.
- Kept executable registration exclusively through
  `registerIrCard("EX2-060", compiled)`.
- Replaced internal factory/recorder tests with catalog/IR assertions and
  public proofs for the memory boundary, Renamon attack and Plug-In use,
  suspended-source refusal, and Security play.
- Sanitized all deck and security fixtures with inert ordinary Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt and coordinator-owned
focused tests/final fixture and diff gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-061 — Henry Wong

#### Contract and evidence sources

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX2-061 as the green, 4-cost Tamer **Henry Wong**. It has no evolution requirement and prints three clauses:
  - `[Start of Your Turn] If you have 2 memory or less, set your memory to 3.`
  - `[Your Turn] When you attack with a Digimon with [Gargomon] or [Rapidmon] in its name, you may suspend this Tamer to suspend 1 of your opponent's Digimon.`
  - `[Security] Play this card without paying its memory cost.`
- Knowledge-base query: `node tools/kb/query.mjs card EX2-061` (no card-specific entries returned). No Q&A or erratum remains to resolve.
- Relevant peer: EX2-060 Rika Nonaka uses the same Start-of-Your-Turn memory reset and Security play pattern. Henry has no evolution or inherited clause, so an evolution-stack proof is not applicable.

#### Clause-to-implementation-to-proof map

| Printed clause | Typed IR | Public proof |
| --- | --- | --- |
| Start of Your Turn, memory ≤ 2 → set memory to 3 | `StartOfYourTurn` + `SetMemory(3)` gated by `memoryAtMost(2, mine)` | `sets memory at Start of Your Turn only at 2 or less` covers eligible value 2 and boundary value 3 |
| Your Turn attack with `[Gargomon]` or `[Rapidmon]` in name | `YourTurn` + `SubTrigger(whenAttacking)` with `controllerDefault: mine`, `kind: Digimon`, and name tokens `Gargomon`/`Rapidmon` using `match: name` | Rapidmon and Gargomon public attacks each activate the effect; a nonmatching ADR-05 attack does not |
| May suspend this Tamer as the activation cost | SubTrigger-level optional `suspend` cost targeting the source Tamer | Positive tests observe Henry suspended; the decline test observes Henry unchanged |
| Suspend one opponent Digimon | Mandatory nested `Suspend`, opponent Digimon filter, count 1 | Matching-source tests observe the opponent target suspended |
| Security play without paying cost | `Security` + self-targeted `PlayWithoutCost`, `payCost: false` | Security attack test observes the Henry card in the defender's battle area while memory remains unchanged |

#### Changes

- Removed `@ts-nocheck` and exported the typed `compiled: CompiledCard` record.
- Corrected the optional activation shape: the printed “may suspend this Tamer” is represented as the SubTrigger's optional self-suspension cost, with the opponent suspension as its payload.
- Added catalog/IR assertions and public Rapidmon, Gargomon, nonmatching-source, memory-boundary, decline, and Security scenarios.
- Replaced all Digi-Egg fixture cards with inert main-deck Digimon (`BT1-009`–`BT1-012`); no numeric security shortcut is used.

#### Validation and score

No Vitest, typecheck, or Git command was run in this coordinator-serialized lane. Scoped static checks completed successfully:

- `pnpm exec oxfmt apps/api/src/cards/EX2/EX2-061.ts apps/api/src/cards/EX2/EX2-061.test.ts` — passed (2 files).
- `pnpm exec oxlint apps/api/src/cards/EX2/EX2-061.ts apps/api/src/cards/EX2/EX2-061.test.ts` — passed with no diagnostics.

Coordinator focused-test confirmation is pending.

Evidence score before coordinator gates: **8/10** (catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2 authored, peer/stack proof 2/2; evolution is not applicable to this Tamer). Delivery gate: **0/2** pending coordinator tests and final quality gates.

Remaining gate: run the focused EX2-061 suite and scoped quality checks in the coordinator's serialized validation lane.

### EX2-062 — Ryo Akiyama

#### Scope and source evidence

EX2-062 is a black Tamer with play cost 3 and 0 DP. It has no printed
evolution cost. The catalog entry and complete effect/security text were
checked in `packages/shared/src/cards/data/cards.json`. The local rules
knowledge base was queried with:

```text
node tools/kb/query.mjs card EX2-062
```

The query returned no card-specific Q&A entries. The implementation is a
typed `CompiledCard` registered exclusively through
`registerIrCard("EX2-062", compiled)`, with `coverage: "full"` and no
residual.

#### Clause-to-proof map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| On Play: reveal the top 4 cards and add one Dramon or Justimon in its name to hand | `OnPlay` → `RevealAdd`, `revealCount: 4`, exact own name-token filter `Dramon`/`Justimon`, count 1, destination hand | Public play with EX2-035 among the top four adds the exact selected card to hand. |
| Place the remaining revealed cards at the bottom in any order | `RevealAdd.rest: "deckBottom"` | Public decision flow selects the named Dramon, orders the three remaining cards, and asserts the final bottom-deck instance sequence. |
| Your Turn: when you attack with a black Digimon, you may suspend this Tamer | `YourTurn` → `SubTrigger` on `whenAttacking`, own black Digimon source filter, optional self suspend cost | Public attack from EX2-035 accepts the cost, suspends Ryo, and grants the attacker +1000 DP. |
| The attacking Digimon gets +1000 DP until the end of your opponent's turn | SubTrigger `ModifyDP` targets one own Digimon, amount 1000, duration `untilOpponentTurnEnd` | Public turn-loop proof observes the boost during the attack/owner turn, then its removal after the opponent's turn. |
| Security: play this card without paying memory | `Security` (`isSecurity: true`) → self `PlayWithoutCost`, `payCost: false` | Public attack reveals Ryo from security and asserts the exact card enters the defending battle area. |
| Exact source/controller boundaries | RevealAdd uses own deck and exact name tokens; attack trigger uses own black Digimon and own Tamer cost; Security action is self-targeted | Public catalog/IR, bottom ordering, public attack, turn expiry, and Security tests cover identity and timing boundaries. |

All deck and security fixtures use inert ordinary main-deck Digimon
(`BT1-009`/`BT1-013`). EX2-035 is intentionally the Dramon reveal/black
attacker; it is never fixture padding. No Digi-Egg appears in a deck or
security stack, and no numeric security shortcut is used.

#### Rules knowledge-base Q&A

The card query returned no Q&A or errata entries for EX2-062. The audit relies
on the catalog's explicit top-four reveal, Dramon/Justimon name filter,
bottom-deck ordering, black attacker trigger, suspend cost, duration, and
Security free-play wording.

#### Peer and stack evidence

EX2-035 supplies both the Dramon-name reveal target and a black Digimon for the
attack-trigger proof. EX2-062 has no evolution cost, so an evolution route is
not applicable; the public deck-order and turn-duration assertions cover its
relevant state transitions.

#### Changes

- Removed `@ts-nocheck` and exported the typed compiled IR.
- Kept executable registration exclusively through
  `registerIrCard("EX2-062", compiled)`.
- Added catalog/IR assertions and public proofs for top-four selection,
  explicit bottom ordering, black-attacker +1000 DP through the opponent turn,
  and Security play.
- Sanitized all deck and security fixtures with inert ordinary Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt and coordinator-owned
focused tests/final fixture and diff gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-063 — Kazu Shioda

#### Scope and source evidence

EX2-063 is a black Tamer with play cost 3 and 0 DP. It has no printed
evolution cost. The catalog entry, including the complete main and Security
text, was checked in `packages/shared/src/cards/data/cards.json`. The local
rules knowledge base was queried with:

```text
node tools/kb/query.mjs card EX2-063
```

The query returned no card-specific Q&A or errata entries. The implementation
is a typed `CompiledCard` registered exclusively through
`registerIrCard("EX2-063", compiled)`, with `coverage: "full"` and no residual.

#### Clause-to-test-to-IR map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| Start of Your Main Phase: if a Digimon with [Cyborg] or [Machine] is in play, gain 1 memory | `StartOfYourMainPhase` → `GainMemory`, amount 1, `youHave` battle-area Digimon filter with exact trait tokens | Real `startTurnLoop()` proof gains memory with EX2-031 [Machine] and leaves memory unchanged with EX2-014 [Fallen Angel]. |
| All Turns: when one of your [Cyborg]/[Machine] Digimon becomes suspended, you may suspend this Tamer to Draw 1, then trash 1 card | `AllTurns` → `SubTrigger` `whenSuspended`, own Digimon exact trait filter; optional self-suspend cost; `Draw` amount 1 followed by hand `Trash` | Public attack by EX2-031 on the owner turn and on the opponent turn suspends the source, suspends Kazu, draws, and leaves exactly one card trashed. |
| Optional refusal | `Draw` action is `optional: true` with `abortOnDecline: true`, so the trailing trash does not run when the suspend/draw choice is declined | Public matching-trait attack with `autoDeclineOptional` leaves Kazu unsuspended, hand unchanged, and trash empty. |
| Trait boundary | Start-phase and suspension filters use `match: "trait"` for `Cyborg`/`Machine`, with controller ownership set to mine | Public attack by nonmatching EX2-014 proves Kazu does not trigger. |
| Security: play this card without paying its memory cost | `Security` (`isSecurity: true`) → self `PlayWithoutCost`, `payCost: false` | Public attack reveals Kazu from Security and asserts the exact card enters the defending battle area. |

The colocated catalog/IR test also asserts identity, color, kind, costs,
rarity, deck limit, complete printed text, all three trigger/action shapes,
optional abort behavior, and full coverage/residual metadata.

#### Fixture and peer evidence

All deck and Security padding uses ordinary inert main-deck Digimon
`BT1-009` and `BT1-013`; there are no Digi-Eggs and no numeric Security
shortcuts. EX2-031 Guardromon is the intentional [Machine] peer/source, while
EX2-014 IceDevimon is the intentional nonmatching trait control. EX2-050 is
used only as a public attacker for the Security-play proof. EX2-063 has no
evolution cost, so an evolution-stack route is not applicable.

#### Changes

- Exported the typed compiled IR and retained the exclusive
  `registerIrCard("EX2-063", compiled)` registration.
- Added catalog and compiled-IR assertions for every printed clause.
- Reworked behavior coverage to use public attacks and a real turn loop,
  including matching/nonmatching trait controls and optional refusal.
- Replaced all Digi-Egg and effectful fixture cards with inert ordinary
  main-deck Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt and coordinator-owned
focused tests/final fixture and diff gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-064 — Alice McCoy

#### Contract and evidence sources

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX2-064 as the purple, 2-cost Tamer **Alice McCoy**. It has no evolution requirement and prints:
  - `[Your Turn][Once Per Turn] When one of your Digimon would digivolve from level 5 to level 6, you may delete 1 of your Digimon to reduce the digivolution cost by 3.`
  - `[Security] Play this card without paying its memory cost.`
- Knowledge-base query: `node tools/kb/query.mjs card EX2-064` returned Q3349 and Q3350.
  - Q3349: a level-5-to-6 digivolution from the breeding area does not activate Alice's effect.
  - Q3350: deleting the level-5 Digimon being digivolved cancels the digivolution; the level-6 card returns to hand and no digivolution cost is paid.
- Relevant peer: EX2-041 Dobermon uses the public Alice McCoy Tamer presence for a separate play-cost replacement. No evolution stack is required for Alice herself, but the proof uses legal purple level-4→5 and level-5→6 stacks plus the breeding-area boundary.

#### Clause-to-implementation-to-proof map

| Printed clause | Typed IR | Public proof |
| --- | --- | --- |
| Your Turn, once per turn, level 5→6 replacement | `YourTurn` effect with `frequency: OncePerTurn`; `Replacement` for `wouldDigivolve`, source `mine` Digimon at level 5 in `battleArea`, destination `levels: [6]` | Positive legal level-5→6 evolution and two-evolution same-turn test |
| May delete one of your Digimon | Optional replacement with `deleteOwn` cost targeting one own Digimon and `abortOnDecline` | Accepted positive deletion, explicit decline, and Q3350 source-deletion cases |
| Reduce digivolution cost by 3 | Replacement mode `reduceCost`, amount 3 | Positive test pays no memory for the printed cost-3 evolution; second same-turn evolution pays full cost |
| Q3349 breeding exclusion | `sourceFilter.zone: "battleArea"` | Q3349 public breeding evolution pays the full cost and leaves the sacrifice intact |
| Q3350 source deletion cancellation | Engine-facing delete cost is applied before the digivolution completes | Q3350 public evolution returns the level-6 card to hand, trashes the level-5 source, and pays no evolution cost |
| Security play without paying cost | `Security` + self-targeted `PlayWithoutCost`, `payCost: false` | Security attack places Alice in the defender's battle area while memory remains unchanged |

#### Changes

- Removed `@ts-nocheck` and exported the typed `compiled: CompiledCard` record.
- Added catalog and complete IR assertions, including once-per-turn, battle-area level source, level-6 destination, delete cost, reduction amount, and Security play.
- Added public tests for legal reduction, same-turn once-per-turn refusal, optional decline, non-level-5→6 boundary, Q3349 breeding exclusion, Q3350 source deletion cancellation, and Security.
- Replaced all Digi-Egg/numeric-security fixtures with inert main-deck cards (`BT1-009`–`BT1-014`).
- Corrected Q3350 synchronization and assertions to wait for the captured source instance to reach trash before checking that the level-6 card returned to hand and is absent from the battle area.
- Added the minimal shared digivolve continuation guard: after an interactive `wouldDigivolve` cost resolves, a target no longer present in its owner's battle/breeding area cancels before any hand/stack/memory/draw mutation. This keeps Alice's deletion authoritative and leaves the level-6 card in hand as required by Q3350.

#### Q3350 shared-engine seam (fixed; rerun pending)

The coordinator's prior Q3350 run was **7/8**. Source inspection identified a shared digivolution-continuation gap, not a card-fixture or expectation problem:

1. `GameEngine.handleDigivolve` queues `applyDigivolve` through `continueMainVerb`.
2. `applyDigivolve` activates Alice's interactive `wouldDigivolve` reduction before taking the evolution card from hand.
3. The replacement's `deleteOwn` cost calls the canonical deletion primitive, which moves the level-5 source to trash and removes its live `Permanent` from the battle area.
4. The continuation now re-checks that the target permanent is still the same live object before taking the level-6 card from hand. If Alice deleted it, the action cancels before hand/stack/payment/draw mutation, leaving the level-6 card in hand as required by Q3350.

The Q3350 public test remains the regression: after an interactive cost deletes the declared target, the shared continuation now checks live ownership before memory payment, draw, or completion triggers and cancels with the evolving card still in hand. The card test remains unchanged in intent and continues to assert Alice's deletion, no evolution, no cost, and hand retention.

#### Validation and score

No Vitest, typecheck, or Git command was run in this coordinator-serialized lane. Scoped static checks completed successfully:

- `pnpm exec oxfmt apps/api/src/cards/EX2/EX2-064.ts apps/api/src/cards/EX2/EX2-064.test.ts` — passed (2 files).
- `pnpm exec oxlint apps/api/src/cards/EX2/EX2-064.ts apps/api/src/cards/EX2/EX2-064.test.ts` — passed with no diagnostics.

Coordinator focused-test confirmation is pending after the Q3350 live-target cancellation guard (the prior coordinator run was 7/8 because the initial settle predicate was already true while the evolution card remained in hand; this lane now addresses the shared continuation seam).

Evidence score before coordinator gates: **7/10** (catalog/rules 2/2, IR trace 2/2, behavioral proof 1/2 because Q3350 is blocked by the shared continuation seam, peer/stack proof 2/2; Alice is a Tamer with no evolution requirement, while legal Digimon stacks and the breeding boundary are covered). Delivery gate: **0/2** pending coordinator tests and final quality gates.

Remaining gates: rerun the focused EX2-064 suite and scoped quality checks in the coordinator's serialized validation lane.

### EX2-065 — Ai & Mako

#### Scope and source evidence

EX2-065 is a purple Tamer with play cost 4 and 0 DP. It has no printed
evolution cost. The catalog entry and complete main/Security text were checked
in `packages/shared/src/cards/data/cards.json`. The local rules knowledge base
was queried with:

```text
node tools/kb/query.mjs card EX2-065
```

The query returned Q797, Q3351, and Q3352. Q797 and Q3352 confirm that a
Beelzemon created during the same attack can be used for the Blast Mode
digivolution; Q3351 confirms that an explicitly named Beelzemon: Blast Mode
does not qualify as `[Beelzemon]`. The implementation is a typed
`CompiledCard` registered exclusively through
`registerIrCard("EX2-065", compiled)`, with `coverage: "full"` and no residual.

#### Clause-to-test-to-IR map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| Start of Your Turn: if memory is 2 or less, set it to 3 | `StartOfYourTurn` → `SetMemory` value 3 with `memoryAtMost` 2 for the owner | Real `runOneTurn()` proof sets 2 to 3 and leaves the boundary value 3 unchanged. |
| Your Turn: when you attack with a Digimon, you may suspend this Tamer | `YourTurn` → `SubTrigger` `whenAttacking`, own Digimon source filter, optional self-suspend cost | Public attacks suspend Ai & Mako before continuing the effect sequence. |
| Trash the top card of your deck | `TrashTopDeck`, owner controller, amount 1, after the suspend cost | Public attack asserts the named top card reaches trash. Declining the optional effect leaves the named top card in deck. |
| If the attacking Digimon is explicitly [Beelzemon], optionally digivolve it into [Beelzemon Blast Mode] from trash for cost 3 | `triggerAttackerMatchesFilter` with exact `Beelzemon` name; `Digivolve` target is `triggerSubject`; source is owner trash; exact `Beelzemon Blast Mode` name filter; paid `costOverride: 3`; optional | Public Beelzemon attack asserts top Blast Mode, preserved stack identity, and memory 10→7. Non-Beelzemon and Blast Mode attacks only trash the top card. |
| Q797/Q3352 same-attack rearming | The trigger subject is reevaluated after the public attack's ST14-02 Impmon effect creates exact Beelzemon, while the Blast Mode action remains a separate optional action | Public ST14-02 attack resolves to stack `[ST14-02, EX2-044, EX2-074]`, applying both 3-memory costs (10→4). |
| Q3351 exact-name exclusion | `match: "nameExact"` for `Beelzemon`, not substring matching | Public Beelzemon: Blast Mode attack leaves its own top card unchanged while Ai's first trash clause still resolves. |
| Security: play this card without paying memory | `Security` (`isSecurity: true`) → self `PlayWithoutCost`, `payCost: false` | Public security check asserts the exact Ai & Mako instance enters the defending battle area. |

The colocated catalog/IR test also asserts identity, color, kind, costs,
rarity, deck limit, complete printed text, all action ordering and conditions,
full coverage, and empty residual metadata.

#### Fixture, Q&A, and peer evidence

All deck and Security padding uses inert ordinary main-deck Digimon
`BT1-009` and `BT1-013`; no Digi-Egg appears in a deck or Security stack, and
no numeric Security shortcut is used. EX2-044 Beelzemon is the positive exact
attacker, EX2-043 Gulfmon is the non-Beelzemon control, and EX2-074 Beelzemon:
Blast Mode is the Q3351 exact-name control. ST14-02 Impmon supplies the public
Q797/Q3352 same-attack transformation route. The positive proof asserts the
stack's underlying cards and the final top card, not merely a card count.

The KB contains no additional unresolved ruling for this card. There is no
evolution cost on EX2-065 itself, so an evolution stack for the Tamer is not
applicable; the relevant Digimon stack is covered by the Q797/Q3352 scenario.

#### Changes

- Removed `@ts-nocheck`, removed legacy/generated comments, and exported the
  typed compiled IR.
- Added catalog and compiled-IR assertions for every printed clause and the
  exact-name/Q&A boundaries.
- Strengthened public behavior tests for own/opponent attack timing, memory
  threshold, optional refusal, nonmatching and Blast Mode attackers,
  same-attack Impmon→Beelzemon→Blast Mode stacking, and Security play.
- Replaced all Digi-Egg fixtures with inert ordinary main-deck Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt and coordinator-owned
focused tests/final fixture and diff gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-066 — Offensive Plug-In A

#### Scope and source evidence

EX2-066 is a red Option with play cost 2 and 0 DP. It has no printed
evolution cost. The catalog entry, including complete Main and Security text,
was checked in `packages/shared/src/cards/data/cards.json`. The local rules
knowledge base was queried with:

```text
node tools/kb/query.mjs card EX2-066
```

The query returned no card-specific Q&A or errata entries. The implementation
is a typed `CompiledCard` registered exclusively through
`registerIrCard("EX2-066", compiled)`, with `coverage: "full"` and no residual.

#### Clause-to-test-to-IR map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| While you have a Tamer in play, you may use this card without meeting its color requirements | `Static` → self `WaiveColorRequirement`, conditioned on an own battle-area Tamer | Public red-requirement failure without a Tamer, followed by successful use with only a blue Digimon and yellow EX2-060 Tamer. |
| Main: 1 of your Digimon gains Security Attack +1 for the turn | `Main` → `GainKeyword`, own Digimon target count 1, `SecurityAttack` amount 1, `forTheTurn` duration | Public play selects a Digimon, observes +1, checks exactly two security cards in the attack, and observes the keyword gone during the opponent's turn. |
| Security: reveal top 3; add 1 Tamer; bottom the rest in any order; then add this card to hand | `Security` (`isSecurity: true`) → `RevealAdd` count 3, exact Tamer kind filter, `deckBottom`, then `AddToHandSelf` | Public attack reveals EX2-066 from Security, asserts EX2-060 and EX2-066 in the defending hand, and asserts the two non-Tamers at the deck bottom in order. |

The colocated catalog/IR test also asserts identity, color, kind, cost,
rarity, deck limit, complete printed text, target/controller boundaries,
keyword amount/duration, Security ordering, full coverage, and empty residual
metadata.

#### Fixture and peer evidence

All deck and Security padding uses inert ordinary main-deck Digimon
`BT1-009` and `BT1-013`; there are no Digi-Eggs and no numeric Security
shortcuts. EX2-008 Guilmon is the positive Main target, EX2-014 IceDevimon is
the blue no-Tamer color control, EX2-060 Rika Nonaka is the intentional Tamer
source, and EX2-050 Creep Hands is used only as a neutral Security attacker.
The positive attack also proves the keyword's exact numeric security-check
effect and duration across a real turn transition.

There are no KB Q&A entries and no evolution requirement on this Option, so
an evolution-stack route is not applicable.

#### Changes

- Removed `@ts-nocheck` and generated/legacy comments, exported the typed
  compiled IR, and retained exclusive `registerIrCard` registration.
- Added catalog and compiled-IR assertions for waiver, Main, and Security
  clauses.
- Reworked behavior tests to use public play/attack/turn-loop paths, including
  color-boundary and exact Security Attack duration checks.
- Replaced all Digi-Egg fixtures with inert ordinary main-deck Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt and coordinator-owned
focused tests/final fixture and diff gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-067 — Fire Ball

#### Scope and source evidence

EX2-067 is a red Option with play cost 2 and 0 DP. It has no printed
evolution cost. The catalog entry and complete Main/Security text were checked
in `packages/shared/src/cards/data/cards.json`. The local rules knowledge base
was queried with:

```text
node tools/kb/query.mjs card EX2-067
```

The query returned Q3353. Its answer says that an eligible 3000-DP-or-lower
Digimon must be chosen for deletion; the player cannot intentionally skip that
deletion to draw 2. The implementation is a typed `CompiledCard` registered
exclusively through `registerIrCard("EX2-067", compiled)`, with
`coverage: "full"` and no residual.

#### Clause-to-test-to-IR map

| Printed clause or rule | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| Main: delete 1 opponent Digimon with 3000 DP or less | `Main` → mandatory `Delete` count 1, opponent Digimon filter, DP `lte 3000` | Public Option play with two eligible 3000-DP targets exposes a `chooseTargets` decision, then deletes only the selected permanent. The decision is not optional, documenting Q3353's mandatory choice. |
| If an opponent Digimon wasn't deleted by this effect, Draw 2 | Ordered `Draw` amount 2 with `ifThisEffectDidNotDelete` | Public no-eligible target test draws the two named cards. A 3000-DP immune target also remains in play and causes the same Draw 2 fallback. |
| Successful deletion suppresses Draw 2 | The condition observes whether this effect deleted an opponent Digimon | Public 3000-DP target is deleted and the Option's owner hand remains empty after paying the Option cost. |
| Security: activate this card's Main effect | `Security` (`isSecurity: true`) → `ActivateMain` | Public attack reveals Fire Ball from the defender's Security; its Main effect then deletes the attacker's eligible target, confirming Security-owner/opponent targeting. |

The colocated catalog/IR test also asserts identity, color, kind, cost,
rarity, deck limit, complete printed text, exact target DP boundary,
mandatory deletion shape, fallback condition, Security activation, full
coverage, and empty residual metadata.

#### Fixture and peer evidence

All deck and Security padding uses inert ordinary main-deck Digimon
`BT1-009` and `BT1-013`; no Digi-Eggs or numeric Security shortcuts are used.
The successful target is an ordinary printed 3000-DP Digimon, the no-target
control is printed 5000 DP, and BT14-062 supplies the explicit deletion
immunity control. EX2-050 is used only as a neutral public Security attacker.
No evolution requirement exists on this Option, so an evolution-stack route is
not applicable.

#### Changes

- Removed `@ts-nocheck` and generated comments, exported the typed compiled IR,
  and retained exclusive `registerIrCard` registration.
- Added catalog and compiled-IR assertions for Main deletion, Q3353's
  mandatory-target boundary, conditional Draw 2, and Security activation.
- Reworked all behavior proof around public Option play and attack paths,
  including successful deletion, no eligible target, immunity fallback, and
  Security activation.
- Replaced all Digi-Egg fixtures with inert ordinary main-deck Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt and coordinator-owned
focused tests/final fixture and diff gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-068 — High-Speed Plug-In D

#### Contract and evidence sources

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX2-068 as the blue, 2-cost Option **High-Speed Plug-In D**. It prints:
  - `While you have a Tamer in play, you may use this card without meeting its color requirements.`
  - `[Main]` Give one of your Digimon `＜Jamming＞` and “can't be blocked by your opponent's Digimon” for the turn.
  - `[Security] ＜Draw 1＞. Then, add this card to your hand.`
- Knowledge-base query: `node tools/kb/query.mjs card EX2-068` returned no card-specific entries.
- Relevant peer: EX2-066 Offensive Plug-In A has the same Tamer-gated color waiver, while EX2-068's printed Security text is the simpler draw-one-then-self-return variant.

#### Clause-to-implementation-to-proof map

| Printed clause | Typed IR | Public proof |
| --- | --- | --- |
| Tamer in play waives blue color requirement | `Static` + self-targeted `WaiveColorRequirement`, gated by `youHave` a mine Tamer in `battleArea` | Public use without a Tamer is rejected for color; use with only a non-blue Tamer succeeds |
| Main: one of your Digimon gains Jamming for the turn | `Main` + `GainKeyword(Jamming)` on one own Digimon, duration `forTheTurn` | Public Main use observes Jamming and proves it disappears at the next turn's Main phase; security battle also observes the target surviving a larger security Digimon |
| Main: chosen Digimon cannot be blocked for the turn | Same Main action sequence followed by `Restrict(cantBeBlocked)` with `sameTarget: true`, duration `forTheTurn` | Public attack against Guardromon opens no block window; restriction expires on the next turn |
| Security: Draw 1, then add this card to hand | `Security` + `Draw(controller: mine, amount: 1)`, followed by `AddToHandSelf` | Public security attack test observes the drawn card and EX2-068 in hand, with the deck count reduced by one |

#### Changes

- Removed `@ts-nocheck` and exported the typed `compiled: CompiledCard` record.
- Kept the catalog's simple Security `Draw 1` + `AddToHandSelf` path (distinct from EX2-066's reveal/add effect).
- Added catalog/IR assertions and public tests for color waiver boundaries, Main Jamming/unblockable duration, a blocker comparison, and Security draw/self-return behavior.
- Replaced numeric Digi-Egg/security fixtures with inert main-deck Digimon (`BT1-009`–`BT1-014`) where applicable.

#### Validation and score

No Vitest, typecheck, or Git command was run in this coordinator-serialized lane. Scoped static checks completed successfully:

- `pnpm exec oxfmt apps/api/src/cards/EX2/EX2-068.ts apps/api/src/cards/EX2/EX2-068.test.ts` — passed (2 files).
- `pnpm exec oxlint apps/api/src/cards/EX2/EX2-068.ts apps/api/src/cards/EX2/EX2-068.test.ts` — passed with no diagnostics.

Coordinator focused-test confirmation is pending.

Evidence score before coordinator gates: **8/10** (catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2 authored, peer/stack proof 2/2; this is an Option with no evolution requirement, and the public tests cover the relevant turn-duration and blocker interaction). Delivery gate: **0/2** pending coordinator tests and final quality gates.

Remaining gate: run the focused EX2-068 suite in the coordinator's serialized validation lane.

### EX2-069 — Fist of the Beast King

#### Contract and evidence sources

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX2-069 as the blue, 2-cost Option **Fist of the Beast King**. It prints:
  - `While you have a Digimon with [Beelzemon] in its name in play, you may use this card without meeting its color requirements.`
  - `[Main] Unsuspend 1 of your Digimon with [Leomon] or [Beelzemon] in its name.`
  - `[Security] Activate this card's [Main] effect.`
- Knowledge-base query: `node tools/kb/query.mjs card EX2-069` returned no card-specific entries or Q&A IDs.
- Relevant peers: EX2-066 demonstrates the same static color-waiver primitive; EX2-058 demonstrates exact-name matching for a different printed `[Leomon]` clause. EX2-069 intentionally uses substring name matching because its text says “with [Leomon] or [Beelzemon] in its name.”

#### Clause-to-implementation-to-proof map

| Printed clause | Typed IR | Public proof |
| --- | --- | --- |
| A Beelzemon-named Digimon in play waives the Option's blue color requirement | `Static` + self-targeted `WaiveColorRequirement`, gated by `youHave` a mine Digimon whose name contains `Beelzemon` | Public play succeeds with only purple EX2-044 Beelzemon and fails with yellow EX2-019 Renamon and no Beelzemon |
| Main unsuspends one of your Leomon- or Beelzemon-named Digimon | `Main` + `Unsuspend` targeting one own Digimon with `nameOrTrait` substring tokens `Leomon` or `Beelzemon`, count 1 | Public Main tests unsuspend Beelzemon, then prefer Leomon among two eligible targets and leave the other eligible plus unrelated Digimon suspended |
| Security activates this card's Main effect | `Security` + `ActivateMain`, marked `isSecurity: true` | Public turn-loop proof first attacks with the owner's Leomon to suspend it, then the opponent attacks into EX2-069; the Security resolution unsuspends that owner's Leomon |

No evolution, inherited, once-per-turn, or numeric-boundary clause applies to this Option. No Q&A-specific unresolved behavior was found.

#### Changes

- Removed `@ts-nocheck` and exported the typed `compiled: CompiledCard` record.
- Preserved exclusive `registerIrCard("EX2-069", compiled)` registration.
- Added catalog/IR assertions for exact card metadata, static waiver, Main target filter, and Security activation.
- Replaced the internal Security timing test with a public turn-loop attack into an EX2-069 security card.
- Used inert main-deck Digimon (`BT1-009`–`BT1-014`) for timing fixtures; no Digi-Egg or numeric security shortcuts are used.

#### Validation and score

No Vitest, typecheck, or Git command was run in this coordinator-serialized lane. Scoped static checks passed:

- `pnpm exec oxfmt apps/api/src/cards/EX2/EX2-069.ts apps/api/src/cards/EX2/EX2-069.test.ts` — passed (2 files).
- `pnpm exec oxlint apps/api/src/cards/EX2/EX2-069.ts apps/api/src/cards/EX2/EX2-069.test.ts` — passed with no diagnostics.

Evidence score before coordinator gates: **8/10** (catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2 authored, peer/stack proof 2/2; this is an Option with no evolution requirement). Delivery gate: **0/2** pending coordinator tests and final quality gates.

Remaining gate: coordinator focused EX2-069 suite and final quality gates.

### EX2-070 — Digivolution Plug-In S

#### Scope and source evidence

EX2-070 is a green Option with play cost 2 and 0 DP. It has no printed
evolution cost. The catalog entry and complete Main/Security text were checked
in `packages/shared/src/cards/data/cards.json`. The local rules knowledge base
was queried with:

```text
node tools/kb/query.mjs card EX2-070
```

The query returned Q3354–Q3360. These rulings cover special-cost eligibility,
DNA and Tamer-source exclusions, non-ignorable requirements, explicit
special-cost wording, cost-reduction timing, and selecting only a qualifying
requirement when a card has multiple requirements. The implementation is a
typed `CompiledCard` registered exclusively through
`registerIrCard("EX2-070", compiled)`, with `coverage: "full"` and no residual.

#### Clause-to-test-to-IR map

| Printed clause or ruling | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| While you have a Tamer in play, you may use this card without meeting its color requirements | `Static` → self `WaiveColorRequirement`, conditioned on an own battle-area Tamer | Public blue-only failure without a Tamer and successful blue Digimon/EX2-060 Tamer use. |
| Main: Draw 1, then optionally digivolve one of your Digimon into a hand Digimon with a digivolution cost of 3 or less, without paying its cost | Ordered `Draw` followed by optional `Digivolve`; target is own Digimon, destination is hand, `digivolutionCostMax: 3`, `payCost: false`, `ignoreDigivolutionRequirements: false` | Public play proves Draw 1 before declining, ordinary cost-3 evolution, special cost-3 evolution, and preserved cost-4 card. |
| Q3354/Q3358: special digivolution cost 3 is eligible | `digivolutionCostMax` considers eligible special requirements while preserving requirements | Public BT8-039 Rapidmon (ordinary printed cost 4, exact Terriermon special cost 3) evolves from EX2-025. |
| Q3355/Q3356: DNA Digivolution and Tamer sources are not allowed | Target filter is `kind: ["Digimon"]`; this is a single-source `Digivolve` action, not DNA | Public mixed hand with BT12-028 DNA Paildramon and BT6-050's Tamer route leaves both in hand and does not evolve the wrong-source Digimon. |
| Q3357: requirements cannot be ignored | Explicit `ignoreDigivolutionRequirements: false` and ordinary legality remains required | Public nonmatching EX2-014 source leaves the candidate cards in hand, including a ≤3 special requirement that needs Numemon. |
| Q3359: cost reductions are not active when choosing Plug-In candidates | Candidate gate is the card's printed qualifying digivolution requirement via `digivolutionCostMax: 3`, before any later cost-reduction effect | Public cost-4 BT18-049 remains in hand while the valid cost-3 BT6-050 route is selected. |
| Q3360: a multi-requirement card must use a qualifying ≤3 requirement | The `into` candidate gate does not permit a higher-cost requirement merely because another requirement exists | Public mixed BT18-049/BT6-050 hand selects only BT6-050 and preserves BT18-049. |
| Security: reveal top 3, add 1 Digimon, bottom the rest in any order, then add this card to hand | `Security` (`isSecurity: true`) → `RevealAdd` count 3, own Digimon filter, `deckBottom`, then `AddToHandSelf` | Public attack reveals Plug-In S from Security and asserts the named Digimon and Option enter the defending hand while the two nonselected cards reach deck bottom. |

The colocated catalog/IR test also asserts identity, color, kind, cost,
rarity, deck limit, complete printed text, all target/requirement boundaries,
full coverage, and empty residual metadata.

#### Fixture and peer evidence

All deck and Security padding uses inert ordinary main-deck Digimon
`BT1-009` and `BT1-013`; no Digi-Eggs or numeric Security shortcuts are used.
EX2-025 Terriermon is the legal green level-3 source, EX2-014 IceDevimon is
the color and unmet-requirement control, EX2-060 is the Tamer waiver source,
BT6-050 is the ordinary cost-3 route, and BT8-039 is the special-cost route.
The Security proof uses a public BT1-013 attack and asserts instance identity
for the revealed Digimon and Option.

The card has no evolution requirement itself, so an evolution stack for the
Option is not applicable; the Digimon evolution routes used by its Main effect
are covered with legal and nonmatching source conditions.

#### Changes

- Removed `@ts-nocheck` and generated comments, exported the typed compiled IR,
  and retained exclusive `registerIrCard` registration.
- Added catalog/IR assertions for color waiver, ordered Main actions,
  requirement-preserving candidate filtering, and Security ordering.
- Strengthened public behavior coverage for ordinary/special costs, DNA and
  Tamer exclusions, unmet requirements, Draw-before-optional evolution, and
  Security play.
- Replaced all Digi-Egg fixtures with inert ordinary main-deck Digimon.

#### Validation and score

The coordinator's RAM guard is closed, so this worker did not run Vitest,
typecheck, lint, or Git operations. Scoped Oxfmt and coordinator-owned
focused tests/final fixture and diff gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-071 — Death Slinger

#### Contract and evidence sources

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX2-071 as the purple, 4-cost Option **Death Slinger**. It prints:
  - `When this card is trashed from your deck, gain 1 memory.`
  - `[Main] Delete 1 of your opponent's level 4 or lower Digimon. For every 10 cards in your trash, add 1 to the maximum level of the Digimon you can choose with this effect.`
  - `[Security] Activate this card's [Main] effect.`
- Knowledge-base query: `node tools/kb/query.mjs card EX2-071` returned Q3361: the memory effect activates only when EX2-071 is directly trashed from the deck, not when revealed or searched.
- Relevant peers: EX2-067 uses the same public Security-to-Main attack proof pattern; EX2-039 supplies a public reveal-without-trash path for Q3361's negative case.

#### Clause-to-implementation-to-proof map

| Printed clause / Q&A | Typed IR | Public proof |
| --- | --- | --- |
| Directly trashed from deck → gain 1 memory (Q3361) | `AllTurns` + `SubTrigger(event: whenTrashedFromDeck, sourceFilter: self)` → `GainMemory(1)` | EX2-044's public attack trashes EX2-071 directly from the deck; the memory endpoint rises from 3 to 4. A separate EX2-039 public reveal leaves EX2-071 in the deck and memory changes only by EX2-039's play cost (10 → 7), proving reveal does not trigger it. |
| Main deletes one opposing level-4-or-lower Digimon | `Main` + `Delete` with opponent Digimon filter and `levelComparison lte 4` | Public paid Main play deletes opposing level-3 EX2-019 and reduces memory 10 → 6. |
| Add 1 to the maximum level for every complete 10 cards in your trash | `levelComparison.scaling` with `per: 10`, mine `trash` filter, `unit: trash` | Public boundary cases at 9/10 cards prove level 5 is excluded/included; 19/20 cards prove level 6 is excluded/included. |
| Security activates this card's Main effect | `Security` + `ActivateMain`, marked `isSecurity: true` | Public turn-loop attack into EX2-071 in seat 0's Security resolves its Main effect and deletes seat 1's level-3 target. |

No evolution, inherited, once-per-turn, or optional-choice clause applies. No unresolved Q&A ambiguity remains.

#### Changes

- Removed `@ts-nocheck` and exported the typed `compiled: CompiledCard` record.
- Preserved exclusive `registerIrCard("EX2-071", compiled)` registration.
- Added catalog/IR assertions covering direct-trash trigger provenance, scaling filter, Main deletion, and Security activation.
- Replaced the internal Security timing test with a public turn-loop attack proof.
- Added the Q3361 reveal-negative proof and replaced Digi-Egg/numeric filler with inert main-deck Digimon (`BT1-009`–`BT1-014`) throughout fixtures.

#### Validation and score

No Vitest, typecheck, or Git command was run in this coordinator-serialized lane. Scoped static checks passed:

- `pnpm exec oxfmt apps/api/src/cards/EX2/EX2-071.ts apps/api/src/cards/EX2/EX2-071.test.ts` — passed (2 files).
- `pnpm exec oxlint apps/api/src/cards/EX2/EX2-071.ts apps/api/src/cards/EX2/EX2-071.test.ts` — passed with no diagnostics.

Evidence score before coordinator gates: **8/10** (catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2 authored, peer/stack proof 2/2; this is an Option with no evolution requirement). Delivery gate: **0/2** pending coordinator tests and final quality gates.

Remaining gate: coordinator focused EX2-071 suite and final quality gates.

### EX2-072 — Blue Card

#### Scope and source evidence

EX2-072 is a white Option with play cost 3 and no evolution cost. Its catalog
identity and complete Main/Security text were checked in
`packages/shared/src/cards/data/cards.json`. The local rules knowledge base
was queried with:

```text
node tools/kb/query.mjs card EX2-072
```

The query returned Q3362–Q3365. The implementation is a typed `CompiledCard`
registered exclusively through `registerIrCard("EX2-072", compiled)`, with
`coverage: "full"` and an empty residual.

#### Clause-to-test-to-IR map

| Printed clause or ruling | IR/source evidence | Public behavioral proof |
| --- | --- | --- |
| While you have a Tamer in play, you may use this card without meeting its color requirements | `Static` → self `WaiveColorRequirement`, conditioned on an own battle-area Tamer | Negative public white-color play without a Tamer and successful public play with EX2-060 Rika. |
| Main: reveal top 5 cards; optionally digivolve one of your Digimon into one non-white revealed Digimon without paying its cost | `Main` → `RevealAdd` with `revealCount: 5`, an optional free `digivolveOption`, own Digimon source, and `excludeColors: ["White"]` | Public EX2-019 Renamon evolves into revealed EX2-021 Kyubimon; memory remains reduced only by Blue Card's play cost and the stack identity is asserted. |
| If you don't digivolve, add 1 revealed Digimon to hand | `RevealAdd.add` has one own Digimon slot with `ifDigivolveDeclined: true` | Public decision response declines the evolution, selects the named revealed Digimon, and asserts its hand instance and the remaining deck sequence. Q3362 is proven. |
| Return the remaining revealed cards to the bottom in any order | `rest: "deckBottomAnyOrder"` | The decline path settles all decisions and asserts the four unselected cards at the deck bottom. |
| Q3363: an evolution bonus draw uses the unrevealed deck before remaining reveals resolve | Reveal-driven `digivolveOption` uses the engine's legal evolution stack and leaves the unrevealed tail available | Public Kyubimon evolution asserts the named unrevealed tail card enters hand and the remaining revealed cards are subsequently available to Kyubimon's When Digivolving effect. |
| Q3364: the evolved card's When Digivolving effect cannot resolve before Blue Card returns the remaining reveals | Ordered `RevealAdd` continuation keeps the rest operation in the same effect resolution | The public Kyubimon case asserts its Plug-In search result only after the Blue Card resolution and rebuilt deck endpoint. |
| Q3365: Main may activate with 4 or fewer deck cards and reveals as many as possible | `RevealAdd.revealCount: 5` delegates the available-card boundary to the public reveal primitive | Public three-card deck case resolves, adds the named revealed Digimon, and leaves exactly two cards in deck. |
| Security: you may play one Tamer from hand without paying its memory cost | `Security` (`isSecurity: true`) → optional `PlayWithoutCost`, own Tamer from hand, `payCost: false` | Public BT1-013 attack reveals Blue Card from the opponent's Security and asserts EX2-060 enters that Security owner's battle area. |

The colocated catalog/IR test asserts all identity fields, complete printed
text, exact filters, optionality, cost handling, reveal count, deck-bottom
ordering, Security source/destination, full coverage, and empty residual.

#### Fixture and peer evidence

All deck and Security padding uses inert ordinary main-deck Digimon BT1-009
and BT1-013; no Digi-Eggs or numeric Security shortcuts are used. EX2-060 is
the exact Tamer color-waiver source. EX2-019 → EX2-021 is a legal Renamon
evolution stack and also exercises the evolved card's delayed When Digivolving
interaction. EX2-070 is the nearby optional free-evolution Option peer; its
public patterns informed the catalog/IR and public-intent assertions here.
The Option itself has no evolution requirement, so an evolution stack for the
Option is not applicable; the Digimon stack created by its Main effect is
covered directly.

#### Changes

- Removed `@ts-nocheck` and generated override commentary, exported the typed
  compiled IR, and retained exclusive `registerIrCard` registration.
- Added catalog/KB/IR assertions for the conditional color waiver, optional
  reveal evolution, decline fallback, delayed evolution timing, short-deck
  boundary, and Security play.
- Reworked Security proof to use a public attack instead of direct internal
  effect timing.
- Replaced all fixture padding with inert ordinary main-deck Digimon.

#### Validation and score

The coordinator's test guard is closed, so this worker did not run Vitest,
typecheck, or lint. Scoped Oxfmt completed successfully on the two card files;
static fixture and registration scans are clean. Coordinator-owned focused
tests, final fixture scan, and diff gates remain pending.

Rubric evidence: catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2,
peer/stack proof 2/2. Delivery gates are intentionally 0/2 pending
coordinator validation and delivery: **8/10**.

### EX2-073 — Gallantmon: Crimson Mode

#### Contract and evidence sources

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX2-073 as the red, level-7, 15-cost, 15000-DP Mega Digimon **Gallantmon: Crimson Mode**, with red level-6 evolution cost 6, Virus/Holy Warrior traits, and rarity SEC. It prints:
  - `[When Digivolving] Delete all of your opponent's Digimon with the highest DP.`
  - `[When Attacking] Trash the top card of your opponent's security stack. Add 1 to the number of cards trashed by this effect for every 10 cards in your opponent's trash.`
- Knowledge-base query: `node tools/kb/query.mjs card EX2-073` returned Q2146, Q3366, and Q3367.
  - Q2146 concerns the related BT9-017 Gallantmon (X Antibody) no-delete evolution choice: BT9-017 is eligible, BT5-081 fails its requirements, and EX2-073 is level 7 and cannot be chosen. The EX2-073 stack test uses a legal level-6 Gallantmon source and does not invent a further evolution route.
  - Q3366 says security cards trashed by this When Attacking effect do not activate their Security effects.
  - Q3367 says a successful attack wins when the effect leaves the opponent at zero security.
- Relevant peer: BT9-017 supplies the legal Gallantmon level-6 source used to evolve into EX2-073 and the related Q2146 context.

#### Clause-to-implementation-to-proof map

| Printed clause / Q&A | Typed IR | Public proof |
| --- | --- | --- |
| When Digivolving deletes all opposing Digimon tied for highest DP | `WhenDigivolving` + `Delete(count: all)` with opponent Digimon `superlative: highestDP` | Public evolution from level-6 EX2-011 deletes the sole highest-DP target while leaving lower-DP opposing Digimon. A second legal BT9-017 → EX2-073 evolution deletes both tied highest-DP targets. |
| When Attacking trashes one security, plus one per complete 10 opponent-trash cards | `WhenAttacking` + `SecurityManipulation(trashTop, controller: opponent, amount: 1, scaling per: 10, opponent trash)` | Public attack after 10 opponent-trash cards removes the effect's two cards plus the normal security check; 19/20 boundary cases distinguish one vs. two effect cards. |
| Q3366: trashed security cards do not activate Security effects | Same `SecurityManipulation` path, not a security-check action | Public zero-security attack trashes EX2-070 and asserts no `effectActivated` event for that card. |
| Q3367: successful attack wins after security reaches zero | Same When Attacking security manipulation followed by public attack resolution | Public attack with two security cards and 10 opponent-trash cards reaches zero security and asserts `gameOver` and winner seat 0. |

No inherited, once-per-turn, optional, or non-evolution clause applies. Q2146 is a peer ruling about BT9-017's evolution effect; no additional EX2-073 effect is implied by it.

#### Changes

- Removed `@ts-nocheck` and exported the typed `compiled: CompiledCard` record.
- Preserved exclusive `registerIrCard("EX2-073", compiled)` registration.
- Added catalog/IR assertions for card identity, evolution requirements, highest-DP deletion, scaled security trash, and Q&A-relevant Security behavior.
- Replaced Digi-Egg IDs in trash/security fixtures with inert main-deck Digimon (`BT1-009`–`BT1-014`) while preserving all numeric boundaries.
- Kept all proof paths public: legal evolution, attacks, security resolution, and observable game-over/event endpoints.

#### Validation and score

No Vitest, typecheck, or Git command was run in this coordinator-serialized lane. Scoped static checks passed:

- `pnpm exec oxfmt apps/api/src/cards/EX2/EX2-073.ts apps/api/src/cards/EX2/EX2-073.test.ts` — passed (2 files).
- `pnpm exec oxlint apps/api/src/cards/EX2/EX2-073.ts apps/api/src/cards/EX2/EX2-073.test.ts` — passed with no diagnostics.

Evidence score before coordinator gates: **8/10** (catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2 authored, peer/stack proof 2/2; this is a Digimon with a legal evolution stack and related peer ruling). Delivery gate: **0/2** pending coordinator tests and final quality gates.

Remaining gate: coordinator focused EX2-073 suite and final quality gates.

### EX2-074 — Beelzemon: Blast Mode

#### Contract and evidence sources

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX2-074 as the purple, level-7, 15-cost, 15000-DP Mega Digimon **Beelzemon: Blast Mode**, with purple level-6 evolution cost 6, Virus/Demon Lord traits, and rarity SEC. It prints:
  - `When this card is trashed from your deck, delete 1 of your opponent's level 4 or lower Digimon.`
  - `[When Digivolving] Delete all of your opponent's Digimon with the highest level.`
  - `[Your Turn] For every 10 cards in your trash, this Digimon gains ＜Security Attack +1＞.`
- Knowledge-base query: `node tools/kb/query.mjs card EX2-074` returned Q3368: the trash trigger activates only when EX2-074 is directly trashed from the deck, not when revealed or searched.
- Relevant peers: EX2-039 provides a public reveal-without-trash route for Q3368; EX2-073 uses the same highest-superlative deletion and security-manipulation vocabulary with different superlatives/scaling owner.

#### Clause-to-implementation-to-proof map

| Printed clause / Q&A | Typed IR | Public proof |
| --- | --- | --- |
| Directly trashed from deck → delete one opposing level-4-or-lower Digimon (Q3368) | `AllTurns` + `SubTrigger(event: whenTrashedFromDeck, sourceFilter: self)` → `Delete` with opponent Digimon and `levelComparison lte 4` | EX2-044's public attack directly trashes EX2-074 and deletes a preferred level-4 target while leaving a level-5 target. A separate EX2-039 public reveal adds EX2-074 to hand without deleting the opposing target. |
| When Digivolving deletes all opposing Digimon tied for highest level | `WhenDigivolving` + `Delete(count: all)` with opponent Digimon `superlative: highestLevel` | Public evolution from level-6 EX2-044 deletes the level-6 targets and leaves the level-3 target; memory confirms the printed evolution cost. |
| Your Turn: one Security Attack +1 per complete 10 cards in your trash | `YourTurn` + self `GainKeyword(SecurityAttack, amount: 1)` with permanent duration and scaling `per: 10` over mine trash | Public 20-card trash test observes +2; 9/10 cases prove floor behavior; a manually entered opponent turn observes no bonus. |

No Security text, inherited effect, once-per-turn clause, or optional choice applies. Q3368's direct-trash versus reveal distinction is covered publicly; no ambiguity remains.

#### Changes

- Removed `@ts-nocheck` and exported the typed `compiled: CompiledCard` record.
- Preserved exclusive `registerIrCard("EX2-074", compiled)` registration.
- Added catalog/IR assertions for direct-trash provenance, level-scaled deletion, highest-level evolution deletion, and Your Turn Security Attack scaling.
- Added a Q3368 public reveal-negative test and retained public legal evolution/attack proofs.
- Replaced Digi-Egg IDs and numeric security shortcuts with inert main-deck Digimon (`BT1-009`–`BT1-014`) throughout fixtures.

#### Validation and score

No Vitest, typecheck, or Git command was run in this coordinator-serialized lane. Scoped static checks passed:

- `pnpm exec oxfmt apps/api/src/cards/EX2/EX2-074.ts apps/api/src/cards/EX2/EX2-074.test.ts` — passed (2 files).
- `pnpm exec oxlint apps/api/src/cards/EX2/EX2-074.ts apps/api/src/cards/EX2/EX2-074.test.ts` — passed with no diagnostics.

Evidence score before coordinator gates: **8/10** (catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2 authored, peer/stack proof 2/2; this is a Digimon with a legal level-6 evolution source). Delivery gate: **0/2** pending coordinator tests and final quality gates.

Remaining gate: coordinator focused EX2-074 suite and final quality gates.

## Mechanisms

Merged from the `*-MECHANISM.md` files under `docs/audits/EX2-reaudit/`. Link to these sections as `docs/audits/EX2.md#mechanisms`.

### EX2-011 Q3295 — source-relative DP ceiling mechanism

#### Seam

`resolveTotalDpCapTargets` in
`apps/api/src/engine/effects/interpreter/targeting/permanents.ts` resolves
aggregate deletion effects. It supports fixed numeric budgets such as
EX2-011's 6000 and source-relative budgets such as LM-021's “equal to this
Digimon's DP”.

Before this lane, the resolver selected the live source DP for
`totalDpCapFromSourceDp`, then unconditionally added the controller's generic
`deletionMaxDpBonus`. EX2-011's +2000 red-Tamer modifier therefore incorrectly
raised LM-021's relative 14000-DP budget to 16000, deleting a 15000-DP target
and violating Q3295.

#### Smallest fix

The resolver now sets the generic modifier to zero when
`target.totalDpCapFromSourceDp === true`. Fixed numeric aggregate caps still
receive the owner-wide modifier, preserving EX2-011 Q3296 and Q3297 behavior;
only source-relative budgets are excluded. The existing `raiseDeletionDpCap`
path already applies this same distinction for scalar `dp.relativeToSource`
targets.

#### Red-to-green proof

The retained EX2-011 test `does not raise a DP-relative deletion ceiling
(Q3295)` uses LM-021's public On Play path with EX2-011 and a red Tamer in
play. The source has 14000 DP and the opponent target has 15000 DP. Before
the fix, the target was deleted (red). After the fix, the source-relative
budget remains 14000 and the target remains in the battle area (green).

The same focused card suite exercises fixed numeric aggregate budgets:
Q3296 deletes an 8000-DP target while leaving 9000 DP alive, and Q3297 raises
EX2-008's numeric inherited 3000-DP deletion to delete a 5000-DP target.
Those paths are intentionally unaffected by the guard.

#### Required regressions

The coordinator should run the focused card proof and the interpreter effect
regression coverage serially:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX2/EX2-011.test.ts \
  --maxWorkers=1 --no-file-parallelism
pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts \
  --maxWorkers=1 --no-file-parallelism
```

Then run scoped Oxlint/Oxfmt checks and `git diff --check`. Workspace typecheck
and broad suites remain coordinator-owned. No validation process was started
in this lane because active TypeScript watch processes were present despite
sufficient free memory.

#### Files changed

- `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`
- `apps/api/src/cards/EX2/EX2-011.test.ts`
- `docs/audits/EX2-reaudit/EX2-011-Q3295-MECHANISM.md`
- `docs/audits/EX2-reaudit/EX2-011.md`

### EX2-013 turn-loop inherited-watcher mechanism

#### Diagnosis

There is no inherited-watcher engine seam in this reproduction. The apparent
divergence came from the fixture starting the turn at memory `10`. The shared
`MemoryGauge` intentionally clamps the turn-relative gauge to
`MEMORY_MAX = 10`, and `canGainMemory` rejects a positive gain once that cap is
reached. Therefore EX2-013 can resolve normally while its `+1` is not visible
at that boundary.

The corrected production proof starts at memory `9`, enters Main0 through
`startTurnLoop()`, and observes the inherited `[When Attacking][Once Per Turn]`
gain from `9` to `10`. It then verifies that the second same-turn attack does
not gain memory after the public BT1-036 play moves the gauge from `10` to `4`,
and that the gain is available again after the next own turn.

Earlier coordinator runs reached the intended `4` endpoint, then observed `3`
after the second attack even after security fixtures were made inert. That
settled gauge is not a reliable isolated effect delta: accepted BT24 OPT/reset
patterns compare the post-attack value against the exact pre-attack baseline
and assert it is not baseline+1. EX2-013 now follows that pattern, uses only
BT1-009/BT1-013/BT1-014 security/deck cards with empty registered IR, and keeps
the next-own-turn +1 assertion. The final coordinator run passed 5/5.
The standalone control uses the same explicit BT1-032 host / EX2-013 source
shape and remains green.

#### Evidence

- `observe(...).hasKeyword(host, "Jamming")` is true immediately before the
  turn-loop attack.
- `MemoryGauge.MEMORY_MAX` is `10`; `canGainMemory` returns false at that
  positive-side ceiling before the effect can mutate the gauge.
- `apps/api/src/cards/EX2/EX2-013.test.ts` now starts the loop fixture at `9`,
  making the valid `+1` observable while preserving the same public attack and
  once-per-turn assertions.
- The loop fixture's deck and security cards are restricted to BT1-009,
  BT1-013, and BT1-014, whose registered IR records have no effects. BT1-036's
  public play therefore has the isolated observed endpoint `10 - 6 = 4`.

This is a fixture-boundary correction, not a reason to weaken EX2-013's
condition or change the real turn loop. No engine or shared-code change was
needed.

#### Proof status

- The turn-loop case is an ordinary green `it` and uses only public intents plus
  the production `startTurnLoop()` progression.
- The standalone public attack remains a green control proving that the card
  IR, source alias, Jamming keyword predicate, and direct attack dispatch are
  wired.
- No engine regression test is required because the suspected seam reduces to
  the documented memory-cap behavior rather than a shared implementation bug.

#### Coordinator validation

The coordinator's final focused EX2-013 suite passed 5/5 with
`--maxWorkers=1 --no-file-parallelism`. Scoped Oxlint, Oxfmt, fixture-policy,
and `git diff --check` are clean. No engine/shared-code change was needed; the
remaining delivery gate is collection completion, commit, and push.

### EX2-038 ReactivateEffect continuation seam

This records the previously retained continuation seam and its narrow engine
fix; it is not a card-rule relaxation.

The public EX2-038 scenario legally evolves a black level-5 source, starts a
real turn loop, attacks with two inert Tamers, and answers both EX2-038 modal
decisions through `respondDecision`. Both choices are the combat-safe
`+2,000 DP` branch. The regression now observes the pending decision clear,
the combat controller close, and the subsequent public BT1-036 play and reset
attack complete.

The dedicated evolution-time Unsuspend branch remains green and is not the
problem. The seam was the shared interpreter/combat continuation boundary:
repeated reactivation ran a nested effect without a balanced resolution frame
or restoration of the enclosing effect's provenance. `runMetaAction` now enters
and leaves that frame around each reactivated effect and restores the outer
timing/text after its awaited body. This is deliberately narrow: the card IR,
scaling, modal choices, and combat lifecycle remain unchanged, and the public
test does not inject an internal timing verb.

Coordinator discovery evidence was 6/7: exactly two modal replies were
accepted, `pendingDecision` was cleared, and the attack remained open. The
current worker change is awaiting the coordinator's serialized focused run;
the local lane did not run Vitest, typecheck, or Git.

## Knowledge base index

Merged from `docs/audits/EX2-reaudit/KB-INDEX.md`.

Generated from local KB queries on 2026-09-09. Every card report must cover each listed Q&A id or explain why it is not behaviorally testable.

| Card | Q&A ids | Status |
| --- | --- | --- |
| EX2-001 | None returned | Queued |
| EX2-002 | None returned | Queued |
| EX2-003 | Q3269, Q3270, Q3271, Q5479, Q5480 | Queued |
| EX2-004 | Q3272 | Queued |
| EX2-005 | None returned | Queued |
| EX2-006 | None returned | Queued |
| EX2-007 | Q1198, Q1265, Q1270, Q1272, Q1923, Q2402, Q2403, Q2463, Q3273, Q3274, Q3275, Q3276, Q3277, Q3278, Q3279, Q3280, Q3281, Q3282, Q3283, Q3284, Q3285, Q3286, Q3287, Q3288, Q3347, Q3558, Q4008, Q4010 | Queued |
| EX2-008 | Q3289, Q3290, Q3301 | Queued |
| EX2-009 | None returned | Queued |
| EX2-010 | Q3291, Q3292, Q3293 | Queued |
| EX2-011 | Q3294, Q3295, Q3296, Q3297 | Queued |
| EX2-012 | Q3298, Q3299, Q3300, Q3301, Q3302, Q3303 | Queued |
| EX2-013 | None returned | Queued |
| EX2-014 | None returned | Queued |
| EX2-015 | None returned | Queued |
| EX2-016 | None returned | Queued |
| EX2-017 | None returned | Queued |
| EX2-018 | Q3304 | Queued |
| EX2-019 | Q3305, Q3306, Q3307, Q3308, Q3309 | Queued |
| EX2-020 | None returned | Queued |
| EX2-021 | Q3310, Q3311, Q3312, Q5481, Q5482 | Queued |
| EX2-022 | Q3313 | Queued |
| EX2-023 | Q3314, Q3315, Q3316, Q5483, Q5484 | Queued |
| EX2-024 | Q3317, Q3318, Q3319, Q5485, Q5486 | Queued |
| EX2-025 | None returned | Queued |
| EX2-026 | None returned | Queued |
| EX2-027 | None returned | Queued |
| EX2-028 | Q3320, Q3321, Q3322, Q3323 | Queued |
| EX2-029 | None returned | Queued |
| EX2-030 | None returned | Queued |
| EX2-031 | None returned | Queued |
| EX2-032 | Q3324 | Queued |
| EX2-033 | None returned | Queued |
| EX2-034 | None returned | Queued |
| EX2-035 | Q3325 | Queued |
| EX2-036 | Q3326 | Queued |
| EX2-037 | Q3327, Q3328, Q3329, Q3330 | Queued |
| EX2-038 | Q3331, Q3332 | Queued |
| EX2-039 | Q3333, Q3334 | Queued |
| EX2-040 | None returned | Queued |
| EX2-041 | None returned | Queued |
| EX2-042 | None returned | Queued |
| EX2-043 | Q3337, Q3338, Q3339 | Queued |
| EX2-044 | Q3340 | Queued |
| EX2-045 | Q3465, Q3494 | Queued |
| EX2-046 | Q3342 | Queued |
| EX2-047 | Q3343 | Queued |
| EX2-048 | None returned | Queued |
| EX2-049 | Q3344 | Queued |
| EX2-050 | None returned | Queued |
| EX2-051 | None returned | Queued |
| EX2-052 | None returned | Queued |
| EX2-053 | None returned | Queued |
| EX2-054 | Q3345, Q3346 | Queued |
| EX2-055 | Q1923, Q3288, Q3347 | Queued |
| EX2-056 | Q3348 | Queued |
| EX2-057 | None returned | Queued |
| EX2-058 | None returned | Queued |
| EX2-059 | None returned | Queued |
| EX2-060 | None returned | Queued |
| EX2-061 | None returned | Queued |
| EX2-062 | None returned | Queued |
| EX2-063 | None returned | Queued |
| EX2-064 | Q3349, Q3350 | Queued |
| EX2-065 | Q797, Q3351, Q3352 | Queued |
| EX2-066 | None returned | Queued |
| EX2-067 | Q3353 | Queued |
| EX2-068 | None returned | Queued |
| EX2-069 | None returned | Queued |
| EX2-070 | Q3354, Q3355, Q3356, Q3357, Q3358, Q3359, Q3360 | Queued |
| EX2-071 | Q3361 | Queued |
| EX2-072 | Q3362, Q3363, Q3364, Q3365 | Queued |
| EX2-073 | Q2146, Q3366, Q3367 | Queued |
| EX2-074 | Q3368 | Queued |

## Open items

No EX2 card scores below 10/10. The following remain worth knowing.

- Contradiction — typecheck. `internal-docs/audits/EX2-runtime-2026-08-21.md` (`52da0b5bb`) records that the repository-wide typecheck "is blocked by unrelated pre-existing errors outside EX2". The 2026-09-10 closeout in `docs/audits/EX2-reaudit/RUN.md` (`edf4041c9`) records `pnpm typecheck` passing for shared, API, and web. The newer run wins; the older blockage was resolved upstream.
- Contradiction — collection counts. `docs/audits/EX2-AUDIT.md` (2026-09-03, `d2fed0043`) reports the full collection passing 85 files and 328 tests twice consecutively. The re-audit closeout reports 85 files and 494 tests. Both are green; the difference is the tests the re-audit added, and the newer count is current.
- Contradiction — focused counts. `EX2-AUDIT.md` reports focused serial proof of 74 files and 310 tests, while `internal-docs/audits/EX2-runtime-2026-08-21.md` reports 74/74 focused files with no test total. Neither is current; the re-audit's per-card counts in the card ledger below are.
- Deferred, outside EX2. The required collection and mechanism regression emitted a known AD1-002 unsupported-effect diagnostic from a green scenario. It did not fail the suite and belongs to AD1.
- No `SOURCE-RECONCILIATION.md` was produced for EX2, so no catalog discrepancy was formally recorded or ruled out for this set.
- The continuous-effect recomputation change is a real engine correction shipped with this audit, not a fixture fix: concurrent rebuilds exposed a clear-before-refill interval that could erase an armed `whenAttacking` watcher. External requests now wait and coalesce one final pass. See Mechanisms.

### Fixture traps recorded by the coordinator

- No Digi-Egg cards in deck or security.
- Injected timing and internal verbs are structural proof only.

## History

Superseded files, removed after their content was merged here. Raw evidence stays in git history at the commits named.

- `docs/audits/EX2-AUDIT.md` — `d2fed0043`, 2026-09-03. Card-by-card runtime audit with the corrected-findings table; its findings summary is reflected in Status and the card ledger.
- `docs/audits/EX2-REAUDIT-LEDGER.md` — `edf4041c9`, 2026-09-10. Scoring table for the winning re-audit.
- `docs/audits/EX2-reaudit/` per-card reports — `edf4041c9`, 2026-09-10. 74 files, `EX2-001.md` through `EX2-074.md`, merged verbatim into the card ledger.
- `docs/audits/EX2-reaudit/RUN.md` — `edf4041c9`, 2026-09-10. Run log; its final closeout is quoted under Gates.
- `docs/audits/EX2-reaudit/REVIEW-NOTES.md` — `678273a53`, 2026-09-09. Coordinator decisions and fixture traps; merged into Status and Open items.
- `docs/audits/EX2-reaudit/KB-INDEX.md` — `678273a53`, 2026-09-09. Merged into Knowledge base index.
- `docs/audits/EX2-reaudit/EX2-011-Q3295-MECHANISM.md` — `e9ea49d62`, 2026-09-09. Merged into Mechanisms.
- `docs/audits/EX2-reaudit/EX2-013-TURN-LOOP-MECHANISM.md` — `7edbf938e`, 2026-09-09. Merged into Mechanisms.
- `docs/audits/EX2-reaudit/EX2-038-mechanism-note.md` — `9ecd98f8b`, 2026-09-10. Merged into Mechanisms.
- `docs/audits/EX2-reaudit/WORKER-BRIEF.md` — `678273a53`, 2026-09-09. Process instructions for the audit workers; not evidence, not carried forward.
- `internal-docs/audits/EX2-runtime-2026-08-21.md` — `52da0b5bb`, 2026-08-28. Earlier runtime audit that repaired residual IR for EX2-012, EX2-043, EX2-046, and EX2-060; superseded by the re-audit and contradicted on typecheck status.

No code file referenced any of these paths, so no code reference needed updating.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for EX2: PR #4581; commit `54578da8b`, `e0993c474`.
