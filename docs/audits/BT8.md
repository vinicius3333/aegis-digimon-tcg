---
set: BT8
cards: 112
status: verified
verified_at: 2026-09-10
catalog_commit: efbecc002fb9000789123e2f91f201466e1e5b0a
evidence_commit: eabe99351
---

# BT8 audit

## Status

All 112 BT8 cards are verified at 10/10. The winning source is the 2026-09-10 re-audit run
(`docs/audits/BT8-reaudit/RUN.md`, commit `59db5fece`), whose final strict recalc records 112/112 at
10/10 and aggregate 1120/1120 after the exact 125-file BT8 collection, effects sync and check,
affected mechanisms, isolated primitives, full workspace typecheck, lint, format, and the
diff, registration, suppression, and raw-action gates passed. The score table inside
`docs/audits/BT8-REAUDIT-LEDGER.md` was never updated from the worker cap and still shows gates 0
and 8/10 on every row, contradicting its own summary line in the same file; that stale column is
recorded under Open items and does not change the result. The 2026-09-05 closeout
(`docs/audits/BT8-STATIC-AUDIT.md`) independently reached 112/112 at 10/10, and the 2026-08-25 fresh
revalidation reached the same result from a separate base. The range reports under
`internal-docs/audits/BT8/` are the earlier worker pass; their clause traces are merged into the card
ledger for the detail, not for the score.

## Gates

### Final re-audit run, 2026-09-10

Source: `docs/audits/BT8-reaudit/RUN.md` (commit 59db5fece).

- Dedicated branch/worktree: `audit-bt8-luna-20260910` at `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt8-luna-20260910`.
- Cumulative base: pushed BT7 completion `ecee49cca57c1a2a1b4b0c6387b2ea07839c1f61`.
- Inventory: 112 catalog cards, 112 modules, 112 focused tests, zero `@ts-nocheck`, zero `registerCard(`.
- Main remains untouched. Heavy commands require separate process/memory gates and serial Vitest.
- Two read-only Luna lanes reviewed all 112 cards. BT8-015 alone required stronger DNA-only lifecycle proof.
- BT8-015 mutation progression: the first proposal exposed that both selected low-DP targets were legally deleted; a 9000-DP peer also became eligible after the ordinary −5000 DP clause. The corrected high-DP BT8-032 peer and pre-deletion permanent-ID capture produced a green public end-of-turn DNA lifecycle test (4/4).
- Worker-cap ledger: 112/112 cards at 8/10, aggregate 896/1120.
- Exact BT8-only collection passed 125/125 files and 488/488 tests with `--maxWorkers=1 --no-file-parallelism`.
- Effects sync and check each passed: 112 records synchronized, zero BT8 semantic changes against BT7, and zero out-of-set changes. One check attempt timed out in Oxfmt and was discarded before the green retry.
- Affected mechanisms passed 10/10 files and 294/294 tests; isolated primitives passed 1/1 file and 145/145 tests.
- Full workspace typecheck passed. Scoped Oxlint completed with zero errors, Oxfmt was applied/verified, and diff/registration/suppression/raw-action gates passed.
- Final strict recalc: 112/112 cards at 10/10, aggregate 1120/1120.

### Earlier campaign closeout, 2026-09-05

Source: `docs/audits/BT8-STATIC-AUDIT.md` (commit eb1a58b75).


- Focused changed-card batch: 9 files, 44 tests passed.
- Catalog/module synchronization: 1 file, 116 tests passed.
- Full BT8 collection: 125 files, 485 tests passed.
- Affected engine mechanisms: 14 files, 772 tests passed.
- Tooling tests: 16 tests passed, including duplicate-catalog and duplicate-snapshot-key rejection for the set-scoped generator.
- `effects.json`: 112 BT8 records synchronized; 56 semantic changes against
  `origin/main`; zero semantic or byte changes outside BT8.
- Shared package build: passed.
- API BT8 type surface: clean. The repository-wide API typecheck retains only
  pre-existing `ArraySchema` assignability errors in unchanged files
  `src/engine/state/digivolutionStackSync.test.ts` and
  `src/engine/state/syncedArrayInsert.test.ts`.
- Scoped Oxfmt/Oxlint and `git diff --check`: passed.
- BT8-096 and BT8-100 explicitly scope their multicolor digivolution-card
  alternative to Digimon hosts. Positive coverage accepts a multicolor Tamer
  card under a Digimon, while negative coverage rejects a multicolor card
  under a Tamer.

BT8 collection verification is complete with reproducible 10/10 evidence for
all 112 cards.

## Card ledger

### BT8-001 — Gurimon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Red level-2 Digi-Egg, Lesser, DP 0; inherited `[When Attacking][Once Per Turn] If this Digimon has 6000 DP or more, Draw 1.`

**Direct implementation.** `apps/api/src/cards/BT8/BT8-001.ts:5-18` is full-coverage IR with a self-scoped `WhenAttacking`, inherited flag, Once Per Turn, and `selfDpAtLeast: 6000` condition. The default attack builder scope is the attacking host, so an unrelated allied or opponent attack cannot activate it.

**Static behavior and stack proof.** `BT8-001.test.ts` covers a positive draw, an opponent attack, and the inclusive 5999 negative boundary. The fixtures now use a legal red route: BT8-001 egg → red BT8-008 Lv.3 → red BT8-013 Lv.4 (6000 printed DP). The condition, timing, inherited state, and controller draw boundary are all represented.

**Snapshot and score.** Snapshot `effects.json:116702-116720` matches the direct module. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-002 — Hiyarimon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Blue level-2 Digi-Egg, Lesser; inherited `[All Turns] While your opponent has no Digimon with digivolution cards, this Digimon gets +1000 DP.`

**Direct implementation.** `apps/api/src/cards/BT8/BT8-002.ts:8-44` uses an inherited All Turns Aura targeted to the self host and an `opponentHasNone` condition over opposing Digimon with any digivolution cards. The opponent’s empty field and a field containing only source-free Digimon both satisfy the condition; any opposing Digimon with a stack disables it.

**Static behavior and stack proof.** `BT8-002.test.ts` covers the empty opponent field, source-free opposing Digimon, and an opposing Digimon with an egg under it. The host is now legal blue BT8-002 egg → blue BT1-028 Lv.3. Q1693 and the `opponentHasNone` primitive resolve the empty-field boundary without inventing a “must have a Digimon” requirement.

**Snapshot and score.** Snapshot `effects.json:116721-116742` matches the direct condition and Aura. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-003 — Frimon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Yellow level-2 Digi-Egg, Lesser; inherited `[Your Turn] While you have 3 or more security cards, this Digimon gets +1000 DP.`

**Direct implementation.** `apps/api/src/cards/BT8/BT8-003.ts:8-39` is an inherited Your Turn self Aura with `securityAtLeast: 3`. The shared turn-owner guard prevents activation on the opponent’s turn, and the security condition is a live count rather than a fixed setup value.

**Static behavior and stack proof.** `BT8-003.test.ts` covers three security cards, two security cards, and the opponent turn. Fixtures now use legal yellow BT8-003 egg → yellow BT8-034 Lv.3. Q1694 confirms the threshold and breeding restriction; no effect is applied to a breeding permanent.

**Snapshot and score.** Snapshot `effects.json:116743-116760` matches the direct Aura. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-004 — Bibimon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Green level-2 Digi-Egg, Lesser; inherited `[Opponent's Turn] While all of your Digimon are suspended, this Digimon gets +1000 DP.`

**Direct implementation.** `apps/api/src/cards/BT8/BT8-004.ts:5-24` uses an inherited OpponentsTurn self Aura with `allYoursMatchFilter` over battle-area Digimon whose live suspended state is true. The kind filter excludes Tamers; the field-zone choice excludes breeding-area cards under the comprehensive rules boundary.

**Static behavior and stack proof.** `BT8-004.test.ts` uses legal green BT8-004 egg → green BT1-066 Lv.3 and proves the positive all-suspended case, the opponent-turn window, and the negative case with an additional unsuspended own Digimon. The empty “all” set semantics are inherited from the shared `every` primitive; no extra behavior was invented.

**Snapshot and score.** Snapshot `effects.json:116761-116778` matches the direct Aura and condition. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-005 — Kyokyomon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Black level-2 Digi-Egg, Lesser/X Antibody; inherited `[Your Turn][Once Per Turn] When an effect places a digivolution card under this Digimon, it gets +1000 DP until the end of your opponent's next turn.`

**Direct implementation and correction status.** `apps/api/src/cards/BT8/BT8-005.ts:9-44` is a hand-fixed compiled IR override that watches `onAddDigivolutionCards` with `sourceFilter.isSelfRef`, then applies self +1000 through `untilOpponentTurnEnd`, with inherited and Once Per Turn metadata. The generated snapshot omits the self receiver filter; the direct module already contains the proven correction, so no new direct edit was needed.

**Static behavior and stack proof.** `BT8-005.test.ts` now uses legal black BT8-005 egg → black BT8-060 Lv.3 hosts and covers effect placement under the host, two placements in one turn, and placement under a different Digimon. Q1695 and the placement primitive prove that the receiving host—not the placed card or an unrelated permanent—is the trigger subject.

**Snapshot drift and score.** Snapshot `effects.json:116779-116803` contains `onAddDigivolutionCards` but lacks the direct self receiver filter, so it is broader than executable authority. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-006 — DemiMeramon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Purple level-2 Digi-Egg, Flame; inherited `[Your Turn][Once Per Turn] When a card is trashed from your deck, Draw 1.`

**Direct implementation and correction status.** `apps/api/src/cards/BT8/BT8-006.ts:10-38` is a hand-authored compiled IR override using `onDiscardLibrary` with `sourceFilter.controller: "mine"`, inherited and Once Per Turn metadata, and a Draw 1 action. This is the proven correction over the generated snapshot’s nonexistent `whenDeckTrashed` event and its default opponent-deck direction; no new direct edit was needed.

**Static behavior and stack proof.** `BT8-006.test.ts` now uses legal purple BT8-006 egg → purple BT8-072 Lv.3 → purple BT8-076 Lv.4 before the BT8-079 digivolution/mill effect. Tests cover a true own-deck mill and a revealed card later trashed. Q1696 and Q1697, together with `fireOnDiscardLibrary` versus `whenTrashedFromDeck`, prove that only the own deck-trash event draws and a reveal-trash does not.

**Snapshot drift and score.** Snapshot `effects.json:116804-116821` uses the unsupported `whenDeckTrashed` event and therefore cannot execute the printed clause. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-007 — Gazimon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Red level-3 Rookie/Virus/Mammal Digimon, play cost 2, DP 3000, with a red level-2 evolution route costing 0 and no effect text.

**Direct implementation.** `apps/api/src/cards/BT8/BT8-007.ts:5-11` registers full-coverage empty IR. No behavior is invented for the effectless card, and registration is exclusive to `registerIrCard`.

**Static behavior and stack proof.** `BT8-007.test.ts` checks the committed name, color, level, cost, DP, form, attribute, and trait metadata plus a normal play with no pending effect. The catalog’s red level-2 route was inspected; no additional evolution clause applies.

**Snapshot and score.** Snapshot `effects.json:116822` is the same empty full-coverage IR. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-008 — Gammamon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Red level-3 Rookie/Virus/Ceratopsian Digimon, play cost 3, DP 2000, red level-2 evolution cost 0. `[Your Turn][Once Per Turn] When you play a red Tamer, Draw 1.` Inherited: `[When Attacking] If this Digimon has 6000 DP or more, delete 1 of your opponent's Digimon with 3000 DP or less.`

**Direct implementation.** `apps/api/src/cards/BT8/BT8-008.ts:8-62` has a Your Turn Once Per Turn `whenPlayed` watcher for the owner’s red Tamer and an inherited host-scoped When Attacking delete with the inclusive 6000/3000 thresholds. The filter is kind `Tamer` plus printed/effective red color, and the inherited delete is limited to opposing Digimon.

**Static behavior and stack proof.** `BT8-008.test.ts` covers a red-Tamer draw, an inclusive 3000-DP deletion from a legal red BT8-008 → red BT8-013 stack, and the 5999/3001 negative boundary. The copied-effect case now uses the legal stack BT8-008 Gammamon → BT8-013 BetelGammamon → BT10-011 Canoweissmon; Q1943 proves the copied non-inherited red-Tamer effect remains separate from the inherited watcher. No trait or name predicate is added to the BT8-008 direct module.

**Snapshot and score.** Snapshot `effects.json:116823-116854` matches both direct effects. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-009 — Hawkmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Red level-3 Rookie/Free/Avian Digimon, play cost 3, DP 2000, with red or yellow level-2 evolution at cost 0. `[On Play] Reveal the top 4 cards of your deck. Add 1 2-color red card among them to your hand. Place the remaining cards at the bottom of your deck in any order.`

**Direct implementation.** `apps/api/src/cards/BT8/BT8-009.ts:8-36` uses On Play RevealAdd of four, one controller-default card requiring both `multicolor: true` and red, and deck-bottom disposition for the remainder. The definition matcher uses printed colors for revealed cards, so effective board color treatments cannot make a revealed card qualify.

**Static behavior and stack proof.** `BT8-009.test.ts` covers a two-color red Digimon, a two-color red Option, a card only treated as red (negative), bottom remainder count, and the legal yellow BT8-003 egg → yellow-route BT8-009 digivolution for 0. Q1698 and Q1699 establish the multicolor/color-treatment boundaries; no name or trait matching is required for this clause.

**Snapshot and score.** Snapshot `effects.json:116855-116877` matches the direct RevealAdd. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-010 — Aquilamon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Red level-4 Champion/Free/Avian Digimon, play cost 4, DP 5000, red or yellow level-3 evolution at cost 2. When this card would be played from hand, reduce its play cost by 1 if you have a yellow Digimon in play. Inherited: `[When Attacking] If you have a yellow Digimon in play, delete 1 of your opponent's Digimon with 5000 DP or less.`

**Direct implementation.** `apps/api/src/cards/BT8/BT8-010.ts:8-77` uses a Static nested `wouldBePlayed` Replacement constrained to this card and a live battle-area yellow Digimon, with amount 1. Its inherited When Attacking delete checks the live yellow Digimon condition and targets only opposing Digimon at DP 5000 or less. The reducer allowlist and pay-time seam make the hand-play reduction executable and single-use.

**Static behavior and stack proof.** `BT8-010.test.ts` covers one yellow Digimon, multiple yellow Digimon (still one reduction), no yellow Digimon, inclusive 5000 deletion, the 5001/no-yellow negative boundary, and legal yellow BT8-034 Lv.3 → BT8-010 Lv.4 evolution for 2. Inherited tests now use legal red BT8-010 Lv.4 → red BT8-014 Lv.5 hosts. Q1700 and the pay-time reducer primitive resolve the no-stacking boundary.

**Snapshot and score.** Snapshot `effects.json:116878-116902` matches the direct nested replacement and inherited delete. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-011 — Cyclonemon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:63152-63179` records a red/black level 4 Champion/Virus/Dragonkin, play cost 5, 5000 DP, with red level 3 for 2 or black level 3 for 2 evolution and inherited `[When Attacking] Delete 1 of your opponent's Digimon with 2000 DP or less.`
- Local KB query: exactly one query, `BT8-011`; no knowledge-base entry.
- Rules and boundaries: the inherited timing is sourced from the digivolution stack; the DP comparison uses the affected Digimon's current DP, and the target is opponent battle-area Digimon only. No trait/name or color exception is present.
- Direct authority: `apps/api/src/cards/BT8/BT8-011.ts:8-35` has an inherited `WhenAttacking` Delete, opponent Digimon filter, DP `lte 2000`, count 1, and no residual effect. It registers exclusively with `registerIrCard` at line 35.
- Snapshot: `effects.json:116936-116953` matches the direct filter, count, inherited flag, `coverage: full`, and empty residual list.
- Focused proof: `BT8-011.test.ts:1-74` imports the direct module and covers exact 2000 versus 2001 DP, inherited activation, and both red/black level-3 evolution colors. Same-mechanism peer review included other inherited deletion cards and the shared Delete interpreter.
- Result: no correction. Score: 8/10 provisional (execution gate 0/2).

### BT8-012 — Flamedramon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:63182-63204` records a red/blue level 4 ArmorForm/Free/Dragonkin, play cost 5, 5000 DP, red level 3 for 3 evolution, Armor Purge, and `[When Attacking] This Digimon gets +3000 DP for the turn.`
- Local KB query: exactly one query, `BT8-012`; Q1701 confirms that the +3000 DP remains after Armor Purge because the effect already activated.
- Rules and boundaries: Armor Purge is a deletion replacement that trashes the top card and prevents deletion; it does not retroactively remove a resolved temporary DP modifier. The attack effect targets this card only and is not inherited.
- Direct authority: `BT8-012.ts:8-42` declares static Armor Purge and a non-inherited When Attacking self `ModifyDP` of +3000 for the turn; registration is exclusively `registerIrCard` at line 42.
- Snapshot: `effects.json:116955-116971` matches the direct effect shape, with full coverage and no residual.
- Focused proof: `BT8-012.test.ts:1-61` verifies the attack modifier and a realistic Armor Purge stack, including the Q1701 persistence case. Shared evidence came from the Armor Purge controller path and DP modifier interpreter.
- Result: no correction. Score: 8/10 provisional (execution gate 0/2).

### BT8-013 — BetelGammamon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:63207-63229` records a red level 4 Champion/Vaccine/Dragonkin, play cost 5, 6000 DP, red level 3 for 2 evolution, and `[When Digivolving] Blitz`.
- Local KB query: exactly one query, `BT8-013`; Q1940 says that if BetelGammamon is moved under Kimeramon by Kimeramon's effect, it gains inherited Blitz but cannot use Blitz retroactively because the trigger window has passed.
- Rules and boundaries: Blitz is a keyword granted at the When Digivolving timing. The timing distinction matters when a card changes zones or becomes a digivolution card after its own trigger window; no name, trait, or color restriction is present in the printed effect.
- Direct authority: `BT8-013.ts:8-25` encodes an empty When Digivolving action with the Blitz keyword and no residual; it registers exclusively with `registerIrCard` at line 25.
- Snapshot: `effects.json:116973-116978` matches the keyword-only representation and full coverage.
- Focused proof: `BT8-013.test.ts:1-43` verifies Blitz after a normal digivolution and the memory/attack boundary. `kimeramon-canoweiss-timing-deck.test.ts:1-55` covers Q1940's non-retroactive inherited timing. Shared evidence included GameEngine When Digivolving dispatch and Blitz attack handling.
- Result: no correction. Score: 8/10 provisional (execution gate 0/2).

### BT8-014 — SkullMeramon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:63232-63253` records a red level 5 Ultimate/Data/Flame, play cost 6, 7000 DP, and red level 4 for 2 evolution; it has no effect text.
- Local KB query: exactly one query, `BT8-014`; no knowledge-base entry.
- Rules and boundaries: this is an effectless card, so no trigger, inherited effect, trait/name filter, or color-boundary behavior is required. The red level-4 evolution cost is the only legal evolution boundary in the catalog.
- Direct authority: `BT8-014.ts:5-11` contains `effects: []`, full coverage, empty residual, and one exclusive `registerIrCard` call at line 11.
- Snapshot: `effects.json:116980` is effectless, full, and residual-free.
- Focused proof: `BT8-014.test.ts:1-43` verifies metadata/play behavior and now imports the direct module plus a legal red level-4 to level-5 evolution for 2 memory.
- Result: no correction. Score: 8/10 provisional (execution gate 0/2).

### BT8-015 — Silphymon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Public DNA lifecycle and peer-isolation test green.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:63256-63284` records a red/yellow level 5 Ultimate/Free/Beastkin, play cost 8, 8000 DP, and either red level 4 for 4 or yellow level 4 for 4 evolution. The When Digivolving text gives one opposing Digimon -5000 DP for the turn, then deletes one opposing Digimon at 5000 DP or less only when DNA digivolving; the inherited When Attacking effect deletes one opposing Digimon at 5000 DP or less.
- Local KB query: exactly one query, `BT8-015`; no knowledge-base entry.
- Rules and boundaries: the direct DNA requirement is red level 4 plus yellow level 4, and `isDnaDigivolving` gates only the second deletion. The temporary -5000 is a separate first action; inherited status applies only to the attack deletion. Target ownership is opponent-only, count is one, and no trait/name filter is implied.
- Direct authority: `BT8-015.ts:10-78` explicitly declares the DNA requirement, When Digivolving -5000, DNA-only Delete with `condition: { kind: "isDnaDigivolving" }`, and inherited When Attacking Delete. It registers exclusively with `registerIrCard` at line 78.
- Snapshot drift: `effects.json:116981-117016` preserves the action sequence but omits the direct `dnaDigivolveRequirement` and omits the direct DNA-only condition on the second Delete. The direct module is authoritative and was not weakened to match the snapshot; `effects.json` was not edited.
- Focused proof: `BT8-015.test.ts:1-73` covers normal versus DNA-only deletion, yellow evolution, and the 5001 boundary. `silphymon-dna-control-deck.test.ts:1-93` covers the red/yellow DNA stack, exact target decisions, and inherited deletion. Shared DNA validation was inspected to confirm exact material requirements.
- Result: no direct correction; snapshot drift documented. Score: 8/10 provisional (execution gate 0/2).

