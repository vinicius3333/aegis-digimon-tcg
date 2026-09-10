---
set: EX1
cards: 73
status: verified
verified_at: 2026-09-10
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# EX1 audit

## Status

All 73 EX1 cards (`EX1-001` through `EX1-073`) are verified at 10/10, for an aggregate of 730/730. The winning source is the 2026-09-10 re-audit: `docs/audits/EX1-REAUDIT-LEDGER.md` (commit `727d584b0`) with per-card reports under `docs/audits/EX1-reaudit/` (commit `2850d9a99`). That run rebuilt every card's evidence from the catalog, the local knowledge base, the compiled IR, and public-intent behavior; prior scores were not inherited. The older `docs/audits/EX1-AUDIT.md` (2026-09-03, commit `354de9c4f`) called itself the authoritative EX1 ledger, but the re-audit coordinator demoted it to historical context, so its per-card table lost where the two disagreed. Two engine seams were opened and both closed as fixture errors rather than engine defects; they are recorded under Mechanisms. No catalog correction was established for EX1.

## Gates

Copied from `docs/audits/EX1-reaudit/RUN.md` (commit `2850d9a99`), final closeout and pre-merge refresh.

- Exact collection: `pnpm exec vitest run src/cards/EX1/*.test.ts --maxWorkers=1 --no-file-parallelism` from `apps/api` — 81 files and 485 tests passed.
- Root `pnpm typecheck` — passed for shared, API, and web. It first exposed two properties that `@ts-nocheck` had hidden: unsupported `Hatch.controller` on EX1-066 and unsupported `CostModifier.zone` on EX1-071. Both were removed, the focused suites passed 26/26, and the repeated typecheck passed.
- Catalog sync: `pnpm effects:check:set -- --set EX1` first reported stale generated records. `pnpm effects:sync:set -- --set EX1` synchronized all 73 records and the repeated check reported every record current.
- Broad engine suite (serialized): 233/235 files and 6923/6925 tests passed. The two reds are pre-existing, out-of-scope baseline failures unchanged from `origin/main` — `deckTruthSource.test.ts` expects BT26 to be absent from the current catalog, and the BT26 BeelStarmon deck interaction fails on BT25-085. No EX1 test failed.
- Lint, format, diff: final Oxlint, Oxfmt (157 files), and `git diff --check` passed.
- Pre-merge refresh against the then-current `origin/main`: focused proof 19/19, exact EX1 collection 485/485, root typecheck passed, and all 73 EX1 generated effect records remained synchronized.
- Static inventory at closeout: 73 catalog entries, 73 direct modules, 73 colocated focused tests, 81 total EX1 test files, zero remaining `// @ts-nocheck`, and no `registerCard` call in EX1.
- Delivery: atomic audit commits `ac36ffe90`, `678f7bc4e`, `c78b31582`, and `44e9530f2`, plus the ledger closeout commit, delivered on `origin/audit-ex1-luna-20260909`. Base for the run was `e66ac37dbb3c649a74678e9926edd722b8735066`.

## Card ledger

Merged from the 73 per-card reports under `docs/audits/EX1-reaudit/`. Card names come from `packages/shared/src/cards/data/cards.json`.

### EX1-001 — Agumon

#### Catalog and knowledge-base contract

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX1-001`). The
card is a red level 3 Digimon whose inherited effect is:

> [When Attacking][Once Per Turn] Reveal the top 3 cards of your deck. Add 1
> Tamer card or 1 Digimon card with [Agumon] in its name among them to your
> hand. Place the remaining cards at the bottom of your deck in any order.

The local card query returned Q3187 and Q3188:

- Q3187: when both an Agumon-name Digimon and a Tamer are revealed, only one
  or the other may be added. This is the single `count: 1` union of the Tamer
  filter and the Agumon-name Digimon alternative.
- Q3188: a non-red Agumon-name Digimon or non-red Tamer is legal. The focused
  test uses green `BT11-046`.

Applicable local rules evidence includes §15-8-3-1 (trigger-type effects
activate when their trigger condition is met), §15-15-3-6 (the effect owner
chooses the order for multiple revealed cards returned to the bottom), and the
manual's Once Per Turn definition (a restricted effect can activate only once
per turn). The name-reference guidance in `data/kb/rules-index.json` explains
that bracketed names match names containing the specified text.

#### Clause-to-IR-to-test mapping

| Printed clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| `[When Attacking]` | `effects[0].trigger: "WhenAttacking"` | Every test attacks through `applyIntent`, then settles the effect stack. |
| `[Once Per Turn]` | `effects[0].frequency: "OncePerTurn"` | The second test unsuspends and attacks again in the same turn; hand size does not increase a second time. |
| Reveal top 3 | `RevealAdd.revealCount: 3` | First, second, no-match, and evolved-stack tests use decks where the first three cards are observable and assert the post-resolution deck/hand. |
| Add 1 Tamer or 1 Agumon-name Digimon | `add[0].count: 1`, Tamer `kind: ["Tamer"]`, and `orFilters` for Digimon `nameOrTrait: Agumon`, `match: "name"`; destination `hand` | First test has both a Tamer and Agumon-name card and asserts exactly the first Tamer is added. Second accepts green `BT11-046` and rejects near-match `BT1-009`. No-match test leaves hand empty. |
| Place remaining cards at bottom in any order | `rest: "deckBottom"` | First test asserts all three post-resolution deck cards are present; no-match test asserts all four cards are retained. Assertions intentionally do not impose an order. |

The module has no `// @ts-nocheck`, has `coverage: "full"` and
`residual: []`, and registers executable behavior only with
`registerIrCard("EX1-001", compiled)`.

#### Behavioral and stack proof

Focused tests passed: 4 tests in `EX1-001.test.ts`.

- Positive union path: exactly one card is added when both legal categories
  are present; an unrelated Digimon remains in the deck.
- Q3188/non-red path and near-match negative: green Agumon-name
  `BT11-046` is accepted while `BT1-009` (Monodramon) is not.
- No-match negative: no card is added and all revealed cards return to the
  deck.
- Once-per-turn boundary: a second attack after a real public unsuspension
  does not retrigger the inherited effect in the same turn.
- Evolution stack: a legal public egg → EX1-001 → EX1-003 route is resolved
  with real `digivolve` intents. The inherited effect remains attached through
  the higher-level host, and the test accounts for the mandatory evolution
  draws before asserting the hand and final stack behavior.

The neighboring EX1-002 inherited attack test was reviewed for matching
trigger/once-per-turn and public attack timing conventions. No engine seam or
card-specific ambiguity remains for EX1-001. Optional-refusal proof is not
applicable because this card says “Add 1,” not “you may add.”

#### Verification commands

Commands required by the worker brief:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-001.test.ts --maxWorkers=1 --no-file-parallelism  PASS (4 tests)
pnpm --filter @aegis/api typecheck                                                        PASS
pnpm exec oxlint apps/api/src/cards/EX1/EX1-001.ts apps/api/src/cards/EX1/EX1-001.test.ts PASS
pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-001.ts apps/api/src/cards/EX1/EX1-001.test.ts docs/audits/EX1-reaudit/EX1-001.md PASS
git diff --check                                                                         PASS
```

#### Rubric

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Catalog text, Q3187/Q3188, name matching, trigger, Once Per Turn, and bottom-deck rules traced. |
| IR trace | 2/2 | Every printed clause maps to typed compiled IR; no nocheck, no residual, IR-only registration. |
| Behavioral proof | 2/2 | Positive, exact one-card union, non-red acceptance, near-match/no-match negatives, same-turn limit, and resolved zones covered. |
| Peer/stack proof | 2/2 | Public egg → EX1-001 → higher host evolution path passes; neighboring inherited-effect conventions reviewed. |
| Delivery gates | 0/2 | Worker lane does not receive delivery credit. |

Final worker score: **8/10** (delivery credit intentionally 0).

### EX1-002 — Biyomon

#### Printed contract and local sources

The committed catalog entry (`packages/shared/src/cards/data/cards.json`,
`EX1-002`) identifies Biyomon as a red level 3 Rookie, with a red level 2
evolution requirement costing 0. Its only effect is the inherited clause:

> [When Attacking][Once Per Turn] When this Digimon attacks a player, <Draw 1>.

`node tools/kb/query.mjs card EX1-002` returned Q3189 only. Q3189 confirms
that the inherited effect activates when the host attacks the opponent even if
the opponent subsequently blocks, because [When Attacking] effects resolve
before the public Blocker response window. No EX1-002 erratum or restriction
was returned. Applicable local rules are `data/kb/rules/glossary.md` (When
Attacking, reactions, and Once Per Turn), `data/kb/rules/comprehensive.md`
§11-4 (Block timing), and §15-16-5 (When Attacking timing).

#### Implementation trace

`apps/api/src/cards/EX1/EX1-002.ts:4-15` is compiled IR registered only via
`registerIrCard("EX1-002", compiled)`:

| Printed clause | IR proof |
| --- | --- |
| Inherited effect | `isInherited: true` |
| [When Attacking] | `trigger: "WhenAttacking"` |
| Once per turn | `frequency: "OncePerTurn"` |
| Only when attacking a player | `condition: { kind: "attackTargetsPlayer" }` |
| Draw 1 | `kind: "Draw", controller: "mine", amount: 1` |

Removed the module-level `// @ts-nocheck`; the actual `CompiledCard` typing now
passes without weakening the IR. There is no duplicate legacy `registerCard`
registration and no engine/shared/catalog change.

#### Behavioral evidence

`apps/api/src/cards/EX1/EX1-002.test.ts` passes 7 focused tests:

- Lines 7-24: a real attack against an opponent Digimon does not draw.
- Lines 26-42: a real attack against the opponent player draws exactly one
  card and leaves the drawn card observable in hand.
- Lines 44-77: Q3189 timing proof observes Draw 1 before the real
  `blockWindowOpened` event, then answers the Blocker window with the public
  `declareBlock` intent.
- Lines 79-110: a second real player attack in the same turn does not draw
  again; the first attack, security check, unsuspension, and second attack are
  all resolved through public intents.
- Lines 113-167: the real turn loop accepts a second same-turn attack after a
  public unsuspension without a second EX1-002 draw, then unsuspends the host
  on the next own turn and proves a second EX1-002 effect resolution after the
  opponent's complete turn.
- Lines 169-207: a legal public Digi-Egg → EX1-002 → EX1-003 evolution stack
  preserves the inherited effect, and the higher-level host draws on a real
  player attack.
- Lines 209-232: an EX1-002 evolution from an invalid level-3 source is
  rejected, with both the source top card and EX1-002 remaining in place.

No optional refusal applies because Draw 1 is mandatory. No name/trait filter,
numeric target boundary, security effect, or duration modifier applies. The
same-turn Once Per Turn suppression and next-own-turn reset are directly
proven through the real turn loop. No name/trait filter or optional refusal
applies because the card has no such clauses.

All security fixtures use inert main-deck Digimon (`BT1-009` through
`BT1-013`); no Digi-Egg is placed in security or deck.

#### Verification commands

All commands were run from the assigned worktree:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-002.test.ts --maxWorkers=1 --no-file-parallelism
PASS — 1 file, 7 tests

pnpm --filter @aegis/api typecheck
PASS

pnpm exec oxlint apps/api/src/cards/EX1/EX1-002.ts apps/api/src/cards/EX1/EX1-002.test.ts
PASS

pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-002.ts apps/api/src/cards/EX1/EX1-002.test.ts docs/audits/EX1-reaudit/EX1-002.md
PASS

git diff --check
PASS
```

#### Score

| Rubric | Score | Basis |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Catalog clause, Q3189, and applicable timing rules reconciled. |
| IR trace | 2/2 | Every printed clause maps to typed compiled IR; only `registerIrCard` is used. |
| Behavioral proof | 2/2 | Positive, target-negative, Q&A timing, same-turn Once Per Turn, and resolved stack paths pass. |
| Peer/stack proof | 2/2 | Real Blocker interaction, legal/illegal evolution-stack cases, same-turn refusal, and next-own-turn reset pass. |
| Delivery gates | 0/2 | Worker does not commit, push, or claim collection-wide completion. |
| **Total** | **8/10** |  |

#### Remaining gap

The card implementation and card-specific evidence have no identified fidelity
gap. Collection-wide gates remain with the coordinator; delivery credit is
intentionally zero for this worker lane.

### EX1-003 — Birdramon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX1-003`.
- Knowledge base: `node tools/kb/query.mjs card EX1-003`.
- Direct implementation: `apps/api/src/cards/EX1/EX1-003.ts`.
- Behavioral proof: `apps/api/src/cards/EX1/EX1-003.test.ts`.
- Peer comparison: `EX1-001`, `EX1-002`, and `EX1-004` modules/tests for inherited
  timing, player-target conditions, and compiled registration conventions.

#### Printed contract and Q&A

Catalog data identifies Birdramon as a red level 4 Digimon (5000 DP, play cost
5), with a red level 3 / 2-memory evolution route and Giant Bird type. Its only
printed effect is the inherited clause:

> `[When Attacking] When this Digimon attacks a player, delete 1 of your
> opponent's Digimon with 3000 DP or less.`

The local query returns Q3190: an inherited `[When Attacking]` effect resolves
before the opponent may activate `<Blocker>`. The blocker-window test proves
the eligible 3000-DP blocker is deleted before the public block response and
that a remaining blocker is then the only eligible blocker.

#### Clause-to-IR-to-test mapping

| Contract clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| `[When Attacking]` | `effects[0].trigger = "WhenAttacking"` | Player attack in the first, third, and fourth tests |
| Inherited effect | `effects[0].isInherited = true` | First three tests use `EX1-003` under the attacking Digimon; fourth test evolves into it and then evolves a higher host |
| Attacks a player only | `condition.kind = "attackTargetsPlayer"` | First test resolves deletion on a player attack; second test attacks a Digimon and proves no deletion |
| Your opponent's Digimon | Delete target filter has `controller: "opponent"` and `kind: ["Digimon"]` | First and third tests prove opponent-only selection; no own permanent is eligible |
| 3000 DP or less | Target filter has `dp: { op: "lte", value: 3000 }` | First test deletes exactly the 3000-DP target and leaves the 4000-DP target |
| Delete 1 | Delete action has `count: 1` | First test leaves one opponent permanent; third test deletes one eligible blocker and leaves the other |
| Blocker timing (Q3190) | Standard `WhenAttacking` trigger resolution before block window | Third test waits for `blockWindowOpened`, then asserts only the remaining blocker is eligible |

#### Evolution and stack proof

The fourth test performs a public level 3 (`BT1-012`) -> EX1-003 evolution for
2 memory, then a legal level 4 -> level 5 (`BT1-020`) evolution. It attacks
with the higher host while EX1-003 remains in its digivolution cards and proves
that the inherited effect still deletes the opponent's 3000-DP Digimon. This
also proves the effect is sourced from the stack card rather than only from an
isolated top-card fixture.

The tests include a 3000-DP endpoint and a 4000-DP near-boundary target, a
non-player attack negative path, and the Q3190 blocker ordering path. The
effect is mandatory and has no optional refusal, payment, once-per-turn, or
duration clause to test.

#### Changes

- Removed `// @ts-nocheck` from `EX1-003.ts`; no type weakening was needed.
- Replaced Digi-Egg `BT1-001` security fixtures with inert main-deck `BT1-009`
  cards in all three security-bearing tests.
- Confirmed executable behavior is registered exclusively with
  `registerIrCard("EX1-003", compiled)`; no legacy `registerCard` registration
  exists.
- No engine, shared catalog, or unrelated card files were edited.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-003.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 4 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-003.ts apps/api/src/cards/EX1/EX1-003.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-003.ts apps/api/src/cards/EX1/EX1-003.test.ts docs/audits/EX1-reaudit/EX1-003.md` — passed (all matched files formatted; oxfmt reports 2 files because the Markdown file is not an oxfmt input).
- `git diff --check` — passed.

#### Remaining gaps and score

No card-specific behavior gap was found. Collection-wide delivery gates,
atomic commit, branch push, and coordinator reruns are intentionally outside
this worker lane and receive zero delivery credit here.

| Rubric | Score |
| --- | ---: |
| Catalog and rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer and evolution-stack proof | 2/2 |
| Delivery gates (worker lane) | 0/2 |
| **Total** | **8/10** |

### EX1-004 — Greymon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX1-004`.
- Knowledge base: `node tools/kb/query.mjs card EX1-004`.
- Rules: `data/kb/rules/glossary.md` (When Attacking, Once Per Turn,
  inherited effects) and `data/kb/rules/comprehensive.md` §§2-3-1,
  2-3-1-2/3 (exact bracketed names versus names containing text), 15-3
  (inherited effects), and 15-16-5 (When Attacking).
- Direct implementation: `apps/api/src/cards/EX1/EX1-004.ts`.
- Behavioral proof: `apps/api/src/cards/EX1/EX1-004.test.ts`.
- Peer comparison: EX1-002 for inherited When Attacking/Once Per Turn IR and
  EX1-005 for compiled registration and exact filter conventions.

#### Printed contract and Q&A

The catalog identifies Greymon as a red level 4 Champion, 5000 DP, play cost
5, with a red level 3 / 2-memory evolution requirement and Dinosaur type. Its
only clause is the inherited effect:

> `[When Attacking][Once Per Turn] You may play 1 [Tai Kamiya] with a play
> cost of 3 or less from your hand without paying its memory cost.`

The local query returns Q3191. It confirms that bracketed `[Tai Kamiya]` means
the card must be specifically named `Tai Kamiya`; a card whose name merely
contains that text, such as `Izzy Izumi & Tai Kamiya` (AD1-022), is not legal.

#### Clause-to-IR-to-test mapping

| Contract clause | IR evidence | Behavioral evidence |
| --- | --- | --- |
| `[When Attacking]` | `effects[0].trigger = "WhenAttacking"` | Real player attacks in tests at lines 48-76, 78-103, 105-130, 132-158, 160-199, and 201-254 |
| Inherited effect | `isInherited: true` | `evolveIntoGreymon` publicly evolves into EX1-004, then into BT1-020; the higher host attacks with EX1-004 in its stack |
| Once Per Turn | `frequency: "OncePerTurn"` | Same-turn second attack leaves `tai2` in hand (lines 160-199); public turn loop proves activation again on the next own turn (lines 201-254) |
| Optional play | `optional: true` | Refusal test uses `autoDeclineOptional` and leaves ST1-12 in hand (lines 132-158) |
| Play exactly 1 | `count: 1` | Positive attack creates exactly one Tai permanent and empties the three-card setup hand after evolution (lines 48-76) |
| From hand | `from: ["hand"]` | Positive and negative tests observe the selected card leaving or remaining in hand |
| Your card named `[Tai Kamiya]` | `controller: "mine"`, `nameOrTrait: [{ tokens: ["Tai Kamiya"], match: "nameExact" }]` | ST1-12 is played; AD1-022 remains in hand because its name only contains Tai Kamiya (lines 105-130) |
| Play cost 3 or less | `playCostLte: 3` | ST1-12 (cost 2) is played; BT1-085 (cost 4) remains in hand (lines 78-103) |
| Without paying memory | `kind: "PlayWithoutCost"`, `payCost: false` | Positive path resolves the play through the normal attack/effect stack with no play-cost payment |

#### Evolution and stack proof

The shared helper executes the legal red level 3 `BT1-009` -> EX1-004 -> level
5 `BT1-020` route through public `digivolve` intents and settles after each
transition. The attack tests therefore prove the inherited effect is active
from the EX1-004 card in the evolution stack, not only when EX1-004 is the top
card. The dedicated negative test attempts EX1-004 from blue level 3
`BT1-029`, rejects the evolution, and confirms both the source top card and
EX1-004 remain unchanged.

The mixed target fixtures cover an exact matching Tamer (ST1-12), a same-name
Tamer above the cost boundary (BT1-085), a near-matching combined-name Tamer
(AD1-022), and no legal target. The same-turn and next-own-turn public attack
paths prove the Once Per Turn boundary and reset.

#### Changes

- Removed `// @ts-nocheck` from `EX1-004.ts`; the typed `CompiledCard` now
  passes API typecheck without weakening the IR.
- Added a red-source evolution requirement negative test and a complete public
  turn-loop Once Per Turn reset test.
- Replaced every `BT1-001` Digi-Egg in EX1-004 security fixtures with inert
  main-deck `BT1-009` Digimon. The assigned file has no deck Digi-Eggs and no
  numeric `security: <n>` shortcuts.
- Confirmed executable behavior is registered exclusively with
  `registerIrCard("EX1-004", compiled)`; no legacy `registerCard` registration
  exists.
- No engine, shared catalog, or unrelated card files were edited.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-004.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 7 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-004.ts apps/api/src/cards/EX1/EX1-004.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-004.ts apps/api/src/cards/EX1/EX1-004.test.ts docs/audits/EX1-reaudit/EX1-004.md` — passed (all matched files formatted; oxfmt reports 2 files because Markdown is not an oxfmt input).
- `git diff --check` — passed.

#### Remaining gaps and score

No card-specific behavior gap was found. Collection-wide delivery gates,
atomic commit, branch push, and coordinator reruns are intentionally outside
this worker lane and receive zero delivery credit here.

| Rubric | Score |
| --- | ---: |
| Catalog and rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer and evolution-stack proof | 2/2 |
| Delivery gates (worker lane) | 0/2 |
| **Total** | **8/10** |

### EX1-005 — Tyrannomon

#### Scope and catalog contract

Card: `EX1-005` Tyrannomon (EX1, red, level 4, play cost 5, 4000 DP, Dinosaur/Data).

Printed clauses verified against `packages/shared/src/cards/data/cards.json`:

- `[When Digivolving] If you don't have a [Taiga] in play, you may play one from your hand without paying its memory cost.`
- `[Your Turn] This Digimon is also treated as green.`
- Inherited `[Your Turn] While this Digimon has [Tyrannomon] in its name, it gets +2000 DP.`
- Evolution requirements: red or green level 3 for 2 memory.

Local KB query: `node tools/kb/query.mjs card EX1-005` returned Q2082, Q2480, Q3192, Q3193, and Q3194. Q2082 and Q2480 are duplicate guidance: a gained color remains when the card's original information is changed. Q3192 covers revealed-card timing; Q3193 covers a battle-area green evolution; Q3194 excludes the breeding area.

#### Clause-to-IR-to-test evidence

| Contract | IR | Behavioral proof |
| --- | --- | --- |
| Free Taiga from hand only when no Taiga is in play; optional | `EX1-005.ts:10-43`: `WhenDigivolving` + `PlayWithoutCost`, hand source, exact `[Taiga]` Tamer filter, `youHaveNone`, `optional` | `EX1-005.test.ts:10-35` plays the matching Tamer while retaining a non-Taiga Tamer; `:37-63` proves an in-play Taiga blocks the second play; `:71-94` proves optional refusal leaves Taiga in hand |
| Also treated as green during your turn | `EX1-005.ts:46-61`: `YourTurn` self `GrantStatic` color Green | `EX1-005.test.ts:96-101` observes Green; `:195-213` observes no Green on the opponent's turn |
| Gained Green remains alongside changed original card information | The Green grant above composes with the shared original-info grant semantics | `EX1-005.test.ts:103-127` uses BT11-043 to change EX1-005 to White, original name Sukamon, and 3000 DP, then proves both White and gained Green (Q2082/Q2480) |
| Inherited +2000 DP only for a Tyrannomon-named host on your turn | `EX1-005.ts:63-87`: inherited `YourTurn` `Aura`, `modifyDP: 2000`, `selfHasNameContaining("Tyrannomon")` | `EX1-005.test.ts:65-69` proves +2000; `:189-193` excludes a non-Tyrannomon host; `:195-213` proves opponent-turn expiry; `:215-219` excludes breeding |
| Revealed card is not treated as green | No effect window fires merely from deck reveal; Green is a live Your Turn effect | `EX1-005.test.ts:129-150` uses ST4-03's real reveal/add filter and proves EX1-005 returns to deck rather than being added as Green (Q3192) |
| Green level-4 evolution boundary | Continuous color is active only in battle area on your turn | `EX1-005.test.ts:152-169` legally evolves into EX1-039 from battle area (Q3193); `:171-187` rejects the same route from breeding (Q3194) |

#### Peer and stack proof

- `BT11-043` was used as a comparative original-information rewrite peer. The live interaction proves EX1-005's gained Green color is not erased by a White/original-name/DP rewrite.
- `ST4-03` was used for the actual deck-reveal timing path, rather than injected timing or direct interpreter calls.
- Evolution fixtures use legal stacks with `BT1-010` as an under-card and public `digivolve` intents. The battle-area and breeding-area cases prove the relevant source-zone boundary.
- All deck/security fixtures in this card test use inert main-deck cards. The prior invalid `BT1-001` Digi-Egg deck fixtures were replaced with `BT1-009`.

#### Implementation changes

- Removed `// @ts-nocheck` from `EX1-005.ts`; the existing `CompiledCard` IR now typechecks normally.
- Kept executable registration exclusively as `registerIrCard("EX1-005", compiled)`.
- Added Q2082/Q2480 behavioral coverage and corrected invalid Digi-Egg deck fixtures.
- No engine, shared catalog, or unrelated card files were changed.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-005.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 12 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-005.ts apps/api/src/cards/EX1/EX1-005.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-005.ts apps/api/src/cards/EX1/EX1-005.test.ts docs/audits/EX1-reaudit/EX1-005.md` — passed.
- `git diff --check` — passed.

#### Rubric

| Axis | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules and Q&A | 2/2 | Catalog text and all five local Q&A IDs identified and covered |
| IR trace | 2/2 | Every printed clause maps to typed IR; sole registration is `registerIrCard` |
| Behavioral proof | 2/2 | 12 focused tests cover positive, negative, refusal, timing, zones, rewrite composition, and exact boundaries |
| Peer/evolution-stack proof | 2/2 | BT11-043 rewrite peer, ST4-03 reveal peer, legal stack, and breeding negative are exercised |
| Delivery gates | 0/2 | Worker lane does not receive collection-wide delivery credit |
| **Total** | **8/10** | Delivery remains coordinator-owned |

#### Remaining gaps

No card-specific behavior gap remains. Collection-wide reruns, atomic commit, and branch push are coordinator delivery gates.

### EX1-006 — Garudamon

#### Printed contract and evidence

Catalog text: `[When Attacking][Once Per Turn] When this Digimon attacks a player, gain 1 memory.` The effect is inherited, has no optional cost or target choice, and has no Security clause.

- `EX1-006.ts` registers only `registerIrCard("EX1-006", compiled)` with a `WhenAttacking` inherited effect, `frequency: "OncePerTurn"`, `GainMemory` amount `1`, and the `attackTargetsPlayer` condition.
- The player-attack test proves the positive path and exact +1 memory result.
- The Digimon-target attack test proves the condition excludes attacks against Digimon.
- The same-turn two-attack test proves the Once Per Turn boundary after a real public unsuspension.
- The public turn-loop test proves the Once Per Turn marker resets on the next own turn.
- The evolution-stack test evolves `EX1-003` (red level 4) into EX1-006, then into a level-6 host, and proves the inherited source remains active through the host attack and exact evolution costs.
- The negative evolution test rejects EX1-006 on a blue level-4 source and confirms the source remains unchanged.
- Q3195 is covered by the blocker-window test: the inherited When Attacking gain resolves before the opponent can declare `<Blocker>`.

No Digi-Egg cards or numeric security shortcuts are used in the fixtures.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-006.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 7 tests.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-006.ts apps/api/src/cards/EX1/EX1-006.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-006.ts apps/api/src/cards/EX1/EX1-006.test.ts` — passed.
- `git diff --check` — passed.
- Repository typecheck was already green at the coordinator baseline; not rerun in this worker lane.

#### Rubric

- Catalog/rules and Q3195: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker lane)

Score: 8/10, capped by worker delivery policy. No known behavioral gap remains for the printed contract.

### EX1-007 — Megadramon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX1-007`.
- Local knowledge base: `node tools/kb/query.mjs card EX1-007` returned no card-specific Q&A.
- General rules: `data/kb/rules/comprehensive.md` §§4-3-3, 4-7, and 8-1-2/8-1-3; `data/kb/rules/glossary.md` (`<Security Attack +x>`). These establish inherited effects from cards below the top card, stack boundaries, legal digivolution procedure, and one-at-a-time security checks.
- Direct implementation and proof: `apps/api/src/cards/EX1/EX1-007.ts` and `EX1-007.test.ts`.

