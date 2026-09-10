---
set: EX3
cards: 74
status: verified
verified_at: 2026-09-10
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# EX3 audit

## Status

All 74 EX3 cards (`EX3-001` through `EX3-074`) are verified at 10/10, for an aggregate of 740/740. The winning source is the 2026-09-10 re-audit: `docs/audits/EX3-REAUDIT-LEDGER.md` (commit `7e72574ec`) with per-card reports under `docs/audits/EX3-reaudit/`. It supersedes both `docs/audits/EX3-AUDIT.md` (2026-09-03, commit `8664b274d`) and `internal-docs/audits/EX3-runtime-2026-08-27.md` (commit `eb1a58b75`); the latter scored every card 10/10 while stating that no test was executed during that pass, so its scores carry no behavioral proof and the re-audit's counts win. Four engine seams were opened during the run. Two closed as fixture or harness errors with no engine change (`opponent-turn-effect-origin-dna`, `opponent-empty-security-reveal`) and two are documented under Mechanisms. One knowledge-base indexing defect is unresolved and listed under Open items.

## Gates

Copied from `docs/audits/EX3-reaudit/RUN.md` (commit `7e72574ec`), pre-merge and current-base closeout.

- Static pre-gate audit: 74/74 modules with exactly one exclusive `registerIrCard` registration, zero `registerCard`, zero `@ts-nocheck`, 74/74 per-card reports, 74/74 unique KB-index entries, and no prohibited Digi-Egg deck or security fixture, numeric security shortcut, injected timing, or skipped or failing test.
- Pre-merge gates: EX3 effects sync and check passed for 74 records; the coordinator EX3 collection passed 75/75 files and 764/764 tests; changed-file Oxlint and Oxfmt and `git diff --check` passed. Root typecheck was EX3-clean and failed only on the known EX4-056 baseline error already corrected upstream on `origin/main`.
- Current-base gates after merging `origin/main` at `f5504138e5c774956b8e833726a34fae998e0df5`: effects sync and check passed for 74 records; root typecheck passed; EX3 plus focused mechanisms passed 77/77 files and 770/770 tests; changed-file Oxlint and Oxfmt and `git diff --check` passed.
- Broad monorepo run: shared passed 18/18 files and 438/438 tests. API ran 5,030 files and 40,161 tests with 17 failures across 15 non-EX3 files. The same 17 failures reproduced independently at exact `origin/main` in the main worktree, proving no EX3 regression; the EX3 collection stayed fully green.
- Restart baseline for reference: fresh focused collection was 75 files and 671 tests with 72 files and 667 tests passing, reproducing four pre-existing Q3664 failures across EX3-026, EX3-030, and EX3-031. Those are closed by the simultaneous-play event collapse mechanism below.
- Delivery: three thematic audit commits plus the merge commit on branch `audit-ex3-luna-20260909`, base `d3c1b6f570d5f495438e31851f3285aa351c63d4`. Delivery gates were awarded 2/2 to all 74 rows only after the final commit and branch push.

## Card ledger

Merged from the 74 per-card reports under `docs/audits/EX3-reaudit/`. Card names come from `packages/shared/src/cards/data/cards.json`.

### EX3-001 — Bebydomon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:77487-77502` identifies EX3-001 as a blue level-2 In-Training Digi-Egg with the inherited text `[All Turns][Once Per Turn] When this Digimon with [Dramon] or [Examon] in its name becomes unsuspended, this Digimon gets +1000 DP for the turn.`
- Errata: `data/kb/errata.json:496-507` (official 2022-11-11 change) scopes the trigger from any matching Digimon to `this Digimon`; the catalog and `imageId: EX3-001-Errata` reflect the after-text.
- Card query: `node tools/kb/query.mjs card EX3-001` returned the same erratum and Q3369. Q3369 asks whether an effect attempting to unsuspend an already-unsuspended Digimon satisfies “becomes unsuspended”; its local answer text contains an unrelated Salamon sentence, so the Q&A is recorded as malformed and the no-transition behavior is proven directly by the engine test at `EX3-001.test.ts:84-90`.
- Rules: `data/kb/rules/comprehensive.md:794-807` defines suspended/unsuspended orientation; `:1060-1074` defines the unsuspend phase and actual unsuspend processing; `:730-736` states that a promoted stack card carrying orientation is not itself an unsuspend event.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Inherited effect, All Turns | `EX3-001.ts:11-16,44` (`trigger: "AllTurns"`, `isInherited: true`) | `EX3-001.test.ts:27-50`; qualifying carriers are exercised at `:53-62` |
| Trigger is this Digimon only | `EX3-001.ts:17-26` (`sourceFilter.isSelfRef`, Digimon kind, Dramon/Examon name union) | `:53-62` proves Dramon and Examon; `:64-82` proves wrong-name and near-match rejection |
| Must become unsuspended | `EX3-001.ts:14-16` (`event: "whenUnsuspended"`) | `:53-62` proves suspended-to-unsuspended activation; `:84-90` proves an already-unsuspended qualifying carrier does not trigger (Q3369) |
| +1000 DP to this Digimon | `EX3-001.ts:27-40` (`ModifyDP`, self target, amount 1000) | `:53-62` asserts exact delta; `:64-90` asserts no delta for invalid/non-transition paths |
| For the turn | `EX3-001.ts:37-39` (`duration: "forTheTurn"`) | `:92-107` asserts expiration at end of a turn and reapplication in the next turn |
| Once Per Turn | `EX3-001.ts:44-45` (`frequency: "OncePerTurn"`) | `:92-107` asserts repeated same-turn unsuspends give only +1000, next-turn reset, and `:109-115` proves two inherited copies trigger independently |

#### Peer and stack proof

The behavioral fixtures use a mixed carrier set: EX3-008 Flamedramon and EX3-018 Coredramon (Dramon names), EX3-074 Examon (Examon name), BT1-038 Monzaemon (invalid name), and BT11-022 Dracomon (near-match that does not contain `Dramon`). The inherited card is placed under each host, so the assertion observes the host permanent's live DP and orientation rather than a loose card. The two-copy case demonstrates independent inherited sources on one realistic stack.

EX3-001 has no printed digivolution requirement of its own. The focused harness seeds the smallest relevant evolution stack (`under: ["EX3-001"]`) and exercises the production unsuspend seam; no Digi-Egg is placed in deck or security. A full hatch/digivolve intent path is not required to resolve this inherited-only clause and is not exposed by the current focused harness.

#### Changes

- No card-module defect found. `EX3-001.ts` already uses the required exclusive `registerIrCard("EX3-001", compiled)` registration, has `coverage: "full"`, and no residuals.
- Strengthened only `EX3-001.test.ts` with Examon coverage, a Dracomon near-match negative, Q3369's already-unsuspended negative, and explicit end-of-turn duration proof.
- No reusable engine seam or shared file was changed.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-001.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 8 tests).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-001.ts apps/api/src/cards/EX3/EX3-001.test.ts` — **PASS**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-001.ts apps/api/src/cards/EX3/EX3-001.test.ts` — **PASS**.
- `git diff --check` — **PASS**.
- Root typecheck — **deferred by coordinator resource policy** while an external EX5 TypeScript process was consuming approximately 2.47 GB RAM. The known baseline API failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)

Remaining ambiguity: Q3369's local answer includes unrelated Salamon text, so that Q&A cannot be treated as a clean oracle; the directly relevant no-transition behavior is independently proven. No unsupported engine behavior remains for this card.

### EX3-002 — Missimon

#### Scope and sources

- Card: `EX3-002` Missimon.
- Catalog source: `packages/shared/src/cards/data/cards.json`.
- Knowledge-base query: `node tools/kb/query.mjs card EX3-002` returned no card-specific Q&A or errata entries.
- Rules sources reviewed: `data/kb/rules/comprehensive.md` §§4-3-1–4-3-3 (Digi-Eggs, stacked cards, and inherited effects), 4-8-1–4-8-2 (digivolution-card identity), 15-3-1–15-3-2 (inherited-effect source/type), and 16-11-1–16-11-5 (persistent, mandatory Reboot at the opponent's unsuspend phase).

#### Printed contract

Catalog identity is Black, Digi-Egg, level 2, In-Training, Machine, DP 0, play cost `-1`, no evolution requirements, and no main/security effect. The complete inherited clause is:

> `[Opponent's Turn] While you have another Digimon with [D-Brigade] in its traits in play, this Digimon gains ＜Reboot＞. (Unsuspend this Digimon during your opponent's unsuspend phase.)`

The clause has four observable requirements: it is inherited from a card under a host; it is live only during the opponent's turn; the controller must have a distinct, own, battle-area Digimon whose traits include exact `D-Brigade`; and the host gains Reboot, whose mandatory opponent-unsuspend behavior is persistent.

#### Implementation trace

`apps/api/src/cards/EX3/EX3-002.ts` is compiled IR and registers exclusively through `registerIrCard("EX3-002", compiled)`.

| Printed clause | IR/runtime evidence | Behavioral proof |
| --- | --- | --- |
| Inherited timing | `effects[0].isInherited: true`, `trigger: "OpponentsTurn"`; runtime turn-owner guard and continuous recompute | `grants Reboot only on the opponent's turn...` |
| “this Digimon gains” | `Aura.target.filter.isSelfRef: true`, `target.isSelf: true`; Aura grants the `Reboot` keyword | Positive aura assertion and full-turn unsuspend assertion |
| “another Digimon” | Gate filter uses `excludeSelf: true`, `kind: ["Digimon"]`, `zone: "battleArea"` | Self-only D-Brigade, Tamer-only, and near-match/foreign-controller negatives |
| `[D-Brigade] in its traits` | `nameOrTrait: [{ tokens: ["D-Brigade"], match: "trait" }]`; definition matching reads the top card's exact trait union | EX3-046 positive and EX3-047 near-match negative |
| Reboot timing/mandatory unsuspend | Keyword grant is consumed by the engine's production Reboot unsuspend path | Full `advance.runTurn(1)` production turn; no pending decision |

No implementation defect or unresolved card-specific ambiguity was found.

#### Behavioral proof

The colocated test uses public intents, `settle()`, and observable state:

- metadata and exact inherited text;
- compiled IR coverage, action kind, Reboot keyword, and gate shape;
- owner-turn boundary and live removal of the qualifying D-Brigade;
- self-exclusion, non-Digimon exclusion, foreign-controller exclusion, and near-matching `Bird Dragon` exclusion;
- a real production opponent turn (`advance.runTurn(1)`) proving a suspended host unsuspends from Reboot without a decision;
- a public digivolution from a level-2 Missimon breeding source into EX3-046, asserting the resulting top card and retained stack source, followed by a public move-from-breeding and inherited Reboot assertion.

No injected `fireTiming`, `fireSubTrigger`, or direct private unsuspend call is used.

#### Commands and results

- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-002.test.ts --maxWorkers=1 --no-file-parallelism` — **passed**, 1 file / 6 tests.
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-002.ts apps/api/src/cards/EX3/EX3-002.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-002.ts apps/api/src/cards/EX3/EX3-002.test.ts` — **passed**.
- `git diff --check` (scoped card/report files) — **passed**.
- `pnpm --filter @aegis/api typecheck` — **deferred by coordinator resource policy** while another EX5 TypeScript process was using approximately 2.47 GB. The known baseline API typecheck failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111` (`"digimon"` is not assignable to `"player" | "permanent"`).

#### Remaining gaps

None card-local. Collection/typecheck gates remain coordinator-owned; no shared engine seam was changed.

#### Worker rubric

| Dimension | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| Compiled IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates (worker-owned) | 0/2 |
| **Worker total** | **8/10** |

### EX3-003 — Sunarizamon

#### Catalog and rules

The committed catalog record in `packages/shared/src/cards/data/cards.json` identifies Sunarizamon as a Red Lv.3 Reptile Digimon, play cost 3, 2000 DP, with a Red Lv.2 evolution for 0.

Printed clause:

1. `[When Attacking]` Reveal the top 3 cards of your deck. Add 1 Digimon card with `[Dragon]`, `[saur]` or `[Ceratopsian]` in one of its traits among them to your hand. Place the rest at the bottom of your deck in any order.

The catalog text is the 2022-11-11 official erratum. Comprehensive Rules `comprehensive-0035`, §2-3-2-4, defines “with [XX] in any of its traits” as a trait that includes the bracketed text; this supports substring matching for `Dragon`, `saur`, and `Ceratopsian`.

Q3370 asks whether `[Dragonkin]` is included by the erratum wording. The local answer is yes. The behavioral suite uses EX3-008 (Dragonkin) as a positive case.

#### Implementation trace

`apps/api/src/cards/EX3/EX3-003.ts` registers only `registerIrCard("EX3-003", compiled)`. The compiled IR has `coverage: "full"` and an empty residual list.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| When Attacking | `trigger: "WhenAttacking"` | Every attack test uses the public `attack` intent and settles the effect stack. |
| Reveal top 3 | `RevealAdd.revealCount: 3` | The four-card boundary test proves only the first three are eligible; the fourth remains unrevealed/in the deck. |
| Eligible card | `kind: ["Digimon"]`, `controllerDefault: "mine"`, `traitContains: ["Dragon", "saur", "Ceratopsian"]` | Positive trait matrix covers Dragon, saur, Ceratopsian, and Q3370 Dragonkin; the Option name-only control is excluded. |
| Add exactly 1 to hand | `add[0].count: 1`, `to: "hand"` | The main positive test observes one selected physical instance in hand and the recorded one-card selection bounds. |
| Place the rest at deck bottom in any order | `rest: "deckBottom"` | The no-match test responds with an explicit reversed `orderCards` order and asserts the final deck sequence. |
| Printed evolution requirement | Catalog `evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }]` | Public `digivolve` from red BT1-001 in breeding succeeds at memory 0, preserves the egg below `topCard`, and rejects a purple BT10-006 source. |

The colocated test also asserts the full IR shape, catalog identity, colors, type, evolution cost, errata image id, and errata text.

#### Behavioral proof

All effect tests use public `attack`/`digivolve` intents, `settle()`, and observable `GameState`; no injected timing API is used.

- The main positive path reveals three cards, selects one of two eligible Digimon, places the rest at the bottom, closes the pending effect, and asserts face-down final deck state and selection bounds.
- The trait matrix proves `Dragon` (EX3-005 Rock Dragon), `saur` (AD1-001 Dinosaur), `Ceratopsian` (BT10-050), and `Dragonkin` (EX3-008, Q3370). BT12-099 is an Option with a matching name fragment but is excluded by the Digimon-kind filter.
- A short two-card no-match deck proves the effect does as much as possible without opening an impossible card-selection decision. The explicit reverse bottom order proves “in any order.”
- A four-card deck proves the exact reveal endpoint: the fourth card is not selected even though it is a matching Mini Dragon, and remains in the deck face-down.
- The evolution test proves the legal Red Lv.2 route, zero memory cost, source-stack identity (`stack` contains BT1-001 while `topCard` is EX3-003), and an illegal purple source negative. Digi-Eggs appear only in breeding-area fixtures, never deck or security.
- Optional refusal, inherited text, Security text, and once-per-turn reset are not applicable to this card.

Neighboring EX3-006/EX3-009 inherited-trait implementations and EX3-014's Dragon-family DigiXros filter were reviewed for trait semantics. They use the same Dragon/saur/Ceratopsian family, including the Dragonkin ruling, and no cross-card inconsistency was found.

#### Defects and changes

No card behavior defect was found: the existing IR already matched the catalog erratum, Q3370, and the shared trait matcher. The module now exports its existing `compiled` value so the colocated test can assert the executable clause mapping; registration remains exclusively `registerIrCard`.

The test was strengthened with complete catalog/IR assertions, the exact top-three boundary, all four trait-family positives plus a kind/name negative, explicit deck-bottom ordering, and legal/illegal evolution-stack proof. No shared engine, catalog, or generated effect files were changed.

#### Commands and results

- `node tools/kb/query.mjs card EX3-003` — erratum and Q3370 returned; Q3370 answer confirms Dragonkin is included.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-003.test.ts --maxWorkers=1 --no-file-parallelism` — **1 file, 9 tests passed**.
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-003.ts apps/api/src/cards/EX3/EX3-003.test.ts` — clean.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-003.ts apps/api/src/cards/EX3/EX3-003.test.ts docs/audits/EX3-reaudit/EX3-003.md` — all matched files formatted.
- `git diff --check` — clean.
- `pnpm --filter @aegis/api typecheck` — deferred by coordinator resource policy because an external EX5 typecheck process was consuming approximately 2.47 GB; the baseline API failure is the out-of-scope `src/cards/EX4/EX4-056.test.ts:111` target-kind diagnostic recorded in `RUN.md`.

#### Remaining gaps

None card-local. No applicable Q&A beyond Q3370 was returned. Collection/typecheck/delivery gates remain coordinator-owned.

#### Score

| Component | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Worker total** | **8/10** |

### EX3-004 — Veemon

#### Catalog and rules

The committed catalog record in `packages/shared/src/cards/data/cards.json` identifies Veemon as a Red Lv.3 Free Digimon, play cost 3, 1000 DP, type `Mini Dragon`, with Red Lv.2 and Purple Lv.2 evolution requirements, each costing 0.

Printed clauses:

1. `[On Play] You may trash 1 card with [Imperialdramon] in its name or [Free] in its traits from your hand to Draw 2.`
2. Inherited `[Your Turn] While you have a purple Digimon in play, this Digimon gets +2000 DP.`

`node tools/kb/query.mjs card EX3-004` returned no card-specific Q&A, errata, or restrictions. Comprehensive Rules `comprehensive-0035`, §2-3-2-1/3, treats form/attribute/type as traits and requires an exact trait match for “with the [XX] trait”; `EX3-004`'s `Free` attribute therefore satisfies the cost filter. Comprehensive Rules §2-3-1-3 makes “with [Imperialdramon] in its name” a name-inclusion match. Rules `comprehensive-0069`, §4-2-3 and `comprehensive-0160`, §15-3 establish that a Digimon gains inherited effects from cards stacked below it.

#### Implementation trace

`apps/api/src/cards/EX3/EX3-004.ts` registers only `registerIrCard("EX3-004", compiled)`. The compiled IR has `coverage: "full"` and an empty residual list.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| On Play timing | `trigger: "OnPlay"` | Public `playCard` tests resolve the effect and assert final zones. |
| Optional processing | `Draw` action `optional: true` | The decline test leaves the eligible card in hand, does not draw, and leaves the deck unchanged. |
| Cost: trash one own hand card | `cost.kind: "trash"`, target `zone: "hand"`, `controller: "mine"`, `count: 1` | Positive test observes the selected physical card in trash and memory paid for Veemon plus the cost. |
| Cost OR filter | `nameOrTrait: [{ tokens: ["Imperialdramon"], match: "name" }, { tokens: ["Free"], match: "trait" }]` | Positive candidate list contains EX3-008 (Free attribute) and EX3-063 (Imperialdramon in name); a purple Tamer is separately excluded from the inherited Digimon gate. |
| Draw 2 | `controller: "mine", amount: 2` | Full two-card deck is consumed after payment; 0/1/2-card boundary cases draw only cards available. |
| Inherited Your Turn +2000 | `isInherited: true`, `trigger: "YourTurn"`, `Aura` with `modifyDP: 2000` | Direct stack proof, plus a public evolution to EX3-004 followed by an inert level-4 top card and a public breeding move, observes the bonus only once EX3-004 is an inherited source. |
| Purple support condition | `while.kind: "youHave"`, own battle-area `kind: ["Digimon"]`, `colors: ["Purple"]` | Own purple Digimon enables the bonus; opponent purple, purple Tamer, opponent turn, and support deletion each fail or remove it. |
| Printed evolution requirements | Catalog `evoCosts` for Red/Purple Lv.2 at 0 | Public evolution tests succeed from BT1-001 and BT10-006, preserve source identity, and assert memory remains 0; BT1-005 is rejected. |

#### Behavioral proof

All effect and evolution tests use public `playCard`, `digivolve`, and `moveFromBreeding` intents, `settle()`, and observable `GameState`; no injected timing API is used.

- The On Play positive path selects either a Free card or Imperialdramon-name card from the own hand, trashes exactly one physical instance, pays memory 3 for play plus the cost, and draws two.
- The optional refusal path proves the “may” branch does not trash or draw.
- Deck sizes 0, 1, and 2 prove the Draw 2 boundary without assuming unavailable cards.
- The inherited Aura positive path uses a real source card under a carrier and an own purple Digimon. A paired negative path proves opponent-controlled purple support and opponent-turn ownership do not qualify, then deletes the support and proves the modifier lapses.
- A purple Tamer-only board proves the `kind: ["Digimon"]` condition is enforced.
- Red and purple level-2 breeding sources both evolve into Veemon for 0; the yellow level-2 source is rejected with the card left in hand. Digi-Eggs appear only in breeding fixtures, never deck or security.
- The stack test publicly evolves red egg -> EX3-004 -> inert BT1-014, asserts `stack === [BT1-001, EX3-004]` and top `BT1-014`, moves the completed Digimon from breeding, then observes the +2000 inherited bonus while own purple support is in the battle area.

Neighboring EX3-002 and EX3-008 tests were reviewed for inherited-effect and dual-color evolution-stack conventions. No cross-card inconsistency was found.

#### Defects and changes

No card behavior defect was found: the existing IR matched the catalog and rules. The module now exports its existing `compiled` value so the colocated test can assert the executable clause mapping; registration remains exclusively `registerIrCard`.

The test was strengthened with complete catalog/IR assertions, both evolution routes and an illegal-source negative, a Tamer-vs-Digimon condition boundary, and a realistic multi-step evolution/move stack. No shared engine, catalog, or generated effect files were changed.

#### Commands and results

- `node tools/kb/query.mjs card EX3-004` — no knowledge-base entries.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-004.test.ts --maxWorkers=1 --no-file-parallelism` — **1 file, 13 tests passed**.
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-004.ts apps/api/src/cards/EX3/EX3-004.test.ts` — clean.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-004.ts apps/api/src/cards/EX3/EX3-004.test.ts docs/audits/EX3-reaudit/EX3-004.md` — run after report creation; all matched files are formatted.
- `git diff --check` — run after report creation; clean.
- `pnpm --filter @aegis/api typecheck` — deferred by coordinator resource policy because an external EX5 typecheck process was consuming approximately 2.47 GB; the baseline API failure is the out-of-scope `src/cards/EX4/EX4-056.test.ts:111` target-kind diagnostic recorded in `RUN.md`.

#### Remaining gaps

None card-local. No card-specific Q&A or errata was returned. Collection/typecheck/delivery gates remain coordinator-owned.

#### Score

| Component | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Worker total** | **8/10** |

### EX3-005 — Vorvomon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:77579-77603` identifies EX3-005 as a red level-3 Rookie Virus Rock Dragon Digimon, play cost 3, DP 1000, with red level-2 cost 0 or black level-2 cost 0 evolution routes.
- Main effect: `[Your Turn][Once Per Turn] When you play a [Hina Kurihara], delete 1 of your opponent's Digimon with 3000 DP or less.`
- Inherited effect: `[When Attacking] If this Digimon has an [On Play] effect, delete 1 of your opponent's Digimon with 3000 DP or less.`
- Card query: `node tools/kb/query.mjs card EX3-005` returned no knowledge-base entries, no errata, and no card-specific Q&A. There are no unresolved card-specific rulings to apply.
- Rules: `data/kb/rules/glossary.md:148-155` defines Once Per Turn and confirms separate copies can each activate once in the same turn. `data/kb/rules/comprehensive.md:2039-2068` distinguishes trigger conditions from processing conditions, which supports the inherited `selfHasOnPlayEffect` gate being evaluated when the attack resolves.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Your Turn trigger | `EX3-005.ts:8-12` (`trigger: "YourTurn"`, `whenPlayed` watcher) | `EX3-005.test.ts:71-132` triggers from the active player's Hina play; `:154-174` rejects opponent-turn/controller mismatch |
| Once Per Turn | `EX3-005.ts:41` (`frequency: "OncePerTurn"`) | `:71-132` proves two same-turn Hina plays delete only once, then next-turn reset; `:134-152` proves a no-target trigger still consumes the once-per-turn opportunity |
| Play a Hina Kurihara | `EX3-005.ts:13-21` (`controllerDefault: "mine"`, name filter) | `:71-132` uses Hina Kurihara; `:154-174` verifies an opponent's Hina does not fire the watcher |
| Delete one opponent Digimon at 3000 DP or less | `EX3-005.ts:22-35` targets opponent Digimon, `dp.lte 3000`, count 1 | `:71-132` asserts exactly one deletion and candidate endpoints 3000/3001; `:134-152` proves no legal target leaves the board unchanged |
| Inherited When Attacking clause | `EX3-005.ts:43-65`, `isInherited: true`, `trigger: "WhenAttacking"` | `:176-194` resolves from a stacked source during an attack; `:238-268` proves two attacks can resolve independently |
| If this Digimon has an On Play effect | `EX3-005.ts:59-62` (`selfHasOnPlayEffect`) | `:176-194` uses an EX3-011 carrier with an On Play effect; `:196-216` rejects a carrier without one |
| Inherited target/count/boundary | `EX3-005.ts:47-58`, opponent Digimon, count 1, DP <=3000 | `:218-236` proves a qualifying carrier does not delete a 3001-DP target |

#### Peer and evolution-stack proof

EX3-007 Lavorvomon carries the same inherited attack deletion and was reviewed as the nearest peer. Its colocated tests independently confirm the same `selfHasOnPlayEffect` gate, opponent-Digimon filter, exact 3000-DP boundary, non-Digimon rejection, and independent copies. EX3-011 Lavogaritamon is used as the positive carrier because its catalogued On Play effect makes the inherited gate true; BT1-038 Monzaemon is used as the negative carrier because it has no On Play effect.

The positive inherited fixtures use the legal level sequence EX3-005 (level 3) under EX3-006 (level 4) under EX3-011 (level 5), preserving EX3-005 in the stack while exposing the top card's On Play effect. The negative fixture uses a non-On-Play carrier. No Digi-Egg is placed in deck or security, and all assertions inspect settled board/trash state and recorded target decisions.

#### Changes

- No card-module defect found. `EX3-005.ts` already expresses both printed clauses with full coverage, no residuals, and exclusive `registerIrCard("EX3-005", compiled)` registration.
- Strengthened only `EX3-005.test.ts` with complete catalog/IR assertions, no-target Once Per Turn failure coverage, exact candidate IDs for the 3000-DP boundary, an explicit 3001-DP inherited negative, and legal three-level stack fixtures.
- No shared engine or catalog file changed.

#### Verification

- `node tools/kb/query.mjs card EX3-005` — **PASS**; no card-specific QA or errata returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-005.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 9 tests).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-005.ts apps/api/src/cards/EX3/EX3-005.test.ts` — **PASS**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-005.ts apps/api/src/cards/EX3/EX3-005.test.ts docs/audits/EX3-reaudit/EX3-005.md` — **PASS** after mechanical formatting.
- `git diff --check` — **PASS**.
- Root typecheck — **deferred by coordinator resource policy**. The known baseline API failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)

Remaining gaps: no card-specific Q&A exists for EX3-005. Typecheck remains coordinator-deferred under the shared memory policy; no card-local failure was observed.

### EX3-006 — Flarerizamon

#### Scope and sources

- Card: `EX3-006` Flarerizamon.
- Catalog source: `packages/shared/src/cards/data/cards.json`.
- Knowledge-base query: `node tools/kb/query.mjs card EX3-006` returned Q3371 (2024-03-28).
- Q3371: the printed `[Dragon], [saur] or [Ceratopsian] in one of its traits` gate includes `[Dragonkin]` in addition to `[Dragon]`; the implementation and tests cover this explicitly.
- Rules sources reviewed: `data/kb/rules/comprehensive.md` §§4-3-1–4-3-3 (Digimon and inherited effects), 4-8-1–4-8-2 (digivolution-card identity), 11-1-1–11-1-5 (attack procedure and When Attacking timing), 15-3-1–15-3-2 (inherited-effect source/type), 15-5-1–15-5-3 (trigger conditions), 15-6-1 (processing conditions), and 15-8-2 (persistent/continuous processing).

#### Printed contract

Catalog identity is Red, Digimon, level 4 Champion, Data, Fire Dragon, DP 5000, play cost 4, with one printed evolution route: red level 3 for memory cost 2. It has no main, security, or top-card effect. Its complete inherited clause is:

> `[When Attacking][Once Per Turn] If this Digimon has [Dragon], [saur], or [Ceratopsian] in one of its traits, ＜Draw 1＞. (Draw 1 card from your deck.)`

The clause requires an inherited source under the attacking host, a real attack declaration, the once-per-turn source identity, and a trait-only processing gate. Per Q3371, trait substring matching includes Dragonkin (and other traits containing Dragon/saur), while unrelated traits do not qualify.

#### Implementation trace and fix

`apps/api/src/cards/EX3/EX3-006.ts` is compiled IR and registers exclusively through `registerIrCard("EX3-006", compiled)`.

The card-local fix changes the condition from the broad `selfTopHasText` predicate to the dedicated `selfHasTrait` predicate. The prior filter happened to pass current fixtures because every ref used a trait match, but `selfHasTrait` is the faithful reusable seam for “this Digimon has ... in its traits” and avoids conflating traits with general card text. The filter retains exact Q3371 semantics:

- `Dragon`, `saur`, and `Ceratopsian` use `traitContains` for the printed substring wording;
- `Dragonkin` is explicitly retained as an exact trait ref for Q3371;
- `isInherited: true`, `trigger: "WhenAttacking"`, `frequency: "OncePerTurn"`, and a mandatory `Draw` of 1 remain unchanged.

| Printed clause | IR/runtime evidence | Behavioral proof |
| --- | --- | --- |
| Inherited `[When Attacking]` effect | inherited `WhenAttacking` effect; attack timing dispatch | Positive carrier attacks and production-turn attack |
| `[Once Per Turn]` | `frequency: "OncePerTurn"`; turn ledger resets at production turn boundaries | Same-source second attack does not draw; next production turn attack draws again |
| Trait condition | `selfHasTrait` with three `traitContains` refs and explicit `Dragonkin` trait ref | Dragon, saur, Ceratopsian, Dragonkin, and Dragon-containing Bird Dragon positives; Puppet negative |
| `＜Draw 1＞` | `Draw` action, controller `mine`, amount `1` | Hand/deck endpoint assertions; empty-deck safe resolution |

#### Behavioral proof

The colocated test uses observable state and full settlement:

- exact catalog identity and inherited text;
- compiled IR shape including Q3371, trait-only predicate, trigger, inherited flag, and once-per-turn frequency;
- legal red-level-3 evolution for cost 2, stack-source identity, memory endpoint, and an illegal level/color source negative;
- Dragon, saur, Ceratopsian, Dragonkin (Q3371), and `Bird Dragon` substring positives;
- unrelated Puppet negative;
- once-per-turn same-source suppression, reset across a real production turn loop driven by public `endPhase` intents, and independent activation of two inherited copies;
- empty-deck no-op endpoint;
- no decision opened by the mandatory draw.

The same-turn unsuspend needed for the second attack uses the production unsuspend primitive; no injected `fireTiming`, `fireSubTrigger`, or direct timing call is used. The once-per-turn reset is proven through the real turn loop and public phase intents.

#### Commands and results

- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-006.test.ts --maxWorkers=1 --no-file-parallelism` — **passed**, 1 file / 12 tests.
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-006.ts apps/api/src/cards/EX3/EX3-006.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-006.ts apps/api/src/cards/EX3/EX3-006.test.ts docs/audits/EX3-reaudit/EX3-006.md` — **passed** after formatting.
- `git diff --check` (scoped card/report files) — **passed**.
- `pnpm --filter @aegis/api typecheck` — **deferred by coordinator resource policy**. The known baseline API typecheck failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111` (`"digimon"` is not assignable to `"player" | "permanent"`).

#### Remaining gaps

None card-local. No shared engine seam was changed. Collection/typecheck gates remain coordinator-owned.

#### Worker rubric

| Dimension | Score |
| --- | ---: |
| Catalog/rules and Q3371 evidence | 2/2 |
| Compiled IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates (worker-owned) | 0/2 |
| **Worker total** | **8/10** |

### EX3-007 — Lavorvomon

#### Catalog and rules

The committed catalog record in `packages/shared/src/cards/data/cards.json` identifies Lavorvomon as a Red Lv.4 Champion Virus Digimon, play cost 4, 4000 DP, type `Rock Dragon`, with Red Lv.3 and Black Lv.3 evolution requirements, each costing 2.

Printed clause:

1. Inherited `[When Attacking] If this Digimon has an [On Play] effect, delete 1 of your opponent's Digimon with 3000 DP or less.`

##### Q&A reconciliation

`node tools/kb/query.mjs card EX3-007` returns Q3372 and Q3373, but both questions describe a four-card reveal that adds a Dragon-family Digimon and a Hina Kurihara. That effect is not present in EX3-007's catalog record, which has no main effect and only the inherited attack-delete text above.

The same question text is returned for `EX3-048` as Q3417/Q3418, and EX3-048's catalog/module contain the matching four-card two-slot reveal effect. Therefore Q3372/Q3373 are recorded as a local KB card-key mismatch and are not applicable evidence for EX3-007; no reveal behavior was invented or added to this card. No other EX3-007 errata, restriction, or rules entry was returned.

Applicable comprehensive rules include `comprehensive-0035`, §2-3-2-3 for exact trait matching (the `Rock Dragon` type is a trait), `comprehensive-0069`, §4-2-3 and `comprehensive-0160`, §15-3 for inherited effects from digivolution cards, and `comprehensive-0173`, §15-8-3 for When Attacking trigger behavior.

#### Implementation trace

`apps/api/src/cards/EX3/EX3-007.ts` registers only `registerIrCard("EX3-007", compiled)`. The compiled IR has `coverage: "full"` and an empty residual list.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Inherited When Attacking | `trigger: "WhenAttacking"`, `isInherited: true` | Public `attack` intents with EX3-007 under carriers resolve the inherited effect. |
| Carrier gate | `condition: { kind: "selfHasOnPlayEffect" }` | EX3-011 (On Play) triggers deletion; BT1-020 (no On Play) does not. The public multi-step evolution stack ends with EX3-011 on top and EX3-007 beneath it, proving source identity. |
| Opponent Digimon target | `target.filter.controller: "opponent"`, `kind: ["Digimon"]` | A Hina Kurihara Tamer is ignored and leaves no target decision; Digimon candidates are offered/deleted. |
| 3000 DP boundary | `dp: { op: "lte", value: 3000 }` | 3000 and 2000 DP candidates are offered; 4000 is excluded, and the auto-resolved boundary candidate is deleted. |
| Delete one | `count: 1` | Single-target selection is `min: 1, max: 1`; two inherited copies resolve independently against two targets. |
| Evolution requirements | Catalog `evoCosts` Red/Black Lv.3, cost 2 | Public evolution tests assert memory 2 -> 0 and source stack identity for both colors; a Blue Lv.3 source is rejected. |

#### Behavioral proof

All behavior uses public `attack`, `digivolve`, and full `settle()` resolution; no injected timing API is used.

- The boundary test uses 3000, 2000, and 4000 DP opponent Digimon. It records the public `chooseTargets` request, asserts exactly two candidates and `min: 1, max: 1`, then lets the selection resolve and asserts the selected target is in trash while the 4000-DP Digimon remains.
- The no-On-Play carrier negative attacks a player and confirms no decision and no deletion.
- The non-Digimon negative places Hina Kurihara on the opponent board and confirms no target is offered.
- Two physical EX3-007 inherited cards on one carrier each delete a separate legal target, proving copies do not collapse into one activation.
- Red and Black Lv.3 sources evolve to EX3-007 at cost 2; the Blue Lv.3 negative returns `invalid-evolution`, keeps EX3-007 in hand, and leaves memory unchanged.
- The realistic stack test publicly evolves BT1-009 -> EX3-007 -> EX3-011, asserts `stack === [BT1-009, EX3-007]` with EX3-011 on top and memory 5 -> 0, then attacks and resolves the inherited deletion. This proves the condition reads the carrier's top-card On Play text while the audited card remains the inherited source.

Neighboring EX3-005 and EX3-006 tests were reviewed for the same inherited 3000-DP deletion seam, source-stack conventions, and public attack/evolution proof. EX3-048 was queried to reconcile the mismatched Q3372/Q3373 reveal text; its Q3417/Q3418 entries are the correctly keyed equivalents.

#### Defects and changes

No EX3-007 IR behavior defect was found. The existing module already encoded the inherited trigger, On Play gate, opponent Digimon filter, 3000-DP ceiling, and count 1 correctly.

The colocated test was strengthened to assert complete catalog identity and compiled IR, fully settle the boundary deletion, prove Red/Black evolution and an illegal Blue source, and cover a realistic multi-step evolution stack. No shared engine, catalog, generated effect, or other card files were changed.

#### Commands and results

- `node tools/kb/query.mjs card EX3-007` — Q3372/Q3373 returned; applicability mismatch documented above.
- `node tools/kb/query.mjs card EX3-048` — Q3417/Q3418 returned with the same reveal questions under the matching Jazardmon card.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-007.test.ts --maxWorkers=1 --no-file-parallelism` — **1 file, 10 tests passed**.
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-007.ts apps/api/src/cards/EX3/EX3-007.test.ts` — clean.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-007.ts apps/api/src/cards/EX3/EX3-007.test.ts docs/audits/EX3-reaudit/EX3-007.md` — all matched files formatted.
- `git diff --check` — clean.
- `pnpm --filter @aegis/api typecheck` — deferred by coordinator resource policy because an external EX5 typecheck process was consuming approximately 2.47 GB; the baseline API failure is the out-of-scope `src/cards/EX4/EX4-056.test.ts:111` target-kind diagnostic recorded in `RUN.md`.

#### Remaining gaps

- Q3372/Q3373 remain a KB indexing mismatch: their text belongs to EX3-048's reveal effect, not EX3-007. This is documented rather than silently treated as an EX3-007 requirement.
- No card-local behavior gap remains. Collection/typecheck/delivery gates remain coordinator-owned.

#### Score

| Component | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Worker total** | **8/10** |

### EX3-008 — Flamedramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:77665-77690` identifies EX3-008 as Flamedramon, a red level-4 ArmorForm/Free/Dragonkin Digimon, play cost 5, 5000 DP, with red or purple level-3 evolution costs of 2.
- Main effect (errata text): `[When Digivolving] Activate 1 of the effects below.` The first option may digivolve 1 of your other Digimon into a level-4 purple Digimon with the [Free] trait from your trash for the cost. The second option may DNA digivolve this Digimon and 1 of your other Digimon into a Digimon card in your hand for the cost.
- Inherited effect: `[End of Your Turn] This Digimon and one of your other Digimon may DNA digivolve into a Digimon card in your hand for the cost.`
- Official errata: `data/kb/errata.json:522-538` (2022-11-11) changes the first option to “1 of your other Digimon,” adds the [Free] trait wording, and corrects the second option to DNA digivolve. The errata is explicitly read when playing.
- Q3374 (`data/kb/qa.json:36732-36737`) answers yes: if the When Digivolving DNA digivolution moves memory to the opponent and ends the turn, the inherited effect can be used again.
- Q3375 (`data/kb/qa.json:36739-36744`) answers no: the original other Digimon targeted by the first option does not have to be purple.
- Rules: `data/kb/rules/comprehensive.md:233-237` defines exact [trait] matching; `:1450-1510` defines DNA digivolution and its two-material stack behavior. The implementation’s omitted DNA result zone intentionally uses the interpreter’s hand default.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| When Digivolving, choose one effect | `EX3-008.ts:13-21` creates a one-choice Modal with both errata labels; `:22-85` contains the two branches | `EX3-008.test.ts:132-191` records both public modal labels and declines the selected may-effect; `:193-235` proves one legal branch skips the modal and no legal branch opens nothing |
| First branch: other Digimon, purple level 4 with [Free], from trash, pay cost | `EX3-008.ts:25-52` leaves the source target color-free/excludes self, while constraining `into` to purple, level 4, exact [Free] trait, `from: ["trash"]`, and `payCost: true` | `EX3-008.test.ts:237-273` uses red BT1-010 as the other Digimon (Q3375), moves EX3-058 from trash, and retains near-matches BT10-075 (wrong trait) and BT13-011 (wrong color) in trash; memory 6 -> 2 proves the printed cost |
| Second branch: this + one other DNA digivolve into a hand Digimon for cost | `EX3-008.ts:54-82` pins self plus one other battle-area Digimon, requires `payCost`, and uses a result filter whose default zone is hand | `EX3-008.test.ts:275-316` resolves the branch through public digivolve intent, asserts Paildramon in hand is consumed, the resulting stack contains EX3-008/base/partner, both materials leave their old permanents, and memory 6 -> 4 |
| Inherited End of Your Turn DNA effect | `EX3-008.ts:88-121` marks the effect inherited, triggers at `EndOfYourTurn`, and repeats self + other material constraints with optional paid DNA | `EX3-008.test.ts:451-514` filters compatible/incompatible partner and result candidates; `:516-553` proves the real turn boundary and final Dragon Mode stack after the When Digivolving DNA crosses memory |
| Optionality and legal candidate boundaries | `optional: true` is present on all three executable branches; target/result filters are exact | `EX3-008.test.ts:132-191`, `:318-410`, and `:451-514` assert optional refusal, visible-vs-candidate IDs, exact min/max, incompatible partner rejection, and non-DNA result rejection |

#### Q&A coverage

- Q3374 is covered by a real `runOneTurn()` flow, not an injected timing call: memory begins at 1, the When Digivolving DNA branch crosses the gauge, and the same turn reaches End of Your Turn where the inherited effect resolves into EX3-063. The final stack contains EX3-008, EX3-010, EX3-058, and EX3-061, and EX3-063 is removed from hand.
- Q3375 is covered with red BT1-010 as the other Digimon, while the result is the purple EX3-058. The positive stack proves the other Digimon need not be purple; BT10-075 and BT13-011 are invalid result near-matches and remain in trash.
- The two tests that call `advance.fire(EffectTiming.OnEndTurn, ...)` are supplemental filter/decision coverage only. They are not used as the Q3374 behavioral credit; the real-turn test supplies that proof.

#### Peer and evolution-stack proof

The positive When Digivolving DNA fixture uses BT1-009 (red level 3) under EX3-008 with EX3-058 (purple level 4) as the partner and EX3-010 (Paildramon) as the legal hand result. The Q3374 fixture continues through EX3-061 (Dinobeemon) and EX3-063 (Imperialdramon: Dragon Mode), preserving EX3-008 and both material identities in the settled final stack. Red and purple level-3 evolution routes are separately exercised at the catalogued cost. No Digi-Egg is placed in a deck or security fixture.

#### Changes

- No executable card-module defect was found. `EX3-008.ts` already has complete IR, no residuals, and exclusive `registerIrCard("EX3-008", compiled)` registration. Its comment was clarified to document that DNA result filters default to hand; no engine/shared/catalog file changed.
- Strengthened `EX3-008.test.ts` with exact catalog/errata text, complete compiled-IR assertions, an actual non-purple Q3375 partner, wrong-trait/wrong-color trash negatives, explicit optional/modal behavior, and Q3374 real-turn proof.

#### Verification

- `node tools/kb/query.mjs card EX3-008 --json` — **PASS**; official errata and Q3374/Q3375 returned and reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-008.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 12 tests).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-008.ts apps/api/src/cards/EX3/EX3-008.test.ts` — **PASS**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-008.ts apps/api/src/cards/EX3/EX3-008.test.ts` — **PASS**.
- `git diff --check` — **PASS**.
- Root typecheck — **deferred by coordinator resource policy**. The known baseline API failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: none card-local. Collection gates, root typecheck, and delivery gates remain coordinator-owned.

### EX3-009 — Volcdramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-009 as Volcdramon, a red level-5 Ultimate/Data/Dragon Digimon, play cost 6, 7000 DP, with a red level-4 evolution cost of 3.
- Inherited effect: `[When Attacking][Once Per Turn] If this Digimon has [Dragon], [saur], or [Ceratopsian] in one of its traits, ＜Draw 1＞.`
- Q3376 (`data/kb/qa.json`) asks whether `[Dragonkin]` satisfies the `[Dragon]` trait reference; the answer is yes because the trait name contains Dragon.
- Rules evidence verified from the comprehensive rules includes exact trait matching (`comprehensive-0035`), attack timing (`comprehensive-0069`), inherited effects (`comprehensive-0160`), once-per-turn effects (`comprehensive-0173`), and draw resolution (`comprehensive-0193`).

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| When Attacking | `EX3-009.ts` uses the `WhenAttacking` trigger | Public attack intent resolves the inherited effect; no injected timing event is used |
| Once Per Turn | The compiled effect declares `frequency: "OncePerTurn"` | Two attacks in one turn produce one draw; a real end-turn/next-turn loop permits the effect again; two copies track independently |
| This Digimon has one of the listed traits | The `selfHasTrait` filter checks `Dragon` and `saur` with `traitContains`, `Ceratopsian` with `traitContains`, and `Dragonkin` with exact `trait` matching | Positive fixtures cover Dragon, Dinosaur/saur, Ceratopsian, and Dragonkin; Puppet is a negative carrier |
| Draw 1 | The action is `Draw`, controller `mine`, amount `1` | Hand gains exactly one card, including from the realistic evolved stack |

#### Q&A coverage

Q3376 is explicitly covered by the Dragonkin positive fixture (EX3-008): the effect draws when the attacking Digimon has Dragonkin in a trait, reconciling the KB answer with the implementation's trait-containing behavior. The implementation also retains an exact Dragonkin reference alongside the broader Dragon/saur/Ceratopsian checks so the printed condition and KB interpretation are both executable.

#### Peer and evolution-stack proof

The evolution test verifies the catalogued red level-4 route at cost 3 and rejects a purple level-4 source. The multi-step public fixture evolves EX3-008 into EX3-009 and then BT1-026, preserving the stack and proving the inherited effect still sees the top Digimon's Dragon trait. No Digi-Egg is placed in a deck or security fixture.

#### Changes

- No card-local executable defect was found in `EX3-009.ts`; it already has complete IR, no residuals, and exclusive `registerIrCard("EX3-009", compiled)` registration.
- Strengthened `EX3-009.test.ts` with full catalog/IR identity assertions, exact trait-resolution coverage including Q3376, invalid evolution-source proof, a real public turn-loop reset, independent-copy coverage, empty-deck behavior, and the realistic EX3-008 → EX3-009 → BT1-026 stack.
- No shared engine, catalog, or out-of-scope file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-009` — **PASS**; Q3376 returned and was reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-009.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 13 tests).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-009.ts apps/api/src/cards/EX3/EX3-009.test.ts` — **PASS**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-009.ts apps/api/src/cards/EX3/EX3-009.test.ts` — **PASS**.
- `git diff --check` — **PASS** for the tracked card changes.
- Root typecheck — **deferred by coordinator resource policy**. The known baseline API failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: none card-local. Collection gates, root typecheck, and delivery gates remain coordinator-owned.

### EX3-010 — Paildramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-010 as Paildramon, a red/purple level-5 Ultimate/Free/Dragonkin Digimon, play cost 8, 8000 DP, with red and purple level-4 evolution routes at cost 4.
- Main effect: `DNA Digivolution: 0 from red Lv.4 + purple Lv.4`; when DNA digivolving, optionally play exactly one `[Dinobeemon]` from your trash without paying its cost.
- Deletion effect: optionally play exactly one `[Veemon]` from your trash without paying its cost.
- Inherited effect: `[Your Turn] While this Digimon has [Imperialdramon] in its name, it gains ＜Security Attack +1＞.`
- `node tools/kb/query.mjs card EX3-010` returned no card-specific Q&A or errata. Rules evidence used for the audit covers DNA Digivolution material/stack handling, digivolution costs, trigger timing, inherited effects, exact bracketed-name matching, optional effects, and Security Attack resolution.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| DNA Digivolution: 0 from red Lv.4 + purple Lv.4 | `EX3-010.ts` declares `dnaDigivolveRequirement` with cost `0` and both color/level materials | Public `dnaDigivolve` forms a single EX3-010 top over both materials, leaves memory unchanged, and an invalid red+red pair is rejected without consuming cards |
| When DNA digivolving, optional `[Dinobeemon]` from trash without cost | The `WhenDigivolving` action is optional, `from: ["trash"]`, `payCost: false`, exact `nameExact` Dinobeemon, and gated by `isDnaDigivolving` | The public DNA flow exposes an optional decision before the exact candidate selection; both EX3-061 and ST9-11 are legal, BT1-009 is not, and accepting ST9-11 moves it from trash to the battle area without changing memory. Declining leaves Dinobeemon in trash |
| Normal level-4 digivolution does not activate the DNA-only clause | The Dinobeemon action has the explicit `isDnaDigivolving` processing condition | Public red and purple level-4 evolutions each cost 4 memory and produce no EX3-010 Dinobeemon decision |
| On Deletion, optional `[Veemon]` from trash without cost | The `OnDeletion` action is optional, `from: ["trash"]`, `payCost: false`, and exact `nameExact` Veemon | A public attack deletes Paildramon, settles the deletion trigger, and plays EX3-004 Veemon from its owner's trash. The candidate proof includes exact ST8-04 Veemon while excluding ExVeemon and DemiVeemon; declining leaves Veemon in trash |
| Inherited Security Attack +1 on your turn only for Imperialdramon names | The inherited `YourTurn` aura grants one `SecurityAttack` and uses `selfHasNameContaining: ["Imperialdramon"]` | Public player attacks show two security checks for an Imperialdramon carrier, one for a non-Imperialdramon carrier, and no keyword during the opponent's turn |

#### Exact-name, ownership, stack, cost, and ordering proof

The Dinobeemon and Veemon filters use exact bracketed-name matching, so same-name cards remain legal while near names such as ExVeemon and DemiVeemon remain excluded. All play actions target the controller's own trash and use `payCost: false`; the tests assert the source card leaves trash and no memory is paid. The DNA test uses the public evolution intent and settles the stack before responding to the optional effect, proving the material stack and trigger ordering. The normal evolution tests separately prove the catalogued cost 4 route for each color. The deletion positive test uses a public attack to create the deletion event and settles the deletion trigger before checking the played card.

#### Changes

- No card-local executable defect was found in `EX3-010.ts`; it already had complete IR, no residuals, and exclusive `registerIrCard("EX3-010", compiled)` registration. The compiled value is exported solely for structural audit assertions.
- Strengthened `EX3-010.test.ts` with exact IR/requirement assertions, public DNA stack and zero-cost proof, normal evolution cost/stack assertions, and invalid-material rejection. Existing tests cover optional decline, exact-name candidate boundaries, public deletion, and inherited Security Attack behavior.
- No shared engine, catalog, or out-of-scope file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-010` — **PASS**; no card-specific entries returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-010.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 13 tests).
- Root typecheck — **deferred by coordinator resource policy**. The known baseline API failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`.
- Broad tests/build/install — **not run** per coordinator disk and resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: none card-local. Collection gates, root typecheck, and delivery gates remain coordinator-owned.

### EX3-011 — Lavogaritamon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:77752-77786` identifies EX3-011 as a red level-5 Ultimate/Virus/Rock Dragon Digimon, play cost 8, 7000 DP, with red or black level-4 evolution costs of 3.
- On Play: delete 1 of your opponent's Digimon with 5000 DP or less. Then, you may play 1 [Hina Kurihara] from your hand without paying the cost.
- Inherited: `[All Turns][Once Per Turn] When an opponent's Digimon is deleted, if this Digimon has an [On Play] effect, gain 1 memory.`
- `node tools/kb/query.mjs card EX3-011 --json` returned no errata and no card-specific Q&A. General Once Per Turn and trigger/deletion rules were applied from `data/kb/rules/glossary.md` and `data/kb/rules/comprehensive.md`.

#### Clause-to-IR-to-test mapping

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| On Play deletes one opposing Digimon at 5000 DP or less | `EX3-011.ts:11-26`, opponent Digimon filter, `dp.lte 5000`, count 1 | `EX3-011.test.ts:129-162` records the public candidate boundary (3000/5000 included, 6000 excluded); `:164-198` resolves deletion and preserves 6000 |
| Then may play Hina from hand for free | `EX3-011.ts:27-44`, exact name filter, `from: ["hand"]`, `payCost: false`, optional | `:164-198` proves Hina reaches play; `:200-249` manually resolves deletion first, verifies the target is already in trash while Hina remains in hand, then accepts Hina; `:372-406` declines and keeps Hina in hand |
| Inherited All Turns deletion trigger | `EX3-011.ts:47-70`, inherited `AllTurns` SubTrigger watching opponent Digimon deletion | `:251-286` uses Hina to reactivate an On Play deletion and observes memory; `:353-370` rejects a carrier whose top card has no On Play effect |
| Once Per Turn and reset | `EX3-011.ts:69-70` | `:288-351` performs two deletions in one controller turn (memory 10 -> 2, no second gain), completes public turns, then performs a third deletion on the next controller turn and observes the reset gain (memory 1) |
| Evolution requirements | Catalog red/black level-4 routes, cost 3 | `:83-106` publicly evolves from BT1-014 red and BT10-061 black, asserts source stack identity and memory 4 -> 1; `:108-127` rejects blue BT1-032 and keeps EX3-011 in hand |

#### Peer and stack proof

The inherited positive uses BT2-018 on top of EX3-011, so EX3-011 remains the source card in the stack while the carrier visibly has an On Play effect. The negative uses BT1-009 on top of EX3-011, proving the condition reads the carrier's current top-card effect rather than merely the presence of EX3-011 underneath. The reset fixture uses three independent EX3-011 cards and three opposing Digimon, proving same-turn suppression and next-turn reset through public `runOneTurn()` calls. No Digi-Egg or numeric security fixture is used.

#### Changes

- No executable card-module defect found. `EX3-011.ts` already has complete IR, empty residuals, and exclusive `registerIrCard("EX3-011", compiled)` registration.
- Strengthened `EX3-011.test.ts` with exact catalog/IR assertions, explicit 5000/6000 boundary proof, manual mandatory-before-optional Hina ordering, red/black evolution positives, blue invalid-source negative, and a three-deletion once-per-turn/reset stack fixture.

#### Verification

- `node tools/kb/query.mjs card EX3-011 --json` — **PASS**; no errata or card-specific Q&A returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-011.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 12 tests).
- Root typecheck, oxlint, oxfmt, and `git diff --check` — **deferred by coordinator disk policy** (less than 1 GiB free; only the focused Vitest was permitted for this lane).

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

Remaining gaps: static quality gates and typecheck remain coordinator-deferred under the disk/resource policy; no card-local behavior gap remains.

### EX3-012 — Volcanicdramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:77783-77820` identifies EX3-012 as a red level-6 Mega/Virus/Earth Dragon Digimon, play cost 12, 12000 DP, with red or black level-5 evolution costs of 4.
- On Play: delete all of your opponent's Digimon with the lowest DP. If no Digimon is deleted by this effect, your opponent can't play Digimon with 5000 DP or less until the end of their turn.
- Inherited: `[When Attacking] If you have a Tamer in play, trash the top card of your opponent's security stack.`
- `node tools/kb/query.mjs card EX3-012 --json` returned Q3430, Q3431, Q4669, Q4670, Q4671, Q4672, and Q6508; no errata.
- Q3430/Q3431 (`data/kb/qa.json:36757-36770`) govern two Hina activations and trigger provenance: resolve Hinas one at a time, and a deleted Digimon's On Deletion triggers before the second Hina activation.
- Q4669-Q4672 (`:36771-36796`) define the seat-level play prohibition: it blocks the opponent's action/effect plays, leaves reveal processing intact when the revealed card cannot be played, does not block the source player's effect from playing an opponent's card, and does block the opponent's Digimon when an opponent effect tries to play it. Q6508 (`:36799-36804`) confirms the prohibition also applies to play into the breeding area.

#### Clause-to-IR-to-test mapping

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Delete all opposing Digimon tied for lowest DP | `EX3-012.ts:10-26`, opponent Digimon, `superlative: "lowestDP"`, count `all` | `EX3-012.test.ts:72-107` deletes both 3000-DP ties and preserves 6000 DP; the 5000/6000 boundary is also exercised at `:154-207` |
| If no deletion, prohibit opponent play of Digimon <=5000 until opponent turn end | `EX3-012.ts:27-43`, `RestrictPlay`, `seat: "opponent"`, `dpAtMost: 5000`, `mode: "play"`, `duration: "untilOpponentTurnEnd"`, `ifThisEffectDidNotDelete` | `:109-152` uses Evade to produce the actual no-deletion receipt and rejects a 5000-DP hand play; `:154-207` accepts 6000 DP and proves expiry on a later opponent turn; `:375-427` proves an effect-driven <=5000 breeding-area play is blocked (Q6508) |
| Inherited When Attacking security trash | `EX3-012.ts:46-73`, `isInherited: true`, `SecurityManipulation` gated by a Tamer | `:214-269` uses a legal stack with EX3-012 below the attacker, a Tamer, and event ordering showing the effect trash precedes the normal security check; `:270-306` confirms Hina reactivation after digivolution |
| Red/black evolution routes | Catalog costs and colors | `EX3-012.test.ts:83-141` publicly evolves from BT1-020 red and BT10-064 black, asserts source stack identity and memory 5 -> 1, and rejects blue BT1-038 while retaining EX3-012 in hand |

#### Q&A and interaction provenance

- Q3430 is directly covered by `EX3-012.test.ts:308-339`: two physical Hinas suspend independently and produce two separate optional activation decisions for EX3-012’s On Play effect. EX3-065’s colocated Q3430 tests provide the neighboring Hina trigger proof as well.
- Q3431 is directly covered by `:341-373`: BT1-035 is the deleted lowest-DP opponent Digimon and its registered On Deletion effect gains memory for the opponent (memory becomes -2 from the controller’s perspective). The event receipt is observed, both Hina decisions resolve separately, and the deleted-card trigger is not conflated with the second Hina activation.
- Q4669 is covered by the direct hand-play rejection and >5000-DP positive. Q4670-Q4672 are generic scope semantics of the same seat-level `RestrictPlay`: the card’s IR does not restrict reveal itself, source-seat effects are not treated as opponent actions, and the restricted opponent’s own/effect-driven plays are blocked. Existing engine restriction tests cover those generic cross-seat distinctions; this lane adds the card-local boundary and breeding proof.
- Q6508 is covered by the BT23-084 effect-driven play fixture: after EX3-012 arms the restriction through Evade, the opponent can establish the Tamer/Hudie prerequisites but Lopmon is not placed in the empty breeding area.

#### Changes

- Fixed a card-local defect in `EX3-012.ts`: the inherited When Attacking effect was missing `isInherited: true`. This prevented correct source-stack semantics and could execute the security clause from a top card.
- Strengthened `EX3-012.test.ts` with exact catalog/compiled-IR assertions, Q3430/Q3431 provenance, Q6508 breeding restriction behavior, and a registered BT1-035 On Deletion peer fixture.
- No shared engine, catalog, or other card behavior was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-012 --json` — **PASS**; Q3430/Q3431/Q4669-Q4672/Q6508 reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-012.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 14 tests).
- `pnpm exec oxfmt apps/api/src/cards/EX3/EX3-012.ts apps/api/src/cards/EX3/EX3-012.test.ts docs/audits/EX3-reaudit/EX3-012.md` — **PASS**.
- `git diff --check` — **PASS**.
- Root typecheck and oxlint — **deferred by coordinator disk policy** (less than 1 GiB free; no install/build/broad commands permitted).

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

Remaining gaps: static gates and typecheck are coordinator-deferred under the disk policy; no card-local behavior gap remains.

### EX3-013 — Chaosdramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-013 as Chaosdramon, a red/black level-6 Mega/Virus/Machine Digimon, play cost 12, 12000 DP, with red and black level-5 evolution routes at cost 4.
- Alternate evolution: `Digivolve: 1 from [Machinedramon]`.
- `[On Play][When Digivolving]` effect: place up to 3 red and black level-5 cards with `[Cyborg]` in their traits and different card numbers from hand and trash under this Digimon as bottom digivolution cards; De-Digivolve 1 of an opponent's Digimon for each card placed.
- `[All Turns]` replacement: when this Digimon would be deleted or returned to hand or deck, optionally trash 2 level-5 cards from its digivolution cards to prevent it from leaving play.
- Q2212 and Q2213 are interaction rulings, not isolated EX3-013 text questions. Q2212 concerns BT12-072 gaining EX3-013's replacement while also gaining its own deletion-triggered security trash effect. Q2213 concerns BT12-072's All Turns effect making the EX3-013 When Digivolving effect active immediately after digivolving from EX3-013.
- Rules evidence: comprehensive rules §8-2-2-2/§8-2-2-3 cover DNA/stack ordering principles; §16-12 covers De-Digivolve; the replacement and immediate trigger sections cover processing when a Digimon would leave play. The local Q&A answers Q2212 and Q2213 are recorded in `data/kb/qa.json` and returned by `node tools/kb/query.mjs card EX3-013`.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Standard red/black level-5 evolution at cost 4 | Catalog evolution costs are preserved; the module has no competing standard override | Public red and black level-5 routes each move memory 5 → 1 and preserve the source below EX3-013 |
| Alternate `[Machinedramon]` route at cost 1 | `digivolutionRequirement` is `{ names: ["Machinedramon"], cost: 1, isAlternate: true }` | Public alternate digivolution from BT11-072 moves memory 2 → 1 and preserves BT11-072; a blue level-5 non-Machinedramon source is rejected with no memory or stack mutation |
| On Play placement and scaling De-Digivolve | `OnPlay` is an optional `DeDigivolve` with `amount: 1`, placement cost from hand/trash, red/black level 5 filter, `[Cyborg]` trait, `distinctCardNumbers`, bottom position, and `usePaidCount` scaling | Public play settles three legal Cyborg sources into the stack, leaves an ineligible non-Cyborg in trash, de-digivolves once per placed card, and proves zero/one/two/three paid-card endpoints plus optional refusal |
| When Digivolving placement and scaling De-Digivolve | The `WhenDigivolving` action is structurally identical to the `OnPlay` action | Public digivolution settles the target de-digivolution, consumes the selected source, and exposes candidate/visibility/distinct-card boundaries |
| All Turns leave-play replacement | `AllTurns` uses `Replacement`, `event: "wouldLeavePlay"`, `mode: "prevent"`, self source filter, optional activation, and a cost that trashes exactly two self level-5 Digimon cards | Public battle deletion, return-to-hand, and return-to-deck flows each preserve the permanent only when two level-5 sources exist; a one-source battle deletion reaches the trash; non-cost stack cards remain in place |

#### Q&A reconciliation

##### Q2212 — interaction ruling: gained deletion trigger plus EX3-013 replacement

Q2212 is keyed to EX3-013 but describes BT12-072 Chaosdramon (X Antibody) with EX3-013 in its stack. BT12-072 contributes the gained `[All Turns][Once Per Turn]` deletion trigger that trashes the opponent's top security; EX3-013 contributes the independent optional `wouldLeavePlay` replacement. The focused test now uses the public Gaia Force `playCard` intent to attempt deletion, settles the gained security-trash processing, and then asserts that EX3-013 remains in play after exactly two level-5 cards are paid. It also verifies the non-cost cards remain in the stack and the top security instance reaches the opponent's trash.

The reusable engine mechanism fires the endangered permanent's self-anchored deletion watcher before consulting the leave-prevention replacement, then excludes that self watcher from the actual deletion pass. The public regression and mechanism evidence are recorded in `apps/api/src/engine/deletionSeams.test.ts` and the gained-on-deletion-before-would-leave-replacement mechanism under Mechanisms; there is no retained Q2212 engine gap for this card proof.

##### Q2213 — interaction ruling: gained EX3-013 When Digivolving effect

Q2213 is keyed to EX3-013 but asks about BT12-072 digivolving from EX3-013. The test performs that public alternate digivolution, asserts memory 2 → 0 for BT12-072's cost, and verifies the resulting stack. BT12-072's gained-effects grant is active as soon as the digivolution is confirmed, so EX3-013's placement/De-Digivolve effect resolves immediately: the opponent's target exposes its source, and the selected red level-5 Cyborg is consumed from hand into the bottom of the new stack.

#### Stack, source, cost, and boundary proof

All legal material tests assert source-card identity and final `Permanent.stack` state; the engine's stack excludes the top card, so top-card identity is asserted separately. Placement tests mix hand and trash sources, include a non-Cyborg negative, include duplicate copies while enforcing different card numbers, and verify bottom placement. Replacement tests distinguish level-5 cost cards from the retained level-3/level-6 sources and verify final zones. No Digi-Egg is used in deck or security fixtures.

#### Changes

- No card-local executable defect was found in `EX3-013.ts`; its complete IR, replacement scope, placement filters, scaling, and exclusive `registerIrCard("EX3-013", compiled)` registration were already correct. The compiled value is exported solely for structural audit assertions.
- Strengthened `EX3-013.test.ts` with exact IR assertions, standard and alternate evolution cost/source proof, invalid alternate-source rejection, complete stack assertions, and explicit Q2212/Q2213 interaction endpoints.
- No shared engine, catalog, Q&A, or out-of-scope file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-013` — **PASS**; Q2212 and Q2213 returned and were reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-013.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 19 tests; public Q2212 Gaia Force path).
- `git diff --check` — **PASS** for the tracked EX3-013 card/test changes.
- Root typecheck — **deferred by coordinator resource policy**. The known baseline API failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`.
- Broad tests/build/install — **not run** per coordinator disk and resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2** (public Q2212 Gaia Force deletion proves the gained trigger, replacement cost, surviving stack, and zone endpoints)
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Collection gates, root typecheck, and delivery gates remain coordinator-owned.

### EX3-014 — Dorbickmon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-014 as Dorbickmon, a red level-6 Mega/Virus/Dragonkin/Big Death-Stars Digimon, play cost 13, 12000 DP, with a red level-5 evolution route costing 4. The catalog image is `EX3-014-Errata`.
- Official errata: `data/kb/errata.json:535-549` (2022-11-11) changes both the DigiXros family and the deletion scaling family from only `[Dragon]` to `[Dragon]`, `[saur]`, or `[Ceratopsian]` in one of a card's traits. The errata is read as the playing text.
- Printed contract: `[DigiXros -2]` up to 5 differently named Digimon cards from the Dragon-family; on play, place materials from hand/battle area under this card and reduce play cost by 2 per card; `<Rush>`; `[On Play] Delete 1 of your opponent's Digimon with 3000 or less`, adding 2000 to the DP ceiling for each qualifying card in this Digimon's digivolution cards.
- Q3377 (`data/kb/qa.json:36824-36828`) confirms that `[Dragonkin]` is included by the errata's trait-substring wording.
- Q6718 and Q6719 are provenance-linked references, not Dorbickmon's own rulings: the actual entries are keyed under EX7-014 and EX7-049 respectively, each with `related: ["EX3-014"]`. They ask whether the selected EX7 card's own `[All Turns]` effect may activate when that card is chosen for EX3-014's DigiXros; both answer yes. The duplicate entries surfaced under the EX3-014 query have empty `related` arrays. Neither ruling adds an EX3-014 effect or changes its material/deletion contract.
- Rules evidence covers trait substring matching (2-3-2-4), DigiXros per-material cost reduction and source movement (7-2-2-1 through 7-2-2-9), unspecified deletion targets in the battle area (15-1-7), and numeric ceiling additions (15-15-4-1).

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| DigiXros -2, up to 5 differently named Dragon-family Digimon | `EX3-014.ts` declares one trait-substring material slot with `differentNames: true`, `count: 2`, and `maxMaterials: 5` | Public DigiXros uses five distinct names; duplicate-name and sixth-material declarations are rejected; a non-family Puppet and a Dragon-trait Option are rejected |
| Place materials from hand/battle area under this card and reduce cost per card | The DigiXros requirement uses the default hand/battle-area sources and count 2 | Five materials move under Dorbickmon, a field source's underlying card is trashed according to DigiXros stack rules, and memory moves 13→10; the one-material Q3377 case moves 13→2 |
| Rush | The static effect publishes the `Rush` keyword | The five-material play attacks immediately and remains in the battle area after the settled attack |
| On Play delete an opponent's Digimon with 3000 or less | The `OnPlay` `Delete` action targets opponent Digimon with `dp: lte 3000`, count 1 | The no-DigiXros case deletes exactly 3000 and leaves 4000; every scaled case deletes only the boundary target and leaves the above-boundary target |
| Add 2000 per qualifying card in this stack | `dpCeilingScaling` counts `digivolutionCards` on self and filters Digimon whose traits contain Dragon, saur, or Ceratopsian | Five mixed-family materials raise the ceiling to 13000; one Dragonkin material raises it to 5000; no materials retain 3000; 14000/6000 negatives prove exact ceilings |

#### Q&A and trait-family coverage

Q3377 is exercised with EX3-008 Flamedramon, whose `[Dragonkin]` type is a positive substring-family material and stack card. The five-material public case separately includes an inert Dinosaur (`BT1-011`, matching `saur`), Fire Dragon (`EX3-006`), Ceratopsian (`BT10-050`), Dragonkin (`EX3-008`), and Rock Dragon (`EX3-007`), proving all errata branches and their 2000-per-card scaling without importing an unrelated inherited effect. BT1-038 Puppet is a meaningful non-family Digimon negative. Q6718/Q6719 are explicitly reconciled above as EX7 card-effect provenance references; no EX7 behavior is incorrectly attributed to EX3-014.

#### Cost, source, stack, and negative proof

The public five-material flow starts at memory 13, pays Dorbickmon's 13-cost minus five reductions (13→10), places four hand cards and the battle-area top card under Dorbickmon, and leaves the underlying BT1-009 in trash as required when a field material contributes its top card. The one-material Dragonkin flow costs 11 (13→2), while normal play with no DigiXros costs 13 (13→0). The tests reject repeated printed names, a sixth otherwise eligible material, an ineligible trait, and a Dragon-trait Option. All fixtures use Digimon cards only; no Digi-Egg is placed in deck or security.

#### Changes

- No card-local executable defect was found in `EX3-014.ts`; its complete IR has no residuals and registers exclusively through `registerIrCard("EX3-014", compiled)`.
- Strengthened `EX3-014.test.ts` with catalog and official-errata identity assertions, exact DigiXros registration parity, all three trait-substring families plus Q3377 Dragonkin, explicit source movement and cost assertions, and a non-family Digimon negative.
- No shared engine, catalog, KB, or out-of-scope file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-014 --json` — **PASS**; official errata, Q3377, and Q6718/Q6719 provenance were returned and reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-014.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 8 tests).
- Root typecheck — **deferred by coordinator resource policy**. The known baseline API failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`.
- Broad tests, build, install, and generated logs — **not run** per coordinator disk/resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: none card-local. Collection gates, root typecheck, and delivery gates remain coordinator-owned.

### EX3-015 — Crabmon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:77868-77890` identifies EX3-015 as Crabmon, a blue level-3 Rookie/Data/Crustacean Digimon, play cost 3, 2000 DP, with a blue level-2 evolution cost of 0.
- Main text: `[On Play] 1 of your blue Digimon gains ＜Jamming＞ for the turn.`
- Conditional text: `When played from digivolution cards, you may place 1 blue level 5 or lower Digimon card from your hand under that Digimon as its bottom digivolution card.`
- Q3378 (`data/kb/qa.json`) answers that “that Digimon” refers to the blue Digimon selected by the On Play effect, not Crabmon merely because Crabmon was played from digivolution cards.
- No card-specific errata was returned. Applicable comprehensive-rule evidence covers play/evolution source zones, selecting a controller's Digimon, temporary keyword duration, and bottom-stack placement.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| On Play select 1 of your blue Digimon | `EX3-015.ts` uses `SelectBind` with `controller: "mine"`, `kind: ["Digimon"]`, `colors: ["Blue"]`, count 1, bound as `jammingTarget` | Candidate inspection includes the owned blue Digimon and excludes the owned red Digimon; the settled hand-play and Q3378 flows use the selected target |
| That selected Digimon gains Jamming for the turn | `GainKeyword` reads `fromSelectionRef: "jammingTarget"`, grants `Jamming`, and uses `duration: "forTheTurn"` | Hand play grants Jamming to the chosen recipient; Q3378 proves the recipient, not the Crabmon source/attacker, receives it |
| When played from digivolution cards | `PlaceUnder` is gated by `playedFromZone: "digivolutionCards"` | Normal hand play does not open placement or move the eligible hand card; EX3-022's public attack flow plays Crabmon from its stack and does open placement |
| May place 1 blue level 5 or lower Digimon card from hand | The optional target is hand, controller-default mine, Digimon, blue, and `levelComparison: lte 5`, count 1 | Q3378 places blue level-5 BT1-038; optional refusal leaves it in hand; red level 5 and blue level 6 candidates remain in hand |
| Under that Digimon as its bottom digivolution card | `underSelectionRef` is `jammingTarget` and `position: "bottom"` | The placed card leaves hand, is in the selected recipient's stack at the bottom, and is not under the attacking source |

#### Q3378 and source/target reconciliation

Q3378 is proven through a public attack, not an injected timing call. EX3-022 plays EX3-015 from its own digivolution cards; EX3-015's On Play selection chooses a separate blue recipient. The eligible blue level-5 hand card is placed under that recipient, while the attacking source's stack does not receive it. This directly establishes that “that Digimon” means the selected blue Digimon. The normal hand-play case establishes the source-zone gate's negative: Jamming resolves, but the conditional placement does not.

#### Evolution-stack and boundary proof

The evolution test uses a blue level-2 Digi-Egg in the breeding area and asserts the printed cost-0 route, top-card transition, and preserved source stack. A red level-2 Digi-Egg is rejected without moving the hand card or changing memory. The eggs are confined to breeding; no Digi-Egg is placed in deck or security. Selection and placement negatives cover red/non-blue targets and a blue level-6 card, while the optional-decline path proves no source movement on refusal.

#### Changes

- No card-local executable behavior defect was found. `EX3-015.ts` already had complete IR, no residuals, and exclusive `registerIrCard("EX3-015", compiled)` registration.
- Exported the existing compiled value for direct audit assertions and strengthened `EX3-015.test.ts` with exact catalog/IR identity, Q3378 target/source proof, source-zone and final-stack assertions, target-level/color negatives, optional refusal, and the legal/illegal evolution-stack routes.
- No shared engine, catalog, or out-of-scope file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-015 --json` — **PASS**; Q3378 returned and was reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-015.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 7 tests).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-015.ts apps/api/src/cards/EX3/EX3-015.test.ts` — **PASS**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-015.ts apps/api/src/cards/EX3/EX3-015.test.ts docs/audits/EX3-reaudit/EX3-015.md` — **PASS**.
- `git diff --check` — **PASS** for the tracked card changes.
- Root typecheck — **deferred by coordinator resource policy**. The known baseline API failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`.
- Broad tests, build, install, and generated logs — **not run** per coordinator disk/resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: none card-local. Collection gates, root typecheck, and delivery gates remain coordinator-owned.

### EX3-016 — SnowAgumon

#### Scope and catalog evidence

- Catalog identity verified from `packages/shared/src/cards/data/cards.json`: blue level 3 Digimon, play cost 3, 2000 DP, Vaccine/Dinosaur, blue level 2 evolution for 0, with inherited text: `[Opponent's Turn] When an opponent's Digimon with no digivolution cards would digivolve, increase the digivolution cost by 1.`
- The catalog has no EX3-016 errata.
- The direct module is compiled IR only and registers only through `registerIrCard("EX3-016", compiled)`.

#### Clause and Q&A evidence

The existing module maps the printed clause to an inherited `OpponentsTurn` replacement for `wouldDigivolve`. Its source filter requires an opponent-controlled Digimon with no digivolution cards, and the replacement increases the event cost by exactly 1. `coverage: "full"` and `residual: []` are asserted in the colocated test.

- Q3379: two inherited copies stack to +2 on one ordinary evolution from a source-less Digimon.
- Q3380: one DNA evolution with two source-less materials receives only one +1 increase; the resolved DNA stack and final memory are asserted.
- Q3381: one source-less and one sourced DNA material still receives one +1 increase.
- Q3382: a red Tamer with no cards underneath is treated as source-less for BT4-011 Agunimon; final cost and stack are asserted.
- Q3383: a red Tamer or Digimon with a card underneath is not source-less; both the no-increase memory result and public stack are asserted.
- Q3384: an otherwise legal evolution that cannot pay the increased cost fails with `insufficient-memory`, leaves the source unchanged, and leaves the revealed card in hand.
- Q3348 is related-card provenance for EX3-019: it explains that EX3-019's separate `[When Digivolving]` Blitz effect activates before this SnowAgumon cost increase can make the evolution fail. EX3-016 has no Blitz clause, so no Blitz behavior is attributed to this card.

#### Behavioral and stack proof

The focused suite uses public `digivolve` and `dnaDigivolve` intents followed by `settle()`. It proves the controller-turn boundary, ordinary evolution cost, two inherited copies, source-present negative behavior, Q3379-Q3384 semantics, insufficient-memory failure, public evolution-stack identity, and an invalid red-to-blue evolution source. The only timing-ledger assertion is supporting structural evidence; behavioral credit comes from the public intents and observable memory/zones/stacks.

All deck and source fixtures use inert main-deck Digimon (`BT1-009`/`BT1-030`); no Digi-Egg or numeric security fixture is used.

#### Changes

- No card implementation change was required; the existing compiled IR matches the catalog clause.
- Strengthened `EX3-016.test.ts` with exact catalog/IR assertions, invalid-source proof, complete source-stack assertions, and Digi-Egg-free source fixtures.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-016.test.ts --maxWorkers=1 --no-file-parallelism`: **10 passed**.
- Typecheck, broad/regression tests, install/build, and formatter/linter/diff gates were deferred under the coordinator's sub-1-GiB disk/resource policy. No git writes were performed.

#### Rubric

| Area | Score |
| --- | ---: |
| Catalog/rules and Q&A | 2/2 |
| Compiled IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Worker total** | **8/10** |

### EX3-017 — Ebidramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:77918-77940` identifies EX3-017 as Ebidramon, a blue level-4 Champion/Data/Aquatic Digimon, play cost 5, 5000 DP, with a blue level-3 evolution route costing 2.
- Main text: `[On Play] 1 of your blue Digimon gains ＜Blocker＞ until the end of your opponent's turn.`
- Source clause: `When played from digivolution cards, unsuspend that Digimon.`
- Q3385 (`data/kb/qa.json`) confirms that “that Digimon” refers to the blue Digimon selected by the On Play effect, not Ebidramon merely because Ebidramon was played from digivolution cards.
- No card-specific errata was returned. Applicable rules evidence covers source-zone conditions, controller/color targeting, temporary keyword duration, unsuspension, and evolution-stack transitions.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| On Play select 1 of your blue Digimon | `EX3-017.ts` uses `SelectBind` with `controller: "mine"`, `kind: ["Digimon"]`, `colors: ["Blue"]`, count 1, bound as `blocker` | The public candidate payload includes the owned blue Digimon and the newly played Ebidramon, excludes the owned red Digimon, and the settled cases use a separate blue recipient |
| The selected Digimon gains Blocker until end of opponent's turn | `GainKeyword` targets `fromSelectionRef: "blocker"`, grants `Blocker`, and uses `untilOpponentTurnEnd` | Hand play grants Blocker without unsuspending a suspended recipient; a public turn flow proves Blocker remains through the controller's turn and disappears after the opponent's turn |
| When played from digivolution cards, unsuspend that Digimon | `Unsuspend` targets the same `blocker` selection and is gated by `playedFromZone: "digivolutionCards"` | Q3385's public source-play flow unsuspends the exact selected recipient, not the source host or Ebidramon; ordinary hand play leaves the recipient suspended |

#### Q3385 and source movement

Q3385 is covered through EX3-023's public When Digivolving play-from-stack flow, not an injected timing call. EX3-017 begins under the EX3-022 source stack; after EX3-023 is digivolved, Ebidramon is played from that stack, selects a different suspended blue Digimon, grants it Blocker, and unsuspends that same target. The assertions prove Ebidramon reaches the battle area, the source host becomes EX3-023, the target is ready, and the target—not the source host—is the one that received the effect. A separate public refusal of EX3-023's optional source-play action leaves Ebidramon stacked and the target unchanged.

#### Target, duration, and evolution boundaries

The target-selection test explicitly rejects a red Digimon while permitting both an existing blue Digimon and the newly played blue Ebidramon. The direct evolution test uses the catalogued blue level-3 route at cost 2 and preserves the source stack; red level 3 and blue level 4 sources are each rejected without moving the hand card or changing memory. These cover both color and level boundaries. The hand-play test proves the source-zone negative (Blocker without unsuspension), while the Q3385 flow proves source movement and unsuspension. No Digi-Egg is placed in deck or security.

#### Changes

- No card-local executable behavior defect was found. `EX3-017.ts` already had complete IR, no residuals, and exclusive `registerIrCard("EX3-017", compiled)` registration.
- Exported the existing compiled value for direct audit assertions and simplified its audit comment to avoid a lint false positive; strengthened `EX3-017.test.ts` with exact catalog/IR identity, Q3385 target/source proof, duration proof, optional upstream refusal, and legal/illegal evolution-stack routes.
- No shared engine, catalog, or out-of-scope file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-017 --json` — **PASS**; Q3385 returned and was reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-017.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 7 tests).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-017.ts apps/api/src/cards/EX3/EX3-017.test.ts` — **PASS**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-017.ts apps/api/src/cards/EX3/EX3-017.test.ts docs/audits/EX3-reaudit/EX3-017.md` — **PASS**.
- `git diff --check` — **deferred under the coordinator RAM gate**; no diff-writing operation was performed.
- Root typecheck — **deferred by coordinator resource policy**. The known baseline API failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`.
- Broad tests, build, install, and generated logs — **not run** per coordinator disk/resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: none card-local. Collection gates, root typecheck, and delivery gates remain coordinator-owned.

### EX3-018 — Coredramon

#### Scope and catalog evidence

- Catalog identity verified from `packages/shared/src/cards/data/cards.json`: blue level 4 Digimon, play cost 5, 6000 DP, Champion/Vaccine/Dragon, normal evolution from blue or green level 3 for 3 memory.
- The printed clauses are `Digivolve: 2 if name contains [Dracomon]`, top-card `Evade`, and inherited `[All Turns] While this Digimon has [Dramon] or [Examon] in its name, it gains ＜Evade＞.`
- The card has no catalog errata and no card-specific KB Q&A.
- The direct module is compiled IR only and registers only through `registerIrCard("EX3-018", compiled)`.

#### Clause-to-IR and behavioral evidence

- The static keyword effect publishes top-card `Evade`.
- The inherited `AllTurns` aura is marked `isInherited: true`, self-scoped, and conditional on the top card's name containing `Dramon` or `Examon`; the compiled test asserts the exact names and keyword.
- The alternate evolution requirement is compiled as a Dracomon-name requirement for cost 2. Public evolution tests prove it from EX3-037 Dracomon, while ordinary blue and green level-3 routes cost 3 and preserve exact source-stack identity.
- A red level-3 source is rejected for the alternate route, with Coredramon remaining in hand and the source stack unchanged.
- The card can be played from hand through the public `playCard` intent. EX3-012's real On Play deletion opens an Evade prompt; accepting through `respondEvade` suspends Coredramon and prevents it from entering trash.
- Existing public Evade response tests prove acceptance, optional refusal/deletion, and the already-suspended boundary with no Evade prompt.
- Existing peer/stack tests prove inherited Evade on EX3-019 Paledramon and EX3-074 Examon, rejection on unrelated BT1-038, and recomputation when a host evolves into a Dramon name. This covers matching, near-matching, and invalid peers.

#### Changes

- No card implementation change was required; the existing IR matches the catalog.
- Strengthened `EX3-018.test.ts` with exact catalog/IR assertions, public play/On Play deletion proof, alternate invalid-source proof, and exact legal evolution-stack assertions.
- No Digi-Egg or numeric security fixture is used.

#### Verification

- Checked that no other Vitest process was active before running the focused command.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-018.test.ts --maxWorkers=1 --no-file-parallelism`: **12 passed**.
- Typecheck, broad/regression tests, install/build, and formatter/linter/diff gates were deferred under the coordinator's sub-1-GiB disk/resource policy. No git writes were performed.

#### Rubric

| Area | Score |
| --- | ---: |
| Catalog/rules and Q&A | 2/2 |
| Compiled IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Worker total** | **8/10** |

### EX3-019 — Paledramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:77974-77997` identifies EX3-019 as Paledramon, a blue level-4 Champion/Data/Dragon Digimon, play cost 5, 5000 DP, with a blue level-3 evolution route costing 2.
- Main text: `[When Digivolving] Trash any digivolution card of 1 of your opponent's Digimon.`
- Inherited text: `[Opponent's Turn] When an opponent's Digimon with no digivolution cards would digivolve, increase the digivolution cost by 1.`
- Q3348 is related to EX3-019 because Paledramon is one of the effects that can increase the later evolution cost, but the ruling's subject is EX2-056's `<Blitz>` effect: EX2-056 gains Blitz even when that later evolution fails. It does not add a Blitz effect to Paledramon.
- Q3386-Q3391 cover stacked copies, DNA timing, Hybrid/Tamer source status, and an unaffordable increased cost. No card-specific errata was returned. Applicable comprehensive-rule evidence covers inherited effects, replacement cost modification, DNA as one evolution event, and evolution-stack/source legality.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| When Digivolving, trash any digivolution card of 1 opponent's Digimon | `EX3-019.ts` uses `TrashDigivolution` with `controller: "opponent"`, `kind: ["Digimon"]`, and `digivolutionCards: "hasAny"`; count/amount are 1 and `choose: true` | The public evolution flow exposes only opponent Digimon with sources, lets the controller choose the host and then an exact stack card, trashes the selected card, and preserves the host's remaining stack |
| Opponent's Turn inherited replacement | The inherited `OpponentsTurn` action installs a `wouldDigivolve` replacement restricted to an opponent Digimon with `digivolutionCards: "none"` | Empty-stack ordinary evolution costs one extra; an already sourced Digimon is not increased |
| Increase the digivolution cost by 1 | The nested replacement is explicitly `mode: "increaseCost", amount: 1` (not a reduction) | Q3386's two physical EX3-019 copies both apply for +2; Q3391 fails before payment when the increased cost is unaffordable |

#### Q3348 reconciliation

Q3348 is deliberately not implemented as a Paledramon ability. Its answer describes a later EX2-056 evolution trigger that activates before the evolution attempt, while EX3-016 SnowAgumon or EX3-019 Paledramon can make that attempt fail by increasing its cost. The test suite therefore proves EX3-019's cost replacement itself and keeps EX2-056's Blitz provenance separate; adding Blitz to EX3-019 would be a cross-card fidelity defect.

#### Q3386-Q3391 and source semantics

- Q3386 is proven with two distinct EX3-019 instances under one opposing Digimon. A blue level-3 base evolving into BT1-032 costs the printed 2 plus both inherited increases (+2); with the opponent-turn gauge at -6, the legal payment ends at -10. The companion -7 case is rejected as `insufficient-memory`, leaving BT1-032 in hand and the base unchanged.
- Q3387 and Q3388 are exercised as DNA evolutions. Two no-source materials still create one DNA evolution event and receive only one +1; one no-source material paired with one sourced material also receives one +1. The tests prove the resulting memory and merged board state.
- Q3389 proves that a red Tamer with no under-card can be used for a Hybrid evolution as if it were level 3, so Paledramon adds +1. Q3390 proves that the same Tamer with an under-card is source-bearing and receives no increase.
- The ordinary sourced-Digimon negative likewise confirms that the replacement is about the evolving Digimon's live stack, not merely the card's printed kind or the presence of Paledramon somewhere on the board.
- Q3391's failed payment preserves both the revealed evolution card in hand and the original stack; successful payments preserve the prior base card beneath the new top. No Digi-Egg is placed in deck or security.

#### Evolution and targeting boundaries

The audit uses the catalogued blue level-3 route and rejects both a red level-3 source and a blue level-4 source without moving the hand card or memory. The When Digivolving target decision excludes an opponent empty-stack Digimon and exposes only source-bearing opponent Digimon. The selected stack-card assertion proves “any digivolution card” is not hard-coded to the top or bottom card.

#### Changes

- No card-local executable behavior defect was found. `EX3-019.ts` already had complete IR, no residuals, and exclusive `registerIrCard("EX3-019", compiled)` registration with the correct increase-cost encoding.
- Exported the existing compiled value for direct audit assertions and strengthened `EX3-019.test.ts` with exact catalog/IR identity, selected-host/selected-card proof, evolution source negatives, Q3386 multiple-copy success and insufficient-memory preservation, and the Q3387-Q3390 DNA/Tamer cases.
- No shared engine, catalog, or out-of-scope file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-019 --json` — **PASS**; Q3348 and Q3386-Q3391 returned and were reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-019.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 9 tests).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-019.ts apps/api/src/cards/EX3/EX3-019.test.ts` — **PASS**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-019.ts apps/api/src/cards/EX3/EX3-019.test.ts` — **PASS**.
- `git diff --check -- apps/api/src/cards/EX3/EX3-019.ts apps/api/src/cards/EX3/EX3-019.test.ts docs/audits/EX3-reaudit/EX3-019.md` — **PASS**.
- Root typecheck — **deferred by coordinator resource policy**. The known baseline API failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`.
- Broad tests, build, install, and generated logs — **not run** per coordinator disk/resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: none card-local. Collection gates, root typecheck, and delivery gates remain coordinator-owned.

### EX3-020 — Wingdramon

#### Scope and catalog evidence

- Catalog identity verified from `packages/shared/src/cards/data/cards.json`: blue level 5 Digimon, play cost 7, 7000 DP, Ultimate/Vaccine/Sky Dragon, normal evolution from blue or green level 4 for 4 memory.
- Printed clauses verified: alternate evolution for 3 from [Coredramon], top-card Evade, own-turn [Examon] level-6 treatment for DNA Digivolution, optional End of Your Turn DNA Digivolution with another [Dramon], and inherited All Turns Evade while the host name contains [Dramon] or [Examon].
- The card has no errata and no card-specific KB Q&A.
- The direct module is compiled IR only and registers only through `registerIrCard("EX3-020", compiled)`.

#### Clause-to-IR and behavioral evidence

- The compiled IR publishes top-card Evade, an own-turn `TreatAsLevel` 6 grant scoped to DNA Digivolution into Examon, an optional `EndOfYourTurn` DNA Digivolve that pays the printed DNA cost, and the inherited conditional Evade aura. The test asserts `coverage: "full"`, `residual: []`, the alternate Coredramon requirement, and these clause boundaries.
- Public evolution tests prove the alternate Coredramon route costs 3 and preserves the exact source stack, while an unrelated blue level 4 uses the printed normal cost 4 and an unrelated level-5 source is rejected for the alternate route with Wingdramon left in hand.
- A public `playCard` of EX3-012 supplies a real On Play deletion against Wingdramon; accepting the Evade response suspends Wingdramon and prevents the move to trash. Existing optional-refusal and already-suspended negative paths prove decline deletes and a suspended body opens no Evade window.
- The inherited aura is proven on EX3-019 Paledramon and rejected on near-miss BT1-038. Its stack identity is asserted, including EX3-020 below the host.
- Public end-of-turn tests prove the optional DNA route, payment/result stack, re-evaluation of a second Wingdramon after the first DNA, optional refusal with unchanged cards/memory, opponent/non-own-turn boundaries, no-option behavior without a legal DNA result, and UI filtering of compatible [Dramon] partners and Examon results. Invalid peers remain visible but are not selectable.
- The static DNA-level observation is supporting evidence for the turn-scoped grant; behavioral credit comes from the public turn loop, `endPhase`, public decisions, and settled observable state. No injected `fire`/`fireTiming` path remains.

#### Changes

- No card implementation change was required; the existing compiled IR matches the catalog.
- Strengthened `EX3-020.test.ts` with exact catalog/IR assertions, public deletion/On Play Evade proof, illegal alternate-source proof, exact evolution-stack checks, and public end-of-turn coverage for all DNA branches.
- No Digi-Egg or numeric security fixture is used.

#### Verification

- Confirmed no Vitest process was active before the focused run.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-020.test.ts --maxWorkers=1 --no-file-parallelism`: **16 passed**.
- Typecheck, broad/regression tests, install/build, and formatter/linter/diff gates were deferred under the coordinator's sub-1-GiB disk/resource policy. No git writes were performed.

#### Rubric

| Area | Score |
| --- | ---: |
| Catalog/rules and Q&A | 2/2 |
| Compiled IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Worker total** | **8/10** |

### EX3-021 — CrysPaledramon

#### Scope and catalog evidence

- Catalog identity verified from `packages/shared/src/cards/data/cards.json`: blue level 5 Digimon, play cost 7, 7000 DP, Ultimate/Data/Dragonkin, evolving from a blue level 4 for 3 memory.
- Printed `[When Digivolving]` text is fully covered: trash any 2 digivolution cards under 1 opponent Digimon, then choose 1 opponent Digimon with no digivolution cards that cannot attack or block until the end of the opponent's turn.
- The card has no errata. KB coverage is Q3392 and Q3393.
- The direct module is compiled IR only and registers only through `registerIrCard("EX3-021", compiled)`.

#### Clause, Q&A, and stack evidence

- The exact catalog identity and compiled IR are asserted: `WhenDigivolving`, opponent Digimon with `hasAny` sources, `amount: 2`, `choose: true`, followed by a separate no-source opponent Digimon target with `attackOrBlock` restriction and `untilOpponentTurnEnd` duration.
- Q3393 is proven with a four-card source stack. The public evolution resolution exposes all four individual source cards, selects the 1st and 3rd cards from the top (non-contiguous), and asserts that only those cards reach trash while the other two remain in the stack.
- Q3392 is proven by selecting one source-bearing Digimon for trash and a different no-source Digimon for the attack/block lock. The same target is also covered in the one-source family case, establishing that the two target choices are independently resolved.
- A one-source case proves the effect trashes as much as possible and still resolves the `Then` restriction on the now-empty Digimon. A no-source board proves the restriction still applies when no source card is trashed.
- The public turn-loop duration test proves both attack and block restrictions, rejects an attack during the opponent's restricted turn, clears them at the opponent-turn-end boundary, and permits a later attack.
- Normal public evolution from blue level 4 costs 3 and preserves exact stack identity. A level-5 source is rejected with `invalid-evolution`, leaving the card in hand and the source stack unchanged.

#### Changes

- No card implementation change was required; the existing compiled IR matches the catalog and Q&A.
- Strengthened `EX3-021.test.ts` with exact catalog/IR assertions, normal/invalid evolution stack proof, and replaced the remaining Digi-Egg source fixtures with inert main-deck `BT1-009` cards.
- No Digi-Egg or numeric security fixture is used.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-021.test.ts --maxWorkers=1 --no-file-parallelism`: **7 passed**.
- Typecheck, broad/regression tests, install/build, and formatter/linter/diff gates were deferred under the coordinator's sub-1-GiB disk/resource policy. No git writes were performed.

#### Rubric

| Area | Score |
| --- | ---: |
| Catalog/rules and Q&A | 2/2 |
| Compiled IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Worker total** | **8/10** |

### EX3-022 — MegaSeadramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-022 as MegaSeadramon, a blue level-5 Ultimate/Data/Aquatic Digimon, play cost 7, 7000 DP, with a blue level-4 evolution cost of 3.
- Main effect: `[When Attacking] You may play 1 blue level 3 Digimon card from 1 of your blue Digimon's digivolution cards without paying its memory cost.`
- Inherited effect: `[When Attacking] [Once Per Turn] You may play 1 blue level 3 Digimon card from 1 of your blue Digimon's digivolution cards without paying its memory cost.`
- Official errata dated 2022-11-11 changes both clauses to use the same exact source phrase, `from 1 of your blue Digimon's digivolution cards`; it also makes the inherited clause's `[Once Per Turn]` formatting explicit. The implementation and catalog are read using that errata.
- Local KB query `node tools/kb/query.mjs card EX3-022` returns no card-specific Q&A (`qa: []`).

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Main `[When Attacking]` may play one card | `EX3-022.ts` has a `WhenAttacking` `PlayWithoutCost`, `count: 1`, `optional: true`, `payCost: false`, sourced only from `digivolutionCards` | Public attack opens one optional decision, exposes only legal candidates, moves the selected source out of a blue host's stack, and plays it to the battle area without memory payment |
| Blue level-3 Digimon and blue-Digimon host boundary | The target filter requires `kind: ["Digimon"]`, `colors: ["Blue"]`, `levels: [3]`; `hostFilter` requires a controller-owned blue Digimon | Candidate proof includes a blue level-3 Digimon, blue level-4, blue Tamer, blue host with red source, red level-3 source, and another legal blue host; only the two legal blue level-3 Digimon sources are candidates |
| Inherited `[When Attacking][Once Per Turn]` | The second identical `WhenAttacking` action has `isInherited: true` and `frequency: "OncePerTurn"` | Two inherited copies activate during one public attack, while a second public attack in the same turn does not re-use an exhausted inherited effect; two public turn transitions reset it and the next own-turn attack plays the remaining source |
| Optional refusal | Both actions are `optional: true` | A public attack declines the one optional prompt; the source remains in its original stack and only one EX3-022 decision is recorded |
| Evolution route | Catalog requires blue level 4 for 3 memory | Public digivolution from EX3-019 moves memory 3 → 0 and preserves EX3-019 below EX3-022 in the evolution stack |

#### Implementation audit

`apps/api/src/cards/EX3/EX3-022.ts` is already compiled IR with complete coverage and
empty residuals. It registers behavior exclusively with
`registerIrCard("EX3-022", compiled)`. Both effects use the same source, controller,
kind, color, and level boundaries required by the errata; only the inherited action
adds `isInherited` and `OncePerTurn`. No card-local executable defect was found.

The focused tests use public attack, decision-response, evolution, and turn-transition
intents. They settle pending effects before checking observable state, assert exact
candidate and visibility boundaries, prove refusal, distinguish the unlimited main
effect from inherited once-per-turn copies, and verify source movement and evolution
stack identity. The candidate fixture includes a blue level-3 Tamer to prove the
`Digimon` kind filter rather than relying only on color and level.

#### Changes

- `EX3-022.ts`: no change; the errata-correct compiled IR was already faithful.
- `EX3-022.test.ts`: strengthened exact errata text, evolution-stack identity, and
  blue level-3/non-Digimon negative coverage; removed an injected `advance.fire`
  check from the inherited-effect proof.
- No engine, shared, catalog, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-022` — **PASS**; no card-specific Q&A returned;
  official 2022-11-11 errata returned and reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-022.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (focused suite; result recorded after the audit edits).
- `git diff --check` — **PASS** for the EX3-022 card/test changes.
- Typecheck, install, build, lint/format, and broad tests — **not run** under the
  coordinator's resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2** (blue host/source boundaries, invalid peers, inherited
  stack copies, and legal evolution stack are exercised)
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining collection, typecheck, and delivery gates are coordinator-owned.

### EX3-023 — Plesiomon

#### Scope and catalog evidence

- Catalog identity verified from `packages/shared/src/cards/data/cards.json`: blue level 6 Digimon, play cost 11, 11000 DP, Mega/Data/Plesiosaur, evolving from a blue level 5 for 3 memory.
- The 2022-11-11 official errata is applied: source-play eligibility is blue level 3, or level 4 or lower with `[Aqua]` or `[Sea Animal]`; the inherited bounce is optional; and the wording is `[All Turns] [Once Per Turn]`.
- KB coverage is Q2109. The direct module is compiled IR only and registers only through `registerIrCard("EX3-023", compiled)`.

#### Clause-to-IR, errata, and Q&A evidence

- The compiled IR is asserted as full with no residuals. Its `WhenDigivolving` `PlayWithoutCost` is optional, sourced only from digivolution cards, requires a blue Digimon host, and separates the blue level-3 branch from the level-4-or-lower `[Aqua]`/`[Sea Animal]` branch. The second optional `PlaceUnder` action places a blue hand Digimon at this Plesiomon's bottom.
- Source-play tests select eligible blue level 3 and level 4 Sea Animal cards, reject invalid level/trait/color/host combinations, prove free play and source removal, and assert the chosen hand card's bottom placement. A separate test proves the placement remains available when the play clause has no legal candidate, and declining play still permits placement.
- Q2109 is proven with an EX3-023 inherited card placed under Plesiomon only after the source play has begun: the played source card does not retroactively activate the inherited watcher, and no All Turns bounce decision is created.
- The inherited `AllTurns` watcher is asserted as optional `OncePerTurn`; it triggers only for a Digimon played from digivolution cards, returns exactly one opponent Digimon of the played card's level to deck bottom, and ignores hand plays. Tests cover same-level candidate filtering and deck-bottom placement.
- Two inherited copies each resolve once on the first source play, are exhausted for the next source play that turn, and reset on the next turn. The optional choice and same-level bounce target are observable through settled decisions and zones.
- Public evolution proof covers the legal blue level-5 route at cost 3 with source-stack identity and an invalid green level-5 route that leaves Plesiomon in hand and the source stack unchanged.

#### Changes

- No card implementation change was required; the existing errata-aware IR matches the catalog and Q&A.
- Strengthened `EX3-023.test.ts` with exact catalog/IR assertions, legal/invalid evolution stack proof, and inert main-deck Digimon replacements for prior Digi-Egg deck fixtures.
- No Digi-Egg or numeric security fixture is used.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-023.test.ts --maxWorkers=1 --no-file-parallelism`: **10 passed**.
- Typecheck, broad/regression tests, install/build, and formatter/linter/diff gates were deferred under the coordinator's sub-1-GiB disk/resource policy. No git writes were performed.

#### Rubric

| Area | Score |
| --- | ---: |
| Catalog/rules and Q&A | 2/2 |
| Compiled IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Worker total** | **8/10** |

### EX3-024 — Slayerdramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-024 as Slayerdramon, a blue level-6 Mega/Vaccine/Dragonkin Digimon, play cost 12, 12000 DP, with blue and green level-5 evolution costs of 4.
- Alternate evolution: `Digivolve: 3 from [Wingdramon] or [Groundramon]`.
- `[All Turns][Once Per Turn]` effect: when this Digimon becomes suspended, unsuspend it.
- Main and inherited `[Start of Opponent's Main Phase]` effect: by suspending 1 of your Digimon with `[Dramon]` or `[Examon]` in its name, your opponent attacks with 1 of their Digimon.
- Official errata dated 2022-11-11 replaces the printed optional wording with the cost/action wording used above. The catalog's `EX3-024-Errata` image and text are read with that errata.
- The local KB returns Q3394–Q3401. Q3394 covers inherited Evade paying by suspension; Q3395–Q3396 establish opponent choice and immediate choice timing; Q3397–Q3398 cover illegal/no-target endings; Q3399 covers simultaneous trigger ordering; Q3400 covers two copies in one timing; Q3401 covers selecting suspended Examon before its own trigger unsuspends it.

#### Clause-to-IR-to-test mapping

| Printed clause / ruling | IR evidence | Behavioral evidence |
| --- | --- | --- |
| All Turns once-per-turn self-unsuspend | `AllTurns` `SubTrigger` on `whenSuspended`, self-filtered `Unsuspend`, `frequency: "OncePerTurn"` | Direct suspension proves one activation per turn; Q3394 uses public Gaia Force against a stack carrying inherited Evade, accepts Evade's suspension cost, and proves Slayerdramon unsuspends and remains in play |
| Errata main forced attack | `StartOfOpponentsMainPhase` `Attack` targets opponent-controlled Digimon, `chooser: "opponent"`, optional activation, with a suspend cost requiring a controller-owned Digimon whose name matches `Dramon` or `Examon` | Public `runOneTurn` flow proves seat 0 pays the cost, seat 1 chooses the attacker and attack target, suspension and attack states, memory, and final security/zone endpoints |
| Q3395/Q3396 choice and timing | Attack target is opponent-scoped and opponent-chosen; attack action drains the current timing window after the cost suspension | Public decision sequence asserts attacker choice is seat 1 and occurs immediately after the seat-0 cost decision; attack target choice is also seat 1 |
| Q3397/Q3398 failure cases | Normal attack target resolution handles a `can't attack` Digimon and an empty candidate set without weakening the cost | Public turn flow chooses BT2-058, which cannot attack, with no attack declaration; a separate public turn pays the cost with no opponent Digimon and ends with no attack |
| Q3399 simultaneous triggers | `drainTimingWindowDuringAttack` defers suspension-trigger processing through the attack declaration | Public EX3-074 cost flow with BT13-026 verifies the opponent's When Attacking resolution precedes Examon's when-suspended resolution, then resolves Examon's unsuspend/suspend effect |
| Q3400 two-copy constraint | Both copies may activate, but each `Attack` enters the same live combat window and cannot declare a second attack while the first is resolving | Public two-copy flow orders and accepts both effects, proves both optional activations and cost candidate boundaries, and observes exactly one attack declaration/security check |
| Q3401 Examon target window | Deferred cost suspension trigger is drained after the forced attack declaration | Q3399's public flow sees Examon still suspended in the attack-target decision, includes it as a legal target, attacks it, then resolves Examon's own trigger afterward |
| Evolution routes | `digivolutionRequirement` contains alternate Wingdramon and Groundramon names at cost 3; catalog contains standard blue/green level-5 costs at 4 | Public alternate routes and standard routes assert memory endpoints and source card identity in the resulting stack; blue level-3 BT1-029 is rejected as an unrelated alternate source without mutation |

#### Implementation audit

`apps/api/src/cards/EX3/EX3-024.ts` is complete compiled IR with `coverage: "full"`,
an empty residual list, and exclusive `registerIrCard("EX3-024", compiled)`
registration. The main and inherited forced-attack actions intentionally share the
errata-correct target, chooser, cost, and timing-window behavior; only the inherited
action is marked `isInherited`. No card-local executable defect was identified.

The tests use public `runOneTurn`, attack, decision-response, Evade-response, and
digivolve intents wherever the timing is reachable. They assert the cost payer,
opponent-selected attacker/target, exact candidate and visible IDs, suspended and
unsuspended states, attack/security endpoints, simultaneous event ordering, two-copy
constraint, Examon target window, optional refusal, and evolution stacks. The direct
`advance.verb.suspend` test remains a narrow once-per-turn control for the self
replacement; the Q3394 public Gaia Force path supplies the inherited-Evade ruling.

#### Changes

- `EX3-024.ts`: no change; the errata-correct compiled IR and timing-window seam were already faithful.
- `EX3-024.test.ts`: added exact errata text and evolution-stack/invalid-source assertions; converted Q3397, Q3398, inherited behavior, and refusal to public turn flows; added public Q3394 inherited-Evade proof; changed Q3399 to a public Examon timing/target-window proof.
- No engine, shared, catalog, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-024` — **PASS**; official errata and Q3394–Q3401 returned and reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-024.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (15/15).
- Fixture/timing sweep — **PASS**; no Digi-Egg deck/security fixtures, numeric security counts, or injected `advance.fire`/`fireSubTrigger`/`fireTiming` calls remain in the EX3-024 test.
- Typecheck, install, build, lint/format, and broad tests — **not run** under the coordinator's resource policy.
- `git diff --check` — **PASS** after the bounded fixes.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2** (15/15 focused tests pass, including Q3394–Q3401 public-flow coverage).
- Peer/stack proof: **2/2** (Examon/Breakdramon-related timing, two-copy ordering, exact cost-name boundaries, and legal/illegal evolution stacks are covered)
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Focused execution and collection, typecheck, and delivery gates remain coordinator-owned.

### EX3-025 — Azulongmon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78139-78162` identifies EX3-025 as Azulongmon, a blue level-6 Mega/Data/Holy Dragon/Four Great Dragons/Four Sovereigns Digimon, play cost 12, 12000 DP, with a blue level-5 evolution route costing 4.
- Main text: `[On Play] Draw 2. Then, if this card was played by [Trial of the Four Great Dragons]'s effect, gain 2 memory. [On Deletion] If you don't have a [Trial of the Four Great Dragons] in play, you may place 1 [Trial of the Four Great Dragons] from your hand in your battle area.`
- Official errata (`data/kb/errata.json:587-598`, dated 2022-11-11) changes the deletion placement from mandatory to optional.
- Q3402 confirms that a Trial placed by Azulongmon's On Deletion effect does not activate Trial's Main Draw 1/place effect; it is only placed in the battle area.
- Four Great Dragons peers used for the interaction proof include EX3-035 Goldramon (a valid trait candidate) and the non-trait BT1-029 negative. No additional EX3-025-specific errata or unresolved engine seam was found.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| On Play, Draw 2 | `EX3-025.ts` uses `Draw`, controller `mine`, amount 2 | Manual play draws exactly two and pays 12; effect-driven play without Trial provenance draws two without gaining memory; Trial Delay play draws two |
| If played by Trial's effect, gain 2 memory | The second On Play action is `GainMemory` 2 gated by `triggerPlayedByEffectSource: EX3-069` | Public Trial Delay selects Azulongmon, proves the source card provenance, and ends at +2 memory; an ordinary effect-driven play and manual play do not gain the bonus |
| On Deletion, if no Trial is in play, you may place one Trial from hand | The On Deletion action is optional, gated by `youHaveNone`, and targets one owned hand Option whose name matches Trial of the Four Great Dragons | Q3402's public deletion flow exposes the optional prompt, validates multiple Trials against a non-Trial card, places exactly the selected Trial, and leaves Trial's deck draw untouched |

#### Q3402 and Trial activation

The Q3402 flow uses the public deletion intent and full decision settlement. Accepting the errata choice opens a hand-card selection containing both Trial copies but rejects BT1-029; after selecting a Trial, it is placed directly into the battle area, the other Trial remains in hand, and no Draw 1 occurs. The separate refusal path leaves Trial in hand. A Trial already in play suppresses the Azulongmon optional decision entirely, while an opponent's Trial does not satisfy the controller-local gate and therefore does not block placing the controller's own Trial. Two simultaneous Azulongmon deletions recheck the live board and place only one Trial.

The public Trial Delay test proves the Four Great Dragons peer boundary: EX3-025 and EX3-035 Goldramon are offered, BT1-029 is visible but not a candidate, and selecting Azulongmon plays it from hand without cost. Azulongmon's On Play Draw 2 and +2-memory provenance then resolve through the normal public activation flow. No direct `effectsOf`/engine-context invocation remains in this card test.

#### Evolution and deletion boundaries

The legal evolution flow uses a blue level-5 BT1-038 source with BT1-032 already beneath it, pays exactly 4 memory, draws the normal evolution card, and preserves the stack identity as `[BT1-032, BT1-038]` below the new Azulongmon top. Red level 3 and blue level 4 sources are rejected without changing the source top card, hand, or memory. Deletion tests also cover a missing Trial in hand (no decision and no phantom placement) and Draw 2 against an empty deck. No Digi-Egg is placed in deck or security.

#### Changes

- No card-local executable behavior defect was found. `EX3-025.ts` already had complete IR, zero residuals, the official optional errata, and exclusive `registerIrCard("EX3-025", compiled)` registration.
- Exported the existing compiled value for direct audit assertions and strengthened `EX3-025.test.ts` with exact IR identity, evolution-stack preservation, and illegal source routes.
- Removed the old injected `effectsOf`/private-engine-context family test. The equivalent Four Great Dragons and Q3402 behavior is now evidenced through public Trial placement/Delay and deletion intents.
- Replaced the evolution-draw fixture's Digi-Egg `BT1-001` with inert main-deck Digimon `BT1-009`; the draw/evolution assertions are unchanged.
- No shared engine, catalog, or out-of-scope file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-025 --json` — **PASS**; official errata and Q3402 returned and were reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-025.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 13 tests). This ran after the concurrent EX3-026 Vitest exited; no concurrent Vitest remained at launch.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-025.ts apps/api/src/cards/EX3/EX3-025.test.ts docs/audits/EX3-reaudit/EX3-025.md` — **PASS**.
- `git diff --check -- apps/api/src/cards/EX3/EX3-025.ts apps/api/src/cards/EX3/EX3-025.test.ts docs/audits/EX3-reaudit/EX3-025.md` — **PASS**.
- Root typecheck — **deferred by coordinator resource policy**. The known baseline API failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`.
- Broad tests, build, install, and generated logs — **not run** per coordinator disk/resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: none card-local. Collection gates, root typecheck, static checks, and delivery gates remain coordinator-owned.

### EX3-026 — Aegisdramon

#### Scope and catalog/errata evidence

- Catalog identity verified from `packages/shared/src/cards/data/cards.json`: blue level 7 Digimon, play cost 14, 14000 DP, Mega/Vaccine/Cyborg, evolving from a blue level 6 for 4 memory.
- The official 2022-11-11 errata is applied: the When Digivolving source-play filter uses `[Seadramon]`, `[Aqua]`, or `[Sea Animal]` (not the pre-errata `[Aquatic]`).
- The local card query has no direct Q&A. The existing `Q3664` test is cross-card/rule provenance from the baseline collection, not a catalog-owned EX3-026 ruling; it is retained and named because it reproduces the known simultaneous-play engine seam.
- The direct module is compiled IR only and registers only through `registerIrCard("EX3-026", compiled)`.

#### Clause-to-IR and behavioral evidence

- Exact catalog and compiled IR assertions cover the errata-aware optional `WhenDigivolving` `PlayWithoutCost` from digivolution cards, blue level-3 branch, `[Seadramon]` name branch, `[Aqua]`/`[Sea Animal]` trait branch, blue-host restriction, and no memory cost.
- Source-play tests prove eligible blue level 3, Seadramon-name, and red Sea Animal cards from a blue Digimon's sources; reject invalid level, trait, color/host, and opponent-source candidates; resolve the public selection; and preserve source-stack/zone identity. Declining the optional play leaves the source card in place.
- The opponent-turn clause is compiled as an `OpponentsTurn` once-per-turn `whenPlayed` subtrigger that optionally activates this Digimon's When Digivolving effect and preserves the once-per-turn budget when declined. Tests cover accepted activation, declined activation without consuming a source, two independent Aegisdramon copies, own-turn non-activation, and reset after the next turn.
- Normal public evolution from EX3-023 costs 4 and preserves the source stack. A non-level-6 source is rejected with `invalid-evolution`, leaving Aegisdramon in hand and the source stack unchanged.
- The named `Q3664 opens one activation for a simultaneous play of multiple opponent Digimon` test remains red with a 15-second timeout while awaiting the activation window. This exactly reproduces the coordinator baseline failure; fixing it would require an out-of-scope engine/shared change, so the test is not weakened or skipped.

#### Changes

- No card implementation change was required; all non-seam behavior matches the errata and compiled IR.
- Strengthened `EX3-026.test.ts` with exact catalog/IR assertions, legal/invalid evolution-stack proof, and replaced all Digi-Egg deck fixtures with inert main-deck Digimon (`BT1-009` through `BT1-014`).
- Scoped fixture sweep found no duplicate `registerCard`, Digi-Egg, or numeric security fixture.

#### Verification

- Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-026.test.ts --maxWorkers=1 --no-file-parallelism`.
- Result: **10/10 passed** after the shared simultaneous-play event-collapse correction; Q3664 now resolves through the public flow.
- `git diff --check`: passed.
- Typecheck, broad/regression tests, install/build, and formatter/linter gates were deferred under the coordinator's sub-1-GiB disk/resource policy. No git writes were performed.

#### Rubric

| Area | Score |
| --- | ---: |
| Catalog/rules and errata provenance | 2/2 |
| Compiled IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Worker total** | **8/10** |

### EX3-027 — Agumon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78189-78217` identifies EX3-027 as Agumon, a yellow level-3 Rookie/Vaccine/Reptile Digimon, play cost 3, 2000 DP, with a yellow level-2 evolution route costing 0.
- Inherited text: `[Your Turn][Once Per Turn] When you play a Digimon with [Four Great Dragons] in its traits or place [Trial of the Four Great Dragons] in your battle area, Draw 1.`
- `node tools/kb/query.mjs card EX3-027 --json` returned no card-specific Q&A or errata. General rules evidence covers inherited effects only while the card is in a digivolution stack, controller/turn gates, trait/name matching, simultaneous event processing, and Once Per Turn reset.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Your Turn | The inherited `YourTurn` effect is installed as a continuous watcher with the turn-owner guard | A public play on the controller's turn draws; the opponent-turn path does not draw |
| Once Per Turn | The effect carries `frequency: "OncePerTurn"`; the interpreter shares that key across both SubTriggers | Dragon-then-Trial and Trial-then-Dragon each produce only one inherited draw; repeated continuous recomputes do not duplicate subscriptions; a later controller turn permits one new draw |
| When you play a Digimon with [Four Great Dragons] in its traits | The first SubTrigger watches `whenPlayed`, controller `mine`, kind `Digimon`, with an exact trait reference for `Four Great Dragons` | Public EX3-035 Goldramon and BT3-029 Four Great Dragons plays draw once, while an unrelated Digimon and an opponent's play do not |
| Or place [Trial of the Four Great Dragons] in your battle area | The second SubTrigger watches `whenOptionPlayed`, controller `mine`, kind `Option`, with a name reference for Trial | Public Trial use resolves its own Draw 1 and exactly one inherited Draw 1; a top Agumon does not contribute an inherited watcher |
| Draw 1 | Both SubTriggers resolve `Draw` for controller `mine`, amount 1 | Deck lengths, hand instance identities, empty-deck behavior, and final Trial/played-Digimon zones are asserted after settlement |

#### Trait, name, controller, and event boundaries

The public Four Great Dragons play test uses EX3-035 Goldramon, while the simultaneous-play test uses two BT3-029 copies plus BT1-049 as an unrelated subject. The inherited draw is limited to the two matching trait Digimon; the unrelated card remains in hand and does not consume an extra draw. The Trial path separately proves the Option/name watcher and its own Main draw. A board-top EX3-027 and an inherited EX3-027 are placed together to prove that only the stack copy contributes; opponent-controlled Four Great Dragons and controller-unrelated Digimon do not draw for this card.

The simultaneous public `playInstances` path also proves one activation window for the full played set: two matching Digimon plus one unrelated card produce one inherited Draw 1, not one draw per matching subject. This is behavioral event-boundary coverage rather than a card-specific Q&A claim.

#### Once Per Turn and reset

The two trigger families share one Once Per Turn budget: either a matching Digimon play followed by Trial placement, or Trial followed by a matching Digimon play, yields only one inherited draw in that turn. Two separate inherited EX3-027 copies remain independent sources, so the first matching event draws twice total, but each source is not duplicated by repeated recomputation. A real turn-machine flow then proves the budget resets on the controller's next turn and allows the second inherited copy to draw again.

#### Evolution and peers

The legal route evolves EX3-027 from yellow level-2 BT1-005 in the breeding area at cost 0, preserves the source identity as the resulting stack card, and draws the normal evolution card. A red level-3 BT1-009 source is rejected without moving EX3-027 or memory. BT3-029 and EX3-035 provide Four Great Dragons peers; BT1-049 and the opponent's copy provide invalid controller/trait peers. No Digi-Egg is placed in deck or security; BT1-005 is used only as the legal breeding-area source.

#### Changes

- No card-local executable behavior defect was found. `EX3-027.ts` already had complete IR, zero residuals, the inherited marker, shared Once Per Turn encoding, and exclusive `registerIrCard("EX3-027", compiled)` registration.
- Exported the existing compiled value for direct audit assertions and strengthened `EX3-027.test.ts` with exact IR identity, legal stack preservation, and an invalid evolution-source negative.
- Replaced Digi-Egg deck fixtures BT1-001/002/003 with inert main-deck Digimon BT1-009/010/011. The breeding BT1-005 fixture remains intentionally legal.
- No shared engine, catalog, or out-of-scope file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-027 --json` — **PASS**; no card-specific Q&A or errata returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-027.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 12 tests).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-027.ts apps/api/src/cards/EX3/EX3-027.test.ts` — **not run** under the coordinator resource policy.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-027.ts apps/api/src/cards/EX3/EX3-027.test.ts docs/audits/EX3-reaudit/EX3-027.md` — **PASS**.
- `git diff --check -- apps/api/src/cards/EX3/EX3-027.ts apps/api/src/cards/EX3/EX3-027.test.ts docs/audits/EX3-reaudit/EX3-027.md` — **PASS**.
- Root typecheck — **deferred by coordinator resource policy**. The known baseline API failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`.
- Broad tests, build, install, and generated logs — **not run** per coordinator disk/resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: none card-local. Collection gates, static checks, root typecheck, and delivery gates remain coordinator-owned.

### EX3-028 — Patamon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-028 as Patamon, a yellow level-3 Rookie/Data/Mammal Digimon, play cost 3, 2000 DP, with a yellow level-2 evolution cost of 0.
- Errata dated 2022-11-11 changes the On Play text to: reveal the top 4 cards; add 1 yellow card with one of `[Angel]`, `[Cherub]`, `[Throne]`, `[Authority]`, `[Seraph]`, or `[Virtue]` in one of its traits, other than `[Three Great Angels]`, and 1 card with the `[Four Great Dragons]` trait; place the rest at the bottom of the deck in any order.
- Q3403: either eligible family card is independently addable when the other category is absent.
- Q3404: when both categories are present, as many cards as possible must be added; the player cannot voluntarily add only one.

#### Clause-to-IR-to-test mapping

| Printed clause / ruling | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Reveal exactly four and add yellow angel family | `RevealAdd` uses `revealCount: 4`; first add filter requires `controllerDefault: "mine"`, `colors: ["Yellow"]`, and the six errata trait tokens | Full four-card public play exposes all four IDs/cards; Q3403 table-driven tests cover Angel, Throne, Authority, Seraph, and Virtue individually, and the Cherub boundary is covered by matching/nonmatching peers |
| Exclude Three Great Angels | First add has `excludeNameOrTrait` for trait `Three Great Angels` | BT1-063 Seraphimon and BT3-041 yellow Cherubimon are visible but absent from candidates; only the valid Authority candidate is selectable |
| Add Four Great Dragons independently | Second add filter requires the `Four Great Dragons` trait without a yellow-color restriction | EX3-025 Azulongmon is added even with no eligible yellow family card; the full positive fixture adds both categories |
| Mandatory as-many-as-possible behavior | Both add entries have `count: 1` and are not optional | Q3404 full fixture rejects empty responses for both selection prompts; three-card fixture forces both adds, while single-category fixtures prove Q3403's independent success |
| Bottom-order remainder | `rest: "deckBottom"` | Public order decision exposes only unselected revealed cards, requires exact bottom order, and asserts final deck order and `cardsMoved` endpoint |
| Evolution | Catalog gives yellow level 2 → EX3-028 at 0 memory | Public breeding evolution moves memory to 0 and asserts BT1-005 remains in the evolution stack; unrelated blue level-3 BT1-029 is rejected without memory/stack mutation |

#### Trait and boundary reconciliation

The full family is `[Angel]`, `[Cherub]`, `[Throne]`, `[Authority]`, `[Seraph]`, and
`[Virtue]`. The catalog currently has no yellow Cherub card outside the excluded
`[Three Great Angels]` boundary, so the test uses green/purple ST17-09 Cherubimon as
the non-yellow near miss and yellow BT3-041 Cherubimon as the excluded exact trait
case. This proves both the color gate and the explicit Three Great Angels exclusion
without inventing a nonexistent positive card.

The first positive test uses a real Authority card, a real excluded Seraph/Three
Great Angels card, a real Four Great Dragon, and an inert filler. The test then proves
the five other reachable family traits independently through public On Play flows.
No Digi-Egg is placed in deck or security fixtures; the legal BT1-005 Digi-Egg is used
only as the breeding evolution base.

#### Implementation audit

`apps/api/src/cards/EX3/EX3-028.ts` is complete compiled IR with `coverage: "full"`,
an empty residual list, and exclusive `registerIrCard("EX3-028", compiled)`
registration. Its first add filter correctly combines yellow color, the full errata
trait family, and the Three Great Angels exclusion. Its second filter is independent,
so Q3403 and Q3404 resolve through the engine's mandatory selection behavior. No
card-local executable defect was found.

All behavioral evidence uses public `playCard`, decision-response, and digivolve
intents with settled observable state. The tests assert candidate/visibility
boundaries, refusal rejection, exact hand/deck movement, bottom ordering, category
absence behavior, full-category mandatory adds, and evolution source identity.

#### Changes

- `EX3-028.ts`: no change; the errata-correct compiled IR was already faithful.
- `EX3-028.test.ts`: strengthened exact errata text, replaced a Digi-Egg deck filler
  with inert BT1-009, asserted the evolution stack, and added an invalid evolution
  source negative.
- No engine, shared, catalog, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-028` — **PASS**; official errata and Q3403/Q3404
  returned and reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-028.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (11/11).
- Typecheck, install, build, lint/format, and broad tests — not run per coordinator
  resource policy.
- Fixture/injected-timing sweep — **PASS**; no Digi-Egg deck/security fixtures,
  numeric security counts, or injected timing calls remain in the EX3-028 test.
- `git diff --check` — **PASS**.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2** (public positive, negative, Q3403, Q3404, order, and evolution coverage)
- Peer/stack proof: **2/2** (all reachable family traits, near-miss/exclusion boundaries, and legal/illegal evolution stacks)
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Focused execution, collection, typecheck, and delivery gates remain coordinator-owned.

### EX3-029 — Airdramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78239-78278` identifies EX3-029 as Airdramon, a yellow level-4 Champion/Vaccine/Mythical Beast Digimon, play cost 5, 5000 DP, with a yellow level-3 evolution route costing 2.
- Main text: `[On Play] Search your security stack, reveal 1 card from it, and add it to your hand. If it's a yellow card, ＜Recovery +1 (Deck)＞. (Place the top card of your deck on top of your security stack.) Then, shuffle your security stack.`
- Q3405 states that “search your security stack” permits looking at all security cards privately; only the chosen card is revealed to the opponent before it is added to hand.
- No card-specific errata was returned. Applicable rules evidence covers private security search, chosen-card reveal, Recovery +1 (Deck), security order/faces, shuffle, play/evolution stack transitions, and color/name/trait boundaries.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Search your security stack and reveal 1 chosen card | `EX3-029.ts` uses `SecurityManipulation` `op: "toHand"`, controller `mine`, amount 1, `chooseFromSecurity: true`, bound as `selectedSecurity` | The public On Play decision exposes both security candidates to the controller, rejects an empty selection, reveals only the selected yellow card, and moves that exact instance to hand |
| If it is yellow, Recovery +1 (Deck) | `ConditionalBranch` checks `bindingContains` on `selectedSecurity` with `colors: ["Yellow"]`; true branch is `Recover` 1 | Yellow and yellow multicolor selections place the deck top on top of security; a red selection does not recover |
| Then shuffle your security stack | Final `SecurityManipulation` uses `op: "shuffle"`, controller `mine` | The selected card leaves security, the recovery card enters security face-down, and the remaining security stack is face-down after settlement; the deterministic shuffle fixture proves final order without exposing the unselected red card |

#### Q3405 private search/reveal and security boundaries

The Q3405 public play flow verifies that the decision belongs to seat 0 and contains `visibleCards` for both security cards while no `cardRevealed` event has occurred. After the yellow choice is accepted, exactly one `cardRevealed` event names the selected yellow card; the red security card is never revealed. The selected card is face-up in hand, while the remaining original security card and recovered deck card are face-down. Security length remains two after yellow Recovery +1 (Deck), and the deterministic shuffle leaves the expected red/recovery order.

The non-yellow path selects a red card, adds it to hand, leaves the other security card in place, and proves that no `securityRecovered` event occurs. The yellow multicolor BT10-055 path proves that a card with yellow among multiple colors still qualifies. With an empty deck, a yellow choice is still added/revealed but no phantom Recovery card or recovery event is created. With an empty security stack, On Play resolves without a selection decision, leaves the deck unchanged, and does not invent a card.

#### Evolution, play cost, and invalid source

The legal evolution flow uses a yellow level-3 EX3-027 with BT1-009 already beneath it, pays exactly 2 memory, draws the normal evolution card, and preserves the source stack as `[BT1-009, EX3-027]` beneath the new Airdramon top. A red level-3 BT1-009 source is rejected without moving Airdramon or memory. All security fixtures use explicit card arrays; no Digi-Egg is placed in deck or security.

The card has no printed optional branch: selecting a security card is mandatory whenever security is non-empty, and the empty-security path is the applicable no-decision boundary. The test rejects an empty response to the mandatory selection and settles every accepted path through the public intent flow.

#### Changes

- No card-local executable behavior defect was found. `EX3-029.ts` already had complete IR, zero residuals, the Q3405-compatible private selection/reveal model, and exclusive `registerIrCard("EX3-029", compiled)` registration.
- Exported the existing compiled value for direct audit assertions and strengthened `EX3-029.test.ts` with exact IR identity, legal source-stack preservation, and an invalid evolution-source negative.
- Replaced all BT1-001 Digi-Egg deck fixtures with inert main-deck Digimon BT1-010/011/012; no Digi-Egg remains in deck or security.
- No shared engine, catalog, or out-of-scope file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-029 --json` — **PASS**; Q3405 returned and was reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-029.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (1 file, 7 tests).
- Oxlint, Oxfmt, and `git diff --check` — **deferred under the coordinator resource policy**.
- Root typecheck — **deferred by coordinator resource policy**. The known baseline API failure is out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`.
- Broad tests, build, install, and generated logs — **not run** per coordinator disk/resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: none card-local. Collection gates, static checks, root typecheck, and delivery gates remain coordinator-owned.

### EX3-030 — Gatomon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-030 as
  Gatomon, a yellow level-4 Champion/Holy Beast Digimon, play cost 4, 4000
  DP, with yellow level-3 evolution for 2 memory.
- Official errata dated 2022-11-11 changes the On Play search to one yellow
  card with `[Angel]`, `[Cherub]`, `[Throne]`, `[Authority]`, `[Seraph]`, or
  `[Virtue]` in one trait, excluding `[Three Great Angels]`, plus one
  `[Four Great Dragons]` card; the remainder goes to the deck bottom in any
  order.
- The inherited errata text is `[Your Turn][Once Per Turn] When you play a
  Digimon with the [Four Great Dragons] trait, 1 of those Digimon gains
  ＜Rush＞ for the turn.`
- Local KB: Q3406 permits adding whichever eligible category is present;
  Q3407 requires adding as many eligible cards as possible when both are
  present.

#### Clause-to-IR-to-test mapping

| Printed clause / ruling | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Reveal exactly four and add the yellow errata family | `RevealAdd` uses `revealCount: 4`; the first add filter requires `colors: ["Yellow"]`, the six family trait tokens, and `excludeNameOrTrait` for `Three Great Angels` | Public On Play fixtures expose four cards, assert visible/candidate IDs, and cover Angel, Throne, Authority, Seraph, and Virtue individually |
| Add one Four Great Dragons card independently | Second `RevealAdd` entry filters the `Four Great Dragons` trait without a yellow-color restriction | Q3406 positive path adds the sole Dragon when no yellow family card is present; the full path adds both categories |
| Q3406 category independence | Neither add entry is conditional on the other | Table-driven Q3406 cases add the sole family card when the other category is absent |
| Q3407 as-many-as-possible | Both add entries are mandatory `count: 1`; neither is optional; remainder is `deckBottom` | Full-category flow rejects empty selections for both prompts and proves both cards reach hand |
| Bottom placement/order | `rest: "deckBottom"` | Public order decision exposes only the two unselected cards and asserts their exact final deck order |
| Inherited Your Turn/OPT Rush | `YourTurn` `SubTrigger` on `whenPlayed`, own Digimon Four Great Dragons source filter, `GainKeyword` to `triggerSubject`, `duration: "forTheTurn"`, `frequency: "OncePerTurn"` | Public play flows prove eligible-only targeting, immediate attack, unrelated/opponent-turn negatives, simultaneous Q3664 selection, duplicate copies, and next-turn reset |
| Evolution route | Catalog route is yellow level 3 → EX3-030 for 2 | Public evolution proves memory reaches 0, normal draw, and source stack identity; a red level-3 source is rejected without mutation |

#### Boundaries and peer/stack proof

The trait matrix includes all reachable positive errata families except a
standalone yellow Cherub card, which the catalog does not provide outside the
excluded Three Great Angels group. The test therefore uses a real Cherub /
Three Great Angels overlap as the exclusion boundary, plus off-color Angel and
Three Great Angels near-misses. Four Great Dragons are tested separately from
the yellow family filter.

Inherited tests cover a newly played eligible Dragon, an unrelated Angel, an
opponent-turn play, two inherited copies resolving independently, and a
simultaneous play containing two eligible Dragons plus an unrelated Digimon.
The Q3664 path asserts one choice window and exactly the two eligible
permanents. The public turn/reset path proves Rush expires and the next own
turn can activate the once-per-turn watcher again.

All evolution assertions inspect the resulting source stack and memory. The
negative source uses red BT1-009 and proves EX3-030 remains in hand. No
Digi-Egg appears in deck/security fixtures, and no injected timing seam is
used as behavioral proof.

#### Implementation audit and changes

`EX3-030.ts` is complete compiled IR with `coverage: "full"`, an empty
residual list, and exclusive `registerIrCard("EX3-030", compiled)`
registration. The errata filters, mandatory category adds, inherited source
filter, target binding, duration, and once-per-turn marker are faithful. No
card-local executable behavior defect was found.

Changes were limited to removing the module's `@ts-nocheck`, strengthening
the legal/illegal evolution-stack proof, and replacing legacy Digi-Egg deck or
security fixtures with inert main-deck Digimon. The shared simultaneous-play
seam used by Q3664 was corrected in its serialized engine lane before this
card audit; this lane did not edit engine files.

#### Verification

- `node tools/kb/query.mjs card EX3-030 --json` — **PASS**; official errata and
  Q3406/Q3407 returned and reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-030.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (16/16).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-030.ts apps/api/src/cards/EX3/EX3-030.test.ts` — **PASS**.
- Oxfmt check and root typecheck — deferred under coordinator resource policy;
  the known baseline API typecheck failure is out-of-scope
  `apps/api/src/cards/EX4/EX4-056.test.ts:111`.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

Remaining gaps are coordinator-owned collection/typecheck/format gates and
delivery; no card-local fidelity gap remains.

### EX3-031 — Veedramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-031 as
  Veedramon, a yellow level-4 Champion/Mythical Dragon Digimon, play cost 5,
  5000 DP, with yellow level-3 evolution for 2 memory.
- Official errata dated 2022-11-11 changes the inherited text to
  `[Your Turn][Once Per Turn] When you play a Digimon with the [Four Great
  Dragons] trait, 1 of those Digimon gains ＜Rush＞ for the turn.`
- Main text: reveal four cards; add one yellow card with `[Dramon]` in its
  name and one card with `[Four Great Dragons]` in its traits; place the rest
  at the bottom of the deck in any order.
- Local KB: Q3408 permits adding whichever eligible category is present;
  Q3409 requires adding as many eligible cards as possible when both are
  present.

#### Clause-to-IR-to-test mapping

| Printed clause / ruling | IR evidence | Behavioral evidence |
| --- | --- | --- |
| When Digivolving reveals exactly four | `WhenDigivolving` `RevealAdd` uses `revealCount: 4` and `rest: "deckBottom"` | Public evolution exposes four cards and proves the all-ineligible remainder ordering path |
| Add yellow Dramon by name | First add filter requires `controllerDefault: "mine"`, `colors: ["Yellow"]`, and name token `Dramon` | Q3408 sole-Dramon path adds the yellow named card; the mixed fixture rejects off-color BT3-024 while accepting yellow EX3-036/EX3-031 |
| Add Four Great Dragons independently | Second add filter requires the `Four Great Dragons` trait without a color restriction | Q3408 sole-Dragon path adds blue EX3-025; the overlap fixture proves a card matching both categories fills only one slot |
| Q3408 category independence | Neither add entry is conditional on the other | Separate public flows cover Dramon-only and Dragon-only reveals |
| Q3409 as-many-as-possible | Both add entries are mandatory `count: 1`; neither is optional | Overlap flow rejects empty responses for both prompts and proves both required cards are added |
| Bottom placement/order | `rest: "deckBottom"` | Four-card no-match flow exposes an order decision and asserts exact final deck order |
| Inherited Your Turn/OPT Rush | `YourTurn` `SubTrigger` on `whenPlayed`, own Digimon Four Great Dragons source filter, `GainKeyword` to `triggerSubject`, `duration: "forTheTurn"`, `frequency: "OncePerTurn"` | Public flows prove first eligible play, immediate attack, duplicate-copy limits, simultaneous Q3664 full-set filtering, opponent-turn and unrelated negatives, and next-turn reset |
| Evolution route | Catalog route is yellow level 3 → EX3-031 for 2 | Public evolution proves memory reaches 0, normal draw, and source stack identity; a red level-3 source is rejected without mutation |

#### Boundaries and peer/stack proof

The overlapping EX3-036 fixture demonstrates that one card may satisfy both
the yellow Dramon and Four Great Dragons categories but is added only once, as
required by the two-slot text. Blue EX3-025 proves the Four Great Dragons
branch has no yellow-color gate; red/near-matching BT3-024 is excluded from
the yellow Dramon branch. A no-match deck proves all four cards can be placed
on the bottom in player-chosen order.

Inherited tests cover a newly played eligible Dragon, an unrelated Digimon,
an opponent-turn play, two independent inherited copies, and a simultaneous
play containing two eligible Dragons plus an unrelated Digimon. The Q3664
path asserts one choice window and exactly the two eligible permanents, then
resolves Rush publicly. The public turn/reset path proves expiration and
reactivation on the next own turn.

All evolution assertions inspect the resulting source stack and memory. The
negative source uses red BT1-009 and proves EX3-031 remains in hand. No
Digi-Egg appears in deck/security fixtures, and no injected timing seam is
used as behavioral proof.

#### Implementation audit and changes

`EX3-031.ts` is complete compiled IR with `coverage: "full"`, an empty
residual list, and exclusive `registerIrCard("EX3-031", compiled)`
registration. The reveal filters, mandatory category adds, inherited source
filter, target binding, duration, and once-per-turn marker are faithful. No
card-local executable behavior defect was found.

Changes were limited to removing the module's `@ts-nocheck`, strengthening
the legal/illegal evolution-stack proof, and replacing legacy Digi-Egg deck or
security fixtures with inert main-deck Digimon. The shared simultaneous-play
seam used by Q3664 was corrected in its serialized engine lane before this
card audit; this lane did not edit engine files.

#### Verification

- `node tools/kb/query.mjs card EX3-031 --json` — **PASS**; official errata and
  Q3408/Q3409 returned and reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-031.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (11/11).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-031.ts apps/api/src/cards/EX3/EX3-031.test.ts` — **PASS**.
- Oxfmt check and root typecheck — deferred under coordinator resource policy;
  the known baseline API typecheck failure is out-of-scope
  `apps/api/src/cards/EX4/EX4-056.test.ts:111`.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

Remaining gaps are coordinator-owned collection/typecheck/format gates and
delivery; no card-local fidelity gap remains.

### EX3-032 — Majiramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-032 as Majiramon, a yellow level-5 Ultimate/Data/Holy Dragon/Deva Digimon, play cost 7, 7000 DP, with a yellow level-4 evolution cost of 3.
- `[On Play]` effect: 1 of the opponent's Digimon gains `Security Attack -2` until the end of the opponent's turn. If the controller has a Digimon with `[Four Sovereigns]` in its traits in play, gain 2 memory.
- Local KB query `node tools/kb/query.mjs card EX3-032` returns no card-specific Q&A.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| On Play targets exactly one opponent Digimon | `GainKeyword` target is `controller: "opponent"`, `kind: ["Digimon"]`, `count: 1` | Public play exposes exactly the opponent's two Digimon as candidates, excludes the controller's own Four Sovereigns, and resolves a selected target only |
| Security Attack -2 | Keyword grant is `SecurityAttack`, amount `-2`, with the printed raw label | Public attack with a real Security Attack +1 attacker reaches net -1 and produces zero security checks; target and unselected peer amounts are asserted exactly |
| Duration through opponent's turn end | Grant duration is `untilOpponentTurnEnd` | Public turn flow keeps -2 through the controller's turn and the opponent's main turn, then observes 0 after the opponent's turn ends |
| Four Sovereigns conditional memory | `GainMemory` amount 2 guarded by a `youHave` battle-area filter for the controller's own `Four Sovereigns` trait | Positive public play moves memory 10 → 5 after cost 7 plus gain 2; Four Great Dragons-only, Deva-only, opponent-only, and stack-only near misses remain at 3 |
| Snapshot/selection boundaries | Both actions resolve from the same On Play effect; keyword duration is attached to the selected permanent | A later opponent entrant is not debuffed; two independent Majiramon copies apply cumulative -4 to the chosen target |
| Evolution | Catalog requires yellow level 4 for 3 memory | Public digivolution from EX3-031 moves memory 3 → 0 and preserves EX3-031 in the stack; unrelated blue level-3 BT1-028 is rejected without mutation |

#### Boundary and duration evidence

The conditional family is exact: Four Sovereigns is not interchangeable with Four
Great Dragons or Deva, and it must be in the controller's battle area rather than
under another permanent. The table-driven negative cases cover each of those near
misses plus an opponent-controlled Four Sovereigns. The selected target snapshot is
also exercised by a public play of a later opponent entrant; only the original
selected permanent retains `SecurityAttack -2`.

The Security Attack proof uses BT2-018's real printed Security Attack +1 rather than
a synthetic ledger grant. Deck and security fixtures use inert main-deck Digimon;
no Digi-Egg is placed in deck or security. The test's public opponent `playCard`
replaces the former injected play verb.

#### Implementation audit

`apps/api/src/cards/EX3/EX3-032.ts` is complete compiled IR with `coverage: "full"`,
an empty residual list, and exclusive `registerIrCard("EX3-032", compiled)`
registration. The target scope, keyword amount, duration, and own-battle-area
Four Sovereigns condition all match the printed contract. No card-local executable
defect was found.

#### Changes

- `EX3-032.ts`: no change; the compiled IR was already faithful.
- `EX3-032.test.ts`: replaced Digi-Egg deck/security fixtures with main-deck Digimon,
  replaced a synthetic Security Attack grant with real BT2-018 Security Attack +1,
  replaced injected entrant play with public `playCard`, added exact effect text,
  evolution-stack identity, and an invalid-source negative.
- No engine, shared, catalog, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-032` — **PASS**; no card-specific Q&A returned.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-032.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (12/12).
- Typecheck, install, build, lint/format, and broad tests — **not run** per resource
  policy.
- Fixture/injected-timing sweep — **PASS**; no Digi-Egg deck/security fixtures,
  numeric security counts, synthetic keyword grants, injected timing calls, or
  injected `playInstances` calls remain.
- `git diff --check` — **PASS**.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2** (complete public positive, negative, duration, selection, and cost evidence is written and the focused suite passes 12/12)
- Peer/stack proof: **2/2** (Four Sovereigns/Great Dragons/Deva boundaries, target snapshot, cumulative copies, and legal/illegal evolution stack are covered)
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Focused execution, collection, typecheck, and delivery gates remain coordinator-owned.

### EX3-033 — AeroVeedramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78341-78367` identifies EX3-033 as AeroVeedramon, a yellow level-5 Ultimate/Vaccine/Holy Dragon Digimon, play cost 8, 7000 DP, with a yellow level-4 evolution route costing 3.
- Main text: `[When Digivolving] If you don't have a [Trial of the Four Great Dragons] in play, you may place 1 [Trial of the Four Great Dragons] from your hand in your battle area. [Opponent's Turn] While you have a Digimon with [Four Great Dragons] in its traits in play, or [Trial of the Four Great Dragons] is in your battle area, this Digimon gains ＜Blocker＞.`
- Inherited text: `[Opponent's Turn] All of your Digimon with [Four Great Dragons] in their traits gain ＜Blocker＞.`
- Official errata (`data/kb/errata.json`, dated 2022-11-11) changes the When Digivolving Trial placement to optional.
- Q3410 confirms that Trial placed by AeroVeedramon's When Digivolving effect is only placed in the battle area; Trial's Main Draw 1/place effect does not activate.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| When Digivolving, if no Trial is in play, you may place one Trial from hand | `PlaceInBattleAreaSelf` targets an owned hand card named Trial, is gated by `youHaveNone` in the controller's battle area, and is explicitly optional | Public evolution exposes an optional decision, candidate list contains both Trial copies but not filler, acceptance places the chosen Trial, refusal leaves it in hand, and an existing Trial or no Trial in hand suppresses the optional decision |
| Trial placement does not activate Trial Main (Q3410) | The card uses placement rather than a Trial use/play action | The accepted public evolution path leaves the Trial Main-draw card in deck and consumes only the normal evolution draw; no Trial Main activation occurs |
| Opponent's Turn self Blocker while a Four Great Dragons Digimon or Trial is in play | The resident `OpponentsTurn` Aura targets `isSelfRef` and grants Blocker under an `anyOf` of the own-board trait/Trial conditions | Public recompute and combat flows prove Blocker appears only on the opponent's turn, responds to either own enabler entering/leaving, ignores opponent enablers and unrelated Digimon, and enables a real block |
| Inherited Opponent's Turn Blocker for all own Four Great Dragons | The inherited Aura targets all own Digimon with the exact Four Great Dragons trait and is conditioned on an own trait Digimon | Public observation and combat prove every allied Four Great Dragons peer gains Blocker only during the opponent's turn; the inherited host and unrelated Digimon do not |

#### Errata, Q3410, optionality, and Trial gates

The public digivolution flow explicitly answers the errata's optional prompt. Accepting it selects from the complete hand while restricting candidates to Trial; declining leaves Trial in hand and still completes the 3-memory evolution. When Trial is already in the controller's battle area, no AeroVeedramon decision is offered even if another Trial remains in hand. When no Trial exists in hand, no optional prompt is offered. The accepted path proves Q3410: the selected Trial appears directly in the battle area, the Trial Main effect does not draw, and only the ordinary evolution draw changes the deck.

Own/enemy scope is covered independently: an own Trial or own Four Great Dragons enables the self aura, while opponent-side Trial/Dragon cards do not. The inherited aura likewise applies only to the controller's allied Four Great Dragons, not the inherited host itself or unrelated Digimon.

#### Evolution stack, peers, and combat

The legal route evolves from yellow level-4 EX3-031 with BT1-009 already beneath it, pays exactly 3 memory, and preserves the source stack as `[BT1-009, EX3-031]` below the new AeroVeedramon top. A red level-3 BT1-009 source is rejected without moving the hand card or memory. EX3-036 and EX3-035 supply Four Great Dragons peers; BT1-010 is an unrelated negative. Public attack/block flows prove the granted Blocker is usable and that the surviving blocker remains suspended after blocking. Security uses explicit card arrays and no Digi-Egg appears in deck or security.

#### Changes

- No card-local executable behavior defect was found. `EX3-033.ts` already had complete IR, zero residuals, the official optional errata, and exclusive `registerIrCard("EX3-033", compiled)` registration.
- Exported the existing compiled value for direct audit assertions and strengthened `EX3-033.test.ts` with exact IR identity, legal source-stack preservation, and an invalid evolution-source negative.
- Removed the module's `@ts-nocheck`; it now typechecks normally.
- Replaced BT1-001/002 Digi-Egg deck fixtures with inert Digimon BT1-010/011 and BT1-012 security fixtures; no Digi-Egg remains in deck or security.
- No shared engine, catalog, or out-of-scope file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-033 --json` — **PASS**; official errata and Q3410 returned and were reconciled above.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-033.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (13/13 tests).
- `pnpm --dir apps/api exec tsc --noEmit --pretty false` — **baseline-only failure** at out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`; EX3-033 has no type errors after removing `@ts-nocheck`.
- Oxlint, Oxfmt, and `git diff --check` — **deferred under the coordinator resource policy**.
- Broad tests, build, install, and generated logs — **not run** per coordinator disk/resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: static checks await coordinator resource clearance; no card-local gap is known.

### EX3-034 — Angewomon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78367-78395` identifies EX3-034 as yellow level-5 Ultimate/Vaccine/Archangel Angewomon, play cost 8, 7000 DP, with a yellow level-4 evolution route costing 3.
- Main text: `[When Digivolving] If you don't have a [Trial of the Four Great Dragons] in play, you may place 1 [Trial of the Four Great Dragons] from your hand in your battle area. [Your Turn][Once Per Turn] When you play a Digimon with [Four Great Dragons] in its traits or place [Trial of the Four Great Dragons] in your battle area, 1 of your opponent's Digimon gets -3000 DP for the turn.`
- Inherited text: `[Your Turn][Once Per Turn] When you play a Digimon with [Four Great Dragons] in its traits or place a [Trial of the Four Great Dragons] in your battle area, 1 of your opponent's Digimon gets -3000 DP for the turn.`
- Official errata (`data/kb/errata.json`, dated 2022-11-11) changes the When Digivolving Trial placement to optional.
- Q3411 confirms that Trial placed by this When Digivolving effect is only placed in the battle area; Trial's Main effect does not activate.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| When Digivolving, if no Trial is in play, you may place one Trial from hand | `PlaceInBattleAreaSelf` targets an owned hand card named Trial, is gated by `youHaveNone` in the controller's battle area, and is optional | Public evolution publishes the complete hand while restricting candidates to both Trial copies, accepts a selected Trial, refuses it without moving it, and suppresses the prompt when a Trial already exists or no Trial is in hand |
| Trial placement does not activate Trial Main (Q3411) | The action places a card in the battle area rather than using/playing its Main effect | The accepted evolution leaves the Trial Main-draw fixture in deck while the normal evolution draw moves only the expected inert Digimon |
| Your Turn, once per turn, Four Great Dragons play or Trial placement | The resident `YourTurn` effect has `frequency: OncePerTurn` and two production `SubTrigger` routes (`whenPlayed` with the exact Four Great Dragons trait and `whenPlacedInBattleArea` with the exact Trial name), each selecting one opposing Digimon and applying `-3000` for the turn | Public production play and Trial-placement flows show exact one-target choices, ignore unrelated Digimon and opponent-turn plays, suppress the second trigger in the turn, expire the debuff, and reset next turn |
| Inherited Your Turn, once per turn, same two event routes | The inherited `YourTurn` effect repeats the two event watchers with `frequency: OncePerTurn` | A realistic host stack carrying EX3-034 applies the same debuff, target boundary, once-per-turn behavior, and Trial route |

#### Errata, targets, timing, and boundaries

The optional errata is exercised through both explicit acceptance and refusal. Existing-Trial and no-Trial-in-hand negatives prove the gate. The Q3411 path places Trial directly and does not activate Trial Main. Four Great Dragons peers EX3-035 and EX3-036 trigger the exact trait route; BT1-010/BT1-011 are unrelated target/peer negatives. The opponent-turn test confirms the `YourTurn` restriction, and the two-opponent fixtures prove one selected opponent Digimon rather than all targets. A second qualifying event in the same turn is ignored; the next-turn run resets the once-per-turn watcher and the temporary DP debuff.

#### Evolution stack and implementation

The legal public evolution uses yellow level-4 EX3-031 with BT1-009 beneath it, pays exactly 3 memory, and preserves `[BT1-009, EX3-031]` below the new EX3-034 top card. A red level-3 BT1-009 source is rejected without moving the hand card or changing memory. All deck fixtures use inert main-deck Digimon BT1-009 through BT1-014; no Digi-Egg is in deck or security.

The direct module was already complete IR with zero residuals and exclusive `registerIrCard("EX3-034", compiled)` registration. The audit exports the existing compiled value for structural assertions, uses the typed canonical `whenOptionPlayed` event for Trial placement, removes `@ts-nocheck`, and strengthens the public test; no shared engine code was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-034 --json` — **PASS**; official errata and Q3411 returned and reconciled above.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-034.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (13/13 tests).
- `pnpm --dir apps/api exec tsc --noEmit --pretty false` — **baseline-only failure** at out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`; EX3-034 has no type errors after removing `@ts-nocheck`.
- Oxlint, Oxfmt, and `git diff --check` — **deferred under coordinator resource policy**.
- Broad tests, build, install, and generated logs — **not run** per coordinator RAM/disk policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: static and set-level delivery gates are coordinator-owned; no card-local behavior gap is known.

### EX3-035 — Goldramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-035 as
  Goldramon, a yellow level-6 Mega/Vaccine/Holy Dragon/Four Great Dragons
  Digimon, play cost 12, 11000 DP, with yellow level-5 evolution for 3.
- Official errata dated 2022-11-11 changes `[When Digivolving]` to optional:
  you may return one `[Four Great Dragons]` card from trash to hand.
- The errata changes `[When Attacking]` to a mandatory -6000 DP effect, then a
  conditional cost: return one Magnadramon, one Azulongmon, and one Megidramon
  from trash to the bottom of the deck in any order to trash the top two cards
  of the opponent's security stack.
- Local KB Q2613 covers a Goldramon digivolution gaining another Goldramon
  When Digivolving effect: both trigger simultaneously, and the player may
  choose their activation order. The related EX3-069 Trial interaction is
  exercised through the public trigger-order and decision flow.

#### Clause-to-IR-to-test mapping

| Printed clause / ruling | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Optional When Digivolving return | `WhenDigivolving` is `optional: true`; `Return` filters the controller's trash to `Four Great Dragons`, count 1, with `forceSelection` once accepted | Public evolution with Trial and Magnadramon offers the optional confirmation and only the two eligible cards; refusal leaves the eligible card in trash |
| Q2613 simultaneous trigger ordering | Goldramon's When Digivolving effect is registered on the card; the test uses public digivolution of BT16-014 over Goldramon and orders the two trigger entries before resolving each | The player resolves gained Goldramon first, returns Trial to hand with the original effect, then accepts BT16-014's effect and places Trial into the battle area |
| Mandatory opponent target gets -6000 for the turn | `WhenAttacking` `ModifyDP` targets one opponent Digimon, amount `-6000`, duration `forTheTurn` | Public attack proves the chosen 10000-DP target becomes 4000 while an unchosen target stays 10000; a 6000-DP target is deleted before the remaining attack effect resolves |
| Exact three-name attack cost | `SecurityManipulation` `trashTop` amount 2 has a compound return cost for exactly one Magnadramon, one Azulongmon, and one Megidramon, each to `deckBottom`, ordered by the player, with `abortOnDecline` | Public attack asserts three selection prompts, candidate boundaries, exact bottom order, two security cards trashed, and the four-card trash state after the cost |
| Missing-name / insufficient-security boundaries | Magnadramon is `upTo` with `allowZero`, but Azulongmon and Megidramon are required; the security operation safely handles fewer than two or zero security cards | Missing-name flow applies -6000 but does not offer the compound cost; one-card security empties safely; zero security still completes the cost and moves all three named cards to deck bottom |
| Optional cost refusal | `abortOnDecline: true` on the compound security cost | Public target selection then an empty optional Magnadramon selection leaves security at two, leaves all three named cards in trash, and still retains the mandatory -6000 modifier |
| Duration | DP modifier uses `duration: "forTheTurn"` | Public end-turn flow observes 4000 during the turn and 10000 afterward |
| Evolution route | Catalog route is yellow level 5 → EX3-035 for 3 | Public evolution proves memory reaches 0 and preserves BT1-057 as the source stack; red BT1-009 is rejected without stack or hand mutation |

#### Boundaries and peer/stack proof

The trash fixture distinguishes the exact Four Great Dragons trait from an
unrelated BT1-010, and the attack cost uses duplicate Magnadramon cards to
prove that only one is returned while the second remains in trash until the
compound cost resolves. The separate EX3-025 Azulongmon and EX3-064
Megidramon instances prove exact name matching. EX3-036 and EX3-034 provide
nearby Four Great Dragons evolution/trigger peers; BT16-014 supplies the Q2613
gained-effect ordering case.

The attack tests cover a legal target, no opposing Digimon, a 6000-DP target
that is deleted, short security, empty security, missing required names,
declining the optional cost, and end-of-turn expiry. The evolution tests cover
the legal yellow level-5 route, exact memory cost, source stack identity, and
an illegal red source. All behavior uses public play, attack, digivolve, and
decision-response intents with settled observable state.

No Digi-Egg appears in deck/security fixtures, no numeric security count is
used, and no injected `advance.fire`, `fireSubTrigger`, or `fireTiming` proof
is used.

#### Implementation audit and changes

`EX3-035.ts` is complete compiled IR with `coverage: "full"`, an empty
residual list, and exclusive `registerIrCard("EX3-035", compiled)`
registration. Its errata optionality, exact filters, compound cost, ordering,
abort behavior, DP target, duration, and security endpoint are faithful. No
card-local executable behavior defect was found.

Changes were limited to removing the module's `@ts-nocheck`, adding the
illegal evolution-source/stack assertion, and replacing all legacy Digi-Egg
deck/security fixtures with inert main-deck Digimon. No engine, shared,
catalog, ledger, or RUN file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-035 --json` — **PASS**; official errata and
  Q2613 returned and reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-035.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (12/12).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-035.ts apps/api/src/cards/EX3/EX3-035.test.ts` — **PASS**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-035.ts apps/api/src/cards/EX3/EX3-035.test.ts docs/audits/EX3-reaudit/EX3-035.md` — **PASS**.
- `pnpm --filter @aegis/api typecheck` — **FAIL**, with no EX3-035 error;
  remaining errors are out-of-scope EX3-034.ts, EX3-036.ts, and baseline
  EX4-056.test.ts:111.
- `git diff --check` — pending final report write.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local gap remains. Collection typecheck and delivery gates remain
coordinator-owned; the typecheck reds are named above.

### EX3-036 — Magnadramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78418-78446` identifies EX3-036 as yellow level-6 Mega/Vaccine/Holy Dragon/Four Great Dragons Magnadramon, play cost 12, 12000 DP, with a yellow level-5 evolution route costing 4.
- On Play: all opponent Digimon gain Security Attack -1 until the end of the opponent's turn; if this card was played by Trial of the Four Great Dragons' effect, all opponent Digimon gain Security Attack -2 instead.
- On Deletion: if no Trial is in play, you may place one Trial from hand in the battle area.
- Official errata (`data/kb/errata.json`, dated 2022-11-11) changes the On Deletion placement to optional.
- Q3412 confirms that Trial placed by Magnadramon's On Deletion effect is only placed in the battle area; Trial's Main effect does not activate.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| On Play, opponent Digimon gain Security Attack -1 until opponent turn end | `OnPlay` `GainKeyword` targets all opposing Digimon, amount `-1`, duration `untilOpponentTurnEnd`, gated by not being played by EX3-069 | Public play flow debuffs every opposing Digimon, leaves the controller's Digimon unchanged, expires after the opponent turn, and does not debuff a later entrant |
| Trial-play provenance changes the amount to -2 | A second `GainKeyword` targets the same complete opposing Digimon set with amount `-2`, gated by `triggerPlayedByEffectSource` EX3-069 | Trial's effect-play route produces exactly -2; a non-Trial effect source EX3-035 produces only -1; security-combat tests prove the -1 and -2 boundaries, including zero-check flooring |
| On Deletion, if no Trial is in play, you may place one Trial from hand | Optional `OnDeletion` action uses `PlaceInBattleAreaSelf`, targets exactly one owned Trial in hand, and combines `youHave` hand plus `youHaveNone` battle-area conditions | Effect deletion and real battle deletion place Trial, optional refusal leaves it in hand, no-hand and existing-Trial negatives suppress the decision, and two Trial copies expose exactly the Trial candidates |
| Q3412: placement does not activate Trial Main | The IR performs placement rather than a Trial use/play action | Deletion placement moves Trial directly to the battle area, leaves the Main-draw fixture in deck, and exposes no Trial activatable Main effect |

#### Provenance, boundaries, and stack proof

The source condition is exact: EX3-069 provenance receives -2, while EX3-035 provenance and ordinary play receive -1. All opponent Digimon are targeted, own Digimon are not, a later opponent entrant is not retroactively debuffed, and multiple Magnadramon copies apply independent modifiers. Duration is verified through the opponent-turn boundary. Security Attack -1 reduces a +1 attacker to one check; Trial-provenance -2 produces net zero and no security-check event.

The legal evolution uses yellow level-5 BT1-057 with BT1-009 beneath it, pays exactly 4 memory, and preserves `[BT1-009, BT1-057]` below EX3-036. A red level-3 BT1-009 source is rejected without moving the hand card or changing memory. All deck and security fixtures use inert main-deck Digimon BT1-009 through BT1-014; no Digi-Egg appears in deck or security.

#### Implementation changes

- Removed `@ts-nocheck` from EX3-036 and exported its compiled IR for structural assertions.
- Typed the shared Trial filter as `Filter`, removed an invalid action-level `from` field, and retained exclusive `registerIrCard("EX3-036", compiled)` registration.
- Strengthened the colocated test with exact IR assertions, stack identity, legal cost, and invalid-source negatives; no engine/shared behavior was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-036 --json` — **PASS**; official errata and Q3412 returned and reconciled above.
- `pnpm --dir apps/api exec tsc --noEmit --pretty false` — **baseline-only failure** at out-of-scope `apps/api/src/cards/EX4/EX4-056.test.ts:111`; EX3-036 has no type errors.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-033.test.ts src/cards/EX3/EX3-034.test.ts src/cards/EX3/EX3-036.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (3 files, 40/40 tests; EX3-036 14/14).
- Oxlint, Oxfmt, and `git diff --check` — **deferred under coordinator resource policy**.
- Broad tests, build, install, and generated logs — **not run** per coordinator resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: static and set-level delivery gates are coordinator-owned; no card-local behavior gap is known.

### EX3-037 — Dracomon

#### Sources and printed contract

- Catalog `packages/shared/src/cards/data/cards.json`: EX3-037 Dracomon is a level 3,
  2000 DP, green/blue Data Dragon Digimon with play cost 3 and green or blue level 2
  evolution cost 1.
- Printed main effect: `[Digivolve] 0 from [Bebydomon]`; `[On Play]` reveal the top 4
  cards, add 1 green or blue card with `[Dramon]` in its name and 1 card with `[Examon]`
  in its name, then place the rest at the bottom in any order.
- Printed inherited effect: `[All Turns] [Once Per Turn]` when one of your Digimon
  with `[Dramon]` or `[Examon]` in its name becomes suspended, this Digimon gets +1000 DP
  for the turn.
- Local KB query returned Q3413 and Q3414. Q3413 confirms that either category can be
  added when only that category is present. Q3414 confirms that when both categories are
  present, as many eligible cards as possible must be added; declining one is not legal.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Zero-cost evolution from Bebydomon | `digivolutionRequirement` names `Bebydomon`, cost 0, alternate | Public digivolution from EX3-001 preserves the source stack and costs 0 memory |
| Green/blue level-2 evolution routes | Catalog evolution costs and colors are preserved | Public routes from green BT1-007 and blue BT1-003 cost 1 memory; invalid level-3 BT1-009 is rejected |
| Reveal top 4 and add Dramon category | `RevealAdd.revealCount: 4`; first add filter is green/blue plus name `Dramon` | Public decision exposes only eligible green/blue Dramon cards, while a red Dramon is visible but ineligible |
| Add Examon category and Q3413/Q3414 mandatory behavior | Second add filter matches name `Examon`; both add slots are count 1 | Q3413/Q3414 tests prove sole-category add and mandatory addition of both available categories |
| Bottom all remaining cards in any order | `rest: "deckBottomAnyOrder"` | Public order decision receives the remaining cards and final deck order matches the chosen order |
| Inherited +1000 DP for the turn | Inherited `SubTrigger` listens for `whenSuspended`, filters own Dramon/Examon names, targets self, modifies DP 1000 for the turn, frequency OncePerTurn | Allied Dramon, Examon, unrelated, and opponent suspensions prove source/host boundaries; two copies and turn reset prove per-copy OPT and expiry |

#### Implementation audit

`EX3-037.ts` is compiled IR registered exclusively with `registerIrCard("EX3-037", compiled)`.
The module now typechecks without `@ts-nocheck`; no executable behavior or shared engine
code was changed.

The test proof uses public play, attack, digivolution, and decision intents. The suspension
events use the existing testkit suspension verb because the public intent surface has no
standalone suspend intent; no injected timing/fire primitive is used. Digi-Eggs appear only
as legal level-2 evolution sources, never in deck or security fixtures. Deck/security fillers
are inert main-deck Digimon.

#### Changes

- `EX3-037.ts`: removed `@ts-nocheck`.
- `EX3-037.test.ts`: added exact catalog effect-text proof, legal evolution-stack identity,
  invalid-source rejection, and replaced Digi-Egg deck/security fixtures with inert Digimon.
- No engine, shared, catalog, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-037` — **PASS**; Q3413 and Q3414 reviewed.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-037.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (12/12).
- `pnpm --dir apps/api exec tsc --noEmit -p tsconfig.json --pretty false` — **KNOWN BASELINE ONLY**: out-of-scope `src/cards/EX4/EX4-056.test.ts:111` (`"digimon"` is not assignable to the target kind union); no EX3-037 error.
- Requested fixture/injected-timing sweep — **PASS**; no Digi-Egg deck/security fixtures, numeric security counts, or injected fire/play primitives remain.
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-037.ts apps/api/src/cards/EX3/EX3-037.test.ts` — **PASS**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-037.ts apps/api/src/cards/EX3/EX3-037.test.ts docs/audits/EX3-reaudit/EX3-037.md` — **PASS**.
- `git diff --check` — **PASS**.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2** (Q3413/Q3414, category boundaries, bottom order, evolution, inherited trigger, OPT, and reset are covered)
- Peer/stack proof: **2/2** (Dramon/Examon and near-match boundaries, two inherited copies, legal stacks, and invalid source are covered)
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

### EX3-038 — Pomumon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-038 as
  Pomumon, a green level-3 Rookie/Data/Vegetation Digimon, play cost 3, 2000
  DP, with green level-2 evolution for 0 memory.
- Main text: `[Your Turn] When an effect suspends this Digimon, suspend 1 of
  your opponent's Digimon.` There is no errata returned for this card.
- Local KB Q3415 confirms that the trigger also activates when the Digimon is
  suspended by an accepted ＜Evade＞ effect.

#### Clause-to-IR-to-test mapping

| Printed clause / ruling | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Your Turn restriction | `trigger: "YourTurn"` wraps the watcher | Public suspension on the opponent's turn leaves Pomumon suspended but creates no EX3-038 decision; the controller's turn path activates normally |
| Only an effect suspension triggers | `SubTrigger` uses `event: "whenEffectSuspends"` | Public effect suspension of Pomumon triggers; an attack's rule-driven suspension does not; suspending another Vegetation Digimon does not trigger this Pomumon |
| Suspend one opposing Digimon | `Suspend` targets `controller: "opponent"`, `kind: ["Digimon"]`, `suspended: false`, `count: 1` | Public target choice proves exactly one opponent target is suspended, the unchosen target remains active, and the target prompt has min/max 1 |
| Already-suspended targets are ineligible | Structured `suspended: false` target filter | Public decision keeps a suspended opposing Digimon visible but excludes it from candidates; an all-suspended board resolves without a decision |
| Q3415 Evade timing | The same `whenEffectSuspends` watcher observes the accepted effect-driven suspension | Public deletion/respondEvade flow accepts Evade, prevents deletion, and then resolves Pomumon's target suspension |
| Repeated activations | No once-per-turn frequency is present in the IR | Public unsuspend-then-effect-suspend flow activates again; two Pomumon copies resolve independently when one effect suspends both |
| Evolution route | Catalog gives green level 2 → EX3-038 for 0 | Public breeding evolution reaches EX3-038 at unchanged memory and asserts BT1-007 remains as the source; red BT1-009 is rejected without mutation |

#### Boundaries and peer/stack proof

The public target matrix includes two active opposing Digimon, an already
suspended opposing Digimon, an unrelated Vegetation ally, and an all-suspended
opponent board. This proves opposing-controller scope, active-target
eligibility, exact count, and the distinction between the card that is
suspended and the card whose effect caused the suspension.

The turn matrix covers Pomumon's own effect suspension, an opponent effect
suspending Pomumon during Pomumon's controller's turn, a rule-driven attack
suspension, and the opponent's turn. The repeated-activation path proves no
once-per-turn restriction is accidentally present. Q3415 uses the public
deletion and `respondEvade` intents; only the Evade keyword grant is installed
as a narrow test setup seam because no card in this lane supplies that keyword
directly.

The legal breeding evolution asserts memory and source-stack identity. The
invalid red source remains in place and leaves Pomumon in hand. The only
Digi-Egg fixture is the legal breeding source; no Digi-Egg appears in deck or
security, and no numeric security fixture or injected timing call is used.

#### Implementation audit and changes

`EX3-038.ts` is complete compiled IR with `coverage: "full"`, an empty
residual list, and exclusive `registerIrCard("EX3-038", compiled)`
registration. The Your Turn gate, effect-suspension event, opposing active
target filter, exact count, and no-once-per-turn semantics are faithful. No
card-local executable behavior defect was found.

Changes were limited to removing the module's `@ts-nocheck`, adding the
illegal evolution-source/stack assertion, and replacing invalid Digi-Egg
deck/security fixtures with inert main-deck Digimon. No engine, shared,
catalog, ledger, or RUN file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-038 --json` — **PASS**; Q3415 returned and
  reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-038.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (13/13).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-038.ts apps/api/src/cards/EX3/EX3-038.test.ts` — **PASS**.
- Oxfmt check and `git diff --check` — pending final report write.
- Root/API typecheck — deferred under the coordinator resource policy; the
  known API baseline includes out-of-scope EX3-034.ts, EX3-036.ts, and
  EX4-056.test.ts:111 errors.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local gap remains. Collection typecheck and delivery gates remain
coordinator-owned.

### EX3-039 — Coredramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-039 as
  Coredramon, a green level-4 Champion/Virus/Dragon Digimon, play cost 5,
  6000 DP, with standard green or blue level-3 evolution for 3 memory.
- Alternate evolution: `Digivolve: 2 if name contains [Dracomon]`.
- Printed keyword: ＜Blocker＞.
- Inherited text: `[All Turns] While this Digimon has [Dramon] or [Examon] in
  its name, it gains ＜Blocker＞.`
- Local KB query returns no card-specific Q&A for EX3-039. General Blocker,
  attack redirection, evolution-cost, and inherited-stack rules are exercised
  by the public flows below.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Intrinsic Blocker | `Static` effect publishes the `Blocker` keyword | Public attack opens a block window with Coredramon as the only eligible blocker; accepting it suspends Coredramon and removes the attacker before security is checked |
| Standard green/blue level-3 evolution for 3 | Catalog supplies both standard requirements; the card IR retains the catalog route | Public tests digivolve from blue BT1-029 and green BT1-064, assert memory reaches 0, and prove the card reaches the top of the source stack |
| Alternate Dracomon evolution for 2 | `digivolutionRequirement` contains `names: ["Dracomon"]`, `cost: 2`, `isAlternate: true` | Public EX3-037 Dracomon, BT21-046 Dracomon X, and off-color BT20-007 Dracomon flows all accept `useAlternateCost: true` and reach memory 0 |
| Invalid evolution boundary | Alternate route is name-based and standard routes are color/level-based | Public red BT1-009 source is rejected without changing its stack, memory, or Coredramon hand zone |
| Inherited All Turns Blocker | `AllTurns` `Aura` targets self, grants Blocker, and is gated by `selfHasNameContaining` for Dramon or Examon | Public Wingdramon and Examon hosts gain Blocker while an unrelated BT1-038 host does not; Armor Purge promotes EX3-020 and recomputes the inherited keyword |
| Blocker accept/decline/suspension boundary | The keyword is consumed by the production block window; no card-local optional approximation exists | Public accept flow suspends the blocker and removes the attacker; decline permits the security attack; a pre-suspended Coredramon never opens a block window |

#### Boundaries and peer/stack proof

The evolution matrix covers both printed standard colors and the alternate
name route, including Dracomon X and an off-color Dracomon to prove the
alternate requirement is name-based rather than color-based. The invalid red
source proves an unrelated level/color cannot enter the stack.

The inherited matrix uses EX3-020 Wingdramon and EX3-074 Examon as positive
name peers and BT1-038 as a negative host. The Armor Purge flow verifies that
the inherited effect is recomputed when EX3-020 is promoted from below BT10-074
and becomes the new top card.

The attack matrix proves the only eligible blocker, defender choice, accepted
redirection, declined redirection, suspension state, security endpoint, and
the already-suspended negative. Fixtures use explicit inert security cards;
there are no Digi-Egg cards in deck/security, no numeric security fixtures,
and no injected `advance.fire`, `fireSubTrigger`, or `fireTiming` proof.

#### Implementation audit and changes

`EX3-039.ts` is complete compiled IR with `coverage: "full"`, an empty
residual list, the static Blocker keyword, the inherited name-gated Aura, and
exclusive `registerIrCard("EX3-039", compiled)` registration. No card-local
executable behavior defect was found.

Changes were limited to removing the module's `@ts-nocheck`, strengthening
metadata/effect-text assertions, and adding the invalid evolution-source/
stack proof. No engine, shared, catalog, ledger, or RUN file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-039 --json` — **PASS**; no direct Q&A was
  returned, reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-039.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (11/11).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-039.ts apps/api/src/cards/EX3/EX3-039.test.ts` — **PASS**.
- Oxfmt check and `git diff --check` — pending final report write.
- Root/API typecheck — deferred under the coordinator resource policy while
  unrelated external typecheck processes are active; known API baseline reds
  include EX3-034.ts, EX3-036.ts, and EX4-056.test.ts:111.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local gap remains. Collection typecheck and delivery gates remain
coordinator-owned.

### EX3-040 — Parasaurmon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-040 as
  Parasaurmon, a green level-4 Champion/Virus/Dinosaur Digimon, play cost 5,
  4000 DP, with green level-3 evolution for 2 memory.
- Main text: `[Your Turn] When you would play a green Digimon card, by
  suspending this Digimon, reduce the cost by 1.`
- Inherited text: `[Your Turn][Once Per Turn] When an effect suspends one of
  your Digimon, suspend 1 of your opponent's Digimon.`
- Local KB query returns no card-specific Q&A for EX3-040. General replacement,
  suspend-cost, controller/turn, and inherited suspension rules are exercised
  by the public flows below.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Your Turn replacement window | Outer `YourTurn` action is a `Replacement` on `wouldBePlayed` | Public play flows offer the reducer on the controller's turn and do not offer it during the opponent's turn |
| Green Digimon-only scope | Replacement `sourceFilter` requires `controllerDefault: "mine"`, `kind: ["Digimon"]`, and `colors: ["Green"]` | Green Digimon receives the prompt; blue Digimon, green Tamer, green Option, and an opponent's green Digimon do not |
| Suspend this Parasaurmon as the cost | Nested replacement uses `mode: "reduceCost"`, amount 1, self target, `cost.kind: "suspend"`, and `optional: true` with `abortOnDecline` | Accepted play suspends Parasaurmon and saves one memory; decline pays the full cost and leaves it ready; a permanent suspension restriction removes the prompt |
| Multiple copies | Each ready copy installs its own replacement and reduces the same green Digimon play | Public two-copy flow opens two decisions, suspends both copies, and reduces cost by 2 |
| Inherited Your Turn/OPT suspension | Inherited `SubTrigger` listens for `whenEffectSuspends`, source-filters own Digimon, targets one active opponent Digimon, and uses `frequency: "OncePerTurn"` | Public flows prove own and opponent-effect suspension, ignore opposing/rule suspension, select only active targets, decline impossible target boards, and reset on the controller's next turn |
| Exact inherited target | Target requires `controller: "opponent"`, `kind: ["Digimon"]`, `suspended: false`, count 1 | The target decision keeps suspended opponents visible but excludes them and never opens a prompt when every opponent is already suspended or absent |
| Evolution | Catalog route is green level 3 → EX3-040 for 2 | Public evolution proves memory reaches 0 and preserves BT1-064 as source; red BT1-009 is rejected without mutation |

#### Boundaries and peer/stack proof

The replacement matrix covers green Digimon, blue Digimon, green Tamer,
green Option, opponent-controlled green Digimon, ready/suspended Parasaurmon,
declined cost, restricted suspension, and two ready copies. It proves the
replacement is a controller- and color-scoped cost reduction rather than a
generic play discount.

The inherited matrix uses EX3-041 with EX3-040 beneath it as the realistic
source stack, an allied Dinosaur, an opposing source, own and opposing effect
suspensions, rule-driven suspension, duplicate inherited copies, next-turn
reset, and no-target/all-suspended boards. Active and already-suspended
opposing Digimon are both visible in the target decision, but only active
targets are candidates.

The legal evolution asserts exact memory and source-stack identity; the red
source negative leaves EX3-040 in hand. No Digi-Egg appears in deck/security,
no numeric security fixture is used, and no injected `advance.fire`,
`fireSubTrigger`, or `fireTiming` proof is used.

#### Implementation audit and changes

`EX3-040.ts` is complete compiled IR with `coverage: "full"`, an empty
residual list, and exclusive `registerIrCard("EX3-040", compiled)`
registration. The green Digimon replacement filter, self-suspension cost,
optional decline behavior, inherited source/controller gate, once-per-turn
marker, and active opposing target filter are faithful. No card-local
executable behavior defect was found.

Changes were limited to removing the module's `@ts-nocheck`, adding the
illegal evolution-source/stack assertion, and replacing legacy Digi-Egg deck
fixtures with inert main-deck Digimon. No engine, shared, catalog, ledger, or
RUN file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-040 --json` — **PASS**; no direct Q&A was
  returned, reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-040.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (19/19).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-040.ts apps/api/src/cards/EX3/EX3-040.test.ts` — **PASS**.
- `pnpm --filter @aegis/api typecheck` — **FAIL**, with no EX3-040 error;
  remaining errors are out-of-scope EX3-042.test.ts:6 and baseline
  EX4-056.test.ts:111.
- Oxfmt check and `git diff --check` — pending final report write.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local gap remains. Collection typecheck and delivery gates remain
coordinator-owned.

### EX3-041 — Groundramon

#### Sources and printed contract

- Catalog `packages/shared/src/cards/data/cards.json`: EX3-041 Groundramon is a green
  level 5, 7000 DP Ultimate/Virus/Earth Dragon Digimon with play cost 7, normal green
  or blue level 4 evolution cost 4, and an alternate Coredramon evolution cost 3.
- Printed main text: `[Digivolve] 3 from [Coredramon]`; `[Your Turn]` Examon in hand can
  treat this Digimon as level 6 for DNA digivolution; `[End of Your Turn]` this Digimon
  and 1 other Digimon with `[Dramon]` in its name may DNA digivolve into a Digimon card
  in hand by paying its DNA cost.
- Printed inherited text: `[All Turns]` while this Digimon has `[Dramon]` or `[Examon]`
  in its name, it gains Blocker.
- Local KB query returned no card-specific Q&A for EX3-041.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Normal green/blue level 4 evolution | Catalog has green and blue level 4 costs of 4 | Public green and blue level 4 routes pay 4 memory and preserve the base in the stack |
| Alternate Coredramon route | `digivolutionRequirement` names Coredramon, cost 3, alternate | Public Coredramon route pays 3; an unrelated level 3 source is rejected without mutation |
| Examon-only level treatment | `GrantStatic` treats self as level 6 only in `DNADigivolution`, with `intoNames: ["Examon"]` | Live DNA-level observation returns 6 for Examon and undefined for a non-Examon result; ordinary digivolution into Examon remains illegal |
| End-of-turn optional DNA | `DnaDigivolve` has self plus one other own `[Dramon]` material, hand result filter requiring a DNA recipe, `payCost: true`, `optional: true` | Public end-phase flow proves legal partner/result candidates, stack merge, invalid partner/result exclusion, optional refusal, and source attribution |
| Inherited Blocker gate | Inherited `Aura` grants Blocker to self while its name contains Dramon or Examon | Wingdramon and Examon hosts gain Blocker; unrelated host does not |

#### Implementation audit

`EX3-041.ts` is compiled IR registered exclusively with
`registerIrCard("EX3-041", compiled)`. Removing `@ts-nocheck` exposed the DNA material
array’s untyped `isSelf` and missing zones; both slots are now explicit battle-area
`DnaDigivolveMaterialSlot`s, preserving the original self-plus-Dramon behavior. No engine,
shared, catalog, or other card file changed.

All end-of-turn proof now uses public `runOneTurn` plus `endPhase`; no injected
`advance.fire`, `fireSubTrigger`, or `fireTiming` call remains. Digi-Eggs were removed from
deck/security fixtures; only legal level-2 evolution sources remain in battle-area setup.

#### Changes

- `EX3-041.ts`: removed `@ts-nocheck` and typed both DNA battle-area material slots.
- `EX3-041.test.ts`: added exact main/inherited text, legal stack identity, invalid-source
  rejection, public end-of-turn flows, memory-at-refusal proof, and inert deck/security fillers.
- No engine, shared, catalog, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-041` — **PASS**; no card-specific Q&A returned.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-041.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (13/13).
- `pnpm --dir apps/api exec tsc --noEmit -p tsconfig.json --pretty false` — **KNOWN BASELINE ONLY**: out-of-scope `src/cards/EX4/EX4-056.test.ts:111` (`"digimon"` is not assignable to the target kind union); no EX3-041 error.
- Fixture/injected-timing sweep — **PASS**; no Digi-Egg deck/security fixtures, numeric security counts, or injected timing/play primitives remain.
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-041.ts apps/api/src/cards/EX3/EX3-041.test.ts` — **PASS**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-041.ts apps/api/src/cards/EX3/EX3-041.test.ts docs/audits/EX3-reaudit/EX3-041.md` — **PASS**.
- `git diff --check` — **PASS**.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2** (all printed clauses, optional refusal, public end-turn ordering, costs, boundaries, and final stacks are covered)
- Peer/stack proof: **2/2** (Coredramon/normal routes, invalid source, Dramon partner boundaries, Examon-only level treatment, and inherited-name gate are covered)
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

### EX3-042 — Toropiamon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78587-78617` identifies EX3-042 as green level-5 Ultimate/Virus/Vegetation Toropiamon, play cost 7, 7000 DP, with a green level-4 evolution route costing 3.
- Main text: `[When Digivolving] If this Digimon is suspended, suspend 1 of your opponent's Digimon.`
- Inherited text: `[Your Turn][Once Per Turn] When an effect suspends one of your Digimon, suspend 1 of your opponent's Digimon.`
- The local KB query returns Q3416: suspension caused by an accepted Evade effect counts as an effect suspension and activates the inherited effect.
- No card-specific errata applies.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| When Digivolving, if this Digimon is suspended, suspend one opposing Digimon | `WhenDigivolving` uses the structured `selfIsSuspended` condition and targets exactly one opposing Digimon whose `suspended` predicate is false | A suspended green level-4 base evolves legally, remains suspended, publishes exactly one target choice, suspends the chosen opponent, and leaves the other active opponent untouched; an unsuspended base produces no decision or suspension |
| Inherited Your Turn, once per turn, when an effect suspends one of your Digimon, suspend one opponent Digimon | Inherited `YourTurn` effect has `frequency: OncePerTurn`, watches `whenEffectSuspends` from any own Digimon, and targets exactly one active opposing Digimon | Vegetation peer EX3-041 carrying Toropiamon reacts to an effect suspension, Q3416 accepted Evade suspension reacts, opposing/rule-driven attack suspension does not, a second same-turn event is suppressed, the next turn resets, and two inherited copies resolve independently |

#### Boundaries and Q3416

The When Digivolving target list includes active opposing Digimon only: an already suspended opposing Digimon remains visible but is ineligible, and exactly one candidate is selected. The inherited watcher is controller-scoped (`controller: mine`) and therefore ignores an opposing Digimon's suspension. It also watches effect suspension specifically, so a normal attack's rule-driven suspension does not activate it. Q3416 is proven through a real Evade decision: the accepted Evade suspends the host, activates Toropiamon's inherited watcher, suspends the selected opponent, and prevents deletion. Once-per-turn behavior is proven across repeated effect suspensions, next-turn reset, and independent copies.

#### Evolution stack and implementation

The legal public evolution uses green level-4 BT1-072 with BT1-009 beneath it, pays exactly 3 memory, and preserves `[BT1-009, BT1-072]` below the EX3-042 top card. A red level-3 BT1-009 source is rejected without moving the hand card or changing memory. Deck/security fixtures use inert main-deck Digimon BT1-009 through BT1-014; no Digi-Egg or numeric security fixture is used.

The existing hand-audited IR was complete (`coverage: "full"`, no residuals) and used the correct structured suspension condition. The audit removes `@ts-nocheck`, exports the compiled value for structural assertions, and strengthens the colocated test; registration remains exclusively `registerIrCard("EX3-042", compiled)`. No shared engine or catalog behavior changed.

#### Verification

- `node tools/kb/query.mjs card EX3-042 --json` — **PASS**; Q3416 returned and reconciled above.
- `pnpm --dir apps/api exec tsc --noEmit --pretty false` — **baseline-only failures** in unrelated `apps/api/src/cards/EX3/EX3-041.test.ts` (`EffectTiming` missing at lines 179, 197, 217, 239, 300, 387) and `apps/api/src/cards/EX4/EX4-056.test.ts:111`; EX3-042 has no type errors after removing `@ts-nocheck`.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-042.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (12/12 tests).
- Oxlint, Oxfmt, and `git diff --check` — **deferred under coordinator resource policy**.
- Broad tests, build, install, and generated logs — **not run** per coordinator resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: static and set-level delivery gates are coordinator-owned; no card-local behavior gap is known.

### EX3-043 — Entmon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-043 as
  Entmon, a green level-5 Ultimate/Virus/Vegetation Digimon, play cost 8,
  8000 DP, with green level-4 evolution for 4 memory.
- Main text: `＜Digisorption -3＞ (When one of your Digimon digivolves into this
  card from your hand, you may suspend 1 of your Digimon to reduce the
  digivolution cost by 3.) [When Digivolving] If you have 2 or more suspended
  Digimon in play, unsuspend this Digimon.`
- Inherited text: none.
- Official errata: none returned by the local card query.
- Local KB query returns no card-specific Q&A for EX3-043. General
  Digisorption, evolution, suspension, and controller-boundary rules are
  reconciled by the public flows below.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Digisorption -3 replacement | Static `Replacement` listens to `wouldDigivolve`, reduces cost by 3, and carries the printed optional suspend cost | Accepted payment saves 3 memory; decline pays the full cost; memory-1 decline reaches -3 without mutating the cost source |
| Suspend 1 of your Digimon | Replacement cost is an optional one-card suspend targeting own Digimon | Only the legal ready allied Digimon is offered; the evolving Digimon itself may be selected; an all-suspended board opens no Digisorption decision |
| When Digivolving threshold | `WhenDigivolving` condition requires at least 2 suspended own Digimon in the battle area | Exactly two own suspended Digimon unsuspend Entmon; one own suspended Digimon leaves the stack top suspended; an opposing suspended Digimon does not count |
| Unsuspend this Digimon | IR target is self-only and count 1 | Public resolution proves the evolving permanent, not an unrelated suspended Digimon, becomes active and the event is attributed to EX3-043 `WhenDigivolving` |
| Evolution route | Catalog route is green level 4 → EX3-043 for 4 | BT1-072 → EX3-043 preserves the source stack; a red level-3 source is rejected with the card in hand and no stack mutation |

#### Boundaries and peer/stack proof

The Digisorption matrix covers acceptance, decline, memory lower boundary,
the evolving Digimon as payment, all-own-suspended no-offer behavior, and the
exact one-versus-two suspended own-Digimon threshold. A suspended opposing
Digimon is explicitly present and remains excluded from the threshold. EX3-038
Pomumon is registered as a peer: its watcher observes the accepted suspension
and suspends the opposing Digimon, proving the payment suspension is visible
through the normal public event path.

The legal evolution assertion checks the source stack identity, while the
negative red-source flow proves the catalog route is enforced without moving
Entmon from hand. No Digi-Egg appears in deck/security, no numeric security
fixture is used, and no injected `advance.fire`, `fireSubTrigger`, or
`fireTiming` proof is used.

#### Implementation audit and changes

`EX3-043.ts` is compiled IR with `coverage: "full"`, an empty residual list,
and exclusive `registerIrCard("EX3-043", compiled)` registration. The
Digisorption replacement, optional one-Digimon suspension cost, own suspended
threshold, and self-unsuspend target are faithful. No card-local executable
behavior defect was found.

Changes were limited to removing the module's `@ts-nocheck`, adding printed
text, stack, and invalid-source assertions, and replacing legacy Digi-Egg deck
fixtures with inert main-deck Digimon. No engine, shared, catalog, ledger, or
RUN file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-043 --json` — **PASS**; no direct Q&A or
  errata returned, reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-043.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (10/10).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-043.ts apps/api/src/cards/EX3/EX3-043.test.ts` — **PASS**.
- `pnpm exec oxfmt --check` on the card module, test, and report, plus
  `git diff --check` — **PASS**.
- Typecheck — deferred by coordinator resource policy; no typecheck was run in
  this lane.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local gap remains. Collection typecheck and delivery gates remain
coordinator-owned.

### EX3-044 — Breakdramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78638-78676` identifies EX3-044 as green level-6 Mega/Virus/Machine Dragon Breakdramon, play cost 12, 12000 DP, with normal green/blue level-5 evolution costs of 4.
- Alternate evolution: `Digivolve: 3 from [Groundramon] or [Wingdramon]`.
- Main text: `[All Turns][Once Per Turn] When this Digimon becomes suspended, suspend 1 of your opponent's Digimon. [All Turns][Once Per Turn] When one of your Digimon with [Dramon] or [Examon] in its name deletes an opponent's Digimon in battle and survives, trash the top card of your opponent's security stack.`
- Inherited text repeats the Dramon/Examon battle-survivor security clause.
- Q3399: a forced attack effect and a “when this Digimon is suspended” effect triggered by the same effect resolve simultaneously according to turn-player ordering: the turn player's When Attacking effects resolve first, then the non-turn player's suspension effect.
- No card-specific errata applies.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Alternate Digivolve 3 from Groundramon or Wingdramon | `digivolutionRequirement` contains alternate names Groundramon and Wingdramon at cost 3 | Public evolution pays 3 from both EX3-041 and EX3-020, preserves each source stack, and rejects an invalid BT1-009 source without moving the hand card or memory |
| All Turns once per turn, when this Digimon becomes suspended, suspend one opponent Digimon | Main `AllTurns` effect has `frequency: OncePerTurn`, a self-scoped `whenSuspended` watcher, and targets one active opposing Digimon | Public suspension targets exactly one active opponent, leaves an already suspended opponent untouched, ignores suspension of another own Digimon, and resets on the controller's next turn |
| All Turns once per turn, own Dramon/Examon battle deletion that survives, trash top security | Main `AllTurns` effect has `frequency: OncePerTurn`, a `whenDeletesInBattle` watcher filtered to own Digimon whose names contain Dramon or Examon, and trashes one opponent security card | Breakdramon and allied Dramon battle wins trash exactly one top security, a same-turn second win is suppressed, the next turn resets, and a losing Dramon does not trash security |
| Inherited battle-survivor security clause | Inherited `AllTurns` effect repeats the same `whenDeletesInBattle` source filter and once-per-turn security action | A realistic inherited EX3-044 stack contributes an independent once-per-turn trigger; main and inherited copies each trash once and both reset next turn |

#### Boundaries and Q3399

The suspension watcher is self-scoped, targets only active opposing Digimon, and does not react to another own Digimon or a rule-driven attack suspension. Q3399 is exercised through a real opponent turn (`runOneTurn`), not injected timing: EX3-024's forced attack suspends Breakdramon as its cost; the opponent's BT2-054 When Attacking effect resolves first, then Breakdramon's suspension watcher asks for the non-turn-player target. The test proves the event ordering and final attacker/target states. The battle watcher uses the production `whenDeletesInBattle` event, which is emitted only after the attacker survives; the previous unsupported `survivedBattle` filter annotation was removed while retaining the engine's event-level survivor semantics.

#### Evolution stack and implementation

Legal alternate stacks use EX3-041 Groundramon and EX3-020 Wingdramon with BT1-009 underneath, pay exactly 3, and preserve the source identity. Legal normal-cost stacks use unrelated level-5 EX3-043 and BT1-038, pay 4, and preserve BT1-010 beneath the source. A red BT1-009 source is rejected. Security and deck fixtures use inert main-deck Digimon BT1-009 through BT1-014; no Digi-Egg or numeric security fixture is present.

The prior hand-audited IR was complete and exclusively registered through `registerIrCard("EX3-044", compiled)`. The audit removes `@ts-nocheck`, exports the compiled IR for structural assertions, removes the invalid `survivedBattle` filter property (survival is intrinsic to `whenDeletesInBattle`), replaces the Q3399 injected timing seam with a real turn flow, and strengthens stack/IR proof. No shared engine, catalog, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-044 --json` — **PASS**; Q3399 returned and reconciled above.
- `pnpm --dir apps/api exec tsc --noEmit --pretty false` — **baseline-only failures** in unrelated `apps/api/src/cards/EX3/EX3-045.ts` (widened `nameOrTrait.match` at lines 45 and 75) and `apps/api/src/cards/EX4/EX4-056.test.ts:111`; EX3-044 has no type errors after removing `@ts-nocheck`.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-044.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (11/11 tests).
- Oxlint, Oxfmt, and `git diff --check` — **deferred under coordinator resource policy**.
- Broad tests, build, install, and generated logs — **not run** per coordinator resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: static and set-level delivery gates are coordinator-owned; no card-local behavior gap is known.

### EX3-045 — Hydramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78669-78690` identifies EX3-045 as green level-6 Mega/Virus/Vegetation Hydramon, play cost 13, 13000 DP, with a green level-5 evolution cost of 5 and image `EX3-045-Errata`.
- Main text: `[When Digivolving] You may suspend 1 Digimon.[All Turns] [Once Per Turn] When an opponent's Digimon becomes suspended, for each other suspended Digimon with [Vegetation], [Plant], or [Fairy] in one of their traits you have in play, gain 1 memory.[End of Your Turn] [Once Per turn] If you have 2 or more suspended Digimon with [Vegetation], [Plant], or [Fairy] in one of their traits, return 1 of your opponent's suspended Digimon to the bottom of its owner's deck.`
- No inherited or Security effect is present in the catalog.
- Official errata (`data/kb/errata.json:704-...`, dated 2022-11-11) changes the first effect from choosing either player's Digimon to any Digimon, changes the trait wording to “one of their traits,” and changes the final placement wording to “return ... to the bottom.” The implementation follows the corrected text.
- `node tools/kb/query.mjs card EX3-045` returned the official errata and no card-specific Q&A.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| When Digivolving, may suspend one Digimon | Optional `WhenDigivolving` `Suspend` action targets exactly one active Digimon with `kind: ["Digimon"]` | Public evolution suspends a selected opponent, excludes an already suspended candidate, and proves optional refusal without opening a target choice |
| All Turns/once per turn, opponent's Digimon becomes suspended; gain one memory per other own suspended family Digimon | `AllTurns`, `frequency: "OncePerTurn"`, opponent `whenSuspended` source filter, and `GainMemory` scaling over own suspended `Vegetation`/`Plant`/`Fairy` Digimon with `excludeSelf` | Public suspension covers two matching family cards, own-suspension and nonmatching negatives, same-turn suppression, controller-turn reset, and opponent-turn activity; Pomumon's public effect also feeds the watcher |
| End of Your Turn/once per turn, with at least two own suspended family Digimon, return one suspended opposing Digimon to deck bottom | `EndOfYourTurn` with `timingOverride: "OnEndTurn"`, once-per-turn frequency, two-card `youHave` condition, and opponent suspended `Return` to `deckBottom` | A real turn reaches Main, suspends Hydramon and Pomumon through public intents, resolves the end-turn target, verifies chosen card at deck bottom, trashes its source, and leaves the other opponent Digimon in play; a below-two/opponent-turn flow offers no action |

#### Boundaries, stack, and implementation

The first effect is optional and excludes already suspended Digimon. The memory watcher is opponent-only and does not react to own suspensions; its scaling excludes Hydramon itself and recognizes both Vegetation and Fairy peers while a generic Digimon is a negative. The once-per-turn marker is shared by the watcher and resets on the controller's next turn. The end-turn condition requires two suspended own family Digimon and a suspended opposing target; its public test proves source movement to trash when a stacked target is returned.

The legal stack test evolves EX3-045 from EX3-043, pays 5 memory, and asserts the source remains in the evolution stack. A separate public intent rejects a blue Level 3 BT1-028 source without changing memory, the top card, or the stack. Deck and source fixtures use inert main-deck cards; no Digi-Egg or numeric security fixture is used. The module now has no `@ts-nocheck` and registers exclusively with `registerIrCard("EX3-045", compiled)`.

No shared engine change is required. The end-turn proof uses a real `runOneTurn`/`waitForMainPhase` flow and actual suspension during Main; it does not inject timing or fire a subtrigger.

#### Verification

- `node tools/kb/query.mjs card EX3-045` — **PASS**; official errata returned, no card-specific Q&A.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-045.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (12/12 tests).
- `pnpm --dir apps/api exec tsc --noEmit -p tsconfig.json --pretty false` — **baseline-only failure** at unrelated `src/cards/EX4/EX4-056.test.ts:111`; EX3-045 is type-clean after literal typing of the trait filters.
- Oxlint, Oxfmt, and `git diff --check` — run after this report is written.
- Broad tests, build, install, and generated logs — not run by the card-only lane.

#### Rubric (0–2; delivery gate is worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gap: repository delivery and collection-level gates are coordinator-owned; no card-local behavior gap is known.

### EX3-046 — Commandramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-046 as
  Commandramon, a black level-3 Rookie/Virus/Cyborg/D-Brigade Digimon, play
  cost 3, 2000 DP, with black level-2 evolution for 0 memory, rarity C, and a
  four-copy deck limit.
- Main text: `＜Decoy ([D-Brigade])＞ (When one of your other Digimon with
  [D-Brigade] in its traits would be deleted by an opponent's effect, you may
  delete this Digimon to prevent that deletion.)`
- Inherited and Security text: none.
- Official errata: none returned by the local card query.
- Local KB query returns no card-specific Q&A for EX3-046. The general Decoy
  rule's “other,” specified-trait, opponent-effect, optional-cost, and
  one-shot prevention boundaries are exercised by the public flows below.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Decoy ([D-Brigade]) keyword | Static compiled IR carries the exact Decoy keyword/raw text; the engine's Decoy resolver parses the parenthetical trait and applies the opponent-effect rule | Keyword observation is positive; a D-Brigade target is protected while the selected Commandramon is deleted as the cost |
| “one of your other Digimon” | Engine Decoy resolution excludes the endangered permanent itself and searches only other allied battle-area Digimon | Self-deletion does not open Decoy; two eligible copies are offered and only the selected holder is paid once |
| D-Brigade trait scope | The resolver matches the parsed `[D-Brigade]` specifier against the target definition | EX3-049 and BT4-063 D-Brigade peers are protected; unrelated BT1-028 Elecmon is not |
| opponent's effect only | Deletion consult gates Decoy on an effect cause whose resolving seat differs from the target controller | An opponent-effect deletion opens the choice; own-effect deletion, battle deletion, and a self target do not |
| may delete this Digimon to prevent deletion | Decoy uses an optional 0–1 holder selection and recursively deletes the chosen holder before removing the saved target | Public refusal leaves the Decoy ready and deletes the target; acceptance moves only the selected holder to trash and preserves the target |
| Evolution route | Catalog route is black level 2 → EX3-046 for 0 memory | Missimon → Commandramon succeeds at zero cost and preserves EX3-002 in the source stack |

#### Boundaries and peer/stack proof

The behavioral matrix covers the positive D-Brigade protection path, explicit
refusal, unrelated-trait rejection, self-target rejection, battle deletion,
own-controller effect deletion, multiple independent holders, and exact holder
selection. The mixed D-Brigade board uses EX3-049 Sealsdramon and BT4-063
Commandramon as matching peers and BT1-028 Elecmon as a near-miss; the
candidate list contains only the eligible Decoy holders. A stacked Decoy with
EX3-002 beneath it proves that selecting a particular holder deletes the whole
stack and that the unselected holder remains.

The legal evolution flow starts from the catalogued black level-2 Missimon in
the breeding area, reaches EX3-046 for zero memory, and asserts source-stack
identity. The matching/negative trait flows use normal effect-deletion
resolution through the test seam; no injected timing calls are used. The only
Digi-Egg fixture is the legal breeding source EX3-002; no Digi-Egg appears in
deck or security, and no numeric security fixture is used.

#### Implementation audit and changes

`EX3-046.ts` is compiled IR with `coverage: "full"`, an empty residual list,
and exclusive `registerIrCard("EX3-046", compiled)` registration. The card's
static Decoy marker is faithful; the shared production Decoy resolver supplies
the printed trait, controller, optionality, and prevention semantics. No
card-local executable behavior defect was found.

Changes were limited to removing the module's `@ts-nocheck`, adding exact
catalog effect/deck-limit/image assertions and evolution stack proof, and
replacing the legacy Digi-Egg deck filler with inert main-deck Digimon. No
engine, shared, catalog, ledger, or RUN file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-046 --json` — **PASS**; no direct Q&A or
  errata returned, reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-046.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (7/7).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-046.ts apps/api/src/cards/EX3/EX3-046.test.ts` — **PASS**.
- `pnpm exec oxfmt --check` on the card module, test, and report, plus
  `git diff --check` — **PASS**.
- Typecheck — deferred by coordinator resource policy; no typecheck was run in
  this lane.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local gap remains. Collection typecheck and delivery gates remain
coordinator-owned.

### EX3-047 — Jazamon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-047 as
  Jazamon, a black level-3 Rookie/Data/Bird Dragon Digimon, play cost 3,
  1000 DP, with black or red level-2 evolution for 0 memory, rarity U, and a
  four-copy deck limit.
- Main text: `[Your Turn][Once Per Turn] When you play [Hina Kurihara], gain 1
  memory.`
- Inherited text: `[All Turns] While this Digimon has an [On Play] effect, it
  gets +1000 DP.`
- Official errata: none returned by the local card query.
- Local KB query returns no card-specific Q&A for EX3-047. The general
  controller/turn, exact-name, once-per-turn, reset, inherited-source, and
  conditional DP rules are reconciled by the public flows below.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Your Turn / Hina play trigger | Outer `YourTurn` effect installs a `whenPlayed` `SubTrigger` scoped to the controller and exact `Hina Kurihara` name | Own-turn Hina play gains memory; an opponent's Hina play does not; EX3-065 is the real Hina peer used in the public path |
| Once Per Turn | SubTrigger carries `frequency: "OncePerTurn"` | Two Hina plays in one turn produce one gain per Jazamon; two Jazamon copies each trigger once; the controller's next turn resets the use |
| Gain 1 memory | Nested action is `GainMemory` amount 1 | Memory moves by the expected one after the Hina play, with the Hina play cost separately reflected in the final gauge |
| All Turns inherited condition | Inherited `AllTurns` Aura targets self and applies `modifyDP` +1000 while `selfHasOnPlayEffect` | EX3-048 Jazardmon, whose top card has an On Play effect, receives +1000; EX3-049 Sealsdramon, whose top card lacks On Play, does not |
| Evolution routes | Catalog exposes black level 2 or red level 2 at cost 0 | Both EX3-002 and BT1-001 breeding sources evolve into Jazamon for 0 and preserve the source card in the stack |

#### Boundaries and peer/stack proof

The main-effect matrix covers own versus opponent turn, exact Hina plays,
multiple Hina copies, independent Jazamon copies, once-per-turn reset, and
memory accounting. The inherited matrix uses EX3-048 as an On Play-positive
Bird Dragon peer and EX3-049 as the live-top-card negative; both assert
EX3-047 remains the actual inherited source beneath the host. This proves the
condition is based on the current top card's On Play text rather than merely
the source's type, name, or the presence of an evolution card.

The legal evolution matrix covers both catalogued colors and zero cost with
source-stack identity. The only Digi-Egg instances are legal breeding sources
(`EX3-002` and `BT1-001`); no Digi-Egg appears in deck or security, no numeric
security fixture is used, and no injected `advance.fire`, `fireSubTrigger`, or
`fireTiming` proof is used.

#### Implementation audit and changes

`EX3-047.ts` is compiled IR with `coverage: "full"`, an empty residual list,
and exclusive `registerIrCard("EX3-047", compiled)` registration. The exact
Hina controller/turn trigger, once-per-turn marker, memory amount, inherited
All Turns timing, self target, and On Play condition are faithful. No
card-local executable behavior defect was found.

Changes were limited to removing the module's `@ts-nocheck`, adding exact
catalog text/deck-limit/image assertions and evolution/inherited source-stack
proof, and replacing Digi-Egg deck fillers with inert main-deck Digimon. No
engine, shared, catalog, ledger, or RUN file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-047 --json` — **PASS**; no direct Q&A or
  errata returned, reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-047.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (9/9).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-047.ts apps/api/src/cards/EX3/EX3-047.test.ts` — **PASS**.
- `pnpm exec oxfmt --check` on the card module, test, and report, plus
  `git diff --check` — **PASS**.
- Typecheck — deferred by coordinator resource policy; no typecheck was run in
  this lane.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local gap remains. Collection typecheck and delivery gates remain
coordinator-owned.

### EX3-048 — Jazardmon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78750-78784` identifies EX3-048 as black level-4 Champion/Data/Machine Dragon Jazardmon, play cost 4, 4000 DP, with black or red level-3 evolution costs of 2.
- On Play: reveal the top 4 cards of your deck; add 1 Digimon with Rock Dragon, Earth Dragon, Bird Dragon, Machine Dragon, or Sky Dragon in its traits and 1 Hina Kurihara among them; place the rest at the bottom in any order.
- Inherited: all turns, while this Digimon has an On Play effect, it gets +1000 DP.
- Authoritative local KB entries are Q3417 and Q3418. Q3417 says either qualifying category alone may be added; Q3418 says when both categories are present, as many as possible must be added (the player cannot decline one and bottom it).

#### Q3372/Q3373 provenance reconciliation

The raw `data/kb/qa.json` index places Q3372 and Q3373 under `EX3-007`, but their questions and answers quote this card's exact four-card reveal and Rock/Earth/Bird/Machine/Sky Dragon plus Hina Kurihara text. The same duplicated Q&A appears under `EX3-048` as Q3417/Q3418, which is the correct card provenance used here. This is the indexing defect already recorded in `REVIEW-NOTES.md`; Q3372/Q3373 are not applied to EX3-007 behavior, and this audit uses Q3417/Q3418 for EX3-048.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Reveal exactly 4 cards and add the two categories | `OnPlay` `RevealAdd` has `revealCount: 4`, one Digimon trait filter covering the five named traits, one Hina Kurihara name filter, and `rest: "deckBottom"` | Public play exposes all four revealed instances, publishes separate mandatory choices, rejects an empty Dragon selection, adds the selected Dragon and Hina, and bottoms the two leftovers in player-selected order |
| Q3417 one-category minimum | The two `add` entries are independently resolved, so either category can be added when present | One Hina alone is added; each of Rock, Earth, Bird, Machine, and Sky Dragon alone is recognized and added, with the other revealed cards bottomed |
| Q3418 add as many as possible | Both `add` entries are mandatory category actions, not one optional combined choice | With both Dragon and Hina revealed, the flow requires both choices and rejects a zero-card Dragon response; neither selected category can be left on the bottom |
| Inherited +1000 while live top card has On Play | Inherited `AllTurns` Aura targets self and uses `selfHasOnPlayEffect` | A host whose live top EX3-052 has On Play receives +1000; a plain EX3-049 top does not, despite both carrying EX3-048 below |

#### Trait, visibility, order, and stack boundaries

The five trait cases are tested separately with exact eligible candidates and inert non-matching fillers. The public decision keeps every revealed card visible while limiting candidates to the relevant category, and the final deck order equals the player's explicit bottom-order response. The no-category path produces no selection and bottoms all four. A legal black EX3-046 and red EX3-005 level-3 evolution pays 2 and preserves `[BT1-010, base]` below the EX3-048 top card; an invalid level-4 BT1-072 source is rejected without movement or payment.

The prior module was complete IR with zero residuals and exclusive `registerIrCard("EX3-048", compiled)` registration. The audit removes `@ts-nocheck`, exports compiled IR for structural assertions, strengthens evolution and IR proof, and replaces the Digi-Egg fixture with inert BT1-010. No shared engine, catalog, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-048 --json` — **PASS**; Q3417 and Q3418 returned and reconciled with the mis-keyed Q3372/Q3373 provenance above.
- `pnpm --dir apps/api exec tsc --noEmit --pretty false` — **baseline-only failures** in unrelated `apps/api/src/cards/EX3/EX3-045.ts` (widened `nameOrTrait.match` at lines 45 and 74) and `apps/api/src/cards/EX4/EX4-056.test.ts:111`; EX3-048 has no type errors after removing `@ts-nocheck`.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-048.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (13/13 tests).
- Oxlint, Oxfmt, and `git diff --check` — **deferred under coordinator resource policy**.
- Broad tests, build, install, and generated logs — **not run** per coordinator resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: static and set-level delivery gates are coordinator-owned; no card-local behavior gap is known.

### EX3-049 — Sealsdramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-049 as
  Sealsdramon, a black level-4 Champion/Virus/Cyborg/D-Brigade Digimon, play
  cost 5, 4000 DP, with black level-3 evolution for 2 memory, rarity U, and a
  four-copy deck limit.
- Main text: `＜Jamming＞ (This Digimon can't be deleted in battles against
  Security Digimon.)`
- Inherited text: `[Your Turn][Once Per Turn] When you play another Digimon
  with [D-Brigade] in its traits, it gains ＜Rush＞ for the turn. (This Digimon
  may attack the turn it was played.)`
- Official errata: none returned by the local card query.
- Local KB query returns no card-specific Q&A for EX3-049. The general Jamming
  battle boundary, inherited source/controller scope, trait matching,
  once-per-turn identity/reset, and temporary Rush duration are proven below.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Jamming against Security Digimon | Static compiled IR carries the exact Jamming keyword; the engine's battle deletion seam consults that keyword only for Security Digimon battles | Sealsdramon survives losing to EX3-044 revealed from security and remains on the field |
| Jamming boundary | The keyword is not a generic deletion immunity | An opposing 7000-DP EX3-050 deletes suspended Sealsdramon in a normal Digimon battle; Sealsdramon is trashed and the attacker survives |
| Your Turn inherited trigger | Inherited effect is a `YourTurn` `whenPlayed` SubTrigger scoped to allied, other Digimon with the D-Brigade trait | EX3-046 Commandramon is played by the controller and immediately gains Rush; an opponent-turn play and a non-D-Brigade BT1-028 play gain nothing |
| Once Per Turn | Inherited SubTrigger carries `frequency: "OncePerTurn"` | Two D-Brigade plays in one turn grant Rush only to the first; two inherited Sealsdramon copies each trigger once but do not leak to a second play; the next-turn flow resets the budget |
| gains Rush for the turn | Nested action is `GainKeyword` Rush with `duration: "forTheTurn"` targeting `triggerSubject` | The newly played Commandramon can attack immediately; Rush is absent from the inherited host and disappears at end of turn |
| Evolution route | Catalog route is black level 3 → EX3-049 for 2 memory | EX3-046 → EX3-049 succeeds at exact cost and preserves EX3-046 in the source stack |

#### Boundaries and peer/stack proof

The Jamming matrix covers the positive Security Digimon battle and a negative
normal Digimon battle. The inherited matrix uses EX3-046 Commandramon as a
matching D-Brigade peer, BT4-063 as a second matching peer, and BT1-028
Elecmon as the non-matching trait peer. It proves self-exclusion, independent
multiple inherited copies, opponent-turn gating, once-per-turn consumption,
next-turn reset, and end-of-turn Rush expiry.

The positive inherited flow asserts that the real Sealsdramon card is beneath
the EX3-050 host, so Rush is sourced from the correct inherited stack rather
than a synthetic marker. The legal evolution flow asserts EX3-046 remains
below EX3-049 after the exact two-memory cost. No Digi-Egg appears in
deck/security, no numeric security fixture is used, and no injected
`advance.fire`, `fireSubTrigger`, or `fireTiming` proof is used.

#### Implementation audit and changes

`EX3-049.ts` is compiled IR with `coverage: "full"`, an empty residual list,
and exclusive `registerIrCard("EX3-049", compiled)` registration. The Jamming
marker, inherited D-Brigade source filter, `excludeSelf` guard, once-per-turn
frequency, Rush target, and turn duration are faithful. No card-local
executable behavior defect was found.

Changes were limited to removing the module's `@ts-nocheck`, adding exact
catalog text/deck-limit/image assertions and evolution/inherited source-stack
proof, replacing Digi-Egg deck/security fixtures with inert main-deck cards,
and adding the non-Security battle negative. No engine, shared, catalog,
ledger, or RUN file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-049 --json` — **PASS**; no direct Q&A or
  errata returned, reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-049.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (9/9).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-049.ts apps/api/src/cards/EX3/EX3-049.test.ts` — **PASS**.
- `pnpm exec oxfmt --check` on the card module, test, and report, plus
  `git diff --check` — **PASS**.
- Typecheck — deferred by coordinator resource policy; no typecheck was run in
  this lane.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local gap remains. Collection typecheck and delivery gates remain
coordinator-owned.

### EX3-050 — Cyberdramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78807-78837` identifies EX3-050 as black level-5 Ultimate/Vaccine/Cyborg Cyberdramon, play cost 6, 7000 DP, with a black level-4 evolution route costing 3.
- Inherited text: `[All Turns] While you have a suspended Tamer in play, this Digimon gets +2000 DP.`
- `node tools/kb/query.mjs card EX3-050 --json` returns no card-specific Q&A or errata.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| All Turns while you have a suspended Tamer in play | Inherited `AllTurns` Aura targets self and is gated by `youHave` with own battle-area `Tamer` and `suspended: true` | A suspended allied Hina gives exactly +2000, unsuspending removes it, and the same bonus is present on both players' turns |
| Controller/type boundaries | The gate uses `controllerDefault: "mine"`, `kind: ["Tamer"]`, and battle-area scope | An opponent's suspended Tamer and an allied suspended Digimon do not qualify; multiple allied Tamers do not multiply one inherited source |
| Independent inherited sources and live top-card identity | Each inherited EX3-050 card contributes its own Aura; the filter is evaluated on the live host/top card | Two EX3-050 cards under one host stack to +4000; EX3-050 as the top card has no inherited effect and remains at 7000 |

#### Evolution stack and implementation

The legal public evolution uses black EX3-049 level 4 with BT1-010 beneath it, pays exactly 3 memory, and preserves `[BT1-010, EX3-049]` below the EX3-050 top card. A black level-3 EX3-046 source is rejected without moving the hand card or changing memory. The deck fixture uses inert main-deck BT1-011; no Digi-Egg or security fixture is present.

The prior module was complete IR (`coverage: "full"`, no residuals) and exclusively registered with `registerIrCard("EX3-050", compiled)`. The audit removes `@ts-nocheck`, exports compiled IR for structural assertions, and strengthens evolution and inherited-boundary proof. No shared engine, catalog, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-050 --json` — **PASS**; no card-specific Q&A or errata returned.
- `pnpm --dir apps/api exec tsc --noEmit --pretty false` — **baseline-only failures** in unrelated `apps/api/src/cards/EX3/EX3-045.ts` (widened `nameOrTrait.match` at lines 46 and 74) and `apps/api/src/cards/EX4/EX4-056.test.ts:111`; EX3-050 has no type errors after removing `@ts-nocheck`.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-050.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (9/9 tests).
- Oxlint, Oxfmt, and `git diff --check` — **deferred under coordinator resource policy**.
- Broad tests, build, install, and generated logs — **not run** per coordinator resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps: static and set-level delivery gates are coordinator-owned; no card-local behavior gap is known.

### EX3-051 — Tankdramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-051 as
  Tankdramon, a black level-5 Ultimate/Virus/Machine/D-Brigade Digimon, play
  cost 7, 7000 DP, with black level-4 evolution for 3 memory, rarity R, and a
  four-copy deck limit.
- Main text: `[When Digivolving] Reveal the top 3 cards of your deck. You may
  play 1 Digimon card with [D-Brigade] in its traits and a play cost of 5 or
  less among them without paying the cost. Trash the rest.`
- Inherited text: `[Your Turn][Once Per Turn] When one of your Digimon with
  [D-Brigade] in its traits attacks, reveal the top 2 cards of your deck. You
  may play 1 [Commandramon] among them without paying the cost. Trash the
  rest.`
- Official errata: none returned by the local card query.
- Local KB query returns Q3419: if a revealed Commandramon is not played by
  the inherited effect, it must be trashed. The refusal path below proves that
  mandatory remainder handling.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| When Digivolving reveal top 3 | Main effect is a `RevealAdd` with `revealCount: 3` and `rest: "trash"` | The public digivolution flow exposes all three cards, then resolves the selection and trashes the remainder |
| Main eligible card | Add filter requires a Digimon with the D-Brigade trait and `playCostLte: 5`, plays one for free, and is optional | EX3-049 cost 5 is selectable; EX3-051 cost 7 and EX3-065 Tamer are visible but excluded; the selected card enters the battle area without play cost |
| Main refusal and remainder | Optional main selection is followed by `rest: "trash"` | Declining the eligible play trashes all three revealed cards |
| Short main deck | RevealAdd resolves only available cards and has no artificial minimum | A one-card deck reveals/trashes that card, leaves no pending decision, and empties the deck |
| Q3419 inherited Commandramon | Inherited SubTrigger reveals 2, exact-name filters `Commandramon`, plays one free, and trashes the rest | A revealed Commandramon is played and the filler is trashed; declining the play trashes the Commandramon as required by Q3419 |
| Inherited Your Turn / Once Per Turn attack trigger | SubTrigger is `whenAttacking`, source-filtered to allied D-Brigade Digimon, with `frequency: "OncePerTurn"` | An allied D-Brigade attack triggers once; a second attack that turn does not; a non-D-Brigade or opponent-turn attack does not |
| Evolution route | Catalog route is black level 4 → EX3-051 for 3 memory | EX3-049 → EX3-051 succeeds at exact cost and preserves EX3-049 in the source stack |

#### Boundaries and peer/stack proof

The main reveal matrix covers the exact three-card window, cost and trait
filters, a non-Digimon near miss, optional refusal, mandatory trash of all
revealed cards, and a short deck. The inherited matrix uses EX3-054 with
EX3-051 beneath it as a real source stack, EX3-049 as a matching D-Brigade
attacker, EX3-046 and BT4-063 Commandramon peers, BT1-028 Elecmon as a
non-matching attacker, and an opponent-controlled attacker. It proves
once-per-turn consumption across two attacks and the Q3419 refusal boundary.

The legal evolution flow asserts the exact three-memory payment and source
stack. No Digi-Egg appears in deck/security, no numeric security fixture is
used, and no injected `advance.fire`, `fireSubTrigger`, or `fireTiming` proof
is used.

#### Implementation audit and changes

`EX3-051.ts` is compiled IR with `coverage: "full"`, an empty residual list,
and exclusive `registerIrCard("EX3-051", compiled)` registration. The
When Digivolving reveal/play/trash path, inherited D-Brigade attack watcher,
exact Commandramon filter, once-per-turn marker, and free-play/remainder
semantics are faithful. No card-local executable behavior defect was found.

Changes were limited to removing the module's `@ts-nocheck`, adding exact
catalog text/deck-limit/image assertions and source-stack proof, and replacing
Digi-Egg deck/security fixtures with inert main-deck cards. No engine, shared,
catalog, ledger, or RUN file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-051 --json` — **PASS**; Q3419 was
  explicitly reconciled in the refusal test.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-051.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (8/8).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-051.ts apps/api/src/cards/EX3/EX3-051.test.ts` — **PASS**.
- `pnpm exec oxfmt --check` on the card module, test, and report, plus
  `git diff --check` — **PASS**.
- Typecheck — deferred by coordinator resource policy; no typecheck was run in
  this lane.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local gap remains. Collection typecheck and delivery gates remain
coordinator-owned.

### EX3-052 — Jazarichmon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78858-78886` identifies EX3-052 as a black level-5 Ultimate/Data/Machine Dragon Digimon, play cost 8, 7000 DP, with black level-4 and red level-4 evolution routes costing 3.
- Main text: `[On Play] <De-Digivolve 1> 1 of your opponent's Digimon. (Trash 1 card from the top of 1 of your opponent's Digimon. Stop trashing when you would trash a level 3 card or the Digimon's last card.) Then, you may play 1 [Hina Kurihara] from your hand without paying the cost.`
- Inherited text: `[Your Turn] While this Digimon has an [On Play] effect, it gains <Security Attack +1>.`
- `node tools/kb/query.mjs card EX3-052 --json` returns no card-specific Q&A and no errata.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| On Play De-Digivolve 1 opponent's Digimon | `OnPlay` uses `DeDigivolve` with opponent Digimon target, `amount: 1`, and `stopAtLevel: 3` | Public play intent selects one of two opposing stacks, removes exactly one source card from the selected stack, and leaves the other untouched |
| Stop at level 3 or the last card | The `stopAtLevel: 3` boundary is encoded on the De-Digivolve action | A level-4-over-level-3 stack loses only its level-4 card and keeps the level-3 card; a one-under-card target also de-digivolves without a separate trash action, then the effect continues |
| Then, optional Hina Kurihara from hand without paying | `PlayWithoutCost` follows De-Digivolve, filters own hand by exact Hina name, has `optional: true`, `from: ["hand"]`, and `payCost: false` | Hina is offered after the mandatory clause, accepting moves her to the battle area for free, declining leaves her in hand, and a non-Hina hand card is not offered |
| Inherited Your Turn Security Attack +1 while this Digimon has On Play | Inherited `YourTurn` Aura grants keyword `SecurityAttack` amount 1 to self while `selfHasOnPlayEffect` | Metallicdramon with EX3-052 in its stack gets one extra security check on its controller's turn; the bonus is absent on the opponent's turn and when the live top card lacks On Play |

#### Evolution stack and implementation

The legal public evolution proof covers both catalog routes: black EX3-049 level 4 and red EX3-007 level 4, each paying exactly 3 memory. Each source begins with an inert BT1-010 card underneath, and the resulting stack preserves `[BT1-010, source]` below EX3-052. A level-3 BT1-072 source is rejected without paying memory or moving the EX3-052 hand card. Fixtures contain no Digi-Egg in deck or security and use no injected timing.

The module is complete IR (`coverage: "full"`, `residual: []`) and exclusively registers with `registerIrCard("EX3-052", compiled)`. The audit removed `@ts-nocheck`, exports `compiled` for structural IR assertions, and strengthened public tests for the exact IR, both legal evolution colors, invalid evolution, stop-at-level-3 behavior, optional Hina sequencing, and inherited keyword boundaries. No shared engine, catalog, KB, ledger, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-052 --json` — **PASS**; no card-specific Q&A or errata returned.
- `pnpm --dir apps/api exec tsc --noEmit --pretty false` — **baseline-only failure** in unrelated `apps/api/src/cards/EX4/EX4-056.test.ts:111` (`"digimon"` is not assignable to `"player" | "permanent"`); EX3-052 has no type errors after removing `@ts-nocheck`.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-052.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (8/8 tests).
- `git diff --check` — **PASS**.
- Oxlint/Oxfmt and broad tests/build/install — **deferred/not run** under coordinator resource policy.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps are coordinator-owned delivery and set-level gates; no card-local fidelity gap is known.

### EX3-053 — Metallicdramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-053 as
  Metallicdramon, a black level-6 Mega/Data/Sky Dragon Digimon, play cost 12,
  12000 DP, with black or red level-5 evolution for 4 memory, rarity SR, and
  a four-copy deck limit.
- Main text: `[On Play] ＜De-Digivolve 1＞ all of your opponent's Digimon. Then,
  delete 1 of your opponent's Digimon with a play cost of 5 or less. If no
  Digimon is deleted by this effect, none of your opponent's unsuspended
  Digimon can digivolve until the end of your opponent's turn.[Opponent's
  Turn] While you have a Tamer in play, this Digimon gains ＜Blocker＞ and
  ＜Reboot＞.`
- The catalog stores the opponent-turn clause as a continuation of
  `effectText`; `inheritedEffectText` is absent. It is therefore a main effect
  of Metallicdramon, not an inherited effect from its stack.
- Official errata: none returned by the local card query.
- Applicable KB rulings: Q3420 proves the next-turn DNA material suspension
  requirement; Q3421 proves the lock prevents Digisorption from first
  suspending an otherwise ineligible base; Q3422 proves a Tamer used “as if” a
  Digimon remains ineligible while a direct named-Tamer evolution route is
  allowed. Q2726/Q2735/Q2757/Q2766 are identical generic questions about
  evolving from a Tamer played this turn; EX3-053 has no Tamer evolution route
  in the catalog, so they are recorded as non-applicable.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| On Play De-Digivolve 1 all opposing Digimon | `DeDigivolve` targets all opposing Digimon with amount 1 | All opposing stacks are reduced before the deletion choice; eligible tops become their lower cards while the too-expensive top remains unchanged |
| Delete one opposing Digimon at play cost 5 or less | `Delete` targets one opponent Digimon with `playCostLte: 5` | The public choice exposes the two cost-5 candidates and excludes cost-7 EX3-050; selecting one removes exactly one resulting permanent |
| Conditional unsuspended evolution lock | `RestrictUnsuspendedDigivolve` targets the opponent through `untilOpponentTurnEnd`, conditioned on `ifThisEffectDidNotDelete` | Successful deletion leaves no lock; when no deletion occurs, one-unsuspended-material DNA, ordinary unsuspended evolution, Digisorption evolution, and the BT4-011 “as if Tamer” route are rejected |
| Opponent's Turn Tamer aura | Opponent-turn self Auras grant Blocker and Reboot while `youHave` an allied battle-area Tamer | Hina Kurihara on the opponent's turn grants both keywords; Metallicdramon blocks, survives, and Reboots; on its own turn or without a Tamer it has neither |
| Evolution routes | Catalog routes are black or red level 5 → EX3-053 for 4 memory | EX3-052 → EX3-053 succeeds at exact cost and preserves EX3-052 in the source stack |

#### Boundaries and peer/stack proof

The On Play matrix covers all-opponent de-digivolution, exact post-devolution
play-cost targeting, successful deletion without a lock, no-deletion lock
installation, short and mixed DNA materials, Digisorption interaction, the
named-Tamer/“as if” distinction, and expiry at the end of the opponent's
turn. Q3420, Q3421, and Q3422 are each represented by a public intent and an
observable accepted/rejected route.

The opponent-turn aura uses the real EX3-065 Hina Kurihara Tamer as the
positive peer and tests both turn and no-Tamer negatives. The final
digivolution flow uses EX3-052 Jazarichmon as the legal level-5 source and
asserts source-stack identity. No Digi-Egg appears in deck/security, no
numeric security fixture is used, and no injected `advance.fire`,
`fireSubTrigger`, or `fireTiming` proof is used.

#### Implementation audit and changes

`EX3-053.ts` is hand-fixed compiled IR with `coverage: "full"`, an empty
residual list, and exclusive `registerIrCard("EX3-053", compiled)` registration.
The On Play sequencing, target scope, conditional lock duration, opponent-turn
Tamer gate, and Blocker/Reboot grants are faithful. No card-local executable
behavior defect was found; the module already had no `@ts-nocheck` directive.

Changes were limited to adding exact catalog text/deck-limit/image assertions
and legal evolution stack proof. No engine, shared, catalog, ledger, or RUN
file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-053 --json` — **PASS**; Q3420, Q3421,
  Q3422 were explicitly reconciled, and the four non-applicable generic Tamer
  questions were documented.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-053.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (11/11).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-053.ts apps/api/src/cards/EX3/EX3-053.test.ts` — **PASS**.
- `pnpm exec oxfmt --check` on the card module, test, and report, plus
  `git diff --check` — **PASS**.
- Typecheck — deferred by coordinator resource policy; no typecheck was run in
  this lane.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local gap remains. Collection typecheck and delivery gates remain
coordinator-owned.

### EX3-054 — Darkdramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-054 as
  Darkdramon, a black level-6 Mega/Virus/Cyborg/D-Brigade Digimon, play cost
  13, 12000 DP, with black level-5 evolution for 5 memory, rarity SR, and a
  four-copy deck limit.
- Main text (the catalog stores both clauses in `effectText`): `When you would
  digivolve into this card, by returning up to 5 cards with [D-Brigade] in
  their traits from your trash to the top of your deck, reduce the
  digivolution cost by 1 for each returned card.[Your Turn][Once Per Turn] When
  you play another Digimon with [D-Brigade] in its traits, delete 1 of your
  opponent's Digimon with a play cost less than or equal to the Digimon you
  played, and unsuspend this Digimon.`
- Inherited text: none; the second clause is a main effect with a Your Turn
  once-per-turn trigger.
- Official errata: none returned by the local card query.
- Local KB query returns Q3423: after returning cards for this replacement,
  the player cannot cancel the digivolution. The ordering/no-cancel path is
  proven below.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Would digivolve into this Darkdramon | Static replacement is scoped to the controller's own would-digivolve event and `into` name Darkdramon | A Tankdramon in hand at insufficient memory is rejected without opening the Darkdramon return choice or moving trash cards |
| Return up to 5 D-Brigade trash cards to deck top | Nested replacement cost targets own trash cards with the D-Brigade trait, `upTo: true`, `allowZero: true`, and orders returned cards at `deckTop` | Zero, two, and five-card selections are supported; six D-Brigade cards expose only five slots; a non-D-Brigade card is excluded; the chosen order is observable at the deck top |
| Reduce cost by 1 per returned card | Replacement amount is 1 with scaling per returned card | Five returned cards reduce a five-memory evolution to 0; two returned cards reduce a three-memory evolution to 0; the actual count, not the available count, determines memory |
| Q3423 no cancellation | Replacement cost is mandatory after declaration (`optional: false`) and resolution proceeds through return/order before the evolution completes | After cards are selected and ordered, the evolution resolves; no cancellation path is exposed, and remaining trash cards stay in trash |
| Your Turn/Once Per Turn D-Brigade play trigger | `whenPlayed` SubTrigger is allied, other, Digimon, and D-Brigade scoped with `frequency: "OncePerTurn"` | An allied D-Brigade play deletes only an opponent Digimon within the played card's cost and unsuspends Darkdramon; a second play that turn does not retrigger, while the next turn does |
| Unsuspend this Digimon | Nested action targets the source permanent with self identity | Darkdramon unsuspends after a qualifying play even when there is no legal deletion target |

#### Boundaries and peer/stack proof

The replacement matrix covers exact zero/partial/full returns, ordering,
non-trait trash exclusion, insufficient-memory preflight, and Q3423's
post-return no-cancellation semantics. The play-trigger matrix covers cost
comparison, multiple legal targets, no-target unsuspension, once-per-turn
consumption/reset, non-D-Brigade plays, and opponent-turn plays.

The peer flow uses Tankdramon with EX3-051 beneath EX3-049 as a real D-Brigade
source stack: its inherited attack plays Commandramon, which then triggers
Darkdramon's own public `whenPlayed` watcher. The legal Darkdramon evolution
also asserts EX3-051 remains in the source stack. No Digi-Egg appears in
deck/security, no numeric security fixture is used, and no injected
`advance.fire`, `fireSubTrigger`, or `fireTiming` proof is used.

#### Implementation audit and changes

`EX3-054.ts` is hand-fixed compiled IR with `coverage: "full"`, an empty
residual list, and exclusive `registerIrCard("EX3-054", compiled)` registration.
The name-scoped replacement, D-Brigade return filter, per-card scaling,
deck-top ordering, mandatory post-declaration flow, once-per-turn trigger,
cost-relative opponent deletion, and self-unsuspend target are faithful. No
card-local executable behavior defect was found; the module already had no
`@ts-nocheck` directive.

Changes were limited to adding exact catalog metadata/text and source-stack
assertions, adding the inherited peer stack assertion, and replacing legacy
Digi-Egg deck/security fixtures with inert main-deck cards. No engine, shared,
catalog, ledger, or RUN file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-054 --json` — **PASS**; Q3423 was
  explicitly reconciled in the ordered-return/no-cancellation test.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-054.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (8/8).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-054.ts apps/api/src/cards/EX3/EX3-054.test.ts` — **PASS**.
- `pnpm exec oxfmt --check` on the card module, test, and report, plus
  `git diff --check` — **PASS**.
- Typecheck — deferred by coordinator resource policy; no typecheck was run in
  this lane.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local gap remains. Collection typecheck and delivery gates remain
coordinator-owned.

### EX3-055 — Wormmon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78944-78972` identifies EX3-055 as a purple level-3 Rookie/Free/Larva Wormmon, play cost 3, 1000 DP, with purple level-2 and red level-2 evolution routes costing 0.
- Catalog main text: `[On Play] Reveal the top 3 cards of your deck. Add 1 purple or red card with the [Free] trait or 1 card with [Imperialdramon] in its name among them to your hand, and trash 1 such card among them. Place the rest at the bottom of your deck in any order.`
- Catalog inherited text: `[All Turns] While you have a red Digimon in play, this Digimon gains <Retaliation>. (When this Digimon is deleted in battle, delete the Digimon it battled.)`
- Official errata dated 2022-11-11 changes the trash clause from `trash 1 card among them` to `trash 1 such card among them`. The module and tests use the errata wording and restrict both hand and trash choices to the eligible purple/red Free or Imperialdramon-name cards.
- Q3424 asks whether only those eligible purple/red cards are added or trashed; the answer is **yes**. The local query returns that Q&A and no other EX3-055 ruling.

#### Clause-to-IR-to-test mapping

| Printed/errata clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Reveal the top 3 | `OnPlay` uses `RevealAdd` with `revealCount: 3` | Public `playCard` reveals exactly three cards and exposes all three in the decision payload |
| Add one purple/red Free or Imperialdramon-name card to hand | First `add` entry uses colors Red/Purple plus OR name/trait filter, count 1, destination hand | A red/purple Free card is offered and moved to hand; a red Imperialdramon-name card is independently available as the second eligible choice |
| Errata: trash one **such** eligible card | Second `add` entry repeats the exact same colors and OR name/trait filter, count 1, destination trash | Q3424 proof rejects blue Free, blue Imperialdramon-name, and red cards without either trait/name from both choices; the selected eligible Imperialdramon card is trashed |
| Place the rest at the bottom in any order | `rest: "deckBottom"` | The remaining revealed cards are ordered through the public order decision and end at the deck bottom in the requested order; ordering is also proven when only one eligible card is present |
| Fewer than three cards | RevealAdd is allowed to resolve with the available cards without forcing an impossible selection | A one-card deck opens no decision and leaves that card in the deck, with no hand/trash movement |
| All Turns while you have a red Digimon in play, gain Retaliation | Inherited `AllTurns` Aura grants Retaliation while `youHave` scopes to own battle-area red Digimon | Own red in hand does not qualify, opponent red does not qualify, and own red in play grants Retaliation even after switching to the opponent's turn; a red Dinobeemon carrying Wormmon then demonstrates the Retaliation battle consequence |

#### Evolution stack and implementation

The legal evolution proof covers both catalog routes: purple BT10-006 and red BT1-001 level-2 Digi-Eggs, each at zero memory. An invalid level-3 BT1-009 source is rejected without movement or memory change. Digi-Eggs appear only in the breeding-area evolution fixtures; deck and security fixtures use ordinary main-deck Digimon and contain no numeric security shorthand.

The module is complete IR (`coverage: "full"`, `residual: []`) and exclusively registers with `registerIrCard("EX3-055", compiled)`. The audit exports `compiled` for structural assertions, adds exact IR proof, adds invalid-evolution proof, replaces prohibited Digi-Egg deck fixtures, and keeps all behavior proof on public intents and settled observable state. No shared engine, catalog, KB index, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-055 --json` — **PASS**; official 2022-11-11 errata and Q3424 returned, with no additional card-specific Q&A.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-055.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (8/8 tests).
- `git diff --check` — **PASS**.
- Typecheck, Oxlint, Oxfmt, and broad tests/build/install — **deferred/not run** under coordinator resource policy; no `@ts-nocheck` directive is present in the assigned module or test.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps are coordinator-owned delivery and set-level gates; no card-local fidelity gap is known.

### EX3-056 — Guilmon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:78975-78997` identifies EX3-056 as purple/red level-3 Rookie/Virus/Reptile Guilmon, play cost 4, 3000 DP, with a purple level-2 evolution cost of 1 and image `EX3-056`.
- Main text: `Digivolve: 0 from [Gigimon][On Deletion] Delete 1 of your opponent's Digimon with 3000 DP or less. If no Digimon is deleted by this effect, trash the top 2 cards of both players' decks.`
- No inherited or Security effect is present in the catalog.
- `node tools/kb/query.mjs card EX3-056` returned no card-specific Q&A, errata, or restriction. The audit therefore applies the catalog text directly.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Alternate Digivolve 0 from Gigimon | `digivolutionRequirement` contains `names: ["Gigimon"]`, `cost: 0`, and `isAlternate: true` | Public breeding evolution from EX2-001 Gigimon succeeds at memory 0; a regular purple level-2 source pays 1, `useAlternateCost` does not bypass the printed route, and a non-level-2 source is rejected without moving the card or memory |
| On Deletion, delete one opponent Digimon with DP ≤3000 | `OnDeletion` `Delete` targets one opponent Digimon with `dp: { op: "lte", value: 3000 }` | Public deletion exposes a 2000-DP target and the exact 3000-DP boundary, excludes a 4000-DP target, and deletes exactly the selected target |
| If no Digimon is deleted by this effect, trash top two cards of both decks | `ConditionalBranch` uses `ifThisEffectDidNotDelete` and its true branch is `TrashTopDeck` for both players, amount 2 | With no legal target, both decks mill up to two cards; when Evade prevents the selected deletion, the same no-deletion branch mills both decks while the opponent Digimon remains suspended in play |

#### Boundaries, deletion outcome, and stack proof

The target filter is opponent-only and uses the inclusive 3000-DP boundary. A successful deletion suppresses the mill branch, while an empty target set and an Evade-prevented deletion both count as “no Digimon is deleted by this effect” and execute the mill branch. The tests resolve the public deletion intent and all pending Evade/target decisions before asserting final battle-area, trash, and deck state.

The evolution tests cover the legal alternate Gigimon route, the ordinary purple level-2 route, the invalid alternate-source negative, memory payment, and source-zone transition into the breeding stack. Deck fixtures use inert main-deck Digimon only; no Digi-Egg is placed in a deck or security fixture. The module has no `@ts-nocheck` and registers exclusively through `registerIrCard("EX3-056", compiled)`.

No shared engine change is required. The card-local conditional branch and deletion outcome are observable through public intents, including the Evade interaction supplied by BT14-021.

#### Verification

- `node tools/kb/query.mjs card EX3-056` — **PASS**; no card-specific Q&A returned.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-056.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (5/5 tests).
- `pnpm --dir apps/api exec tsc --noEmit -p tsconfig.json --pretty false` — not run yet in this lane; coordinator policy retains the known unrelated EX4-056.test.ts:111 baseline.
- Oxlint, Oxfmt, and `git diff --check` — run after this report is written.
- Broad tests, build, install, and generated logs — not run by the card-only lane.

#### Rubric (0–2; delivery gate is worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gap: repository delivery and collection-level gates are coordinator-owned; no card-local behavior gap is known.

### EX3-057 — Growlmon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-057 as
  Growlmon, a purple/red level-4 Champion/Virus/Dark Dragon Digimon, play cost
  5, 5000 DP, with purple level-3 evolution for 3 memory, rarity C, and a
  four-copy catalog limit.
- Official errata dated 2022-11-11 changes the former `[On Deletion]` clause
  to `[When Digivolving] Delete 1 of your opponent's Digimon with 3000 DP or
  less. If no Digimon is deleted by this effect, trash the top 2 cards of both
  players' decks.` The catalog uses the errata image `EX3-057-Errata` and
  effective restricted copy limit 1.
- Inherited text: `[When Attacking][Once Per Turn] By deleting 1 of your other
  Digimon, this Digimon gains ＜Security Attack +1＞ for the turn. (This
  Digimon checks 1 additional security card.)`
- Local KB query returns no card-specific Q&A. The errata, alternate Guilmon
  route, deletion/mill branch, optional inherited cost, and once-per-turn
  rules are proven by the public flows below.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Errata timing and deletion | Main trigger is `WhenDigivolving`; Delete targets one opposing Digimon at DP ≤3000 | A public Guilmon evolution exposes exactly the eligible 3000-DP boundary and deletes one; the old On Deletion timing never appears |
| No-delete branch | Conditional branch uses `ifThisEffectDidNotDelete` and `TrashTopDeck` for both players, amount 2 | With only an oversized opponent, both decks mill up to two cards; the short opponent deck mills only its available card and no decision opens |
| Guilmon alternate evolution | `digivolutionRequirement` declares Guilmon name cost 2 | EX3-056 Guilmon evolves into Growlmon for 2; a non-Guilmon purple level 3 uses the printed cost 3 instead |
| Inherited attack cost | `WhenAttacking` inherited effect has optional `deleteOwn` cost targeting one other allied Digimon and `abortOnDecline` | A public attack opens the optional prompt, excludes the attacking host, deletes the selected cost Digimon, and grants Security Attack +1 for the turn |
| Inherited duration/limit | Grant is Security Attack +1 with `forTheTurn` duration and `frequency: "OncePerTurn"` | The public attack checks two security cards and observes the temporary keyword; refusal leaves the other Digimon and Security Attack amount unchanged; no-target boards open no prompt |

#### Boundaries and peer/stack proof

The errata matrix proves the corrected When Digivolving timing, exact DP
boundary, one-target deletion, no-delete mill branch, both-player deck
movement, short-deck behavior, and no legacy On Deletion behavior. The
inherited matrix uses a real BT1-020 host with EX3-057 beneath it, ST7-03 and
BT10-071 as selectable “other” Digimon, and a public player attack. It proves
the host source stack, exact optional candidate exclusion, accepted cost,
refusal, no-target negative, temporary Security Attack +1, and security-check
count.

The catalog's `maxCountInDeck: 4` is reconciled with the active banlist through
`effectiveCopyLimit("EX3-057") === 1`. No Digi-Egg appears in deck/security,
no numeric security fixture is used, and no injected `advance.fire`,
`fireSubTrigger`, or `fireTiming` proof is used.

#### Implementation audit and changes

`EX3-057.ts` is hand-verified compiled IR with `coverage: "full"`, an empty
residual list, explicit Guilmon alternate evolution cost 2, and exclusive
`registerIrCard("EX3-057", compiled)` registration. The errata timing, DP
filter, conditional both-deck mill, inherited deletion cost, self target,
temporary Security Attack grant, and once-per-turn marker are faithful. No
card-local executable behavior defect was found; the module already had no
`@ts-nocheck` directive.

Changes were limited to adding exact catalog/errata metadata and source-stack
assertions, converting inherited proof to public attack intents, and replacing
legacy Digi-Egg deck/security fixtures with inert main-deck cards. No engine,
shared, catalog, ledger, or RUN file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-057 --json` — **PASS**; no direct Q&A,
  with official errata and active restriction reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-057.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (7/7).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-057.ts apps/api/src/cards/EX3/EX3-057.test.ts` — **PASS**.
- `pnpm exec oxfmt --check` on the card module, test, and report, plus
  `git diff --check` — **PASS**.
- Typecheck — deferred by coordinator resource policy; no typecheck was run in
  this lane.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local gap remains. Collection typecheck and delivery gates remain
coordinator-owned.

### EX3-058 — Shadramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:79026-79054` identifies EX3-058 as purple level-4 Armor Form/Free/Insectoid Shadramon, play cost 5, 5000 DP, with purple and red level-3 evolution costs of 2 and image `EX3-058-Errata`.
- Main text: `[When Digivolving] Activate 1 of the effects below. ・You may digivolve 1 of your other Digimon into a level 4 red Digimon card with the [Free] trait from your trash for the cost. ・You may DNA digivolve this Digimon and one of your other Digimon may DNA digivolve into a Digimon card in your hand for the cost.`
- Inherited text: `[End of Your Turn] This Digimon and one of your other Digimon may DNA digivolve into a Digimon card in your hand for the cost.`
- Official errata (`node tools/kb/query.mjs card EX3-058`, dated 2022-11-11) changes the first branch to “level 4 red ... with the [Free] trait ... for the cost” and clarifies the second branch as this Digimon plus another Digimon DNA digivolving into a hand card for the cost. The implementation follows the corrected text.
- Q3425: the “other Digimon” chosen by the first branch does not have to be red. Q3426: inherited end-of-turn DNA remains usable after the When Digivolving DNA moves memory to the opponent's side. Both rulings are exercised below.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| When Digivolving, activate exactly one of two effects | `WhenDigivolving` contains one `Modal` with `choose: 1` and the two printed branches | Public digivolution exposes the exact `Digivolve`/`DNA digivolve` choices and the test suite covers both branches plus the refusal path |
| Other Digimon may digivolve from trash into a red level-4 Free card for cost | First modal option targets one own non-self battle-area Digimon and one own red level-4 Free Digimon from trash, pays cost, and preserves the target's existing stack | Q3425 uses purple EX3-055 Wormmon as the non-red target, evolves it into red/Free EX3-008 Flamedramon, pays 4 memory, and moves the card out of trash; optional refusal leaves both target and trash card unchanged |
| This Digimon and another may DNA digivolve into a hand Digimon for cost | Second modal option uses self plus one other own Digimon as DNA materials and takes one own Digimon from hand with `payCost: true` | Public DNA flow consumes both source permanents, creates EX3-061 Dinobeemon with all source cards in its stack, pays 2, and a no-compatible-hand negative leaves both stacks intact |
| Inherited End of Your Turn DNA | Inherited `EndOfYourTurn` effect repeats self-plus-other materials and hand Digimon target with `payCost: true` | Q3426 runs a real turn: When Digivolving DNA passes memory to the opponent's side, then inherited end-of-turn DNA still resolves and creates EX3-063 with all four source cards in its stack |

#### Boundaries, errata, and evolution stacks

Q3425 is proven through a purple (not red) EX3-055 partner while the returned evolution card is red level 4/Free. The modal decision is resolved publicly, and the optional first branch can be declined without charging or moving the trash card. The DNA option requires a compatible hand target; the incompatible BT1-009 negative preserves both battle-area stacks and the hand card. The inherited branch is marked `isInherited: true` and is demonstrated after the memory gauge crosses sides, matching Q3426.

The card's normal purple/red level-3 evolution costs and alternate branch are represented in the catalog; a separate public intent rejects a blue BT1-028 source without changing memory, stack, or hand. The successful DNA tests assert the resulting stack contains Shadramon, both source permanents, and their existing source cards. No Digi-Egg is placed in deck or security fixtures. The module has no `@ts-nocheck` and registers exclusively through `registerIrCard("EX3-058", compiled)`.

No shared engine change is required. All behavior is exercised through public digivolve/turn flows and settled observable state; no injected timing call is used.

#### Verification

- `node tools/kb/query.mjs card EX3-058` — **PASS**; official errata and Q3425/Q3426 returned.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-058.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (9/9 tests).
- `pnpm --dir apps/api exec tsc --noEmit -p tsconfig.json --pretty false` — **unrelated baseline failures** at `src/cards/EX3/EX3-059.test.ts:122,152,166,189` (`advance` is not imported) and `src/cards/EX4/EX4-056.test.ts:111` (`"digimon"` target kind); EX3-058 has no type errors.
- Oxlint, Oxfmt, and `git diff --check` — run after this report is written.
- Broad tests, build, install, and generated logs — not run by the card-only lane.

#### Rubric (0–2; delivery gate is worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gap: repository delivery and collection-level gates are coordinator-owned; no card-local behavior gap is known.

### EX3-059 — DarkTyrannomon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:79057-79084` identifies EX3-059 as a purple/green level-4 Champion/Virus/Dinosaur Digimon, play cost 5, 5000 DP, with purple level-3 and green level-3 evolution routes costing 2.
- Inherited text: `[On Deletion] Suspend 1 of your opponent's Digimon.`
- `node tools/kb/query.mjs card EX3-059 --json` returns no card-specific Q&A or errata.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Inherited On Deletion | The module registers one inherited `OnDeletion` action and has `coverage: "full"` with no residuals | Public battle intents delete a host carrying EX3-059 and resolve its pending On Deletion choice after the battle settles |
| Suspend exactly one of your opponent's Digimon | `Suspend` targets opponent Digimon, has `count: 1`, and requires `suspended: false` so already-suspended cards are not legal targets | The choice offers both ready opposing Digimon, excludes the already-suspended one, and suspends exactly the explicitly selected target while leaving the other ready |
| Inherited-source and top-card boundaries | The effect is marked `isInherited: true`, so it is contributed by source cards beneath the live top card | Two EX3-059 sources under one host resolve independently; when EX3-059 is the live top card, no inherited effect fires and the opponent remains ready |
| No legal ready target | The target filter's `suspended: false` predicate makes the action resolve without a choice when every opposing Digimon is already suspended | A public battle deletion with only suspended opposing Digimon opens no EX3-059 decision and changes no target |

#### Evolution stack and implementation

The legal public evolution proof covers both catalog routes: purple BT10-071 level 3 and green BT1-064 level 3, each paying exactly 2 memory. Each resulting permanent preserves the source card identity in `Permanent.stack`. A wrong-color red BT1-009 level-3 source is rejected without movement or memory change. Battle fixtures use ordinary Digimon and contain no Digi-Egg or numeric security fixture.

The module is complete IR (`coverage: "full"`, `residual: []`) and exclusively registers with `registerIrCard("EX3-059", compiled)`. The audit exports `compiled` for structural IR assertions, adds exact target-filter proof, adds the invalid evolution proof, and replaces direct deletion verbs with public attack intents that produce real battle deletion and settled inherited triggers. No shared engine, catalog, KB index, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-059 --json` — **PASS**; no card-specific Q&A or errata returned.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-059.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (9/9 tests).
- `git diff --check` — **PASS**.
- Typecheck, Oxlint, Oxfmt, and broad tests/build/install — **deferred/not run** under coordinator resource policy; no `@ts-nocheck` directive is present in the assigned module or test.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps are coordinator-owned delivery and set-level gates; no card-local fidelity gap is known.

### EX3-060 — ExTyrannomon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-060 as
  ExTyrannomon, a purple/green level-5 Ultimate/Vaccine/Puppet Digimon with
  play cost 7, 9000 DP, purple level-4 evolution for 3 memory, green level-4
  evolution for 3 memory, rarity C, and a four-copy catalog limit.
- Printed effect text is `＜Blocker＞ (When an opponent's Digimon attacks, you
  may suspend this Digimon to force the opponent to attack it instead.) [All
  Turns] While this Digimon has no digivolution cards, it can't attack or
  block.` There is no inherited effect text.
- The card query returns no card-specific Q&A and no official errata. The
  source-removal test therefore records a general rules interaction through
  public attack intent plus the production source-removal verb; it does not
  claim a card-specific Q&A identifier.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| `＜Blocker＞` and redirect wording | A Static effect exposes the exact `Blocker` keyword | A source-backed ExTyrannomon appears in the block window, accepts a public block intent, redirects combat, and remains suspended |
| No-source attack restriction | An All Turns self aura applies the `attack` restriction while `selfHasNoDigivolutionCards` | A directly played copy rejects its attack intent; adding a real source immediately clears the restriction |
| No-source block restriction | A second All Turns self aura applies the `block` restriction under the same no-source gate | A directly played copy is excluded from the block window and its block intent is rejected; a source-backed copy blocks successfully |
| Evolution routes | The catalog and engine recognize purple level 4 and green level 4 routes at 3 memory | Public green and purple evolutions pay exactly 3, retain the correct source identity, and clear both restrictions |

#### Boundaries and peer/stack proof

The direct-play tests prove both restrictions independently: the no-source
copy cannot attack, and it cannot block or enter the block window. A source-
backed copy proves the positive Blocker path with a real opponent attack and
the expected suspension/redirect result. A declared attack whose final source
is then removed through the production `trashDigivolutionCards` verb retains
the already-declared attack, clears the block opportunity, and proceeds to
security; this proves that the live no-source aura does not retroactively
cancel an attack. The Puppet-family path uses a real `BT2-055` source placed
under the host and proves both permissions return immediately.

Both legal evolution routes are public and stack-aware: `EX3-059 -> EX3-060`
and `BT10-074 -> EX3-060` each pay 3 memory and retain the expected level-4
source. No invalid route was added because the two catalog routes are already
fully represented by the compiled card metadata and focused public tests.

No Digi-Egg appears in deck or security fixtures, no numeric security fixture
is used, and no injected `advance.fire`, `fireSubTrigger`, or `fireTiming`
proof is used.

#### Implementation audit and changes

`EX3-060.ts` was already hand-verified compiled IR with `coverage: "full"`, an
empty residual list, and exclusive `registerIrCard("EX3-060", compiled)`
registration. Its Blocker keyword and two source-gated All Turns restrictions
match the catalog. The module had no `@ts-nocheck` directive and required no
card-local executable fix.

Changes were limited to public metadata/stack assertions and the source-
removal behavior test label, plus this evidence report. No engine, shared,
catalog, ledger, or RUN file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-060 --json` — **PASS**; no card-specific
  Q&A and no errata returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-060.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (8/8).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-060.ts apps/api/src/cards/EX3/EX3-060.test.ts` — **PASS**.
- `pnpm exec oxfmt --check` on the card module and test, plus `git diff --check`
  — **PASS**. (The Markdown report is not an oxfmt input.)
- Typecheck — deferred by coordinator resource policy; no typecheck was run
  in this lane.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local implementation gap remains. Collection typecheck and delivery
gates remain coordinator-owned.

### EX3-061 — Dinobeemon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:79117-79145` identifies EX3-061 as purple/red level-5 Ultimate/Free/Mutant Dinobeemon, play cost 8, 8000 DP, with DNA evolution cost 0 from purple level 4 plus red level 4 and image `EX3-061`.
- Main text: `DNA Digivolution: 0 from purple Lv.4 + red Lv.4[When Digivolving] When DNA digivolving, you may play 1 [Paildramon] from your trash without paying the cost.[On Deletion] You may play 1 [Wormmon] from your trash without paying the cost.`
- Inherited text: `[Your Turn] While this Digimon has [Imperialdramon] in its name, it can also attack your opponent's unsuspended Digimon.`
- `node tools/kb/query.mjs card EX3-061` returned no card-specific Q&A or errata. The catalog text and general DNA/attack rules are therefore the applicable contract.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| DNA Digivolution 0 from purple level 4 + red level 4 | `dnaDigivolveRequirement` requires one purple level-4 and one red level-4 material at cost 0 | Public DNA evolution succeeds at unchanged memory, preserves both source cards in the resulting stack, and an invalid level-3 material pair is rejected without moving hand, sources, or memory |
| When DNA digivolving, may play one Paildramon from trash without paying | `WhenDigivolving` `PlayWithoutCost` is gated by `isDnaDigivolving`, optional, and filters own trash by exact Paildramon name | Public DNA flow offers exactly the two Paildramon cards, excludes the wrong-name card, moves the selected card from trash to the battle area without cost, and supports optional refusal; ordinary non-DNA digivolution never offers it |
| On Deletion, may play one Wormmon from trash without paying | `OnDeletion` optional `PlayWithoutCost` filters exact Wormmon name from own trash | Public deletion exposes Wormmon from both a deleted stack and pre-existing trash, excludes another Larva, and proves refusal/selection resolution with the deleted source stack handled correctly |
| Inherited Your Turn Imperialdramon name permission | Inherited `YourTurn` `GrantCanAttackUnsuspended` targets self, lasts permanently, and checks `selfHasNameContaining: Imperialdramon` | EX3-063 carrying Dinobeemon can attack an opponent's unsuspended Digimon on its controller's turn; a non-Imperialdramon peer cannot, and the permission is absent during the opponent's turn |

#### Boundaries, stack, and implementation

The DNA requirement is exact by color and level, while the Paildramon branch is gated specifically to DNA digivolution rather than ordinary evolution. The tests cover two matching Paildramon names, a wrong-name negative, optional refusal, ordinary-evolution suppression, and no-compatible-hand behavior. The On Deletion branch accepts Wormmon from a deleted stack or existing trash but excludes another Larva. The inherited grant is name-based and turn-scoped, not a Vortex keyword; live attackable-target state and an actual public attack prove the unsuspended-target permission.

Successful DNA stacks preserve both purple/red material identities and their existing source cards. The invalid DNA test uses a level-3 source and asserts no stack, hand, or memory mutation. Fixtures use ordinary main-deck cards only; no Digi-Egg or numeric security fixture is present. The module has no `@ts-nocheck` and registers exclusively through `registerIrCard("EX3-061", compiled)`.

No shared engine change is required. All card behavior is exercised through public DNA, digivolve, delete, attack, and turn-state flows with settled observable state.

#### Verification

- `node tools/kb/query.mjs card EX3-061` — **PASS**; no card-specific Q&A returned.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-061.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (9/9 tests).
- `pnpm --dir apps/api exec tsc --noEmit -p tsconfig.json --pretty false` — **baseline-only failure** at unrelated `src/cards/EX4/EX4-056.test.ts:111` (`"digimon"` target kind); EX3-061 is type-clean.
- Oxlint, Oxfmt, and `git diff --check` — run after this report is written.
- Broad tests, build, install, and generated logs — not run by the card-only lane.

#### Rubric (0–2; delivery gate is worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gap: repository delivery and collection-level gates are coordinator-owned; no card-local behavior gap is known.

### EX3-062 — WarGrowlmon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:79148-79170` identifies EX3-062 as a purple/red level-5 Ultimate/Virus/Cyborg WarGrowlmon, play cost 8, 8000 DP, with a purple level-4 evolution route costing 4.
- Alternate evolution clause: `Digivolve: 3 from Lv.4 if name contains [Growlmon]`; the implementation encodes this as an alternate Growlmon-name level-4 route.
- Main text: `[When Digivolving] Trash the top 3 cards of both players' decks. Then, if either player has 5 or more cards in their trash, you may play 1 [Guilmon] or [Takato Matsuki] from your hand or trash without paying the cost.`
- `node tools/kb/query.mjs card EX3-062 --json` returns no card-specific Q&A or errata.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Alternate Digivolve 3 from level 4 with Growlmon in the name | `digivolutionRequirement` is alternate, level 4, exact Growlmon-name family, cost 3 | EX3-057 legal alternate evolution pays 3 memory; a red level-4 EX3-008 without Growlmon in its name is rejected with memory, source, and hand unchanged |
| When Digivolving trash the top 3 cards of both players' decks | `WhenDigivolving` begins with `TrashTopDeck` controller `both`, amount 3 | Public digivolution mills both decks before the decision; the own-trash and opponent-trash counts and remaining deck identities are asserted |
| Either player's trash threshold is evaluated after milling | The optional play condition is `anyOf` own trash >= 5 or opponent trash >= 5, after the mill action | One test reaches 5 in the evolving player's trash and plays newly milled Guilmon; another reaches 5 only in the opponent's trash and plays Takato from hand; both prove post-mill evaluation |
| May play one Guilmon or Takato from hand or trash without paying | `PlayWithoutCost` is optional, targets own exact names, accepts `from: ["hand", "trash"]`, and sets `payCost: false` | Guilmon is played from the newly milled trash, Takato is played from hand, and refusal leaves both eligible cards in their original zones after milling |
| Name and availability boundaries | The target filter is own-controller `nameExact` for Guilmon or Takato Matsuki | A near-match Guilmon variant is not offered; when the threshold is met but no eligible exact-name target exists, no impossible optional prompt opens |
| Threshold and short-deck boundaries | The condition remains independent of deck size and mill uses both seats | Both trashes stopping at four opens no choice; short decks mill only available cards, still evaluate the opponent's five-card threshold, and allow the optional prompt before refusal |

#### Evolution stack and implementation

The legal regular purple level-4 EX3-058 route pays 4 memory and preserves EX3-058 below the EX3-062 top card. The alternate red Growlmon-name EX3-057 route pays 3 and preserves EX3-057 below the top card. The invalid red level-4 EX3-008 name-boundary route is rejected without movement. All deck fixtures use ordinary main-deck cards; no Digi-Egg appears in deck/security, and no numeric security fixture is present.

The module is complete IR (`coverage: "full"`, `residual: []`) and exclusively registers with `registerIrCard("EX3-062", compiled)`. The audit exports `compiled` for structural assertions, adds exact IR proof and source-stack identity, strengthens the invalid evolution assertions, and cleans prohibited Digi-Egg deck fillers. No shared engine, catalog, KB index, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-062 --json` — **PASS**; no card-specific Q&A or errata returned.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-062.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (8/8 tests).
- `git diff --check` — **PASS**.
- Typecheck, Oxlint, Oxfmt, and broad tests/build/install — **deferred/not run** under coordinator resource policy; no `@ts-nocheck` directive is present in the assigned module or test.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps are coordinator-owned delivery and set-level gates; no card-local fidelity gap is known.

### EX3-063 — Imperialdramon: Dragon Mode

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:79173-79200` identifies EX3-063 as purple/red level-6 Mega/Virus/Ancient Dragon Imperialdramon: Dragon Mode, play cost 12, 12000 DP, with purple and red level-5 evolution costs of 4 and image `EX3-063-Errata`.
- Main text: `DNA Digivolution: 0 from purple Lv.5 + red Lv.5[When Digivolving] If DNA digivolving, your opponent chooses 1 of their Digimon. Delete all of their other Digimon. Then, ＜Blitz＞.[When Attacking][Once Per Turn] This Digimon gets +2000 DP for the turn. Then, this Digimon may digivolve into [Imperialdramon: Fighter Mode] in your hand for the digivolution cost.`
- No inherited effect is present in the catalog.
- Official errata (`node tools/kb/query.mjs card EX3-063`, dated 2022-11-11) changes the When Digivolving text to an explicit DNA condition, opponent choice of one survivor, deletion of all other opponent Digimon, then Blitz. The implementation follows the errata.
- Q2891: when Dragon Mode is produced during the opponent's turn by an effect, Blitz cannot authorize an attack because only the turn player may attack. The public proof below uses BT20-016 Paildramon's real All Turns deletion replacement and an opponent `attack` intent to DNA digivolve into Dragon Mode while the opponent remains the turn player, then verifies the public attack intent rejects the Blitz attack.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| DNA Digivolution 0 from purple level 5 + red level 5 | `dnaDigivolveRequirement` has one purple level-5 and one red level-5 material at cost 0 | Public DNA evolution preserves both material stacks at unchanged memory; an invalid level-3 material is rejected without moving hand, sources, or memory |
| If DNA digivolving, opponent chooses one Digimon, delete all other opponent Digimon, then Blitz | `WhenDigivolving` Delete uses opponent chooser exception with count `all`, and a separate DNA-gated `GainKeyword` grants Blitz for the turn | Public opponent decision exposes all three candidates, preserves the chosen survivor, trashes the other two, and grants Blitz; ordinary evolution has neither deletion nor Blitz |
| When Attacking/once per turn, +2000 DP, then optional Fighter Mode digivolution for cost | `WhenAttacking` has `frequency: OncePerTurn`, +2000 `ModifyDP`, and optional self `Digivolve` constrained to Fighter Mode with `costOverride: 2` | Public attack raises DP, offers only Fighter Mode cards, preserves the buff through the successful stack transition, pays 2, and sends Dragon Mode to deck bottom; decline and second-attack paths keep the buff while suppressing the second activation; no-hand path has no impossible prompt |
| Q2891 turn gate | Blitz is a temporary keyword and the production attack intent still checks turn ownership | During the opponent's public attack, BT20-016's All Turns replacement DNA digivolves the two allied materials into EX3-063; the opponent remains `turnSeat`, and the owner's public attack intent returns `not-your-turn` despite Blitz |

#### Errata, boundaries, and stack proof

The DNA deletion branch is conditional: ordinary digivolution pays 4 and leaves both opponent Digimon untouched, while DNA chooses exactly one opponent survivor and deletes the rest. The public target decision and final trash/battle-area state prove the errata's “opponent chooses” ordering. The attack branch is once per turn, optional for Fighter Mode, exact-name filtered, and preserves the +2000 DP modification after successful evolution. A no-hand negative proves the optional route does not open an impossible target choice.

The legal DNA test asserts both purple/red level-5 source cards remain in the resulting stack; the invalid-material test preserves both source permanents and the hand card. Fighter Mode's dedicated `Digivolve: 2 if name contains [Dragon Mode]` peer is used as the legal target, while a non-Fighter Imperialdramon hand card is excluded. Deck and security fixtures use inert main-deck Digimon only; no Digi-Egg or numeric security fixture is present. The module has no `@ts-nocheck` and registers exclusively through `registerIrCard("EX3-063", compiled)`.

No shared engine change is required. No injected timing call remains. The Q2891 effect-origin path is covered through the existing BT20-016 replacement and public battle attack intent; the resulting EX3-063 stack retains both Paildramon/Dinobeemon materials, gains Blitz, and cannot attack while the opponent's turn continues.

#### Verification

- `node tools/kb/query.mjs card EX3-063` — **PASS**; official errata and Q2891 returned.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-063.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (8/8 tests).
- `pnpm --dir apps/api exec tsc --noEmit -p tsconfig.json --pretty false` — **unrelated baseline failures** at `src/cards/EX3/EX3-064.ts:48`, `src/cards/EX3/EX3-065.ts:32,36`, and `src/cards/EX4/EX4-056.test.ts:111`; EX3-063 is type-clean.
- Oxlint, Oxfmt, and `git diff --check` — run after this report is written.
- Broad tests, build, install, and generated logs — not run by the card-only lane.

#### Rubric (0–2; delivery gate is worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2** (Q2891's opponent-turn effect-origin path is reproduced through BT20-016's public deletion replacement and a real opponent attack; Blitz is present but the owner attack intent is rejected)
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

No card-local behavior gap remains. Delivery remains 0 because this worker does not commit, push, or update the coordinator ledger.

### EX3-064 — Megidramon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:79203-79225` identifies EX3-064 as a purple level-6 Mega/Virus/Evil Dragon/Four Great Dragons Megidramon, play cost 12, 12000 DP, with a purple level-5 evolution route costing 4 and the special name rule also treating it as ChaosGallantmon.
- Main text: `[On Play] Delete 1 of your opponent's level 5 or lower Digimon. If this card was played by [Trial of the Four Great Dragons]'s effect, add 1 to the maximum level of the Digimon you can delete with this effect. [On Deletion] If you don't have a [Trial of the Four Great Dragons] in play, you may place 1 [Trial of the Four Great Dragons] from your hand in your battle area.`
- Official errata dated 2022-11-11 changes the On Deletion clause from mandatory placement to optional placement.
- Q3428 confirms that placing Trial via Megidramon’s On Deletion does not activate Trial’s Main Draw 1; Q3429 confirms the Rule name is always also ChaosGallantmon.

#### Clause-to-IR-to-test mapping

| Printed/errata clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Rule name also treated as ChaosGallantmon | Rule `GrantStatic` grants the name token to self | Catalog `effectiveStaticNames` and live permanent names both contain Megidramon and ChaosGallantmon |
| Ordinary On Play deletes one opposing level 5 or lower Digimon | First OnPlay Delete targets opponent Digimon with level <=5 and count 1 when Trial provenance is absent | Public play offers two level-5 candidates and excludes the opposing level-6 card; accepting one leaves the level-6 permanent |
| Trial-played On Play raises the maximum by exactly 1 | Second OnPlay Delete targets opponent Digimon level <=6 under `triggerPlayedByEffectSource: EX3-069` | Real Trial Main/Delay play selects Megidramon, offers level-5 and level-6 targets, and excludes level 7; the same provenance is independently shown in the family test |
| Errata: On Deletion Trial placement is optional and gated by no Trial in play | OnDeletion uses optional `PlaceInBattleAreaSelf`, source hand, exact Trial name filter, and `youHaveNone` battle-area gate | Public battle deletion prompts once; accepting places Trial, declining leaves it in hand, and an already placed Trial suppresses the prompt |
| Q3428: placed Trial does not activate Main | `PlaceInBattleAreaSelf` is the placement action, not Trial’s `Main` play trigger | After acceptance, Trial enters battle area without drawing, paying memory, or moving the deck; only one Megidramon optional decision is recorded |

#### Evolution stack and implementation

The legal public evolution proof uses purple level-5 BT10-079 with BT1-010 beneath it, pays exactly 4 memory, and preserves `[BT1-010, BT10-079]` below the EX3-064 top card. A red level-5 BT1-021 source is rejected without payment or movement. The Trial and deck fixtures contain no Digi-Egg in deck/security and no numeric security shorthand.

The module is complete IR (`coverage: "full"`, `residual: []`) and exclusively registers with `registerIrCard("EX3-064", compiled)`. The audit removed `@ts-nocheck`, narrows the reusable Trial filter so the module typechecks, exports `compiled` for exact structural assertions, adds evolution proof, and replaces synthetic OnPlay/direct deletion/option-placement behavior paths with public Trial play, Delay activation, and battle deletion intents. The `PlaceInBattleAreaSelf` action keeps its existing hand-scoped runtime payload through a typed spread because that action type does not declare a standalone `from` field. Turn recomputation is used only to make a later-turn Delay available. No shared engine, catalog, KB index, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-064 --json` — **PASS**; official errata, Q3428, and Q3429 returned.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-064.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (8/8 tests).
- `git diff --check` — **PASS**.
- `pnpm --filter @aegis/api typecheck` — **FAIL only at unrelated files**: `src/cards/EX3/EX3-069.ts:66` (`endOfOpponentTurn` is not assignable to `SubTriggerEvent`) and the known baseline `src/cards/EX4/EX4-056.test.ts:111` target-kind error. No EX3-064 error remains.
- Oxlint, Oxfmt, and broad tests/build/install — **deferred/not run** under coordinator resource policy; the assigned module and test contain no `@ts-nocheck` directive.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2** (worker does not commit, push, or update the coordinator ledger)
- **Worker total: 8/10**

Remaining gaps are coordinator-owned delivery and set-level gates; no card-local fidelity gap is known.

### EX3-065 — Hina Kurihara

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-065 as
  Hina Kurihara, a white Tamer with play cost 3, rarity R, and a four-copy
  catalog limit.
- Printed text is exactly `[Start of Your Turn] If your opponent has a
  Digimon in play, gain 1 memory.[Your Turn] When one of your Digimon
  digivolves into a Digimon with [Rock Dragon], [Earth Dragon], [Machine
  Dragon], or [Sky Dragon] in its traits, by suspending this Digimon, activate
  1 of that Digimon's [On Play] effects.` Security text is `[Security] Play
  this card without paying the cost.`
- The local query returns Q3430 and Q3431, but both entries are keyed with
  `related: ["EX3-012"]` and describe the Volcanicdramon interaction. They are
  reconciled as cross-card Hina/Volcanicdramon provenance, not Hina-owned
  printed clauses; the public Q3430/Q3431 flows remain covered here and in the
  EX3-012 peer tests.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Start of Your Turn, opponent Digimon in play | `StartOfYourTurn` gains exactly 1 memory under an `opponentHas` Digimon `battleArea` condition | A real turn window gains one memory with an opposing battle-area Digimon; empty battle area, breeding-only Digimon, and the opponent's turn gain none |
| Your Turn Dragon-trait digivolution | `YourTurn` installs a `whenOneOfYoursDigivolves` SubTrigger filtered to own Digimon and all four exact traits | Public evolutions cover Rock, Earth, Machine, and Sky Dragon targets; a played (not digivolved) eligible card does not trigger, and effect-driven digivolution does |
| Suspend this Tamer as the cost | The activation is optional and carries a one-self suspend cost | Accepted activation suspends Hina; refusal leaves Hina unsuspended; an already suspended Hina cannot pay and creates no activation |
| Activate one of the digivolved Digimon's On Play effects | `ActivateEffect` targets `triggerSubject`, `effectType: "OnPlay"`, `count: 1`, and records Hina as the effect source | Volcanicdramon's public On Play deletion resolves after Hina activation; the decisions and final trash/field state prove the copied effect, not merely a suspension |
| Multiple copies and ordering | Each Hina has an independent SubTrigger subscription and optional activation | Two copies open two sequential optional activations; when the first activation deletes the evolved Digimon, the second activation is skipped and the deleted Digimon's On Deletion resolves first, matching the reconciled Q3430/Q3431 ordering |
| Security play without cost | Security effect is a `Security` trigger with `isSecurity: true` and `PlayWithoutCost` from security, `payCost: false` | A real attack checks Hina from the opponent's security and places it in that opponent's battle area without a play-cost payment |

#### Boundaries and peer/stack proof

The stack tests use real public digivolution intents and assert the resulting
top card and source stack. The four positive trait routes use legal level and
color sources: EX3-048 -> EX3-011, BT1-020 -> BT2-018, EX3-047 -> EX3-048,
and BT1-020 -> EX3-053. A non-Dragon BT1-025 evolution, an opponent-side
Earth Dragon evolution, and an already-suspended Hina are all negative paths.
The effect-driven path uses the production digivolution verb because no public
player intent currently models a digivolution sourced from trash; its real
SubTrigger/On Play resolution is still settled and observed.

EX3-011 is a peer Rock Dragon that can play Hina from hand, EX3-048 is a
Machine Dragon with its own On Play reveal, EX3-053 is a Sky Dragon with
On Play deletion, and BT2-018 is the Earth Dragon On Play deletion peer. The
tests keep these peer effects registered and assert Hina's activation against
their real resolution rather than a synthetic trigger payload.

No Digi-Egg appears in deck or security fixtures, no numeric security fixture
is used, and no injected `advance.fire`, `fireSubTrigger`, or `fireTiming` path
is used. The start-of-turn proof uses the production one-turn state machine;
security uses a real attack intent.

#### Implementation audit and changes

`EX3-065.ts` is compiled IR with `coverage: "full"`, an empty residual list,
and exclusive `registerIrCard("EX3-065", compiled)` registration. The printed
conditions, trait disjunction, optional suspend cost, trigger-subject On Play
activation, and security play are faithful. The module's `@ts-nocheck`
directive was removed; the trait references use the shared `Filter["nameOrTrait"]`
type and the trigger-subject target carries its explicit empty filter and count,
so the module remains type-safe without changing behavior.

The colocated test was strengthened with exact catalog/IR assertions, public
turn and security flows, all four trait positives, public negative paths,
source-stack checks, and Q3430/Q3431 cross-card ordering proof. Forbidden
Digi-Egg fixtures and direct timing fires were removed. No engine, shared,
catalog, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-065 --json` — **PASS**; Q3430/Q3431 were
  reconciled as EX3-012-related Hina provenance.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-065.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (17/17).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-065.ts apps/api/src/cards/EX3/EX3-065.test.ts` — **PASS**.
- Oxfmt on the card module/test, `git diff --check`, and the final
  fixture/registration scan — **PASS**. (The Markdown report is not an oxfmt
  input.)
- `pnpm --dir apps/api exec tsc --noEmit --pretty false` — **FAIL**, with no
  EX3-065 errors; remaining errors are out-of-scope `apps/api/src/cards/EX3/EX3-069.ts:66`
  and baseline `apps/api/src/cards/EX4/EX4-056.test.ts:111`.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local implementation gap remains. Collection typecheck and delivery
gates remain coordinator-owned.

### EX3-066 — Hyper Infinity Cannon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:79240-79257` identifies EX3-066 as the red/black Option Hyper Infinity Cannon, play cost 6, rarity R, with the Main and Security text audited below.
- Main text: `While you have a level 6 Digimon with [Machine] in its traits in play, you may use this card without meeting its color requirements. [Main] ＜De-Digivolve 3＞ 1 of your opponent's Digimon. Then, by placing 1 card with [Cyborg] in its traits from your hand or trash under 1 of your level 6 Digimon with [Machine] in its traits as its bottom digivolution card, delete 1 of your opponent's Digimon with 6000 DP or less.`
- Security text: `[Security] Activate this card's [Main] effect.`
- `node tools/kb/query.mjs card EX3-066 --json` returns Q3432 and no errata. Q3432 clarifies that an own level 6 Machine Digimon in the battle area permits use even without a red and black Digimon or Tamer in play.

#### Clause-to-IR-to-test mapping

| Printed/Q&A clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Q3432: own level 6 Machine in the battle area waives both color requirements | Static `WaiveColorRequirement` is self-scoped and conditioned on own battle-area Digimon, level 6, and the `Machine` trait | Public Option play succeeds with only an own EX1-073 Machinedramon; no Machine, level-5 Machine, breeding-area Machine, and opponent-owned Machine all reject with `color-requirement-unmet` |
| Main De-Digivolve 3, one opponent Digimon | Main `DeDigivolve` targets one opponent Digimon with amount 3 | Public play exposes all opponent Digimon as targets, selects a stacked Digimon, and leaves exactly one of its four source cards |
| Place one Cyborg from hand or trash under one own level 6 Machine as bottom source | Main `Delete` carries an optional `place` cost with source `from: ["hand", "trash"]`, a Cyborg trait filter, and a level-6 Machine host filter | Public hand and trash paths place the selected Cyborg under the chosen host; the assertion checks bottom placement and host selection among two legal Machines |
| Delete one opponent Digimon at 6000 DP or less | The same Main action deletes one opponent Digimon with `dp: lte 6000`, `optional: true`, and `abortOnDecline: true` | Public target choices include 3000 and 6000 DP but exclude 7000 DP; the 6000 boundary is deleted while the larger Digimon survives |
| Optional cost/delete and no legal-cost boundary | The delete action is optional and aborts on decline; if no Cyborg cost exists the optional action is not offered | Public refusal after De-Digivolve preserves the legal target; a board with no Cyborg skips the optional prompt and leaves the target; a trash-only Cyborg path pays and deletes |
| Security activates Main | Security effect is `isSecurity: true` with `ActivateMain` | A real public attack reveals EX3-066 from security, resolves De-Digivolve, pays the trash-Cyborg placement, deletes a selected legal target, and removes the security card without paying the Option's memory or color requirements |

#### Implementation, boundaries, and peer/stack proof

`EX3-066.ts` is complete compiled IR (`coverage: "full"`, `residual: []`) and exclusively registers `registerIrCard("EX3-066", compiled)`. The audit removed `@ts-nocheck` and exports `compiled` solely for exact structural assertions. No shared engine, catalog, ledger, RUN, KB index, or other card file was changed.

The tests use public `playCard`, `respondDecision`, and `attack` intents with full settlement. The security attacker is inert BT1-028; BT1-025 was deliberately not used there because its printed `[Your Turn]` effect suppresses Security skills on Options it checks. The security proof therefore verifies EX3-066's own Security path rather than an attacker-side suppression rule. Existing source stacks use inert main-deck Digimon cards; no Digi-Egg appears in deck/security, and no numeric security fixture or injected timing seam is used.

EX1-073 Machinedramon and BT2-066 provide the Machine-family host boundaries. The tests prove both a hand and a trash Cyborg, bottom-stack placement, multiple level-6 Machine hosts, De-Digivolve source preservation, optional refusal, the DP boundary, and the no-legal-cost path. Evolution proof is not applicable because EX3-066 is an Option card.

#### Verification

- `node tools/kb/query.mjs card EX3-066 --json` — **PASS**; Q3432 returned, no errata.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-066.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (7/7 tests).
- `git diff --check` — **PASS**.
- Typecheck, Oxlint, Oxfmt, broad tests, build, install, and generated logs — deferred/not run under coordinator resource policy. The card module and focused test contain no `@ts-nocheck` directive.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local fidelity gap remains. Collection typecheck and delivery gates remain coordinator-owned.

### EX3-067 — Sourai

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-067 as
  Sourai, a blue Option with play cost 4, rarity U, and a four-copy catalog
  limit.
- Printed text is `[Main] Trash the top 4 digivolution cards of 1 of your
  opponent's Digimon. Until the end of your opponent's turn, all of your
  opponent's Digimon with no digivolution cards can't attack.` Security text is
  `[Security] Activate this card's [Main] effect.`
- `node tools/kb/query.mjs card EX3-067 --json` returns no card-specific Q&A
  and no errata.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Main source trash | `TrashDigivolution` targets one opposing Digimon with `digivolutionCards: "hasAny"`, removes `amount: 4` from the top, and resolves before the restriction | A five-source target retains only its bottom source; the four trashed source identities appear in the opponent's trash, while a second stacked Digimon remains unchanged |
| Target and partial-stack boundaries | The target count is exactly one and the source filter requires at least one source; the action handles fewer than four available cards | A mixed board proves the chosen target, untouched loaded target, and source-less target boundaries; with no source-bearing target, no selection opens and the restriction still applies |
| Until end of opponent's turn attack lock | `Restrict` applies to all opposing Digimon with `digivolutionCards: "none"`, restriction `attack`, duration `untilOpponentTurnEnd` | A source-less opposing Digimon rejects an attack while the lock is active; a source-backed Digimon remains unrestricted, and the source-less lock expires after the opponent's turn |
| Security activation | A Security trigger is marked `isSecurity: true` and uses `ActivateMain` | A real attack checks Sourai from security, runs the same source-trash/restriction sequence against the attacker's Digimon, and removes Sourai from security without paying its Main cost or color requirement |

#### Boundaries and peer/stack proof

The Main tests use public play intents with the card's blue color supplied by
an own blue Digimon. A no-blue negative rejects the play for the printed color
requirement. The positive stack fixture uses real multi-source Digimon and
asserts exact source identity/order after top-four trashing. The loaded versus
source-less board proves the live restriction boundary, and the expiration
test exercises a public attack rejection followed by real turn progression to
the opponent's turn end.

The Security test uses a real attack into the opponent's security rather than
an injected timing call. Sourai's Security effect then selects the attacker's
separate loaded Digimon, proving that Security activation inherits the Main
target controller and source movement semantics without a color or memory
payment.

No Digi-Egg appears in deck, security, or source-stack fixtures, no numeric
security fixture is used, and no injected `advance.fire`, `fireSubTrigger`, or
`fireTiming` proof is used.

#### Implementation audit and changes

`EX3-067.ts` is compiled IR with `coverage: "full"`, an empty residual list,
and exclusive `registerIrCard("EX3-067", compiled)` registration. Its target
scope, top-source order, attack restriction duration, and Security activation
match the catalog. The module's `@ts-nocheck` directive was removed; no
behavioral IR change was required.

The colocated test was strengthened with exact catalog/IR assertions, public
source-stack boundaries, no-source selection behavior, color failure, turn
expiry, and a real attack-driven Security path. Invalid Digi-Egg fixtures and
the direct Security timing seam were removed. No engine, shared, catalog,
ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-067 --json` — **PASS**; no card-specific
  Q&A or errata returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-067.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (7/7).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-067.ts apps/api/src/cards/EX3/EX3-067.test.ts` — **PASS**.
- Oxfmt on the card module/test, `git diff --check`, and the final
  fixture/registration/timing scan — **PASS**. (The Markdown report is not an
  oxfmt input.)
- Typecheck — deferred by coordinator resource policy; no typecheck was run
  in this lane.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local implementation gap remains. Collection typecheck and delivery
gates remain coordinator-owned.

### EX3-068 — God Flame

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:79276-79289` identifies EX3-068 as the yellow Option God Flame, play cost 5, rarity C, image `EX3-068-Errata`.
- Errata dated 2022-11-11 changes the second Main clause from mandatory recovery of a Four Great Dragons card to optional recovery: `[Main] 1 of your opponent's Digimon gets -6000 DP for the turn. Then, you may return 1 card with the [Four Great Dragons] trait from your trash to your hand.`
- Security text is `[Security] Activate this card's [Main] effect.`
- `node tools/kb/query.mjs card EX3-068 --json` returns no card-specific Q&A.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Main: one opponent Digimon gets -6000 DP for the turn | `Main` uses `ModifyDP` with opponent/Digimon controller filter, count 1, amount -6000, and `forTheTurn` duration | Public play selects one of two opposing Digimon, reduces 7000 to 1000, leaves the other at 8000, and a 6000-DP target reaches zero and is deleted |
| Then, you may return one Four Great Dragons card from your trash to your hand | `Main` uses optional `Return` from own trash with exact `Four Great Dragons` trait filter and count 1 | The family test exposes EX3-025 Azulongmon and EX3-069 Trial while excluding unrelated BT1-010, returns exactly the selected card, and refusal leaves EX3-036 in trash; no-eligible-trash skips the optional prompt |
| Security activates this card's Main effect | `Security` is marked `isSecurity: true` and uses `ActivateMain` | A real opponent attack checks EX3-068 from security, runs the -6000/recovery sequence, consumes the security card, and leaves memory unpaid without requiring a yellow source |

#### Boundaries and peer/stack proof

The Main tests prove exact one-target selection, the -6000 boundary at zero, turn-duration behavior through the resolved effect, optional acceptance/refusal, and no-target recovery behavior. The Four Great Dragons family fixture includes both a Digimon (EX3-025) and an Option (EX3-069), plus a near-pool unrelated main-deck Digimon, so the trait filter is proven across eligible card kinds and a negative.

God Flame is an Option and has no evolution route or inherited effect; an evolution stack is therefore not applicable. The source-zone proof instead verifies the exact trash-to-hand movement and that the Option itself is consumed from Security. Fixtures use only main-deck Digimon in deck/security and no numeric security counts. No injected timing helper remains.

#### Implementation audit and changes

`EX3-068.ts` is compiled IR with `coverage: "full"`, an empty residual list, and exclusive `registerIrCard("EX3-068", compiled)` registration. The `@ts-nocheck` directive was removed without changing behavior. The colocated test now asserts exact catalog text and structural Main/Security IR and replaces the injected Security timing call with a public attack intent. No engine, shared, catalog, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-068 --json` — **PASS**; official errata returned and no card-specific Q&A.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-068.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (8/8).
- Typecheck — deferred by coordinator resource policy; no typecheck was run in this lane.
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-068.ts apps/api/src/cards/EX3/EX3-068.test.ts` — **PASS**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX3/EX3-068.ts apps/api/src/cards/EX3/EX3-068.test.ts docs/audits/EX3-reaudit/EX3-068.md` — **PASS**.
- `git diff --check` and final fixture/registration/timing sweep — **PASS**.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local implementation gap remains. Collection typecheck and delivery gates remain coordinator-owned.

### EX3-069 — Trial of the Four Great Dragons

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-069 as
  Trial of the Four Great Dragons, a yellow Option with the [Four Great
  Dragons] trait, play cost 8, rarity R, and a four-copy catalog limit.
- Printed text is exactly `[Main] ＜Draw 1＞. Then, place this card in your
  battle area.[Main] ＜Delay＞ (By trashing this card in your battle area,
  activate the effect below. You can't activate this effect the turn this card
  enters play.)・Play 1 Digimon card with [Four Great Dragons] in its traits
  from your hand without paying the cost. The Digimon played by this effect
  can't digivolve to level 7, and at the next end of your opponent's turn,
  delete that Digimon.` Security text is `[Security] Place this card in its
  owner's battle area.`
- Official errata dated 2025-04-25 changes the deletion timing from “at the
  end of your opponent's turn” to “at the next end of your opponent's turn.”
  Q5722 further confirms this is the first opponent turn end after play and a
  prevented deletion does not repeat on later turns.
- The local query returns Q2613, Q3402, Q3433, Q3434, Q5722, and Q5723.
  Q2613 is related to EX3-035 Goldramon and is proven in the EX3-035 peer
  audit; Q3402 is the EX3-064 deletion-placement interaction and is proven by
  its peer test. Q3433/Q3434/Q5722 are directly exercised below. Q5723 is the
  general simultaneous end-of-turn ordering rule; the Trial watcher remains a
  one-shot next-opponent-end watcher, with no additional card-local clause.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Main Draw 1, then place this card | The first `Main` entry draws one and uses `PlaceInBattleAreaSelf` | A public paid Main play draws exactly one, leaves the remaining deck card in order, and places Trial instead of trashing it |
| Delay entry restriction | The Delay keyword is attached to the second Main effect and the engine exposes it only after the entry turn | A placed Trial has no Delay activation on entry and exposes it after a later turn |
| Play one Four Great Dragons Digimon for free | Delay uses a one-card hand filter for the [Four Great Dragons] trait, `PlayWithoutCost`, and binds the resulting permanent | The decision exposes only eligible Azulongmon/Magnadramon peers, hides an unrelated card from candidates, and the selected Digimon enters without memory payment |
| Level-7 lock | The played permanent is bound as `playedByThisEffect` and receives permanent `digivolveToLevel7` restriction | Normal and DNA level-7 evolution intents both reject with `invalid-evolution` while the lock remains observable |
| Next opponent turn-end deletion | The bound permanent has an anchored `endOfOpponentTurn` watcher with `once: true` deleting its own permanent | Q3433 adds a source and still deletes only the bound Digimon; Q5722 prevents the first deletion, preserves the level-7 lock, and proves no later opponent end repeats the deletion |
| Security placement only | Security is a separate `PlaceInBattleAreaSelf` trigger, not Main activation | A real attack checks Trial from security and places it in the security owner's battle area without drawing or paying Main cost |

#### Boundaries and peer/stack proof

The Delay flow uses public `activateEffect` intent after the entry-turn gate,
selects only matching Four Great Dragons peers, and asserts the bound played
permanent's restriction. Q3433 then adds a real source under that same
permanent before the opponent turn ends; its permanent identity, not its
current stack shape, controls the one-shot deletion. Q3434 proves both normal
and DNA level-7 routes are blocked. Q5722 proves the 2025 “next end” erratum,
the first-turn-only deletion, and persistence of the independent level-7 lock
after a deletion prevention.

EX3-035 Goldramon is the Q2613 peer for simultaneous When Digivolving effects
and returning Trial from trash; EX3-064 Megidramon is the Q3402 peer proving
that placement into the battle area does not automatically activate Trial's
Main draw. These peer paths are already covered by their colocated public
tests and are not duplicated as unrelated Trial implementation behavior.

No Digi-Egg appears in deck or security fixtures, no numeric security fixture
is used, and no injected `advance.fire`, `fireSubTrigger`, or `fireTiming`
proof is used. Security behavior is reached through a real attack intent.

#### Implementation audit and changes

`EX3-069.ts` is compiled IR with `coverage: "full"`, an empty residual list,
and exclusive `registerIrCard("EX3-069", compiled)` registration. The module
already encoded the errata-correct next-opponent-end one-shot watcher, bound
permanent identity, level-7 restriction, and separate Security placement. Its
`@ts-nocheck` directive was removed. The engine's canonical
`endOfOpponentTurn` event is present in the runtime event map but is not yet in
the shared card-facing `SubTriggerEvent` union, so the module now uses an
explicit typed compatibility constant at that boundary; the runtime event and
all behavior remain unchanged.

The colocated test was strengthened with exact catalog/metadata/IR assertions,
public attack-driven Security proof, errata/Delay gating, target trait
boundaries, source-stack identity, normal/DNA level-7 negatives, and Q3433/
Q5722 persistence behavior. Digi-Egg deck fixtures and the direct Security
timing seam were removed. No engine, shared, catalog, ledger, RUN, or other
card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-069 --json` — **PASS**; errata and all
  returned Q&A provenance were reconciled above.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-069.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (10/10).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-069.ts apps/api/src/cards/EX3/EX3-069.test.ts` — **PASS**.
- Oxfmt on the card module/test, `git diff --check`, and the final
  fixture/registration/timing scan — **PASS**. (The Markdown report is not an
  oxfmt input.)
- `pnpm --dir apps/api exec tsc --noEmit -p tsconfig.json --pretty false` —
  **PASS for EX3-069**; the only reported error was the known out-of-scope
  baseline `src/cards/EX4/EX4-056.test.ts(111,19)` (`"digimon"` is not
  assignable to the testkit target union).
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local implementation gap remains. Collection typecheck and delivery
gates remain coordinator-owned.

### EX3-070 — Avalon's Gate

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:79309-79322` identifies EX3-070 as the green/blue Option Avalon's Gate, play cost 3, rarity R, image `EX3-070`.
- Main text: `[Main] Activate 1 of the effects below. If you have a Digimon with [Examon] in its name in play, activate all of the effects below instead.・Suspend 1 of your opponent's Digimon, and 1 of your Digimon gains ＜Piercing＞ for the turn.・Unsuspend 1 of your Digimon.`
- Security text: `[Security] Suspend 1 of your opponent's Digimon, and unsuspend 1 of your Digimon.`
- `node tools/kb/query.mjs card EX3-070 --json` returns Q3435 (2024-03-28): the Security effect activates even if either side lacks Digimon; skip the unavailable part and resolve the available part.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Main chooses one bullet normally | `Main` uses a `Modal` with `choose: 1`; bullet one suspends one opposing Digimon and grants one own Digimon Piercing for the turn, while bullet two unsuspends one own Digimon | Public play without Examon exposes exactly the two printed choices; both target windows are resolved publicly, with exact candidate sets and only the selected Digimon changing |
| Examon condition activates all bullets | `chooseAll.condition` is `youHave` with own battle-area Digimon and exact name token `Examon`; both bullet arrays remain in the same Modal | EX3-074 Examon suppresses the modal choice, suspends the opponent, unsuspends Examon, and grants Examon Piercing; no choice decision is recorded |
| Security suspends one opponent Digimon and unsuspends one own Digimon | `Security` is marked `isSecurity: true` with separate opponent `Suspend` and own `Unsuspend` actions | A real opponent attack checks Avalon's Gate from Security and proves both changes, Security consumption, and no Main memory payment |
| Q3435: Security activates when one side lacks Digimon | The Security actions have independent target filters, so an unavailable side has no target while the other action remains eligible | Public Security proves the “you have no Digimon” branch: the opponent target suspends despite an empty owner battle area. A public Main bullet-1 composition with zero opposing Digimon proves the unavailable Suspend action skips while the available own Piercing action resolves; together with the exact Security IR ordering, this closes both no-target halves without inventing an impossible attack |

#### Boundaries and peer/stack proof

Main tests cover both ordinary modal bullets, exact target selection, an Examon name-positive, and no cross-bullet choice when Examon is present. The Piercing grant is turn-scoped and is asserted alongside the selected target changes. Color and memory payment are exercised through the public play intents.

Avalon's Gate is an Option with no evolution requirement or inherited effect, so an evolution stack is not applicable. The Examon peer is EX3-074, while the ordinary fixtures use inert main-deck Digimon. Public Security flow proves source movement and the independent target windows. No Digi-Egg or numeric security fixture is used, and no injected timing helper remains.

#### Q3435 compositional evidence

The Security test with zero owner Digimon proves the available opponent-Suspend half through a real security check. The public Main bullet-1 composition with zero opposing Digimon proves the corresponding unavailable-Suspend skip while the same bullet's available own-Piercing action still resolves. The exact Security IR asserts the same ordered, independent Suspend/Unsuspend primitives printed by Q3435. This composition proves both no-target halves without introducing an impossible public attack in which the opponent has no attacking Digimon; no engine change is required.

#### Implementation audit and changes

`EX3-070.ts` is compiled IR with `coverage: "full"`, an empty residual list, and exclusive `registerIrCard("EX3-070", compiled)` registration; it was already type-clean and had no `@ts-nocheck`. The colocated test now asserts exact catalog text and structural IR, adds compositional Q3435 Main proof, and replaces all injected Security timing calls with public attack intents. No engine, shared, catalog, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-070 --json` — **PASS**; Q3435 returned.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-070.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (7/7).
- Typecheck — deferred by coordinator resource policy; no typecheck was run in this lane.
- Oxlint, Oxfmt, `git diff --check`, and final fixture/registration/timing sweep — **PASS**.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2** (public Security and compositional Main flows prove both Q3435 no-target halves; no impossible attack setup or injected timing is used)
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local behavior gap remains. Collection typecheck and delivery gates remain coordinator-owned.

### EX3-071 — Laser Cannon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-071 as
  Laser Cannon, a black Option with play cost 5, rarity C, and a four-copy
  catalog limit.
- Printed text is exactly `[Main] ＜De-Digivolve 1＞ 1 of your opponent's
  Digimon. (Trash 1 card from the top of 1 of your opponent's Digimon. Stop
  trashing when you would trash a level 3 card or the Digimon's last card.)
  Then, delete 1 of your opponent's Digimon with a play cost of 5 or less.`
  Security text is `[Security] Activate this card's [Main] effect.`
- `node tools/kb/query.mjs card EX3-071 --json` returns no card-specific Q&A
  and no errata.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| De-Digivolve 1 one target | Main IR uses the dedicated `DeDigivolve` action with amount 1 and one opposing Digimon target | A public Main play selects a stacked target and trashes exactly its top source before the deletion step |
| Stop at level 3 or last card | The dedicated De-Digivolve primitive owns the printed level-3/last-card stopping rule; no separate incorrect Trash filter remains | A level-3 base with one source keeps that level-3 card and trashes only the top card; the level-3 base is not removed by De-Digivolve |
| Delete one opponent Digimon with play cost ≤5 | The second Main action deletes exactly one opposing Digimon under `playCostLte: 5` | The resulting cost-5 Digimon is deleted; a different cost-5 target can be selected after De-Digivolve, proving the two target choices are independent |
| Security activates Main | Security is a separate `ActivateMain` trigger marked `isSecurity: true` | A real attack checks Laser Cannon from security and runs the same De-Digivolve/deletion sequence without paying memory |

#### Boundaries and peer/stack proof

The public Main paths prove a multi-source stack, source-trash destination,
independent De-Digivolve and deletion targets, and the exact level-3 stopping
boundary. The black source satisfies the Option's color requirement, while a
hand-only copy rejects with `color-requirement-unmet`. The Security path uses a
separate attacker and stacked target so it proves Security activation, not a
synthetic loose-card timing call.

The card has no evolution, inherited, optional, or once-per-turn clause. No
Digi-Egg appears in deck/security or source-stack fixtures, no numeric
security fixture is used, and no injected `advance.fire`, `fireSubTrigger`, or
`fireTiming` proof is used.

#### Implementation audit and changes

`EX3-071.ts` is compiled IR with `coverage: "full"`, an empty residual list,
and exclusive `registerIrCard("EX3-071", compiled)` registration. The module
already uses the dedicated De-Digivolve primitive, preserving the engine's
intrinsic level-3/last-card stop, followed by the correct play-cost deletion.
It had no `@ts-nocheck` directive and required no executable module change.

The colocated test was strengthened with exact catalog/metadata/IR assertions
and converted the Security proof to a real attack-driven check. No engine,
shared, catalog, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-071 --json` — **PASS**; no card-specific
  Q&A or errata returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-071.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (6/6).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-071.ts apps/api/src/cards/EX3/EX3-071.test.ts` — **PASS**.
- Oxfmt on the card module/test, `git diff --check`, and the final
  fixture/registration/timing scan — **PASS**. (The Markdown report is not an
  oxfmt input.)
- Typecheck — deferred by coordinator resource policy; no typecheck was run
  in this lane.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local implementation gap remains. Collection typecheck and delivery
gates remain coordinator-owned.

### EX3-072 — Megiddo Flame

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-072 as
  Megiddo Flame, a purple Option with play cost 4, rarity C, and a four-copy
  catalog limit.
- Printed text is exactly `[Main] Delete 1 of your opponent's level 4 or
  lower Digimon. By deleting 1 of your Digimon, delete 1 of your opponent's
  level 6 or lower Digimon instead.` Security text is `[Security] You may play
  1 [Guilmon] from your trash without paying the cost.`
- `node tools/kb/query.mjs card EX3-072 --json` returns no card-specific Q&A
  and no errata.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Level-4-or-lower branch | Main is a one-choice modal whose first option targets one opposing Digimon at level ≤4 and has no own deletion cost | A public purple Main play deletes a level-4 target, leaves the level-6 opponent and all own Digimon intact, and produces no cost deletion |
| Instead branch and own deletion cost | The second modal option requires one own Digimon and one opposing Digimon at level ≤6, then uses `deleteOwn` before the opposing delete | The selected own cost Digimon is trashed and a level-6 target is deleted; no level-7 target is accepted |
| Branch eligibility boundaries | `optionConditions` require an eligible opposing target and, for the instead branch, both an own Digimon and an opposing level ≤6 target | With no level-6-or-lower opponent, no instead option opens and no own cost is paid; with no own Digimon to delete, only the level-4 branch is offered; with no level-4 target, only the instead branch remains |
| Security Guilmon recovery | Security is optional and uses `PlayWithoutCost` from the owner's trash with a name-matching Guilmon filter | A real attack checks Megiddo Flame from security, exposes two Guilmon-name candidates but excludes Growlmon/unrelated cards, and plays one free; refusal leaves Guilmon in trash |

#### Boundaries and peer/stack proof

The Main tests use public play intents and a real purple source to prove the
printed color requirement, modal branch selection, exact level 4/6/7
boundaries, own deletion cost, and final trash/battle-area zones. A purple
Tamer-only board proves that the Main color source may be a Tamer, while a
hand-only copy rejects with `color-requirement-unmet`.

The Security tests use a real opponent attack into Megiddo Flame in security,
not a loose-card timing seam. They prove the optional trash-to-field play and
decline path, exact name/trait boundary (Guilmon versus Growlmon), no memory
payment, and security removal. The card has no evolution, inherited, duration,
or once-per-turn clause beyond the modal cost paths described above.

No Digi-Egg appears in deck or security fixtures, no numeric security fixture
is used, and no injected `advance.fire`, `fireSubTrigger`, or `fireTiming`
proof is used.

#### Implementation audit and changes

`EX3-072.ts` is compiled IR with `coverage: "full"`, an empty residual list,
and exclusive `registerIrCard("EX3-072", compiled)` registration. Its modal
branch conditions, level filters, own deletion cost, optional Guilmon filter,
and Security trigger match the catalog. The module had no `@ts-nocheck`
directive and required no executable change.

The colocated test was strengthened with exact catalog/metadata/IR assertions
and converted both Security proofs to real attack-driven checks. No engine,
shared, catalog, ledger, RUN, or other card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-072 --json` — **PASS**; no card-specific
  Q&A or errata returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-072.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (9/9).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-072.ts apps/api/src/cards/EX3/EX3-072.test.ts` — **PASS**.
- Oxfmt on the card module/test, `git diff --check`, and the final
  fixture/registration/timing scan — **PASS**. (The Markdown report is not an
  oxfmt input.)
- Typecheck — deferred by coordinator resource policy; no typecheck was run
  in this lane.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local implementation gap remains. Collection typecheck and delivery
gates remain coordinator-owned.

### EX3-073 — Imperialdramon: Fighter Mode

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json:79357-79375` identifies EX3-073 as the purple/red level-6 Mega/Virus/Ancient Dragonkin Imperialdramon: Fighter Mode, play cost 13, 13000 DP, Secret Rare, with purple or red level-5 evolution costs of 5.
- Evolution text: `Digivolve: 2 if name contains [Dragon Mode]` is an alternate name-containing route in addition to the catalog's ordinary level-5 routes.
- Main text: `＜Piercing＞[When Digivolving] By returning 1 [Imperialdramon: Dragon Mode] from this Digimon's digivolution cards to the bottom of its owner's deck, none of your opponent's [Security] effects can activate for the turn.[On Deletion] You may play 1 [Wormmon] and 1 [Veemon] from your trash without paying the costs.`
- `node tools/kb/query.mjs card EX3-073 --json` returns no official errata and no card-specific Q&A. The related EX3-063 Q2891 ruling concerns Dragon Mode's Blitz and is not an EX3-073-owned clause.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| Alternate evolution for 2 from a name containing [Dragon Mode] | `digivolutionRequirement` publishes `{ names: ["Dragon Mode"], cost: 2, isAlternate: true }`; catalog purple/red level-5 routes remain available | Public evolution over EX3-063 succeeds for 2, ordinary red level-5 EX3-062 evolution succeeds for 5, and BT1-028 is rejected without movement or memory payment |
| Piercing | Static keyword is `Piercing` | A real EX3-073 attack defeats a suspended opponent Digimon, performs a security check, and leaves the attacker suspended |
| Return exactly one Imperialdramon: Dragon Mode source to its owner's deck bottom | WhenDigivolving condition and Return target both use exact `nameExact` matching, `zone: digivolutionCards`, `count: 1`, `to: deckBottom`, and `from: ["digivolutionCards"]` | Public alternate evolution returns the exact Dragon Mode source to the bottom of the owner's deck and preserves the other stack card; a Fighter Mode near-match source is not returned |
| Disable all opposing Security effects for the turn | `DisableSecurityEffect` targets self with `sourceKind: "any"`, `scope: "seat"`, and `duration: "forTheTurn"` | After a public exact-source evolution, both the Fighter Mode and an allied attacker suppress P-067's Security effect; the card is trashed, no cards are drawn, and the suppression expires after the public end-of-turn transition |
| On Deletion: you may play one Wormmon and one Veemon from trash without cost | OnDeletion is optional and gated by an `anyOf` exact-name trash condition; each `PlayWithoutCost` is restricted to its exact name and `from: ["trash"]` with `payCost: false` | A public battle deletion plays the real EX3-055 Wormmon and EX3-004 Veemon while leaving an unrelated card in trash; declining leaves both in trash, and a trash containing neither exact name creates no EX3-073 decision |

#### Implementation, boundaries, and peer/stack proof

`EX3-073.ts` is complete compiled IR (`coverage: "full"`, `residual: []`) and exclusively registers `registerIrCard("EX3-073", compiled)`. The audit removed `@ts-nocheck`, exported `compiled` for exact structural assertions, and restored the missing alternate evolution requirement from the catalog. No shared engine, catalog, ledger, RUN, KB index, or other card file was changed.

The colocated tests use public `digivolve`, `attack`, `respondDecision`, and `endPhase` intents with full settlement. The On Deletion proof uses a real opponent attack into a suspended Fighter Mode rather than an injected deletion/timing seam. The tests cover ordinary and alternate stacks, an invalid source, exact and near-match source names, deck-bottom movement, target-seat Security suppression, duration expiry, Piercing security resolution, exact trash-name selection, optional refusal, and the no-target gate. No Digi-Egg appears in deck/security fixtures, no numeric security fixture is used, and no `advance.fire`, `fireSubTrigger`, or `fireTiming` injection remains.

EX3-063 Dragon Mode is the alternate-evolution/source peer; EX3-062 provides the ordinary level-5 route. P-067 is used as a real Security-effect peer, and EX3-055/EX3-004 are the exact Wormmon/Veemon deletion-play targets. EX3-073 is not a DNA card, so no DNA-material route applies.

#### Verification

- `node tools/kb/query.mjs card EX3-073 --json` — **PASS**; no errata or card-specific Q&A returned.
- `pnpm --dir apps/api exec vitest run src/cards/EX3/EX3-073.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (7/7 tests).
- `git diff --check` — **PASS**.
- Typecheck, Oxlint, Oxfmt, broad tests, build, install, and generated logs — deferred/not run under coordinator resource policy. The card module and focused test contain no `@ts-nocheck` directive.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local fidelity gap remains. Collection typecheck and delivery gates remain coordinator-owned.

### EX3-074 — Examon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` identifies EX3-074 as
  Examon, a green/blue level-7 Mega/Data Digimon with 15000 DP, play cost 15,
  DNA evolution for 0 from green level 6 plus blue level 6, [Holy Warrior] and
  [Royal Knight] traits, rarity SEC, and a four-copy catalog limit.
- Printed text is exactly `DNA Digivolution: 0 from green Lv.6 + blue Lv.6
  [When Digivolving] You may place 1 green or blue Digimon card with [Dramon]
  in its name from your hand under this Digimon as its bottom digivolution
  card. When DNA digivolving, you may play 1 green or blue Digimon card with
  [Dramon] in its name and 12000 DP or less from your hand without paying the
  cost.[All Turns][Once Per Turn] When this Digimon becomes suspended,
  unsuspend it, and suspend 1 of your opponent's Digimon.`
- The local query returns Q3399, Q3401, and Q3436. Q3399 covers simultaneous
  suspension/attack triggers; Q3401 covers attack declaration while Examon is
  still suspended; Q3436 distinguishes the normal and DNA-only portions of the
  When Digivolving effect. All three are proven below.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| DNA 0 from green Lv.6 + blue Lv.6 | `dnaDigivolveRequirement` requires exactly one green level 6 and one blue level 6 at cost 0 | A public DNA intent consumes both materials, leaves neither original permanent, preserves both source cards, and leaves memory unchanged |
| Optional bottom Dramon source | When Digivolving uses optional `PlaceUnder` from hand, filters green/blue Digimon with [Dramon] in name, and places at bottom | Normal evolution and DNA evolution each may place `AD1-024` under Examon as the bottom source; declining both leaves both cards in hand |
| DNA-only free Dramon play | A second optional `PlayWithoutCost` is gated by `isDnaDigivolving`, with green/blue [Dramon] and DP ≤12000 filters | DNA play exposes eligible EX3-044/BT10-028 peers, excludes the over-DP, wrong-color, and unrelated cards, and does not offer this play on normal evolution |
| All Turns Once Per Turn suspension response | An All Turns self-scoped `whenSuspended` SubTrigger unsuspends Examon and suspends one opposing Digimon, with `frequency: "OncePerTurn"` | Public suspension resolves one chosen opponent and unsuspends Examon; a second same-turn suspension does not trigger again, while no-opponent boards still unsuspend Examon |

#### Boundaries and peer/stack proof

The DNA test uses real green and blue level-6 materials and asserts material
identity, resulting stack, optional source placement, optional free play, and
zero DNA memory cost. The normal-evolution test proves the source-placement
effect is not DNA-exclusive and that the DNA-only play never appears. The
candidate matrix includes eligible Dramon-name cards, a DP-over-12000 Dramon,
a wrong-color Dramon, and an unrelated card.

The Q3399/Q3401 flow uses a real production turn start and Slayerdramon's
Start of Opponent's Main Phase effect. It chooses Examon as the still-suspended
forced attack target before Examon's own suspension watcher resolves, then
settles the simultaneous attack/suspension effects and verifies Examon
unsuspends while the other attacker is suspended. This proves the target and
trigger ordering without an injected timing fire.

No Digi-Egg appears in deck, security, or source fixtures, no numeric security
fixture is used, and no injected `advance.fire`, `fireSubTrigger`, or
`fireTiming` proof is used. The suspension tests use the production suspend
verb and public observable state; the Q3399/Q3401 path uses the production
one-turn/main-phase flow.

#### Implementation audit and changes

`EX3-074.ts` is compiled IR with `coverage: "full"`, an empty residual list,
explicit DNA materials, and exclusive `registerIrCard("EX3-074", compiled)`
registration. Its optional source placement, DNA-only free play, exact Dramon
filters, DP boundary, self-scoped once-per-turn watcher, and opponent target
match the catalog. The module had no `@ts-nocheck` directive and required no
executable change.

The colocated test was strengthened with exact catalog/metadata/IR assertions,
fixture cleanup, and replacement of the direct start-main timing seam with a
real production turn flow. No engine, shared, catalog, ledger, RUN, or other
card file was changed.

#### Verification

- `node tools/kb/query.mjs card EX3-074 --json` — **PASS**; Q3399, Q3401, and
  Q3436 are explicitly covered.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-074.test.ts --maxWorkers=1 --no-file-parallelism` — **PASS** (8/8).
- `pnpm exec oxlint apps/api/src/cards/EX3/EX3-074.ts apps/api/src/cards/EX3/EX3-074.test.ts` — **PASS**.
- Oxfmt on the card module/test, `git diff --check`, and the final
  fixture/registration/timing scan — **PASS**.
- Typecheck — deferred by coordinator resource policy; no typecheck was run
  in this lane.
- Broad tests, build, install, and generated logs — not run.

#### Rubric (0–2; delivery gates are worker-owned and therefore 0)

- Catalog/rules evidence: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer/stack proof: **2/2**
- Delivery gates: **0/2**
- **Worker total: 8/10**

No card-local implementation gap remains. Collection typecheck and delivery
gates remain coordinator-owned.

## Mechanisms

Merged from the `*-MECHANISM.md` files under `docs/audits/EX3-reaudit/`. Link to these sections as `docs/audits/EX3.md#mechanisms`.

### Engine mechanism: gained-on-deletion-before-would-leave-replacement-ordering

#### Seam

`gained-on-deletion-before-would-leave-replacement-ordering` is the Q2212 / EX3-013
ordering seam. When a permanent has gained an `On Deletion` effect and EX3-013's
leave-play replacement would prevent its deletion, the gained self-trigger resolves
first. The replacement then pays its cost and prevents the permanent from leaving.

For the public-path proof, BT12-072 carries BT1-009, BT1-021, BT2-060, and EX3-013.
The opponent plays Gaia Force through a public `playCard` intent. BT12-072's gained
effect trashes the opponent's top security before EX3-013 is offered. EX3-013 then
trashes its two level-5 sources and keeps BT12-072 in the battle area.

#### Engine mechanism

The reusable mechanism is in `apps/api/src/engine/effects/primitives.ts`, inside
`deletePermanent`:

1. The endangered permanents are snapshotted while still live.
2. Their self-anchored `onDeletionOf` watchers are fired with
   `sourceScope: "selfSourceOnly"` before `consultLeavePrevention` runs.
3. The leave-prevention replacement is consulted and removes prevented permanents
   from the actual deletion set.
4. For permanents that really leave, the normal `onDeletionOf` pass uses
   `"excludeSelfSource"` for the pre-fired subjects, so self-watchers do not fire
   twice. Third-party deletion watchers remain tied to the actual deletion set.

This preserves the related Q6030 behavior: a third-party watcher does not count a
permanent whose deletion was prevented, and `whenLeavesPlay` / `whenTrashedByEffect`
are not emitted for that prevented permanent.

The self-watcher-before-prevention mechanism was already present in the current
engine baseline, so no additional `primitives.ts` source change was necessary. This
lane adds the public regression that locks the behavior.

#### Regression evidence

`apps/api/src/engine/deletionSeams.test.ts` now contains both Q2212 checks:

- the existing internal deletion control;
- a public `playCard` / Gaia Force path that asserts the security trash, the two
  source cards paid to EX3-013, the surviving stack, and final memory.

For red-before evidence, the self-watcher dispatch block was temporarily removed
with a targeted `apply_patch` control (no checkout, stash, reset, or other git write).
The same narrow engine suite then failed both Q2212 tests: the opponent's security
did not reach one card because the gained deletion effect never resolved before the
replacement. The exact block was restored with `apply_patch`; the suite is green at
5/5.

#### Verification

Executed under the resource policy with one worker and no file parallelism:

```text
pnpm --filter @aegis/api exec vitest run src/engine/deletionSeams.test.ts --maxWorkers=1 --no-file-parallelism
  5 passed

pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-013.test.ts --maxWorkers=1 --no-file-parallelism
  19 passed
```

No install, build, typecheck, broad suite, or git write was run. The card module,
card test, audit report, shared catalog, ledger, and RUN files were not edited in
this engine lane.

### Simultaneous-play event collapse mechanism

#### Scope

This lane covers the public `whenPlayed` semantics used by retained EX3-026,
EX3-030, and EX3-031 evidence, including Q3664. The contract is:

- one effect that plays multiple Digimon produces one `whenPlayed` activation;
- that activation carries the complete simultaneously played set;
- a source filter narrows that set to eligible members before
  `sourceRef: "triggerSubject"` targeting;
- each entrant still receives its own printed On Play window and its own
  `onEnterFieldAnyone` event.

#### Red-before-green evidence

Before the engine change, the public Q3664 paths were red:

- EX3-026 focused: 9 passed, Q3664 timed out at 15 seconds.
- EX3-030 focused: 13 passed, with the independent-copy and Q3664 cases
  unable to reach their target-choice window.
- EX3-031 focused: 9 passed, with Q3664 unable to reach its target-choice
  window.

The EX3-026 red remained after replacing its effectful opponent fixtures with
inert Digimon, proving that the stall was not only an On Play fixture issue.

#### Defect and correction

`playInstances` invoked the effect-entry seam separately for every entrant.
That seam's normal path includes the `whenPlayed` bus, so a multi-card play
could activate watchers once per entrant and then again through the batch bus.
The final batch bus already carried `subjectPermanentIds`, but it was reached
after the duplicate per-card buses.

The entry seam now accepts an internal `deferWhenPlayed` marker. Multi-card
effect plays defer only `whenPlayed` while preserving each entrant's On Play
and `onEnterFieldAnyone` windows. The existing final batch fire remains the
single `whenPlayed` event and carries the full created-permanent ID list.
Single-card effect plays retain the existing path.

The retained public fixtures also use inert main-deck Digimon where their own
effects were unrelated to Q3664, and supply an inert deck for EX3-025's
mandatory Draw 2. No card module, catalog, ledger, or RUN file was changed.

#### Focused proof

The new engine regression uses the public `advance(...).verb.playInstances`
surface with EX3-030's inherited watcher. It simultaneously plays two Four
Great Dragons and one unrelated Digimon, asserts exactly one choice decision,
asserts that the two eligible permanents and only those two are candidates,
then resolves the choice.

Executed serially with `--maxWorkers=1 --no-file-parallelism`:

```text
src/engine/simultaneousPlayEventCollapse.test.ts — 1/1 passed
src/cards/EX3/EX3-026.test.ts — 10/10 passed
src/cards/EX3/EX3-030.test.ts — 15/15 passed
src/cards/EX3/EX3-031.test.ts — 10/10 passed
```

Typecheck/build/install/broad suites were not run under the coordinator's
resource policy. The external typecheck gate was deferred and is not evidence
against this mechanism lane.

## Knowledge base index

Merged from `docs/audits/EX3-reaudit/KB-INDEX.md`.

Generated from `node tools/kb/query.mjs card <ID> --json` during this re-audit. An em dash means the query returned no card-specific Q&A identifier; it is not a claim that no general rule applies.

- `EX3-001`: Q3369; official errata dated 2022-11-11
- `EX3-002`: —
- `EX3-003`: Q3370; official errata dated 2022-11-11
- `EX3-004`: —
- `EX3-005`: —
- `EX3-006`: Q3371
- `EX3-007`: Q3372, Q3373 (answers appear unrelated to EX3-007's catalog text; lane must reconcile explicitly)
- `EX3-008`: Q3374, Q3375; official errata dated 2022-11-11
- `EX3-009`: Q3376
- `EX3-010`: —
- `EX3-011`: —
- `EX3-012`: Q3430, Q3431, Q4669, Q4670, Q4671, Q4672, Q6508
- `EX3-013`: Q2212, Q2213
- `EX3-014`: Q3377, Q6718, Q6719; official errata dated 2022-11-11
- `EX3-015`: Q3378
- `EX3-016`: Q3348, Q3379, Q3380, Q3381, Q3382, Q3383, Q3384
- `EX3-017`: Q3385
- `EX3-018`: —
- `EX3-019`: Q3348, Q3386, Q3387, Q3388, Q3389, Q3390, Q3391
- `EX3-020`: —
- `EX3-021`: Q3392, Q3393
- `EX3-022`: official errata dated 2022-11-11
- `EX3-023`: Q2109; official errata dated 2022-11-11
- `EX3-024`: Q3394, Q3395, Q3396, Q3397, Q3398, Q3399, Q3400, Q3401; official errata dated 2022-11-11
- `EX3-025`: Q3402; official errata dated 2022-11-11
- `EX3-026`: official errata dated 2022-11-11; local query returns no direct Q&A (existing Q3664-named test is cross-card/rule provenance and must be reconciled)
- `EX3-027`: —
- `EX3-028`: Q3403, Q3404; official errata dated 2022-11-11
- `EX3-029`: Q3405
- `EX3-030`: Q3406, Q3407; official errata dated 2022-11-11
- `EX3-031`: Q3408, Q3409; official errata dated 2022-11-11
- `EX3-032`: no direct Q&A
- `EX3-033`: Q3410; official errata dated 2022-11-11
- `EX3-034`: Q3411; official errata dated 2022-11-11
- `EX3-035`: Q2613; official errata dated 2022-11-11
- `EX3-036`: Q3412; official errata dated 2022-11-11
- `EX3-037`: Q3413, Q3414
- `EX3-038`: Q3415
- `EX3-039`: no direct Q&A
- `EX3-040`: no direct Q&A
- `EX3-041`: no direct Q&A
- `EX3-042`: Q3416
- `EX3-043`: no direct Q&A
- `EX3-044`: Q3399
- `EX3-045`: no direct Q&A; official errata dated 2022-11-11
- `EX3-046`: no direct Q&A
- `EX3-047`: no direct Q&A
- `EX3-048`: Q3417, Q3418
- `EX3-049`: no direct Q&A
- `EX3-050`: no direct Q&A
- `EX3-051`: Q3419
- `EX3-052`: no direct Q&A
- `EX3-053`: Q2726, Q2735, Q2757, Q2766, Q3420, Q3421, Q3422
- `EX3-054`: Q3423
- `EX3-055`: Q3424; official errata dated 2022-11-11
- `EX3-056`: no direct Q&A
- `EX3-057`: no direct Q&A; official errata dated 2022-11-11
- `EX3-058`: Q3425, Q3426; official errata dated 2022-11-11
- `EX3-059`: no direct Q&A
- `EX3-060`: no direct Q&A
- `EX3-061`: no direct Q&A
- `EX3-062`: no direct Q&A
- `EX3-063`: Q2891; official errata dated 2022-11-11
- `EX3-064`: Q3428, Q3429; official errata dated 2022-11-11
- `EX3-065`: Q3430, Q3431
- `EX3-066`: Q3432
- `EX3-067`: no direct Q&A
- `EX3-068`: no direct Q&A; official errata dated 2022-11-11
- `EX3-069`: Q2613, Q3402, Q3433, Q3434, Q5722, Q5723; official errata dated 2025-04-25
- `EX3-070`: Q3435
- `EX3-071`: no direct Q&A
- `EX3-072`: no direct Q&A
- `EX3-073`: no direct Q&A
- `EX3-074`: Q3399, Q3401, Q3436

All 74 EX3 card IDs are indexed exactly once.

## Open items

No EX3 card scores below 10/10. The following remain worth knowing.

- Unresolved — knowledge base defect. Local KB entries Q3372 and Q3373 are indexed under EX3-007 but describe EX3-048's four-card reveal. EX3-048 carries the same contract as Q3417 and Q3418. The committed EX3-007 catalog record, its IR, and its test contain only the inherited 3000-DP deletion effect, so the misindexed entries were not used to change EX3-007 behavior. The KB index itself still needs fixing. Recorded in both `docs/audits/EX3-reaudit/REVIEW-NOTES.md` (`c2ce25144`) and `internal-docs/audits/EX3-runtime-2026-08-27.md` (`eb1a58b75`).
- Contradiction — unexecuted scores. `internal-docs/audits/EX3-runtime-2026-08-27.md` (`eb1a58b75`) scores all 74 cards 10/10 while stating "existing tests were inspected but not executed during this pass" and making "no green-test claim". The 2026-09-10 re-audit, run at base `d3c1b6f570d5f495438e31851f3285aa351c63d4`, found four reproducible failures at its restart baseline (one EX3-026, two EX3-030, one EX3-031, all on Q3664). The re-audit wins; the older 10/10 scores carried no behavioral proof.
- Contradiction — collection result. `docs/audits/EX3-AUDIT.md` (2026-09-03, `8664b274d`) records the exact EX3 collection passing 75/75 files and 671/671 tests. The re-audit's restart baseline at a later base recorded 75 files and 671 tests with only 72 files and 667 tests passing. The re-audit's later closeout figure, 77/77 files and 770/770 tests on the merged base, is the current one.
- Four engine seams were opened during the run and all four are closed. `gained-on-deletion-before-would-leave-replacement-ordering` (EX3-013, Q2212) and `simultaneous-play-event-collapse` (EX3-026/030/031, Q3664) required engine work and are documented under Mechanisms. `opponent-turn-effect-origin-dna` (EX3-063, Q2891) and `opponent-empty-security-reveal` (EX3-070, Q3435) closed with no engine change once a real public path was found.
- Deferred, outside EX3. The broad monorepo run left 17 API failures across 15 non-EX3 files. All 17 reproduce at exact `origin/main` in the main worktree, so they are pre-existing and owned by other sets.
- Historical, resolved. The re-audit's first root typecheck failed only at `src/cards/EX4/EX4-056.test.ts:111` because target kind `"digimon"` is not assignable to `"player" | "permanent"`. That EX4 baseline error was corrected upstream and the typecheck passed on the merged base.
- No `SOURCE-RECONCILIATION.md` was produced for EX3, so no catalog discrepancy was formally recorded or ruled out for this set.

## History

Superseded files, removed after their content was merged here. Raw evidence stays in git history at the commits named.

- `docs/audits/EX3-AUDIT.md` — `8664b274d`, 2026-09-03. Card-by-card ledger with catalog text, focused counts, and the 2026-09-03 runtime reaudit summary; superseded by the re-audit.
- `docs/audits/EX3-REAUDIT-LEDGER.md` — `7e72574ec`, 2026-09-10. Scoring table for the winning re-audit.
- `docs/audits/EX3-reaudit/` per-card reports — `7e72574ec`, 2026-09-10. 74 files, `EX3-001.md` through `EX3-074.md`, merged verbatim into the card ledger.
- `docs/audits/EX3-reaudit/RUN.md` — `7e72574ec`, 2026-09-10. Run log; its closeout is quoted under Gates.
- `docs/audits/EX3-reaudit/REVIEW-NOTES.md` — `c2ce25144`, 2026-09-09. Coordinator decisions, the engine seam queue, and the KB reconciliation note; merged into Status and Open items.
- `docs/audits/EX3-reaudit/KB-INDEX.md` — `c2ce25144`, 2026-09-09. Merged into Knowledge base index.
- `docs/audits/EX3-reaudit/GAINED-ON-DELETION-BEFORE-WOULD-LEAVE-REPLACEMENT-MECHANISM.md` — `c2ce25144`, 2026-09-09. Merged into Mechanisms.
- `docs/audits/EX3-reaudit/SIMULTANEOUS-PLAY-EVENT-COLLAPSE-MECHANISM.md` — `c2ce25144`, 2026-09-09. Merged into Mechanisms.
- `docs/audits/EX3-reaudit/WORKER-BRIEF.md` — `c2ce25144`, 2026-09-09. Process instructions for the audit workers; not evidence, not carried forward.
- `internal-docs/audits/EX3-runtime-2026-08-27.md` — `eb1a58b75`, 2026-09-05. Ascending recalculation of all 74 cards with no tests executed; its four delivered corrections (EX3-009 trait-only `saur`, EX3-035 grant-provenance `UseTracker` identity, EX3-054 zero-inclusive cost window, EX3-073 `anyOf` deletion gate) are retained in the card ledger. Its scores are superseded.

No code file referenced any of these paths, so no code reference needed updating.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for EX3: PR #4572; commit `8bef60658`.