### BT8-016 — MasterTyrannomon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:63287-63315` records a red/green level 5 Ultimate/Vaccine/Dinosaur, play cost 8, 8000 DP, and either red level 4 for 4 or green level 4 for 4 evolution. During your turn all of your Digimon with Tyrannomon in their names gain Security Attack +1; the inherited effect is Security Attack +1.
- Local KB query: exactly one query, `BT8-016`; Q1702 confirms that the Your Turn effect includes MasterTyrannomon itself.
- Rules and boundaries: `nameOrTrait` with name matching is the correct boundary, so names containing Tyrannomon qualify while unrelated names, opponent Digimon, and inherited-only sources do not. The static inherited keyword remains active while the card is in a digivolution stack.
- Direct authority: `BT8-016.ts:8-54` uses a Your Turn mine Digimon filter with `nameOrTrait` token Tyrannomon and name match, count all, permanent Security Attack +1; its static inherited clause grants Security Attack +1. It registers exclusively with `registerIrCard` at line 54.
- Snapshot: `effects.json:117018-117046` matches the name boundary, ownership, count, duration, inherited keyword, full coverage, and empty residual.
- Focused proof: `BT8-016.test.ts:1-65` covers self-inclusion (Q1702), another matching name, nonmatching name, opponent ownership, turn boundary, and inherited Security Attack. Shared matching and static keyword primitives were inspected.
- Result: no correction. Score: 8/10 provisional (execution gate 0/2).

### BT8-017 — UltimateBrachiomon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:63318-63344` records a red/black level 6 Mega/Data/Cyborg/X Antibody, play cost 10, 13000 DP, and either red level 5 for 3 or black level 5 for 3 evolution; it has no effect text.
- Local KB query: exactly one query, `BT8-017`; no knowledge-base entry.
- Rules and boundaries: this is an effectless dual-color card. The relevant boundary is accepting either catalog evolution color at level 5 and rejecting all unrelated colors/levels; no trigger, trait, or inherited behavior is present.
- Direct authority: `BT8-017.ts:5-11` contains `effects: []`, full coverage, empty residual, and one exclusive `registerIrCard` call at line 11.
- Snapshot: `effects.json:117048` is effectless, full, and residual-free.
- Focused proof: `BT8-017.test.ts:1-62` verifies metadata/play behavior and now imports the direct module and proves both red and black level-5 evolution paths at 3 memory each.
- Result: no correction. Score: 8/10 provisional (execution gate 0/2).

### BT8-018 — Marsmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:63347-63369` records a red level 6 Mega/Vaccine/Shaman/Olympos XII, play cost 12, 11000 DP, red level 5 for 3 evolution, and `[Your Turn] This Digimon can also attack your opponent's unsuspended Digimon.`
- Local KB query: exactly one query, `BT8-018`; Q3878 and the later duplicate Q5797 establish that a prohibition restricting attacks to suspended Digimon defeats the permissive “can also attack unsuspended” effect.
- Rules and boundaries: this printed text is a targeted attack permission, not the Vortex keyword. It applies only to this Digimon during your turn; a separate “can’t” effect takes precedence over the permission. No name/trait or color filter is involved.
- Direct authority: `BT8-018.ts:8-31` uses `GrantCanAttackUnsuspended` on self with Your Turn timing and permanent duration, then registers exclusively with `registerIrCard` at line 31.
- Snapshot drift: `effects.json:117049-117064` encodes the self effect as `GainKeyword Vortex`. That generated representation is not faithful to the catalog wording or the direct combat legality seam; the direct module remains authoritative and the snapshot was not edited.
- Focused proof: `BT8-018.test.ts:1-69` imports the direct card, proves an unsuspended attack, proves Q3878/Q5797 prohibition precedence with EX8-016 Dinomon, and now proves red level-5 evolution for 3 memory. Shared combat legality and prohibition handling were inspected.
- Result: no direct correction; snapshot drift documented. Score: 8/10 provisional (execution gate 0/2).

### BT8-019 — Zhuqiaomon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:63372-63394` records a red level 6 Mega/Virus/Holy Bird/Four Sovereigns, play cost 13, 13000 DP, red level 5 for 5 evolution. Its When Digivolving effect has the opponent choose one of their Digimon, deletes all Digimon other than Zhuqiaomon and the chosen Digimon, and gains one memory per Digimon deleted. During your turn, when an opponent's Digimon is deleted, Zhuqiaomon gains Security Attack +1 for the turn for each opponent Digimon deleted.
- Local KB query: exactly one query, `BT8-019`; Q1703-Q1707 cover opponent choice, simultaneous deletion, breeding-area immunity, no-opponent behavior, memory per deletion, and deletion prevention by Decoy/Armor Purge.
- Rules and boundaries: SelectBind pins the opponent's chosen survivor; Delete excludes the source and that selection reference. The deletion scaling counts Digimon deleted by that effect, while the separate Your Turn SubTrigger scales the temporary Security Attack by opponent Digimon deleted in the trigger event. The source is not deleted, and breeding-area cards are not affected by battle-area deletion.
- Direct authority before correction: `BT8-019.ts:55-80` had the correct opponent-Digimon deletion SubTrigger and Security Attack action but omitted its printed “for each” scaling. The When Digivolving SelectBind/Delete/GainMemory sequence at lines 11-53 was already faithful. The module registers exclusively with `registerIrCard` at line 99.
- Correction: `BT8-019.ts:80-88` now adds `scaling: { per: 1, filter: { controller: "opponent", kind: ["Digimon"] }, unit: "cards" }` to the Your Turn SubTrigger. This is 1 corrected direct field on 1 card; no other direct behavior was changed.
- Snapshot: `effects.json:117066-117119` already contains the intended SubTrigger scaling and now matches the corrected direct shape. The snapshot remains read-only.
- Focused proof: `BT8-019.test.ts:1-137` covers opponent choice, both-player deletion and memory, no-opponent behavior, breeding-area immunity, and Armor Purge prevention. Its assertion at lines 38-42 now expects Security Attack +2 after two opposing deletions and documents that a single trigger window still counts both deletions. The BT8-012 Armor Purge peer is imported for the replacement path.
- Result: corrected. Score: 8/10 provisional (execution gate 0/2).

### BT8-020 — Patamon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:63397-63425` records a blue level 3 Rookie/Data/Mammal, play cost 3, 3000 DP, blue level 2 for 0 or yellow level 2 for 0 evolution. Its inherited End of Your Turn effect may DNA digivolve this Digimon and one other Digimon in play into a Digimon card in hand by paying that card's DNA cost.
- Local KB query: exactly one query, `BT8-020`; Q1708-Q1710 confirm that the inherited effect must use this host plus one other own Digimon before the opponent's turn, must choose a hand card with a DNA requirement, and cannot ignore specified DNA materials.
- Rules and boundaries: the host is pinned by `includeRef: "self"`; the partner is another own battle-area Digimon; the destination is the player's hand; `hasDnaDigivolutionRequirement: true` prevents selecting an ordinary non-DNA card; shared DNA validation still enforces exact colors/levels/materials. The effect is inherited and optional at End of Your Turn.
- Direct authority: `BT8-020.ts:8-41` encodes inherited EndOfYourTurn DnaDigivolve with two own Digimon materials, self exclusion for the partner, hand destination, DNA-requirement filter, payCost, and optional true; it registers exclusively with `registerIrCard` at line 41.
- Snapshot drift: `effects.json:117121-117146` represents the target as a generic self-or-other battle-area pool and the destination as a generic `DNA Digivolution` keyword. It does not preserve the direct module's explicit hand/DNA-requirement target boundary. The direct module is authoritative and the snapshot was not edited.
- Focused proof: `BT8-020.test.ts:1-112` imports BT8-015 and BT8-020, proves a legal inherited DNA digivolution, leaves a non-DNA card in hand, rejects an invalid black material, and covers refusal. Shared DNA action selection and `canDnaDigivolve` validation were inspected.
- Result: no correction; snapshot drift documented. Score: 8/10 provisional (execution gate 0/2).

### BT8-021 — Veemon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clause: reveal the top four, add one 2-color blue card, and place the
remaining cards at the bottom in any order. The direct module
`apps/api/src/cards/BT8/BT8-021.ts:8-39` now encodes `RevealAdd` with `revealCount: 4`,
controller mine, `colors: ["Blue"]`, exact `colorCount: 2`, add one to hand, and
`rest: "deckBottom"`. It registers only through
`registerIrCard("BT8-021", compiled)`; there is no `registerCard` duplicate.

Q1711 confirms that a 2-color Option with blue is eligible. Q1712 confirms that
an effect which merely treats a revealed card as blue does not activate from the
deck. The focused test `BT8-021.test.ts:8-15,17-83` statically proves exact color
count and behaviorally covers a two-color Digimon, a two-color Option, the
treated-as-blue boundary, and a three-color blue negative. Its stack test
(`BT8-021.test.ts:85-105`) proves the blue and green level-2 cost-0 evolution
paths.

Correction: the original `multicolor: true` predicate meant two-or-more colors;
the catalog says exactly 2-color. Added `colorCount: 2` and exposed the compiled
object for the static assertion. This is also a snapshot/catalog drift: the
generated BT8-021 entry at `effects.json:117147-117169` lacks the exact count and
therefore is not authoritative for this clause.

### BT8-022 — SnowAgumon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clause: On Play, trash the top evolution card of one opponent Digimon.
The direct module `BT8/BT8-022.ts:8-32` targets an opponent Digimon and uses
`TrashDigivolution` with `amount: 1` and `fromTop: true`; it intentionally does
not require the target to have sources. Registration is exclusively
`registerIrCard("BT8-022", compiled)`.

Q2007 is decisive: a source-free Digimon may be chosen first, then a replacement
effect such as BT10-084/Tactimon can redirect the trash and supply the chosen
card. The focused test `BT8-022.test.ts:8-23` proves normal top-source trashing;
`25-63` proves source-free selection followed by Tactimon redirection. The
target boundary is Digimon-only and opponent-only; no trait, name, or color
restriction is present in the catalog clause. Its blue level-2 cost-0 evolution
requirement was checked against the catalog and neighboring blue Rookie stacks.

Snapshot drift: `effects.json:117170-117189` incorrectly includes
`digivolutionCards: "hasAny"`. That would reject the Q2007 source-free target
before the replacement can apply. The direct module and focused test are the
correct executable evidence; the snapshot was left untouched.

### BT8-023 — Submarimon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clauses: Armor Purge; When Digivolving, trash the bottom evolution card of
one opponent Digimon, then give -3000 DP for the turn to one opponent Digimon with
no evolution cards. `BT8/BT8-023.ts:8-63` encodes the keyword, bottom trash with
`hasAny`, the separate source-free `ModifyDP`, and the alternate Armadillomon
level/name cost 2. Registration is exclusively `registerIrCard`.

Q1713 confirms that the second -3000 clause still activates when no opponent has
an evolution card, so the two actions remain separate and the DP target uses
`digivolutionCards: "none"`. `BT8-023.test.ts:6-53` covers both source-bearing
and source-free branches; `55-89` builds the legal Armadillomon alternate stack,
checks the cost, attacks, and proves Armor Purge restores the lower card. The
opponent target is Digimon-only, and the DP duration is turn-scoped.

Snapshot `effects.json:117190-117219` matches the effect actions. The alternate
evolution requirement is direct-module metadata, which the effects-only snapshot
does not carry; this is expected representation difference, not behavior drift.

### BT8-024 — Angemon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clauses: on your turn, when this Digimon would digivolve with three or
fewer security, Recovery +1 from the deck; inherited When Attacking, if you have
three or more security, return one opponent level-3 Digimon to its owner's hand.
The corrected direct module `BT8/BT8-024.ts:10-70` uses a self-filtered
`Replacement` for `wouldDigivolve`. Its nested `SecurityManipulation` performs
`addTop` for controller mine, source deck, amount 1, with the `zoneCount <= 3`
condition at activation. The inherited action targets opponent Digimon level 3,
returns to hand, and uses `securityAtLeast: 3`. Registration is exclusively
`registerIrCard`.

Q1714 confirms the Recovery timing: after declaring the digivolution and before
paying its cost. The focused test `BT8-024.test.ts:7-31` statically proves the
targetless security primitive and activation-time condition; `33-77` proves the
three-or-fewer and four-security boundary; `79-131` proves inherited target/name/
level and security threshold boundaries; `133-154` proves legal yellow level-3
evolution at cost 3. The source deck and security-stack behavior follows the
shared Recovery primitive, which places the top deck card face-down on security.

Correction: the original direct IR used `GainKeyword` for Recovery without the
required `target`, and duplicated the security condition on the Replacement and
nested action. `runBoardAction` resolves `GainKeyword.target` unconditionally;
the old shape was therefore not executable authority. Replaced it with the
canonical `SecurityManipulation` action and kept the condition at the action
activation site. This is a direct/snapshot correction: the snapshot at
`effects.json:117220-117264` already carries the canonical security action, while
the pre-audit direct module did not.

### BT8-025 — Hookmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clause: inherited When Attacking, trash the bottom evolution card of one
opponent Digimon. `BT8/BT8-025.ts:8-34` uses opponent Digimon plus
`digivolutionCards: "hasAny"`, `amount: 1`, and `fromTop: false`, with exclusive
`registerIrCard` registration.

The focused test `BT8-025.test.ts:6-48` proves bottom-source trash and the no-source
no-op boundary. `50-85` proves both catalog evolution paths: blue and black
level-3 bases at cost 2. The target remains opponent Digimon-only; no trait/name
or color overreach exists. The shared bottom-stack primitive and BT8-022/BT8-023
top-versus-bottom peers agree with this orientation.

Snapshot `effects.json:117265-117285` matches direct IR. No correction was needed.

### BT8-026 — Halsemon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clauses: Armor Purge; When Attacking, delete one opponent level-3
Digimon. `BT8/BT8-026.ts:8-48` encodes the keyword and exact opponent level-3
target, plus the alternate Hawkmon cost-2 evolution requirement. Registration is
exclusive `registerIrCard`.

`BT8-026.test.ts:6-24` proves deletion of a level 3, and `26-74` builds the legal
Hawkmon alternate stack, proves cost 2, confirms a higher-level defender is not
selected, and checks Armor Purge. Trait/name/color boundaries are catalog-driven;
the action has no unprinted broader target. Snapshot `effects.json:117286-117301`
matches the effect IR; the evolution metadata is direct-module-only as expected.

### BT8-027 — Scorpiomon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog identifies a blue level-5 Ultimate / Data / Ancient Crustacean with
blue level-4 evolution cost 2 and no effect text (`cards.json:63593-63614`). The
direct module `BT8/BT8-027.ts:5-11` is an empty full-coverage compilation and
registers exclusively with `registerIrCard`. `BT8-027.test.ts:5-21` checks name,
color, level, cost, DP, trait, normal play, and absence of a pending effect.
Legal level/color evolution metadata and vanilla peer behavior were inspected;
there is no rule clause requiring additional IR. Snapshot `effects.json:117302`
is empty/full and matches exactly.

### BT8-028 — CaptainHookmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clause: All Turns, when the opponent plays a level-5-or-higher Digimon,
gain one memory and draw one. `BT8/BT8-028.ts:8-43` uses an All Turns SubTrigger
with event `whenPlayed`, opponent controller, Digimon kind, and level comparison
`gte 5`; actions gain memory 1 and draw 1 for the controller. Registration is
exclusive `registerIrCard`.

Q1717 confirms an opponent digivolution into level 5+ is not a play. Q1718 confirms
moving a level-5+ Digimon from breeding is not a play. `BT8-028.test.ts:7-21`
proves the positive play event; `23-47` proves digivolution is excluded; `49-67`
proves breeding movement is excluded. The suite also uses a legal blue level-4
to level-5 evolution stack in the negative test. Snapshot
`effects.json:117303-117326` matches direct IR.

### BT8-029 — Frozomon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clauses: Blocker; during your turn, this Digimon cannot attack while the
opponent has a Digimon with an evolution card in play; inherited All Turns / Once
Per Turn, when an opponent Digimon's evolution card is trashed, return one
opponent level 3 to its owner's hand. The corrected direct module
`BT8/BT8-029.ts:16-93` encodes Blocker, a battle-area opponent Digimon filter with
`digivolutionCards: "hasAny"`, and an inherited `whenDigivolutionTrashed`
SubTrigger with opponent Digimon source filtering and parent
`frequency: "OncePerTurn"`. Registration is exclusively `registerIrCard`.

Q1719 confirms breeding-area Digimon are excluded; the Aura therefore retains
`zone: "battleArea"`. Q1720 confirms the inherited trigger activates on opponent
Digi-Burst. `BT8-029.test.ts:7-21` statically proves the once-per-turn shape and
absence of a permanent `once` flag; `26-44` proves Blocker and the sourced attack
restriction; `46-68` proves breeding-area exclusion; `70-99` proves return after
SnowAgumon trash; and the remaining Digi-Burst test proves the Q1720 event path.
The target is opponent level-3 Digimon only. Existing host-stack coverage and the
catalog blue level-4 cost-3 evolution boundary were checked.

Correction: the pre-audit SubTrigger had `once: true`, which permanently removes
the subscription after its first event. That contradicts the printed Once Per
Turn frequency; the interpreter's once-per-turn ledger is the resettable mechanism.
Removed the permanent one-shot flag and exposed the compiled object for the static
assertion. Snapshot `effects.json:117327-117360` is drifted in two ways: its Aura
does not carry the direct source-count predicate, and its inherited watcher omits
the direct opponent source filter. The direct module is executable authority and
was retained as the stronger clause evidence.

### BT8-030 — Surfimon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog identifies a blue/black level-6 Mega / Vaccine / Cyborg with blue or
black level-5 evolution cost 3, play cost 10, DP 13000, and no effect text
(`cards.json:63668-63695`). `BT8/BT8-030.ts:5-11` is empty/full coverage and
registers exclusively with `registerIrCard`. `BT8-030.test.ts:5-21` checks the
catalog metadata, normal play, cost, and absence of a pending effect. The legal
level-5 stack boundaries and adjacent vanilla behavior were inspected. Snapshot
`effects.json:117361` matches exactly.

### BT8-031 — FrosVelgrmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Blue level-6 Digimon, Giant Bird/Virus, DP 12000; blue level-5 evolution cost 4. `[When Digivolving]` trash the top digivolution card of one opposing Digimon, then return one opposing Digimon with no digivolution cards to its owner's hand. `[Opponent's Turn]` all opposing Digimon gain `[When Attacking] Trash the bottom digivolution card of this Digimon.`

**Direct implementation.** `apps/api/src/cards/BT8/BT8-031.ts:8-61` has full-coverage IR. The first action targets one opposing Digimon with any digivolution cards and trashes one from the top; the second targets one opposing Digimon with no digivolution cards and returns it to hand. The Opponent's Turn action targets all opposing Digimon and carries the exact quoted text through the shared named-grant library.

**Static behavior and stack proof.** `BT8-031.test.ts:20-76` proves the grant is installed, the granted host attacks, and its bottom—not top—source leaves the stack; the negative test at `:78-115` proves no grant means no trash. Both fixtures were corrected to the legal red stack BT1-001 level 2 → BT1-009 level 3 → BT1-014 level 4. The direct action's `fromTop: false`, the grant library, and the attack-scope builder jointly prove the bottom-card and host boundaries. There is no name, trait, or color predicate in this card's printed clause beyond its blue catalog identity.

**Snapshot and score.** Snapshot `effects.json:117362-117399` matches the direct action shape; its quoted grant depends on the interpreter library, which was verified read-only. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-032 — Imperialdramon: Fighter Mode

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Blue/green level-6 Digimon, Ancient Dragonkin/Free, DP 13000; blue or green level-5 evolution cost 5. `[When Digivolving]` return one opposing Digimon with 10000 DP or less to hand. `[When Attacking][Once Per Turn]` if a blue card is in this stack, unsuspend one of yours; if a green card is in this stack, suspend one opposing Digimon.

**Direct implementation.** `BT8-032.ts:8-78` matches the return threshold, two separate attack actions, Once Per Turn frequency, and semantic `selfDigivolutionStackHasColor` blue/green conditions. Its alternate evolution requirement is the exact name token `Dragon Mode` for cost 2, matching the card's named route.

**Static behavior and stack proof.** `BT8-032.test.ts:8-27` covers the inclusive 10000-DP return. The attack fixture at `:29-49` was corrected from an impossible level-3-under-level-6 stack to the legal blue level-3 BT1-029 → blue level-4 ST9-04 → blue/green level-5 ST9-05 → BT8-032 line, proving both conditions from separate cards. The real DNA line at `:51-128` and the single blue/green-source case at `:130-164` corroborate Q1721/Q1722; `:166-184` covers the Dragon Mode route. No trait or color-treatment shortcut is used: stack colors are read from printed definitions.

**Snapshot drift and score.** Snapshot `effects.json:117400-117434` matches the actions but serializes both stack-color predicates as `raw` conditions; the direct module is the executable semantic authority. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-033 — Armadillomon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Yellow level-3 Mammal/Free Digimon, DP 2000; yellow or blue level-2 evolution cost 0. `[On Play]` reveal the top four cards of the deck, add one two-color yellow card among them to hand, and place the remainder at the bottom of the deck in any order.

**Direct implementation.** `BT8-033.ts:8-36` uses `RevealAdd` with reveal count four, one controller-default candidate requiring `multicolor: true` and yellow, and `deckBottom` for all remaining revealed cards. The matcher checks printed card colors and kind-independent candidates, so a yellow Option qualifies.

**Static behavior and stack proof.** `BT8-033.test.ts:7-50` covers a yellow/red Digimon, a two-color yellow Option, remainder count, and a card only treated as yellow in play as a negative. Q1723/Q1724 and comprehensive reveal rules prove that effective board color treatments do not alter a revealed card's printed definition. The blue BT8-002 level-2 → BT8-033 level-3 route at `:52-75` proves the zero-cost alternate evolution.

**Snapshot and score.** Snapshot `effects.json:117435-117457` matches the direct reveal filter and disposition. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-034 — Elecmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Yellow level-3 Mammal/Data Digimon, DP 4000, play cost 3; yellow level-2 evolution cost 0; no effect text.