#### Printed contract

Megadramon is a red level 5 Cyborg Digimon (7000 DP, play cost 7), with red or black level 4 / 3-memory evolution requirements.

- `[On Play] Delete up to 2 of your opponent's Digimon with 3000 DP or less.`
- Inherited `[Your Turn] While this Digimon has [Machine] in its traits, it gains <Security Attack +1>. (This Digimon checks 1 additional security card.)`

#### Clause-to-IR-to-test evidence

| Contract | IR evidence | Behavioral proof |
| --- | --- | --- |
| On Play timing and opponent Digimon target | `EX1-007.ts:8-23`: `trigger: "OnPlay"`, `Delete`, opponent `Digimon` filter | `EX1-007.test.ts:7-29` plays the card through `playCard` and deletes two eligible opposing Digimon |
| Up to 2, including the zero and one-target boundaries | `count: 2`, `upTo: true` | `:31-48` proves no eligible target resolves cleanly; `:50-87` inspects the live `chooseTargets` request (`min: 0`, `max: 2`), chooses one of two eligible cards, and leaves the other plus the ineligible card |
| Exact DP ceiling | `filter.dp: { op: "lte", value: 3000 }` | The positive path deletes the 3000 and 2000 DP cards while retaining the 4000 DP card; the manual one-target path confirms the 4000 DP card is absent from candidates |
| Inherited Your Turn Machine gate | `EX1-007.ts:26-58`: inherited `YourTurn` `Aura`, `selfHasTrait` exact `Machine` trait, `SecurityAttack +1` | `:89-93` observes the keyword on a Machine host; `:116-129` rejects a non-Machine host; `:131-145` proves it is absent during the opponent's turn through the public turn loop |
| Real Security Attack +1 behavior | `keyword: { keyword: "SecurityAttack", amount: 1 }` | `:95-114` attacks a player and observes two sequential security checks against a three-card security stack |

#### Peer and evolution-stack proof

- `BT2-066` Machinedramon is the matching `[Machine]` peer; `BT1-025` WarGreymon is a near-matching non-Machine Dragonkin peer. The inherited test proves the trait gate is based on the host's current top card, not merely the EX1-007 source card.
- Public `digivolve` intents prove both catalog requirements: red `BT1-014` Kokatorimon and black `BT2-058` Guardromon (both level 4) evolve into EX1-007, preserve the source card in the stack, and pay exactly 3 memory. A red level-3 `BT1-010` source is rejected without moving memory or changing the top card.
- Security fixtures use only inert main-deck Digimon (`BT1-009` through `BT1-011`); no Digi-Egg appears in a deck or security zone, and no numeric security shortcut is used.

#### Changes

- Removed `// @ts-nocheck` from `EX1-007.ts`; the existing `CompiledCard` IR typechecks normally.
- Kept executable registration exclusively as `registerIrCard("EX1-007", compiled)`.
- Added live up-to selection-boundary proof and red/black legal evolution-stack plus illegal-source tests.
- Replaced all assigned-test Digi-Egg security/deck fixtures with inert main-deck Digimon.
- No engine, shared catalog, or unrelated card files were edited.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-007.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 10 tests.
- `pnpm --filter @aegis/api typecheck` — passed after removing `@ts-nocheck`.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-007.ts apps/api/src/cards/EX1/EX1-007.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-007.ts apps/api/src/cards/EX1/EX1-007.test.ts docs/audits/EX1-reaudit/EX1-007.md` — passed.
- `git diff --check` — passed.

#### Rubric

| Axis | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules and Q&A | 2/2 | Catalog clauses, evolution requirements, general rules, and the no-Q&A query result are recorded |
| IR trace | 2/2 | Every printed clause maps to typed IR; the sole registration is `registerIrCard` |
| Behavioral proof | 2/2 | Ten focused tests cover positive, exact DP and count boundaries, zero/one-target paths, real security checks, trait and turn gates |
| Peer/evolution-stack proof | 2/2 | Machine/non-Machine peers, legal red and black stacks, and illegal level-3 source are exercised through public intents |
| Delivery gates | 0/2 | Worker lane does not receive collection-wide delivery credit |
| **Total** | **8/10** | Delivery remains coordinator-owned |

#### Remaining gaps

No card-specific behavior gap remains. Collection-wide reruns, atomic commit, and branch push are coordinator delivery gates.

### EX1-008 — MetalGreymon

#### Printed contract and evidence

Catalog text: `[When Attacking] When this Digimon attacks a player, delete 1 of your opponent's Digimon with 4000 DP or less.` Inherited text: `[Your Turn] While this Digimon has [Machine] or [Dragonkin] in its traits, it gains <Piercing>.`

- `EX1-008.ts` is typed and registers executable behavior only through `registerIrCard("EX1-008", compiled)`. Its IR maps the player-target attack condition to `Delete` with opponent/Digimon/DP `lte 4000`, and maps the inherited Your Turn trait gate to a self-targeted `Piercing` aura.
- The attack test proves deletion at the exact 4000 DP boundary and leaves the 5000 DP Digimon alive; the Digimon-target attack test proves the player-target condition is required.
- The Q3197 test proves the When Attacking deletion resolves before the public Blocker response: the eligible 4000 DP blocker is deleted and only the remaining blocker is offered.
- Q3196 is covered by two real security-resolution tests. One preserves the already-open Piercing follow-up after De-Digivolve removes the source and leaves Security Attack +1; the other stops the next check when De-Digivolve removes Security Attack +1.
- A mixed board of Machine, Dragonkin, and near-matching Dinosaur hosts proves the complete trait gate: only Machine and Dragonkin gain Piercing. A real battle test proves Piercing performs the security check after deleting a Digimon. The Your Turn negative test confirms the inherited aura is absent during the opponent's turn.
- Public evolution tests cover both legal red (`ST1-07`) and black (`BT2-058`) level-4 sources, exact 3-memory cost, the evolution draw, and source-stack identity. A level-4 source with neither permitted color is rejected without changing memory or the stack.
- All Digi-Egg security/deck fixtures were replaced with inert main-deck `BT1-009` Digimon. No numeric security shortcut or injected timing helper is used.

Rules sources: local Q&A `Q3196` and `Q3197`; `data/kb/rules/comprehensive.md` §§4-3-3 and 16-7; `data/kb/rules/glossary.md` `<Piercing>` definition.

#### Clause-to-test-to-IR mapping

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| When Attacking against a player | `WhenAttacking` + `attackTargetsPlayer` | Exact 4000/5000 DP boundary test |
| Delete one opposing Digimon at 4000 DP or less | `Delete`, opponent/Digimon, `dp: lte 4000`, count 1 | Positive attack test and Digimon-target negative |
| Resolve before Blocker | Same mandatory attack trigger | Q3197 blocker-window test |
| Your Turn inherited Piercing | inherited `YourTurn` `Aura`, `selfHasTrait` Machine OR Dragonkin | Machine/Dragonkin, opponent-turn, and real Piercing-battle tests |
| Piercing remains pending after source loss / follows current Security Attack | Engine keyword resolution exercised by inherited Piercing | Q3196 two-check/de-digivolve tests |
| Evolution requirements | Catalog requirements consumed by public `digivolve` intent | Legal red/black stack tests and invalid-source negative |

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-008.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 14 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-008.ts apps/api/src/cards/EX1/EX1-008.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-008.ts apps/api/src/cards/EX1/EX1-008.test.ts docs/audits/EX1-reaudit/EX1-008.md` — passed.
- `git diff --check` — passed.

#### Rubric

- Catalog/rules and Q3196/Q3197: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker lane)

Score: 8/10, capped by worker delivery policy. No known behavioral gap remains for the printed contract.

### EX1-009 — WarGreymon

#### Catalog and knowledge-base evidence

The committed catalog entry identifies EX1-009 as the red level 6 Mega WarGreymon (12 play cost, 12,000 DP, red level 5 evolution for 4 memory, Dragonkin/Vaccine). Its printed text is:

- `[When Digivolving] ＜Blitz＞ (This Digimon can attack when your opponent has 1 or more memory.)`
- `[When Attacking] When this Digimon attacks a player, if you have a Tamer in play, delete 1 of your opponent's Digimon with ＜Blocker＞.`

`node tools/kb/query.mjs card EX1-009` returns Q3198 and Q3199. Q3198 confirms that the When Attacking effect resolves before the opponent's Blocker response. Q3199 confirms that a Blocker gained from an effect or inherited from a digivolution card is a valid deletion target. The relevant comprehensive-rules anchors are 11-1-3/11-1-4 (attack timing), 11-4 (Blocker timing), 15-16-5 (When Attacking), 16-5 (Blocker), and 16-16 (Blitz).

#### Implementation trace

`apps/api/src/cards/EX1/EX1-009.ts` is typed without `@ts-nocheck` and registers exactly once through `registerIrCard("EX1-009", compiled)`. The IR has `coverage: "full"` and no residual entries.

| Printed clause | IR proof | Behavioral proof |
| --- | --- | --- |
| When Digivolving grants Blitz | A `WhenDigivolving` effect exposes the `Blitz` keyword (lines 7–15). | The real evolution test evolves from BT1-021 while memory is 1, settles the evolution, observes memory below zero, then successfully declares an attack and resolves a security check. |
| Attack must target a player | The `WhenAttacking` delete action is guarded by `attackTargetsPlayer` (lines 17–45). | The Digimon-target attack leaves its Blocker alive and resolves combat. |
| Controller must have a Tamer | The same action is guarded by `youHave` for a mine battle-area Tamer (lines 29–40). | The no-Tamer player attack leaves the opposing Blocker alive. |
| Delete exactly one opposing Digimon with Blocker | The target filter requires opponent controller, Digimon kind, `Blocker`, and `count: 1` (lines 20–28). | The positive player attack deletes one printed Blocker and leaves a non-Blocker peer; the mixed inherited/printed fixture deletes the selected inherited Blocker and leaves the printed Blocker available. |

#### Q&A, stack, and peer proof

- Q3198: the mixed fixture resolves the WarGreymon deletion, waits for the public `blockWindowOpened` event, and asserts that only the surviving printed Blocker is eligible. This demonstrates the deletion-before-Blocker ordering through public intents and settled state.
- Q3199 inherited boundary: BT2-066 carries EX1-048 under it, giving the host an inherited Blocker. The test selects that instance, proves it reaches trash, and then declares a block with the remaining printed Blocker.
- Q3199 effect boundary: EX1-065 grants Blocker to its own Diaboromon through its opponent-turn effect. WarGreymon deletes that effect-granted Blocker before the attack proceeds.
- Peer/negative boundary: BT1-010 is a non-Blocker Digimon in the positive fixture, and the Digimon-target and no-Tamer tests prove the target and controller conditions do not overreach.
- Evolution-stack boundary: the Blitz test uses a legal BT1-021 → EX1-009 stack and asserts the top-card transition before the post-zero-memory attack. No Digi-Egg is used in deck or security fixtures.

#### Verification commands

All commands were run from the assigned worktree. The focused test was serialized with one worker and no file parallelism.

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-009.test.ts --maxWorkers=1 --no-file-parallelism  # 1 file, 6 tests passed
pnpm --filter @aegis/api typecheck                                                                            # passed
pnpm exec oxlint apps/api/src/cards/EX1/EX1-009.ts apps/api/src/cards/EX1/EX1-009.test.ts                    # passed
pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-009.ts apps/api/src/cards/EX1/EX1-009.test.ts docs/audits/EX1-reaudit/EX1-009.md  # passed
git diff --check                                                                                              # passed
```

#### Changes, gaps, and score

Changes are limited to the assigned card module, test, and this report: removed `@ts-nocheck`, replaced four prohibited Digi-Egg security fixtures with inert BT1-009 main-deck Digimon, and added effect-granted Blocker proof for Q3199. No engine/shared files were changed and no unresolved behavior gap remains for the printed clauses or Q3198/Q3199.

| Rubric | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Catalog text, Q3198/Q3199, and applicable timing/keyword rules recorded. |
| IR trace | 2/2 | Typed full-coverage IR maps all clauses to filters and conditions; sole `registerIrCard` registration. |
| Behavioral proof | 2/2 | Six focused tests cover positive, target, Tamer, timing, effect/inherited Blocker, and real Blitz paths. |
| Peer/stack proof | 2/2 | Printed, inherited, effect-granted, non-Blocker, and legal evolution-stack boundaries are exercised publicly. |
| Delivery gates | 0/2 | Worker lane does not receive delivery credit; collection-wide closeout, atomic commit, and push remain coordinator responsibilities. |
| **Total** | **8/10** | Worker maximum. |

### EX1-010 — Phoenixmon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX1-010`.
- Local knowledge base: `node tools/kb/query.mjs card EX1-010` returned Q3200.
- Applicable local rules: `data/kb/rules/glossary.md` (When Attacking, inherited/stacked cards, and `<Security Attack +x>`), plus `data/kb/rules/comprehensive.md` §§2-3-5, 4-3-2, 4-7-2/4-7-7, and 11-4 for evolution requirements, stack identity, top-card boundaries, and attack/block timing.
- Direct implementation and proof: `apps/api/src/cards/EX1/EX1-010.ts` and `EX1-010.test.ts`.
- Peer comparison: EX1-009 and EX1-002 use the same compiled registration and player-targeted `WhenAttacking` condition patterns.

#### Printed contract and Q&A

Phoenixmon is a red level 6 Holy Beast Digimon (11000 DP, play cost 12) with
one red level 5 / 3-memory evolution requirement. Its printed clauses are:

- `<Security Attack +1>` (checks one additional security card).
- `[When Attacking] When this Digimon attacks a player, <Draw 2>`.

Q3200 asks whether the effect activates before the opponent blocks a player
attack. The local answer is yes: `[When Attacking]` resolves before the public
`<Blocker>` response window. The second focused test observes the draw before
the `blockWindowOpened` event, then declares a real block through the public
intent.

#### Clause-to-IR-to-test evidence

| Contract | IR evidence | Behavioral proof |
| --- | --- | --- |
| Security Attack +1 | `EX1-010.ts:5-7`: `Static` keyword `SecurityAttack`, amount `1` | First test observes the keyword and resolves a real player attack with exactly two `securityChecked` events; the evolution-stack test repeats the same after public evolution |
| When Attacking timing | `EX1-010.ts:8-18`: `trigger: "WhenAttacking"` | First, second, and stack tests use public `attack` intents and `settle()` before asserting final state |
| Player target only | `condition.kind = "attackTargetsPlayer"` | First and second tests draw on player attacks; third test attacks an opposing Digimon and proves hand remains empty |
| Draw 2, own controller | `kind: "Draw", controller: "mine", amount: 2` | First test starts with an empty hand and observes exactly two cards; stack test observes the two additional cards after evolution draw |
| Q3200 blocker ordering | Standard `WhenAttacking` trigger plus public combat flow | Second test waits for `blockWindowOpened`, asserts the draw already happened, then resolves `declareBlock` and `combatResolved` |

#### Evolution and stack proof

The fourth test performs a public red level-5 (`BT1-021` MetalGreymon) to
EX1-010 evolution for exactly 3 memory. It proves the source remains below the
top card, the mandatory evolution draw is visible, and both Phoenixmon effects
still apply from the resulting realistic stack during a real player attack.

The fifth test attempts evolution from a red level-4 (`BT1-014` Kokatorimon),
which fails the catalog level-5 requirement. The source top card and memory
remain unchanged. This covers the legal route, cost, evolution draw, stack
identity, and an illegal-source boundary through public intents.

All deck and security fixtures use inert main-deck Digimon (`BT1-009` through
`BT1-012`); no Digi-Egg appears in a deck or security zone, and no numeric
security shortcut is used.

#### Changes

- Removed `// @ts-nocheck` from `EX1-010.ts`; the existing `CompiledCard` IR now
  typechecks without weakening the implementation.
- Kept executable registration exclusively through
  `registerIrCard("EX1-010", compiled)`; no legacy `registerCard` exists.
- Added legal/illegal public evolution-stack tests with cost and evolution-draw
  assertions.
- Replaced the invalid Digi-Egg security fixtures with inert main-deck
  Digimon.
- No engine, shared catalog, or unrelated card files were edited.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-010.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-010.ts apps/api/src/cards/EX1/EX1-010.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-010.ts apps/api/src/cards/EX1/EX1-010.test.ts docs/audits/EX1-reaudit/EX1-010.md` — passed.
- `git diff --check` — passed.

#### Rubric

| Axis | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules and Q&A | 2/2 | Catalog clauses, evolution requirement, Q3200, and applicable timing/stack rules are reconciled |
| IR trace | 2/2 | Every printed clause maps to typed compiled IR; the sole registration is `registerIrCard` |
| Behavioral proof | 2/2 | Positive keyword/draw path, player-vs-Digimon boundary, resolved security checks, and Q3200 blocker timing pass |
| Peer/evolution-stack proof | 2/2 | Legal red Lv5 stack, exact cost/evolution draw, preserved source, and illegal red Lv4 source pass via public intents |
| Delivery gates | 0/2 | Worker lane does not receive collection-wide rerun, commit, or push credit |
| **Total** | **8/10** | Delivery remains coordinator-owned |

#### Remaining gaps

No card-specific behavior gap remains. Collection-wide reruns, atomic commit,
and branch push are coordinator delivery gates.

### EX1-011 — Gabumon

#### Catalog and knowledge-base evidence

The committed catalog identifies EX1-011 as blue level 3 Rookie Gabumon (play cost 3, 2,000 DP, blue level 2 evolution for 0). Its inherited text is:

`[When Attacking][Once Per Turn] Reveal the top 3 cards of your deck. Add 1 Tamer card or 1 Digimon card with [Gabumon] in its name among them to your hand. Place the remaining cards at the bottom of your deck in any order.`

`node tools/kb/query.mjs card EX1-011` returns Q3201 and Q3202:

- Q3201 says that when both a [Gabumon]-named Digimon and a Tamer are revealed, only one or the other can be added.
- Q3202 says that the eligible [Gabumon]-named Digimon or Tamer need not be blue.

Applicable local rules are Comprehensive Rules §§11-1-3/11-1-4 (the attack declaration resolves triggered [When Attacking] effects before later attack timings), 15-15-3-1/15-15-3-4 (revealed cards remain in one reveal process until final placement), and 15-15-3-6 (the owner chooses the order for multiple cards returned to the deck). The glossary's `When Attacking` and `Once Per Turn` entries also apply.

#### Implementation trace

`apps/api/src/cards/EX1/EX1-011.ts` is typed with `CompiledCard`, uses a single `registerIrCard("EX1-011", compiled)` registration, and declares full coverage with no residuals.

| Printed clause | IR proof | Behavioral proof |
| --- | --- | --- |
| Inherited When Attacking trigger | `trigger: "WhenAttacking"` and `isInherited: true` | The source is placed under a higher-level attacker; the top-level EX1-011 negative does not activate. |
| Once Per Turn | `frequency: "OncePerTurn"` | The same host attacks twice in one turn with a public unsuspend, then activates again after the next own turn begins. |
| Reveal the top 3 | `RevealAdd` with `revealCount: 3` | The positive test asserts the three public `cardRevealed` IDs. |
| Add one Tamer or one Digimon with [Gabumon] in its name | One `add` slot with `count: 1`, primary `kind: ["Tamer"]`, and `orFilters` for Digimon `nameOrTrait` name token `Gabumon` | Q3201 mixed reveal adds exactly one; Q3202 cases add a non-blue Gabumon and a non-blue Tamer; Garurumon and ordinary Digimon are rejected. |
| Place all remaining cards at the bottom in any order | `rest: "deckBottom"` | A public `orderCards` response chooses a non-default order and the settled deck matches it. |

#### Q&A, stack, and boundary proof

- Q3201 is covered by revealing both ST2-12 (Tamer) and BT2-069 (purple Gabumon) together; the hand contains only the first eligible card, while the other revealed cards remain in the deck.
- Q3202 is covered independently for BT2-069 (purple, non-blue Gabumon) and ST3-12 (yellow, non-blue Tamer).
- Name boundaries are explicit: BT2-073 (Garurumon) is a near-match and BT1-030/BT1-031 are non-Tamer Digimon; with no eligible card, the hand stays empty and all three return to the deck.
- The real attack path proves this is an inherited effect on a legal stack (`BT1-032` over `EX1-011`), while the standalone EX1-011 attack proves the printed text is not incorrectly treated as a main effect.
- The breeding test uses a blue Digi-Egg only in the valid breeding area, evolves EX1-011 through the public `digivolve` intent, and asserts the source remains in the evolution stack. No Digi-Egg appears in any deck or security fixture.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-011.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 8 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-011.ts apps/api/src/cards/EX1/EX1-011.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-011.ts apps/api/src/cards/EX1/EX1-011.test.ts` — passed.
- `git diff --check` — passed.

#### Changes, gaps, and score

Changes are limited to EX1-011.ts, EX1-011.test.ts, and this report. The module's `@ts-nocheck` directive was removed. Security/deck Digi-Egg fixtures were replaced with inert BT1-009 cards; the only remaining Digi-Egg is a valid breeding-area source. No engine, shared, catalog, or unrelated card files were changed by this lane. No unresolved gap remains for the printed contract or Q3201/Q3202.

| Rubric | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Catalog contract, Q3201/Q3202, and reveal/attack/once-per-turn rules recorded. |
| IR trace | 2/2 | Typed full-coverage IR maps every printed clause and registers only through `registerIrCard`. |
| Behavioral proof | 2/2 | Eight focused tests cover positive, exact reveal count, union count, non-blue candidates, name negative, bottom ordering, inherited boundary, and once-per-turn reset. |
| Peer/stack proof | 2/2 | Mixed matching/near-matching cards, legal source stack, standalone top-card negative, and public breeding evolution are exercised. |
| Delivery gates | 0/2 | Worker lane receives no delivery credit; collection-wide closeout, atomic commit, and push remain coordinator responsibilities. |
| **Total** | **8/10** | Worker maximum. |

### EX1-012 — Gomamon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX1-012`.
- Local knowledge base: `node tools/kb/query.mjs card EX1-012` returned no card-specific Q&A.
- General rules applied: evolution requirements and source-stack identity; permanent targeting is limited to the battle area unless a target zone is specified.
- Direct implementation and proof: `apps/api/src/cards/EX1/EX1-012.ts` and `EX1-012.test.ts`.

#### Printed contract

Gomamon is a blue level 3 Rookie Digimon (2000 DP, play cost 3) with a blue level 2 / 0-memory evolution requirement. Its only effect is:

`[On Play] Trash 1 digivolution card from the bottom of 1 of your opponent's Digimon.`

#### Clause-to-IR-to-test evidence

| Contract | IR evidence | Behavioral proof |
| --- | --- | --- |
| On Play timing | `EX1-012.ts` uses `trigger: "OnPlay"` | The play-intent tests resolve the complete effect stack before assertions. The legal evolution test confirms evolution does not incorrectly fire this On Play effect. |
| One opposing Digimon | `TrashDigivolution` target has `controller: "opponent"`, `kind: ["Digimon"]`, and `count: 1` | The positive test trashes a source from an opposing battle-area Digimon; an own-side stacked Digimon is included in the target-zone boundary fixture and remains unaffected. |
| Bottom source card | `amount: 1` and `fromTop: false` | The positive test identifies the bottom source instance and asserts that exact card reaches the opponent's trash while the upper source remains in the stack. |
| Source and target boundaries | `digivolutionCards: "hasAny"`; default permanent targeting is the battle area | A stackless opposing Digimon is not selected, and an opposing breeding-area stack remains unchanged while a battle-area opponent stack is processed. |

#### Evolution and stack proof

- A public `digivolve` intent from blue level-2 `BT1-003` in breeding succeeds, pays the catalog cost of 0, draws the normal evolution card, preserves `BT1-003` under EX1-012, and leaves an opponent's source stack unchanged because the card is not being played.
- The same public intent from red level-2 `BT1-001` is rejected without changing memory, hand, top card, or source stack.
- No Digi-Egg is used in a deck or security fixture; the required Digi-Egg source appears only in the explicit breeding-area evolution test.

#### Changes

- Removed `// @ts-nocheck` from `EX1-012.ts`; the typed compiled IR remains registered exactly once through `registerIrCard("EX1-012", compiled)`.
- Strengthened the opponent battle-area versus breeding-area boundary test and asserted the exact bottom source instance.
- Added legal blue and illegal off-color evolution-stack tests using public intents.
- No engine, shared catalog, or unrelated card files were edited.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-012.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-012.ts apps/api/src/cards/EX1/EX1-012.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-012.ts apps/api/src/cards/EX1/EX1-012.test.ts docs/audits/EX1-reaudit/EX1-012.md` — passed.
- `git diff --check` — passed.

#### Rubric

| Axis | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules and Q&A | 2/2 | Catalog metadata and printed effect are reconciled; the local query has no card-specific Q&A. |
| IR trace | 2/2 | Typed full-coverage IR maps On Play, opponent controller, Digimon kind, source presence, one target, and bottom-source trash; sole registration is `registerIrCard`. |
| Behavioral proof | 2/2 | Five focused tests cover positive resolution, exact bottom-source identity, no-source no-op, On Play timing, and target-zone boundaries. |
| Peer/evolution-stack proof | 2/2 | Legal blue and illegal off-color evolution routes prove source-stack identity, zero cost, draw, and rejection boundaries through public intents. |
| Delivery gates | 0/2 | Worker lane does not receive collection-wide rerun, atomic commit, or push credit. |
| **Total** | **8/10** | Worker maximum; collection delivery remains coordinator-owned. |

#### Remaining gaps

No card-specific behavior gap remains for the catalog text. Collection-wide reruns, atomic commit, and branch push remain coordinator responsibilities.

### EX1-013 — Veemon

#### Sources and printed contract

- Catalog: `EX1-013` Veemon, blue level 3 Rookie, 2000 DP, blue level 2 evolution for 0, `[Mini Dragon]` / `[Free]`.
- Inherited effect: `[Your Turn][Once Per Turn] When this Digimon becomes unsuspended during your main phase, gain 1 memory.`
- Local KB query: Q3203. An already-unsuspended Digimon does not satisfy “becomes unsuspended”; the effect needs a suspended-to-unsuspended transition.

#### Implementation trace

`EX1-013.ts` is typed (the `@ts-nocheck` directive was removed) and registers only through `registerIrCard("EX1-013", compiled)`. The compiled IR uses a `YourTurn` inherited `SubTrigger` for `whenUnsuspended`, self-source filtering, `GainMemory: 1`, and `OncePerTurn` frequency. No engine/shared changes were needed.

#### Behavioral evidence

| Clause / risk | Public proof |
| --- | --- |
| Main-phase unsuspend gains 1 memory | Existing BT1-036 public play flow unsuspends a suspended EX1-019 host and asserts the memory endpoint. |
| Your Turn restriction | Existing opponent-turn flow attacks/suspends the host, advances to the opponent's main phase, and verifies no EX1-013 resolution. |
| Q3203 already-unsuspended boundary | Existing test plays BT1-036 against an active host and asserts no EX1-013 resolution or memory gain. |
| Once per turn | Existing test performs two genuine unsuspends in one turn and asserts one resolution. |
| Once-per-turn reset | New test resolves a first unsuspend, completes a public opponent turn, then attacks and unsuspends again on the next own turn; two EX1-013 resolutions are observed. |
| Evolution/source identity | New test publicly evolves `BT1-003` (breeding) → EX1-013 → BT1-032 → EX1-019, asserts the preserved source stack, attacks through the stack, and resolves EX1-019's public unsuspend path with EX1-013 as source. |

All deck/security fixtures use inert main-deck Digimon; no Digi-Egg is placed in a deck or security zone. The only Digi-Egg is the legal `BT1-003` breeding source in the evolution-stack scenario.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-013.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 6/6 tests.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-013.ts apps/api/src/cards/EX1/EX1-013.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-013.ts apps/api/src/cards/EX1/EX1-013.test.ts` — passed after formatting.
- `git diff --check` — run as the final scoped worker check.
- Repository typecheck was not rerun in this worker; the coordinator's fresh EX1 baseline typecheck was green.

#### Score