**Direct implementation.** `BT8-034.ts:5-11` is an empty full-coverage IR and exclusively registers BT8-034. No behavior is invented for this effectless card.

**Static behavior and stack proof.** `BT8-034.test.ts:5-18` checks name, color, level, play cost, DP, Mammal trait, normal play, memory payment, and no pending decision. Its yellow level-2 route was checked in the catalog. BT8-034 is also used as a non-Armor-Form control in the BT8-038 scaling test.

**Snapshot and score.** Snapshot `effects.json:117458` is the same empty full-coverage IR. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-035 — Candlemon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Yellow level-3 Flame/Data Digimon, DP 2000; yellow or purple level-2 evolution cost 0. Inherited: `[Your Turn][Once Per Turn] When you play another purple Digimon, gain 1 memory.`

**Direct implementation.** `BT8-035.ts:8-38` carries an inherited Your Turn Once Per Turn SubTrigger watching a separately played, non-self, purple Digimon and gaining one memory. The source filter is kind Digimon, color Purple, controller mine, and `excludeSelf: true`.

**Static behavior and stack proof.** `BT8-035.test.ts:6-58` covers one qualifying play, two plays in one turn (one memory only), and an opponent's purple play (no gain). The three inherited-effect host fixtures were corrected from the impossible BT8-041 level-5-over-level-3 arrangement to legal BT8-035 level 3 → BT8-037 yellow/red level 4 hosts. The purple BT8-006 level-2 route is checked at `:60-79`. No trait or name matching is used; purple printed color plus Digimon kind is the boundary.

**Snapshot and score.** Snapshot `effects.json:117459-117482` matches the direct SubTrigger. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-036 — Ankylomon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Yellow level-4 Ankylosaur/Free Digimon, DP 4000, play cost 4; yellow or blue level-3 evolution cost 2. When this card would be played from hand, reduce its play cost by 1 if its controller has a blue Digimon in play. Inherited: `[When Attacking]` if its controller has a blue Digimon in play, one opposing Digimon gets -3000 DP for the turn.

**Direct implementation.** `BT8-036.ts:7-75` contains the nested conditional `wouldBePlayed` reduction and the inherited When Attacking -3000 DP action. Its outer replacement source filter includes `isSelfRef: true`, so a resident Ankylomon replacement cannot reduce an unrelated card; the nested pay-time reducer is also in the shared verified self-reducer allowlist. The condition is a live battle-area Digimon with blue color; the inherited action targets one opposing Digimon and lasts for the turn.

**Static behavior and stack proof.** Tests at `BT8-036.test.ts:21-75` prove automatic cost 3 with a blue Digimon, full cost 4 with none, and full cost 3 for unrelated BT8-034 despite the blue Digimon. The inherited-effect proof at `:76-102` uses legal BT8-034 level 3 → BT8-036 level 4 → BT8-041 level 5 evolution material plus a separate blue BT1-030 ally, then verifies the inherited -3000 DP action on attack. This avoids conflating the cost reducer with inherited behavior and proves self scope, the blue condition, target scope, and duration. No name or trait predicate is present.

**Snapshot and score.** Snapshot `effects.json:117483-117534` matches the direct nested replacement and inherited action but predates the direct outer `sourceFilter.isSelfRef` scope. The generated snapshot remains read-only; the direct module is authoritative for preventing unrelated-card reductions. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-037 — Dinohyumon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Yellow/red level-4 Dragonkin/Data Digimon, DP 5000, play cost 5; yellow or red level-3 evolution cost 2. Inherited: `[When Attacking]` one opposing Digimon gets -1000 DP for the turn.

**Direct implementation.** `BT8-037.ts:8-33` is a full-coverage inherited When Attacking action targeting exactly one opposing Digimon, with -1000 for the turn. The default attack scope keeps the effect on the host's attack and the effect has no irrelevant color or trait restriction.

**Static behavior and stack proof.** `BT8-037.test.ts:6-88` covers the positive target, chosen-target-only behavior with another opposing Digimon unchanged, and the opponent-attacks negative. The host BT8-042 level-5 stack over BT8-037 level 4 is catalog-legal, and `:90-122` proves both yellow and red level-3 evolution routes at cost 2.

**Snapshot and score.** Snapshot `effects.json:117535-117552` matches the direct action. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-038 — Magnamon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Yellow/blue level-4 Armor Form/Holy Warrior/Royal Knight, DP 7000, play cost 7; yellow or blue level-3 evolution cost 4. `<Blocker><Armor Purge>`. `[When Digivolving]` unsuspend this Digimon and give it +2000 DP until the end of the opponent's next turn for each [Armor Form] card in its trash.

**Direct implementation.** `BT8-038.ts:7-75` grants Blocker and Armor Purge, always unsuspends the host, and applies own-trash Armor Form scaling only to +2000 DP until opponent-turn end. The scaling filter is a trait match, not a name substring; alternate evolution is `namesExact: ["Veemon"]` for cost 3.

**Static behavior and stack proof.** `BT8-038.test.ts:5-24` proves two Armor Form cards produce +4000 and unsuspend the host; the fixture now also includes non-Armor BT8-034 Elecmon, proving it does not overcount by kind or color. The no-Armor regression at `:26-44` proves unsuspend is unconditional rather than being gated by the DP scaling count. The alternate Veemon route and `:46-84` Armor Purge test prove the exact-name route, keyword behavior, and persistence of the DP boost after the current top card is trashed. Q1726 agrees with the `untilOpponentTurnEnd` duration.

**Snapshot and score.** Snapshot `effects.json:117553-117599` is stale because it incorrectly attaches the Armor Form scaling to Unsuspend; the direct module keeps that scaling only on ModifyDP while preserving the snapshot's keywords, duration, and alternate requirement. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-039 — Rapidmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Yellow/green level-4 Holy Warrior/Vaccine Digimon, DP 6000, play cost 6; yellow or green level-3 evolution cost 4. `<Armor Purge>`. `[When Digivolving]` suspend one opposing Digimon for each Tamer in play, then up to three opposing suspended Digimon get -5000 DP for the turn.

**Direct implementation.** `BT8-039.ts:8-69` uses exact-name `Terriermon` alternate evolution cost 3, grants Armor Purge, scales the first suspend action by own battle-area Tamers, and caps the second target selection at `count: 3, upTo: true` over opposing suspended Digimon. The actions are separate, so newly suspended Digimon are eligible for the second clause.

**Static behavior and stack proof.** `BT8-039.test.ts:5-36` uses two Tamers and four opposing Digimon; it proves all four become suspended but only three receive -5000, as required by Q1727. The exact-name Terriermon alternate route and Armor Purge are covered at `:38-71`; Terriermon Assistant is a negative exact-name boundary at `:73-91`, which prevents substring matching from granting the special cost. No trait-based alternate route is substituted for the printed name route.

**Snapshot and score.** Snapshot `effects.json:117600-117630` matches the direct cap, scaling, keyword, and alternate requirement. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-040 — Betsumon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Yellow level-5 Puppet/Data Digimon, DP 7000, play cost 6; yellow level-4 evolution cost 3. `[When Digivolving]` may trash one card in hand to treat this Digimon as also having the colors of the trashed card for the turn. Then, if it has two or more colors, draw two.

**Direct implementation and correction status.** `BT8-040.ts:6-43` is the checked-in direct correction for the generated snapshot's narrow hand filter and unconditional follow-up shape. It optionally trashes one own hand card of kind Digimon, Tamer, or Option, binds the actual trashed instance, grants every printed color of that instance for the turn only when the trash moved a card, and draws two only when that action acted and the host has at least two effective colors.

**Static behavior and stack proof.** `BT8-040.test.ts:11-48` was strengthened to select BT8-105 Dark Gaia Force, a black/red Option, proving the clause accepts a non-Digimon hand card and produces yellow/black/red before Draw 2. The decline case at `:50-91` starts with a yellow/red host, declines the optional trash, and proves no draw and no trash despite the host already being multicolor. The yellow BT8-036 level 4 → BT8-040 level 5 stack is legal; the second test uses the yellow/red BT8-037 level-4 route.

**Snapshot drift and score.** Snapshot `effects.json:117631-117653` is stale: it permits only a Digimon hand target, serializes the trash as an optional action without the direct result binding, and gates Draw 2 only on a raw two-color condition. The direct module is executable authority and correctly implements any hand card plus “if you did” provenance. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT8-041 — Kyukimon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:63982-64010` records a yellow/purple level-5 Ultimate/Virus/Mysterious Beast, play cost 7, 9000 DP, with yellow level 4 for 3 or purple level 4 for 3 evolution and no effect text.
- Local KB query: exactly one query, `BT8-041`; no knowledge-base entry.
- Rules and boundaries: this is an effectless dual-color card. The only behavior boundary is accepting either specified level-4 color at the stated cost; no name, trait, trigger, inherited effect, or target filter is present.
- Direct authority: `apps/api/src/cards/BT8/BT8-041.ts:5-11` contains `effects: []`, `coverage: "full"`, and `residual: []`; it registers exclusively with `registerIrCard("BT8-041", compiled)` at line 11.
- Snapshot: `effects.json:117654` is effectless with full coverage and an empty residual list; it matches the direct module.
- Shared and peer evidence: registration normalization was checked, and effectless peer modules in this range were compared to ensure no hidden inherited effect or generated residual was required.
- Focused proof: `BT8-041.test.ts:1-62` now imports the direct module, verifies metadata/play behavior, and statically proves both yellow and purple level-4 evolution paths for 3 memory each.
- Result and score: no correction; 8/10 provisional (executed gate 0/2).

### BT8-042 — Shakkoumon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64011-64041` records a yellow/blue level-5 Ultimate/Free/Mutant, play cost 8, 8000 DP, yellow level 4 for 4 or blue level 4 for 4 evolution, an inherited When Attacking -3000 DP effect, and a DNA-only When Digivolving sequence: at 5 or fewer security, Recovery +1 (Deck), then return one opposing Digimon whose level is at most the number of cards in your security.
- Local KB query: exactly one query, `BT8-042`; no knowledge-base entry.
- Rules and boundaries: DNA material must be one yellow level 4 and one blue level 4. Recovery is conditional on the current security count and adds the top deck card to security; the Return branch is independently gated to DNA digivolving and uses the resulting security count. The Return filter is opponent battle-area Digimon only, with a dynamic level comparison; the inherited DP modifier applies to one opposing Digimon and lasts for the turn.
- Direct authority: `BT8-042.ts:10-88` declares the yellow/blue DNA requirement, `SecurityManipulation` with `zoneCount` `lte 5`, a DNA-gated dynamic `Return` with `kind: ["Digimon"]`, and inherited opponent `ModifyDP` -3000 for the turn. It registers exclusively with `registerIrCard("BT8-042", compiled)` at line 88.
- Snapshot drift: `effects.json:117655-117707` has full coverage and no residual but omits the direct DNA requirement, omits the direct `kind: ["Digimon"]` on Return, and omits `condition: { kind: "isDnaDigivolving" }`. The direct module is the hand-authored runtime override and remains authoritative.
- Shared and peer evidence: DNA requirement matching and `SecurityManipulation`/dynamic level comparison were inspected; BT8-015 was reviewed as the same DNA-and-condition mechanism. Name and trait matching are not involved, and no color filter is incorrectly applied to the returned target.
- Focused proof: `BT8-042.test.ts:1-84` imports the direct module and covers normal recovery at five security, yellow/blue level-4 DNA material, DNA-only dynamic Return, and inherited -3000 DP. The static test evidence is present but was not run.
- Result and score: no direct correction; snapshot drift recorded; 8/10 provisional (executed gate 0/2).

### BT8-043 — Cherubimon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64042-64071` records a yellow level-6 Mega/Vaccine/Cherub/Three Great Angels, play cost 11, 12000 DP, yellow or purple level 5 for 4 evolution. When played from hand, it may delete one of its owner's purple [Cherubimon] to reduce this card's play cost by 8. On Play and When Digivolving, for each owned Tamer, one opposing Digimon gets Security Attack -2 until the end of the opponent's next turn.
- Local KB query: exactly one query, `BT8-043`; Q1730 says each Tamer causes a separate activation and each activation can choose a different target; Q1731 says the multiple activations are treated as one timing for timing purposes.
- Rules and boundaries: the replacement must be self-scoped to this card being played from hand. Its optional cost action can delete exactly one own purple card with [Cherubimon] in its name, then reduce this card's cost by 8. The Tamer count is own Tamers in the battle area, and `RepeatPerCount` must resolve one opponent Digimon target per Tamer rather than one target for the whole aggregate count. The temporary Security Attack penalty persists through the opponent's next turn.
- Direct authority: `BT8-043.ts:18-124` contains the self-scoped `wouldBePlayed` replacement, own-purple-name deletion, nested `mode: "reduceCost", amount: 8`, and separate OnPlay/WhenDigivolving `RepeatPerCount` actions with own Tamer count filters and one opposing Digimon per activation. It registers exclusively with `registerIrCard("BT8-043", compiled)` at line 124.
- Snapshot drift: `effects.json:117708-117759` has full coverage and no residual, but its replacement source filter omits direct `isSelfRef`, its nested reducer does not preserve the direct reduce-cost mode/amount, and its OnPlay/WhenDigivolving representation uses one `GainKeyword` action rather than the direct per-Tamer repetition. The direct reducer and timing implementation are authoritative.
- Shared and peer evidence: `RepeatPerCount` board dispatch, replacement reducer capture, optional cost-action execution, and reducer registry support for BT8-043 were inspected. Same-mechanism RepeatPerCount card modules and reduction tests were compared. The name boundary is exact substring/name matching for [Cherubimon], while color is explicitly purple; no trait-only or opponent-owned card can pay the cost.
- Focused proof: `BT8-043.test.ts:23-138` statically covers reduced cost, declined full cost, and two Tamers producing two independently selected opposing targets. The direct module and focused proof were not executed.
- Result and score: no direct correction; snapshot drift recorded; 8/10 provisional (executed gate 0/2).

### BT8-044 — Azulongmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64072-64101` records a yellow/blue level-6 Mega/Data/Holy Dragon/Four Great Dragons/Four Sovereigns, play cost 12, 11000 DP, yellow or blue level 5 for 3 evolution. When Attacking, it may trash the top card of its owner's security stack to gain 2 memory. During its owner's turn, once per turn, when one of that player's other Digimon digivolves, it may unsuspend that digivolving Digimon.
- Local KB query: exactly one query, `BT8-044`; Q1732 confirms that the Your Turn effect triggers only when another/other Digimon digivolves and does not unsuspend Azulongmon itself when Azulongmon digivolves suspended.
- Rules and boundaries: the attack cost is top-of-owner-security, not deck or an arbitrary security card. The sub-trigger is own-turn and once-per-turn, excludes the source card itself, and targets the event's digivolving subject via `sourceRef: "triggerSubject"`; it does not target Azulongmon by default. Unsuspension is optional and applies to that subject.
- Direct authority: `BT8-044.ts:10-63` declares the optional `GainMemory` with a mine/security trash cost and a once-per-turn `whenOneOfYoursDigivolves` sub-trigger whose source filter excludes self and whose `Unsuspend` target is `triggerSubject`. It registers exclusively with `registerIrCard("BT8-044", compiled)` at line 63.
- Snapshot drift: `effects.json:117760-117797` has full coverage and no residual, but the generated cost filter omits the direct `zone: "security"`; the generated sub-trigger omits `excludeSelf` and `sourceRef: "triggerSubject"`, producing a self-target-shaped representation. The direct module is authoritative and the snapshot remains read-only.
- Shared and peer evidence: security-trash cost resolution, `whenOneOfYoursDigivolves` event matching, source filters, trigger-subject resolution, and once-per-turn frequency were inspected. Same-event sub-trigger peers such as BT8-088 and the shared sub-trigger action were reviewed. Color, name, and trait boundaries are irrelevant to the event beyond own Digimon ownership.
- Focused proof: `BT8-044.test.ts:1-78` covers security trash plus memory gain, an other Digimon's digivolution and unsuspension, Azulongmon remaining suspended, and now a legal yellow level-5 evolution for 3 memory. The proof was not executed.
- Result and score: no direct correction; snapshot drift recorded; 8/10 provisional (executed gate 0/2).

### BT8-045 — Ekakimon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64102-64125` records a green level-3 Rookie/Data/Mutant, play cost 2, 3000 DP, green level 2 for 0 evolution, and no effect text.
- Local KB query: exactly one query, `BT8-045`; no knowledge-base entry.
- Rules and boundaries: this is an effectless green card; only the green level-2, zero-cost evolution boundary applies. There is no target, trait/name, trigger, or inherited behavior.
- Direct authority: `apps/api/src/cards/BT8/BT8-045.ts:5-11` contains an effectless full-coverage compiled record and one exclusive `registerIrCard("BT8-045", compiled)` call at line 11.
- Snapshot: `effects.json:117798` is effectless, full, and residual-free; it matches the direct module.
- Shared and peer evidence: effectless registration and legal evolution handling were compared with BT8-041 and other effectless range peers; no hidden generated behavior exists.
- Focused proof: `BT8-045.test.ts:1-42` now imports the direct module, verifies metadata/play behavior, and statically proves green level-2 evolution for zero memory.
- Result and score: no correction; 8/10 provisional (executed gate 0/2).

### BT8-046 — Terriermon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64126-64150` records a green level-3 Rookie/Vaccine/Beast, play cost 3, 2000 DP, green level 2 for 0 evolution. On Play, it may reveal the top five cards of the deck, add one card with [Gargomon] or [Rapidmon] in its name to hand, and place the remaining revealed cards at the bottom in any order.
- Local KB query: exactly one query, `BT8-046`; no knowledge-base entry.
- Rules and boundaries: RevealAdd reveals exactly five from the owner's deck, permits declining before reveal, matches the name tokens Gargomon or Rapidmon (not a trait-only match), adds at most one to hand, and bottoms every other revealed card in any order. No opponent, color, or unrelated trait filter is implied by the text.
- Direct authority: `BT8-046.ts:8-41` uses optional `RevealAdd` with reveal count 5, own deck/hand boundaries, `nameOrTrait` tokens Gargomon and Rapidmon with `match: "name"`, one selected card, and deck-bottom handling for the remainder. It registers exclusively with `registerIrCard("BT8-046", compiled)` at line 41.
- Snapshot: `effects.json:117799-117825` matches the direct RevealAdd, name boundary, count, optionality, and full/no-residual coverage.
- Shared and peer evidence: reveal/add/deck-bottom ordering and name-or-trait matching were inspected alongside RevealAdd peers BT8-021, BT8-058, and BT8-060. The direct filter does not accidentally include a card merely because of a trait or color.
- Focused proof: `BT8-046.test.ts:1-91` imports the direct module and covers Rapidmon and Gargomon selection, bottoming other revealed cards, declining before reveal, and now legal green level-2 evolution for zero memory. The proof was not run.
- Result and score: no correction; 8/10 provisional (executed gate 0/2).

### BT8-047 — Pulsemon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64151-64175` records a green level-3 Rookie/Vaccine/Beastkin, play cost 3, 2000 DP, green level 2 for 0 evolution. Its inherited All Turns effect gives this Digimon +1000 DP for each other suspended Digimon its owner has.
- Local KB query: exactly one query, `BT8-047`; no knowledge-base entry.
- Rules and boundaries: this is inherited and therefore applies to a host while Pulsemon is in its digivolution stack. The scaling counts other own suspended Digimon, excludes the host itself, and does not count an opponent's suspended Digimon, unsuspended Digimon, Tamers, or cards in breeding/security.
- Direct authority: `BT8-047.ts:8-43` declares inherited AllTurns `ModifyDP` on self with +1000 permanent scaling per one card, mine controller, `kind: ["Digimon"]`, `suspended: true`, and `excludeSelf: true`. It registers exclusively with `registerIrCard("BT8-047", compiled)` at line 43.
- Snapshot: `effects.json:117826-117848` matches the inherited scaling, self target, permanent duration, and full/no-residual coverage.
- Shared and peer evidence: inherited-effect collection, scaling, suspension, controller, kind, and self-exclusion matching were inspected; BT8-050 was reviewed as the same scaling mechanism. Name, trait, and color do not alter the printed inherited filter.
- Focused proof: `BT8-047.test.ts:1-48` covers two other own suspended Digimon while excluding the host and an opponent suspended Digimon, and now statically proves the inherited result after legal green level-2 evolution for zero memory. The test was not executed.
- Result and score: no correction; 8/10 provisional (executed gate 0/2).

### BT8-048 — Shurimon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64176-64200` records a green/red level-4 Armor Form/Free/Mutant, play cost 4, 4000 DP, green level 3 for 3 evolution, Armor Purge, and a When Digivolving effect restricting one opposing Digimon with Blocker so it cannot attack or block until the end of the opponent's next turn.
- Local KB query: exactly one query, `BT8-048`; Q1733 confirms that after selecting the opposing Blocker, the restriction persists through the end of the opponent's next turn even if that Digimon later loses Blocker.
- Rules and boundaries: Armor Purge is a deletion replacement, not an attack restriction. The direct evolution requirement additionally includes the legal alternate Hawkmon path for 2 memory. Restrict selects exactly one opponent battle-area Digimon currently matching Blocker, then applies attack-and-block prohibitions for the specified duration; prohibition precedence preserves the restriction after the keyword is removed.
- Direct authority: `BT8-048.ts:9-50` declares the alternate Hawkmon requirement at cost 2, static Armor Purge, and When Digivolving `Restrict` with opponent Digimon + Blocker filter, `attackOrBlock`, and `untilOpponentTurnEnd`. It registers exclusively with `registerIrCard("BT8-048", compiled)` at line 50.
- Snapshot drift: `effects.json:117849-117869` matches the Armor Purge and Restrict behavior with full coverage and no residual, but omits the direct alternate Hawkmon evolution requirement. The shared generated override at `packages/shared/src/effects/data.ts:866-868` supplies that alternate requirement; neither the snapshot nor shared effects JSON was edited.
- Shared and peer evidence: Restrict target resolution, attack/block prohibition persistence, Blocker keyword matching, Armor Purge handling, and alternate-evolution matching were inspected with Restrict peers BT8-071, BT8-097, and BT8-098. No name/trait boundary is present; the only target boundary is opponent + Blocker.
- Focused proof: `BT8-048.test.ts:1-54` statically covers Hawkmon alternate evolution for 2, the attack/block restriction, loss of Blocker after selection, and Armor Purge in battle. The test was not run.
- Result and score: no direct correction; snapshot drift recorded; 8/10 provisional (executed gate 0/2).