| Catalog/rules | IR trace | Behavioral proof | Peer/stack proof | Delivery gates | Total |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 2 | 2 | 2 | 0 | **8/10** |

No unresolved card-specific ambiguity remains. Delivery remains coordinator-owned.

### EX1-014 — ExVeemon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX1-014`.
- Local knowledge base: `node tools/kb/query.mjs card EX1-014` returned no card-specific Q&A.
- General rules applied: Jamming prevents deletion in battles against Security Digimon; inherited effects apply to the top Digimon of a stack on the controller's turn; digivolution requires a legal source color and level and preserves the source below the new top card.
- Direct implementation and proof: `apps/api/src/cards/EX1/EX1-014.ts` and `EX1-014.test.ts`.

#### Printed contract

ExVeemon is a blue level 4 Champion Digimon (4000 DP, play cost 5) with blue level 3 / 2-memory and green level 3 / 2-memory evolution requirements. It has printed `<Jamming>`. Its inherited effect is:

`[Your Turn] While this Digimon has [Imperialdramon] in its name or [Free] in its traits, it gains <Jamming>.`

#### Clause-to-IR-to-test evidence

| Contract | IR evidence | Behavioral proof |
| --- | --- | --- |
| Printed Jamming | `EX1-014.ts` registers a `Static` effect with the `Jamming` keyword | The main-keyword test observes Jamming on an isolated ExVeemon, and the real losing Security battle confirms the attacker remains in the battle area. |
| Inherited timing and self target | The inherited `YourTurn` effect targets its self reference with `isSelf: true` and permanently grants Jamming | Free and Imperialdramon-name hosts gain Jamming on their controller's turn; the controller-turn test observes an opponent's host without the grant on player 0's turn and with it on player 1's turn. |
| Imperialdramon name branch | The condition uses `selfHasNameContaining` with `Imperialdramon` | `BT3-111 Imperialdramon: Dragon Mode` is a non-Free name-only positive, so the branch is not accidentally reduced to the Free trait. |
| Free trait branch and trait boundary | The condition uses exact `selfHasTrait` matching for `Free` | `EX1-019 Paildramon` gains Jamming, while near-match `EX1-015 Garurumon` (Vaccine) does not. |
| Evolution requirements | Catalog evolution data supplies blue or green level-3 sources at cost 2; no alternate registration is needed | Public `digivolve` intents succeed from blue `EX1-013` and green `BT1-064`, pay 2 memory, draw the inert `BT1-009`, retain the exact source in `stack`, and expose printed Jamming. Red `BT1-009` is rejected with memory, hand, and stack unchanged. |

#### Evolution and controller/trait proof

- Both printed level-3 routes were exercised through public `digivolve` intents, not injected timing. Each legal route confirms the top card becomes EX1-014, the source remains below it, the cost is exactly 2 memory, and the normal evolution draw occurs.
- The red level-3 source is a meaningful off-color negative: the intent returns `invalid-evolution` and does not consume the card or memory.
- The inherited condition is tested against Free, a non-Free Imperialdramon name, and a Vaccine near-match. An opponent-controlled Free host is also checked across both turns, proving controller ownership rather than merely checking a global `turnSeat` condition.
- No Digi-Egg appears in a deck or Security fixture. The deck fixtures use inert main-deck `BT1-009`; Security uses inert `BT1-020`.

#### Changes

- Removed `// @ts-nocheck` from `EX1-014.ts`; the typed compiled IR remains registered exactly once through `registerIrCard("EX1-014", compiled)`.
- Expanded focused proof for both inherited branches, exact trait rejection, controller/turn boundaries, blue/green legal evolution stacks, and red illegal evolution.
- Replaced invalid Digi-Egg deck fixtures with inert main-deck fixtures.
- No engine, shared catalog, or unrelated card files were edited by this lane.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-014.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 8 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-014.ts apps/api/src/cards/EX1/EX1-014.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-014.ts apps/api/src/cards/EX1/EX1-014.test.ts docs/audits/EX1-reaudit/EX1-014.md` — passed.
- `git diff --check` — passed.

#### Rubric

| Axis | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules and Q&A | 2/2 | Catalog metadata, printed clauses, local rules, and the no-Q&A query result are reconciled. |
| IR trace | 2/2 | Typed full-coverage IR maps printed Jamming, inherited Your Turn timing, self targeting, exact Free trait, Imperialdramon name matching, and sole `registerIrCard` registration. |
| Behavioral proof | 2/2 | Eight focused tests cover printed keyword behavior, real Security battle resolution, positive and negative inherited conditions, controller timing, and legal/illegal evolution outcomes. |
| Peer/evolution-stack proof | 2/2 | Blue and green public evolution routes retain their source cards and draw; an off-color source is rejected; Free, non-Free Imperialdramon, and Vaccine peers distinguish the inherited filter. |
| Delivery gates | 0/2 | Worker lane does not receive collection-wide rerun, atomic commit, or push credit. |
| **Total** | **8/10** | Worker maximum; collection delivery remains coordinator-owned. |

#### Remaining gaps

No card-specific behavior gap remains for the catalog text. Collection-wide reruns, atomic commit, and branch push remain coordinator responsibilities.

### EX1-015 — Garurumon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX1-015`.
- Local knowledge base: `node tools/kb/query.mjs card EX1-015` returned no card-specific Q&A.
- General rules applied: inherited effects are active from a card below the top of its Digimon stack; `[When Attacking][Once Per Turn]` resolves from a public attack and can be declined; digivolution requires a matching color and level source, pays the printed memory cost, draws one card, and retains the source below the new top card.
- Direct implementation and proof: `apps/api/src/cards/EX1/EX1-015.ts` and `EX1-015.test.ts`.

#### Printed contract

Garurumon is a blue level 4 Champion Digimon (5000 DP, play cost 5) with a blue level 3 / 2-memory evolution requirement. Its inherited effect is:

`[When Attacking][Once Per Turn] You may play 1 [Matt Ishida] with a play cost of 3 or less from your hand without paying its memory cost.`

#### Clause-to-IR-to-test evidence

| Contract | IR evidence | Behavioral proof |
| --- | --- | --- |
| Inherited When Attacking timing | `EX1-015.ts` registers an inherited effect with `trigger: "WhenAttacking"` and `isInherited: true` | Public attack intents on a host with EX1-015 underneath resolve the effect; a public evolution stack later retains EX1-015 and resolves the same inherited effect. |
| Once-per-turn limit | The effect declares `frequency: "OncePerTurn"` | Two attacks in one turn, with a real unsuspension between them, produce exactly one EX1-015 resolution and leave the second Matt Ishida in hand. |
| Optionality and refusal | `optional: true` on the `PlayWithoutCost` action | The refusal test uses `autoDeclineOptional` and confirms the eligible Matt Ishida remains in hand. |
| Exact `[Matt Ishida]` name | Target filter uses `nameOrTrait: [{ tokens: ["Matt Ishida"], match: "nameExact" }]` | Exact ST2-12 and BT15-083 cards are played; combined-name `AD1-019` is rejected. |
| Play-cost boundary and free play | Target filter uses `playCostLte: 3`; action uses `from: ["hand"]` and `payCost: false` | Cost 2 and exact cost 3 Matt Ishida cards leave hand and enter the battle area; cost 4 BT1-086 remains in hand. |
| Controller and count | Filter uses `controller: "mine"`; target count is `1` | Positive tests only expose the controller's hand, and the once-per-turn multi-attack test proves at most one card is played. |
| Evolution requirement and stack identity | The catalog supplies blue level 3 / 2-memory evolution data; the module uses only `registerIrCard("EX1-015", compiled)` | Publicly evolves from blue EX1-013 to EX1-015, then into blue level-5 BT1-038; memory changes by 2 each time, draws are observed through the inert deck, and stack identity is `[EX1-013, EX1-015]`. Red BT1-009 is rejected with top card, stack, memory, and hand unchanged. |

#### Evolution and boundary proof

- The legal route is exercised through two public `digivolve` intents rather than an injected timing. The first intent proves the printed blue level-3 source and 2-memory cost; the second proves EX1-015 remains in the stack and its inherited effect is still visible from below the BT1-038 top card.
- The illegal route uses red level-3 BT1-009. The engine returns `invalid-evolution`, and no card, stack, or memory state changes.
- The target pool distinguishes exact names from a combined name, exact cost 3 from cost 4, and acceptance from refusal. The cost-3 proof uses BT15-083; the cost-4 negative uses BT1-086.
- No Digi-Egg appears in a deck or Security fixture. Security uses inert main-deck `BT1-009`; evolution decks use inert `BT1-009` and `BT1-010`.

#### Changes

- Removed `// @ts-nocheck` from `EX1-015.ts`; the typed full-coverage IR remains registered exactly once through `registerIrCard("EX1-015", compiled)`.
- Replaced invalid Digi-Egg Security fixtures with inert main-deck Digimon.
- Expanded focused proof for exact name matching, optional refusal, cost 3/4 boundaries, once-per-turn behavior, legal public evolution stacks, inherited resolution from below a top card, and illegal off-color evolution.
- No engine, shared catalog, or unrelated card files were edited by this lane.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-015.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 8 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-015.ts apps/api/src/cards/EX1/EX1-015.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-015.ts apps/api/src/cards/EX1/EX1-015.test.ts` — passed.
- `git diff --check` — passed.

#### Rubric

| Axis | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules and Q&A | 2/2 | Catalog metadata, printed inherited clause, general evolution rules, and the no-Q&A query result are reconciled. |
| IR trace | 2/2 | Typed full-coverage IR maps inherited timing, once-per-turn identity, optional free play, exact name, controller, hand origin, count, and cost cap, with sole `registerIrCard` registration. |
| Behavioral proof | 2/2 | Eight focused tests cover positive play, exact-name rejection, cost boundaries, refusal, once-per-turn, final zones, and resolved pending effects. |
| Peer/evolution-stack proof | 2/2 | A legal blue stack retains EX1-015 below a level-5 top card and resolves its inherited effect; a red source is rejected without mutation. |
| Delivery gates | 0/2 | Worker lane does not receive collection-wide rerun, atomic commit, or push credit. |
| **Total** | **8/10** | Worker maximum; collection delivery remains coordinator-owned. |

#### Remaining gaps

No card-specific behavior gap remains for the catalog text. Collection-wide reruns, atomic commit, and branch push remain coordinator responsibilities.

### EX1-016 — Ikkakumon

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Card: EX1-016 Ikkakumon; blue Digimon; level 4; 6000 DP.
- Evolution requirement: blue level 3, cost 2.
- Printed clause: `[Your Turn] This Digimon can also attack your opponent's unsuspended Digimon with no digivolution cards.`
- Local knowledge-base query: `node tools/kb/query.mjs card EX1-016` returned no card-specific entries or Q&A. General attack legality requires an opponent's battle-area Digimon and normally requires it to be suspended; this card's grant relaxes only the unsuspended-defender condition and only for a defender with an empty evolution stack.

No card-specific ambiguity or erratum was found.

#### Implementation trace

`apps/api/src/cards/EX1/EX1-016.ts` now has no `@ts-nocheck` and registers only with `registerIrCard("EX1-016", compiled)`.

The compiled IR contains one `YourTurn` effect targeting self with `GrantCanAttackUnsuspended`, `duration: "permanent"`, and `noDigivolutionCards: true`. The shared combat legality path applies the grant only to unsuspended opposing battle-area Digimon whose `stack.length` is zero; suspended targets remain legal under ordinary attack rules, while own-controller and breeding-area targets remain illegal.

#### Behavioral proof

`apps/api/src/cards/EX1/EX1-016.test.ts` has 7 focused tests:

| Printed/rules boundary | Test evidence |
| --- | --- |
| Positive stackless unsuspended attack | Observes the Your Turn grant and declares an attack against an unsuspended opponent with no sources. |
| Evolution-stack boundary | Rejects an unsuspended opponent with a legal blue source under the top Digimon. |
| Suspended target boundary | Allows a suspended opponent with sources, proving the card does not add an unrelated stack restriction to ordinary attacks. |
| Controller and zone boundaries | Rejects own Digimon and an opponent's breeding-area Digimon; accepts an opponent's stackless battle-area Digimon. |
| Turn boundary | Observes the grant during the controller's main phase and its removal during the opponent's turn; the out-of-turn attack is rejected. |
| Legal evolution stack | Evolves EX1-016 from blue level-3 EX1-013, verifies the source remains in `Permanent.stack`, memory decreases by 2, and the card leaves hand. |
| Illegal evolution stack | Rejects evolution from red level-3 BT1-009, preserving the source, empty stack, hand, and memory. |

All fixtures use inert main-deck Digimon where deck cards are needed. No Digi-Egg appears in a deck or security fixture, and no numeric security shortcut is used.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-016.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 7/7 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-016.ts apps/api/src/cards/EX1/EX1-016.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-016.ts apps/api/src/cards/EX1/EX1-016.test.ts` — passed.
- `git diff --check` — passed.

#### Remaining gaps

No card-specific Q&A was returned. No shared engine seam or unsupported behavior was needed for this card. Delivery gates (collection-wide rerun, atomic commit, and branch push) are coordinator-owned and intentionally not claimed by this worker.

#### Rubric

| Area | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |

### EX1-017 — WereGarurumon

#### Contract and sources

The committed catalog identifies EX1-017 as a blue Lv.5 Digimon (WereGarurumon,
7000 DP) with one legal evolution route: blue Lv.4 for 3 memory. Its printed
effects are:

- **When Digivolving:** Draw 1.
- **Inherited — When Attacking, Once Per Turn:** If the owner has 8 or more
  cards in hand, gain 1 memory.

`node tools/kb/query.mjs card EX1-017` returned no card-specific Q&A. No
additional EX1-017 ruling or erratum was exposed by the local KB index.

#### Clause-to-implementation and proof mapping

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| When Digivolving, draw 1 | `Draw` amount 1 on `WhenDigivolving` | `draws 1 when digivolving` proves the card leaves the deck, enters hand, and resolves after a legal EX1-014 (blue Lv.4) evolution; it also asserts top card, preserved source stack, and 3-memory cost. |
| Inherited attack effect | `GainMemory` amount 1 on `WhenAttacking`, `isInherited: true` | Attack tests place EX1-017 beneath EX1-021 and use the public `attack` intent. |
| Exact threshold | `zoneCount` hand `gte: 8` | Separate 8-card and 7-card fixtures prove the inclusive boundary and negative path. |
| Once per turn | `frequency: "OncePerTurn"` | Two attacks in one turn resolve EX1-017 once; a public `startTurnLoop` then proves it resolves again on the next own turn. |
| Evolution legality | Catalog-derived engine evolution validation | Legal blue Lv.4 evolution preserves the source stack; a red Lv.3 source is rejected without changing stack, hand, or memory. |

All deck and Security fixtures use inert main-deck Digimon (`BT1-009` or
`BT1-029`); no Digi-Egg or numeric Security shortcut is used.

#### Changes

- Removed `// @ts-nocheck` from `EX1-017.ts`; the module remains compiled IR
  registered exclusively with `registerIrCard("EX1-017", compiled)`.
- Strengthened the colocated test with source-stack, memory, exact-boundary,
  illegal-evolution, and next-own-turn assertions.
- Replaced invalid Digi-Egg Security fixtures with `BT1-009`.

#### Verification

Passed:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-017.test.ts --maxWorkers=1 --no-file-parallelism
  1 file, 6 tests passed
pnpm --filter @aegis/api typecheck
pnpm exec oxlint apps/api/src/cards/EX1/EX1-017.ts apps/api/src/cards/EX1/EX1-017.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-017.ts apps/api/src/cards/EX1/EX1-017.test.ts
git diff --check
```

#### Rubric

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Catalog fields and printed clauses checked; KB query recorded with no Q&A. |
| IR fidelity | 2/2 | Both effects, inherited status, threshold, and frequency map directly to compiled IR. |
| Behavioral proof | 2/2 | Draw, attack, 8/7 boundary, public turn flow, once-per-turn, and final observable state pass. |
| Peer and stack proof | 2/2 | Legal blue Lv.4 stack and illegal source rejection are proven; no trait-filter peer ambiguity applies. |
| Delivery gates | 0/2 | Worker does not commit or push; collection gates are coordinator-owned. |

**Total: 8/10 (worker maximum).**

Remaining limitation: no card-specific Q&A was returned by the local KB query.

### EX1-018 — Zudomon

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Card: EX1-018 Zudomon; blue Digimon; level 5; 8000 DP; play cost 8; Vaccine / Sea Beast.
- Evolution requirement: blue level 4, 3 memory.
- Printed clauses:
  - `[When Digivolving] Trash 1 digivolution card from the bottom of 1 of your opponent's Digimon.`
  - `[Your Turn] This Digimon can also attack your opponent's unsuspended Digimon with no digivolution cards.`
- Local knowledge-base query: `node tools/kb/query.mjs card EX1-018` returned no card-specific entries or Q&A.
- General rules applied: a bottom evolution source is below the top source and moves to its owner's trash when trashed; a Digimon attack target must be an opposing battle-area Digimon, and this effect relaxes only the unsuspended-target restriction when the target has an empty evolution stack and the effect's controller is taking their turn.

No card-specific ambiguity or erratum was found.

#### Implementation trace

`apps/api/src/cards/EX1/EX1-018.ts` is typed without `@ts-nocheck` and registers executable behavior only through `registerIrCard("EX1-018", compiled)`.

| Contract | IR evidence |
| --- | --- |
| When Digivolving bottom-source trash | `trigger: "WhenDigivolving"` with `TrashDigivolution`, opponent Digimon target, `amount: 1`, and `fromTop: false`. |
| Any opposing Digimon target, with no source prerequisite | Target filter is opponent + Digimon only; a stackless opponent is a valid target but the action resolves as a no-op when there is no source to trash. |
| Your Turn unsuspended attack permission | `trigger: "YourTurn"` with self-targeted `GrantCanAttackUnsuspended`, permanent duration, and `noDigivolutionCards: true`. |
| Sole registration | The module contains no legacy `registerCard` call. |

#### Behavioral proof

`apps/api/src/cards/EX1/EX1-018.test.ts` has 9 focused tests:

| Boundary | Test evidence |
| --- | --- |
| Bottom versus top source | A two-source opposing stack loses exactly its bottom instance to the opponent's trash; the upper source remains in the stack and is not trashed. |
| No-source target | A stackless opposing Digimon remains unchanged when the mandatory source-trash action has no source available. |
| Controller and zone targeting | With an own stacked Digimon, an opposing battle-area stack, and an opposing breeding-area stack, only the opposing battle-area source is trashed; own and breeding stacks remain unchanged. |
| Stackless attack positive path | Zudomon successfully attacks an opposing unsuspended battle-area Digimon with no evolution sources. |
| Evolution-stack attack boundary | An unsuspended opposing Digimon with an evolution source is rejected as an illegal target. |
| Controller and zone attack boundaries | Own Digimon and an opposing breeding-area Digimon are rejected; an opposing battle-area stackless Digimon is accepted. |
| Turn boundary | The unsuspended-target permission is present during Zudomon's controller's turn and absent during the opponent's turn. |
| Legal evolution | Zudomon evolves from blue level-4 EX1-014, costs 3 memory, leaves EX1-014 below the top card, and leaves the inert deck card in hand after the draw. |
| Illegal evolution | Red level-4 BT1-014 is rejected with top card, stack, memory, and hand unchanged. |

All fixtures avoid Digi-Eggs in decks or security and avoid numeric security shortcuts. No injected timing or raw effect trigger is used as proof; the tests use public `digivolve` and `attack` intents and settle pending effects before assertions.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-018.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 9 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-018.ts apps/api/src/cards/EX1/EX1-018.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-018.ts apps/api/src/cards/EX1/EX1-018.test.ts docs/audits/EX1-reaudit/EX1-018.md` — passed.
- `git diff --check` — passed.

#### Remaining gaps

No card-specific Q&A or shared engine seam was identified. Collection-wide rerun, atomic commit, and branch push are coordinator-owned delivery gates and are intentionally not claimed by this worker.

#### Rubric

| Area | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |

### EX1-019 — Paildramon

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Card: EX1-019 Paildramon; blue Digimon; level 5 Ultimate; 7000 DP; play cost 8; Free / Dragonkin.
- Evolution requirements: blue level 4 for 3 memory, or green level 4 for 3 memory.
- Printed clauses:
  - `[When Digivolving] If a Digimon card with [Free] in its traits is in this Digimon's digivolution cards, unsuspend this Digimon.`
  - `Inherited — [Your Turn] While this Digimon has [Imperialdramon] in its name, it can't be blocked.`
- Local knowledge-base query: `node tools/kb/query.mjs card EX1-019` returned Q3204, Q3205, and Q3206.
  - Q3204: the inherited restriction prevents the opponent from changing a player attack's target by blocking.
  - Q3205: an Imperialdramon-name host carrying EX1-019 may attack an opponent's suspended Digimon.
  - Q3206: the opponent cannot even declare a Blocker attempt to suspend a blocker against that attack.
- General rules applied: inherited effects apply from cards in the live evolution stack; a Digimon's evolution source is below its top card; a `Your Turn` aura is active only during its controller's turn; Blocker changes an attack target only at the public block timing.

#### Implementation trace

`apps/api/src/cards/EX1/EX1-019.ts` is typed without `@ts-nocheck` and registers executable behavior only through `registerIrCard("EX1-019", compiled)`.

| Contract | IR evidence |
| --- | --- |
| Free-source When Digivolving unsuspend | `WhenDigivolving` has a self-targeted `Unsuspend` action guarded by `selfDigivolutionStackHasTrait` for the exact `Free` trait. |
| Inherited Imperialdramon restriction | `YourTurn` is marked `isInherited: true`; its self-targeted aura applies `restriction: "cantBeBlocked"` only while the host name contains `Imperialdramon`. |
| Sole registration | The module has no legacy `registerCard` call. |

#### Behavioral proof

`apps/api/src/cards/EX1/EX1-019.test.ts` has 9 focused tests:

| Boundary | Test evidence |
| --- | --- |
| Free-stack unsuspend | A legal blue EX1-014 evolution into Paildramon starts suspended, resolves through the public `digivolve` intent, unsuspends, leaves EX1-014 below EX1-019, pays exactly 3 memory, and empties the evolution card from hand. |
| Trait negative | A legal blue BT1-032 evolution has no Free source, remains suspended, and still pays the normal evolution cost; the retained source stack proves the condition was not silently bypassed. |
| Legal/illegal evolution routes | A red BT1-014 level-4 source is rejected as `invalid-evolution` with stack, suspension, memory, and hand unchanged. |
| Q3204/Q3206 real block boundary | An Imperialdramon: Dragon Mode carrying EX1-019 attacks the opponent's player with a real Blocker present; security resolves, no `blockWindowOpened` event occurs, the blocker remains unsuspended, and a public `declareBlock` attempt is rejected as `wrong-phase`. |
| Q3205 suspended-Digimon target | The same inherited restriction does not prevent an attack against an opponent's suspended Digimon; public combat resolves and the weaker target is deleted without a block window. |
| Name boundary | A Paildramon host carrying EX1-014 is not restricted, opens the real block window, and can be redirected by a Blocker. |
| Controller boundary | An Imperialdramon host owned by seat 1 is restricted while seat 1 is the active turn owner. |
| Turn duration | The own Imperialdramon host is restricted on seat 0's turn and unrestricted after public turn flow advances to seat 1's turn. |

All tests use public `digivolve`, `attack`, `declareBlock`, turn-loop, and
`settle()` behavior. Deck and Security fixtures use inert main-deck Digimon;
no Digi-Egg appears in a deck or Security zone, no numeric Security shortcut is
used, and no injected timing primitive is used as proof.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-019.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 9 tests.
- `pnpm --filter @aegis/api typecheck` — blocked by an unrelated pre-existing EX1-020 error: `DrawAction` in `apps/api/src/cards/EX1/EX1-020.ts` is missing its required `controller`; EX1-019 itself has no reported type error.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-019.ts apps/api/src/cards/EX1/EX1-019.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-019.ts apps/api/src/cards/EX1/EX1-019.test.ts docs/audits/EX1-reaudit/EX1-019.md` — passed.
- `git diff --check` — passed.

#### Remaining gaps

No unresolved EX1-019 rules ambiguity or engine seam was identified. The API typecheck remains red only because of the unrelated EX1-020 error named above; that file is outside this lane's allowed edits. Collection-wide rerun, atomic commit, and branch push are coordinator-owned delivery gates and are intentionally not claimed by this worker.

#### Rubric

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Catalog clauses and Q3204-Q3206 were queried and recorded. |
| IR fidelity | 2/2 | Both printed effects, inherited status, exact Free trait guard, and Imperialdramon name guard map directly to compiled IR. |
| Behavioral proof | 2/2 | Free/non-Free unsuspend, real Blocker interactions, Q3204-Q3206, name/controller/turn boundaries, final zones, and public illegal actions pass. |
| Peer and stack proof | 2/2 | Legal blue and illegal red evolution stacks, source identity, inherited host stack, and a near-matching Paildramon host are proven. |
| Delivery gates | 0/2 | Worker does not commit or push; collection gates are coordinator-owned. |
| **Total** | **8/10** | Worker maximum. |

### EX1-020 — Plesiomon

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Card: EX1-020 Plesiomon; blue Digimon; level 6; 11,000 DP; play cost 11.
- Evolution requirement: blue level 5, 3 memory.
- Printed clauses:
  - `[Your Turn][Once Per Turn] When one of your opponent's digivolution cards is trashed, <Draw 2>.`
  - `[Your Turn] This Digimon can also attack your opponent's unsuspended Digimon with no digivolution cards.`
- Local knowledge-base query: `node tools/kb/query.mjs card EX1-020` returned no card-specific entries or Q&A.
- General rules applied: the watcher must see a genuine effect-trash of a source under an opponent's battle-area Digimon; it must not react to own/breeding sources or a bounce that merely clears sources. The attack grant relaxes the unsuspended-target restriction only for opposing battle-area Digimon with no evolution sources during the controller's turn; ordinary attacks against suspended opposing Digimon remain legal.

No card-specific ambiguity or erratum was found.

#### Implementation trace

`apps/api/src/cards/EX1/EX1-020.ts` is typed without `@ts-nocheck` and registers executable behavior only through `registerIrCard("EX1-020", compiled)`.

| Contract | IR evidence |
| --- | --- |
| Opponent source-trash reaction | `[Your Turn]` + `frequency: "OncePerTurn"` installs a `SubTrigger` for `whenDigivolutionTrashed` with `sourceFilter: { controller: "opponent", kind: ["Digimon"] }`. |
| Optional once-per-turn Draw 2 | The watcher is `optional: true` and its sole payload is `{ kind: "Draw", amount: 2 }`; the once-per-turn key is threaded by the interpreter from the enclosing effect. |
| Your Turn attack permission | A separate `[Your Turn]` effect grants the self `GrantCanAttackUnsuspended` permission with `noDigivolutionCards: true` until the controller's turn ends. |
| Sole registration | The module contains no legacy `registerCard` call. |

#### Behavioral proof

`apps/api/src/cards/EX1/EX1-020.test.ts` has 12 focused tests:

| Boundary | Test evidence |
| --- | --- |
| Attack permission positive path | Plesiomon attacks an opposing unsuspended, stackless Digimon through the public `attack` intent. |
| Attack target boundaries | Public attack intents reject own, opposing stacked, and opposing breeding-area Digimon; a separate public attack accepts an ordinary suspended opposing Digimon. |
| Opponent source and zone scope | A public BT14-083 On Play effect trashes exactly an opposing battle-area source; Plesiomon draws 2 while own and opposing breeding stacks remain unchanged. |
| Optional refusal | With `autoDeclineOptional`, the EX1-020 optional decision is observed and no cards are drawn after the opponent source is trashed. |
| Once-per-turn boundary | Two opponent source trashes in one turn produce exactly one EX1-020 optional decision and one Draw 2. |
| Next-own-turn reset | The public turn loop accepts the first Draw 2 in turn one, skips the second, then accepts another Draw 2 after the next own turn begins. |
| Legal evolution stack | Plesiomon evolves from blue level-5 EX1-018 for 3 memory, draws the evolution card's bonus card, and preserves EX1-018 below the top card. |
| Illegal evolution | Red level-5 BT1-021 is rejected with top card, stack, memory, and hand unchanged. |
| Turn/source timing control | The opponent-turn public flow trashes only the opponent's own source and does not draw from the Plesiomon watcher. |