### BT8-049 — Namakemon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64201-64225` records a green level-4 Champion/Virus/Puppet, play cost 4, 3000 DP, green level 3 for 2 evolution. Its Main effect may suspend this Digimon to reveal the top three cards of the deck, add one green Digimon to hand, and place the remaining revealed cards at the bottom in any order.
- Local KB query: exactly one query, `BT8-049`; no knowledge-base entry.
- Rules and boundaries: the Main effect is optional, costs suspension of this card itself, reveals exactly three from the owner's deck, adds one own-color green Digimon (not a Tamer or opponent card), and bottoms all other revealed cards. The per-use action cannot be activated a second time if its once-per-turn/per-use timing is already consumed; self-suspension is an explicit cost.
- Direct authority: `BT8-049.ts:8-48` declares optional Main RevealAdd with reveal 3, green Digimon matching, hand destination, deck-bottom remainder, and an explicit self-reference suspension cost. It registers exclusively with `registerIrCard("BT8-049", compiled)` at line 48.
- Snapshot: `effects.json:117870-117898` matches the RevealAdd, self-suspension cost, green Digimon filter, optionality, full coverage, and empty residual list.
- Shared and peer evidence: RevealAdd selection/bottoming, self-reference cost handling, activation consumption, and green Digimon kind/color filtering were inspected alongside BT8-046 and other reveal peers. Name and trait matching are not used, so unrelated green cards are excluded by kind rather than name.
- Focused proof: `BT8-049.test.ts:1-60` covers positive reveal/add behavior, self-suspension, rejection of a second activation, and now legal green level-3 evolution for 2 memory. The proof was not executed.
- Result and score: no correction; 8/10 provisional (executed gate 0/2).

### BT8-050 — Exermon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64226-64255` records a green level-4 Champion/Data/Insectoid, play cost 5, 5000 DP, green level 3 for 2 evolution. When Digivolving, it may suspend one of its owner's Digimon to suspend one opponent Digimon. Its inherited All Turns effect gives its host +1000 DP for each other suspended Digimon its owner has.
- Local KB query: exactly one query, `BT8-050`; Q1734 confirms that this Digimon itself may be selected as the own-Digimon suspension cost.
- Rules and boundaries: the When Digivolving cost selects one own Digimon with no `excludeSelf`, so the source itself is legal; the effect target is one opposing Digimon. The inherited scaling is host-excluding and counts only other own suspended Digimon, using the same boundary as BT8-047.
- Direct authority: `BT8-050.ts:8-70` declares optional own-Digimon `Suspend` cost and opposing-Digimon `Suspend` target, then inherited AllTurns self `ModifyDP` +1000 per other own suspended Digimon. It registers exclusively with `registerIrCard("BT8-050", compiled)` at line 70.
- Snapshot: `effects.json:117899-117930` matches both suspend actions, inherited scaling, full coverage, and empty residual list.
- Shared and peer evidence: suspend-cost/target sequencing, optional costs, self-reference behavior, inherited scaling, and host exclusion were inspected with board primitives and BT8-047's same scaling mechanism. No name/trait boundary affects either printed effect, and ownership is explicit in both cost and target filters.
- Focused proof: `BT8-050.test.ts:1-81` covers normal evolution followed by separate own-cost/opponent-target suspension, Q1734 self-cost selection after evolution, and inherited +1000 scaling for two other suspended Digimon. The proof was not run.
- Result and score: no correction; 8/10 provisional (executed gate 0/2).

### BT8-051 — Digmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clause: green level-3 evolution for 3; Armor Purge; When Attacking, one
opponent's suspended Digimon gets -3000 DP for the turn
(`cards.json:64252-64274`). The direct module
`apps/api/src/cards/BT8/BT8-051.ts:8-45` carries exactly the Static Armor Purge
keyword and WhenAttacking ModifyDP target (opponent, suspended, Digimon),
amount -3000, `forTheTurn`; registration is exclusively
`registerIrCard("BT8-051", compiled)` with no `registerCard` call.

The focused test `BT8-051.test.ts:7-9` statically proves that no stale
`digivolutionRequirement` override remains; `11-29` proves the suspended-target
and -3000 boundary; `32-63` proves the legal green level-3 cost-3 stack and
Armor Purge after a losing battle. The catalog has no name, trait, or color
restriction on the attack target beyond opponent/suspended/Digimon, and the
Armor Purge peer behavior agrees with BT8-023 and BT8-026. Comprehensive
§16-19 (`comprehensive.md:3001-3013`) supplies the optional top-card deletion
replacement semantics.

Correction: the pre-audit direct module incorrectly added an alternate
Armadillomon name requirement at cost 2. That requirement was absent from the
committed catalog, which specifies only green level 3 at cost 3, so the entire
stale `digivolutionRequirement` field was removed and `compiled` was exported for
static proof. The effect snapshot (`effects.json:117937-117954`) already matched
the printed effect actions; its omission of evolution metadata is expected, so
no snapshot edit was made.

### BT8-052 — Drimogemon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog defines an effectless green level-4 Champion / Data / Beast with
green level-3 cost-1 evolution (`cards.json:64277-64298`). The direct module
`BT8-052.ts:5-11` is empty/full coverage with exactly one
`registerIrCard("BT8-052", compiled)` registration and no legacy duplicate.
The focused test `BT8-052.test.ts:6-20` checks name, green color, level, play
cost, DP, Beast type, normal play cost, and no pending effect. The legal stack
boundary is green level 3 at cost 1; there are no name/trait/color effect
predicates to over-match. The empty/full snapshot at
`effects.json:117955` matches exactly, and the vanilla stack/play peer set
requires no action IR.

### BT8-053 — Lighdramon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clause: green level-3 evolution for 3; Armor Purge; When Digivolving,
suspend one opponent's level-4-or-lower Digimon
(`cards.json:64301-64323`). The direct module
`BT8-053.ts:8-46` contains Static Armor Purge and a WhenDigivolving Suspend
target constrained to opponent, Digimon, and level `lte 4`; it registers only
with `registerIrCard`. The focused test `BT8-053.test.ts:8-10` statically proves
the absence of a stale alternate evolution field; `12-37` proves the legal green
level-3 cost-3 stack and level-4-versus-level-5 target boundary; `39-125`
covers Armor Purge after effect deletion, battle deletion, and Security Digimon
battle. The Suspend primitive's transition receipt and Armor Purge peer behavior
were inspected; no printed name, trait, or color target predicate was added.

Correction: the pre-audit direct module incorrectly added an alternate Veemon
name requirement at cost 2. The committed catalog specifies only green level 3
at cost 3, so the stale `digivolutionRequirement` field was removed and
`compiled` exported for static proof. Q4704 appeared in this card's local KB
relation output, but its full record (`qa.json:24549-24553,29835-29842`) is a
BT3-093/P-117 On Play reveal ruling and cannot override Lighdramon's catalog
text. The snapshot (`effects.json:117956-117978`) matches the printed Armor
Purge and suspend action; evolution metadata is not represented there.

### BT8-054 — Pistmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clauses: Digisorption -2 and inherited All Turns +1000 DP for each other
own suspended Digimon (`cards.json:64326-64349`). The direct module
`BT8-054.ts:8-73` uses the canonical Replacement `wouldDigivolve`/`reduceCost`
amount 2 with an optional own-Digimon suspend cost, carries the Digisorption
keyword, and applies inherited self +1000 DP scaling over own other suspended
Digimon. Registration is exclusive `registerIrCard`.

The focused test `BT8-054.test.ts:6-30` proves the legal green level-4 cost-3
stack, optional suspend cost, and reduced memory payment; `32-44` proves the
inherited scaling excludes the host and opponent's suspended Digimon. BT10-052
and BT3-056 are same-mechanism Digisorption peers. Comprehensive §16-10
(`comprehensive.md:2876-2896`) confirms the optional suspend and mandatory
reduction after acceptance, including suspending a Digimon that will become the
source. The snapshot (`effects.json:117979-118019`) matches the direct
replacement, keyword, and inherited scaling exactly; no correction was needed.

### BT8-055 — Climbmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clauses: When Digivolving, if this Digimon is suspended, return one
opposing suspended Digimon with DP at most this Digimon's DP to hand; inherited
Your Turn, when this Digimon becomes unsuspended during the unsuspend phase,
suspend one opposing Digimon (`cards.json:64352-64375`). The direct module
`BT8-055.ts:7-68` encodes the suspended-source condition, opponent/suspended/
Digimon target, DP relative-to-source ceiling, and inherited self-unsuspend
watcher with `phaseIs Active`; registration is exclusive `registerIrCard`.

The focused test `BT8-055.test.ts:8-30` proves the legal suspended green level-4
to level-5 stack and DP-bounded return; `32-47` proves the inherited trigger in
Active; `49-64` proves that a Main-phase effect unsuspend does not fire it. Q1735
(`qa.json:29844-29850`) confirms the Reboot ordering edge: the effect may activate
immediately after the simultaneous unsuspend. `subTrigger.ts:455-458,628-631`
binds the inherited source to its host and evaluates the phase gate at event
time. The generated snapshot (`effects.json:118020-118062`) matches the return
clause but omits the direct `phaseIs Active` gate from its inherited watcher;
this is recorded snapshot drift, with the direct module and focused negative
test retained as executable authority. No direct correction was necessary.

### BT8-056 — Spinomon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog defines an effectless green/red level-6 Mega / Virus / Dinosaur,
play-cost 10, DP 13000, with green or red level-5 cost-3 evolution
(`cards.json:64378-64404`). `BT8-056.ts:5-11` is empty/full coverage and has
one exclusive `registerIrCard` registration. `BT8-056.test.ts:6-21` checks both
colors, name, level, play cost, DP, Dinosaur type, normal play, and absence of a
pending effect. The legal stack accepts either printed level-5 color at cost 3;
no effect predicate justifies a narrower or broader boundary. Snapshot
`effects.json:118063` is empty/full and matches exactly.

### BT8-057 — Shivamon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clauses: during the opponent's turn, while all of its controller's
Digimon are suspended, the opponent cannot use Option cards; during its owner's
turn, when it becomes unsuspended during the unsuspend phase, trash the top card
of the opponent's security stack (`cards.json:64407-64429`). The direct module
`BT8-057.ts:4-48` uses OpponentsTurn RestrictPlay for opponent Option play with
the `youHaveNone` own-unsuspended-Digimon condition and the printed duration,
plus a YourTurn self-unsuspend SubTrigger gated to Active and opponent
SecurityManipulation `trashTop`; registration is exclusive `registerIrCard`.

The focused test `BT8-057.test.ts:15-24` checks metadata and full/empty residual
coverage; `26-46` proves Option play is prevented when all owner's Digimon are
suspended; `48-81` proves the unsuspended-Digimon escape; `83-97` proves top
security trash at Active unsuspend; `99-113` proves no trash on Main-phase
effect unsuspend. Q1736-Q1737 (`qa.json:29853-29867`) preserve already-used
Options and Delay activation, because RestrictPlay applies to using an Option,
not to already-resolved effects or Delay activation. `youHaveNone`, phase, and
unsuspend primitives were inspected at `conditions.ts:235-236,563-564` and
`subTrigger.ts:455-458,628-631`. Snapshot `effects.json:118064-118099` matches
the direct IR exactly; no correction was needed.

### BT8-058 — Agumon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clause: On Play reveal four, add one card with [Greymon] in its name and
one card with [Dragonkin] in its traits, then place the remainder at the deck
bottom (`cards.json:64432-64459`). `BT8-058.ts:8-53` uses OnPlay RevealAdd with
the exact name and trait filters, one card per slot, and `rest: deckBottom`; it
registers only through `registerIrCard`.

The focused test `BT8-058.test.ts:7-25` proves both name and trait slots plus
the remainder disposition; `27-46` proves one revealed card cannot satisfy both
slots. `reveal.ts:115-124,202-220,277-300` supplies the reveal, matching, taken
set, and rest handling, while `manual.md:1487-1494` confirms bottom-deck order
is selected by the activating player. The legal stack boundary is black or red
level 2 at cost 0; no effect clause adds a color/name restriction. Snapshot
`effects.json:118100-118130` matches exactly; no correction was needed.

### BT8-059 — Kokuwamon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clause: All Turns, players cannot ignore digivolution requirements
(`cards.json:64462-64484`). The direct hand-authored module
`BT8-059.ts:32-50` exports a full-coverage compiled record containing exactly
one AllTurns permanent `CannotIgnoreDigivolutionRequirements` action with
`affects: "both"`; it has one exclusive `registerIrCard` registration and no
`registerCard` duplicate.

The focused test `BT8-059.test.ts:7-32` proves an opponent's effect-driven
ignore-requirements digivolution is blocked; `34-63` proves the owner's path is
also blocked. Q1738-Q1743 (`qa.json:29869-29910`) establish the exact boundary:
both seats are affected; DNA/Burst and no-cost digivolution remain legal;
partial and whole requirement waivers are blocked; and adding digivolution
information is not ignoring a requirement. The shared action at
`digivolution.ts:131-139` writes both seat flags, and the documented conformance
consumers check both normal color-waiver and effect-driven paths. The legal stack
boundary remains black level 2 at cost 0. Snapshot `effects.json:118131-118140`
matches the direct action exactly; no correction was needed.

### BT8-060 — Ryudamon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog clauses: On Play reveal three, add one [X-Antibody] trait card and one
[Yuji Musya] name card, then bottom-deck the rest; inherited All Turns, while the
host has X-Antibody in its traits, grant Decoy (Black)
(`cards.json:64487-64510`). The direct module
`BT8-060.ts:7-82` uses the exact RevealAdd trait/name slots and rest disposition,
plus an inherited self-targeted Aura gated by structured `selfHasTrait`; it
registers exclusively with `registerIrCard`.

The focused test `BT8-060.test.ts:9-27` proves the X-Antibody trait and Yuji
Musya name slots and remainder; `29-41` proves the positive trait gate, a
non-X-Antibody negative, and the newly strengthened X-Antibody non-black color
negative (`BT12-073`); `43-64` proves inherited Decoy protects another black
Digimon only by deleting the Decoy holder. `continuous.ts:178-196`,
`actions/statics.ts:30-50`, `effect.ts:533-541`, and `primitives.ts:2800-2885`
show that inherited source-card text is retained as keyword provenance and that
the runtime parses the direct module's `(Black)` specifier. `combat/keywords.ts:135-182`
confirms color versus trait matching. The legal stack boundary is black level 2
at cost 0; the On Play filters are trait/name boundaries, not color filters.
Snapshot `effects.json:118141-118186` matches the RevealAdd and Aura structure
except for the expected raw-vs-structured while representation and its bare
keyword marker. The direct module now carries `raw: "＜Decoy (Black)＞"`, and
the provenance-backed execution plus focused color/trait tests prove the
printed Decoy (Black) boundary.

### BT8-061 — Thundermon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:64513-64535` identifies a black level-4 Champion/Data/Mutant Digimon, play cost 4, DP 6000, with black level-3 evolution cost 2. Its only clause is: “The name of this card/Digimon is also treated as [Mamemon].”

**Direct implementation.** `BT8-061.ts:8-32` uses a Rule-triggered self `GrantStatic` name alias for Mamemon, with full coverage and no residual. A Rule trigger is the appropriate executable representation for a permanent name rule; the BT11-063 peer uses the same shape (`BT11-063.ts:5-17`).

**Static behavior, boundaries, and stack.** `BT8-061.test.ts:7-10` observes the effective Mamemon name. Q1744 confirms the alias is always present, not a temporary color/trait grant. The name boundary is Mamemon alias versus the printed Thundermon name; no Mamemon trait is invented. The catalog's black level-3-to-level-4 route was checked; this card has no evolution-dependent behavior, so the focused alias fixture is sufficient static stack evidence.

**Snapshot drift and score.** Snapshot `effects.json:118187-118202` has the same self name grant but serializes its trigger as `Static` rather than the direct `Rule` authority. Score (catalog / direct IR / focused behavior / peers, boundaries, stack / executed gates): **2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10 provisional**.

### BT8-062 — SkullKnightmon Cavalier Mode

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:64538-64565` identifies a black level-4 Champion/Virus/Enhancement Digimon, play cost 4, DP 5000, with black level-3 cost 3 or black level-4 cost 1 evolution. Its rule name is SkullKnightmon and DeadlyAxemon. When Digivolving, it gains Jamming and Blocker until the end of the opponent's next turn.

**Direct implementation.** `BT8-062.ts:8-67` has a Rule self `GrantStatic` for both names and a When Digivolving self grant of Jamming and Blocker, each lasting `untilOpponentTurnEnd`; coverage is full and residual is empty.

**Static behavior, boundaries, and stack.** `BT8-062.test.ts:8-37` uses the legal black level-3 BT10-058 → BT8-062 level-4 stack and proves both keyword duration boundaries through the opponent's next turn. `:39-46` proves both effective rule names. Q1745 agrees. The name boundary is two rule aliases, not a trait match; the color boundary is black only, with no color-dependent behavior. The snapshot and direct name grant differ only in Rule-versus-Static metadata.

**Snapshot drift and score.** Snapshot `effects.json:118204-118236` matches the two keyword actions and name tokens but uses `Static` for the alias. Score: **2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10 provisional**.

### BT8-063 — Ginryumon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:64568-64590` identifies a black level-4 Champion/Vaccine/Beast Dragon/X Antibody Digimon, play cost 5, DP 6000, with black level-3 cost 2. Its inherited Opponent's Turn clause grants Blocker while this Digimon has X-Antibody in its traits.

**Direct implementation.** `BT8-063.ts:8-50` carries an inherited Opponent's Turn self Aura for Blocker gated by `selfHasTrait` X-Antibody, with full coverage. The host's current top-card trait is intentionally used here; the stack-trait condition is not needed because the printed clause says “this Digimon has” rather than “a card in its stack.”

**Static behavior, boundaries, and stack.** `BT8-063.test.ts:7-12` uses legal BT8-063 level 4 under the X-Antibody BT8-066 level-5 host and proves Blocker; `:14-47` proves the real redirect window; `:49-55` proves the owner-turn negative. Trait boundary is exact X-Antibody on the host, not a name or color proxy. Black color is catalog metadata only. The legal black level-3 → level-4 route was checked.

**Snapshot and score.** Snapshot `effects.json:118238-118258` matches the direct semantic `selfHasTrait` condition, inherited flag, and Blocker Aura. Score: **2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10 provisional**.

### BT8-064 — Greymon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:64593-64620` identifies a black level-4 Champion/Virus/Dinosaur Digimon, play cost 5, DP 6000, with black or red level-3 cost 2 evolution. Its inherited Opponent's Turn clause grants Blocker while you have a red Digimon in play.

**Direct implementation.** `BT8-064.ts:8-48` uses an inherited Opponent's Turn self Blocker Aura with a live battle-area, own-controller, Digimon, Red `youHave` condition. Coverage is full.

**Static behavior, boundaries, and stack.** The positive and redirect fixtures in `BT8-064.test.ts:7-47` were corrected to the legal black BT8-064 level-4 → black BT10-065 level-5 host and a separate red BT8-008 ally. The negative fixture at `:49-59` was corrected to the legal black stack BT8-060 level 3 → BT8-064 level 4 → BT10-065 level 5 → BT8-068 level 6 with no red ally. This proves the condition is own battle-area red Digimon, not a red source card, name, or trait. The stack itself is legal under the catalog routes.

**Snapshot and score.** Snapshot `effects.json:118260-118280` matches the direct inherited conditional Blocker. Score: **2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10 provisional**.

### BT8-065 — CatchMamemon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:64623-64645` identifies a black level-5 Ultimate/Data/Mutant Digimon, play cost 6, DP 7000, with black level-4 cost 3 evolution. When Digivolving, it may return up to four Digimon cards with Mamemon in their names from any combination of hand and trash to deck top in any order; if three or more were returned, De-Digivolve 1 one opposing Digimon.

**Direct implementation and correction.** `BT8-065.ts:7-56` now filters with a single name reference `{ match: "name", tokens: ["Mamemon"] }`, from hand and trash, count 4, `upTo: true`, optional, and `trackCount: "mamemonReturned"`; the following De-Digivolve 1 reads the named count threshold of 3. The removed trait predicate was a proven direct gap because the catalog says “in their names,” not “in their traits.”

**Static behavior, boundaries, and stack.** `BT8-065.test.ts:6-30` uses the legal black BT10-061 level-4 → BT8-065 level-5 stack and checks hand/trash return, deck-top movement, and the three-card De-Digivolve threshold. The static proof at `:32-41` now requires the exact name-only filter, preventing a Mamemon-trait-only card from being accepted. Q1747 confirms any hand/trash combination and up-to-four behavior. Color is black metadata only; no color shortcut is used.

**Snapshot drift and score.** Snapshot `effects.json:118282-118315` retains the incorrect name-or-trait filter, omits `upTo`, and has no result binding for the three-card condition. The direct module's `trackCount`, optional up-to selection, and named-count condition are authoritative. Score: **2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10 provisional**.

### BT8-066 — Hisyaryumon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:64648-64671` identifies a black level-5 Ultimate/Vaccine/Beast Dragon/X Antibody Digimon, play cost 8, DP 8000, with black level-4 cost 3 evolution. On your turn, when one of your effects places a digivolution card under this Digimon, it may digivolve from hand into an X-Antibody Digimon by paying its digivolution cost, reduced by 1. Inherited Opponent's Turn: while this Digimon has X-Antibody in its traits, it gains Reboot.

**Direct implementation and correction.** `BT8-066.ts:14-99` uses a Your Turn `onAddDigivolutionCards` SubTrigger scoped to this Digimon and now explicitly `byEffect: true`. Its Digivolve action is from hand, pays the real evolution cost with `costDelta: -1`, requires an X-Antibody trait, and preserves `ignoreReqs: false`; the inherited effect uses self-top X-Antibody and grants Reboot. Coverage is full. The effect-provenance flag is required by Q1748 and the shared dedicated gate; the old generated replacement shape was not retained.

**Static behavior, boundaries, and stack.** The new static assertion in `BT8-066.test.ts:8-27` proves effect provenance, X-Antibody trait filtering, cost reduction, and preserved evolution requirements. The legal host/effect fixture at `:28-76` uses BT8-066 under BT8-069, Yuji BT8-092 placing BT8-060 under it by effect, and BT8-069 in hand; it proves the cost-reduced evolution path. `:78-85` proves inherited Reboot on an X-Antibody host. Trait boundary is X-Antibody, not a name or color condition; black is catalog metadata.

**Snapshot drift and score.** Snapshot `effects.json:118317-118369` lacks the source filter, allows any hand Digimon, and separately adds a `wouldDigivolve` cost replacement. It also contains an inherited Unsuspend action not present in the catalog. The direct effect is the executable authority. Score: **2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10 provisional**.

### BT8-067 — MetalGreymon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:64674-64702` identifies a black/red level-5 Ultimate/Virus/Cyborg Digimon, play cost 8, DP 8000, with black or red level-4 cost 4 evolution. When Digivolving, De-Digivolve 1 one opposing Digimon, then delete one opposing Digimon at 3000 DP or less. Inherited Your Turn: while this Digimon has Dragonkin or Machine in its traits, it can also attack an opponent's unsuspended Digimon.

**Direct implementation.** `BT8-067.ts:9-70` has the two ordered When Digivolving actions and an inherited Your Turn `GrantCanAttackUnsuspended` gated by exact Dragonkin-or-Machine trait matching. It deliberately does not use Vortex and has full coverage.

**Static behavior, boundaries, and stack.** `BT8-067.test.ts:7-31` uses the legal black BT10-061 level-4 → BT8-067 level-5 stack and proves De-Digivolve followed by DP-limited deletion. The inherited positive at `:33-51` uses legal BT8-067 under a BT8-070 level-6 host and proves an unsuspended target is attackable while Vortex is absent; the negative at `:53-67` uses BT9-066 and proves a host lacking Machine/Dragonkin cannot attack that target. Trait is the only inherited boundary; the card's two printed colors do not grant the attack by themselves.

**Snapshot drift and score.** Snapshot `effects.json:118370-118404` matches the removal sequence but incorrectly serializes the inherited grant as Vortex. The direct `GrantCanAttackUnsuspended` module and combat primitive are authoritative. Score: **2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10 provisional**.

### BT8-068 — BanchoMamemon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:64705-64727` identifies a black level-6 Mega/Data/Mutant/Boss Digimon, play cost 11, DP 11000, with black level-5 cost 3 evolution. When Digivolving, it may reveal the top three cards; for each opposing Digimon, it may play one Digimon card with Mamemon in its name and play cost 10 or less among them without paying its cost, then trashes the remainder. All Turns: while you have another Digimon with Mamemon in its name in play, it gains Security Attack +1.

**Direct implementation.** `BT8-068.ts:7-92` uses one optional RevealAdd of exactly three, with a name-only Mamemon Digimon filter, `playCostLte: 10`, a count modifier of one per opposing Digimon, play disposition, and remainder trash. Its All Turns Aura uses an own-controller, exclude-self, Digimon, name-only Mamemon condition for Security Attack +1. Coverage is full.

**Static behavior, boundaries, and stack.** `BT8-068.test.ts:6-39` uses the legal red/black BT10-013 level-5 → black BT8-068 level-6 stack, two opposing Digimon, two qualifying Mamemon cards, and one remainder; it proves one play per opposing Digimon and trashing the remainder. The new refusal proof at `:41-66` has no opposing Digimon, declines the optional reveal, and proves no deck movement or trash. `:68-107` proves the “another” Mamemon Security Attack +1 boundary and its absence without another Mamemon. Q1750 confirms play cost, not memory cost; name is the only filter boundary and no trait/color proxy is used.

**Snapshot drift and score.** Snapshot `effects.json:118405-118473` splits reveal/add-to-hand, free play, and trash into separate actions, uses a memory-cost field, and does not express one-per-opposing-Digimon disposition. The direct one-process RevealAdd is authoritative. Score: **2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10 provisional**.

### BT8-069 — Ouryumon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:64730-64753` identifies a black level-6 Mega/Vaccine/Beast Dragon/X Antibody Digimon, play cost 12, DP 12000, with black level-5 cost 4 evolution. When Digivolving, it may place an X-Antibody card from hand under itself as its bottom card to delete an opposing Digimon with play cost 7 or less. Your Turn Once Per Turn: when one of your effects places a digivolution card under one of your Digimon, this Digimon gets +2000 DP and cannot be deleted by opponent effects until the end of the opponent's next turn. Inherited End of Attack Once Per Turn: if this Digimon has Alphamon in its name, unsuspend it.

**Direct implementation and correction.** `BT8-069.ts:8-119` places one own hand X-Antibody card at the bottom under self, then deletes an opposing Digimon at play cost 7 or less only when the placement acted. Its Your Turn watcher now has `byEffect: true` and `triggerFilter: { controllerDefault: "mine", kind: ["Digimon"] }`, so an effect-driven placement under one of your Digimon triggers the +2000 and opponent-effect deletion restriction. The inherited End of Attack watcher uses a name-containing Alphamon condition and Once Per Turn. Coverage is full. The effect provenance and receiving-Digimon filter are required by the erratum at `errata.json:983-985` and by the shared SubTrigger gates.

**Static behavior, boundaries, and stack.** The new static assertion in `BT8-069.test.ts:8-19` proves both watcher gates. The placement/deletion behavior at `:21-45` uses a legal black level-5 BT10-013 → BT8-069 level-6 evolution. The two inherited tests at `:47-90` were corrected to legal BT8-069 level-6 → BT9-111 Alphamon: Ouryuken level-7 stacks, replacing illegal same-level hosts. The real Yuji effect placement and protection test at `:92-124` proves +2000 and opponent-effect deletion protection. Trait boundary is X-Antibody for placement; name boundary is Alphamon substring for the inherited clause; black color is not used as a substitute.

**Snapshot drift and score.** Snapshot `effects.json:118474-118532` nests placement as a Delete cost, omits the effect/receiving-Digimon watcher gates and deletion restriction, and keeps only a raw inherited name condition. The direct module is executable authority. Score: **2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10 provisional**.

### BT8-070 — BlackWarGreymon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:64756-64779` identifies a black/red level-6 Mega/Virus/Dragonkin Digimon, play cost 12, DP 12000, with black or red level-5 cost 4 evolution. When Digivolving, the red-source branch chooses any number of opposing Digimon and the black-source branch chooses any number of opposing Tamers; the combined chosen play costs must total 6 or less, then all chosen cards are deleted. All Turns Once Per Turn: when an opposing Digimon is deleted, you may unsuspend this Digimon. The 2022-05-20 erratum makes unsuspension optional.

**Direct implementation.** `BT8-070.ts:5-57` has semantic red and black stack-color predicates, separate only-red, only-black, and both-color branches, and `DeleteBudget` actions with one shared budget of 6 and `upTo: true`. The All Turns watcher is not inherited, is Once Per Turn, listens for opponent Digimon deletion, and optionally unsuspends self. Coverage is full and residual is empty.

**Static behavior, boundaries, and stack.** Both focused fixtures in `BT8-070.test.ts:6-62` were corrected to the legal black/red BT8-067 level-5 → BT8-070 level-6 stack, with BT8-067 itself under legal BT8-064 level-4 material. Because BT8-067 is multicolor, Q1753's both-branch case is proved; the first fixture checks one combined Digimon/Tamer budget and preserves the cost-4 target, while the second checks deletion of a cost-2 Digimon and optional unsuspension. Color boundary is printed stack color, not the top card's name or trait; Q1751-Q1752 confirm kind branches and one combined total.

**Snapshot drift and score.** Snapshot `effects.json:118533-118576` is partial: it has separate unconditional red/black Delete actions, a `RawUnparsed` missing-budget residual, and a generic Delete. It does not encode the combined budget or the direct semantic both/only branches. The direct module and `DeleteBudget` primitive are authoritative. Score: **2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10 provisional**.

### BT8-071 — Psychemon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64786-64810` records a purple level-3 Rookie/Data/Reptile, play cost 3, 3000 DP, purple level 2 for 0 evolution, and `[All Turns] Players can't reduce play costs.` The effect is not a target-specific Digimon effect; it applies to both players.
- Local KB query: exactly one query, `BT8-071`; Q1754 says the prohibition blocks play-cost reductions for both players, Q1755 says “play without paying the cost” remains legal because it is not a reduction, Q1756 says reductions cannot be used even from the breeding area, Q1757 says DigiXros remains possible but cannot reduce the cost, Q3283 confirms the effect is not activated by targeting Digimon, and Q4442-Q4443 establish that an original cost must still be payable before declaring a play.
- Rules and boundaries: the All Turns timing is persistent and global to the two player seats. The effect has no name, trait, color, or target filter; purple is relevant only to its legal level-2 evolution. A cost-reduction block is distinct from a play-without-cost permission.
- Direct authority: `apps/api/src/cards/BT8/BT8-071.ts:6-26` uses `RestrictCostReduction` with `seat: "any"`, `costType: "play"`, and `duration: "permanent"`, with full coverage and no residual. It registers exclusively with `registerIrCard("BT8-071", compiled)` at line 26.
- Snapshot: `effects.json:118577-118586` matches the direct restriction, full coverage, and empty residual list.
- Shared and peer evidence: `runRestrictionAction` resolves `seat: "any"` to both players, and the continuous ledger blocks play reductions while leaving play-without-cost paths distinct. Cost-restriction peers BT5-008, BT5-033, ST12-03, and ST20-07 were compared for seat and cost-type semantics.
- Focused proof: `BT8-071.test.ts:1-68` imports the direct module and proves that both an opponent's and the owner's play-cost reduction are unavailable, while a normal play still pays its original cost. The added test proves a legal purple level-2 to level-3 evolution at 0 memory cost.
- Result and score: no correction; 8/10 provisional (executed gate 0/2).

### BT8-072 — DemiDevimon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64811-64835` records a purple level-3 Rookie/Virus/Evil, play cost 3, 2000 DP, purple level 2 for 0 evolution. On Play, it reveals the top three cards of its deck, adds one Tamer among them to hand, trashes one purple Digimon card among them, and places the remaining cards at the bottom in any order.
- Local KB query: exactly one query, `BT8-072`; Q1758 confirms that a non-purple Digimon revealed by the effect cannot be selected for the purple-Digimon trash disposition.
- Rules and boundaries: `RevealAdd` must process the top three from the owner’s deck, with one Tamer disposition independent of color and one purple Digimon disposition requiring both kind and color. The remainder goes to the deck bottom; a revealed card is not silently treated as a different zone while being selected. No name or trait match is present.
- Direct authority: `apps/api/src/cards/BT8/BT8-072.ts:6-44` declares `RevealAdd` with `revealCount: 3`, one own Tamer to hand, one own purple Digimon to trash, and `rest: "deckBottom"`. It registers exclusively with `registerIrCard("BT8-072", compiled)` at line 44.
- Snapshot: `effects.json:118587-118610` matches the direct RevealAdd structure, filters, destinations, full coverage, and empty residual list.
- Shared and peer evidence: RevealAdd candidate selection, separate disposition slots, zone movement, and deck-bottom ordering were inspected alongside RevealAdd peers BT8-021, BT8-046, BT8-058, and BT8-060. The color boundary is on the Digimon trash slot only; the Tamer slot is not incorrectly color-gated.
- Focused proof: `BT8-072.test.ts:1-57` imports the direct module, proves a Tamer reaches hand and a purple Digimon reaches trash, explicitly keeps a yellow non-purple Digimon out of trash while bottoming it, and now proves purple level-2 evolution at 0 memory. The static proof was not executed.
- Result and score: no correction; 8/10 provisional (executed gate 0/2).

### BT8-073 — Mushroomon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64836-64859` records a purple level-3 Rookie/Virus/Vegetation, play cost 3, 4000 DP, purple level 2 for 0 evolution, and no effect text.
- Local KB query: exactly one query, `BT8-073`; no knowledge-base entry.
- Rules and boundaries: this is an effectless purple card. There is no trigger, inherited effect, target, name, trait, or color filter beyond accepting the printed purple level-2 evolution requirement.
- Direct authority: `apps/api/src/cards/BT8/BT8-073.ts:6-11` contains `effects: []`, full coverage, and an empty residual list, with one exclusive `registerIrCard("BT8-073", compiled)` call at line 11.
- Snapshot: `effects.json:118611` is effectless, full, and residual-free; it matches the direct module.
- Shared and peer evidence: effectless module registration and evolution handling were compared with BT8-078 and other effectless range peers. No generated residual or hidden keyword is present.
- Focused proof: `BT8-073.test.ts:1-43` imports the direct module, verifies metadata/play behavior, and statically proves purple level-2 evolution for 0 memory.
- Result and score: no correction; 8/10 provisional (executed gate 0/2).

### BT8-074 — Soulmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64860-64884` records a purple level-4 Champion/Virus/Ghost, play cost 4, 4000 DP, purple level 3 for 2 evolution, and inherited `[Your Turn][Once Per Turn] When a card is trashed from your deck, gain 1 memory.`
- Local KB query: exactly one query, `BT8-074`; Q1759 confirms that cards revealed from the top of the deck and then moved are not considered “trashed from the deck,” so this watcher must observe a true deck-trash event rather than a generic reveal sequence.
- Rules and boundaries: the effect is inherited, so it is available through a host stack under `15-3`; it is Your Turn-only and once per turn. The source filter must mean the owner’s deck, not the opponent’s deck. Rules `15-15-3-1` and the glossary’s deck/trash distinctions prevent a reveal-only or bottoming operation from triggering it.
- Direct authority: `apps/api/src/cards/BT8/BT8-074.ts:10-37` uses inherited YourTurn `SubTrigger` event `onDiscardLibrary`, `sourceFilter: { controller: "mine" }`, `GainMemory` +1, and `frequency: "OncePerTurn"`. It registers exclusively with `registerIrCard("BT8-074", compiled)` at line 37. The hand-authored comment documents why the executable event is required.
- Snapshot drift: `effects.json:118612-118625` has full coverage and no residual but says `event: "whenDeckTrashed"`, which is not the live event registered by the interpreter. The direct `onDiscardLibrary` event and own-deck source gate are authoritative; generated data was not edited.
- Shared and peer evidence: `TrashTopDeck` fires `onDiscardLibrary` after a real deck trash, while RevealAdd bottoming does not; the sub-trigger gate reads the milled deck owner from the event payload and applies the `mine` direction. BT14-077 and BT19-071 were reviewed as live `onDiscardLibrary` peers. There is no name, trait, or color target filter.
- Focused proof: `BT8-074.test.ts:1-48` imports BT8-074 and BT8-079, proves the inherited watcher gains exactly 1 memory from BT8-079’s own two-card mill while once-per-turn resolves, and now proves legal purple level-3 evolution for 2 memory. A mixed-stack host demonstrates inherited visibility; the static proof was not run.
- Result and score: no correction; snapshot drift recorded; 8/10 provisional (executed gate 0/2).

### BT8-075 — Kogamon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64885-64914` records a purple/green level-4 Champion/Data/Mutant, play cost 5, 4000 DP, purple or green level 3 for 2 evolution, and inherited `<Retaliation>`.
- Local KB query: exactly one query, `BT8-075`; no knowledge-base entry.
- Rules and boundaries: Retaliation is inherited and triggers only when the host Digimon is deleted after losing a battle, then deletes the battled opposing Digimon; it is not an effect deletion trigger. The card has no name or trait filter. Both catalog colors are legal at the evolution boundary.
- Direct authority: `apps/api/src/cards/BT8/BT8-075.ts:6-26` declares a static inherited Retaliation keyword with full coverage and no residual, and registers exclusively with `registerIrCard("BT8-075", compiled)` at line 26.
- Snapshot: `effects.json:118626-118637` matches the inherited Retaliation keyword, full coverage, and empty residual list.
- Shared and peer evidence: inherited-effect collection and combat Retaliation processing were checked against BT8-076 and BT8-077. The combat controller only applies the retaliatory deletion when the holder is the one Digimon deleted after losing battle; no name, trait, or opponent filter is encoded because the keyword supplies the rule.
- Focused proof: `BT8-075.test.ts:1-57` proves inherited Retaliation on a host, battle deletion of both the losing host and battled opponent, and now legal purple level-3 evolution for 2 memory. The static proof was not executed.
- Result and score: no correction; 8/10 provisional (executed gate 0/2).

### BT8-076 — Fangmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64915-64939` records a purple level-4 Champion/Data/Dark Animal, play cost 5, 4000 DP, purple level 3 for 2 evolution, and non-inherited `<Retaliation>`.
- Local KB query: exactly one query, `BT8-076`; no knowledge-base entry.
- Rules and boundaries: Retaliation is printed as a direct keyword on this card, so it applies to Fangmon as the battle participant rather than being inherited from a stack. The keyword has no name, trait, or color target filter; purple level 3 is the only evolution boundary.
- Direct authority: `apps/api/src/cards/BT8/BT8-076.ts:6-25` declares static Retaliation without `isInherited`, with full coverage and no residual, and registers exclusively with `registerIrCard("BT8-076", compiled)` at line 25.
- Typed closeout: this card and BT8-077 through BT8-080 no longer rely on range-local `@ts-nocheck`; all five modules remain full-coverage and residual-free.
- Snapshot: `effects.json:118638-118644` matches the non-inherited Retaliation keyword, full coverage, and empty residual list.
- Shared and peer evidence: direct versus inherited static keyword collection and combat Retaliation processing were compared with BT8-075 and BT8-077. The direct module correctly leaves the keyword on the card itself while a host receives it only when the card is in its stack.
- Focused proof: `BT8-076.test.ts:1-57` proves direct Retaliation and the losing-battle deletion, and now proves legal purple level-3 evolution for 2 memory. The proof was not run.
- Result and score: no correction; 8/10 provisional (executed gate 0/2).

### BT8-077 — BlackGatomon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64940-64970` records a purple/yellow level-4 Champion/Virus/Dark Animal, play cost 5, 6000 DP, purple or yellow level 3 for 3 evolution, direct `<Rush>`, and inherited `<Retaliation>`.
- Local KB query: exactly one query, `BT8-077`; no knowledge-base entry.
- Rules and boundaries: Rush is a direct persistent keyword allowing an attack on the turn the Digimon entered play, while Retaliation is inherited and only applies through a host stack. The card has no name or trait filter. Both purple and yellow level-3 evolution colors are legal; the added stack proof uses the purple path.
- Direct authority: `apps/api/src/cards/BT8/BT8-077.ts:6-36` declares separate static Rush and static inherited Retaliation entries, full coverage, and no residual. It registers exclusively with `registerIrCard("BT8-077", compiled)` at line 36.
- Snapshot: `effects.json:118645-118657` matches both keyword entries, inherited flag, full coverage, and empty residual list.
- Shared and peer evidence: Rush summoning-sickness handling, inherited collection, and Retaliation combat processing were reviewed alongside BT8-075 and BT8-076. Rush does not change Retaliation’s battle-only trigger, and neither keyword introduces a name/trait filter.
- Focused proof: `BT8-077.test.ts:1-78` proves same-turn attack through Rush, inherited Retaliation in a host and battle, and now legal purple level-3 evolution for 3 memory. The proof was not executed.
- Result and score: no correction; 8/10 provisional (executed gate 0/2).

### BT8-078 — Karatenmon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64971-64994` records a purple level-5 Ultimate/Virus/Wizard, play cost 6, 7000 DP, purple level 4 for 2 evolution, and no effect text.
- Local KB query: exactly one query, `BT8-078`; no knowledge-base entry.
- Rules and boundaries: this is an effectless purple level-5 card. No trigger, inherited effect, target, trait/name filter, or color behavior is present beyond the purple level-4 evolution requirement.
- Direct authority: `apps/api/src/cards/BT8/BT8-078.ts:6-11` contains `effects: []`, full coverage, an empty residual list, and one exclusive `registerIrCard("BT8-078", compiled)` call at line 11.
- Snapshot: `effects.json:118658` is effectless, full, and residual-free; it matches the direct module.
- Shared and peer evidence: effectless registration and evolution handling were compared with BT8-073; no generated residual or hidden keyword exists.
- Focused proof: `BT8-078.test.ts:1-43` imports the direct module, verifies metadata/play behavior, and now statically proves purple level-4 evolution for 2 memory.
- Result and score: no correction; 8/10 provisional (executed gate 0/2).