All fixtures use inert main-deck Digimon (`BT1-009` etc.); no Digi-Egg appears in a deck or security fixture, and no numeric security shortcut is used. No injected timing or raw effect trigger is used as proof; source trash, evolution, attacks, optional decisions, turn transitions, and settlement all use public intents and observable state.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-020.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 12 tests.
- `pnpm --filter @aegis/api typecheck` — passed after correcting the typed `Draw` action to include `controller: "mine"`; the earlier worker report incorrectly claimed this check was green before the authoritative coordinator rerun.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-020.ts apps/api/src/cards/EX1/EX1-020.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-020.ts apps/api/src/cards/EX1/EX1-020.test.ts docs/audits/EX1-reaudit/EX1-020.md` — passed.
- `git diff --check` — passed.

#### Remaining gaps

No card-specific Q&A or shared engine seam was identified. Collection-wide rerun, atomic commit, and branch push are coordinator-owned delivery gates and are intentionally not claimed by this worker.

#### Rubric

| Area | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |

### EX1-021 — MetalGarurumon

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Card: EX1-021 MetalGarurumon; blue Digimon; level 6; 12,000 DP; play cost 11.
- Evolution requirement: blue level 5, 4 memory.
- Printed clauses:
  - `[When Digivolving] Gain 1 memory for every 4 cards in your hand.`
  - `[When Attacking] If you have 8 or more cards in your hand and a Tamer in play, return 1 of your opponent's Digimon with an [On Deletion] effect to the bottom of its owner's deck. Trash all of the digivolution cards of that Digimon.`
- Local knowledge-base query: `node tools/kb/query.mjs card EX1-021` returned Q3207 and Q3208.
  - Q3207 confirms that 5 cards in hand produce exactly 1 memory from the first clause.
  - Q3208 confirms that a Digimon gaining an `[On Deletion]` effect from an effect or inherited effect is a legal target.
- Restriction source: `data/kb/banlist.json` restricts EX1-021 to 1 copy since 2025-09-01. This is a deck-construction restriction and does not alter the card's runtime effects.
- General rules applied: `[On Deletion]` is a text-presence filter (including inherited/gained text); a Digimon's sources are its digivolution cards; returning a battle-area permanent to deck bottom moves its top card to its owner's deck and trashes attached sources. The legal positive stack uses a blue Digi-Egg, blue level-3, and blue level-4 target; the Digi-Egg is only an evolution source and never appears in deck or security fixtures.

No card-specific ambiguity or erratum was found.

#### Implementation trace

`apps/api/src/cards/EX1/EX1-021.ts` is typed without `@ts-nocheck` and registers executable behavior only through `registerIrCard("EX1-021", compiled)`.

| Contract | IR evidence |
| --- | --- |
| When Digivolving hand scaling | The `WhenDigivolving` action uses `GainMemory` with `scaling.per: 4`, `unit: "cards"`, and a controller-owned `hand` filter. |
| Attack condition | The `WhenAttacking` return action requires the `allOf` conditions `handAtLeast: 8` and `youHave` a controller-owned `Tamer`. |
| On Deletion target | The opponent Digimon filter uses `nameOrTrait: [{ tokens: ["On Deletion"], match: "text" }]`, covering printed, inherited, and effect-granted text. |
| Bottom return and source trash | `to: "deckBottom"` delegates to the shared whole-permanent return primitive, which puts the top card at the owner's deck bottom and trashes every attached source. |
| Frequency/registration | Neither effect has a `frequency`/OPT field; the file contains no legacy `registerCard` call. |

#### Behavioral proof

`apps/api/src/cards/EX1/EX1-021.test.ts` has 9 focused tests:

| Boundary | Test evidence |
| --- | --- |
| Hand scaling positive and Q3207 | Public digivolution from a blue level-5 stack with 5 cards remaining after the normal digivolution draw gains exactly 1 memory; 8 cards gains 2. |
| Hand scaling lower boundary | 3 cards remaining gains 0 memory, proving the floor at fewer than 4. |
| Exact attack condition and source movement | With exactly 8 cards and a Tamer, a target with a printed `[On Deletion]` effect moves to the owner's deck bottom and both attached sources move to that owner's trash. |
| Q3208 inherited target | A blue level-4 Digimon with a BT1-030 source (whose inherited text is `[On Deletion] Gain 1 memory`) is returned successfully; its top card reaches deck bottom and its inherited source reaches trash. |
| Missing condition gates | Exactly 8 cards without a Tamer, and a Tamer with exactly 7 cards, both leave the opposing target in the battle area. |
| No accidental OPT / repeat boundary | Two separate MetalGarurumon attackers resolve the return effect against two eligible targets in the same turn, proving no once-per-turn budget or reset is incorrectly imposed. |
| Evolution-stack scope | The positive return case uses a legal blue egg → level 3 → level 4 stack and asserts source instance IDs are in trash while only the top card is in deck. |

All attack and evolution proof uses public intents, `settle()`, and observable game state. Security fixtures use inert main-deck Digimon (`BT1-012`, `BT1-013`); no Digi-Egg appears in deck or security, and no numeric security shortcut or injected timing was used.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-021.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 9 tests.
- `pnpm --filter @aegis/api typecheck` — blocked by unrelated concurrent edits in `EX1-020.ts` (`DrawAction.controller` missing) and `EX1-022.ts` (widened condition `kind`/filter types); no EX1-021 diagnostic was reported.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-021.ts apps/api/src/cards/EX1/EX1-021.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-021.ts apps/api/src/cards/EX1/EX1-021.test.ts docs/audits/EX1-reaudit/EX1-021.md` — passed (the formatter reports the two TypeScript files; Markdown is accepted by the command).
- `git diff --check -- apps/api/src/cards/EX1/EX1-021.ts apps/api/src/cards/EX1/EX1-021.test.ts docs/audits/EX1-reaudit/EX1-021.md` — passed.

#### Remaining gaps

No card-specific behavior gap or shared engine seam was identified. The API typecheck is not green only because of unrelated EX1-020/EX1-022 edits already present in this shared worktree. Collection-wide rerun, atomic commit, branch push, and delivery gates are coordinator-owned and intentionally not claimed by this worker.

#### Rubric

| Area | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |

### EX1-022 — Imperialdramon: Dragon Mode

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Card: EX1-022 Imperialdramon: Dragon Mode; blue Digimon; level 6; 11,000 DP; play cost 12; Free / Ancient Dragon.
- Evolution requirements: blue level 5 for 3 memory, or green level 5 for 3 memory.
- Printed clauses:
  - `[When Digivolving]` If a Digimon card with the [Free] trait is in this Digimon's digivolution cards, unsuspend this Digimon and suspend 1 of the opponent's Digimon.
  - `[Your Turn]` For each color in this Digimon's digivolution cards, it gets +1000 DP.
- Local knowledge-base query: `node tools/kb/query.mjs card EX1-022` returned Q3209: multiple cards of the same color count as one color for the DP bonus.
- EX1-022 has no printed DNA Digivolution requirement. A legal DNA-created level-5 source stack is nevertheless a valid normal-evolution source for EX1-022; a direct DNA attempt into EX1-022 is rejected.

No card-specific ambiguity or erratum was found.

#### Implementation trace

`apps/api/src/cards/EX1/EX1-022.ts` is typed without `@ts-nocheck` and registers executable behavior only through `registerIrCard("EX1-022", compiled)`.

| Contract | IR evidence |
| --- | --- |
| Free-source When Digivolving actions | `WhenDigivolving` contains self-targeted `Unsuspend` and opponent-Digimon `Suspend` actions, both guarded by `selfDigivolutionStackHasTrait` for the exact `Free` trait. |
| Your Turn DP bonus | `YourTurn` contains self-targeted `ModifyDP` for `1000`, permanent duration, scaling by `digivolutionCardColors`, which counts distinct source colors. |
| Sole registration | The module contains no legacy `registerCard` call. |

#### Behavioral proof

`apps/api/src/cards/EX1/EX1-022.test.ts` has 9 focused tests:

| Boundary | Test evidence |
| --- | --- |
| Blue normal evolution | A suspended EX1-019 blue Lv.5 source legally evolves for exactly 3 memory; EX1-014 and EX1-019 remain below EX1-022 in order, the evolution draw is observed, and the Free actions unsuspend the host and suspend the opponent. |
| Green normal evolution | A suspended EX1-041 green Lv.5 source legally evolves for exactly 3 memory, draws 1, preserves EX1-038/EX1-041 in the stack, and resolves the Free actions. |
| DNA-created source stack | BT12-022 and BT12-050 legally DNA digivolve into BT12-028; that real stack then legally evolves into EX1-022 for 3, with both DNA sources and BT12-028 retained, exact memory and both evolution draws asserted, and Free actions resolved. |
| Q3209 | Four blue source cards grant only +1000 DP, not +4000. |
| Distinct-color scaling | One blue and one green source grant +2000 DP; duplicate blue sources grant only +1000 DP. |
| Non-Free source | A legal BT1-041 blue Lv.5 route evolves normally but does not unsuspend the host or suspend the opponent. |
| Invalid normal route | Red Lv.5 BT1-020 is rejected with memory, hand, top card, and stack unchanged. |
| Invalid DNA route | A direct `dnaDigivolve` attempt into EX1-022 is rejected because the card has no DNA requirement, with both materials and memory unchanged. |

All proof uses public evolution intents, settled observable state, exact memory/hand/stack endpoints, and inert main-deck Digimon. No Digi-Egg appears in a deck or Security fixture, no numeric Security shortcut is used, and no injected timing primitive is used as proof.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-022.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 9 tests.
- `pnpm --filter @aegis/api typecheck` — blocked by the unrelated pre-existing `apps/api/src/cards/EX1/EX1-020.ts:15:21` error (`DrawAction` is missing its required `controller`); EX1-022's own type errors were fixed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-022.ts apps/api/src/cards/EX1/EX1-022.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-022.ts apps/api/src/cards/EX1/EX1-022.test.ts docs/audits/EX1-reaudit/EX1-022.md` — passed.
- `git diff --check` — passed.

#### Remaining gaps

No unresolved EX1-022 rules ambiguity or engine seam was identified. The API typecheck remains red only because of the unrelated EX1-020 error named above. Collection-wide rerun, atomic commit, and branch push are coordinator-owned delivery gates and are intentionally not claimed by this worker.

#### Rubric

| Area | Score |
| --- | ---: |
| Catalog and rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer and evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |

### EX1-023 — Elecmon

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Card: EX1-023 Elecmon; yellow Digimon; level 3; 2,000 DP; play cost 3; Rookie / Data / Mammal.
- Evolution requirement: yellow level 2 for 0 memory.
- Printed clause: `[On Deletion] 1 of your opponent's Digimon gains ＜Security Attack -1＞ for the turn. (This Digimon checks 1 fewer security cards.)` The clause is inherited text.
- Local knowledge-base query: `node tools/kb/query.mjs card EX1-023` returned no knowledge-base entries and no card-specific Q&A.
- No card-specific ambiguity or erratum was found. The general inherited-effect placement and turn-duration rules apply.

#### Implementation trace

`apps/api/src/cards/EX1/EX1-023.ts` is typed without `@ts-nocheck` and registers executable behavior only through `registerIrCard("EX1-023", compiled)`.

| Contract | IR evidence |
| --- | --- |
| Inherited deletion trigger | The sole effect uses `trigger: "OnDeletion"` and `isInherited: true`. |
| Opponent Digimon target | `GainKeyword` targets `controller: "opponent"`, `kind: ["Digimon"]`, with `count: 1`. |
| Security Attack reduction | The keyword is `SecurityAttack`, amount `-1`, with the printed raw keyword text. |
| Duration and registration | `duration: "forTheTurn"`; no legacy `registerCard` call exists. |

#### Behavioral proof

`apps/api/src/cards/EX1/EX1-023.test.ts` has 4 focused tests:

| Boundary | Test evidence |
| --- | --- |
| Real deletion and real security attack | A public ST6-15 play deletes the real host carrying EX1-023 in its evolution stack. The opposing ST6-08 then attacks the player through a public attack intent; with Security Attack -1, the defending player's two security cards remain unchanged. |
| Controller and kind boundary | The same deletion leaves a separate own level-5 Digimon at Security Attack 0; a separate case with an opposing Tamer also remains at 0. The opposing Digimon receives the reduction. |
| Duration | The positive reduction is observed during the deleting player's turn and is 0 after that turn ends. |
| Evolution/inherited boundary | A top-card EX1-023 is deleted through the same public effect but does not supply inherited text: the opposing attacker has Security Attack 0 and removes exactly one security card. |

All tests use `settle()` and observable game state. The actual deletion is effect-driven, and security behavior is exercised through real attack intents. Digi-Egg BT1-001 was removed from all deck/security fixtures; remaining deck/security fixtures use inert main-deck Digimon. No numeric security shortcut or injected timing primitive is used as proof.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-023.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 4 tests.
- `pnpm --filter @aegis/api typecheck` — passed; no EX1-023 diagnostic was reported. A concurrent EX1-020 correction was present in the shared worktree; no transient EX1-020 diagnostic is attributed to this card.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-023.ts apps/api/src/cards/EX1/EX1-023.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-023.ts apps/api/src/cards/EX1/EX1-023.test.ts docs/audits/EX1-reaudit/EX1-023.md` — passed.
- `git diff --check` — passed.

#### Remaining gaps

No card-specific behavior gap or shared engine seam was identified. Collection-wide rerun, atomic commit, branch push, and delivery gates are coordinator-owned and intentionally not claimed by this worker.

#### Rubric

| Area | Score |
| --- | ---: |
| Catalog and rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer and evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |

### EX1-024 — Patamon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX1-024`.
- Local KB query: `node tools/kb/query.mjs card EX1-024` returned no card-specific Q&A.
- Printed effect: `[On Play] Reveal the top 4 cards of your deck. Add 1 Digimon card with [Angel], [Archangel], or [Three Great Angels] in its traits among them to your hand. Place the remaining cards at the bottom of your deck in any order.`
- Evolution catalog data: Yellow Lv.2, cost 0.

#### Clause-to-IR-to-test evidence

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| On Play | `effects[0].trigger: "OnPlay"` | Every focused test plays `EX1-024` through `playCard`. |
| Reveal top 4 | `RevealAdd.revealCount: 4` | `reveals exactly 4...` asserts the four `cardRevealed` events and leaves the fifth card untouched above the returned cards. |
| Add one Digimon matching any listed trait | `kind: ["Digimon"]`, `nameOrTrait` trait alternatives for `Angel`, `Archangel`, `Three Great Angels`, `count: 1`, `to: "hand"` | Parameterized tests cover `BT1-055`, `BT1-060`, and `BT1-063`; the first test puts two matching cards in the reveal and proves only one is added. |
| Remaining cards to bottom in any order | `rest: "deckBottomAnyOrder"` | `bottom-decks all four non-matches...` disables automatic ordering, submits a non-default order, and asserts exact deck instance order. |
| No-match path | Same `RevealAdd` disposition | Near-trait/non-Digimon negatives (`BT1-062`, `BT1-061`) prove no false match and all four cards return to deck. |
| Optionality | No optional marker is printed or present in IR | `has no optional refusal branch...` runs with `autoDeclineOptional` and asserts the mandatory eligible card is still added and no optional decision exists. |
| Evolution compatibility | Catalog evo requirement is enforced by engine | Yellow Digi-Egg → `EX1-024` succeeds at cost 0 and preserves source stack; red Digi-Egg → `EX1-024` is rejected without state mutation. |

#### Changes

- Removed `// @ts-nocheck` from `EX1-024.ts`.
- Kept executable registration exclusively through `registerIrCard("EX1-024", compiled)`.
- Corrected the rest disposition from `deckBottom` to `deckBottomAnyOrder`.
- Expanded the colocated behavioral suite from 4 to 9 tests.
- No engine, shared catalog, or fixture infrastructure changes. No Digi-Egg appears in deck/security fixtures and no numeric security shortcut is used.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-024.test.ts --maxWorkers=1 --no-file-parallelism` — PASS, 1 file / 9 tests.
- `pnpm --filter @aegis/api typecheck` — PASS.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-024.ts apps/api/src/cards/EX1/EX1-024.test.ts` — PASS.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-024.ts apps/api/src/cards/EX1/EX1-024.test.ts docs/audits/EX1-reaudit/EX1-024.md` — PASS.
- `git diff --check` — PASS.

#### Rubric score

| Dimension | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates (worker scope) | 0/2 |
| **Total** | **8/10** |

Remaining limitation: the local knowledge base has no EX1-024-specific Q&A to verify beyond the catalog and general interpreter/rules behavior. Collection-wide delivery gates remain coordinator-owned.

### EX1-025 — Salamon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX1-025`.
- Local KB query: `node tools/kb/query.mjs card EX1-025` returned no card-specific Q&A.
- Printed inherited effect: `[When Attacking][Once Per Turn] If you have 3 or more security cards, ＜Draw 1＞.`
- Evolution catalog data: Yellow Lv.2, cost 0.

#### Clause-to-IR-to-test evidence

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Inherited When Attacking timing | `trigger: "WhenAttacking"`, `isInherited: true` | Public player attacks from an `EX1-028` host carrying `EX1-025`. |
| Controller has at least 3 security | `condition.kind: "securityAtLeast"`, `value: 3` | Exact-three security draws; two own security with four opposing security does not draw. |
| Draw 1 | `kind: "Draw"`, `controller: "mine"`, `amount: 1` | Deck and hand contents are asserted after the resolved attack. |
| Once Per Turn | `frequency: "OncePerTurn"` | A second same-turn public attack after `BT1-036` unsuspends the host produces no second resolution. |
| Turn duration/reset | Interpreter frequency state | A third attack on the next own turn resolves and draws again through the public turn loop. |
| Stack boundary | `isInherited: true` | Salamon as the top card does not activate its inherited effect. |
| Evolution boundaries | Catalog requirement enforced by engine | Yellow Digi-Egg → Salamon → Angemon preserves `[BT1-005, EX1-025]` and draws on attack; illegal red Lv.3 source is rejected without a stack change. |

#### Changes

- Removed `// @ts-nocheck` from `EX1-025.ts`.
- Kept executable registration exclusively through `registerIrCard("EX1-025", compiled)`.
- Expanded the focused suite from 2 to 6 tests.
- Replaced all invalid Digi-Egg deck/security fixtures with normal Digimon cards. `BT1-005` appears only as a legal evolution source in the battle-area stack fixture.
- No engine, shared catalog, or infrastructure changes.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-025.test.ts --maxWorkers=1 --no-file-parallelism` — PASS, 1 file / 6 tests.
- `pnpm --filter @aegis/api typecheck` — PASS.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-025.ts apps/api/src/cards/EX1/EX1-025.test.ts` — PASS.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-025.ts apps/api/src/cards/EX1/EX1-025.test.ts` — PASS.
- `git diff --check` — PASS.

#### Rubric score

| Dimension | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates (worker scope) | 0/2 |
| **Total** | **8/10** |

Remaining limitation: the local knowledge base has no EX1-025-specific Q&A. Collection-wide delivery gates remain coordinator-owned.

### EX1-026 — Gatomon

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX1-026`.
- Printed inherited effect: `[When Attacking] [Once Per Turn] If you have 3 or more security cards, 1 of your opponent's Digimon gets -2000 DP for the turn.`
- Local KB query: `node tools/kb/query.mjs card EX1-026` returned Q3210. Q3210 confirms that the 3-or-more-security condition is checked when the inherited effect activates; the -2000 DP remains through the end of the turn even if the controller later has 2 or fewer security cards.
- Evolution data: Yellow Lv.4, cost 2 from a Yellow Lv.3.

#### Clause-to-IR-to-test evidence

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Inherited `[When Attacking]` | `effects[0].trigger: "WhenAttacking"`, `isInherited: true` | Public `attack` intents resolve the effect only from a host with EX1-026 below its top card. |
| Once per turn | `frequency: "OncePerTurn"` | Two public attacks in one turn, with a public unsuspend between them, leave the target at -2000 only once. |
| Controller has 3 or more security | `condition: { kind: "securityAtLeast", value: 3 }` | Exact three-security positive case reduces the opponent target from 5000 to 3000; the two-security case leaves it at 5000. |
| One opponent Digimon only | `target.filter.controller: "opponent"`, `kind: ["Digimon"]`, `count: 1` | Mixed opposing Digimon targets prove one selected opponent Digimon changes while the other remains at 5000; own-controller targets are not eligible. |
| -2000 DP for the turn | `amount: -2000`, `duration: "forTheTurn"` | The threshold test observes the target's security fall from 3 to 2 during the same public attack while its Digimon remains at 3000 DP; the public turn-loop test then observes 5000 DP after the attacking player's turn ends. Q3210's persistence follows from the activation-time condition plus this turn-scoped modifier. |
| Evolution boundary | Catalog evolution requirements are enforced by the engine; no extra card behavior is encoded | Legal Yellow Lv.3 → EX1-026 → Yellow Lv.5 evolution preserves the source stack and resolves the inherited effect. A Red Lv.3 source is rejected without changing memory, hand, or stack. A top-card EX1-026 does not provide its own inherited effect. |

#### Changes

- Removed `// @ts-nocheck` from `EX1-026.ts`; executable behavior remains registered exclusively through `registerIrCard("EX1-026", compiled)`.
- Corrected all security/deck fixtures to use inert main-deck Digimon; no Digi-Egg is present in deck or security.
- Replaced the invalid mixed-color stack with legal Yellow evolution stacks and added public attack/evolution boundary proof.
- Expanded the focused suite from 4 to 7 tests.
- No engine, shared catalog, or fixture infrastructure changes.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-026.test.ts --maxWorkers=1 --no-file-parallelism` — PASS, 1 file / 7 tests.
- `pnpm --filter @aegis/api typecheck` — PASS.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-026.ts apps/api/src/cards/EX1/EX1-026.test.ts` — PASS.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-026.ts apps/api/src/cards/EX1/EX1-026.test.ts` — PASS.
- `git diff --check -- apps/api/src/cards/EX1/EX1-026.ts apps/api/src/cards/EX1/EX1-026.test.ts` — PASS.

#### Rubric score

| Dimension | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates (worker scope) | 0/2 |
| **Total** | **8/10** |

Remaining limitation: collection-wide delivery gates remain coordinator-owned. No card-specific ambiguity remains after applying Q3210's activation-time interpretation.

### EX1-027 — Leomon

#### Printed contract and sources

- Catalog (`packages/shared/src/cards/data/cards.json`): Yellow Digimon, level 4, 5000 DP, play cost 5, `[Digivolve] Yellow Lv.3: cost 2`, and `[Security] At the end of the battle, if you have 3 or fewer security cards, <Recovery +1 (Deck)>`.
- Q3211 (`node tools/kb/query.mjs card EX1-027`): when this card is checked while the owner has 4 security cards, the checked card has left the stack, so the count is 3 and Recovery +1 activates.
- Comprehensive Rules 13-1-6, 13-1-8-2, 13-1-8-3, 13-1-8-4, and 14-2-1 through 14-2-5: a checked card leaves security before its effect/battle, Security Digimon battle the attacker, battle deletion applies to the losing battle-area Digimon, Security Digimon are not deleted by battle, and end-of-battle effects resolve before the next action.

#### Clause-to-IR-to-test mapping

| Contract | IR / proof |
| --- | --- |
| `[Security]` timing and owner-scoped threshold | `trigger: "Security"`; `zoneCount` on `seat: "mine"`, `zone: "security"`, `op: "lte"`, `value: 3`; real attack checks in the first four tests. |
| Recovery +1 (Deck) | `SecurityManipulation` `op: "addTop"`, `source: "deck"`, `amount: 1`; tests assert the recovered instance is in the owner's security and exact final counts. |
| Q3211 checked-card count | `counts the checked card as removed... (Q3211)` starts at 4 and ends at exactly 4 after check plus recovery. |
| Security battle / survival | 6000-DP attacker beats 5000-DP Leomon and remains in battle area; Leomon is in the owner's trash. |
| Security battle / deletion | 4000-DP attacker loses to Leomon and is in the opponent's trash; Recovery still belongs to security owner seat 0. |
| Threshold negative | Five initial security cards become four after check with no recovery event. |
| Evolution boundaries | Yellow BT1-046 to EX1-027 succeeds for cost 2; red BT1-009 is rejected with `invalid-evolution`, unchanged stack, and unchanged memory. |

#### Fixes

- Removed `// @ts-nocheck` from the typed compiled module.
- Kept executable registration exclusively through `registerIrCard("EX1-027", compiled)`.
- Replaced all Digi-Egg BT1-001 fixtures in this card's tests with inert main-deck Digimon.
- Strengthened tests to settle the real security attack, assert exact post-check security counts, recovery controller, checked-card trash, attacker survival/deletion, and legal/illegal evolution routes.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-027.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-027.ts apps/api/src/cards/EX1/EX1-027.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-027.ts apps/api/src/cards/EX1/EX1-027.test.ts docs/audits/EX1-reaudit/EX1-027.md` — passed.
- `git diff --check` — passed.

#### Score

- Catalog/rules fidelity: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates (worker): 0/2
- Total: **8/10**

No unresolved card-specific behavior remains. Collection-wide delivery gates, commits, and branch push are coordinator-owned and intentionally receive zero in this worker report.

### EX1-028 — Angemon

#### Printed contract and knowledge-base evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

`[When Attacking][Once Per Turn] If you have 3 or more security cards, this
Digimon gets +1000 DP until the end of your opponent's next turn.` The effect is
inherited, so EX1-028 must be below the attacking Digimon's top card.

Local KB query: `Q3212`. It confirms that the security threshold is evaluated
when the inherited effect activates; dropping to 2 or fewer security afterward
does not remove the +1000 DP before the end of the opponent's next turn.

#### Implementation trace

`apps/api/src/cards/EX1/EX1-028.ts` now has no `@ts-nocheck` and registers only
through `registerIrCard("EX1-028", compiled)`. The compiled IR maps:

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| When Attacking | `trigger: "WhenAttacking"` | public player attacks in tests 1–4, 6–7 |
| Once Per Turn | `frequency: "OncePerTurn"` | test 4; second same-turn attack does not reapply; next own turn does |
| inherited | `isInherited: true` | tests 1, 3–7; legal stack and top-card negative |
| controller has ≥3 security | `securityAtLeast: 3` | tests 1–2; owner 2/opponent 4 negative |
| +1000 DP | `ModifyDP amount: 1000`, self target | tests 1, 3–5 |
| duration | `untilOpponentTurnEnd` | test 3 retains the bonus after Q3212 security loss, then clears after opponent turn |

#### Behavioral proof

`EX1-028.test.ts` has 7 tests and uses public `attack`, `digivolve`,
`playCard`, `endPhase`, and `surrender` intents with settled observable state.
Fixtures use inert main-deck Digimon (`BT1-009` through `BT1-014`) only; no
Digi-Egg appears in deck or security and no numeric security shortcut is used.

- Exact threshold: 3 security gives 7000 DP through a public player attack.
- Threshold/controller negative: owner at 2 security does not receive the
  bonus even while the opponent has 4 security.
- Q3212 and duration: after activation, an opponent's public attack reduces the
  controller from 3 to 2 security while the +1000 remains; it expires after the
  opponent turn ends.
- Once-per-turn/reset: a second same-turn attack after public unsuspension does
  not add a second modifier; the next own turn activates again.
- Evolution: yellow Lv.3 `BT1-046` → EX1-028 → yellow Lv.5 `BT1-060` is legal,
  preserves the inherited source, and grants +1000. Red `BT1-009` rejects the
  evolution and cannot gain the inherited bonus. EX1-028 as the top card is
  also a negative inherited-source boundary.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-028.test.ts --maxWorkers=1 --no-file-parallelism` — **passed, 7/7**.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-028.ts apps/api/src/cards/EX1/EX1-028.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-028.ts apps/api/src/cards/EX1/EX1-028.test.ts` — **passed**.
- `git diff --check -- apps/api/src/cards/EX1/EX1-028.ts apps/api/src/cards/EX1/EX1-028.test.ts` — **passed**.
- `pnpm --filter @aegis/api typecheck` — started but was interrupted after the
  focused checks exceeded the bounded worker window; coordinator should rerun
  the serialized API/root typecheck gate.