### BT8-079 — SkullSatamon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:64995-65020` records a purple level-5 Ultimate/Virus/Undead, play cost 7, 7000 DP, purple level 4 for 3 evolution. When Digivolving, it trashes the top two cards of its deck, then returns one card with the [Demon Lord] trait from its trash to hand. Its inherited Your Turn once-per-turn effect gains 1 memory when a card is trashed from its deck.
- Local KB query: exactly one query, `BT8-079`; Q1760 confirms that a reveal effect whose remaining cards are moved is not a “card trashed from the deck” event, so only true deck-trash processing should wake the inherited watcher.
- Rules and boundaries: the When Digivolving actions are ordered: trash two cards from the owner’s deck, then return exactly one own trash card matching the Demon Lord trait to hand. Trait matching is the explicit boundary, not name or color. The inherited watcher is own-deck, Your Turn, once per turn, and receives the same true-trash semantics as BT8-074.
- Direct authority: `apps/api/src/cards/BT8/BT8-079.ts:10-65` declares `TrashTopDeck` mine amount 2, a mine-trash Return matching `nameOrTrait` token `Demon Lord` with `match: "trait"`, and inherited `onDiscardLibrary` mine +1 memory with once-per-turn frequency. It registers exclusively with `registerIrCard("BT8-079", compiled)` at line 65. The hand-authored comment documents the executable event correction.
- Snapshot drift: `effects.json:118659-118690` preserves the mill, Demon Lord trait Return, full coverage, and empty residual but represents the inherited watcher as `event: "whenDeckTrashed"`, which has no live event mapping. The direct `onDiscardLibrary` watcher is authoritative; the snapshot was not edited.
- Shared and peer evidence: `TrashTopDeck` fires the live library-discard event, `Return` resolves only loose cards in own trash, and trait matching uses the catalog’s trait list rather than a name substring. BT8-074 and BT14-077 were reviewed as same-mechanism deck-discard peers. The focused fixture includes a non-Demon-Lord trash card to prove it remains in trash.
- Focused proof: `BT8-079.test.ts:1-58` imports the direct module, legally evolves from purple BT10-074 for 3 memory, proves two-card milling and Demon Lord return, asserts a non-Demon-Lord card remains in trash, and proves inherited once-per-turn memory from own deck-trash events. The proof was not run.
- Result and score: no correction; snapshot drift recorded; 8/10 provisional (executed gate 0/2).

### BT8-080 — Myotismon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- Catalog: `cards.json:65021-65043` records a purple level-5 Ultimate/Virus/Undead, play cost 8, 8000 DP, purple level 4 for 3 evolution. When Digivolving, it trashes the top two cards of its deck, then may play one [Yukio Oikawa] from its trash without paying its memory cost. Its inherited On Deletion effect says that if this Digimon has [Myotismon] in its name, it may play one [Yukio Oikawa] from hand or trash suspended without paying its memory cost.
- Local KB query: exactly one query, `BT8-080`; no knowledge-base entry.
- Rules and boundaries: When Digivolving mills exactly two from the owner’s deck and optionally plays one own-trash card whose name contains Yukio Oikawa, with no memory payment. The inherited On Deletion clause is separately optional, allows hand or trash, forces the played card suspended, and is gated by the current host name containing Myotismon. The host-name boundary is distinct from the Yukio Oikawa target-name boundary; no trait or color target filter is printed.
- Direct authority: `apps/api/src/cards/BT8/BT8-080.ts:6-73` declares the ordered mill and optional own-trash PlayWithoutCost, then an inherited OnDeletion optional PlayWithoutCost from hand/trash with `suspended: true` and `selfHasNameContaining` Myotismon condition. It registers exclusively with `registerIrCard("BT8-080", compiled)` at line 73.
- Snapshot drift: `effects.json:118691+` preserves both timings, mill, target name, source zones, full coverage, and empty residual, but serializes the inherited host condition as a raw string instead of the direct executable `selfHasNameContaining` predicate and omits the direct `suspended: true` requirement. The direct module is authoritative; generated effects data was not edited.
- Shared and peer evidence: `TrashTopDeck` ordering, PlayWithoutCost source-zone resolution, optionality, suspension, name substring matching under `2-3-1-3`, and inherited-effect collection were inspected. BT8-083’s Myotismon name matching and BT8-093’s Yukio Oikawa target were reviewed as same-mechanism peers. The direct negative host test distinguishes a non-Myotismon name while retaining the hand card.
- Focused proof: `BT8-080.test.ts:1-66` imports the direct module, legally evolves from purple BT10-074 for 3 memory, proves milling and free trash play, proves suspended Yukio play from a Myotismon-named inherited host, and proves no play for a non-Myotismon-named host. The proof was not executed.
- Result and score: no correction; snapshot drift recorded; 8/10 provisional (executed gate 0/2).

### BT8-081 — Rasenmon Fury Mode

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

* Catalog: `cards.json:65047-65075` identifies a purple Mega/Data Mysterious
  Beast, level 6, play 11, DP 13000, with either purple or yellow level-5
  evolution for cost 3. The End of Attack clause is a free evolution into a
  Rasenmon in hand while ignoring requirements; End of Your Turn trashes the
  top security card; the inherited Your Turn clause reacts when this card is
  trashed by a Rasenmon effect, unsuspends one own Digimon, and grants +3000 DP
  for the turn.
* Direct executable authority: `apps/api/src/cards/BT8/BT8-081.ts:8-102` has
  an EndOfAttack self Digivolve from hand filtered by the exact name Rasenmon,
  `payCost: false`, `ignoreReqs: true`, and optional; EndOfYourTurn uses
  SecurityManipulation/trashTop for the own security; the inherited SubTrigger
  is gated to `onDigiBurstCardDiscarded`, self source, and an effect source
  whose name is Rasenmon, then binds one own Digimon for Unsuspend and +3000
  forTheTurn. It ends with `coverage: "full"`, an empty residual, and one
  registerIrCard call.
* Focused proof: `BT8-081.test.ts:12-19` statically asserts the requirement-free
  field combination; `:21-60` proves legal Rasenmon evolution and rejects a
  non-Rasenmon hand card; `:62-66` proves security trash; `:68-120` proves
  inherited Rasenmon Digi-Burst and rejects a non-Rasenmon source. The negative
  tests establish the name boundary, while the direct filter establishes the
  self/controller boundary.
* Correction: the direct module initially omitted `ignoreReqs`; because the
  catalog explicitly says “ignoring its digivolution requirements,” this was a
  proven one-field gap. The field was added at line 36 and the static assertion
  was added; no snapshot file was changed.
* Snapshot drift: `effects.json:118730-118787` already contained
  `ignoreReqs: true` at `:118744`, so the pre-fix direct module was stale versus
  the generated snapshot. After correction, the executable field and snapshot
  agree.

### BT8-082 — Ophanimon Falldown Mode

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

* Catalog: `cards.json:65078-65105` identifies a purple/yellow Mega/Vaccine
  Fallen Angel, level 6, play 12, DP 12000, with purple or yellow level-5
  evolution for cost 4. When Digivolving, a purple stack card independently
  enables deletion of one opposing level-4-or-lower Digimon and a yellow stack
  card independently enables Recovery +1; On Deletion optionally plays one
  purple or yellow level-4-or-lower Digimon from trash for free.
* Direct executable authority: `BT8-082.ts:7-75` uses two independent
  `selfDigivolutionStackHasColor` conditions, with opponent level <=4 deletion
  for Purple and own-deck `SecurityManipulation/addTop` for Yellow. Its
  OnDeletion action is optional `PlayWithoutCost`, from trash, own, Digimon,
  Purple-or-Yellow, level <=4, with no cost; registration is exclusive and
  residual is empty.
* Focused proof and boundaries: `BT8-082.test.ts:11-95` tests both branches
  from one purple-yellow source and each color alone; `:97-199` tests On
  Deletion play, a card from the deleted stack, and the resulting paired
  effect. These fixtures are the legal BT9-076 Maycrackmon -> BT8-082 stack.
  Q1761/Q1762 apply directly: separate branch actions can both resolve and a
  single purple-yellow stack card can satisfy both. The color boundary is
  stack-card color, not merely the host's printed colors.
* Snapshot drift: `effects.json:118788-118838` expresses the same branches with
  raw stack-color filters, while the direct module uses the structured
  `selfDigivolutionStackHasColor` primitive. This is representation drift, not
  a proven behavior gap; the direct module remains authoritative.

### BT8-083 — MaloMyotismon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

* Catalog: `cards.json:65108-65130` identifies a purple Mega/Virus Demon Lord,
  level 6, play 13, DP 12000, purple level-5 evolution cost 4. On Play, with
  at least five cards named Myotismon in own trash, it deletes one opposing
  unsuspended Digimon and trashes the top opposing security. When Digivolving,
  it trashes the top five own deck cards, then gains one memory if any
  Myotismon-named card is in own trash.
* Direct executable authority: `BT8-083.ts:5-93` encodes both OnPlay actions
  with the same own-trash count >=5/name Myotismon condition and an opponent
  unsuspended Digimon target; its WhenDigivolving sequence is TrashTopDeck 5
  followed by a post-trash Myotismon count >=1 and GainMemory 1. It is full
  coverage with empty residual and one registerIrCard call.
* Focused proof and boundaries: `BT8-083.test.ts:6-36` proves the two OnPlay
  processes; `:38-61` proves exactly five cards are trashed and the conditional
  memory; `:63-78` rejects four Myotismon cards. The `BT8-080` Myotismon ->
  MaloMyotismon fixture checks the legal purple level-5 evolution/name boundary.
  Q5975 supports continuing the remaining activated process if the source
  leaves during the first process; the direct sequential actions preserve that
  interpretation.
* Snapshot drift: `effects.json:118839-118899` matches the direct actions and
  conditions. No correction was proven necessary.

### BT8-084 — Kimeramon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

* Catalog: `cards.json:65133-65185` identifies a white level-5 Ultimate/Data
  Composite, play 8, DP 8000, with every color's level-4 evolution cost 4.
  When Digivolving, it may place a level-5-or-lower Digimon card from own trash
  under itself, then up to four opposing Digimon get -1000 for each of this
  Digimon's colors until the end of the opponent's next turn. During the own
  turn it is also treated as having its evolution-card colors and gets +4000
  while it has at least four colors.
* Direct executable authority: `BT8-084.ts:6-88` is hand-fixed IR. PlaceUnder
  selects one own Digimon level <=5 from `from: ["trash"]`, optional; the
  subsequent up-to-four opponent Digimon receive -1000 with
  `selfAndDigivolutionCardColors` scaling and `untilOpponentTurnEnd`. The
  YourTurn GrantStatic uses `hasAllDigivolutionColors`, and the Aura grants
  +4000 while structured `selfColorCount >= 4` holds. Coverage is full,
  residual empty, and registration is exclusive.
* Focused proof and boundaries: `BT8-084.test.ts:6-35` uses legal AD1-001 red
  level-4 -> Kimeramon evidence, places a blue card from trash, and checks the
  resulting three-color -1000 scaling against four opponent targets;
  `:37-44` proves stack-color treatment and +4000 at four colors. Q1763
  confirms effective white plus evolution-card colors; Q1940 confirms that an
  inherited timing effect cannot trigger after its timing has passed. The
  `place-under` source, self-host, color, and duration boundaries are explicit.
* Snapshot drift: `effects.json:118900-118950` has a PlaceUnder shape with a
  generic `underFilter`/zone representation and raw `unit: "colors"` scaling.
  The direct hand-fixed module instead uses `from: ["trash"]` and
  `selfAndDigivolutionCardColors`, matching the catalog and interpreter
  semantics; the snapshot also appears to omit the direct self-host/source
  precision. It was inspected as evidence only and not edited.

### BT8-085 — Yolei Inoue

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

* Catalog: `cards.json:65188-65201` identifies a red play-3 Tamer. At the
  start of the own main phase, a red Digimon grants one memory. During the own
  turn, when an own Digimon with two or more colors attacks, suspending this
  Tamer may delete one opposing Digimon with DP <=3000. Security plays the
  card for free.
* Direct executable authority: `BT8-085.ts:8-93` uses a StartOfYourMainPhase
  own battle-area red Digimon condition, a YourTurn `whenAttacking` source
  filter requiring own Digimon and `multicolor: true`, and an optional
  self-suspend cost before deleting one opponent Digimon DP <=3000. Its
  Security effect is self PlayWithoutCost, `isSecurity: true`; coverage is
  full with no residual.
* Focused proof and boundaries: `BT8-085.test.ts:8-32` proves multicolor
  attack, deletion, and Tamer suspension; `:34-60` proves that a color only in
  an evolution card does not make the attacker multicolor; `:62-75` proves the
  red main-phase memory; `:77-89` proves security play. The legal stack-only
  boundary uses BT10-059 under BT1-015. Q1764 and
  `matching/permanent.ts:672-706` support current permanent colors only.
* Snapshot drift: `effects.json:118951-119006` matches the direct module. No
  direct correction was proven necessary.

### BT8-086 — Hiro Amanokawa

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

* Catalog: `cards.json:65204-65217` identifies a red play-4 Tamer. At the
  start of the own turn, memory <=2 becomes 3. During the own turn, an attack
  with an own Digimon whose name contains Gammamon or whose level is >=5 lets
  this Tamer suspend to grant one own Digimon +2000 for the turn; Security
  plays it for free.
* Direct executable authority: `BT8-086.ts:8-100` uses `memoryAtMost: 2` and
  exact SetMemory 3; its attack SubTrigger is an own Digimon OR condition,
  matching name Gammamon or level >=5, followed by optional self suspension
  and +2000 `forTheTurn` to one own Digimon. Security is self free play with
  `isSecurity: true`; coverage is full and residual empty.
* Focused proof and boundaries: `BT8-086.test.ts:8-34` proves the level-5
  branch and +2000; `:36-61` adds static behavioral proof for the independent
  Gammamon-name branch using BT8-008; `:63-69` proves the <=2 memory boundary;
  `:71-79` proves security play. The OR/name/level boundary is represented in
  the direct filter rather than conflated into a single trait check.
* Snapshot drift: `effects.json:119007-119058` matches the direct module. No
  direct correction was proven necessary.

### BT8-087 — T.K. Takaishi

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

* Catalog: `cards.json:65220-65233` identifies a blue play-4 Tamer. At the
  start of the own turn, memory <=2 becomes 3. During the opponent's turn,
  when an opponent Digimon attacks one of the own blue Digimon, suspending
  this Tamer may draw one; Security plays it for free.
* Direct executable authority: `BT8-087.ts:5-80` uses exact SetMemory 3 under
  memory <=2. Its OpponentsTurn `whenOpponentAttacks` trigger has
  `triggerDefenderMatchesFilter` for an own blue Digimon, then optional
  self-suspend cost and Draw 1 with abort-on-decline. Security is free self
  play; coverage is full and residual empty.
* Focused proof and boundaries: `BT8-087.test.ts:8-36` proves attack on a
  blue defender, suspension, and draw; `:38-66` rejects a non-blue defender;
  `:68-74` proves the memory gate; `:76-84` proves security play. This directly
  applies Q1765: the trigger is attack target/defender color, not a generic
  block event.
* Snapshot drift: `effects.json:119059-119095` matches the direct module. No
  direct correction was proven necessary.

### BT8-088 — Davis Motomiya & Ken Ichijoji

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

* Catalog: `cards.json:65236-65249` identifies a blue/green play-4 Tamer.
  At the start of the own main phase, a blue Digimon independently grants one
  memory and a green Digimon independently grants one memory. During the own
  turn, when an own Digimon digivolves into a Digimon with two or more colors,
  suspending this Tamer may unsuspend that Digimon; Security plays it for free.
* Direct executable authority: `BT8-088.ts:4-98` has two independent
  `youHave`/GainMemory actions, one blue and one green, so a single blue-green
  permanent can satisfy both. Its own-turn SubTrigger is
  `whenOneOfYoursDigivolves` with an own `multicolor: true` source and an
  Unsuspend bound to `triggerSubject`, paid by optional self suspension.
  Security is free self play; coverage is full and residual empty.
* Focused proof and boundaries: `BT8-088.test.ts:8-34` uses the legal BT8-010
  -> BT8-015 evolution to prove the target binding and self-suspend; `:36-50`
  proves both independent memory clauses from one BT8-053 blue-green card;
  `:52-60` proves Security play. Q1766/Q1767 support independent clauses and
  one multicolor card satisfying both. Q2150 is non-applicable because this
  catalog entry has no reveal effect.
* Snapshot drift: `effects.json:119096-119157` matches the direct module. No
  direct correction was proven necessary.

### BT8-089 — Cody Hida

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

* Catalog: `cards.json:65252-65265` identifies a yellow play-3 Tamer. At the
  start of the own main phase, a yellow Digimon grants one memory. During the
  own turn, when an own Digimon with two or more colors attacks, suspending
  this Tamer may give one opposing Digimon -2000 DP for the turn; Security
  plays it for free.
* Direct executable authority: `BT8-089.ts:8-91` uses a StartOfYourMainPhase
  own battle-area yellow condition, a YourTurn own multicolor attack source,
  and an optional self-suspend cost before ModifyDP -2000 to one opponent for
  the turn. Security is self free play; coverage is full and residual empty.
* Focused proof and boundaries: `BT8-089.test.ts:8-34` proves multicolor attack,
  -2000 DP, and suspension; `:36-62` proves stack-only colors do not satisfy
  multicolor; `:64-77` proves yellow main-phase memory; `:79-87` proves
  security play. The legal BT10-059-under-BT1-015 fixture and Q1768 establish
  the printed-color/name boundary. The direct action correctly gives -2000;
  it does not delete, matching the catalog wording.
* Snapshot drift: `effects.json:119158-119217` matches the direct module. No
  direct correction was proven necessary.

### BT8-090 — Kari Kamiya

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

* Catalog: `cards.json:65268-65281` identifies a yellow play-4 Tamer. At the
  start of the own turn, memory <=2 becomes 3. During the own turn, when a
  card is added to the own security stack, suspending this Tamer may gain one
  memory; Security plays it for free.
* Direct executable authority: `BT8-090.ts:8-75` has exact SetMemory 3 under
  `memoryAtMost: 2`; its YourTurn `whenAddSecurity` SubTrigger is gated by
  `triggerSecurityIsYours`, then optionally suspends itself to GainMemory 1.
  Security is self free play with `isSecurity: true`; coverage is full and
  residual empty.
* Focused proof and boundaries: `BT8-090.test.ts:9-35` proves a card added to
  own security triggers the Tamer; `:37-43` proves the start-turn memory gate;
  `:45-53` proves security play. The `triggerSecurityIsYours` primitive keeps
  opponent security changes outside the trigger boundary.
* Snapshot drift: `effects.json:119218-119259` matches the direct module. No
  direct correction was proven necessary.

### BT8-091 — Willis

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:65284-65297` identifies a green Tamer with
play cost 3. On Play, it may hatch one Digi-Egg into an empty breeding area.
During the owner's turn, when one of that player's Digimon would digivolve into
a Digimon with Gargomon or Rapidmon in its name, the Tamer may suspend to
reduce that digivolution cost by 1. Its Security effect plays itself without
paying its memory cost.

**Direct executable authority.** `apps/api/src/cards/BT8/BT8-091.ts:4-59`
uses `Hatch` with `optional: true`, a Your Turn `wouldDigivolve` replacement
with `mode: "reduceCost"`, `amount: 1`, destination name tokens Gargomon or
Rapidmon, and a self-suspend cost, followed by Security `PlayWithoutCost`.
The module has full coverage, an empty residual, and one exclusive
`registerIrCard` call. The direct static proof is
`BT8-091.test.ts:9-31`.

**Behavior, boundaries, and stack proof.** `BT8-091.test.ts:33-121` covers
successful and declined hatching, empty egg deck, and occupied breeding area;
`:123-181` covers the legal Terriermon -> Rapidmon stack, the one-memory
reduction, self-suspension, and the already-suspended negative boundary; `:184-195`
covers Security play. The destination name matcher is name-based rather than a
trait shortcut, and the direct contract assertion preserves the exact
Gargomon/Rapidmon token set.

**Snapshot and score.** `effects.json:119261-119299` has equivalent hatch and
Security actions, but serializes the digivolution reduction in the older
nested-action shape and includes an explicit source filter. The direct module's
structured reduction plus interactive suspend cost is the executable authority.
No semantic direct correction was proven. Score: catalog 2/2, executable IR
2/2, behavior 2/2, mechanism/boundaries/stack 2/2, delivery gates 0/2 =
**8/10 provisional**.

### BT8-092 — Yuji Musya

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:65300-65313` identifies a black Tamer with play
cost 3. During its owner's turn, one of that player's X-Antibody Digimon
moving from breeding to battle gains 1 memory and draws 1. During that turn,
when one of that player's black X-Antibody Digimon attacks, the Tamer may
suspend to place one X-Antibody card from hand under that attacking Digimon as
its bottom digivolution card. Security plays the Tamer for free.

**Direct executable authority.** `BT8-092.ts:4-77` has two Your Turn
`SubTrigger`s: `whenMovedFromBreeding` filters own Digimon with the X-Antibody
trait and gains memory/draws; `whenAttacking` filters own black X-Antibody
Digimon and optionally pays a self-suspend cost to `PlaceUnder` one matching
hand card at the bottom of the trigger source. Security is an exclusive free
play. The static direct contract is `BT8-092.test.ts:8-47`.

**Behavior and boundaries.** `BT8-092.test.ts:49-65` uses the legal level-3
Ryudamon breeding move and proves memory/draw; `:68-93` proves a black
X-Antibody attack, self-suspension, and bottom placement from hand; `:97-105`
proves Security. The direct source filter requires both black color and
X-Antibody trait for the attack branch, while the movement branch intentionally
has no black-color restriction as printed. No evolution stack is required for
the level-3 breeding movement or the standalone level-4 attacking Digimon.

**Snapshot and score.** `effects.json:119301-119365` matches the direct
watchers, source filters, bottom placement, optional suspend cost, and Security
play. No semantic direct correction was proven. Score: catalog 2/2, executable
IR 2/2, behavior 2/2, mechanism/boundaries/stack 2/2, delivery gates 0/2 =
**8/10 provisional**.

### BT8-093 — Yukio Oikawa

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:65316-65329` identifies a purple Tamer with
play cost 3. On all turns, when one of its owner's Digimon with Myotismon in
its name is deleted, it may suspend itself to gain 1 memory. At the end of the
opponent's turn, if this Tamer is suspended, by deleting itself it may play one
MaloMyotismon from its trash without paying its memory cost. Security plays it
for free.

**Direct executable authority.** `BT8-093.ts:7-96` has an All Turns deletion
watcher filtered to own Digimon and the name token Myotismon, with optional
self-suspend cost and memory gain. Its End of Opponent's Turn effect is gated
by `selfIsSuspended`, plays one own-trash MaloMyotismon without cost, and pays
the printed self-delete cost with optional/abort-on-decline handling. Security
is a free self-play. The static direct contract is
`BT8-093.test.ts:8-39`.

**Behavior and boundaries.** `BT8-093.test.ts:41-66` proves a qualifying
Myotismon deletion and the optional suspend cost; `:68-93` proves suspended
Yukio self-deletion and MaloMyotismon play from trash; `:94-114` proves the
unsuspended negative; `:115-126` proves Security. The exact name token is
appropriate for “Myotismon in its name,” and the MaloMyotismon destination is
separately name-gated. This Tamer has no evolution stack requirement.

**Snapshot and score.** `effects.json:119366-119430` matches the direct
deletion watcher, suspended condition, self-delete cost, trash-origin play,
and Security effect. No semantic direct correction was proven. Score:
catalog 2/2, executable IR 2/2, behavior 2/2,
mechanism/boundaries/stack 2/2, delivery gates 0/2 = **8/10 provisional**.

### BT8-094 — Digimon Emperor

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:65332-65345` identifies a white Tamer with play
cost 3. On all turns, when one of its opponent's level-5-or-lower Digimon is
deleted, it may suspend itself to draw 1. During the opponent's turn, when one
of its opponent's level-3 Digimon moves from that player's breeding area to
that player's battle area, it gains 2 memory. Security plays it for free.

**Direct executable authority.** `BT8-094.ts:5-53` encodes the deletion
watcher with opponent controller and `levelComparison <= 5`, optional
self-suspend cost, and own draw. The Opponent's Turn watcher uses
`whenMovedFromBreeding`, opponent controller, and exact level 3, then gains 2
memory. Security is a free self-play. The static contract at
`BT8-094.test.ts:8-39` demonstrates that the direct module contains the
primitive absent from the snapshot; the module has full coverage and no
residual.

**Behavior, ruling, and boundaries.** `BT8-094.test.ts:40-60` proves the
opposing level-5-or-lower deletion, suspend cost, and draw. `:61-79` moves a
legal level-3 BT1-009 from the opponent's breeding area during that opponent's
turn and observes the memory gain. Q1769 confirms that the watcher also fires
for an effect-driven move outside the normal breeding phase; Q1770 confirms
the turn-ending consequence when memory crosses to the opponent's side. The
level gate is exact and opponent-relative; the breeding boundary is an
explicitly referenced event rather than an illegal attempt to affect a card
while it remains in breeding. Security is covered at `:80-91`.

**Snapshot and score.** `effects.json:119432-119479` is stale and partial: the
deletion clause is present, but the Opponent's Turn clause is only
`RawUnparsed` with a `missing-primitive(unaudited)` residual. The direct module
is executable authority and is full coverage. No semantic direct correction was
proven in this audit. Score: catalog 2/2, executable IR 2/2, behavior 2/2,
mechanism/boundaries/stack 2/2, delivery gates 0/2 = **8/10 provisional**.

### BT8-095 — Fire Rocket

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:65348-65361` identifies a red Option with use
cost 1. While its controller has an Armor Form Digimon in play, it may be used
without meeting its red color requirement. Its Main effect gives one own
Digimon with 2 or more colors Security Attack +1 for the turn. Its Security
effect deletes one opposing Blocker Digimon.

**Direct executable authority.** `BT8-095.ts:8-84` uses a Static
`WaiveColorRequirement` for itself, conditioned on an own battle-area Digimon
whose trait includes Armor Form. The Main action targets one own multicolor
Digimon and grants Security Attack +1 for the turn. Security deletes one
opposing Digimon with Blocker. The static direct contract is
`BT8-095.test.ts:10-32`; registration is exclusive and coverage is full.

**Behavior and boundaries.** `BT8-095.test.ts:34-68` uses Armor Form
Submarimon and Rapidmon and proves the chosen-target-only multicolor branch;
`:69-92` proves Security deletes only the selected opposing Blocker. The
Armor Form condition is restricted to the battle area, as required by “in
play”; comprehensive rules prohibit reading an Armor Form card in breeding for
this waiver. Q4705 confirms that the granted Security Attack +1 remains valid
when Armor Purge prevents deletion. The card has no evolution stack requirement.

**Snapshot and score.** `effects.json:119481-119528` matches the waiver,
multicolor target, duration, Blocker filter, and Security flag. No semantic
direct correction was proven. Score: catalog 2/2, executable IR 2/2, behavior
2/2, mechanism/boundaries/stack 2/2, delivery gates 0/2 = **8/10 provisional**.

### BT8-096 — Top Gun

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:65364-65377` identifies a red Option with use
cost 3. Its Main effect deletes one opposing Digimon with 4000 DP or less. If
the controller has a Digimon in play with 2 or more colors, or a Digimon with
a single digivolution card that has 2 or more colors, it instead deletes one
opposing Digimon with 7000 DP or less. Security activates Main.

**Direct executable authority.** `BT8-096.ts:5-51` defines `highCap` as an
`anyOf` of an own battle-area multicolor Digimon and an own multicolor
digivolution card. Main and Security each have mutually exclusive 7000-DP and
4000-DP Delete branches, with the low branch gated by `not highCap`. The
direct module is full coverage with no residual, and its static proof is
`BT8-096.test.ts:8-23`.

**Behavior, ruling, and legal stacks.** `BT8-096.test.ts:25-53` proves the
inclusive 4000 boundary. Its separate-monocolor negative fixture at `:54-76`
is now the legal stack BT1-001 -> BT17-019 -> BT1-032 -> BT8-084, so red and
blue mono cards are not combined as one multicolor card. The positive fixture
at `:78-108` is the legal BT8-046 -> BT8-039 -> BT8-084 stack, where one
digivolution card is genuinely yellow/green multicolor. The Security 7000-DP
case is at `:110-124`. Q1771 and Q1772 directly support the one-card printed
multicolor interpretation; the tests also cover the 7000/7001 boundary.

**Snapshot and score.** `effects.json:119530-119558` is partial: it contains
the 4000-DP Delete and a raw `missing-primitive(unaudited)` action for the
digivolution-card branch. The direct structured `anyOf` condition and inverse
branch are executable authority. No semantic direct correction was proven in
this audit. Score: catalog 2/2, executable IR 2/2, behavior 2/2,
mechanism/boundaries/stack 2/2, delivery gates 0/2 = **8/10 provisional**.

### BT8-097 — Crimson Blaze

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:65380-65393` identifies a red Option with
printed use cost 6. Its static effect reduces this card's hand cost by 1 for
each opposing Digimon in play. The errata-corrected Main text first prevents
the opponent from playing Digimon by effects until the end of that opponent's
turn, then deletes all opposing Digimon with 6000 DP or less. Security
activates Main.

**Direct executable authority.** `BT8-097.ts:5-71` uses a static
`wouldBePlayed` reduction scaling one per opponent battle-area Digimon. The
Main effect first applies `RestrictPlay` to the opponent, filtered to Digimon,
with `byEffectOnly: true` and `untilOpponentTurnEnd`, then deletes all opposing
Digimon at 6000 DP or less. Security activates Main. The direct static contract
at `BT8-097.test.ts:9-25` preserves the reduction, order, and duration.

**Behavior, errata, and boundaries.** `BT8-097.test.ts:27-56` proves seven
opposing Digimon reduce the cost to zero rather than negative memory;
`:58-90` proves the 5999/6000/6001 DP boundary; `:92-121` proves an opposing
Security effect cannot play a Digimon under the restriction; `:122-158` proves
normal hand play remains allowed because the restriction is by-effect-only.
The direct `RestrictPlay` action follows the erratum order and applies to the
opponent as a seat-level prohibition, including the Q6238 breeding placement
case. Q1774/Q1775/Q4661-Q4664 confirm the source/effect ownership boundaries.
This Option has no evolution stack requirement.

**Snapshot and score.** `effects.json:119560-119600` has full coverage but
uses the older generic `Restrict` representation and a generic type filter,
where the direct module makes the seat, Digimon kind, and effect-only rule
explicit. No semantic direct correction was proven. Score: catalog 2/2,
executable IR 2/2, behavior 2/2, mechanism/boundaries/stack 2/2, delivery
gates 0/2 = **8/10 provisional**.

### BT8-098 — Innocence Blizzard

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:65396-65409` identifies a blue Option with use
cost 3. Its Main effect trashes the bottom digivolution card of every opposing
Digimon, then up to three opposing Digimon with no digivolution cards cannot
attack or block until the end of the opponent's next turn. Security activates
Main.

**Direct executable authority.** `BT8-098.ts:5-53` first uses
`TrashDigivolution` with `fromTop: false` over all opposing Digimon with any
source. It then applies an up-to-three `Restrict` with `attackOrBlock`
restriction to opposing Digimon with no sources until `untilOpponentTurnEnd`.
Security activates Main. The direct static contract is
`BT8-098.test.ts:9-25`; coverage is full and residual is empty.

**Behavior, target timing, and legal stacks.** `BT8-098.test.ts:26-93`
proves bottom-source removal, leaves a still-stacked Digimon untouched, offers
exactly the four resulting source-less candidates with min 0/max 3, and
restricts only the selected three. The fixture now uses legal stacks:
BT1-029 -> BT8-023; BT8-046 -> BT8-039; and BT1-029 -> BT8-023 -> BT8-042.
The Security flow at `:94-119` proves the same source-removal and restriction
path. Q1777 and manual rules `:1521-1542` confirm that the target list is
chosen at activation and remains affected even if a chosen Digimon later gains
a source; a later source-less Digimon is not added. Q1778 confirms the
opponent-turn duration.

**Snapshot and score.** `effects.json:119602-119631` matches the direct
bottom-trash, source-less target, up-to-three cap, duration, and Security
activation. No semantic direct correction was proven. Score: catalog 2/2,
executable IR 2/2, behavior 2/2, mechanism/boundaries/stack 2/2, delivery
gates 0/2 = **8/10 provisional**.