#### Score

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |

Remaining gate: serialized coordinator typecheck and collection delivery gates.

### EX1-029 — MagnaAngemon

#### Printed contract and sources

- Catalog: `packages/shared/src/cards/data/cards.json`, `EX1-029` is a yellow level-5 Ultimate, 7000 DP, with yellow level-4 / 3-memory evolution.
- Main effect: `[When Attacking] If you have 3 or more security cards, this Digimon gets +4000 DP until the end of your opponent's next turn.`
- Inherited effect: `[Your Turn][Once Per Turn] When a card is added to your security stack, gain 1 memory.`
- Local KB query: `Q3213` confirms that a public Recovery add still grants memory even when a security card was removed first and the net count is unchanged. `Q3214` confirms that the +4000 DP grant persists after the controller later falls to two or fewer security cards, through the end of the opponent's next turn.
- Applicable rules read: security additions are event-based and face-down Recovery remains a real addition; individual grants persist after their activation condition changes.

#### Implementation mapping

`apps/api/src/cards/EX1/EX1-029.ts` is typed compiled IR with no `@ts-nocheck` and only `registerIrCard("EX1-029", compiled)`.

- `WhenAttacking` → `ModifyDP +4000`, self-targeted, `securityAtLeast: 3`, `untilOpponentTurnEnd`.
- Inherited `YourTurn` + `OncePerTurn` → `SubTrigger whenAddSecurity`, gated to the controller's own security stack, then `GainMemory 1`.
- The public-add watcher is not a net-count test, so Q3213's remove/add net-zero line is represented by the actual T.K. effect and Recovery operation.

#### Behavioral evidence

`EX1-029.test.ts` contains 9 focused cases using public intents and `settle()`:

- +4000 DP at three security: pass.
- Q3213 public T.K. security replacement, net-zero stack count, and memory cost/result: pass.
- Below-three negative: pass.
- Q3214 persistence after security falls to two, through opponent turn, then expiry: pass.
- Same-turn inherited once-per-turn suppression across two public security replacements: pass.
- Opponent security addition does not grant this card's controller memory: pass.
- Legal yellow evolution stack preserves EX1-029 inherited source and Seraphimon Recovery path: pass.
- Illegal non-yellow evolution leaves stack and memory unchanged: pass.

The next-own-turn reset case is intentionally retained as a red assertion. After a legal turn transition, a real EX1-031 Recovery adds a security card, but the observable memory is `6` instead of the expected `7`; the focused run reports exactly one failure at `EX1-029.test.ts:232`. This is an unresolved engine/watch-registration seam, not an implementation weakening. No injected `advance.fire`, `fireSubTrigger`, or `fireTiming` is used as behavioral proof.

#### Commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-029.test.ts --maxWorkers=1 --no-file-parallelism`: **8 passed, 1 failed** (retained next-own-turn reset red; expected 7, received 6).
- `pnpm --filter @aegis/api typecheck`: passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-029.ts apps/api/src/cards/EX1/EX1-029.test.ts`: passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-029.ts apps/api/src/cards/EX1/EX1-029.test.ts`: passed after formatting.
- `git diff --check`: passed.

Fixtures use inert main-deck Digimon security/deck cards; no Digi-Eggs, numeric security shortcuts, duplicate legacy registration, or `@ts-nocheck` remain in the assigned module.

#### Rubric (delivery gates are worker-zero)

| Axis | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Catalog text, Q3213, Q3214, and applicable security/duration rules traced. |
| IR trace | 2/2 | Both printed clauses map to typed IR and IR-only registration. |
| Behavioral proof | 1/2 | 8/9 focused tests pass; next-own-turn once-per-turn reset remains a reproducible red. |
| Peer/stack proof | 2/2 | Legal yellow stack, inherited-source boundary, illegal non-yellow evolution, and top-card boundary are covered. |
| Delivery gates | 0/2 | Worker does not commit, push, or claim collection completion. |

**Total: 7/10.**

### EX1-030 — Angewomon

#### Printed contract and knowledge-base evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

Angewomon is a yellow level-5 Digimon (7000 DP, play cost 8) with a yellow
level-4 evolution cost 3. Its two clauses are:

- `[When Attacking] If you have 3 or more security cards, 1 of your
  opponent's Digimon and all of your opponent's Security Digimon get -3000 DP
  for the turn.`
- `[Your Turn][Once Per Turn]` inherited: when a card is added to your
  security stack, 1 of your opponent's Digimon gets -2000 DP for the turn.

Local KB query: `node tools/kb/query.mjs card EX1-030` returns Q3215 and Q3216.
Q3215 confirms that the -3000 DP remains applicable to Security Digimon flipped
later during the same turn. Q3216 confirms that the attack reduction persists
after activation even if the controller later falls to 2 or fewer security.
Comprehensive rules evidence is in `data/kb/rules/comprehensive.md` §§11-1,
13-1, 14-2, and 15-1-8: When Attacking resolves before the attack proceeds,
checked Digimon become Security Digimon, and effects may specifically affect
Security Digimon.

#### Implementation trace

`apps/api/src/cards/EX1/EX1-030.ts` has no `@ts-nocheck` and registers executable
behavior only through `registerIrCard("EX1-030", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| When Attacking, owner has at least 3 security | `trigger: "WhenAttacking"`; `condition: { kind: "securityAtLeast", value: 3 }` | tests 1–3, 5–6 |
| One opposing Digimon gets -3000 DP | opposing Digimon target with `count: 1`; `ModifyDP amount: -3000` | tests 1–3, 6 |
| All opposing Security Digimon get -3000 DP | `ModifySecurityDP controller: "opponent", amount: -3000` | tests 1 and 5–6; Q3215 |
| Reduction lasts for the turn | both attack actions use `duration: "forTheTurn"` | test 3; Q3216 test 6 |
| Inherited Your Turn Once Per Turn watcher | `trigger: "YourTurn"`, `isInherited: true`, `frequency: "OncePerTurn"`, `SubTrigger event: "whenAddSecurity"` | tests 4, 7–8 |
| One opposing Digimon gets -2000 DP | opposing Digimon target with `count: 1`; `ModifyDP amount: -2000`, `duration: "forTheTurn"` | tests 4, 7–8 |

#### Behavioral and stack proof

`EX1-030.test.ts` has 9 tests using public `attack`, `playCard`,
`digivolve`, public phase progression, and `surrender` intents with settled
observable state. Fixtures use inert main-deck Digimon (`BT1-009` through
`BT1-014`) and do not use Digi-Eggs or numeric security shortcuts.

- Exact attack path: with three controller security cards, exactly one
  opponent Digimon is reduced to 2000 DP; the other opponent Digimon and the
  controller's Digimon/security remain unchanged. Two security Digimon are
  covered by the Security DP modifier.
- Threshold negative: with only two controller security cards, neither the
  target Digimon nor opponent Security Digimon is reduced.
- Duration: the public attack reduction remains through the attacking turn and
  clears after the next player's turn ends.
- Inherited public trigger: Takeru's public Recovery adds a card to the
  controller's security and reduces exactly one opposing Digimon by 2000 DP;
  a second same-turn Recovery does not apply the effect again.
- Q3215: after Angewomon activates, a later public Security Attack +1 checks
  Security Digimon and the -3000 Security DP reduction remains in force.
- Q3216: after activation, a public attack removes the controller's security
  below three; the already-created -3000 modifier remains until the turn ends.
- Evolution stack: yellow EX1-028 → EX1-030 → EX1-031 is legal; EX1-030 is
  below the top card and its inherited effect responds to EX1-031's public
  Recovery. A red level-4 source rejects EX1-030 evolution without changing
  the source stack or memory.
- Next-own-turn reset: the inherited watcher applies once, clears at the real
  turn boundary, and applies again on the controller's next turn.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-030.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 9 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-030.ts apps/api/src/cards/EX1/EX1-030.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-030.ts apps/api/src/cards/EX1/EX1-030.test.ts docs/audits/EX1-reaudit/EX1-030.md` — passed after formatting.
- `git diff --check` — passed.

#### Score

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |

No unresolved card-specific behavior remains. Collection-wide delivery gates,
commits, and branch push are coordinator-owned and intentionally receive zero
in this worker report.

### EX1-031 — Seraphimon

#### Printed contract

- `[When Digivolving] ＜Recovery +1 (Deck)＞`: place exactly the top card of this Digimon's controller's deck on top of that controller's security stack.
- `[Opponent's Turn] While this Digimon is suspended, all of your Security Digimon get +5000 DP.`
- Catalog facts: yellow, Digimon, level 6, Mega, 12 play cost, 12000 DP, normal evolution from a yellow level 5 for cost 4; types Seraph and Three Great Angels.
- Local card query: no card-specific Q&A returned. No additional card-specific ruling was available in `KB-INDEX.md`.

#### Implementation trace

`apps/api/src/cards/EX1/EX1-031.ts` now has no `@ts-nocheck` and registers exactly one compiled IR card through `registerIrCard("EX1-031", compiled)`.

- `WhenDigivolving` → `SecurityManipulation(addTop, controller: mine, source: deck, amount: 1)`, which uses the engine's Recovery primitive and places the deck top at security top.
- `OpponentsTurn` → `ModifySecurityDP(controller: mine, amount: 5000, duration: permanent)` gated by `selfIsSuspended`. The continuous interpreter supplies the opponent-turn scope, recomputes the security-DP ledger, and re-evaluates the live suspended flag.
- No engine/shared/catalog changes were needed.

#### Behavioral proof

`EX1-031.test.ts` has five passing tests:

1. Legal yellow level-5 evolution from EX1-029: verifies the EX1-031 top card, source stack identity, cost (memory 5 → 2 after EX1-029's inherited Recovery watcher grants +1), exact recovered instance at security top, and final deck/hand zones. The focused test explicitly registers EX1-029 to prove this peer interaction.
2. Illegal boundary from EX1-028 (yellow level 4): verifies rejection, unchanged source/top/stack, unchanged hand, and no memory payment.
3. Real security battle: suspended Seraphimon is active during seat 1's turn; a 5000-DP attacker loses to the 3000-DP security Digimon plus 5000, is deleted, and the checked security Digimon is trashed by the real security flow.
4. Unsuspended negative: opponent-turn security-DP delta remains 0.
5. Controller and duration/turn boundaries: each controller's suspended Seraphimon affects only its own security; the delta is active only on the opponent's turn and follows the turn switch.

All fixtures use inert main-deck Digimon; no Digi-Egg appears in deck or security, and no numeric security shortcut is used.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-031.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 5/5 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-031.ts apps/api/src/cards/EX1/EX1-031.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-031.ts apps/api/src/cards/EX1/EX1-031.test.ts` — passed after formatting.
- `git diff --check` — passed.

#### Rubric

| Axis | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Both printed clauses and the catalog evolution boundary are identified; no card-specific Q&A exists. |
| IR fidelity | 2/2 | Typed compiled IR maps Recovery and live opponent-turn suspended security DP exactly; registration is IR-only. |
| Behavioral proof | 2/2 | Five focused tests cover positive, negative, controller, turn/duration, real security, zones, cost, and evolution boundaries. |
| Peer/stack proof | 2/2 | Legal EX1-029 stack and illegal EX1-028 source are exercised with post-evolution source identity. |
| Delivery gates | 0/2 | Worker lane does not commit, push, or claim collection-wide completion. |

Worker score: **8/10** (delivery gates intentionally 0).

#### Remaining ambiguity

No unresolved card-specific rules ambiguity was found. Collection-wide delivery gates remain coordinator-owned.

### EX1-032 — Magnadramon

#### Printed contract and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`, `EX1-032`.
Magnadramon is a yellow level-6 Mega Digimon (11,000 DP, play cost 12) that
normally evolves from a yellow level-5 Digimon for 3 memory. Its printed
clauses are:

- `[When Digivolving] You may trash the top card of your security stack to
  unsuspend this Digimon.`
- `[When Attacking][Once Per Turn] If you have 3 or fewer security cards,
  <Recovery +1 (Deck)>.` Recovery places the top card of the controller's deck
  on top of that controller's security stack.

The local query `node tools/kb/query.mjs card EX1-032` returns Q3217. Q3217
confirms that the optional When Digivolving effect may trash the top security
card even when the Digimon was already unsuspended before evolving.

#### Implementation trace

`apps/api/src/cards/EX1/EX1-032.ts` no longer uses `// @ts-nocheck` and registers
only `registerIrCard("EX1-032", compiled)`.

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Optional When Digivolving top-security trash | `trigger: "WhenDigivolving"`; optional `Unsuspend` with a top-security trash cost | Tests 1–2 prove Q3217 acceptance, exact top-card movement, unsuspend state, refusal, and unchanged security |
| Unsuspend this Digimon | `Unsuspend` self target | Test 1 starts unsuspended and observes it remains unsuspended after the accepted cost; test 2 starts suspended and observes refusal leaves it suspended |
| When Attacking security threshold | `trigger: "WhenAttacking"`; `zoneCount` security `lte: 3` | Tests 3–4 prove exact-three positive and four-security negative paths through real attacks |
| Recovery +1 from deck | `SecurityManipulation(op: "addTop", controller: "mine", source: "deck", amount: 1)` | Test 3 proves the exact recovered instance is security top and the deck remainder stays ordered |
| Once Per Turn | `frequency: "OncePerTurn"` | Test 5 refuses the second same-turn attack after a public unsuspend; test 6 proves the gate resets on the next own turn |

#### Behavioral and evolution proof

`EX1-032.test.ts` has seven passing tests using public `digivolve`, `attack`,
`playCard`, phase, and surrender intents with settled observable state.

1. Q3217 positive: legal yellow level-5 `EX1-029` → `EX1-032` evolution while
   unsuspended trashes exactly the named top security card, leaves the next
   security card in place, preserves source-stack identity, and pays 3 memory.
2. Optional refusal: declining the cost after a legal evolution leaves the
   evolved stack suspended, security order unchanged, and the top card out of
   trash.
3. Exact threshold and endpoint: a real player attack with three security
   cards recovers exactly the deck top to security top and leaves the deck
   remainder in order; the attacker is suspended and the opponent's real
   security check resolves.
4. Meaningful negative: with four security cards, the real attack resolves but
   no recovery occurs and the named deck card remains in the deck.
5. Same-turn refusal: two real attacks with a public Garurumon unsuspend
   between them produce only one recovery and remove two opponent security
   cards through the real attack flow.
6. Controller/turn boundary: both seats' Magnadramon recover their own
   controller's security during their own attacks. Public turn progression
   carries the resulting security state through the opponent turn, and the
   next own turn permits a fresh recovery.
7. Evolution boundary: yellow level-5 `EX1-029` is the legal source used by
   the Q3217 proof; yellow level-4 `EX1-028` is rejected with unchanged hand,
   stack, memory, security, and trash.

All deck and security fixtures use inert main-deck Digimon (`BT1-009` through
`BT1-014`); no Digi-Egg appears in deck or security, and no numeric security
shortcut is used.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-032.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 7 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-032.ts apps/api/src/cards/EX1/EX1-032.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-032.ts apps/api/src/cards/EX1/EX1-032.test.ts docs/audits/EX1-reaudit/EX1-032.md` — passed after formatting.
- `git diff --check` — passed.

#### Rubric

| Axis | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Both printed clauses, the yellow level-5 evolution boundary, and Q3217 are identified. |
| IR fidelity | 2/2 | Typed compiled IR maps optional top-security trash/unsuspend, thresholded Recovery +1, controller, deck-top order, and Once Per Turn; registration is IR-only. |
| Behavioral proof | 2/2 | Seven focused tests cover positive and refusal paths, exact endpoints, real attacks, security/deck state, controller/turn boundaries, and Once Per Turn reset. |
| Peer/stack proof | 2/2 | Legal EX1-029 evolution and illegal EX1-028 evolution are exercised with post-evolution stack and zone assertions. |
| Delivery gates | 0/2 | Worker lane does not commit, push, or claim collection-wide completion. |

Worker score: **8/10** (delivery gates intentionally 0).

#### Remaining ambiguity

No unresolved card-specific ambiguity remains. Collection-wide delivery gates
remain coordinator-owned.

### EX1-033 — Tentomon

#### Printed contract and knowledge-base evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

EX1-033 is a green level-3 Digimon with a green level-2 evolution cost of 0.
Its inherited clause is:

`[When Attacking] The next time one of your Digimon digivolves into a Digimon
card with [Insectoid] or [Ancient Insect] in its traits this turn, reduce the
memory cost of the digivolution by 1.`

Local KB query: `node tools/kb/query.mjs card EX1-033` returns Q3218–Q3222.
Q3218 establishes that the reduction applies to any of the controller's
Digimon, not only the host. Q3219 says that a non-matching digivolution does
not consume the pending reduction during the turn. Q3220 allows one reduction
per attack to accumulate and says the accumulated reductions reset after a
matching evolution. Q3221 excludes digivolutions in the breeding area. Q3222
clarifies that the destination card in hand must have the Insectoid or Ancient
Insect trait; a source Digimon's trait is not sufficient.

The applicable comprehensive-rules evidence is `data/kb/rules/comprehensive.md`
§§3-4-7 (breeding-area effects and trigger restrictions), 6-5-1-2-1 (standard
digivolution uses a Digimon card from hand), and 8-1-2-3/8-1-2-6/8-1-2-8
(stack/orientation, illegal or unpaid evolution rollback, and the mandatory
digivolution draw when a draw is possible).

#### Implementation trace

`apps/api/src/cards/EX1/EX1-033.ts` is typed and registers executable behavior
only through `registerIrCard("EX1-033", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| When Attacking inherited trigger | `trigger: "WhenAttacking"`, `isInherited: true` | tests 1–7 use public `attack` intents and settle the resulting state |
| One of your battle-area Digimon | `sourceFilter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" }` | test 1 attacks the host, then evolves a different own Digimon; test 5 rejects a red source without mutating it |
| Next matching hand digivolution only | `event: "wouldDigivolve"`, `consumeOnActivate: true`, and `into` trait predicate for `Insectoid`/`Ancient Insect` | tests 2–4 and 6 prove matching consumption, non-matching persistence, Ancient Insect matching, and multi-attack accumulation |
| Reduce memory by 1 | `mode: "reduceCost"`, `amount: 1` | exact memory assertions in tests 1–7 |
| No breeding-area reduction | source filter is limited to `zone: "battleArea"` | test 7 evolves a breeding-area Digimon for its full cost |

#### Behavioral and stack proof

`EX1-033.test.ts` has 7 tests using public `attack`, `digivolve`, and
`playCard` intents, with `settle()` and observable state assertions. All deck
and security fixtures use inert main-deck Digimon (`BT1-009`); there are no
Digi-Egg fixtures or numeric security shortcuts.

- Q3218 and standard legal route: the EX1-033 host attacks, a different green
  level-3 Digimon legally evolves into BT1-070, memory changes from 5 to 4,
  the top card is BT1-070, its below-top stack is exactly `[BT1-066]`, and the
  top deck card is drawn.
- Q3219: a legal non-Insectoid BT1-071 evolution spends its printed cost but
  leaves the pending reduction for the subsequent legal BT1-070 evolution.
- Q3220 and one-use consumption: two public attacks are enabled by BT1-036;
  the two reductions offset BT1-070's cost 2 completely. A separate test
  proves a single matching evolution consumes the armed reduction, so the next
  matching evolution pays its full cost.
- Ancient Insect: the public evolution into BT7-054 is reduced by 1, proving
  the second accepted trait branch.
- Q3222 boundary: the non-matching test starts from an Insectoid source but
  evolves into the non-Insectoid BT1-071, proving the destination trait—not
  the source trait—controls the reduction.
- Q3221: an armed reduction does not change the full EX1-035 evolution cost in
  the breeding area.
- Legal/illegal route proof: a red BT1-009 source cannot evolve into green
  BT1-070; the public intent returns `invalid-evolution`, memory stays at 5,
  the source stack and hand are unchanged, and no draw occurs.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-033.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 7 tests.
- `pnpm --filter @aegis/api typecheck` — coordinator-owned; not run in this resumed worker lane per resource policy.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-033.ts apps/api/src/cards/EX1/EX1-033.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-033.ts apps/api/src/cards/EX1/EX1-033.test.ts docs/audits/EX1-reaudit/EX1-033.md` — passed.
- `git diff --check` — passed.

#### Score

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |

No unresolved card-specific behavior remains. Collection-wide typecheck,
delivery gates, commits, and branch push are coordinator-owned and intentionally
receive zero in this worker report.

### EX1-034 — Palmon

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX1-034`). Palmon is a Green level 3 Digimon with a Green level 2 / 0 memory evolution requirement, and its complete text is:

> [On Deletion] Suspend 1 of your opponent's Digimon with 5000 DP or less.

The local card query returned no card-specific Q&A or additional ruling. The mandatory trigger has no optional choice, cost, duration, once-per-turn limit, inherited clause, or Security clause.

#### Clause mapping and proof

| Clause | IR / test evidence |
| --- | --- |
| On Deletion | `compiled.effects[0].trigger = "OnDeletion"`; the first test deletes Palmon through a real public attack and observes the resolved suspension. |
| 1 opposing Digimon | `controller: "opponent"`, `kind: ["Digimon"]`, `count: 1`; the positive case suspends the opponent's target while the own 5000-DP candidate remains unsuspended. |
| 5000 DP or less | `dp.op = "lte", value: 5000`; the positive case uses exactly 5000 DP and the second case proves 6000 DP is not selected. |
| Battle-area target boundary | The no-eligible-target case places a 5000-DP opposing Digimon in breeding; it remains unsuspended and no decision remains pending. |
| Legal evolution boundary | The fourth test publicly digivolves Palmon over a Green level 2 source in breeding, asserts the source stack, moves it publicly to the battle area, and deletes it through public `ST6-15`; the Palmon trigger suspends the opposing exact-5000 target. |
| Illegal evolution boundary | The fifth test rejects evolution over a non-Green level 3 source without changing source stack, hand, memory, or pending decisions. |

All deck and Security fixtures use inert main-deck Digimon or a Tamer; no Digi-Egg appears in deck or Security.

#### Implementation

Removed `// @ts-nocheck`. Behavior remains typed compiled IR and is registered exclusively through `registerIrCard("EX1-034", compiled)`; no legacy `registerCard` registration is present.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-034.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 5/5 tests.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-034.ts apps/api/src/cards/EX1/EX1-034.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-034.ts apps/api/src/cards/EX1/EX1-034.test.ts docs/audits/EX1-reaudit/EX1-034.md` — passed after formatting the test.
- `git diff --check` — passed.
- API/root typecheck — not run in this worker per coordinator RAM-serialization instruction.

#### Rubric

- Catalog/rules fidelity: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates (worker): 0/2

Worker score: **8/10**, pending coordinator collection/typecheck/delivery gates.

### EX1-035 — Kabuterimon

#### Printed contract and knowledge-base evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

EX1-035 is a green level-4 Champion Digimon (5,000 DP, play cost 4) with a
green level-3 evolution requirement costing 2 memory. Its only printed clause
is:

`[When Attacking] This Digimon can digivolve into a Digimon card with
[Insectoid] in its traits in your hand for its digivolution cost.`

The local query `node tools/kb/query.mjs card EX1-035` returns Q1594, Q3223,
Q3224, and Q3227:

- Q1594: a Digimon gained by this evolution does not get a new [When
  Attacking] trigger during the same attack.
- Q3223: a [When Digivolving] effect on the newly evolved card does not
  activate because its trigger window has passed.
- Q3224: the attack continues when paying the evolution cost moves memory to
  the opponent's side; the turn does not change until the attack ends.
- Q3227: a newly evolved card's [When Attacking] effect cannot trigger again
  during the current attack.

Applicable comprehensive rules are `data/kb/rules/comprehensive.md`
§§6-5-1-2-1 (digivolving from hand), 8-1-2-3 (orientation carries over),
8-1-2-6 (an illegal or unaffordable evolution returns without memory change),
8-1-2-8 (digivolution may proceed without a draw), 11-1-1 through 11-1-4
(attack sequence and resolving [When Attacking] before later attack timings),
and 15-16-5-1/15-16-3-1 ([When Attacking]/[When Digivolving] trigger windows).

#### Implementation trace

`apps/api/src/cards/EX1/EX1-035.ts` is typed, contains no `// @ts-nocheck`,
and registers executable behavior only through
`registerIrCard("EX1-035", compiled)`.

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Optional [When Attacking] effect | `trigger: "WhenAttacking"`; `optional: true` | Tests 1–2 use public `attack` intents and prove acceptance and refusal. |
| This Digimon only | Self target filter with `isSelfRef: true`, `isSelf: true` | All positive and negative routes attack the EX1-035 permanent. |
| Digimon card in your hand | `from: ["hand"]`; `into.kind: ["Digimon"]`; `controllerDefault: "mine"` | Positive hand evolution and unchanged hand on refusal/invalid routes. |
| `[Insectoid]` trait | `nameOrTrait: [{ tokens: ["Insectoid"], match: "trait" }]` | BT1-076/EX1-040 match; BT1-071 and BT7-054 are rejected for trait/level requirements. |
| For its digivolution cost | `payCost: true` | Positive route pays exactly 2 memory; crossing route ends at exactly −1. |

#### Behavioral, Q&A, and stack proof

`EX1-035.test.ts` has five passing tests using public attack intents, full
`settle()` resolution, and observable game state. Every security/deck fixture
uses inert main-deck Digimon (`BT1-009`); there are no Digi-Egg fixtures or
numeric security shortcuts.

1. The positive public attack evolves EX1-035 into the legal green level-5
   Insectoid BT1-076, pays exactly 2 memory (5 → 3), preserves the exact
   stack `["EX1-035"]` below the new top card, draws the exact top deck card,
   and empties the one-card deck.
2. Optional refusal through the public attack flow leaves EX1-035 on top,
   leaves the evolution in hand, and still resolves the attack suspension.
3. Q3224 is proven by starting at memory 1: the legal 2-memory evolution ends
   at exactly −1, the attack continues to one real security check, and the
   evolved stack remains on the field.
4. The mixed negative public attacks reject a non-Insectoid BT1-071 and a
   trait-matching-but-illegal level-6 BT7-054. Both remain in hand and the
   EX1-035 top card/stack are unchanged, proving both trait and normal
   evolution-requirement boundaries.
5. Q1594/Q3223/Q3227 are covered by evolving during the public attack into
   EX1-040 (new [When Attacking]) while BT16-045 (new [When Digivolving]) is
   also in hand. EX1-040 does not trigger again and BT16-045's effect does not
   activate; the former remains consumed and the latter remains in hand.

The legal route uses the real EX1-035 level-4 green source and BT1-076's
printed green level-4/2-memory requirement. The invalid routes use the same
public attack trigger but verify that nonmatching or impossible hand cards are
not offered/played and that no stack transition occurs.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-035.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-035.ts apps/api/src/cards/EX1/EX1-035.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-035.ts apps/api/src/cards/EX1/EX1-035.test.ts docs/audits/EX1-reaudit/EX1-035.md` — passed.
- `git diff --check` — passed.
- `pnpm --filter @aegis/api typecheck` / root `pnpm typecheck` — not run in
  this worker lane per the EX1 resource/RAM policy; coordinator-owned.

#### Score

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |

No unresolved card-specific behavior remains. Collection-wide typecheck,
delivery gates, commits, and branch push remain coordinator-owned.

### EX1-036 — Togemon

#### Printed contract and source evidence

- Catalog: `EX1-036` is a green level-4 Digimon (Vegetation), with green level-3 evolution cost 2.
- Inherited text: `[Your Turn][Once Per Turn] When one of your opponent's Digimon becomes suspended, this Digimon gets +2000 DP for the turn.`
- `node tools/kb/query.mjs card EX1-036`: no card-specific knowledge-base entries or Q&A returned.
- No card-specific ambiguity or errata was identified.

#### Clause-to-IR-to-test mapping

| Contract clause | IR proof | Behavioral proof |
| --- | --- | --- |
| Your Turn | `trigger: "YourTurn"`, `isInherited: true` | Public turn-loop tests confirm the effect resolves on player 0's turn and not on player 1's turn. |
| Once Per Turn | `frequency: "OncePerTurn"` | Two public opposing On Play suspensions in one turn produce one +2000 modifier; the next own turn accepts another trigger. |
| One of your opponent's Digimon becomes suspended | `SubTrigger event: "whenSuspended"` with `sourceFilter.controller: "opponent", kind: ["Digimon"]` | `BT1-070` On Play publicly suspends the selected opposing Digimon; own suspension and opponent-turn suspension are negative paths. |
| This Digimon gets +2000 DP | self-reference target and `amount: 2000` | Observable DP changes from 3000 to 5000 and from 7000 to 9000 after legal evolution. |
| For the turn | `duration: "forTheTurn"` | DP returns to base after the public turn transition. |

#### Evolution and stack proof

- Public legal route: `BT1-067` (green level 3) evolves into `EX1-036` for 2 memory, then into `EX1-039` (green level 5) for 3 memory. The resulting stack is `BT1-067`, `EX1-036` beneath `EX1-039`; a public opposing suspension resolves the inherited +2000 effect on the level-5 host.
- Public illegal route: a red `BT1-009` source rejects `EX1-036` with `invalid-evolution` without changing memory, hand, top card, or stack.
- All deck and security fixtures use inert main-deck Digimon; no Digi-Egg or numeric security shortcut is used.

#### Verification

- Focused test: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-036.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 4 tests.
- Oxlint: `pnpm exec oxlint apps/api/src/cards/EX1/EX1-036.ts apps/api/src/cards/EX1/EX1-036.test.ts` — passed.
- Oxfmt: `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-036.ts apps/api/src/cards/EX1/EX1-036.test.ts docs/audits/EX1-reaudit/EX1-036.md` — passed (2 supported source files checked; Markdown is ignored by the formatter).
- `git diff --check` — passed.
- Typecheck was intentionally not run per the lane's RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker lane; coordinator owns collection gates, commits, and push)
- Score: 8/10

#### Remaining gaps

No card-specific Q&A applies. No shared engine or catalog changes were required. Delivery remains coordinator-owned.

### EX1-037 — Kuwagamon

#### Printed contract and source evidence

- Catalog: `EX1-037` is a green level-4 Champion Digimon (5,000 DP, play cost 5,
  green level-3 evolution cost 2) with the Insectoid trait.
- Main text: `[Start of Your Turn] Suspend 1 of your opponent's Digimon with
  3000 DP or less.`
- Inherited text: `[Your Turn] When this Digimon deletes one of your opponent's
  Digimon in battle and survives, 1 of your opponent's suspended Digimon doesn't
  unsuspend during their next unsuspend phase.`
- `node tools/kb/query.mjs card EX1-037`: no card-specific knowledge-base
  entries or Q&A returned.
- Comprehensive rules evidence: `data/kb/rules/comprehensive.md` §§6-2-1
  and 15-16-11-1 place Start of Your Turn processing before the turn player's
  unsuspend phase; §§6-5-1-2-1, 8-1-2-3, and 8-1-2-6 govern hand evolution,
  stack/orientation, and invalid-evolution rollback; §§11-1-1 through 11-1-4
  govern the public attack sequence.
- No card-specific ambiguity or errata was identified.

#### Clause-to-IR-to-test mapping

| Contract clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Start of Your Turn | `trigger: "StartOfYourTurn"` | Public turn-loop test observes the effect before the first main phase. |
| Suspend 1 opponent's Digimon | `kind: "Suspend"`, `controller: "opponent"`, `kind: ["Digimon"]`, `count: 1` | Exact 3000-DP target suspends; a 4000-DP target and own cards do not. |
| 3000 DP or less | `dp: { op: "lte", value: 3000 }` | Boundary is exercised with 3000 and 4000 DP Digimon. |
| Your Turn inherited watcher | `trigger: "YourTurn"`, `isInherited: true`, `SubTrigger event: "whenDeletesInBattle"` | Real public attack tests show only the EX1-037-bearing host's own battle deletion can fire it. |
| Deletes an opponent's Digimon in battle and survives | `sourceFilter: { isSelfRef: true }` | Winning host remains in play and restricts a target; a different attacker and a losing host do not. |
| One suspended opposing Digimon doesn't unsuspend | `Restrict`, opposing suspended Digimon filter, `count: 1`, `restriction: "unsuspend"` | The selected target stays suspended through its next unsuspend phase. |
| During their next unsuspend phase | `duration: "untilOpponentTurnEnd"` | The target remains suspended on the first opponent turn, then unsuspends on the following opponent turn and the restriction is gone. |

#### Behavioral, controller, and evolution-stack proof

`EX1-037.test.ts` has five passing tests using public turn, attack, and
digivolution intents, `settle()`, and observable `GameState`. All deck and
security fixtures use inert main-deck Digimon (`BT1-009`/`BT1-012`); no
Digi-Egg or numeric security shortcut is used.

1. The start-turn case proves the exact 3000-DP boundary, opposing controller
   filter, and pre-main-phase timing.
2. A real battle by an EX1-040 host carrying EX1-037 deletes a suspended
   3000-DP opponent, leaves the host alive, and restricts exactly one other
   suspended opponent. The public loop proves the restriction blocks the
   target's next unsuspend phase and then expires on the next opponent turn.
3. A different attacker deleting the battle target does not fire EX1-037's
   inherited watcher, proving source identity; a host that loses in battle
   does not fire it, proving the survival condition.
4. A legal public stack evolves `BT1-068` (green level 3) into EX1-037 and then
   `EX1-040` (green level 5 host). The resulting stack is
   `BT1-068`, `EX1-037` beneath the host, and the inherited battle watcher
   resolves after the real deletion. The same public digivolve intent rejects
   EX1-037 from red `BT1-009` with `invalid-evolution`, preserving the source,
   hand, stack, and memory.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-037.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- `pnpm exec oxlint apps/api/src/cards/EX1/EX1-037.ts apps/api/src/cards/EX1/EX1-037.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-037.ts apps/api/src/cards/EX1/EX1-037.test.ts docs/audits/EX1-reaudit/EX1-037.md` — passed.
- `git diff --check` — passed.
- Typecheck was intentionally not run per the lane's RAM policy.

#### Rubric

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 (worker lane; coordinator owns collection gates, commits, and push) |
| **Total** | **8/10** |

No unresolved card-specific behavior remains. Collection-wide gates, delivery,
commit, and branch push remain coordinator-owned.

### EX1-038 — Stingmon

#### Printed contract and sources

- Catalog: `EX1-038 Stingmon` is Green, level 4, and evolves for 2 memory from a level-3 Green or Blue Digimon. Its main effect is `＜Piercing＞`; its inherited effect is `[Your Turn] While this Digimon has [Imperialdramon] in its name or [Free] in its traits, it gains ＜Piercing＞.`
- Local KB: `node tools/kb/query.mjs card EX1-038` returns `Q3225` (2024-03-28). Q3225 rules that once Piercing has activated for an attack, a Security [De-Digivolve] that removes the inherited source does not cancel the additional check; the attacker performs it if its Security Attack value still requires it.
- Rules/effect mapping: the compiled IR's `Static` keyword declares Stingmon's printed Piercing, and the inherited `YourTurn` Aura is gated by an `anyOf` of exact `Imperialdramon` name containment or `Free` trait matching.

#### Clause-to-proof map

| Clause | Proof | Observable endpoint |
| --- | --- | --- |
| Main Piercing | `performs a real Piercing security check...` | Opposing suspended Digimon is deleted in battle and one of two security cards is checked (`EX1-038.test.ts:15-34`). |
| Inherited Imperialdramon grant | `grants inherited Piercing to a legal Imperialdramon stack...` | Real attack deletes the opposing Digimon and checks security (`:36-55`). |
| Inherited Free/name boundaries | `grants inherited Piercing only...` | Free host and Imperialdramon-name host pass; non-Free, non-Imperialdramon Digitamamon host fails (`:57-71`). |
| Q3225: Piercing remains active after it triggers | `keeps checking after losing Piercing...` | Security Attack +1 causes two real checks; first De-Digivolve trashes the top Free host and the host loses inherited Piercing, but both checks complete (`:73-102`). |
| Q3225: no future check if Security Attack is also removed | `stops the next Piercing check...` | First real check's De-Digivolve trashes the top host, removing both its Free trait and Security Attack +1; only one `securityChecked` event remains (`:104-133`). |
| Your Turn and controller | `does not grant inherited Piercing outside your turn`; `limits...host controller's turn` | Owner's host has no grant during opponent turn; opponent host has no grant on player 0's turn and gains it when player 1's turn begins (`:135-178`). |
| Evolution requirement | parameterized blue/green legal evolution | Each route appends EX1-038, preserves the source, pays exactly 2 memory, and exposes Piercing (`:180-205`). |
| Illegal evolution boundary | `rejects evolution from an off-color...` | Red level-3 source returns `invalid-evolution` with unchanged hand, stack, and memory (`:207-227`). |

#### Verification

- Focused behavioral suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-038.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 10 tests.
- Lint: `pnpm exec oxlint apps/api/src/cards/EX1/EX1-038.ts apps/api/src/cards/EX1/EX1-038.test.ts` — passed.
- Format: `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-038.ts apps/api/src/cards/EX1/EX1-038.test.ts docs/audits/EX1-reaudit/EX1-038.md` — passed.
- Diff validation: `git diff --check` — run by coordinator after lane edits are collected.
- Typecheck was intentionally not run in this worker lane per the EX1 resource/RAM policy; it is a serialized coordinator gate.
- Structural sweep is clean: no `@ts-nocheck`, `registerCard`, injected timing calls, numeric security fixtures, or Digi-Egg (`BT1-001`) deck/security fixtures remain in the assigned files.

#### Rubric

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates (worker): 0/2

Score: **8/10** pending coordinator collection-wide gates, atomic commit, and branch delivery.

#### Remaining gaps

No card-specific behavioral gap remains in the assigned scope. Delivery and serialized typecheck are coordinator-owned gates. No engine or shared-file changes were needed.

### EX1-039 — Lillymon

#### Printed contract and sources

- Catalog: `EX1-039 Lillymon` is a green level-5 Ultimate Digimon (7,000 DP,
  play cost 6) with a green level-4 evolution requirement costing 3 memory.
- Inherited text: `[Your Turn][Once Per Turn] When one of your opponent's
  Digimon becomes suspended, this Digimon gains <Security Attack +1> for the
  turn.` The reminder text means one additional security card is checked.
- Local KB: `node tools/kb/query.mjs card EX1-039` returned no card-specific
  Q&A or rulings.
- Comprehensive rules evidence: §§15-16-8-1 and 15-16-9-1 define Your Turn
  versus All Turns timing; §16-4-1/§16-4-2 defines Security Attack as a
  persistent modification to the number of security checks; §§6-5-1-2-1,
  8-1-2-3, and 8-1-2-6 govern hand evolution, source-stack identity, and
  invalid-evolution rollback; §§11-1-2 through 11-1-4 require attacks to be
  made by the turn player and resolve their security sequence fully.

#### Clause-to-IR-to-test mapping

| Contract clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Your Turn inherited effect | `trigger: "YourTurn"`, `isInherited: true` | The public turn-loop tests grant only during the host controller's turn and reject an opponent-turn suspension (`EX1-039.test.ts:111-147`). |
| Opponent's Digimon becomes suspended | `SubTrigger event: "whenSuspended"` with `sourceFilter.controller: "opponent"` and `kind: ["Digimon"]` | Playing real BT1-070 Kuwagamon suspends an opposing Digimon and causes the grant (`:9-42`). |
| Once Per Turn | `frequency: "OncePerTurn"` | Two distinct public suspensions in one turn produce only one grant; after the public turn ends the grant expires, and it re-arms on the next own turn (`:44-109`). |
| Security Attack +1 for the turn | `GainKeyword` SecurityAttack amount 1, `duration: "forTheTurn"` | The host performs two real security checks against three inert main-deck Digimon security cards, leaving one card (`:9-42`). |
| Legal green level-4 evolution | Catalog evolution requirement; engine's public `digivolve` intent | BT1-070 (green level 4) evolves into EX1-039, costs exactly 3 memory, preserves the source beneath the top card, and removes the evo card from hand (`:149-190`). |
| Illegal off-color evolution | Engine evolution validation | EX1-039 from red BT1-009 returns `invalid-evolution` and preserves source, hand, stack, and memory (`:192-208`). |

#### Verification

- Focused behavioral suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-039.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests, including one expected `it.fails` retained red.
- Lint: `pnpm exec oxlint apps/api/src/cards/EX1/EX1-039.ts apps/api/src/cards/EX1/EX1-039.test.ts` — passed.
- Format: `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-039.ts apps/api/src/cards/EX1/EX1-039.test.ts docs/audits/EX1-reaudit/EX1-039.md` — passed.
- Diff validation: `git diff --check` — passed.
- Typecheck was intentionally not run in this worker lane per the EX1 RAM policy; it is coordinator-owned.
- Structural sweep: no `@ts-nocheck`, no `registerCard`, no injected timing calls, and no Digi-Egg or numeric-security fixtures remain in the assigned files. The module registers only through `registerIrCard`.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 1/2
- Delivery gates (worker): 0/2

Score: **7/10** pending resolution of the retained engine seam, coordinator collection-wide gates, atomic commit, and branch delivery.

#### Remaining limitation

The direct same-turn evolution case proves legality, cost, and source-stack
transition. The retained `it.fails` regression
`newly-evolved-inherited-watcher-registration` uses only public digivolve and
play intents and keeps the expected same-turn Security Attack +1 assertion
unweakened. The engine does not dynamically expose a newly evolved inherited
`YourTurn` watcher during that same turn. The inherited trigger and real
Security Attack behavior are independently proven from an initial legal stack
fixture, with controller, turn, duration, and OPT boundaries covered above.
No engine or shared-file changes were made.

### EX1-040 — MegaKabuterimon

#### Printed contract and sources

- Catalog: `EX1-040 MegaKabuterimon` is a green level-5 Digimon (7000 DP), evolving from a level-4 green Digimon for 3 memory. Its main effect is `[When Attacking] This Digimon can digivolve into a Digimon card with [Insectoid] or [Ancient Insect] in its traits in your hand for its digivolution cost.` Its inherited effect is `[Your Turn] When this Digimon deletes an opponent's Digimon in battle and survives, gain 1 memory.`
- Local KB: `node tools/kb/query.mjs card EX1-040` returns Q3226–Q3229 (2024-03-28). Q3226 keeps the attack alive across a cost that crosses memory; Q3227 says a newly gained `[When Attacking]` effect is too late to trigger; Q3228 confirms the effect is optional; Q3229 confirms printed evolution requirements still apply.
- The compiled IR uses an optional `WhenAttacking` `Digivolve` from hand, with exact `Insectoid`/`Ancient Insect` trait matching and `payCost: true`. The inherited `YourTurn` watcher subscribes to `whenDeletesInBattle` from the same host and gains one memory only after a real battle deletion/survival event.

#### Clause-to-proof map

| Clause | Proof | Observable endpoint |
| --- | --- | --- |
| Optional Insectoid evolution | `can digivolve into an Insectoid...` | Real attack moves BT1-083 from hand onto EX1-040 and checks security (`EX1-040.test.ts:6-27`). |
| Q3226 chronology and continuation | `Q3226: applies the crossing...` | Digivolution `memoryChanged` occurs before `securityRevealed`/`securityChecked`; attack completes one check with memory -2 (`:29-62`). |
| Ancient Insect branch | `can choose the Ancient Insect branch...` | Real attack evolves into BT7-054 and removes it from hand (`:64-84`). |
| Q3227 gained-effect timing | `Q3227: does not open...` | Public EX1-035 attack evolves to EX1-040, preserves exact source stack, draws one card, leaves BT1-083 in hand, and pays 3; no second evolution occurs (`:128-164`). |
| Q3228 optional refusal | `may decline...` | Public attack leaves EX1-040 top card and the legal evo card in hand (`:86-105`). |
| Q3229 requirements remain mandatory | `does not ignore evolution requirements...` | Trait-matching level-4 EX1-038 is not evolved, remains in hand, and EX1-040 remains top (`:107-126`). |
| Inherited battle-survival memory | `gains 1 memory...` | Real attack deletes suspended opposing Digimon, leaves host alive, and moves memory 5 → 6 (`:166-183`). |
| Survival boundary | `does not gain memory... loses...` | Real battle deletion of the EX1-040 host leaves attacker deleted and memory unchanged at 5 (`:185-201`). |

#### Verification

- Focused behavioral suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-040.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 8 tests.
- Lint: `pnpm exec oxlint apps/api/src/cards/EX1/EX1-040.ts apps/api/src/cards/EX1/EX1-040.test.ts` — passed.
- Format: `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-040.ts apps/api/src/cards/EX1/EX1-040.test.ts docs/audits/EX1-reaudit/EX1-040.md` — passed.
- Diff validation: `git diff --check -- apps/api/src/cards/EX1/EX1-040.ts apps/api/src/cards/EX1/EX1-040.test.ts docs/audits/EX1-reaudit/EX1-040.md` — passed.
- Typecheck was intentionally not run in this worker lane per the EX1 RAM policy; it is a serialized coordinator gate.
- Structural sweep is clean: no `@ts-nocheck`, legacy `registerCard`, injected timing calls, numeric security fixtures, or Digi-Egg (`BT1-001`) deck/security fixtures remain in the assigned files.

#### Rubric

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates (worker): 0/2

Score: **8/10** pending coordinator collection-wide gates, atomic commit, and branch delivery.

#### Remaining gaps

No card-specific behavioral gap remains in the assigned scope. Delivery and serialized typecheck are coordinator-owned gates. No engine or shared-file changes were needed.

### EX1-041 — Dinobeemon

Lane: card-only worker. Only `EX1-041.ts`, `EX1-041.test.ts`, and this report
were changed. The module registers compiled behavior exclusively with
`registerIrCard("EX1-041", compiled)`.

#### Printed contract and sources

Catalog (`packages/shared/src/cards/data/cards.json`): green level-5 Digimon,
7000 DP, play cost 8, with green Lv.4 or blue Lv.4 evolution for 3 memory.
Its attribute is Free and its type is Mutant. The main effect is:
`[When Digivolving] If a Digimon card with [Free] in its traits is in this
Digimon's digivolution cards, suspend 1 of your opponent's Digimon with 5000
DP or less.` Its inherited effect is:
`[Your Turn] When one of your Digimon with [Imperialdramon] in its name deletes
an opponent's Digimon in battle and survives, gain 1 memory.`

`node tools/kb/query.mjs card EX1-041` returned no card-specific Q&A entries.
No DNA requirement is present in the catalog.

#### Clause-to-test-to-IR mapping

| Clause | Behavioral proof | IR |
| --- | --- | --- |
| Lv.4 green/blue evolution for 3 | Parameterized public `digivolve` tests evolve from EX1-038 and EX1-014, assert memory 5 -> 2, bonus draw, and preserved source stack | Catalog evolution requirements; direct normal evolution engine path |
| Illegal evolution boundary | Red Lv.3 Monodramon is rejected with unchanged hand, stack, and memory | Catalog requirement enforcement |
| DNA boundary | Public `dnaDigivolve` using blue and green Lv.4 materials is rejected because EX1-041 has no DNA requirement | No `dnaRequirements` in catalog; engine intent rejection |
| When Digivolving Free gate | Real evolution over Free EX1-038 suspends exactly one opposing 5000-DP target; 5001-DP and own targets remain unsuspended | `selfDigivolutionStackHasTrait(Free)` + `Suspend` opponent Digimon `dp <= 5000`, count 1 |
| Missing Free gate | Real evolution over non-Free BT1-070 leaves the 5000-DP opposing target unsuspended | Same condition blocks the action |
| Inherited battle memory | Real attack by Imperialdramon: Dragon Mode over EX1-041 deletes a 3000-DP opposing Digimon, survives, and changes memory 5 -> 6 | Inherited `YourTurn` + `whenDeletesInBattle`, source controller mine, Digimon kind, name containing Imperialdramon + `GainMemory 1` |
| Name boundary | Paildramon over EX1-041 wins a real battle but gains no memory | `name` filter excludes non-Imperialdramon near-match |
| Controller/turn boundary and re-arm | A real opposing-turn deletion by an opponent attacker leaves memory unchanged; after the next own turn begins, the Imperialdramon host wins another real battle and gains 1 memory | `YourTurn` and `controller: "mine"` source filter |
| Survival boundary | Imperialdramon host losing a real battle gains no memory | `whenDeletesInBattle` event only resolves for the surviving winner |

The inherited text has no printed `[Once Per Turn]` limit; therefore there is
no OPT ledger to reset. The next-own-turn test proves the turn-scoped watcher
is active again after the turn boundary, while the positive and negative real
battles prove it is not an unconditional or opponent-turn trigger.

#### Verification

- Focused behavior: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-041.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 10 tests.
- Lint: `pnpm exec oxlint apps/api/src/cards/EX1/EX1-041.ts apps/api/src/cards/EX1/EX1-041.test.ts` — passed.
- Format: `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-041.ts apps/api/src/cards/EX1/EX1-041.test.ts` — passed.
- Diff validation: `git diff --check -- apps/api/src/cards/EX1/EX1-041.ts apps/api/src/cards/EX1/EX1-041.test.ts docs/audits/EX1-reaudit/EX1-041.md` — passed.
- Typecheck was intentionally not run in this worker lane per the EX1 RAM policy; it is a serialized coordinator gate.
- Structural sweep is clean: no `@ts-nocheck`, legacy `registerCard`, injected timing, numeric security fixtures, or Digi-Egg deck/security fixtures remain in the assigned files.

#### Rubric

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates (worker): 0/2

Score: **8/10** pending coordinator typecheck/collection gates, atomic commit,
and branch delivery.

#### Remaining gaps

No engine limitation or card-specific behavioral gap was encountered. The
module's only implementation correction was removal of `@ts-nocheck`; its
compiled IR already expressed the printed clauses faithfully.

### EX1-042 — Rosemon

#### Printed contract and sources

- Catalog source: `packages/shared/src/cards/data/cards.json`, `EX1-042 Rosemon` is a green
  level-6 Mega/Data/Fairy Digimon with 11 play cost, 11,000 DP, and a green level-5
  evolution requirement costing 3 memory.
- Printed effects: `[Your Turn] This Digimon gets +1000 DP for each of your opponent's
  suspended Digimon.` and `[When Attacking] Suspend 1 of your opponent's Digimon.`
- Local KB: `node tools/kb/query.mjs card EX1-042` returned no card-specific Q&A or rulings.
- Comprehensive rules evidence: §15-16-8-1 limits `[Your Turn]` effects to the controller's
  turn; §§6-5-1-2-1 and 8-1-2-3/8-1-2-6 cover hand evolution, stack identity, and invalid
  evolution rollback; §§11-1-2 and 11-1-4 require the public attack sequence and resolution
  of triggered `[When Attacking]` effects before the next attack timing.

#### Clause-to-IR-to-test mapping

| Contract clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Your Turn scaling | `trigger: "YourTurn"`; `ModifyDP` self target, `amount: 1000`, `duration: "permanent"`; scaling `per: 1`, `unit: "cards"` | `EX1-042.test.ts` proves two suspended opposing Digimon give +2000, while an own suspended Digimon, an unsuspended opposing Digimon, and a suspended opposing Tamer are excluded. |
| Opponent/controller and zero boundary | Scaling filter `controller: "opponent"`, `suspended: true`, `kind: ["Digimon"]` | The zero-count fixture leaves Rosemon at 11,000 DP; changing `turnSeat` to the opponent and recomputing removes the Your Turn bonus. |
| When Attacking suspension | `trigger: "WhenAttacking"`; `Suspend` target filter `controller: "opponent"`, `unsuspended: true`, `kind: ["Digimon"]`, `count: 1` | A public player attack suspends exactly one opposing unsuspended Digimon, leaves an already-suspended opponent and own Digimon untouched, and resolves against inert security cards. |
| EX1-039 inherited peer stack | EX1-042 has no inherited clause; the test imports EX1-039 and places it beneath Rosemon | The attack's Rosemon suspension activates EX1-039's inherited watcher, grants Security Attack +1, and performs two real security checks while preserving `stack: ["EX1-039"]`. |
| Normal evolution requirement | Catalog green Lv.5 → EX1-042 requirement; no duplicate legacy registration | Public digivolve from EX1-039 costs exactly 3 memory, moves EX1-042 from hand, and preserves EX1-039 beneath the new top card. A red Lv.5 source (`BT1-020`) is rejected with unchanged stack, hand, and memory. |

#### Verification

- Focused behavioral suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-042.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 6 tests.
- Lint: `pnpm exec oxlint apps/api/src/cards/EX1/EX1-042.ts apps/api/src/cards/EX1/EX1-042.test.ts` — passed.
- Format: `pnpm exec oxfmt --check apps/api/src/cards/EX1/EX1-042.ts apps/api/src/cards/EX1/EX1-042.test.ts docs/audits/EX1-reaudit/EX1-042.md` — passed.
- Diff validation: `git diff --check` — passed.
- Typecheck was intentionally not run in this worker lane per the explicit EX1 RAM policy.
- Structural sweep: no `@ts-nocheck`, no `registerCard`, no injected timing calls, and no Digi-Egg or numeric-security fixtures remain in the assigned files. The module registers only through `registerIrCard`.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates (worker): 0/2

Score: **8/10** pending collection-wide gates, atomic commit, and branch delivery.

No unresolved rules or engine ambiguity was identified for this card. No engine or shared-file
changes were made.

### EX1-043 — HerculesKabuterimon

#### Printed contract and sources

- Catalog source: `packages/shared/src/cards/data/cards.json`. EX1-043 is a green
  level-6 Mega/Vaccine/Insectoid Digimon with 12,000 DP and a green level-5
  evolution requirement costing 4 memory.
- Printed effects: `[Your Turn][Once Per Turn]` when one of your Digimon with
  [Insectoid] or [Ancient Insect] deletes an opponent's Digimon in battle and
  survives, you may unsuspend this Digimon; and, during your turn, +1000 DP for
  each [Insectoid] Digimon card in this stack's digivolution cards.
- Local KB: `node tools/kb/query.mjs card EX1-043` returns Q3230, confirming the
  deleting Digimon may be any of the controller's qualifying Digimon.
- Comprehensive rules evidence: §§6-5-1-2-1 and 8-1-2-3/8-1-2-6 cover legal
  hand evolution and stack identity; §§11-1-1 through 11-1-4 cover the public
  battle sequence and survival; §15-16-8-1 covers Your Turn effects.

#### Clause-to-IR-to-test mapping

| Contract clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Qualifying battle deletion and optional unsuspend | Your Turn `OncePerTurn` optional `SubTrigger` on `whenDeletesInBattle`; source filter is own Digimon with `Insectoid` or `Ancient Insect`; action unsuspends self | EX1-043.test.ts proves Insectoid and Ancient Insect attackers, non-Insectoid exclusion, real battle survival, and once-per-turn limiting. |
| DP scaling | Your Turn self `ModifyDP` +1000, `per: 1`, unit `digivolutionCards`, own Insectoid filter | Stack fixtures prove two qualifying sources give +2000 and a non-Insectoid source is excluded. |
| Next-turn reset | Engine frequency is `OncePerTurn` under the Your Turn trigger | Public turn-loop test proves a qualifying deletion in the next own turn can unsuspend again. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-043.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 7 tests.
- `pnpm exec oxlint` and `pnpm exec oxfmt --check` were run on the assigned files — passed.
- `git diff --check` — passed.
- Typecheck and collection-wide tests were intentionally not run in this worker lane per the EX1 RAM policy.
- Structural sweep: no `@ts-nocheck`, no `registerCard`, no injected timing calls, and no Digi-Egg or numeric-security fixtures remain. The module registers only through `registerIrCard`.

#### Rubric

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Total** | **8/10** |

No card-specific ambiguity or engine changes remain. Collection gates, commit, and push remain coordinator-owned.

### EX1-044 — Keramon

#### Printed contract and sources

- Catalog source: `packages/shared/src/cards/data/cards.json`. EX1-044 is a black
  level-3 Rookie/Unknown/Unidentified Digimon with 2,000 DP and a black level-2
  evolution requirement costing 0 memory.
- Printed inherited effect: during your turn, for each other Digimon you have in
  play with the same name as this Digimon, this Digimon gets +1000 DP.
- Local KB: `node tools/kb/query.mjs card EX1-044` returns Q3231, which clarifies
  that “this Digimon” means the host's current top-card name, not [Keramon].
- Comprehensive rules evidence: §§6-5-1-2-1 and 8-1-2-3/8-1-2-6 cover legal
  evolution and stack identity; §15-16-8-1 covers Your Turn inherited effects.

#### Clause-to-IR-to-test mapping

| Contract clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Your Turn inherited scaling | `trigger: "YourTurn"`, `isInherited: true`; self `ModifyDP` +1000 with one-card-per-match scaling | EX1-044.test.ts uses a legal EX1-044-under-Kurisarimon stack and observes the host DP. |
| Same live host name | Scaling filter uses `isSameName: true`, battle-area Digimon, own controller, and `excludeSelf` | The test counts two exact Kurisarimon peers while excluding the EX1-044 card's printed name, a near/other name, and an opponent. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-044.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 1 test.
- `pnpm exec oxlint` and `pnpm exec oxfmt --check` were run on the assigned files — passed.
- `git diff --check` — passed.
- Typecheck and collection-wide tests were intentionally not run in this worker lane per the EX1 RAM policy.
- Structural sweep: no `@ts-nocheck`, no `registerCard`, no injected timing calls, and no Digi-Egg or numeric-security fixtures remain. The module registers only through `registerIrCard`.

#### Rubric

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Total** | **8/10** |

Q3231's dynamic-name interpretation is implemented and proven. Collection gates, commit, and push remain coordinator-owned.

### EX1-045 — Hagurumon

#### Printed contract and sources

- Catalog source: `packages/shared/src/cards/data/cards.json`. EX1-045 is a black
  level-3 Rookie/Virus/Machine Digimon with 2,000 DP and a black level-2
  evolution requirement costing 0 memory.
- Printed effect: `[On Play] You may trash 1 Digimon card with [Machine] or
  [Cyborg] in its traits in your hand to Draw 2.`
- Local KB: `node tools/kb/query.mjs card EX1-045` returns no card-specific Q&A.
- Comprehensive rules evidence: §§6-5-1-2-1 and 8-1-2-3 govern play/stack state;
  §15-16-2 covers On Play timing and optional effects; §12-1-1 covers moving a
  card to the trash and resolving Draw 2.

#### Clause-to-IR-to-test mapping

| Contract clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| On Play optional effect | `trigger: "OnPlay"`, optional `Draw` action | EX1-045.test.ts proves acceptance and refusal. |
| Exact cost filter | `trash` cost targets one own-hand Digimon with [Machine] or [Cyborg] | Tests prove Machine and Cyborg acceptance and rejection of a non-matching Digimon. |
| Draw 2 | Draw action amount 2 after the trash cost | Positive tests verify the cost card reaches trash and hand/deck counts reflect exactly two draws. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-045.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 4 tests.
- `pnpm exec oxlint` and `pnpm exec oxfmt --check` were run on the assigned files — passed.
- `git diff --check` — passed.
- Typecheck and collection-wide tests were intentionally not run in this worker lane per the EX1 RAM policy.
- Structural sweep: no `@ts-nocheck`, no `registerCard`, no injected timing calls, and no Digi-Egg or numeric-security fixtures remain. The module registers only through `registerIrCard`.

#### Rubric

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Total** | **8/10** |

No card-specific ambiguity or engine changes remain. Collection gates, commit, and push remain coordinator-owned.

### EX1-046 — Kurisarimon

#### Printed contract and sources

- Catalog source: `packages/shared/src/cards/data/cards.json`. EX1-046 is a black
  level-4 Champion/Unknown/Unidentified Digimon with 5,000 DP and a black level-3
  evolution requirement costing 2 memory.
- Printed inherited effect: `[Your Turn][Once Per Turn]` when one of your other
  Digimon with the same name as this Digimon is deleted, unsuspend this Digimon.
- Local KB: `node tools/kb/query.mjs card EX1-046` returns Q3232, clarifying that
  “this Digimon” is the host's current top-card name, not [Kurisarimon].
- Comprehensive rules evidence: §§6-5-1-2-1 and 8-1-2-3/8-1-2-6 cover legal
  evolution and stack identity; §§10-1-1 and 15-16-8-1 cover deletion and Your
  Turn inherited timing.

#### Clause-to-IR-to-test mapping

| Contract clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Your Turn inherited watcher | `trigger: "YourTurn"`, `isInherited: true`, `frequency: "OncePerTurn"`, `SubTrigger` on `onDeletionOf` | EX1-046.test.ts uses real public attacks and deletion resolution. |
| Own other Digimon with live same name | Source filter is own Digimon, `excludeSelf: true`, `isSameName: true` against the host top card | Tests prove own same-name deletion, different-name exclusion, opposing same-name exclusion, and correct Infermon host-name interpretation. |
| Unsuspend and once-per-turn reset | Self Unsuspend action with once-per-turn frequency | Tests prove a second same-turn deletion is ignored and a qualifying deletion after the next own turn works again. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-046.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- `pnpm exec oxlint` and `pnpm exec oxfmt --check` were run on the assigned files — passed.
- `git diff --check` — passed.
- Typecheck and collection-wide tests were intentionally not run in this worker lane per the EX1 RAM policy.
- Structural sweep: no `@ts-nocheck`, no `registerCard`, no injected timing calls, and no Digi-Egg or numeric-security fixtures remain. The module registers only through `registerIrCard`.

#### Rubric

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Total** | **8/10** |

Q3232's dynamic-name interpretation is implemented and proven. Collection gates, commit, and push remain coordinator-owned.

### EX1-047 — Guardromon

#### Printed contract and sources

- Catalog source: `packages/shared/src/cards/data/cards.json`. EX1-047 is a black
  level-4 Champion/Virus/Machine Digimon with 6,000 DP and a black level-3
  evolution requirement costing 2 memory.
- Printed effects: [Blocker]; `[Your Turn] This Digimon can't attack`; and the
  inherited `[When Attacking]` optional cost to trash one hand Digimon with
  [Machine] or [Cyborg] and Draw 2.
- Local KB: `node tools/kb/query.mjs card EX1-047` returns no card-specific Q&A.
- Comprehensive rules evidence: §§11-1-1 through 11-1-4 cover attack and blocker
  windows; §15-16-8-1 covers Your Turn restrictions; §§6-5-1-2-1 and 8-1-2-3
  cover legal evolution and inherited stack identity.

#### Clause-to-IR-to-test mapping

| Contract clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Blocker keyword | Static keyword `Blocker` | Test observes the public keyword and resolves a real opponent Blocker response. |
| Can't attack on Your Turn | Your Turn self `Restrict` with `restriction: "attack"`, permanent duration | Test rejects a direct attack during the controller's turn. |
| Inherited optional trash-to-draw | When Attacking inherited optional Draw 2 with one-hand-card trash cost filtered to Machine/Cyborg Digimon | Tests prove Machine and Cyborg costs, refusal, non-matching rejection, and draw/trash outcomes through a real attack. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-047.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- `pnpm exec oxlint` and `pnpm exec oxfmt --check` were run on the assigned files — passed.
- `git diff --check` — passed.
- Typecheck and collection-wide tests were intentionally not run in this worker lane per the EX1 RAM policy.
- Structural sweep: no `@ts-nocheck`, no `registerCard`, no injected timing calls, and no Digi-Egg or numeric-security fixtures remain. The module registers only through `registerIrCard`.

#### Rubric

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Total** | **8/10** |

No card-specific ambiguity or engine changes remain. Collection gates, commit, and push remain coordinator-owned.

### EX1-048 — Andromon

#### Printed contract and sources

- Catalog source: `packages/shared/src/cards/data/cards.json`. EX1-048 is a black
  level-5 Ultimate/Vaccine/Cyborg Digimon with 7,000 DP and a black level-4
  evolution requirement costing 3 memory.
- Printed effects: `[When Digivolving] You may reveal the top 3 cards, add one
  level-6 Digimon with [Machine] in its traits to hand, and trash the remaining
  cards`; and inherited `[Opponent's Turn]`, while this Digimon has [Machine],
  it gains [Blocker].
- Local KB: `node tools/kb/query.mjs card EX1-048` returns Q3233, confirming the
  reveal is optional but add/trash resolution is mandatory after revealing.
- Comprehensive rules evidence: §§6-5-1-2-1 and 8-1-2-3/8-1-2-6 cover public
  evolution and stack state; §15-16-8-1 covers inherited opponent-turn effects;
  §§12-1-1 and 15-16-2 cover reveal, trash, and optional resolution.

#### Clause-to-IR-to-test mapping

| Contract clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Optional reveal top 3 | `WhenDigivolving` optional `RevealAdd`, `revealCount: 3` | Tests prove refusal leaves the deck untouched and acceptance resolves. |
| Add one level-6 Machine | Add filter is own Digimon, level 6, Machine trait, count 1, to hand | Positive test adds BT11-072; no-match test trashes all three. |
| Trash remaining revealed cards | `rest: "trash"` | Positive and no-match tests assert exact trash outcomes. |
| Inherited conditional Blocker | Opponent's Turn inherited Aura grants Blocker while `selfHasTrait` Machine | Public turn-loop tests prove a Machine host gains Blocker and a non-Machine host does not. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-048.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- `pnpm exec oxlint` and `pnpm exec oxfmt --check` were run on the assigned files — passed.
- `git diff --check` — passed.
- Typecheck and collection-wide tests were intentionally not run in this worker lane per the EX1 RAM policy.
- Structural sweep: no `@ts-nocheck`, no `registerCard`, no injected timing calls, and no Digi-Egg or numeric-security fixtures remain. The module registers only through `registerIrCard`.

#### Rubric

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Total** | **8/10** |

Q3233's optionality and post-reveal obligation are implemented and proven. Collection gates, commit, and push remain coordinator-owned.

### EX1-049 — MetalTyrannomon

#### Printed contract and sources

- Catalog source: `packages/shared/src/cards/data/cards.json`. EX1-049 is a black
  level-5 Ultimate/Virus/Cyborg Digimon with 7,000 DP and a black level-4
  evolution requirement costing 3 memory.
- Printed effects: `[When Digivolving] You may reveal the top 3 cards, add one
  level-6 Digimon with [Machine] in its traits to hand, and trash the remaining
  cards`; and inherited `[Opponent's Turn]`, while this Digimon has [Machine],
  it gains [Reboot].
- Local KB: `node tools/kb/query.mjs card EX1-049` returns Q3234, confirming the
  reveal is optional but add/trash resolution is mandatory after revealing.
- Comprehensive rules evidence: §§6-5-1-2-1 and 8-1-2-3/8-1-2-6 cover public
  evolution and stack state; §15-16-8-1 covers inherited opponent-turn effects;
  §§12-1-1 and 15-16-2 cover reveal, trash, and optional resolution.

#### Clause-to-IR-to-test mapping

| Contract clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Optional reveal top 3 | `WhenDigivolving` optional `RevealAdd`, `revealCount: 3` | Tests prove refusal leaves the deck untouched and acceptance resolves. |
| Add one level-6 Machine | Add filter is own Digimon, level 6, Machine trait, count 1, to hand | Positive test adds BT11-072; no-match test trashes all three. |
| Trash remaining revealed cards | `rest: "trash"` | Positive and no-match tests assert exact trash outcomes. |
| Inherited conditional Reboot | Opponent's Turn inherited Aura grants Reboot while `selfHasTrait` Machine | Public turn-loop tests prove a Machine host gains Reboot/unsuspends and a non-Machine host does not. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-049.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- `pnpm exec oxlint` and `pnpm exec oxfmt --check` were run on the assigned files — passed.
- `git diff --check` — passed.
- Typecheck and collection-wide tests were intentionally not run in this worker lane per the EX1 RAM policy.
- Structural sweep: no `@ts-nocheck`, no `registerCard`, no injected timing calls, and no Digi-Egg or numeric-security fixtures remain. The module registers only through `registerIrCard`.

#### Rubric

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Total** | **8/10** |

Q3234's optionality and post-reveal obligation are implemented and proven. Collection gates, commit, and push remain coordinator-owned.

### EX1-050 — MetalMamemon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-050 as a black level-5 Ultimate/Cyborg Digimon. Its `[When Digivolving]` effect may reveal the top 3 cards, adds up to one level-6 Digimon with `[Machine]` in its traits to hand, and trashes the remainder. Its inherited `[When Attacking]` effect deletes one opposing Digimon with play cost 5 or less when the host has `[Machine]` in its traits. The local KB query returns Q3235: declining the optional effect is legal, but after revealing the remaining instructions must be followed as far as possible.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Optional reveal top 3 | `WhenDigivolving` + `RevealAdd`, `revealCount: 3`, `optional: true` | Positive evolution adds the matching level-6 Machine and trashes the other two; refusal leaves no reveal/trash side effect. |
| Matching and short-deck boundaries | `kind: ["Digimon"]`, `levels: [6]`, trait `Machine`, remainder `trash` | No-match and fewer-than-three-deck tests trash only revealed non-matches and empty the short deck correctly. |
| Inherited Machine attack deletion | Inherited `WhenAttacking` + `Delete`, opponent Digimon, `playCostLte: 5`, gated by `selfHasTrait(Machine)` | A real player attack deletes the cost-5 target and leaves the cost-6 target in play. |
| Evolution stack | Catalog black Lv.4 → level-5 requirement; public `digivolve` intent | The focused evolution fixtures move EX1-050 from hand onto the host and resolve the inherited effect from a realistic stack. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-050.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-050", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-051 — Infermon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-051 as a black level-5 Ultimate/Unidentified Digimon. Its `[Opponent's Turn][Once Per Turn]` effect gains 1 memory when an opponent's Digimon digivolves into level 5 or higher. Its inherited `[All Turns]` effect gives all of your other Digimon with the same name as the host Digimon +2000 DP. Local KB evidence is Q3236 (breeding-area digivolutions do not trigger), Q3237 (same name means the host's current name, not Infermon), and Q3238 (a source deleted by the opponent's digivolution effect cannot activate afterward).

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Opponent-turn level-5+ watcher | `OpponentsTurn` + `SubTrigger(whenOneOfYoursDigivolves)` with opponent controller, level `gte 5`, and `zone: battleArea` | A real opponent-turn level-5 digivolution gains one memory; a second same-turn digivolution is suppressed by `frequency: OncePerTurn`. |
| Turn, zone, and source-lifetime boundaries | `frequency: OncePerTurn` and battle-area source filter | Breeding-area and own-turn digivolutions do not gain memory; Q3238 fixture confirms deletion of Infermon during the digivolution prevents the gain. |
| Host-name inherited buff | Inherited `AllTurns` `ModifyDP`, `excludeSelf: true`, `isSameName: true`, count all | A host stack whose top card is BT11-072 buffs another BT11-072 but not Infermon itself or a different-name Digimon. |
| Evolution stack | Catalog black Lv.4 → level-5 requirement; public digivolution fixtures preserve source stack and host identity | Same-name assertion uses the actual top card of the stack, proving Q3237's host-name interpretation. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-051.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-051", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-052 — Etemon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-052 as a black level-5 Ultimate/Puppet Digimon. On your turn, when this Digimon digivolves into a Digimon card with `[Etemon]` in its name in your hand, the digivolution cost is reduced by 1. Its inherited effect grants `<Jamming>` on your turn while the host has `[Etemon]` in its name. Local KB Q3239 confirms the cost reduction does not apply to digivolutions in the breeding area.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Your-turn Etemon evolution discount | `YourTurn` `CostModifier`, `costType: "digivolve"`, amount 1, self target, `into` hand Digimon whose name contains Etemon | A real EX1-052 → EX1-053 evolution pays 2 instead of 3; a non-Etemon target pays the full cost. |
| Controller/zone boundary | Your-turn trigger and self target | A breeding-area Etemon receives no discount, and an opponent-turn matching evolution receives no discount, matching Q3239. |
| Inherited Jamming | Inherited `YourTurn` `GainKeyword(Jamming)` gated by `selfHasNameContaining(Etemon)` | Etemon-named host gains Jamming, a non-Etemon host does not, and the keyword expires when the opponent's turn begins. |
| Evolution stack | Public stack fixtures place EX1-052 beneath both matching and nonmatching hosts | Assertions observe the resulting host name and inherited keyword from the physical stack. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-052.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 7 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-052", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-053 — MetalEtemon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-053 as a black level-6 Mega/Cyborg Digimon. The erratum recorded in the local KB changes its scaling clause to `[Opponent's Turn]`: for each Digimon card with `[Etemon]` in its name in your trash, it gets +1000 DP. Its `[On Deletion]` effect is `<De-Digivolve 1>` on one opponent's Digimon. The local query exposes the 2021-12-10 erratum and its corrected text.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Errata-corrected opponent-turn scaling | `OpponentsTurn` `ModifyDP` self target, +1000, scaling one per trash Digimon with name containing Etemon | Three trash cards including two Etemon-named Digimon produce +2000 on the opponent's turn; own-turn/no-trash baseline remains unchanged. |
| On Deletion | `OnDeletion` + `DeDigivolve`, opponent Digimon, amount 1 | A real battle deletes MetalEtemon and de-digivolves the opposing stacked Digimon by one, moving the top card to trash and exposing its source. |
| De-Digivolve boundary | Target is opponent Digimon and amount exactly 1 | The resulting source stack is empty after one source card is trashed; no extra card is removed. |
| Evolution stack | Public battle fixture uses a stacked EX1-053 target and real combat deletion | The deletion trigger is proven from a physical stack, not an injected timing event. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-053.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 3 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-053", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains; the erratum is reflected in the module's opponent-turn trigger.

### EX1-054 — Boltmon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-054 as a black level-6 Mega/Cyborg Digimon. It has `<Reboot>` and `[When Digivolving] <De-Digivolve 1> 1 of your opponent's Digimon`. The local KB query returns no card-specific Q&A or erratum.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Reboot | Static keyword `Reboot` | A suspended Boltmon exposes Reboot without an immediate same-turn unsuspend; the public opponent active phase unsuspends it. |
| When Digivolving de-digivolve 1 | `WhenDigivolving` + `DeDigivolve`, opponent Digimon, amount 1 | Real evolution triggers against a stacked opponent and trashes its top source card. |
| No-source boundary | Same target and amount with engine no-op when stack has no source | A target with no digivolution cards stays in play and unchanged. |
| Evolution stack | Public EX1-050 → EX1-054 evolution and stacked target | Assertions verify the source card is exposed after exactly one de-digivolution. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-054.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 4 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-054", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-055 — Tapirmon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-055 as a purple level-3 Rookie/Holy Beast Digimon. Its inherited clause is `[Your Turn][Once Per Turn] When one of your other Digimon is deleted, draw 1`. Local KB Q3240 clarifies that simultaneous deletion of two Digimon still permits only one draw for the turn.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Your-turn inherited watcher | Inherited `YourTurn` + `SubTrigger(onDeletionOf)` | A real battle deletion of another own Digimon draws one card; a deletion during the opponent's turn draws none. |
| Other Digimon only | Source filter `controller: mine`, `excludeSelf: true`, kind Digimon | A host carrying Tapirmon is deleted without drawing, while a separate ally deletion draws. |
| Once per turn and simultaneous deletion | `frequency: OncePerTurn`, shared inherited watcher | Simultaneous rule deletions and two separate same-turn battle deletions each produce exactly one draw. |
| Evolution stack | Tapirmon is placed beneath an EX1-058 host in every positive fixture | The inherited effect is observed from a realistic stack and does not incorrectly activate when its host leaves. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-055.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-055", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-056 — DemiDevimon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-056 as a purple level-3 Rookie/Evil Digimon. It has `<Retaliation>`. On your turn, while you do not have a Digimon with `[Myotismon]` in its name in play, it cannot attack an opponent's Digimon. Local KB Q3241 confirms it may still attack the opponent directly; Q3242 confirms that if a direct attack is blocked, the normal battle occurs.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Retaliation | Static keyword `Retaliation` | The focused suite observes the keyword and resolves a real blocked attack where both Digimon are deleted. |
| Your-turn Digimon-target restriction | `YourTurn` self `Aura` restriction `cantAttackDigimon` | Without Myotismon, a Digimon target is rejected while a player target is legal. |
| Myotismon name/zone boundary | Aura `while: youHaveNone` over own battle-area Digimon whose name contains Myotismon | A battle-area Myotismon permits the attack; a breeding-area Myotismon does not. |
| Turn duration and Q3242 | `YourTurn` trigger and public blocker flow | The restriction expires in the opponent's turn; a direct attack can be blocked and resolves Retaliation normally. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-056.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-056", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-057 — Wizardmon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-057 as a purple level-4 Champion/Wizard Digimon with `<Retaliation>`. Its inherited `[Your Turn]` effect gives all of your Digimon with `<Retaliation>` `<Rush>`. The local KB query returns no card-specific Q&A or errata.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Retaliation keyword | Static `keywords: [Retaliation]` | The focused suite observes the keyword on Wizardmon. |
| Your-turn inherited Rush grant | Inherited `YourTurn` `GainKeyword(Rush)` to all mine Digimon with `keywords: [Retaliation]` | A Retaliation recipient gains Rush, while a non-Retaliation Digimon and an opponent's Retaliation Digimon do not. |
| Turn boundary | Inherited `YourTurn` trigger | The grant is present on the controller's turn and absent after the opponent's turn begins. |
| Real play/evolution-stack interaction | Public `playCard` fixture with a host carrying EX1-057 | A newly played Retaliation Digimon receives Rush and can declare a real attack. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-057.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 4 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-057", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-058 — Devimon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-058 as a purple level-4 Champion/Fallen Angel Digimon. Its inherited `[On Deletion]` effect returns one purple level-4-or-lower Digimon card from your trash to your hand. Local KB Q3243 confirms Devimon itself may be returned; Q3244 confirms that once the effect activates, returning an eligible card is mandatory.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Inherited On Deletion | Inherited `OnDeletion` `Return` to hand | A real host deletion returns the inherited Devimon to hand. |
| Exact zone/controller/color/level filter | Target filter `zone: trash`, `controller: mine`, `kind: Digimon`, `colors: [Purple]`, level `lte 4` | Purple level-4 and lower cards are eligible; a non-purple/nonmatching card and cards in hand/deck are ignored. |
| Mandatory return | No optional marker on the effect | With an eligible candidate the effect resolves a return; with none, no pending decision opens. |
| Evolution stack and self-return ruling | Public deletion of a host carrying EX1-058 | The source card transitions from the deleted stack to trash and then to hand, proving Q3243. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-058.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 4 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-058", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-059 — Ogremon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-059 as a purple level-4 Champion/Demon Digimon. Its `[When Attacking]` effect may trash one card from hand to gain `<Security Attack +1>` for the turn; its inherited `[When Attacking]` effect may trash one card from hand to gain +2000 DP for the turn. The local KB query returns no card-specific Q&A or errata.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Main attack cost/effect | `WhenAttacking` `GainKeyword(SecurityAttack, +1)` with optional hand-trash cost and `forTheTurn` duration | A real player attack trashes exactly one card, checks the extra security, then loses the keyword at the turn boundary. |
| Inherited attack cost/effect | Inherited `WhenAttacking` `ModifyDP +2000` with the same optional hand-trash cost and turn duration | A stacked host reaches 9000 DP for the attack and returns to 7000 afterward. |
| Optional refusal and costs | Both actions carry optional hand-trash costs | Declining either prompt leaves hand/trash and the corresponding combat result unchanged. |
| Multiple attackers | Separate attack windows/effect sources | Two legal attackers resolve their own optional prompts independently in one turn. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-059.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-059", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-060 — LadyDevimon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-060 as a purple level-5 Ultimate/Fallen Angel Digimon. Its `[When Digivolving]` effect may trash the top 3 cards of your deck. Its inherited `[Your Turn][Once Per Turn]` effect gains 1 memory when you play a Digimon from your trash. Local KB Q3245 confirms the top-3 effect may be declined.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Optional top-three trash | `WhenDigivolving` `TrashTopDeck`, amount 3, optional | Positive evolution trashes three cards; refusal leaves the post-digivolution deck cards intact. |
| Inherited trash-play watcher | Inherited `YourTurn` + `SubTrigger(whenPlayed)` with source filter `zone: trash`, mine, Digimon; `GainMemory 1` | Playing a Digimon from trash through a real option gains one memory. |
| Once per turn | `frequency: OncePerTurn` | Two separate trash plays in one turn only refund the first; the fixture crosses a public turn boundary. |
| Evolution stack | EX1-060 is placed beneath an EX1-063 host in the inherited tests | The watcher is observed from a physical evolution stack while the played trash Digimon enters suspended. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-060.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 3 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-060", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-061 — Myotismon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-061 as a purple level-5 Ultimate/Undead Digimon. On your turn, when this Digimon digivolves into a Digimon card with `[Myotismon]` in its name in hand, reduce that digivolution by 1 memory. Its inherited `[Your Turn]` effect lets all of your Digimon with `<Retaliation>` attack an opponent's unsuspended level-4-or-lower Digimon while the host has `[Myotismon]` in its name. Local KB Q3246 confirms the evolution reduction does not apply in the breeding area.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Your-turn Myotismon evolution discount | `YourTurn` `CostModifier` for digivolve, amount 1, self target, hand name filter `Myotismon` | A real matching evolution pays 2 instead of 3; a hand-only source and a nonmatching target receive no discount. |
| Breeding-area boundary | Your-turn field effect with battle-area self relevance | A matching breeding-area evolution pays the full 4-memory cost, matching Q3246. |
| Inherited Retaliation attack permission | Inherited `YourTurn` `GrantCanAttackUnsuspended`, mine Digimon with Retaliation, defender level max 4, gated by host name | A Retaliation Digimon may attack an unsuspended level-3 target but not an unsuspended level-5 target. |
| Name, suspension, and turn boundaries | `selfHasNameContaining(Myotismon)` plus `defenderLevelMax: 4` | A non-Myotismon host grants no permission; it expires on the opponent's turn; ordinary attacks against suspended high-level targets remain legal. |
| Evolution stack | Public stacks include EX1-061 beneath EX1-063 and Retaliation sources | Assertions observe host name and inherited permission from the resulting stack. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-061.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 7 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-061", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-062 — SkullGreymon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-062 as a purple level-5 Ultimate/Undead Digimon with purple or red level-4 evolution requirements. It has `<Security Attack +1>`, `[End of Attack]` delete this Digimon, and `[On Deletion]` may play one specifically named `[Agumon]` from trash suspended without paying its cost. Local KB Q3247 confirms that if security de-digivolves SkullGreymon before end of attack, the End-of-Attack effect does not activate; Q3248 excludes Agumon Expert and Agumon - Bond of Bravery.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Security Attack +1 | Static `SecurityAttack` keyword amount 1 | A real player attack checks two security cards. |
| End of Attack self-delete | `EndOfAttack` self `Delete` | After a normal attack SkullGreymon leaves play. |
| On Deletion Agumon play | `OnDeletion` optional `PlayWithoutCost` from trash, suspended, exact `nameExact: Agumon` | A trash Agumon is played suspended; refusal leaves it in trash. |
| Exact name and stack boundary | Name-exact filter excludes Agumon Expert and Bond of Bravery; security BT2-105 de-digivolves the source | Q3247 timing test confirms no stale End-of-Attack deletion after SkullGreymon leaves play, and a stacked Agumon can be played from the resulting trash. |
| Evolution requirements | Catalog purple/red Lv.4 → level-5 paths | The focused suite uses public attack/evolution-stack transitions and no injected timing. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-062.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 5 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-062", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-063 — VenomMyotismon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-063 as a purple level-6 Mega/Dark Animal Digimon with `<Retaliation>`. Its `[When Attacking][Once Per Turn]` effect may play one purple level-4-or-lower Digimon with `<Retaliation>` from trash without paying its cost; any `[On Play]` effects of that played Digimon do not activate. Local KB Q3249 confirms an inherited-only Retaliation clause is not sufficient.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Retaliation | Static `Retaliation` keyword | The focused suite observes the keyword on VenomMyotismon. |
| When Attacking optional play | `WhenAttacking`, `frequency: OncePerTurn`, optional `PlayWithoutCost` from trash, mine purple Digimon, level `lte 4` | A real attack plays a qualifying EX1-056 from trash; declining leaves it in trash. |
| Main-text Retaliation filter | `effectTextContains` for Retaliation text | An inherited-only Retaliation card (BT12-076) is rejected, matching Q3249. |
| Level/color boundary | Purple, Digimon, level 4 or lower filter | A level-5 Retaliation Digimon is not played. |
| Suppressed On Play and once-per-turn | `suppressOnPlayEffects: true`; `frequency: OncePerTurn` | A played BT18-077 does not trigger its On Play effect; two attacks with an unsuspension between them play only the first candidate. |
| Evolution stack | Public attack fixtures and stacked EX1-061/EX1-057 sources | Triggered behavior is proved through observable attack/play transitions, not injected timing. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-063.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 6 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-063", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-064 — Piedmon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-064 as a purple level-6 Mega/Wizard Digimon. Its `[On Play]` effect deletes up to four of the opponent's unsuspended level-4-or-lower Digimon. Its `[Your Turn][Once Per Turn]` effect draws one when an opponent's Digimon is deleted. Local KB Q3250 confirms that deleting four Digimon simultaneously still permits only one draw.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| On Play deletion | `OnPlay` `Delete`, opponent Digimon, unsuspended, level `lte 4`, count 4 | Four legal targets are deleted while a level-5 and suspended level-4 remain. |
| Up-to-four boundary | Same target filter/count | Fewer than four legal targets deletes only those available; no-legal-target case is a no-op. |
| Your-turn once-per-turn draw | `YourTurn` `SubTrigger(onDeletionOf)` opponent Digimon source, `GainMemory` not used; `Draw 1`, `frequency: OncePerTurn` | On Play's multiple simultaneous deletions and two later battle deletions each produce one draw only. |
| Evolution/real deletion flow | Public play and attack intents | All proofs use observable game actions and settled state, with no injected timing. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-064.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 4 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-064", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-065 — Diaboromon

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-065 as a white level-6 Mega/Unknown Digimon. Its `[Security]` effect may play one Diaboromon Token without paying its cost at the end of battle. During the opponent's turn, all of your Diaboromon gain `<Blocker>`. Local KB Q3251 confirms a token loses Blocker before blocker timing if its source is deleted; Q3252 confirms the security token may be played even if the attacker loses; Q3253 confirms it is played before the attacker's remaining security checks.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Security Token | `Security` `PlayToken([Diaboromon])`, no cost, optional | A real security check plays the token even when the attacker loses, and event ordering places it before the next security check. |
| Optionality | `optional: true` on token action | The public security flow exercises the token path without direct timing injection. |
| Opponent-turn Blocker | `OpponentsTurn` `GainKeyword(Blocker)` to all mine Diaboromon | Both source and other allied Diaboromon gain Blocker only during the opponent's turn. |
| Source-lifetime boundary | Turned-on Blocker aura and real attack deletion | Deleting the source before blocker timing removes the token's Blocker, matching Q3251. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-065.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 4 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-065", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-066 — Analog Youth

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-066 as a white Tamer costing 2. Its `[On Play]` effect reveals the top three cards, adds one Digimon among them to hand, and trashes the remainder. Its `[All Turns]` effect triggers when one of your level-5-or-higher Digimon with digivolution cards is deleted: you may suspend this Tamer, gain 1 memory, then hatch one Digi-Egg into an empty Breeding Area. Its security effect plays itself. Local KB Q3254 confirms the Tamer may suspend and gain memory even when the Breeding Area is occupied, though hatching then cannot occur.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| On Play reveal/add/trash | `OnPlay` `RevealAdd` top 3, Digimon candidate, remainder trash | A public play decision adds the only Digimon and trashes the filler cards. |
| Deletion trigger and optional suspend | `AllTurns` `SubTrigger(onDeletionOf)` source filter mine Digimon, level `gte 5`, `digivolutionCards: hasAny`; optional self `Suspend` | Real battle deletion of a qualifying level-5 stack suspends Analog Youth, gains 1 memory, and hatches. Decline, level-3, no-source, and already-suspended cases do not pay. |
| Breeding occupancy | `GainMemory` and `Hatch` gated by `ifThisEffectActed` | Q3254 test proves memory is gained after accepting suspension while hatch correctly fails with occupied Breeding Area. |
| Security self-play | Security `PlayWithoutCost` self target | A real security check plays Analog Youth for its owner. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-066.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 9 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, illegal Digi-Egg-in-deck/security fixture, or numeric-security fixture. Digi-Egg cards appear only in the dedicated Egg Deck/Breeding fixtures required to prove hatching. The module registers only through `registerIrCard("EX1-066", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-067 — Baptism by Fire!

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-067 as a red Option costing 3. Its `[Main]` effect deletes one opponent's Digimon with `<Blocker>` and 6000 DP or less. Its `[Security]` effect activates the same Main effect. The local KB query returns no card-specific Q&A or errata.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Main deletion | `Main` `Delete`, opponent Digimon, `keywords: [Blocker]`, DP `lte 6000`, count 1 | A real Main play deletes the eligible Blocker while preserving a 7000-DP Blocker and a non-Blocker. |
| Security activation | `Security` `ActivateMain` | A real security check activates Main and deletes the eligible Blocker. |
| Exact numeric/keyword boundaries | DP and keyword filters | The focused fixture proves both the 6000-or-less and Blocker requirements. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-067.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 2 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-067", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-068 — Ice Wall!

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-068 as a blue Option costing 1. Its `[Main]` effect gives all opponent's Digimon `[When Attacking] Lose 2 memory` until the end of their next turn; its `[Security]` effect gains 2 memory. The local KB provides Q2120/Q2121 on interaction with Option immunity, Q3255 on the opponent's memory loss, Q3256 on later entrants, and Q3257 on Blitz attacks. The card is restricted to one copy by the local banlist entry.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Timed opponent-wide attack loss | Main `GrantAuraToOpponents`, effect text `[When Attacking] Lose 2 memory`, `untilOpponentTurnEnd`, `includeLaterEntrants: true` | Real attacks by existing and later-played Digimon lose 2 memory; two separately played Ice Walls stack; later-turn expiration is observed. |
| Security gain | Security `GainMemory 2` | A real security check by the option's owner gains 2 memory. |
| Q3255/Q3257 | Shared granted attack trigger and public Blitz evolution | Two grants cause two losses, and Blitz attacks still lose 2 memory. |
| Q2120/Q2121 immunity timing | Timed aura integration | The focused suite proves expiry after the next opponent turn and removal when Option immunity is active. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-068.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 10 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, illegal Digi-Egg-in-deck/security fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-068", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card ambiguity remains; shared aura integration is covered by the existing behavior tests.

### EX1-069 — Ultimate Connection!

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-069 as a black Option costing 1. Its `[Main]` effect may trash one level-5 Digimon card with `[Cyborg]` in its traits from hand to gain 2 memory and draw 1. Its `[Security]` effect activates Main. The local KB query returns no card-specific Q&A or errata.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Optional cost and payload | Main `GainMemory 2` with optional trash cost restricted to hand, Digimon, level 5, Cyborg | A real Main play trashes EX1-008, gains 2 memory, and draws one. Declining leaves the cost card in hand and skips both payload actions. |
| Exact cost filter | `kind: Digimon`, `levels: [5]`, trait `Cyborg` | Wrong-level and wrong-trait cards are not offered as payment. |
| Security activation | Security `ActivateMain` | A real security check activates Main for the option's owner and resolves the same cost/payload. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-069.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 4 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, Digi-Egg fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-069", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-070 — Fight for Your Pride!

#### Printed contract and sources

The catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX1-070 as a purple Option costing 4. Its `[Main]` effect plays one purple level-4-or-lower Digimon from your trash without paying its cost, then, if you have a Digimon with `[Myotismon]` in its name in play, gives one of your Digimon `<Blocker>` until the end of your opponent's next turn. Its `[Security]` effect plays one purple level-4-or-lower Digimon from trash without cost. The local KB query returns no card-specific Q&A or errata.

#### Clause-to-IR-to-test mapping

| Clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Main trash play | Main `PlayWithoutCost`, mine purple Digimon, level `lte 4`, from trash | A real Main play moves a qualifying purple level-4 Digimon onto the field. |
| Conditional Blocker | Main `GainKeyword(Blocker)` one mine Digimon, `untilOpponentTurnEnd`, gated by `youHave(Myotismon)` | Myotismon present grants Blocker; absence does not; the grant remains through the opponent's turn and expires on the next own turn. |
| Security trash play | Security `PlayWithoutCost` same purple level/zone filter | A real security check plays the qualifying card and leaves a level-5 card in trash. |
| Numeric and controller boundaries | Purple, Digimon, level `lte 4`, mine filters | A level-5 non-qualifying card is untouched, and assertions observe the owner-side result. |

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-070.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 4 tests.
- Structural sweep: no `@ts-nocheck`, `registerCard`, injected timing, illegal Digi-Egg-in-deck/security fixture, or numeric-security fixture in assigned files. The module registers only through `registerIrCard("EX1-070", compiled)`.
- Lint/format and `git diff --check` are coordinator-facing delivery checks; typecheck was intentionally not run in this lane under the EX1 RAM policy.

#### Rubric

- Catalog/rules evidence: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2

Score: **8/10** pending coordinator typecheck, collection gates, commit, and branch delivery. No unresolved card or engine ambiguity remains.

### EX1-071 — Win Rate: 60%!

#### Printed contract and sources

- Catalog source: `packages/shared/src/cards/data/cards.json`. EX1-071 is a white
  Option with play cost 2. Its first clause permits use without color requirements
  when its controller has a Tamer; its Main clause makes the next own Digimon
  digivolution this turn optionally trash a same-color hand Digimon to reduce that
  evolution's memory cost by 4. Its Security effect returns itself to its owner's hand.
- Local KB: `node tools/kb/query.mjs card EX1-071` returns Q1688, Q1736, and Q3258–Q3264,
  plus Q3359. These establish timing/order, battle-area-only scope, color matching
  across continuous and multicolor/DNA colors, optional payment, and the printed-cost
  ceiling interaction.
- Comprehensive rules evidence: §§6-5-1-2-1 and 8-1-2-3/8-1-2-6 cover public
  digivolution and stack state; §§15-16-2 and 15-16-8-1 cover Main/Your Turn
  effects; §3-4-7 covers breeding-area restrictions.

#### Clause-to-IR-to-test mapping

| Contract clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Ignore this Option's color requirement with a Tamer | Static `WaiveColorRequirement` conditioned on an own battle-area Tamer | Tests accept use with a non-white Tamer and reject an opponent-only Tamer. |
| Next Digimon digivolution this turn | Main `CostModifier`, digivolve cost type, amount 4, `nextDigivolveThisTurn`, battle-area scope | Tests cover ordinary, effect-driven, multicolor, DNA, alternate Tamer, and nonmatching evolutions. |
| Optional same-color hand Digimon cost | Trash cost is resolved at the deferred evolution point against all effective destination/material colors | Positive tests trash red/blue/green matches; negative and refusal tests preserve the card and pay printed cost. |
| Security return | Security `AddToHandSelf` | Both direct security resolution and a real security check return the Option to its owner. |

#### Behavioral and rules proof

`EX1-071.test.ts` has 17 passing tests. It covers Q1688 ordering, Q1736 pending
effect persistence through another Option's lock, Q3258–Q3264 color and scope
boundaries, Q3359 cost-cap behavior, Q3259 breeding-area exclusion, optional
refusal, and security behavior. Evolution fixtures use public intents and assert
memory, hand, trash, and stack state. Digi-Egg and numeric-security shortcuts were
removed; inert BT1-009 Digimon are used for deck/security filler.

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-071.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 17 tests.
- `pnpm exec oxlint` and `pnpm exec oxfmt --check` were run on assigned files — passed.
- `git diff --check` — passed.
- Typecheck and collection-wide tests were intentionally not run in this worker lane per the EX1 RAM policy.
- Structural sweep: no `@ts-nocheck`, no `registerCard`, no injected timing calls, and no Digi-Egg fixtures remain. The module registers only through `registerIrCard`.

#### Rubric

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Total** | **8/10** |

No card-specific ambiguity or engine changes remain. Collection gates, commit, and push remain coordinator-owned.

### EX1-072 — Emergency Program Shutdown!

#### Printed contract and sources

- Catalog source: `packages/shared/src/cards/data/cards.json`. EX1-072 is a white
  Option with play cost 3. Its Main effect prevents the opponent from using Option
  cards until the end of that opponent's next turn. Its Security effect applies the
  lock for the current turn, then returns this card to its owner's hand.
- Local KB: `node tools/kb/query.mjs card EX1-072` returns Q3265 and Q3266. These
  clarify that Security effects still activate while Options are locked and that
  Delay on an Option already in the battle area is not using an Option card.
- Comprehensive rules evidence: §§6-2-1 and 6-2-2 cover turn/phase progression;
  §§12-1-1 and 15-16-2 cover Option use and Security effects; §15-16-8-1 covers
  the duration of turn-based restrictions.

#### Clause-to-IR-to-test mapping

| Contract clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Main lock through opponent's next turn | Main `RestrictPlay`, opponent seat, Option filter, `mode: "play"`, `duration: "untilOpponentTurnEnd"` | Public turn-loop tests reject an Option on the next opponent turn and allow it after that turn ends. |
| Security lock for current turn | Security `RestrictPlay`, opponent seat, Option filter, `duration: "forTheTurn"` | Direct Security proof and a real attack/security check reject Option use while returning the card to its owner. |
| Security return to owner | Security `AddToHandSelf` | Real and direct Security tests assert the exact owner hand receives EX1-072. |
| Q3265/Q3266 exceptions | Restriction applies to `mode: "play"`; existing Security effects and Delay activations remain available | Dedicated tests prove a Security effect resolves during the lock and a pre-existing Option's Delay can activate. |

#### Behavioral and rules proof

`EX1-072.test.ts` has 6 passing tests using public play, attack, phase, and
Security intents. It proves both Main and Security durations, expiration after
the opponent's next turn, Q3265 Security behavior, and Q3266 Delay behavior.
Digi-Egg and numeric-security shortcuts were removed; inert BT1-009 Digimon are
used for deck/security filler.

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-072.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 6 tests.
- `pnpm exec oxlint` and `pnpm exec oxfmt --check` were run on assigned files — passed.
- `git diff --check` — passed.
- Typecheck and collection-wide tests were intentionally not run in this worker lane per the EX1 RAM policy.
- Structural sweep: no `@ts-nocheck`, no `registerCard`, no injected timing calls, and no Digi-Egg fixtures remain. The module registers only through `registerIrCard`.

#### Rubric

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Total** | **8/10** |

No card-specific ambiguity or engine changes remain. Collection gates, commit, and push remain coordinator-owned.

### EX1-073 — Machinedramon

#### Printed contract and sources

- Catalog source: `packages/shared/src/cards/data/cards.json`. EX1-073 is a black
  level-6 Mega/Virus/Machine Digimon with 11,000 DP, black or red level-5 evolution
  requirements costing 3 memory, and play cost 12.
- Printed/errata contract: on play, optionally place up to five level-5 red and/or
  black Digimon with [Cyborg] in their traits and different card numbers from hand
  and trash under this Digimon, gaining 1 memory per card; all turns, its DP can't
  be reduced; all turns, when it would be deleted, it may trash two level-5 Digimon
  cards in its digivolution cards to prevent deletion.
- Local KB: `node tools/kb/query.mjs card EX1-073` returns the 2021 erratum plus
  Q3267 (all placement conditions), Q3268 (prevention is optional), and Q6030
  (one replacement may be used for each sequential deletion from one effect).
- Comprehensive rules evidence: §§6-5-1-2-1 and 8-1-2-3/8-1-2-6 cover stack
  construction and evolution; §§10-1-1 and 15-16-2 cover deletion/replacement
  timing; §§12-1-1 and 15-16-8-1 cover trash and all-turn continuous effects.

#### Clause-to-IR-to-test mapping

| Contract clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Optional errata-corrected material placement | On Play optional `PlaceUnder`, up to 5, source zones hand/trash, red/black level 5 Digimon with Cyborg trait, distinct card numbers, bottom position | Tests prove mixed hand/trash placement, zero choice, five-card cap, wrong level/trait exclusion, and reuse of cards newly trashed by a peer effect. |
| Gain 1 memory per placed card | `trackCount: "placedCyborgs"` and named-count scaling | Positive and cap tests assert exact memory gain. |
| DP cannot be reduced | Static self `Restrict` with `restriction: "dpImmune"`, permanent duration | Test applies a real DP reduction effect and observes unchanged DP. |
| Optional deletion prevention | All Turns self replacement on `wouldBeDeleted`; optional Prevent costs two own-stack level-5 Digimon cards | Tests prove insufficient sources fail, eligible sources prevent deletion, only this stack is used, optional prevention, and Q6030 sequential deletion prevention. |

#### Behavioral and stack proof

`EX1-073.test.ts` has 10 passing tests using public play, attack, phase, deletion,
and effect intents. It exercises the corrected level-5 erratum, distinct-card
number limit, hand/trash source zones, DP immunity, stack-local prevention,
optional choices, inherited Machine package interactions, and Q6030. Digi-Egg
and numeric-security shortcuts were removed; inert BT1-009 Digimon are used for
deck/security filler.

#### Verification

- Focused suite: `pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-073.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 1 file / 10 tests.
- `pnpm exec oxlint` and `pnpm exec oxfmt --check` were run on assigned files — passed.
- `git diff --check` — passed.
- Typecheck and collection-wide tests were intentionally not run in this worker lane per the EX1 RAM policy.
- Structural sweep: no `@ts-nocheck`, no `registerCard`, no injected timing calls, and no Digi-Egg fixtures remain. The module registers only through `registerIrCard`.

#### Rubric

| Axis | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR implementation trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Total** | **8/10** |

The erratum and Q3267/Q3268/Q6030 behavior are implemented and proven. Collection gates, commit, and push remain coordinator-owned.

## Mechanisms

Merged from the `*-MECHANISM.md` files under `docs/audits/EX1-reaudit/`. Link to these sections as `docs/audits/EX1.md#mechanisms`.

### Inherited security watcher mechanism

#### EX1-029 seam result

The retained EX1-029 red was initially reported as a failure to re-register an
inherited `[Your Turn][Once Per Turn] When a card is added to your security
stack` watcher after a public turn transition. The red was caused by an
under-provisioned deck fixture, not by the engine watcher lifecycle.

The public sequence consumes the controller's deck in this order:

1. BT1-087 T.K. Recovery consumes one card.
2. The controller's next-turn Draw phase consumes one card.
3. The digivolution consumes one card for its bonus draw before EX1-031's
   `When Digivolving` Recovery.
4. EX1-031 therefore needs a fourth initial deck card for Recovery to add a
   card and publish the `whenAddSecurity` event.

With only two initial deck cards, EX1-031 Recovery correctly adds zero cards,
so no `whenAddSecurity` event exists and memory remains 6 after the 4-cost
digivolution. The focused test now supplies four inert deck cards and waits for
the security stack to reach four cards, proving the real Recovery event. The
watcher then re-registers across continuous recomputation and the next-own-turn
once-per-turn ledger reset grants the expected +1 memory (10 - 4 + 1 = 7).

No engine behavior was changed. The stack assertion was also corrected to the
engine's documented bottom-first `Permanent.stack` order: the seeded EX1-029
is below the prior BT1-060 top card, so the observed stack is
`["EX1-029", "BT1-060"]`.

### Newly evolved inherited watcher mechanism

#### EX1-039 seam result

The retained red initially evolved EX1-039 directly onto a level-4
BT1-070. That made EX1-039 the top card of the permanent. Because EX1-039's
clause is inherited, it was correctly inactive while it remained the top card;
the public suspension therefore could not grant Security Attack +1. The red
was a fixture/stack-boundary error, not a missing watcher registration seam.

The public regression now starts with EX1-039 as the top card and legally
digivolves it into EX1-042 (green level 6). That places EX1-039 in the
digivolution stack as a newly active inherited source in the same turn. A
subsequent public play of BT1-070 suspends the opponent's Digimon, and the
watcher grants Security Attack +1. The focused test passes without engine
changes.

## Knowledge base index

Merged from `docs/audits/EX1-reaudit/KB-INDEX.md`.

Generated on 2026-09-09 by running `node tools/kb/query.mjs card <ID>` for every catalog card. “No card-specific Q&A” is a recorded query result, not a claim that no general rule applies.

| Card | Card-specific Q&A ids |
| --- | --- |
| EX1-001 | Q3187, Q3188 |
| EX1-002 | Q3189 |
| EX1-003 | Q3190 |
| EX1-004 | Q3191 |
| EX1-005 | Q2082, Q2480, Q3192, Q3193, Q3194 |
| EX1-006 | Q3195 |
| EX1-007 | No card-specific Q&A returned by the local query |
| EX1-008 | Q3196, Q3197 |
| EX1-009 | Q3198, Q3199 |
| EX1-010 | Q3200 |
| EX1-011 | Q3201, Q3202 |
| EX1-012 | No card-specific Q&A returned by the local query |
| EX1-013 | Q3203 |
| EX1-014 | No card-specific Q&A returned by the local query |
| EX1-015 | No card-specific Q&A returned by the local query |
| EX1-016 | No card-specific Q&A returned by the local query |
| EX1-017 | No card-specific Q&A returned by the local query |
| EX1-018 | No card-specific Q&A returned by the local query |
| EX1-019 | Q3204, Q3205, Q3206 |
| EX1-020 | No card-specific Q&A returned by the local query |
| EX1-021 | Q3207, Q3208 |
| EX1-022 | Q3209 |
| EX1-023 | No card-specific Q&A returned by the local query |
| EX1-024 | No card-specific Q&A returned by the local query |
| EX1-025 | No card-specific Q&A returned by the local query |
| EX1-026 | Q3210 |
| EX1-027 | Q3211 |
| EX1-028 | Q3212 |
| EX1-029 | Q3213, Q3214 |
| EX1-030 | Q3215, Q3216 |
| EX1-031 | No card-specific Q&A returned by the local query |
| EX1-032 | Q3217 |
| EX1-033 | Q3218, Q3219, Q3220, Q3221, Q3222 |
| EX1-034 | No card-specific Q&A returned by the local query |
| EX1-035 | Q1594, Q3223, Q3224, Q3227 |
| EX1-036 | No card-specific Q&A returned by the local query |
| EX1-037 | No card-specific Q&A returned by the local query |
| EX1-038 | Q3225 |
| EX1-039 | No card-specific Q&A returned by the local query |
| EX1-040 | Q3226, Q3227, Q3228, Q3229 |
| EX1-041 | No card-specific Q&A returned by the local query |
| EX1-042 | No card-specific Q&A returned by the local query |
| EX1-043 | Q3230 |
| EX1-044 | Q3231 |
| EX1-045 | No card-specific Q&A returned by the local query |
| EX1-046 | Q3232 |
| EX1-047 | No card-specific Q&A returned by the local query |
| EX1-048 | Q3233 |
| EX1-049 | Q3234 |
| EX1-050 | Q3235 |
| EX1-051 | Q3236, Q3237, Q3238 |
| EX1-052 | Q3239 |
| EX1-053 | No card-specific Q&A returned by the local query |
| EX1-054 | No card-specific Q&A returned by the local query |
| EX1-055 | Q3240 |
| EX1-056 | Q3241, Q3242 |
| EX1-057 | No card-specific Q&A returned by the local query |
| EX1-058 | Q3243, Q3244 |
| EX1-059 | No card-specific Q&A returned by the local query |
| EX1-060 | Q3245 |
| EX1-061 | Q3246 |
| EX1-062 | Q3247, Q3248 |
| EX1-063 | Q3249 |
| EX1-064 | Q3250 |
| EX1-065 | Q3251, Q3252, Q3253 |
| EX1-066 | Q3254 |
| EX1-067 | No card-specific Q&A returned by the local query |
| EX1-068 | Q2120, Q2121, Q3255, Q3256, Q3257 |
| EX1-069 | No card-specific Q&A returned by the local query |
| EX1-070 | No card-specific Q&A returned by the local query |
| EX1-071 | Q1688, Q1736, Q3258, Q3259, Q3260, Q3261, Q3262, Q3263, Q3264, Q3359 |
| EX1-072 | Q3265, Q3266 |
| EX1-073 | Q3267, Q3268, Q6030 |

## Open items

No EX1 card scores below 10/10 and no ambiguity was left unresolved. The following remain worth knowing.

- Contradiction — authority. `docs/audits/EX1-AUDIT.md` (2026-09-03, `354de9c4f`) states "This file is the authoritative, self-contained EX1 ledger". `docs/audits/EX1-reaudit/REVIEW-NOTES.md` (2026-09-10, `c78b31582`) states the same file "is historical context only. Current scores require fresh per-card reports and coordinator reruns." The newer re-audit wins; the older file's claim is void.
- Contradiction — test counts. The per-card table in `EX1-AUDIT.md` reports focused-proof counts that the re-audit reruns superseded, for example EX1-001 "3 tests passed" against the coordinator's 4/4, and EX1-002 "5 tests passed" against 7/7. The re-audit counts are the current ones and are recorded per card below.
- Two engine seams were opened as suspected engine defects and both closed with no engine code change. `inherited-security-watch-next-own-turn-reregistration` (EX1-029) was an exhausted two-card deck fixture. `newly-evolved-inherited-watcher-registration` (EX1-039) was a top-card fixture error. Both are documented under Mechanisms.
- EX1-020 was accepted, revoked, and re-accepted. The authoritative post-lane API typecheck found `EX1-020.ts:15` missing the required `DrawAction.controller`; after the typed-IR correction the rerun passed 12/12 and typecheck reported no diagnostics.
- Deferred, outside EX1. The serialized broad engine suite left two reproducible reds unchanged from `origin/main`: `deckTruthSource.test.ts` expects BT26 to be absent despite the current catalog, and the BT26 BeelStarmon deck interaction fails on BT25-085. They belong to BT25 and BT26, not to EX1.
- The repository-wide root typecheck exposed two properties that `@ts-nocheck` had hidden once the suppressions were removed. This is expected residue of the suppression removal, not an outstanding defect.

### Fixture traps recorded by the coordinator

- Do not place Digi-Eggs in deck or security.
- Do not use numeric `security: <n>` shortcuts.
- Injected timings such as `advance.fire`, `fireSubTrigger`, or `fireTiming` do not prove behavior.

## History

Superseded files, removed after their content was merged here. Raw evidence stays in git history at the commits named.

- `docs/audits/EX1-AUDIT.md` — `354de9c4f`, 2026-09-03. Per-card summary table for all 73 cards from the first collection audit; demoted to historical context by the re-audit.
- `docs/audits/EX1-REAUDIT-LEDGER.md` — `727d584b0`, 2026-09-10. Scoring table for the winning re-audit; its aggregate and per-row scores are carried into Status and the card ledger.
- `docs/audits/EX1-reaudit/` per-card reports — `2850d9a99`, 2026-09-10. 73 files, `EX1-001.md` through `EX1-073.md`, merged verbatim into the card ledger.
- `docs/audits/EX1-reaudit/RUN.md` — `2850d9a99`, 2026-09-10. Run log; its closeout is quoted under Gates.
- `docs/audits/EX1-reaudit/REVIEW-NOTES.md` — `c78b31582`, 2026-09-10. Coordinator decisions, engine seam queue, and fixture traps; merged into Status and Open items.
- `docs/audits/EX1-reaudit/KB-INDEX.md` — `ac36ffe90`, 2026-09-09. Merged into Knowledge base index.
- `docs/audits/EX1-reaudit/INHERITED-SECURITY-WATCH-MECHANISM.md` — `c78b31582`, 2026-09-10. Merged into Mechanisms.
- `docs/audits/EX1-reaudit/NEWLY-EVOLVED-WATCHER-MECHANISM.md` — `c78b31582`, 2026-09-10. Merged into Mechanisms.
- `docs/audits/EX1-reaudit/SOURCE-RECONCILIATION.md` — `ac36ffe90`, 2026-09-09. Recorded that no catalog correction was established; that fact is in Status.
- `docs/audits/EX1-reaudit/WORKER-BRIEF.md` — `ac36ffe90`, 2026-09-09. Process instructions for the audit workers; not evidence, not carried forward.

No code file referenced any of these paths, so no code reference needed updating.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for EX1: PR #4582; commit `9d056bac7`.