### BT8-099 — Giga Death

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:65412-65425` identifies a blue/green Option
with use cost 9. Its Main effect suspends one opposing Digimon, then places up
to ten opposing suspended Digimon at the bottom of their owners' decks in any
order. Its Security effect suspends one opposing Digimon, then returns one
opposing suspended Digimon to the bottom of its owner's deck.

**Direct executable authority.** `BT8-099.ts:5-70` keeps the Main sequence as
an unsuspended-opponent `Suspend` followed by an up-to-ten `Return` to
`deckBottom` over suspended opponents. Security repeats the first filter and
uses an exact count of one for the bottom-deck return. The static direct
contract is `BT8-099.test.ts:8-30`; coverage is full, residual is empty, and
registration is exclusive.

**Behavior and boundaries.** `BT8-099.test.ts:32-55` proves the Main effect
suspends the unsuspended target before returning the suspended population;
`:56-75` proves Security does not select an already-suspended Digimon for the
first action and returns one suspended Digimon. The deck-bottom destination is
owner-relative through the return primitive, and manual rules `:1492-1494`
provide the ordering seam for the Main “any order” clause. This Option has no
evolution stack requirement.

**Snapshot and score.** `effects.json:119633-119667` matches both sequences,
unsuspended/suspended filters, counts, deck-bottom destinations, and Security
flag. No semantic direct correction was proven. Score: catalog 2/2,
executable IR 2/2, behavior 2/2, mechanism/boundaries/stack 2/2, delivery
gates 0/2 = **8/10 provisional**.

### BT8-100 — Disaster Blaster

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** `cards.json:65428-65441` identifies a yellow Option with
use cost 3. Its Main effect gives one opposing Digimon -3000 DP for the turn.
If its controller has a Digimon in play with 2 or more colors, or a Digimon
with a single digivolution card with 2 or more colors, one opposing Digimon
gets -6000 DP instead. Security activates Main.

**Direct executable authority.** `BT8-100.ts:5-58` defines the high condition
as an `anyOf` over an own battle-area multicolor Digimon or an own printed
multicolor digivolution card (without an incorrect card-kind restriction). Main first `SelectBind`s exactly one opposing
Digimon, then applies either -3000 or -6000 to that same binding using
mutually exclusive conditions, both for the turn. Security activates Main.
The static direct contract is `BT8-100.test.ts:8-25`; coverage is full and
residual is empty.

**Behavior, ruling, and legal stacks.** `BT8-100.test.ts:26-42` proves the
ordinary -3000 branch; `:43-59` proves the multicolor-in-play -6000 branch;
`:60-78` proves a legal BT8-046 -> BT8-039 -> BT8-084 stack supplies one
printed multicolor source; `:80-99` proves a multicolor Tamer source is also
counted; `:101-112` proves Security; `:114-137` uses the legal
BT1-001 -> BT17-019 -> BT1-032 -> BT8-084 stack to prove separate red and
blue mono source cards remain only -3000. Q1779 and Q1780 directly support the
single printed multicolor-card and no-color-grant interpretation. The
`SelectBind` seam also proves both branches affect one chosen target rather
than independently selecting two targets.

**Snapshot and score.** `effects.json:119669-119696` is stale relative to
the direct authority: it serializes an unconditional -3000 target action plus
a separate -6000 action targeting any opposing multicolor Digimon, uses a
permanent duration for the latter, and only checks a multicolor Digimon in
play. It omits the single-target binding, the stack-card branch, the inverse
condition, and the for-the-turn duration. The direct module is the corrected
executable implementation; no new semantic correction was proven in this
audit. Score: catalog 2/2, executable IR 2/2, behavior 2/2,
mechanism/boundaries/stack 2/2, delivery gates 0/2 = **8/10 provisional**.

### BT8-101 — Plasma Shot

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The committed catalog entry is `packages/shared/src/cards/data/cards.json:65444-65459`. It identifies a yellow Option with play cost 4, the Armor Form color-requirement waiver, a selected opposing Digimon receiving -4000 DP for the turn, and an additional -1000 DP to all opposing Digimon for each Armor Form trait card in the owner's trash. Security is Activate Main. The single range-ordered query returned Q1781, confirming that with one Armor Form trait card in trash the selected Digimon receives both the -4000 and the additional -1000 reduction.

**Rules and boundaries.** Rules 2-3-2-3 makes the Armor Form check a trait check, while 15-1-2 requires the listed effects to resolve in order. The direct filters distinguish one opposing Digimon from all opposing Digimon; the scaling source is the owner's trash and does not use card name or color as a substitute for trait. The yellow waiver is a static permission on an Armor Form trait Digimon in play, not a general color bypass.

**Direct authority and snapshot.** `apps/api/src/cards/BT8/BT8-101.ts:6-94` compiles the waiver, selected -4000 action, trash-scaled -1000 action, Security Activate Main, and empty residual/full effect arrays. It contains exactly one `registerIrCard("BT8-101", compiled)` and no `registerCard`. The read-only generated snapshot `packages/shared/src/effects/effects.json:119698-119748` matches the direct module; no snapshot edit is warranted.

**Interpreter, peer, and focused evidence.** The static waiver implementation in `actions/statics.ts:211-230` confirms that color waiver is a legality permission. `effects/interpreter/actions` supports ModifyDP target filtering and count scaling. BT7-110 (`apps/api/src/cards/BT7/BT7-110.ts:23,94`) is a same-mechanism waiver/registration peer. `apps/api/src/cards/BT8/BT8-101.test.ts:8-73` statically covers combined reductions and Security behavior.

**Evolution and score.** No legal evolution stack applies to this Option. Result: **8/10 provisional**; deferred executed gates are listed below.

### BT8-102 — Samādhi Śānti

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The committed catalog entry is `packages/shared/src/cards/data/cards.json:65460-65475`. It identifies a green Option with play cost 1: optionally suspend one own Digimon to suspend one opposing Digimon or Tamer, then prevent cards suspended by this effect from unsuspending until the end of the opponent's next turn. Security suspends one opposing Digimon or Tamer. The single query returned Q1782: the lock applies only when this effect actually suspended the opposing card, not when the selected card was already suspended.

**Rules and boundaries.** Rules 15-1-2 and 15-6 require the second restriction to depend on the first action's actual result. The opponent target may be a Digimon or Tamer; the cost is an own Digimon and is not the same target category. The restriction uses a result identity, not `sameTarget`, because a selected but already-suspended target did not undergo the required state transition. There is no name, trait, or color substitution in either target boundary.

**Direct authority and correction.** `apps/api/src/cards/BT8/BT8-102.ts:6-69` was corrected so the first Main Suspend target binds actual suspended results as `samadhiSuspended`, and the restriction resolves `fromSelectionRef: "samadhiSuspended"` rather than `sameTarget: true`. It contains exactly one `registerIrCard("BT8-102", compiled)` and no `registerCard`. The correction changes two direct fields: `bindResultAs` and `fromSelectionRef`.

**Interpreter, peer, and snapshot evidence.** `targeting/permanents.ts:373-375` shows that `sameTarget` reuses selected IDs, whereas `:419-439` resolves a result binding; `actions/board.ts:50-94` binds the actual IDs suspended by the action. The read-only snapshot `effects.json:119750-119785` still contains the former `sameTarget` representation and lacks the new result binding, so it is documented as stale snapshot drift and was not edited. EX9-044 provides a direct suspend/restriction vocabulary peer. `apps/api/src/cards/BT8/BT8-102.test.ts:9-28,43-83` covers ordinary suspension/restriction and the added already-suspended regression.

**Evolution and score.** No legal evolution stack applies to this Option. Result: **8/10 provisional**, with execution gates deferred.

### BT8-103 — Lightning Blade

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The committed catalog entry is `packages/shared/src/cards/data/cards.json:65476-65491`. It identifies a green Option with play cost 1 and an Armor Form waiver; Main gives one own Digimon with two or more colors +2000 DP and Piercing for the turn, while Security suspends one opposing Digimon. The single query returned no local KB entry.

**Rules and boundaries.** The waiver uses the exact Armor Form trait boundary. The Main target is own, a Digimon, and multicolor (at least two colors); the +2000 and Piercing outcomes refer to that same selected Digimon. Rules 16-7 defines Piercing as a keyword effect; no name or trait match is used for the multicolor condition. Security is an opposing Digimon suspension and does not inherit the Main target.

**Direct authority and snapshot.** `apps/api/src/cards/BT8/BT8-103.ts:6-93` compiles the waiver, same-target +2000, same-target Piercing, and Security suspension, with exactly one `registerIrCard("BT8-103", compiled)` and no `registerCard`. The snapshot `effects.json:119787-119835` lacks the direct GainKeyword same-target binding, so this is recorded as snapshot drift; the direct module remains authority and the snapshot is read-only.

**Interpreter, peer, and focused evidence.** Static waiver behavior is supported by `actions/statics.ts:211-230`; target identity vocabulary is shared with the permanent targeting primitives. BT7-110 is a waiver peer. `apps/api/src/cards/BT8/BT8-103.test.ts:9-78` statically covers the multicolor target receiving both outcomes and the Security path.

**Evolution and score.** No legal evolution stack applies to this Option. Result: **8/10 provisional**.

### BT8-104 — Eiseiryūoujin

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The committed catalog entry is `packages/shared/src/cards/data/cards.json:65492-65507`. It identifies a black Option with play cost 4. Main De-Digivolves one opposing Digimon by 1; then it may place one X-Antibody trait card from hand as the bottom digivolution card of one own black X-Antibody Digimon to delete one opposing Digimon with play cost 4 or less. Security De-Digivolves one opposing Digimon by 1, then deletes one opposing Digimon with play cost 4 or less. The single query returned no local KB entry.

**Rules and boundaries.** Rules 15-1-2 requires De-Digivolve before the optional placement/deletion sequence. Rules 2-3-2-3 makes X-Antibody an exact trait boundary; the host is an own black X-Antibody Digimon, and the delete target is opposing with play cost at most 4. Rules 16-12 covers De-Digivolve. The conditional delete is gated by the optional placement's actual resolution, not merely by selecting a placement target. No card name or color check replaces the trait check, and this Option has no conventional evolution stack.

**Direct authority and snapshot.** `apps/api/src/cards/BT8/BT8-104.ts:5-99` directly expresses ordered De-Digivolve, optional PlaceUnder from hand to the bottom, and the conditional delete, with mandatory ordered Security actions. It has exactly one `registerIrCard("BT8-104", compiled)` and no `registerCard`. The snapshot `effects.json:119836-119897` encodes placement as a Delete cost and duplicates the X-Antibody trait in its target representation rather than preserving the direct PlaceUnder action; this is recorded drift only.

**Interpreter, peer, and focused evidence.** `actions/removal.ts` and the effect condition path support action-order and `ifThisEffectActed` gating; BT19-020 (`apps/api/src/cards/BT19/BT19-020.ts:51`) is a PlaceUnder vocabulary peer. `apps/api/src/cards/BT8/BT8-104.test.ts:8-199` statically covers placement/deletion, declining placement, impossible confirmation, and Security. The tests are not executed in this audit.

**Evolution and score.** No legal evolution stack applies to this Option. Result: **8/10 provisional**.

### BT8-105 — Dark Gaia Force

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The committed catalog entry is `packages/shared/src/cards/data/cards.json:65508-65523`. It identifies a black/red Option with play cost 8. Main deletes any number of opposing Digimon whose printed play costs total at most 15; Security deletes one opposing Digimon with play cost at most 15. The single range-ordered query returned Q1783-Q1785: the total uses printed play costs, a player may choose fewer cards but must choose at least one, and reductions/free-play effects do not alter the printed-cost calculation.

**Rules and boundaries.** Printed play cost is the relevant cost boundary, not a reduced current cost. The target is opposing Digimon only and the total budget is 15. Because “any number” in this effect still requires at least one chosen Digimon under Q1784, an empty selection is not legal when a qualifying target exists. No name, trait, or color condition is involved; no evolution stack applies.

**Direct authority and correction.** `apps/api/src/cards/BT8/BT8-105.ts:6-44` was corrected to add `minimum: 1` to the `DeleteBudget` action while retaining budget 15 and `upTo: true`; Security remains a single opposing Digimon with play cost at most 15. It contains exactly one `registerIrCard("BT8-105", compiled)` and no `registerCard`. This is one corrected direct field.

**Interpreter, peer, and snapshot evidence.** `actions/removal.ts:213-296` enforces the budget using printed costs and makes the first pick mandatory when `minimum` is positive; EX4-073 (`apps/api/src/cards/EX4/EX4-073.ts:17,44`) is a minimum-one and repeat peer. The snapshot `effects.json:119898-119922` contains a generic delete with count 0 and `upTo: true`, omitting the budget and minimum, so it is documented as stale drift. `apps/api/src/cards/BT8/BT8-105.test.ts:8-42,51-75` covers the budget selection and adds static proof that the first eligible deletion cannot be declined.

**Evolution and score.** No legal evolution stack applies to this Option. Result: **8/10 provisional**.

### BT8-106 — Senbon Dokkān

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The committed catalog entry is `packages/shared/src/cards/data/cards.json:65524-65539`. It identifies a black Option with play cost 9. Main reveals the top three cards of the owner's deck, may play any number of revealed Digimon with [Mamemon] in their names without paying their costs when their printed play costs total at most 15, deletes one opposing Digimon with play cost at most 6 for each Digimon played, and trashes the remaining revealed cards. Security is Activate Main. The single query returned Q1786-Q1787: fewer revealed Mamemon may be chosen from the total-15 budget, and “memory cost of 6 or less” in the query's related ruling means the Digimon's play-cost boundary for this effect.

**Rules and boundaries.** Rules 2-3-1-3 governs the [Mamemon] name check as a name substring, not a trait check. Rules 15-15-3 governs reveal processing; printed play costs form the total budget, and the remaining revealed cards go to trash. The delete repeats once per Digimon actually selected for play, with an opposing Digimon play-cost limit of 6. No color or trait substitute is permitted, and no evolution stack applies.

**Direct authority and snapshot.** `apps/api/src/cards/BT8/BT8-106.ts:6-65` directly compiles reveal-three, optional name matching, printed-cost budget 15, play without cost, remaining-card trash, a `mamemonPlayed` count, and `RepeatPerCount` deletion of opposing Digimon with play cost at most 6. It has exactly one `registerIrCard("BT8-106", compiled)` and no `registerCard`. The snapshot `effects.json:119923-119951` omits `costBudget: 15`, count tracking, and the repeat delete action, so it is recorded as drift and remains untouched.

**Interpreter, peer, and focused evidence.** `actions/reveal.ts:242-260` selects by cost budget and sums printed costs; `:370-372` supports count tracking. BT11-044 (`apps/api/src/cards/BT11/BT11-044.ts:19`) and BT14-068 (`apps/api/src/cards/BT14/BT14-068.ts:11,65`) are reveal/budget peers; BT2-041 (`apps/api/src/cards/BT2/BT2-041.ts:25`) is a repeat-per-count peer. `apps/api/src/cards/BT8/BT8-106.test.ts:6-85` statically covers budget selection and per-play deletion.

**Evolution and score.** No legal evolution stack applies to this Option. Result: **8/10 provisional**.

### BT8-107 — Pandemonium Flame

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The committed catalog entry is `packages/shared/src/cards/data/cards.json:65540-65555`. It identifies a purple Option with play cost 2. Main may delete one own Digimon to delete one opposing unsuspended Digimon whose level is no greater than the deleted Digimon's level; Security deletes one opposing unsuspended Digimon. The single query returned Q1788, confirming that the own Digimon may still be deleted even if no opposing target exists or no opposing target matches.

**Rules and boundaries.** The opposing target must be unsuspended and level-bounded relative to the own Digimon deleted as the cost. The cost and effect target are distinct controllers and must not be collapsed into `sameTarget`. Rules 15-6 and effect processing require the cost to be payable even when the optional effect target cannot be found, as confirmed by Q1788. No name, trait, or color boundary is present, and no evolution stack applies.

**Direct authority and correction.** `apps/api/src/cards/BT8/BT8-107.ts:6-59` was corrected to set `allowCostWithoutTarget: true` on the Main delete action. The action retains `relativeTo: "lastDeleted"` and opposing-unsuspended filtering; Security remains a separate opposing-unsuspended deletion. It has exactly one `registerIrCard("BT8-107", compiled)` and no `registerCard`. This is one corrected direct field.

**Interpreter, peer, and snapshot evidence.** `costs.ts:1332-1355` captures `lastDeletedLevel` before the own Digimon is deleted. `actions/runAction.ts:133-175` shows that without `allowCostWithoutTarget`, a missing opposing target prevents the delete-own cost path; the flag allows the cost to proceed. EX12-062 (`apps/api/src/cards/EX12/EX12-062.ts:39,72`) is a same-mechanism peer. The snapshot `effects.json:119952-119982` omits both the last-deleted level reference and no-target permission, so it is stale drift. `apps/api/src/cards/BT8/BT8-107.test.ts:8-42,48-72` covers the normal relation and adds static proof that the own Digimon is deleted with no available opposing target.

**Evolution and score.** No legal evolution stack applies to this Option. Result: **8/10 provisional**.

### BT8-108 — Mist Memory Boost!

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The committed catalog entry is `packages/shared/src/cards/data/cards.json:65556-65571`. It identifies a purple Option with play cost 3. Main trashes the top two cards of the owner's deck, draws one, and places this Option in the battle area; Delay then gains 2 memory. Security places this card in the owner's battle area. The single query returned no local KB entry.

**Rules and boundaries.** Rules 15-1-2 requires mill, draw, and self-placement in the listed order. Rules 15-15-3 covers top-of-deck processing, and rules 16-17 cover Delay activation and its turn restriction. The card is a purple Option; the actions have no name, trait, or color target boundary beyond ownership. No evolution stack applies.

**Direct authority and snapshot.** `apps/api/src/cards/BT8/BT8-108.ts:6-54` compiles `TrashTopDeck` count 2, Draw count 1, self-placement, Main Delay gain 2 memory, and Security self-placement, with exactly one `registerIrCard("BT8-108", compiled)` and no `registerCard`. The read-only snapshot `effects.json:119983-120001` contains a generic one-card trash target instead of the direct top-two mill plus draw sequence, so drift is recorded without editing the generated file.

**Interpreter, peer, and focused evidence.** The resource/deck action primitives and `effect.ts` timing path support ordered deck discard, draw, self-placement, and Delay. A BT19 memory-boost Option is a same-mechanism Delay/resource peer. `apps/api/src/cards/BT8/BT8-108.test.ts:8-60` statically covers the Main sequence and Security placement.

**Evolution and score.** No legal evolution stack applies to this Option. Result: **8/10 provisional**.

### BT8-109 — Flame Hellscythe

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog, errata, and KB.** The committed catalog entry is `packages/shared/src/cards/data/cards.json:65572-65587`; the catalog also points to the BT8-109 errata image. The single range-ordered query returned the 2022-05-27 erratum: the second Main effect is optional, changing “Then, play” to “Then, you may play.” The purple/yellow Option has play cost 6, gives one opposing Digimon -6000 DP for the turn, then may play one purple or yellow Digimon with DP 6000 or less from the owner's trash without paying its cost; Security is Activate Main.

**Rules and boundaries.** The two Main actions resolve in order; the second is optional as required by the erratum. The play target is from the owner's trash, is a Digimon, has purple or yellow color, and has DP at most 6000. It is a color OR boundary, not a name or trait boundary. No evolution stack applies.

**Direct authority and snapshot.** `apps/api/src/cards/BT8/BT8-109.ts:6-56` faithfully compiles the -6000 action, optional trash play without cost, Security Activate Main, and exactly one `registerIrCard("BT8-109", compiled)` with no `registerCard`. The read-only snapshot `effects.json:120002-120034` matches the direct module and erratum; no drift correction is needed.

**Interpreter, peer, and focused evidence.** The play-without-cost action and DP/color filters provide the relevant shared semantics. `apps/api/src/cards/BT8/BT8-109.test.ts:8-70` statically covers the DP reduction, optional trash play, and Security Activate Main. No ambiguity remains after applying the erratum.

**Evolution and score.** No legal evolution stack applies to this Option. Result: **8/10 provisional**.

### BT8-110 — Armor Texture!

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog, errata, and KB.** The committed catalog entry is `packages/shared/src/cards/data/cards.json:65588-65603`; the catalog points to the BT8-110 errata image. The single range-ordered query returned Q1789-Q1791 and the 2022-05-27 erratum: after trashing the top Armor Form card, the player may digivolve another own Digimon into an Armor Form Digimon from hand for its digivolution cost; only that Digimon unsuspends if the evolution occurs, and declining the evolution means no unsuspension. Digivolution requirements cannot be ignored. Security may play one level 3 Digimon with the Free trait from hand or trash without paying its cost.

**Rules, boundaries, and evolution stack.** Rules 2-3-2-3 makes Armor Form and Free exact trait checks; the Security target is level 3 and Free, while the Main evolution target is an own Digimon into a hand card with Armor Form. The white Option's waiver applies only while an own Armor Form trait Digimon is in play. The applicable in-effect evolution stack is: own Armor Form Digimon supplies the waiver; trash exactly the top card of that Digimon's stack; choose an own Digimon; choose a legal Armor Form Digimon card in hand; pay its printed digivolution cost and satisfy its printed requirements; resolve the evolution; unsuspend only the Digimon that actually evolved. If the optional evolution is declined or does not resolve, no unsuspension occurs. There is no name or color shortcut for either trait boundary.

**Direct authority and correction status.** `apps/api/src/cards/BT8/BT8-110.ts:6-128` compiles the Armor Form waiver, Armor Form top-card trash (`topCardOnly`), optional hand evolution with payment and result binding, targeted unsuspension conditioned on actual digivolution, and optional Security play of a level 3 Free Digimon from hand/trash without cost. It has exactly one `registerIrCard("BT8-110", compiled)` and no `registerCard`. No direct correction was proven necessary in this audit.

**Interpreter, errata, peer, and snapshot evidence.** `actions/removal.ts:539-550` supports top-card-only Armor stack removal; `actions/digivolve.ts:375-468` supports evolution result binding and records whether an evolution actually occurred; `conditions.ts:717-727` supports `ifThisEffectDigivolved`. BT19-084 is a result-binding evolution peer. The read-only snapshot `effects.json:120035+` omits `topCardOnly`, the direct result-binding/from-selection reference, and expresses the conditional as raw “you do” rather than the executable digivolution condition; Security optionality matches the erratum. This is recorded snapshot drift, not a reason to edit the generated file. `apps/api/src/cards/BT8/BT8-110.test.ts:7-104` statically covers top-stack trash, legal evolution and exact-target unsuspension, plus declining evolution with no unsuspension.

**Score.** Result: **8/10 provisional**; the legal evolution gate and all runtime gates remain deferred.

### BT8-111 — Creepymon

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10.

Clause trace merged from `internal-docs/audits/BT8/BT8-111-112.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

* Catalog: `cards.json:65604-65626` identifies Purple Creepymon as a level 6
  Mega/Virus Digimon, play cost 12, DP 11000, with a Purple level-5
  digivolution for cost 3 and traits Demon Lord plus Seven Great Demon Lords.
  Its first clause mills two own deck cards for each opposing Digimon in play;
  if that effect actually mills at least four, it may play one own Purple
  Digimon level 5 or lower from trash without paying memory cost. Its attack
  clause is once per turn and, for each ten cards in its trash, mills three
  opponent deck cards and gives itself +3000 DP for the turn.
* Direct executable authority: `BT8-111.ts:4-46` uses a mine-controlled
  `TrashTopDeck` amount 2 with a battle-area opponent Digimon scaling filter,
  records the actual moved count as `creepymonMilled`, and gates an optional
  free trash-origin play to that count being at least 4. The target is exactly
  one own Purple Digimon with level <=5. `BT8-111.ts:49-87` uses
  `WhenAttacking`/`OncePerTurn`, opponent deck trash amount 3, and two own
  trash-count-per-10 scalings: one for the mill and one for self +3000 DP
  `forTheTurn`. Registration at `:94` is exclusive IR registration.
* Clause and boundary proof: `BT8-111.test.ts:7-55` statically asserts the
  opponent-count mill, actual-count threshold, Purple/level-5-or-lower
  trash target, attack frequency, opponent deck destination, and per-ten
  scaling. Its runtime-shaped fixture at `:51-75` contains two opposing
  Digimon and a legal `BT10-012` Purple level-5 base, proving the intended
  evolution stack and the level/color play boundary by construction. There is
  no inherited, Security, or trait-filter clause to add.
* Correction: no direct behavior gap was proven. `compiled` was exported at
  `BT8-111.ts:4` solely so the colocated static proof can inspect the exact
  registered object; registration remains the one `registerIrCard` call. The
  static test was strengthened without changing executable semantics.
* Snapshot drift: `effects.json:120110-120165` matches the filters, amounts,
  free-play target, and attack scaling, but omits `trackCount` and represents
  the >=4 condition as raw text (`:120138`) rather than the direct structured
  `namedCountAtLeast` condition. It also spells the direct `forTheTurn`
  duration as `UntilEndOfTurn` (`:120157`), a representation normalization.
  The direct module's tracked actual count is the executable authority and no
  snapshot edit is made.

### BT8-112 — Imperialdramon: Paladin Mode

Re-audit row (`docs/audits/BT8-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT8-STATIC-AUDIT.md`, 2026-09-05): 10/10; corrected.

Clause trace merged from `internal-docs/audits/BT8/BT8-111-112.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

* Catalog: `cards.json:65629-65656` identifies White Imperialdramon:
  Paladin Mode as a level 7 Mega/Vaccine Digimon, play cost 15, DP 16000,
  with either Blue level 6 or Green level 6 evolution for cost 7 and trait
  Ancient Holy Warrior. From hand, when one of the controller's Digimon would
  digivolve into this exact card, the controller may return one White level-7
  Digimon from trash to the bottom of its owner's deck to reduce the
  digivolution cost by 4. Its When Digivolving and When Attacking clauses are
  the same sequence: optionally return one multicolor card from this
  Digimon's own stack to its owner's deck bottom, trash all digivolution cards
  of one opponent Digimon, then return all opponent Digimon with no
  digivolution cards to their owners' deck bottoms in any order.
* Direct executable authority: `BT8-112.ts:48-74` uses a
  `BeforePayCost` replacement for `wouldDigivolve` with exact `into:
  {cardId: "BT8-112"}` and nested reduce-cost amount 4. Its cost targets one
  own White level-7 Digimon from trash and returns it to deck bottom, matching
  the in-hand replacement and the two legal level-6 evolution alternatives.
  `BT8-112.ts:5-46` shares one body between both trigger timings. The first
  `TrashDigivolution` targets one opponent Digimon with a stack, takes all of
  its stack cards (`amount: "all"`), and has a cost returning exactly one multicolor card from
  the source's own stack to deck bottom. The final Return targets all opponent
  Digimon with no stack and explicitly carries `order: "any"`. Registration at
  `:83` is exclusive IR registration.
* Clause and boundary proof: `BT8-112.test.ts:5-31` statically asserts the
  exact in-hand replacement, card ID, reduction amount, White level-7 trash
  filter, and deck-bottom cost destination. `:33-61` asserts that the first
  body action is optional, requires the source's own multicolor stack card,
  aborts the remaining clause when declined, and that the final opponent
  return uses any-order bottom-deck placement. The final test also asserts
  that When Attacking is Once Per Turn and reuses the identical action body.
  The legal stack boundary is the catalog's Blue-6-or-Green-6 requirement;
  the trait is not used as an accidental selector, and the White level-7
  requirement is restricted to the cost card in trash.
* Corrections: four proven direct field gaps were corrected. `amount: "all"`
  models the printed unbounded stack trash without an arbitrary ceiling.
  `isSelfRef:
  true` at `BT8-112.ts:24` prevents the return cost from selecting a
  multicolor card under another own Digimon; `abortOnDecline: true` at `:17`
  prevents the final “Then” return from resolving when the optional first
  clause is declined, as required by comprehensive rule 15-7-2; and
  `order: "any"` at `:44` exposes the printed bottom-deck ordering choice to
  the shared Return primitive. These are card-local corrections; no shared
  engine primitive required a change.
* Snapshot drift: `effects.json:120166-120252` represents the replacement as
  a Static action with a zone-based hand target and RawUnparsed reduction
  text, while the direct module has an executable `BeforePayCost` replacement
  with exact BT8-112 identity and structured cost. The trigger body snapshot
  splits the source-stack return, opponent stack trash, and final return into
  three optional actions (`:120187-120245`), uses `colorCount: 2`, and omits
  both `abortOnDecline` and final `order: "any"`. The direct module's
  transactional cost and self-host scope are more precise executable
  semantics; the snapshot remains read-only and advertises partial coverage
  with the reduction clause in residual (`:120248-120252`).

## Mechanisms

No `*-MECHANISM.md` note was written for BT8. The engine seams this set exercises are listed in the affected-mechanism manifest under Gates.

## Knowledge base index

Source: `docs/audits/BT8-reaudit/KB-INDEX.md`.

Card-level rulings references are recorded in grouped audit reports.

## Open items

- No card is below 10/10 and no unresolved ambiguity is recorded. `docs/audits/BT8-STATIC-AUDIT.md`
  reports blocked or ambiguous: 0, and the 2026-09-10 run records the final strict recalc at 112/112.
- Contradiction inside one file: the score table in `docs/audits/BT8-REAUDIT-LEDGER.md` (2026-09-10,
  commit `59db5fece`) leaves the gates column at 0 and every row at 8/10, while the summary line at
  the top of the same file states 1120/1120 with 112/112 verified at 10/10 and all delivery gates
  passed. `docs/audits/BT8-reaudit/RUN.md` from the same commit confirms the recalc, so the rows are
  treated as stale. Every row is reproduced per card in the card ledger so the discrepancy stays
  visible.
- Contradiction: the range reports in `internal-docs/audits/BT8/` (commit `eb1a58b75`) score cards
  8/10 provisional with deferred gates and note stale `effects.json` records. The 2026-09-05 closeout
  and the 2026-09-10 run both report 112 synchronized records with zero out-of-set changes. The newer
  reports win.
- Contradiction: `docs/audits/BT8-revalidation-2026-08-25.md` (commit `52da0b5bb`) already claimed
  fresh 10/10 for all 112 cards from base `7820f22b8`, which the range reports written two days later
  contradict by scoring 8/10 provisional. Both are superseded by the two 2026-09 reports.
- BT8-015 was the only card that needed stronger proof in the 2026-09-10 run: the first mutation
  proposal deleted both selected low-DP targets, and the corrected test uses a high-DP BT8-032 peer
  with a pre-deletion permanent-ID capture. It ends green at 4/4.
- One `effects:check:set` attempt timed out in Oxfmt and was discarded before the green retry.

## History

Raw evidence for these files stays in git history at the commits named below. This document was
assembled at repository commit `eabe99351`.

- `docs/audits/BT8-REAUDIT-LEDGER.md` — `59db5fece`, 2026-09-10. Independent evidence ledger; summary
  at 10/10, rows left at the 8/10 worker cap. Merged into Card ledger.
- `docs/audits/BT8-reaudit/` (4 files: `RUN.md`, `KB-INDEX.md`, `REVIEW-NOTES.md`,
  `WORKER-BRIEF.md`) — `59db5fece`, 2026-09-10. Run log with the full gate sequence, the BT8-015
  mutation progression, and the final strict recalc, plus the knowledge base index, coordinator note,
  and read-only worker brief. Run log merged into Gates; index merged into Knowledge base index.
- `docs/audits/BT8-STATIC-AUDIT.md` — `eb1a58b75`, 2026-09-05. Campaign closeout with the
  reproducible execution evidence list and the 112-row score table. Merged into Gates and Card
  ledger.
- `internal-docs/audits/BT8/` (12 range reports, `BT8-001-010.md` through `BT8-111-112.md`) —
  `eb1a58b75`, 2026-09-05. Worker-stage clause traces, 8/10 provisional. Merged into Card ledger.
- `docs/audits/BT8-revalidation-2026-08-25.md` — `52da0b5bb`, 2026-08-28. Fresh 2026-08-25
  revalidation from base `7820f22b8`, claiming 10/10 for all 112 cards, with the BT8-019 and BT8-107
  fixes. Recorded under Open items; the file is dropped.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for BT8: PR #4597; commit `c1fcc03c2`.
