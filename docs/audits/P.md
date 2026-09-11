---
set: P
cards: 249
status: verified
verified_at: 2026-09-11
catalog_commit: 88241f0fc
evidence_commit: a8136a499
---

# P audit

## Status

All 249 committed P cards hold accepted clause-level evidence at 10/10. The original 243 were
recalculated on 2026-09-05 on branch `audit-promo-lm-rb-20260905` from base `7209adb89` and
verified again after that branch was integrated with main `18156ecee`; P-245 through P-250 (6 new
promo cards imported on 2026-09-11 from the `TakaOtaku/Digimon-Card-App` community database,
announced but not yet distributed — Official Store Tournament 2026 Vol.4, street date 2026-10-01)
were authored and verified fresh on 2026-09-11, each independently to the same 10/10 rubric. P-226
and P-251 are absent from the catalog (unrevealed placeholder rows in the source database), so the
set has 249 cards rather than 251. The winning source for P-001..P-244 is the recalculated ledger
`P-AUDIT.md` with its coordinator report `PROMO-LM-RB-AUDIT-20260905.md` and four dated range
reviews; P-245..P-250 have no separate range-review document — their evidence is the card ledger
entries above plus their modules and tests. Re-running the collection on 2026-09-11 confirms it:
`pnpm --filter @aegis/api exec vitest run src/cards/P` passes 266 files and 1,494 tests, and
`pnpm effects:sync:set -- --set P` reports 249 records synchronized with no drift outside the set.

The one-card ST11 Special Entry Pack report is folded in here: ST11 is not a starter-deck set with
`ST11-*` card IDs. The committed `cardPool.ts` promo-product entry labels the product (2022-10-14,
`cardIds: "065"`) and `promoProductCardIds()` derives `P-065` — Gammamon, Red Lv.3, 2000 DP. ST11
therefore has no card directory and no audit document of its own.

## Gates

Re-run for this document on 2026-09-10 at `eabe99351`:

```sh
pnpm --filter @aegis/api exec vitest run src/cards/P --maxWorkers=1
```

260 test files and 1,405 tests passed in 6.27 s.

Gates carried from the winning report (`PROMO-LM-RB-AUDIT-20260905.md`, `P-AUDIT.md`), run with
`--maxWorkers=1 --no-file-parallelism` after integration with main `18156ecee`:

```sh
pnpm --filter @aegis/api exec vitest run src/cards/P src/cards/LM src/cards/RB1 src/cards/promo-lm-rb.catalog-parity.test.ts --maxWorkers=1 --no-file-parallelism
pnpm typecheck
git diff --check
```

- Combined P/LM/RB1 and persisted parity: 362 files, 1,988 tests passed, in ten serial batches of
  at most 40 files. The slow monolithic run was stopped and is not counted as passing evidence.
- Related and incoming shared-engine mechanisms: 19 files, 525 tests passed.
- Security DP, Delay placement, delayed effects, reactive Delay, copied effects and alternate
  evolution mechanisms: 6 files, 90 tests passed.
- Rendered Promo and EX10 evolution-stack scenarios: 2 files, 2 tests passed, including the P-122
  real-room [evolution-stack scenario](../../apps/web/test/promoEvolution.scenario.test.tsx).
- Full workspace typecheck, changed-file lint and format, and clean full diff checks passed.
- Persisted-effect parity: 154 stale P records synchronized via
  `tools/sync-effects-from-card-modules.mjs`, preserving other sets' bytes. The 338-card parity
  guard reads the persisted JSON independently, reproduced the stale P-116, P-122 and P-147 records
  before synchronization, and passed all 339 assertions.

## Card ledger

### P-001 — Agumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-001.ts) · [test](../../apps/api/src/cards/P/P-001.test.ts) · clause review (source removed; see History)<br>“deletes only an opponent Digimon with 3000 DP or less on play”

### P-002 — Biyomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-002.ts) · [test](../../apps/api/src/cards/P/P-002.test.ts) · clause review (source removed; see History)<br>“draws when its host deletes an opposing Digimon in battle and survives”; “does not draw when its host loses the battle”

### P-003 — Gabumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-003.ts) · [test](../../apps/api/src/cards/P/P-003.test.ts) · clause review (source removed; see History)<br>“trashes the bottom, rather than the top, digivolution card of the chosen opponent”

### P-004 — Gomamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-004.ts) · [test](../../apps/api/src/cards/P/P-004.test.ts) · clause review (source removed; see History)<br>“your effect trashing an opponent Digimon's digivolution card gains 1 memory”; “a return-to-hand bounce that clears digivolution cards gains NO memory (Q4113)”; “the OPPONENT trashing their own digivolution card gains YOU no memory (by-your-effect gate)”

### P-005 — Patamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-005.ts) · [test](../../apps/api/src/cards/P/P-005.test.ts) · clause review (source removed; see History)<br>“recovers the top deck card only at one or fewer security”; “does not recover at two security cards”

### P-006 — Gatomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-006.ts) · [test](../../apps/api/src/cards/P/P-006.test.ts) · clause review (source removed; see History)<br>“gives its host +1000 DP only on its owner's turn with at least 3 security”

### P-007 — Garurumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-007.ts) · [test](../../apps/api/src/cards/P/P-007.test.ts) · clause review (source removed; see History)<br>“draws when its Garurumon-family host attacks”; “does not draw under an unrelated host”; “attributes the real Garurumon + X Antibody attack triggers without inventing P-008”

### P-008 — WereGarurumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-008.ts) · [test](../../apps/api/src/cards/P/P-008.test.ts) · clause review (source removed; see History)<br>“unsuspends with exact Garurumon and grants inherited Security Attack +1 at 8 cards”; “does not unsuspend with Garurumon (X Antibody)”

### P-009 — Agumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-009.ts) · [test](../../apps/api/src/cards/P/P-009.test.ts) · clause review (source removed; see History)<br>“gives +2000 DP only to a Greymon-family host during its owner's turn”

### P-010 — Greymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-010.ts) · [test](../../apps/api/src/cards/P/P-010.test.ts) · clause review (source removed; see History)<br>“gains Security Attack +1 with exact Agumon, not Agumon Expert”

### P-011 — Veedramon Zero

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-011.ts) · [test](../../apps/api/src/cards/P/P-011.test.ts) · clause review (source removed; see History)<br>“may trash exactly the top 3 cards with a blue Tamer to gain +2000 DP”; “cannot pay the mill cost with fewer than 3 cards in deck”; “returns 3 non-Digi-Egg cards from trash to deck bottom, then draws”

### P-012 — Tai Kamiya (V-Tamer)

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-012.ts) · [test](../../apps/api/src/cards/P/P-012.test.ts) · clause review (source removed; see History)<br>“suspends itself to draw when a Veedramon-family Digimon is in the battle area”; “may give any own Digimon +1000 DP, not only the Veedramon”; “does not activate when the only Veedramon is in the breeding area (Q4124)”; “may decline without suspending itself or resolving either branch”; “plays itself for free from security”

### P-013 — Keramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-013.ts) · [test](../../apps/api/src/cards/P/P-013.test.ts) · clause review (source removed; see History)<br>“gives its host +1000 DP only during the opponent's turn”

### P-014 — Kurisarimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-014.ts) · [test](../../apps/api/src/cards/P/P-014.test.ts) · clause review (source removed; see History)<br>“has Blocker and loses exactly 2 memory when it attacks”

### P-015 — Infermon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-015.ts) · [test](../../apps/api/src/cards/P/P-015.test.ts) · clause review (source removed; see History)<br>“de-digivolves exactly one card and leaves the bottom source intact”; “does nothing to a level 3 Digimon with no digivolution cards”

### P-016 — Diaboromon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-016.ts) · [test](../../apps/api/src/cards/P/P-016.test.ts) · clause review (source removed; see History)<br>“gains SecurityAttack +1 when P-016 itself is the only Diaboromon (KB Q4128: self-counts)”; “scales to +2 when there are 2 Diaboromon in play”; “counts a Diaboromon token but not Diaboromon (X Antibody)”; “does NOT grant SecurityAttack on the opponent's turn (Your Turn gate)”; “does NOT grant SecurityAttack when no Diaboromon is in the battle area”

### P-017 — DemiDevimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-017.ts) · [test](../../apps/api/src/cards/P/P-017.test.ts) · clause review (source removed; see History)<br>“trashes exactly the top two cards of its controller's deck”

### P-018 — Devimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-018.ts) · [test](../../apps/api/src/cards/P/P-018.test.ts) · clause review (source removed; see History)<br>“deletes a level 3 opponent Digimon and leaves a level 4 target”

### P-019 — Myotismon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-019.ts) · [test](../../apps/api/src/cards/P/P-019.test.ts) · clause review (source removed; see History)<br>“grants inherited Retaliation that deletes the battle winner”

### P-020 — VenomMyotismon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-020.ts) · [test](../../apps/api/src/cards/P/P-020.test.ts) · clause review (source removed; see History)<br>“plays a purple level 4 or lower Digimon from trash without paying its cost”; “does not activate the revived Digimon's On Play effect”; “cannot revive a level 5 Digimon or a non-purple Digimon”

### P-021 — A New World

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-021.ts) · [test](../../apps/api/src/cards/P/P-021.test.ts) · clause review (source removed; see History)<br>“plays a Palmon free from hand and bounces Mimi to hand when Mimi is in play”; “can be used with a green source but does nothing when no exact Mimi is in play”; “does not treat a combined Tamer whose name contains Mimi Tachikawa as exact Mimi”; “keeps the same printed clause through Palmon and exact-Mimi selections”; “adds itself to its owner's hand after a real security check”

### P-022 — DNA Digivolution-Hearts United

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-022.ts) · [test](../../apps/api/src/cards/P/P-022.test.ts) · clause review (source removed; see History)<br>“atomically bottoms exact ExVeemon and Stingmon in chosen order to play Paildramon”; “does not bottom either named card unless both parts of the cost are available”; “does not treat the combined Davis and Ken Tamer as both exact named Tamers”; “adds itself to hand from security”; “is suppressed when BT1 WarGreymon checks this Option from security”

### P-023 — Patamon's Confession

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-023.ts) · [test](../../apps/api/src/cards/P/P-023.test.ts) · clause review (source removed; see History)<br>“requires T.K. Takaishi, then places the Patamon to security and trashes its stack”; “can be used with T.K. but no Patamon and resolves without changing security (Q4132)”; “can be used without T.K. when another yellow source meets the color rule, but does nothing”; “offers each Patamon permanent, preserves inherited provenance, and bottoms only the chosen top”; “adds itself to its owner's hand after a real security check”

### P-024 — Tai's Growing Up!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-024.ts) · [test](../../apps/api/src/cards/P/P-024.test.ts) · clause review (source removed; see History)<br>“bottoms exact Agumon, trashes that stack, and draws 3 with exact Tai Kamiya”; “rejects Tai (V-Tamer) and Agumon Expert as exact-name substitutes”; “does not draw when exact Tai is present but no exact Agumon can be bottom-decked”; “allows declining the single optional effect without moving Agumon or drawing”; “adds itself to its owner's hand after a real security check”

### P-025 — GranKuwagamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-025.ts) · [test](../../apps/api/src/cards/P/P-025.test.ts) · clause review (source removed; see History)<br>“can't pay Digi-Burst 2 with a protected X Antibody and only 1 trashable source”; “Digi-Bursts exactly 2 sources and grants Security Attack +1 without deleting allies”

### P-026 — BlackWarGreymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-026.ts) · [test](../../apps/api/src/cards/P/P-026.test.ts) · clause review (source removed; see History)<br>“Digi-Bursts exactly 2 sources to unsuspend itself without trashing another Digimon”; “doesn't unsuspend when X Antibody leaves only 1 trashable Digi-Burst source”; “can't activate after turn ownership passes (Q4135)”

### P-027 — MetalGarurumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-027.ts) · [test](../../apps/api/src/cards/P/P-027.test.ts) · clause review (source removed; see History)<br>“Digi-Bursts exactly 2 sources to use a purple cost-7-or-less Option for free”; “may pay Digi-Burst even when no eligible Option is selected”; “doesn't use an Option when X Antibody leaves only 1 trashable Digi-Burst source”

### P-028 — Pulsemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-028.ts) · [test](../../apps/api/src/cards/P/P-028.test.ts) · clause review (source removed; see History)<br>“draws with three or more security cards”; “gains memory with three or fewer security cards”; “does both effects at exactly three security cards”

### P-029 — Agunimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-029.ts) · [test](../../apps/api/src/cards/P/P-029.test.ts) · clause review (source removed; see History)<br>“shows an optional AncientGreymon confirmation and can decline without scheduling deletion”; “reduces only an AncientGreymon digivolution from its own host”; “does not reduce an unrelated digivolution from its host”; “digivolves into AncientGreymon while attacking and deletes that Digimon at end of turn”; “still deletes the same Digimon after AncientGreymon digivolves again (Q4138)”

### P-030 — Lobomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-030.ts) · [test](../../apps/api/src/cards/P/P-030.test.ts) · clause review (source removed; see History)<br>“can decline the optional AncientGarurumon digivolution without scheduling deletion”; “digivolves into AncientGarurumon for exactly 1 memory, ignoring requirements”; “deletes that Digimon at end of turn even after it digivolves again (Q4141)”; “its inherited effect reduces a normal AncientGarurumon digivolution cost by 2”; “does not reduce an unrelated digivolution from its inherited host”

### P-031 — Gatomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-031.ts) · [test](../../apps/api/src/cards/P/P-031.test.ts) · clause review (source removed; see History)<br>“recovers one card when played with exactly 3 security cards”; “does not recover when played with 4 security cards”; “has Blocker on the opponent's turn only while a purple Digimon is in play”; “does not have Blocker during its controller's turn”; “loses Blocker before reaction timing when When Attacking deletes its purple ally (Q4144)”

### P-032 — Palmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-032.ts) · [test](../../apps/api/src/cards/P/P-032.test.ts) · clause review (source removed; see History)<br>“grants Jamming only when this source is trashed by its host's Digi-Burst”; “does not grant Jamming when the same Digi-Burst trashes two other sources”

### P-033 — Sunarizamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-033.ts) · [test](../../apps/api/src/cards/P/P-033.test.ts) · clause review (source removed; see History)<br>“gives Piercing to all own black Digimon at 13000 DP or more”; “grants Security Attack +1 while inherited by a 13000 DP black Digimon”; “stops extra checks when the first security card de-digivolves its host below 13000 DP (Q4147)”

### P-034 — DemiDevimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-034.ts) · [test](../../apps/api/src/cards/P/P-034.test.ts) · clause review (source removed; see History)<br>“counts itself after deletion as the seventh Devimon and offers DanDevimon (Q4148)”; “lets the player decline the single optional play”; “does not prompt when its deletion leaves only six Devimon cards in trash”

### P-035 — Red Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-035.ts) · [test](../../apps/api/src/cards/P/P-035.test.ts) · clause review (source removed; see History)<br>“reveals every card and honors the chosen deck-bottom order”

### P-036 — Blue Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-036.ts) · [test](../../apps/api/src/cards/P/P-036.test.ts) · clause review (source removed; see History)<br>“shows all 4 revealed cards, enables only the matching-color Digimon, and orders the rest”; “adds only its matching-color Digimon, then Delays for 2 memory on a later turn”; “does not let an Option permanent satisfy another copy's color requirement”; “places itself from security and offers Delay only from the next turn, without a color source”

### P-037 — Yellow Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-037.ts) · [test](../../apps/api/src/cards/P/P-037.test.ts) · clause review (source removed; see History)<br>“shows all 4 revealed cards, enables only the matching-color Digimon, and orders the rest”; “adds only its matching-color Digimon, then Delays for 2 memory on a later turn”; “does not let an Option permanent satisfy another copy's color requirement”; “places itself from security and offers Delay only from the next turn, without a color source”

### P-038 — Green Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-038.ts) · [test](../../apps/api/src/cards/P/P-038.test.ts) · clause review (source removed; see History)<br>“shows all 4 revealed cards, enables only the matching-color Digimon, and orders the rest”; “adds only its matching-color Digimon, then Delays for 2 memory on a later turn”; “does not let an Option permanent satisfy another copy's color requirement”; “places itself from security and offers Delay only from the next turn, without a color source”

### P-039 — Black Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-039.ts) · [test](../../apps/api/src/cards/P/P-039.test.ts) · clause review (source removed; see History)<br>“shows all 4 revealed cards, enables only the matching-color Digimon, and orders the rest”; “adds only its matching-color Digimon, then Delays for 2 memory on a later turn”; “does not let an Option permanent satisfy another copy's color requirement”; “places itself from security and offers Delay only from the next turn, without a color source”

### P-040 — Purple Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-040.ts) · [test](../../apps/api/src/cards/P/P-040.test.ts) · clause review (source removed; see History)<br>“shows all 4 revealed cards, enables only the matching-color Digimon, and orders the rest”; “adds only its matching-color Digimon, then Delays for 2 memory on a later turn”; “does not let an Option permanent satisfy another copy's color requirement”; “places itself from security and offers Delay only from the next turn, without a color source”

### P-041 — Guilmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-041.ts) · [test](../../apps/api/src/cards/P/P-041.test.ts) · clause review (source removed; see History)<br>“draws 1 whenever it attacks”; “draws 1 when attacking the player, not only an opposing Digimon”

### P-042 — Gabumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-042.ts) · [test](../../apps/api/src/cards/P/P-042.test.ts) · clause review (source removed; see History)<br>“shows all 5 cards but enables only Tamers for the On Play choice”; “adds 1 Tamer from the top 5 and puts the other revealed cards at deck bottom”; “returns all 5 revealed cards to deck bottom when none is a Tamer”

### P-043 — Kudamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-043.ts) · [test](../../apps/api/src/cards/P/P-043.test.ts) · clause review (source removed; see History)<br>“returns Kentaurosmon and recovers the deck top”; “allows declining the Kentaurosmon return and therefore does not recover”; “does not recover when no Kentaurosmon can be returned”; “uses its inherited On Deletion to give an opponent Digimon -1000 DP for the turn”

### P-044 — HerculesKabuterimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-044.ts) · [test](../../apps/api/src/cards/P/P-044.test.ts) · clause review (source removed; see History)<br>“can suspend 1 opponent Digimon regardless of its DP”; “can choose to suspend exactly 2 opponent Digimon with 5000 DP or less”; “may choose the 1-target mode even when 2 low-DP targets exist”; “Q4161: may suspend only 1 target in the 2-low-DP mode”

### P-045 — Kurisarimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-045.ts) · [test](../../apps/api/src/cards/P/P-045.test.ts) · clause review (source removed; see History)<br>“grants Decoy (Black/White) to another same-name Digimon and protects the host”; “does not spend the granted Decoy on a battle deletion”

### P-046 — Wizardmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-046.ts) · [test](../../apps/api/src/cards/P/P-046.test.ts) · clause review (source removed; see History)<br>“gains 1 memory after the first Option used each turn, but not the second”; “Q5519: does not trigger when a Delay effect activates without using an Option card”; “Q5519: does not trigger when an Option's Security effect activates”

### P-047 — AeroVeedramon Zero

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-047.ts) · [test](../../apps/api/src/cards/P/P-047.test.ts) · clause review (source removed; see History)<br>“trashes up to 3 deck cards and gets +3000 DP for the turn with a Tamer”; “still trashes 3 cards but gets no DP bonus without a Tamer”; “inherited effect returns exactly 3 non-Digi-Egg cards and grants +2000 DP when attacking”; “cannot pay the inherited effect with fewer than 3 non-Digi-Egg cards”; “may decline the inherited return cost and gains no DP”

### P-048 — UlforceVeedramon Zero

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-048.ts) · [test](../../apps/api/src/cards/P/P-048.test.ts) · clause review (source removed; see History)<br>“unsuspends the Digimon after paying 3 non-DigiEgg from trash cost”; “does not unsuspend when trash has fewer than 3 non-DigiEgg cards”; “may decline to return the 3 cards and leaves both permanents suspended”; “gains memory once when an AeroVeedramon Zero stack returns 3 cards while attacking”

### P-049 — Phoenixmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-049.ts) · [test](../../apps/api/src/cards/P/P-049.test.ts) · clause review (source removed; see History)<br>“gains Security Attack +1 for the turn when a Tamer is in play”; “does not gain Security Attack without a Tamer”; “trashes the opponent's top security card when this Digimon is blocked”; “trashes security only once per turn even if it is blocked twice”

### P-050 — WarGreymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-050.ts) · [test](../../apps/api/src/cards/P/P-050.test.ts) · clause review (source removed; see History)<br>“deletes an opponent Digimon with 13000 DP or more when digivolving with a Tamer”; “does not delete the 13000-DP target without a Tamer”; “deletes only an opponent Digimon with 4000 DP or less when attacking”

### P-051 — MetalGarurumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-051.ts) · [test](../../apps/api/src/cards/P/P-051.test.ts) · clause review (source removed; see History)<br>“draws two additional cards when a Tamer is in play”; “only performs the normal digivolution draw without a Tamer”; “can't be attacked during the opponent's turn”

### P-052 — Vikemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-052.ts) · [test](../../apps/api/src/cards/P/P-052.test.ts) · clause review (source removed; see History)<br>“restricts up to 3 opponent Digimon with no digivolution cards and excludes stacked Digimon”; “allows the UI decision to choose only 1 of 3 eligible Digimon for the up-to-3 restriction”; “restriction remains after the affected Digimon gains a digivolution card (Q4169)”; “returns only an opponent Digimon with no digivolution cards when attacking”; “returns an opponent Digimon only once per turn across two attacks”

### P-053 — Ophanimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-053.ts) · [test](../../apps/api/src/cards/P/P-053.test.ts) · clause review (source removed; see History)<br>“gives one opponent Digimon -5000 DP with a Tamer”; “does not give -5000 DP without a Tamer”; “gives one opponent Digimon and all opponent Security Digimon -2000 DP when attacking”; “applies the Security Digimon reduction to the actual security battle”

### P-054 — Seraphimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-054.ts) · [test](../../apps/api/src/cards/P/P-054.test.ts) · clause review (source removed; see History)<br>“recovers after the normal digivolution draw when a Tamer is in play”; “does not recover on digivolution without a Tamer”; “recovers on deletion without requiring a Tamer”

### P-055 — HerculesKabuterimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-055.ts) · [test](../../apps/api/src/cards/P/P-055.test.ts) · clause review (source removed; see History)<br>“suspends an opponent Digimon with a Tamer”; “does not suspend an opponent Digimon without a Tamer”; “gains 1 memory when it deletes an opponent Digimon in battle and survives”; “does not gain memory when another Digimon wins a battle”; “does not gain memory when it deletes an opponent in battle but does not survive”

### P-056 — Rosemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-056.ts) · [test](../../apps/api/src/cards/P/P-056.test.ts) · clause review (source removed; see History)<br>“applies both attack and block restrictions to the same chosen Digimon”; “does not restrict any Digimon without a Tamer”; “Digisorption suspends 1 own Digimon and reduces the digivolution cost by 2”

### P-057 — Tyrannomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-057.ts) · [test](../../apps/api/src/cards/P/P-057.test.ts) · clause review (source removed; see History)<br>“gets +3000 on its turn and gives +2000 only to a level-6-or-higher host”

### P-058 — Gammamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-058.ts) · [test](../../apps/api/src/cards/P/P-058.test.ts) · clause review (source removed; see History)<br>“can attack an opponent's unsuspended Digimon while a red Tamer is in play”; “can't attack an unsuspended Digimon without a red Tamer”

### P-059 — Gammamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-059.ts) · [test](../../apps/api/src/cards/P/P-059.test.ts) · clause review (source removed; see History)<br>“gives its host +2000 DP during your turn while Hiro is in play”; “does not give +2000 DP without Hiro Amanokawa”

### P-060 — Angoramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-060.ts) · [test](../../apps/api/src/cards/P/P-060.test.ts) · clause review (source removed; see History)<br>“gains 1 memory when its host attacks while Ruli is in play”; “gains memory only once per turn across two attacks”

### P-061 — Jellymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-061.ts) · [test](../../apps/api/src/cards/P/P-061.test.ts) · clause review (source removed; see History)<br>“draws 1 when its host attacks while Kiyoshiro is in play”; “draws only once per turn across two attacks”

### P-062 — Hiro Amanokawa

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-062.ts) · [test](../../apps/api/src/cards/P/P-062.test.ts) · clause review (source removed; see History)<br>“suspends to give Security Attack +1 to an attacker with Gammamon in its sources”; “does not grant Security Attack when Hiro is already suspended”; “does not treat a Gammamon-form name as the exact Gammamon source”; “plays itself from security”

### P-063 — Ruli Tsukiyono

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-063.ts) · [test](../../apps/api/src/cards/P/P-063.test.ts) · clause review (source removed; see History)<br>“suspends to give +3000 DP to an attacker with Angoramon in its sources”; “plays itself from security”; “does not grant +3000 DP when Ruli is already suspended”; “does not treat SymbareAngoramon as the exact Angoramon source”

### P-064 — Kiyoshiro Higashimitarai

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-064.ts) · [test](../../apps/api/src/cards/P/P-064.test.ts) · clause review (source removed; see History)<br>“suspends to give Jamming to an attacker with Jellymon in its sources”; “does not grant Jamming when Kiyoshiro is already suspended”; “does not treat TeslaJellymon as the exact Jellymon source”; “plays itself from security”

### P-065 — Gammamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-065.ts) · [test](../../apps/api/src/cards/P/P-065.test.ts) · clause review (source removed; see History)<br>“deletes an opponent Digimon with 2000 DP or less on play”; “uses the inherited When Attacking effect and keeps targets above 2000 DP”

### P-066 — Huckmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-066.ts) · [test](../../apps/api/src/cards/P/P-066.test.ts) · clause review (source removed; see History)<br>“deletes a 4000 DP-or-less Digimon and always adds itself to hand”; “draws 1 when nothing is deleted, then still adds itself to hand”

### P-067 — Bulucomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-067.ts) · [test](../../apps/api/src/cards/P/P-067.test.ts) · clause review (source removed; see History)<br>“draws 2 at the end of its security battle and adds itself to hand”; “draws as many as possible from a one-card deck, then still adds itself to hand”

### P-068 — Herissmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-068.ts) · [test](../../apps/api/src/cards/P/P-068.test.ts) · clause review (source removed; see History)<br>“gives an opposing Digimon Security Attack -1 for the turn and adds itself to hand”; “reduces the attacking Digimon's remaining security checks immediately”

### P-069 — Pulsemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-069.ts) · [test](../../apps/api/src/cards/P/P-069.test.ts) · clause review (source removed; see History)<br>“suspends an opposing Digimon and adds itself to hand after the security battle”; “still adds itself to hand when there is no opposing Digimon to suspend”

### P-070 — Dorumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-070.ts) · [test](../../apps/api/src/cards/P/P-070.test.ts) · clause review (source removed; see History)<br>“plays an eligible black low-cost Digimon and always adds itself to hand”; “adds the revealed card and itself to hand when the optional play is declined”; “adds an ineligible revealed card and itself to hand without opening a play prompt”; “Q4846: adds itself to hand even when the deck is empty”

### P-071 — Impmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-071.ts) · [test](../../apps/api/src/cards/P/P-071.test.ts) · clause review (source removed; see History)<br>“plays a purple level 3 from trash for free and applies the errata that adds itself to hand”; “may decline the purple level 3 play and still adds itself to hand”

### P-072 — MetalGreymon: Alterous Mode

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-072.ts) · [test](../../apps/api/src/cards/P/P-072.test.ts) · clause review (source removed; see History)<br>“digivolves from a MetalGreymon-named Digimon for cost 0”; “deletes an opponent Digimon with ≤5000 DP when a Tamer is in play”; “does NOT delete when no Tamer is in play”; “prevents effect deletion by trashing exactly 2 same-level digivolution cards”; “also prevents an effect return to hand and leaves the top card in play”; “does not prevent leaving when its digivolution cards have different levels”; “does not prevent effect deletion when the current name has neither Greymon nor Omnimon”; “does not prevent a battle deletion even with a valid same-level pair”; “may decline the inherited prevention and pay no separate cost”

### P-073 — WereGarurumon: Sagittarius Mode

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-073.ts) · [test](../../apps/api/src/cards/P/P-073.test.ts) · clause review (source removed; see History)<br>“digivolves from a WereGarurumon-named Digimon for cost 0”; “returns exactly 2 opponent level 3 Digimon when digivolving with a Tamer”; “lets the UI choose only 1 target for the up-to-2 return”; “does not return level 3 Digimon without a Tamer”; “prevents battle deletion by trashing 2 same-level digivolution cards”; “cannot prevent battle deletion with two different-level digivolution cards”; “does not prevent deletion by an effect even with a valid same-level pair”

### P-074 — Boutmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-074.ts) · [test](../../apps/api/src/cards/P/P-074.test.ts) · clause review (source removed; see History)<br>“trashes a chosen 3 security to make an otherwise unaffordable Shaman digivolution cost 1”; “may choose zero security and pay the full Shaman digivolution cost”; “does not offer the security reduction for a non-Shaman/non-Wizard evolution”; “unsuspends its host once per turn only at exactly 3 security”

### P-075 — Okuwamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-075.ts) · [test](../../apps/api/src/cards/P/P-075.test.ts) · clause review (source removed; see History)<br>“grants each current opponent Digimon one independent lose-memory watcher after evolving into Insectoid”; “does not grant the watcher merely because Okuwamon is sitting on the field”; “grants Piercing to an Insectoid host through its inherited effect”; “does not grant inherited Piercing to a non-Insectoid host”

### P-076 — Deltamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-076.ts) · [test](../../apps/api/src/cards/P/P-076.test.ts) · clause review (source removed; see History)<br>“reduces a two-color digivolution by 2 and deletes once for each host color”; “reduces a mono-color Composite evolution by 2”

### P-077 — Wizardmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-077.ts) · [test](../../apps/api/src/cards/P/P-077.test.ts) · clause review (source removed; see History)<br>“gains 1 memory only when directly trashed from the deck”; “places a revealed purple card from hand on top of the deck when inherited”

### P-078 — Espimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-078.ts) · [test](../../apps/api/src/cards/P/P-078.test.ts) · clause review (source removed; see History)<br>“draws for a revealed Digimon and returns it face down”; “does not draw when the revealed security card isn't a Digimon and returns it face down”

### P-079 — Agumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-079.ts) · [test](../../apps/api/src/cards/P/P-079.test.ts) · clause review (source removed; see History)<br>“deletes only a 3000-DP-or-less target with a red Tamer”; “does not delete without a red Tamer”

### P-080 — Labramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-080.ts) · [test](../../apps/api/src/cards/P/P-080.test.ts) · clause review (source removed; see History)<br>“deletes only an opponent level 3 Digimon with a purple Tamer”; “does not delete without a purple Tamer”

### P-081 — Falcomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-081.ts) · [test](../../apps/api/src/cards/P/P-081.test.ts) · clause review (source removed; see History)<br>“gives one opponent Digimon -2000 DP with a yellow Tamer”; “does not reduce DP without a yellow Tamer”

### P-082 — Kunemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-082.ts) · [test](../../apps/api/src/cards/P/P-082.test.ts) · clause review (source removed; see History)<br>“suspends an opponent Digimon with a green Tamer”; “does not suspend without a green Tamer”

### P-083 — Floramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-083.ts) · [test](../../apps/api/src/cards/P/P-083.test.ts) · clause review (source removed; see History)<br>“prevents an opponent Digimon from unsuspending with a green Tamer”; “does not prevent unsuspending without a green Tamer”

### P-084 — Lopmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-084.ts) · [test](../../apps/api/src/cards/P/P-084.test.ts) · clause review (source removed; see History)<br>“gives Security Attack -1 with a yellow Tamer”; “does not grant Security Attack -1 without a yellow Tamer”

### P-085 — Dracmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-085.ts) · [test](../../apps/api/src/cards/P/P-085.test.ts) · clause review (source removed; see History)<br>“digivolves into a legal Undead from trash and pays its digivolution cost”; “does not ignore the trash card's digivolution requirements”; “does not digivolve without a purple Tamer”; “may decline the optional trash digivolution”

### P-086 — Syakomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-086.ts) · [test](../../apps/api/src/cards/P/P-086.test.ts) · clause review (source removed; see History)<br>“protects one friendly Digimon from attacks with a blue Tamer”; “does not grant protection without a blue Tamer”; “identifies same-card permanents separately in the target decision”

### P-087 — Ritsu Kodo

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-087.ts) · [test](../../apps/api/src/cards/P/P-087.test.ts) · clause review (source removed; see History)<br>“Q4179: suspends when Pulsemon is played and gets both bonuses at exactly 3 security”; “plays itself from security without paying its play cost”

### P-088 — Siriusmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-088.ts) · [test](../../apps/api/src/cards/P/P-088.test.ts) · clause review (source removed; see History)<br>“places a Gammamon from hand at stack bottom to gain +2000 DP for the turn”; “deletes only 1 low-DP Digimon while below 12000 DP”; “Q4180: deletes 2 low-DP Digimon when it has 12000 DP or more”

### P-089 — Amphimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-089.ts) · [test](../../apps/api/src/cards/P/P-089.test.ts) · clause review (source removed; see History)<br>“scales source trashing from the blue cards actually trashed, then restricts a source-less target”; “Q4181: returns exactly 3 Jellymon-text cards to end an opponent's attack”

### P-090 — Diarbbitmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-090.ts) · [test](../../apps/api/src/cards/P/P-090.test.ts) · clause review (source removed; see History)<br>“requires the UI to choose exactly 2 opponent Digimon to suspend when digivolving”; “unsuspends an ally after another Digimon wins a battle while Angoramon is in its stack”

### P-091 — Saberdramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-091.ts) · [test](../../apps/api/src/cards/P/P-091.test.ts) · clause review (source removed; see History)<br>“uses Raid to battle the highest-DP unsuspended Digimon, then Retaliation deletes the winner”; “inherited On Deletion can return P-091 from its just-deleted host's stack”

### P-092 — Dracomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-092.ts) · [test](../../apps/api/src/cards/P/P-092.test.ts) · clause review (source removed; see History)<br>“digivolves itself directly into Wingdramon for 3 by ignoring level requirements”; “inherited effect digivolves a legal level 4 host into Wingdramon for free”; “Q4182 does not offer inherited Wingdramon evolution from an illegal level 3 host”

### P-093 — Bastemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-093.ts) · [test](../../apps/api/src/cards/P/P-093.test.ts) · clause review (source removed; see History)<br>“suspends exactly 1 opponent Digimon when Bastemon itself attacks”; “does not trigger when a different allied Digimon becomes suspended”; “reduces only the first digivolution cost of its inherited host each turn”

### P-094 — Destromon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-094.ts) · [test](../../apps/api/src/cards/P/P-094.test.ts) · clause review (source removed; see History)<br>“deletes the single eligible opponent Digimon (play cost within budget)”

### P-095 — Pause Plug-In P

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-095.ts) · [test](../../apps/api/src/cards/P/P-095.test.ts) · clause review (source removed; see History)<br>“requires a color source without a Tamer, but any off-color Tamer waives that requirement”; “binds both Main clauses to exactly the chosen Digimon”; “keeps the chosen permanent's When Digivolving suppressed after it evolves”; “applies only the Security DP loss for the turn, then adds itself to hand”

### P-096 — Prism Garrett

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-096.ts) · [test](../../apps/api/src/cards/P/P-096.test.ts) · clause review (source removed; see History)<br>“does not waive its purple requirement for a non-Hunter Tamer”; “places the only available Save card and grants exactly +1000 DP”; “Q4183 combines Save cards from a Tamer and trash in one 0–2 selection”; “allows placing zero Save cards and grants no DP when zero were placed”; “Security adds this card to its owner's hand”

### P-097 — Zubamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-097.ts) · [test](../../apps/api/src/cards/P/P-097.test.ts) · clause review (source removed; see History)<br>“exposes top/bottom and ordering decisions, then puts the chosen order on top”; “may decline the By-cost without moving itself or revealing the deck”; “grants Raid on the host permanent when a Legend-Arms Digimon is in play (inherited)”; “grants Raid when a black Digimon (non-Legend-Arms) is in play”; “does NOT grant Raid when no Legend-Arms or Black Digimon is in play”; “does NOT grant Raid on the opponent's turn”

### P-098 — Seadramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-098.ts) · [test](../../apps/api/src/cards/P/P-098.test.ts) · clause review (source removed; see History)<br>“protects exactly the chosen blue Digimon from battle deletion through the opponent's turn”; “applies the same battle protection from its When Digivolving timing”; “Q4184 grants Rush when Nokia plays a Digimon by an effect, only once per turn”; “Q4184 does not react to an ordinary hand play”

### P-099 — Etemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-099.ts) · [test](../../apps/api/src/cards/P/P-099.test.ts) · clause review (source removed; see History)<br>“De-Digivolves exactly 1 card on play and promotes the next source”; “De-Digivolves exactly 1 card after digivolving”; “inherited On Deletion plays only an eligible cost-3 yellow or black Digimon from hand”

### P-100 — Kuwagamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-100.ts) · [test](../../apps/api/src/cards/P/P-100.test.ts) · clause review (source removed; see History)<br>“lets the UI choose an opponent Digimon or Tamer and restricts only that permanent”; “opens the opponent Digimon-or-Tamer restriction from When Digivolving”; “grants its inherited host +2000 DP only during its controller's turn”

### P-101 — Raremon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-101.ts) · [test](../../apps/api/src/cards/P/P-101.test.ts) · clause review (source removed; see History)<br>“Q4186 always carries the Cyborg trait in its card definition”; “trashes exactly 1 hand card on play, then draws 2”; “trashes 1 hand card and draws 2 after digivolving”; “inherited When Attacking pays the hand-trash cost before deleting a level 3”

### P-102 — SkullGreymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-102.ts) · [test](../../apps/api/src/cards/P/P-102.test.ts) · clause review (source removed; see History)<br>“Q4187 may delete itself as cost, delete 2 small enemies, then play a rookie on deletion”; “Q4187 also permits self-deletion after digivolving and resolves the full chain”; “inherited On Deletion plays exactly 1 eligible red or purple level 3 from trash”

### P-103 — Offense Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-103.ts) · [test](../../apps/api/src/cards/P/P-103.test.ts) · clause review (source removed; see History)<br>“is registered”; “exposes at least one effect at OnUseOption (the [Main] body fires when played)”; “exposes at least one effect at SecuritySkill”; “exposes at least one effect at OnDeclaration (the <Delay> activation window)”; “OnUseOption effect calls reveal(2) for the top-2 reveal clause”; “OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword”; “SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword”; “OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)”; “OnDeclaration <Delay> only digivolves into a RED Digimon in hand (Q4188 / documented behavior HasCardColor(Red))”; “OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)”; “OnDeclaration <Delay> does NOT digivolve when the player declines (Q4191: choosing not to is allowed)”; “places itself in the battle area when revealed as Security”; “reveals and adds its color card before placing itself in the battle area”; “uses Delay to digivolve a Digimon into a red card from hand”

### P-104 — Mental Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-104.ts) · [test](../../apps/api/src/cards/P/P-104.test.ts) · clause review (source removed; see History)<br>“is registered”; “exposes at least one effect at OnUseOption (the [Main] body fires when played)”; “exposes at least one effect at SecuritySkill”; “exposes at least one effect at OnDeclaration (the <Delay> activation window)”; “yields no effects at wrong timings (OnPlay, OnStartTurn)”; “OnUseOption effect calls reveal(2) for the top-2 reveal clause”; “OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword”; “SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword”; “OnUseOption RevealAdd only adds BLUE cards to hand (card text + documented behavior HasCardColor(Blue))”; “OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)”; “OnDeclaration <Delay> only digivolves into a BLUE Digimon in hand (Q4192 / documented behavior HasCardColor(Blue))”; “OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)”; “OnDeclaration <Delay> does NOT digivolve when the player declines (Q4195: choosing not to is allowed)”; “places itself in the battle area when revealed as Security”; “reveals and adds its color card before placing itself in the battle area”; “uses Delay on a later turn to digivolve into the printed color”

### P-105 — Physical Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-105.ts) · [test](../../apps/api/src/cards/P/P-105.test.ts) · clause review (source removed; see History)<br>“is registered”; “exposes at least one effect at OnUseOption (the [Main] body fires when played)”; “exposes at least one effect at SecuritySkill”; “exposes at least one effect at OnDeclaration (the <Delay> activation window)”; “yields no effects at wrong timings (OnPlay, OnStartTurn)”; “OnUseOption effect calls reveal(2) for the top-2 reveal clause”; “OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword”; “SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword”; “OnUseOption RevealAdd only adds YELLOW cards to hand (card text + documented behavior HasCardColor(Yellow))”; “OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)”; “OnDeclaration <Delay> only digivolves into a YELLOW Digimon in hand (Q4192 / documented behavior HasCardColor(Yellow))”; “OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)”; “OnDeclaration <Delay> does NOT digivolve when the player declines (Q4195: choosing not to is allowed)”; “places itself in the battle area from its Security effect”; “reveals and adds its color card before placing itself in the battle area”; “uses Delay on a later turn to digivolve into the printed color”

### P-106 — Agility Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-106.ts) · [test](../../apps/api/src/cards/P/P-106.test.ts) · clause review (source removed; see History)<br>“is registered”; “exposes at least one effect at OnUseOption (the [Main] body fires when played)”; “exposes at least one effect at SecuritySkill”; “exposes at least one effect at OnDeclaration (the <Delay> activation window)”; “yields no effects at wrong timings (OnPlay, OnStartTurn)”; “OnUseOption effect calls reveal(2) for the top-2 reveal clause”; “OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword”; “SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword”; “OnUseOption RevealAdd only adds GREEN cards to hand (card text + documented behavior HasCardColor(Green))”; “OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)”; “OnDeclaration <Delay> only digivolves into a GREEN Digimon in hand (Q4192 / documented behavior HasCardColor(Green))”; “OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)”; “OnDeclaration <Delay> does NOT digivolve when the player declines (Q4195: choosing not to is allowed)”; “places itself in the battle area from its Security effect”; “reveals and adds its color card before placing itself in the battle area”; “uses Delay on a later turn to digivolve into the printed color”

### P-107 — Defense Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-107.ts) · [test](../../apps/api/src/cards/P/P-107.test.ts) · clause review (source removed; see History)<br>“is registered”; “exposes at least one effect at OnUseOption (the [Main] body fires when played)”; “exposes at least one effect at SecuritySkill”; “exposes at least one effect at OnDeclaration (the <Delay> activation window)”; “yields no effects at wrong timings (OnPlay, OnStartTurn)”; “OnUseOption effect calls reveal(2) for the top-2 reveal clause”; “OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword”; “SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword”; “OnUseOption RevealAdd only adds BLACK cards to hand (card text + documented behavior HasCardColor(Black))”; “OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)”; “OnDeclaration <Delay> only digivolves into a BLACK Digimon in hand (Q4192 / documented behavior HasCardColor(Black))”; “OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)”; “OnDeclaration <Delay> does NOT digivolve when the player declines (Q4195: choosing not to is allowed)”; “places itself in the battle area from its Security effect”; “reveals and adds its color card before placing itself in the battle area”; “uses Delay on a later turn to digivolve into the printed color”

### P-108 — Wisdom Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-108.ts) · [test](../../apps/api/src/cards/P/P-108.test.ts) · clause review (source removed; see History)<br>“is registered”; “exposes at least one effect at OnUseOption (the [Main] body fires when played)”; “exposes at least one effect at SecuritySkill”; “exposes at least one effect at OnDeclaration (the <Delay> activation window)”; “yields no effects at wrong timings (OnPlay, OnStartTurn)”; “OnUseOption effect calls reveal(2) for the top-2 reveal clause”; “OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword”; “SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword”; “OnUseOption RevealAdd only adds PURPLE cards to hand (card text + documented behavior HasCardColor(Purple))”; “OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)”; “OnDeclaration <Delay> only digivolves into a PURPLE Digimon in hand (Q4192 / documented behavior HasCardColor(Purple))”; “OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)”; “OnDeclaration <Delay> does NOT digivolve when the player declines (Q4195: choosing not to is allowed)”; “places itself in the battle area from its Security effect”; “reveals and adds its color card before placing itself in the battle area”; “uses Delay on a later turn to digivolve into the printed color”

### P-109 — Imperialdramon: Dragon Mode

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-109.ts) · [test](../../apps/api/src/cards/P/P-109.test.ts) · clause review (source removed; see History)<br>“resolves the same suspend/unsuspend sequence on When Digivolving”; “suspends then unsuspends a Digimon on play and may play a small card”; “fires its once-per-turn all-turns effect when it becomes suspended”

### P-110 — Shadramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-110.ts) · [test](../../apps/api/src/cards/P/P-110.test.ts) · clause review (source removed; see History)<br>“plays exactly one Veemon or Wormmon from trash suspended when digivolving”; “plays an eligible Veemon or Wormmon from hand through the inherited On Deletion effect”

### P-111 — Knightmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-111.ts) · [test](../../apps/api/src/cards/P/P-111.test.ts) · clause review (source removed; see History)<br>“gives exactly one opposing Digimon -3000 DP per allied Digimon”; “inherited effect plays one yellow or black level 3 when another Digimon attacks”; “also applies the -3000 DP and Blocker grant on When Digivolving”

### P-112 — Morphomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-112.ts) · [test](../../apps/api/src/cards/P/P-112.test.ts) · clause review (source removed; see History)<br>“uses its inherited effect when another Eosmon is played to digivolve from hand”; “may place itself under an Eosmon and play the revealed Menoa Bellucci”; “reveals three and adds both Eosmon and Menoa Bellucci when both are present”; “adds the one matching card when only one of Eosmon or Menoa is revealed”

### P-113 — RustTyrannomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-113.ts) · [test](../../apps/api/src/cards/P/P-113.test.ts) · clause review (source removed; see History)<br>“suspends every opposing Digimon at or below its DP when digivolving”; “Blast Digivolves from hand during a real Counter Timing without paying memory”; “encodes the Q4219 battle-deletion watcher and once-per-turn security trash”; “does not trigger when the opponent deletes your other Digimon”

### P-114 — Diaboromon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-114.ts) · [test](../../apps/api/src/cards/P/P-114.test.ts) · clause review (source removed; see History)<br>“plays a Diaboromon Token when digivolving and counts the token for deletion scaling”; “plays a Diaboromon Token from the When Attacking effect”

### P-115 — SkullKnightmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-115.ts) · [test](../../apps/api/src/cards/P/P-115.test.ts) · clause review (source removed; see History)<br>“grants Security Attack +1 to a level-5 Bagra Army/Twilight host on your turn”; “plays an errata-eligible Amano Tamer and Saves itself under that Tamer”

### P-116 — DIGIMON CON 2023

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-116.ts) · [test](../../apps/api/src/cards/P/P-116.test.ts) · clause review (source removed; see History)<br>“reveals two, adds all eligible low-cost Tamers, and returns the rest to the top”; “costs zero while Agumon, Pulsemon, and Gammamon are present”; “requires all three named Digimon rather than a subset”; “does not set the cost to zero when none of the three names is present”; “Q4224: combines named Digimon across both players”; “requires an exact Agumon name and does not accept Agumon Expert”; “activates the same reveal effect from security”

### P-117 — Veemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-117.ts) · [test](../../apps/api/src/cards/P/P-117.test.ts) · clause review (source removed; see History)<br>“reduces a Your Turn digivolution into a Free Digimon by 1 when a Tamer is present”; “draws through its inherited effect only when the host has two colors”

### P-118 — Wormmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-118.ts) · [test](../../apps/api/src/cards/P/P-118.test.ts) · clause review (source removed; see History)<br>“adds both matching reveal classes and bottoms the rest”; “uses the inherited End of Your Turn effect for a legal DNA digivolution”

### P-119 — Hawkmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-119.ts) · [test](../../apps/api/src/cards/P/P-119.test.ts) · clause review (source removed; see History)<br>“adds a red/yellow multicolor card and Yolei Inoue, then bottoms the rest”; “uses the inherited End of Your Turn effect for a legal DNA digivolution”

### P-120 — Gatomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-120.ts) · [test](../../apps/api/src/cards/P/P-120.test.ts) · clause review (source removed; see History)<br>“uses Barrier to trash its security and survive a losing security battle”; “applies inherited -2000 DP to an opponent's security Digimon”

### P-121 — Armadillomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-121.ts) · [test](../../apps/api/src/cards/P/P-121.test.ts) · clause review (source removed; see History)<br>“adds a black/yellow multicolor card and Cody Hida, then bottoms the rest”; “uses the inherited End of Your Turn effect for a legal DNA digivolution”

### P-122 — Patamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-122.ts) · [test](../../apps/api/src/cards/P/P-122.test.ts) · clause review (source removed; see History)<br>“adds a yellow/black security card, recovers one, and keeps the stack size”; “does not recover when no eligible security card exists”; “takes a multicolor card containing %s”; “does not take a %s security card”; “inherited effect lowers only opposing Security Digimon and changes a real security battle”

### P-123 — Ukkomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-123.ts) · [test](../../apps/api/src/cards/P/P-123.test.ts) · clause review (source removed; see History)<br>“hatches and gains memory when a Digimon moves from breeding”; “Q4236 gains memory even when the optional hatch is declined”; “Q4239 triggers when Ukkomon itself moves from breeding”

### P-124 — Davis Motomiya

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-124.ts) · [test](../../apps/api/src/cards/P/P-124.test.ts) · clause review (source removed; see History)<br>“uses the second On Play mode to digivolve a Digimon into ExVeemon for free”; “plays Veemon from hand through the first On Play mode”

### P-125 — Ken Ichijoji

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-125.ts) · [test](../../apps/api/src/cards/P/P-125.test.ts) · clause review (source removed; see History)<br>“uses the second On Play mode to digivolve a Digimon into Stingmon for free”; “plays Wormmon from hand through the first On Play mode”

### P-126 — Yolei Inoue

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-126.ts) · [test](../../apps/api/src/cards/P/P-126.test.ts) · clause review (source removed; see History)<br>“uses the second On Play mode to digivolve a Digimon into Aquilamon for free”; “plays Hawkmon from hand through the first On Play mode”

### P-127 — Kari Kamiya

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-127.ts) · [test](../../apps/api/src/cards/P/P-127.test.ts) · clause review (source removed; see History)<br>“uses the second On Play mode to digivolve a Digimon into Gatomon for free”; “plays Salamon from hand through the first On Play mode”; “does not gain memory merely when security counts are equal”; “gains one memory at start of main when behind on security”

### P-128 — Cody Hida

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-128.ts) · [test](../../apps/api/src/cards/P/P-128.test.ts) · clause review (source removed; see History)<br>“uses the second On Play mode to digivolve a Digimon into Ankylomon for free”; “plays Armadillomon from hand through the first On Play mode”

### P-129 — T.K. Takaishi

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-129.ts) · [test](../../apps/api/src/cards/P/P-129.test.ts) · clause review (source removed; see History)<br>“uses the second On Play mode to digivolve a Digimon into Angemon for free”; “plays Patamon from hand through the first On Play mode”; “does not gain memory when security counts are equal”; “gains one memory at start of main when ahead on security”

### P-130 — Lui Ohwada

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-130.ts) · [test](../../apps/api/src/cards/P/P-130.test.ts) · clause review (source removed; see History)<br>“moves an eligible breeding Digimon on play, suspends, and gains memory”; “Q4242 cannot move a level-less Digimon from breeding”

### P-131 — Pteromon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-131.ts) · [test](../../apps/api/src/cards/P/P-131.test.ts) · clause review (source removed; see History)<br>“suspends one opposing Digimon on play”; “gives its inherited host +2000 DP on your turn”

### P-132 — Galemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-132.ts) · [test](../../apps/api/src/cards/P/P-132.test.ts) · clause review (source removed; see History)<br>“suspends one Digimon as cost and gains +2000 DP when digivolving”; “grants Piercing to Galemon while Shoto Kazama is present”; “applies the inherited +2000 DP during your turn”

### P-133 — Shoto Kazama

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-133.ts) · [test](../../apps/api/src/cards/P/P-133.test.ts) · clause review (source removed; see History)<br>“suspends this Tamer and gains memory when your Digimon digivolves into Avian”; “plays Pteromon from hand on play”; “plays itself from security without paying its play cost”

### P-134 — Shoemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-134.ts) · [test](../../apps/api/src/cards/P/P-134.test.ts) · clause review (source removed; see History)<br>“gives one opposing Digimon Security Attack -1 on play”; “reduces one opposing Digimon by 2000 through the inherited attack effect”

### P-135 — ShoeShoemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-135.ts) · [test](../../apps/api/src/cards/P/P-135.test.ts) · clause review (source removed; see History)<br>“digivolves legally and makes one opponent unable to attack Digimon but still able to attack a player”; “gains Jamming on its owner's turn only while Arisa Kinosaki is present”; “keeps both debuffs through its owner's turn and expires them at the opponent's turn end”; “applies the inherited -2000 DP attack effect only once per turn”

### P-136 — Arisa Kinosaki

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-136.ts) · [test](../../apps/api/src/cards/P/P-136.test.ts) · clause review (source removed; see History)<br>“suspends this Tamer and gains memory when your Digimon digivolves into Puppet”; “plays Shoemon from hand on play”; “plays itself from security without paying its play cost”

### P-137 — Flamedramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-137.ts) · [test](../../apps/api/src/cards/P/P-137.test.ts) · clause review (source removed; see History)<br>“digivolves from Veemon and exposes Armor Purge and Raid”; “moves the opponent's top security card to hand when its attack target switches”; “does not react when another Digimon's attack target switches”

### P-138 — Veedramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-138.ts) · [test](../../apps/api/src/cards/P/P-138.test.ts) · clause review (source removed; see History)<br>“reveals three cards, adds a Veedramon and blue Tamer, and bottoms the rest”; “has the inherited once-per-turn memory gain when it becomes unsuspended”; “gains one memory when an inherited host becomes unsuspended”

### P-139 — Leomon (X Antibody)

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-139.ts) · [test](../../apps/api/src/cards/P/P-139.test.ts) · clause review (source removed; see History)<br>“reduces an opponent's Digimon by 3000 DP on play”; “encodes zero-cost Leomon digivolution and inherited Recovery”; “applies -3000 DP on the live When Digivolving window”; “grants Blocker and Fortitude while Leomon/X Antibody is in its stack”; “recovers the top deck card when deleted”

### P-140 — MegaKabuterimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-140.ts) · [test](../../apps/api/src/cards/P/P-140.test.ts) · clause review (source removed; see History)<br>“reduces an opponent's Digimon by 3000 DP on play”; “encodes Evade, suspended immunity, Insectoid digivolution, and inherited security trash”; “trashes security when the inherited host itself wins a battle”; “does not react when another allied Digimon wins the battle”; “exposes Evade on MegaKabuterimon itself”; “prevents an opponent Digimon effect from modifying its suspended DP”

### P-141 — MameTyramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-141.ts) · [test](../../apps/api/src/cards/P/P-141.test.ts) · clause review (source removed; see History)<br>“encodes Collision, Blocker, and the Rule name treatment”; “encodes the once-per-turn unsuspend triggers for both top and inherited effects”; “unsuspends after an opponent Digimon becomes suspended”; “exposes both printed battle keywords and the Mamemon/Tyrannomon rule names”; “runs the inherited unsuspend trigger through a higher host”

### P-142 — Falcomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-142.ts) · [test](../../apps/api/src/cards/P/P-142.test.ts) · clause review (source removed; see History)<br>“trashes an opponent hand card when its inherited host is deleted outside battle”; “does not trash a card when the inherited host is deleted in battle”; “encodes the On Play suspension and Ravemon attack option”; “encodes zero-cost Pinamon digivolution and inherited non-battle deletion hand trash”; “suspends an opposing level-6-or-lower Digimon on play”; “publicly performs the optional Ravemon attack and places Falcomon underneath it”

### P-143 — Drimogemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-143.ts) · [test](../../apps/api/src/cards/P/P-143.test.ts) · clause review (source removed; see History)<br>“moves Drimogemon from the battle area to the empty breeding area on end of turn”; “preserves digivolution cards when moving to breeding (KB Q4251)”; “does NOT move when the breeding area is already occupied”; “does NOT move when it is not the owner's turn”

### P-144 — Gotsumon (X Antibody)

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-144.ts) · [test](../../apps/api/src/cards/P/P-144.test.ts) · clause review (source removed; see History)<br>“keeps the Your Turn attack restriction when only an X Antibody card is underneath”; “encodes Blocker, target-switch unsuspension, and inherited Blocker DP”; “applies the inherited +1000 DP to Blocker Digimon”; “prevents attacking when no Gotsumon card is in the digivolution stack”; “allows attacking when a Gotsumon card is in the digivolution stack”; “unsuspends a Blocker when an opponent-turn attack target switches”; “only resolves the target-switch reaction once per opponent turn”

### P-145 — Myotismon (X Antibody)

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-145.ts) · [test](../../apps/api/src/cards/P/P-145.test.ts) · clause review (source removed; see History)<br>“plays a level-6 Myotismon from trash when deleted with Myotismon in its stack”; “does not revive without Myotismon or X Antibody in its stack”; “deletes an opposing level 4 Digimon on play”; “encodes zero-cost Myotismon digivolution and conditional level-6 revival”; “revives with an X Antibody trait-only digivolution card”; “deletes an opposing level-4 Digimon on When Digivolving”

### P-146 — Recharge Plug-In Q

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-146.ts) · [test](../../apps/api/src/cards/P/P-146.test.ts) · clause review (source removed; see History)<br>“waives its color requirement with a Tamer and places itself under a non-white Digimon”; “limits both inherited and Security replacement effects to battle deletion”; “gives an opposing Digimon Security Attack -1 from its Security effect”; “uses the Tamer waiver to place this yellow Option under a non-white Digimon”

### P-147 — Pal

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-147.ts) · [test](../../apps/api/src/cards/P/P-147.test.ts) · clause review (source removed; see History)<br>“encodes the mandatory When Digivolving reactivation after placing a Pulsemon-text level 4”; “encodes Tamer DP and the Pulsemon Rule name”; “gets +3000 DP on your turn while you have a Tamer”; “places a level-4 Pulsemon-text card and reactivates its When Digivolving effect on attack”; “activates only the newly placed card, not an older matching stack card”; “keeps hand, stack, and targets unchanged when the optional placement is declined”; “does not resolve the optional placement a second time in the same turn”

### P-148 — Wanyamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-148.ts) · [test](../../apps/api/src/cards/P/P-148.test.ts) · clause review (source removed; see History)<br>“encodes the inherited once-per-turn conditional Draw 1”; “draws once when an NSp Digimon attacks, but not for a non-NSp host”

### P-149 — Minomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-149.ts) · [test](../../apps/api/src/cards/P/P-149.test.ts) · clause review (source removed; see History)<br>“encodes the inherited once-per-turn hand-costed deletion”; “trashes a card to delete an opposing level-3 Digimon when the host has two colors”

### P-150 — Exermon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-150.ts) · [test](../../apps/api/src/cards/P/P-150.test.ts) · clause review (source removed; see History)<br>“encodes both When Digivolving branches, including the exact-three overlap”; “encodes the inherited once-per-turn DP-relative suspension”; “suspends an opposing Digimon at the exact three-security boundary”; “does not suspend from the security-at-least-three clause with only two security”; “restricts an opposing Digimon from unsuspending when security is three or fewer”; “inherited reaction suspends an opposing Digimon when the host is publicly suspended”

### P-151 — Digimon Liberator

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-151.ts) · [test](../../apps/api/src/cards/P/P-151.test.ts) · clause review (source removed; see History)<br>“waives color with a Liberator trait card and reveals/adds then independently plays”; “keeps the Security effect as an activation of the Main effect”; “activates Main from security and plays a qualifying Liberator Digimon”; “runs Main from hand: adds a revealed Liberator card and may play it”

### P-152 — Shoutmon + Dorulu Cannon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-152.ts) · [test](../../apps/api/src/cards/P/P-152.test.ts) · clause review (source removed; see History)<br>“encodes the attack DP reduction and Xros Heart placement cost”; “encodes both zero-cost named digivolution paths, Rule names, and DigiXros materials”; “reduces an opposing Digimon by 2000, then deletes it at the post-reduction boundary”

### P-153 — MagnaGarurumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-153.ts) · [test](../../apps/api/src/cards/P/P-153.test.ts) · clause review (source removed; see History)<br>“returns exactly one opposing level-3/4/5 Digimon when digivolving”; “encodes Armor Purge and a singular level 3/4/5 return”; “encodes End of Attack top-security payment and the Digimon/Tamer unsuspend choice”; “places its top digivolution card on security and unsuspends itself at End of Attack”

### P-154 — Maildramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-154.ts) · [test](../../apps/api/src/cards/P/P-154.test.ts) · clause review (source removed; see History)<br>“encodes the opponent-effect leave replacement for other Knightmon-text Digimon”; “encodes inherited Blocker”; “does not replace removal of a Digimon without Knightmon in its text”; “places itself under another Knightmon-text Digimon to prevent an opponent effect”

### P-155 — Pawn Device

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-155.ts) · [test](../../apps/api/src/cards/P/P-155.test.ts) · clause review (source removed; see History)<br>“encodes Main Draw 1 followed by placing itself in the battle area”; “encodes Delay's non-red Option trash cost and Security deletion/hand return”; “deletes an opposing Digimon at the 11000-DP security boundary and returns itself”; “runs Main from hand, draws one card, and places this Option in the battle area”; “uses Delay by trashing a non-red Option and gains exactly one memory”

### P-156 — Future Potential!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-156.ts) · [test](../../apps/api/src/cards/P/P-156.test.ts) · clause review (source removed; see History)<br>“binds a Tamer and plays only a low-cost Digimon sharing one of its colors”; “waives color with a Tamer and preserves the complete Security sequence”; “plays a Tamer from hand without cost and returns itself to hand from security”; “ignores its color requirement while a Tamer is present”; “plays a same-color Digimon costing at most 3 from hand without an additional cost”

### P-157 — Monimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-157.ts) · [test](../../apps/api/src/cards/P/P-157.test.ts) · clause review (source removed; see History)<br>“encodes inherited On Deletion Draw 1 conditional on a black Tamer”; “draws when the inherited host is deleted while a black Tamer is present”

### P-158 — Jeri (Fake)

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-158.ts) · [test](../../apps/api/src/cards/P/P-158.test.ts) · clause review (source removed; see History)<br>“adds the selected D-Reaper card to hand and bottoms the other revealed cards”; “registers Main return-and-play and Security self-play timings”; “plays itself from security without paying its memory cost”

### P-159 — Rook Device

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-159.ts) · [test](../../apps/api/src/cards/P/P-159.test.ts) · clause review (source removed; see History)<br>“encodes the effect-trash trigger and Main grants with shared target”; “encodes color waiver and Security De-Digivolve 2 with hand return”; “de-digivolves two cards from an opposing Digimon and returns itself from security”; “runs Main by granting Reboot, Blocker, and +2000 DP before placing itself”; “reacts when this Device is trashed by an effect, buffing a Digimon for the turn window”

### P-160 — Tyrannomon (X Antibody)

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-160.ts) · [test](../../apps/api/src/cards/P/P-160.test.ts) · clause review (source removed; see History)<br>“requires non-X-Antibody Tyrannomon for zero-cost digivolution”; “checks Tyrannomon name or X Antibody trait in the stack for its attack digivolution”; “exposes Raid on the played Tyrannomon X Antibody”; “digivolves into a higher-level Dinosaur from hand when the X Antibody stack condition is met”

### P-161 — Bishop Device

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-161.ts) · [test](../../apps/api/src/cards/P/P-161.test.ts) · clause review (source removed; see History)<br>“restricts an opponent Digimon or Tamer after being trashed from the battle area”; “encodes Main placement and Security level-5-or-lower deck bottoming”; “returns an opposing level-5-or-lower Digimon to deck bottom and adds itself to hand from security”; “runs Main by restricting an opposing Digimon from suspending before placing itself”; “applies the same suspend restriction when the Device is trashed from the battle area”

### P-162 — Coelamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-162.ts) · [test](../../apps/api/src/cards/P/P-162.test.ts) · clause review (source removed; see History)<br>“protects one DS Digimon from DP reduction and opponent De-Digivolve effects”; “encodes inherited Blocker and DS level-3 digivolution”; “protects a DS Digimon when Coelamon is played”

### P-163 — Dokugumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-163.ts) · [test](../../apps/api/src/cards/P/P-163.test.ts) · clause review (source removed; see History)<br>“suspends an opponent's Digimon on play”; “encodes the matching When Digivolving effect and NSo requirement”; “uses the alternate NSo evolution path and suspends on When Digivolving”

### P-164 — Shellmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-164.ts) · [test](../../apps/api/src/cards/P/P-164.test.ts) · clause review (source removed; see History)<br>“encodes On Play and When Digivolving draw with the hand placement cost”; “encodes Aquatic Rule trait and inherited once-per-turn End of Attack draw”; “draws after placing a level-5-or-lower Aqua card from hand under a Digimon”; “fires the same placement-and-draw effect on When Digivolving and grants Aquatic”; “draws one card from the inherited End of Attack effect”

### P-165 — ShoeShoemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-165.ts) · [test](../../apps/api/src/cards/P/P-165.test.ts) · clause review (source removed; see History)<br>“encodes Security end-of-battle play and On Play/When Digivolving Familiar Token creation”; “uses the Familiar Token's own deletion effect and encodes inherited Barrier”; “plays exactly one Familiar Token from On Play”; “plays the token from When Digivolving and its deletion reduces an opposing Digimon by 3000”; “plays from Security at end of a real battle”; “deletes its Familiar Token at the real opponent-turn boundary”

### P-166 — Galemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-166.ts) · [test](../../apps/api/src/cards/P/P-166.test.ts) · clause review (source removed; see History)<br>“encodes optional suspension, conditional Bird/Avian digivolution, and suspended-Digimon cost scaling”; “encodes inherited Your Turn +2000 DP”; “applies inherited +2000 DP to a real host only during its owner's turn”; “suspends one Digimon on play when the optional first clause is accepted”; “digivolves into an Avian and reduces its cost for %s other suspended Digimon”

### P-167 — Landramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-167.ts) · [test](../../apps/api/src/cards/P/P-167.test.ts) · clause review (source removed; see History)<br>“encodes Mineral/Rock discard cost and reveal placement choices at both timings”; “encodes inherited De-Digivolve 1 after a qualifying digivolution card discard”; “pays with a Mineral digivolution card and adds a revealed Mineral card”; “publicly triggers the inherited De-Digivolve after an effect trashes a Mineral stack card”; “does not react when an effect trashes a different stack card”; “does not react when P-167 leaves its stack without effect attribution”

### P-168 — Yao Qinglan

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-168.ts) · [test](../../apps/api/src/cards/P/P-168.test.ts) · clause review (source removed; see History)<br>“gains memory at start of main only when the opponent has a Digimon”; “suspends to evolve the exact Aqua or Sea Animal trigger subject without bypassing requirements”; “gains one memory at the start of main when the opponent has a Digimon”; “reacts to an effect placing a digivolution card, then pays the reduced Aqua evolution cost”; “plays itself for free from Security”

### P-169 — Close

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-169.ts) · [test](../../apps/api/src/cards/P/P-169.test.ts) · clause review (source removed; see History)<br>“plays the Tamer onto the battle area during a security check, at no memory cost”; “Q4277 filters the affected host, not the identity of the trashed source card”; “publicly places a Mineral card from trash under the qualifying host after effect trash”; “does not react to the same stack-card trash when no effect provenance is supplied”

### P-170 — AvengeKidmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-170.ts) · [test](../../apps/api/src/cards/P/P-170.test.ts) · clause review (source removed; see History)<br>“encodes the alternate Three Musketeers digivolution requirement”; “returns three text-matching cards to reduce its play cost by six”; “encodes Raid, Blocker, Retaliation, and the conditional deletion play effect”; “plays a level-12-or-lower Three Musketeers Digimon from hand after deletion”; “returns exactly three Three Musketeers-text cards to pay the reduced play cost”; “exposes all three printed battle keywords on the live permanent”

### P-171 — Pukumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-171.ts) · [test](../../apps/api/src/cards/P/P-171.test.ts) · clause review (source removed; see History)<br>“reduces its play cost by 4 only with face-up Deep Savers in security”; “has Blocker, trashes the top 2 sources from every opposing Digimon, then deletes an empty one”; “performs the same all-stacks source trash and empty-stack deletion when digivolving”

### P-172 — Magnadramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-172.ts) · [test](../../apps/api/src/cards/P/P-172.test.ts) · clause review (source removed; see History)<br>“reduces its play cost by 4 only with face-up Nature Spirits in security”; “has Blocker and can apply -5000 DP before deleting a now-eligible Digimon”; “keeps a 0-DP Digimon present until the explicit delete finishes resolving (Q4421)”; “runs the same DP reduction and deletion sequence on deletion”

### P-173 — RustTyrannomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-173.ts) · [test](../../apps/api/src/cards/P/P-173.test.ts) · clause review (source removed; see History)<br>“requires a level 5 Tyrannomon for its alternate digivolution”; “encodes Collision, Piercing, Blocker, and De-Digivolve 4”; “exposes Collision on the live permanent”; “de-digivolves four opposing cards when it digivolves”; “unsuspends once when opposing Digimon are deleted in battle”; “uses Piercing to check security after deleting a Digimon in a permanent battle”; “does not unsuspend when the opponent deletes your other Digimon”; “acts as a real Blocker and redirects an opponent's player attack”

### P-174 — Boltmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-174.ts) · [test](../../apps/api/src/cards/P/P-174.test.ts) · clause review (source removed; see History)<br>“reduces its play cost by 4 only with face-up Nightmare Soldiers in security”; “does not reduce its cost for a different face-up security card”; “has Blocker and de-digivolves before deleting the resulting level 4 Digimon”; “runs the same de-digivolve-then-delete sequence on deletion”

### P-175 — Hina Kurihara

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-175.ts) · [test](../../apps/api/src/cards/P/P-175.test.ts) · clause review (source removed; see History)<br>“sets memory to 3 only at 2 or less memory”; “triggers on your Rock Dragon or Machine Dragon play and suspends to digivolve from hand for -2”; “plays itself for free from Security”; “sets memory to 3 at start of turn when memory is 2 or less”; “suspends itself and reduces a qualifying level-4-or-higher digivolution by 2 after a real Rock Dragon play”; “plays itself from a security check without paying its cost”

### P-176 — Dorimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-176.ts) · [test](../../apps/api/src/cards/P/P-176.test.ts) · clause review (source removed; see History)<br>“encodes the inherited once-per-turn optional Chronicle digivolution from hand”; “keeps the optional inherited evolution inactive when no Chronicle card is available”; “digivolves a level-three host into a Chronicle card from hand when it attacks”

### P-177 — Gigimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-177.ts) · [test](../../apps/api/src/cards/P/P-177.test.ts) · clause review (source removed; see History)<br>“encodes its optional inherited On Deletion return of a named Growlmon or Gallantmon”; “returns a named Growlmon from trash when its inherited host is deleted”; “keeps a simultaneous Growlmon inherited trigger pending after returning that card”; “cancels a top-card inherited trigger when P-177 returns that deleted top card”; “runs BT21-064 inherited memory when its top host remains in trash”

### P-178 — Sagittarimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-178.ts) · [test](../../apps/api/src/cards/P/P-178.test.ts) · clause review (source removed; see History)<br>“encodes Veemon Armor digivolution and Armor Purge”; “reduces an opponent by 3000 DP on digivolution and deletes an opponent at 4000 DP or less when attacking”; “exposes Armor Purge on the live permanent”; “applies the -3000 digivolution modifier and deletes only targets at the 4000 boundary”

### P-179 — Justimon: Critical Arm

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-179.ts) · [test](../../apps/api/src/cards/P/P-179.test.ts) · clause review (source removed; see History)<br>“digivolves from a named Justimon for 1, places a Device, gains DP, and deletes cost 9”; “can pay the placement cost from trash and leaves a non-Device card untouched”; “shares the once-per-turn deletion use between digivolving and attacking”; “can decline the placement effect without moving the Device or gaining DP”

### P-180 — Bind Red Trigger

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-180.ts) · [test](../../apps/api/src/cards/P/P-180.test.ts) · clause review (source removed; see History)<br>“deletes the highest-DP opposing Digimon from its Security effect”; “deletes an opponent Digimon at 7000 DP or less when this card is trashed from a stack”; “deletes a qualifying opponent through the real stack-trash event”; “waives its color requirement while you have a Three Musketeers Digimon”; “trashes the opponent's top security card and places itself under a Three Musketeers Digimon”; “deletes the opponent's highest-DP Digimon in Security”; “trashes the opponent's top security and places itself under a Three Musketeers Digimon”; “uses the card without a matching color while a Three Musketeers Digimon is present”

### P-181 — Royal Base

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-181.ts) · [test](../../apps/api/src/cards/P/P-181.test.ts) · clause review (source removed; see History)<br>“reduces one of your Royal Base digivolutions by 1 during your turn while in Security”; “adds the top security card to hand, then places this card face up at the bottom”; “optionally plays a level 5 or lower Royal Base Digimon from hand in Security”; “executes its Main security exchange through the public play intent”; “plays a Royal Base Digimon from hand without cost when checked from Security”; “reduces a real Royal Base digivolution while the Option remains in Security”; “uses its Once Per Turn reduction only on the first Royal Base digivolution”

### P-182 — WarGreymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-182.ts) · [test](../../apps/api/src/cards/P/P-182.test.ts) · clause review (source removed; see History)<br>“encodes MetalGreymon and ADVENTURE alternate digivolution requirements”; “encodes Security Attack +1, Blocker, and DP-relative deletion”; “adds 1000 DP per color among your Digimon and Tamers”; “exposes Security Attack +1 and Blocker on the live WarGreymon”; “deletes only an opposing Digimon at or below its DP and counts distinct allied colors”

### P-183 — Gaiomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-183.ts) · [test](../../apps/api/src/cards/P/P-183.test.ts) · clause review (source removed; see History)<br>“encodes Reboot, Blocker, and the temporary opponent attack grant”; “trashes the opponent's top security card once per turn when an attack target changes”; “exposes Reboot and Blocker on the live Gaiomon”; “trashes the opponent's security when Blocker switches a real attack target”

### P-184 — Dorugoramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-184.ts) · [test](../../apps/api/src/cards/P/P-184.test.ts) · clause review (source removed; see History)<br>“encodes DoruGreymon and SoC alternate digivolution requirements”; “encodes Collision, Security Attack +1, and the conditional SoC unsuspend”; “exposes Collision and Security Attack +1 on the live Dorugoramon”; “boosts DP and unsuspends every allied SoC Digimon when Kosuke is in its stack”

### P-185 — EmperorGreymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-185.ts) · [test](../../apps/api/src/cards/P/P-185.test.ts) · clause review (source removed; see History)<br>“requires a Takuya Kanbara Tamer with five Hybrid cards under it”; “encodes Blocker, DP-relative deletion, color scaling, and end-of-turn unsuspend”; “exposes Blocker on the live EmperorGreymon”; “legally digivolves from Takuya with five Hybrid cards under the Tamer”; “deletes at its DP boundary, scales its DP by allied colors, and unsuspends at turn end”

### P-186 — Gallantmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-186.ts) · [test](../../apps/api/src/cards/P/P-186.test.ts) · clause review (source removed; see History)<br>“reduces play cost by 2 per five total trash cards when a 13000+ DP Digimon exists”; “encodes Rush, Blocker, and ruling-correct deletion followed by conditional Recovery”; “reduces the real play cost by 2 for each five cards in both trashes”; “deletes an opposing Digimon at exactly 13000 DP on play”; “recovers one card when its play effect deletes no qualifying Digimon”; “also deletes a boundary target and recovers when digivolving”

### P-187 — Mastemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-187.ts) · [test](../../apps/api/src/cards/P/P-187.test.ts) · clause review (source removed; see History)<br>“recovers independently of DNA and conditionally places any other Digimon or Tamer for DNA”; “shares one once-per-turn top-security cost across digivolving and attacking”; “performs Recovery +1 when its digivolution effect resolves”; “trashes its top security and plays a qualifying Digimon when attacking”

### P-188 — DemiVeemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-188.ts) · [test](../../apps/api/src/cards/P/P-188.test.ts) · clause review (source removed; see History)<br>“draws once per turn when one of your blue Tamers is played”; “draws when a blue Tamer is played under its live host”

### P-189 — Dimetromon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-189.ts) · [test](../../apps/api/src/cards/P/P-189.test.ts) · clause review (source removed; see History)<br>“plays an optional LIBERATOR card costing 4 or less from hand or trash in Security”; “actually plays a qualifying LIBERATOR from trash when revealed in Security”; “grants Progress and gains one memory once per turn when your opponent's security is removed”; “exposes Progress on the live Dimetromon”; “gains one memory once per turn when its host's attack removes opponent security”

### P-190 — Tweetmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-190.ts) · [test](../../apps/api/src/cards/P/P-190.test.ts) · clause review (source removed; see History)<br>“encodes Appmon evolution and Link requirements”; “keeps its printed linked-only Draw 1 watcher”; “draws on play”; “draws the top card when played”; “does not draw when a different card is linked to this host”; “draws when P-190 itself is linked from hand to an Appmon host”; “rejects linking P-190 to a non-Appmon host”

### P-191 — Apollomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-191.ts) · [test](../../apps/api/src/cards/P/P-191.test.ts) · clause review (source removed; see History)<br>“encodes Light Fang/Night Claw evolution and Blast Digivolve”; “uses a 7000 DP deletion budget plus one per Olympos XII Digimon at both timings”; “keeps the DNA-then-attack sequence and inherited once-per-turn attack”; “reduces an opposing Digimon by 4000 DP on play”; “applies the same budget effect when digivolving and resolves both end-turn attack windows”

### P-192 — Bakemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-192.ts) · [test](../../apps/api/src/cards/P/P-192.test.ts) · clause review (source removed; see History)<br>“trashes one hand card to delete an opponent level 4 or lower Digimon on play and digivolution”; “has inherited Retaliation”; “exposes inherited Retaliation on a real evolution stack”; “trashes a hand card and deletes an opposing Digimon when digivolving”; “trashes a hand card and deletes an opposing level-4-or-lower Digimon”

### P-193 — The Wicked God Emerges!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-193.ts) · [test](../../apps/api/src/cards/P/P-193.test.ts) · clause review (source removed; see History)<br>“gates Draw 2 and battle-area placement behind trashing a Composite or Wicked God card”; “delays a Wicked God play behind deleting your Millenniummon and activates Main from Security”; “draws two after paying the Composite/Wicked God hand cost and places itself”; “activates its Main effect when revealed in Security”; “activates Delay to delete Millenniummon and play a Wicked God from trash”

### P-194 — Aegiomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-194.ts) · [test](../../apps/api/src/cards/P/P-194.test.ts) · clause review (source removed; see History)<br>“requires a level 3 TS Digimon for evolution”; “has Blocker and Barrier, with inherited Barrier preserved”; “exposes Blocker and Barrier on the live Aegiomon”; “passes inherited Barrier through a real evolution stack”; “uses inherited Barrier to survive a battle deletion after the stack evolves”

### P-195 — Inori Misono

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-195.ts) · [test](../../apps/api/src/cards/P/P-195.test.ts) · clause review (source removed; see History)<br>“gains memory at the start of the main phase when the opponent has a Digimon”; “offers Elecmon play or free Aegiomon digivolution on play”; “plays itself for free from Security”; “gains one memory at start of main when the opponent has a Digimon”

### P-196 — Gomamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-196.ts) · [test](../../apps/api/src/cards/P/P-196.test.ts) · clause review (source removed; see History)<br>“requires a level 2 TS Digimon for evolution”; “allows free Sea Beast or TS hand digivolution at four or less memory”; “draws once per turn when attacking with seven or fewer hand cards”; “draws from the inherited attack effect with seven cards in hand”; “free-digivolves into a qualifying Sea Beast/TS card at the four-memory boundary”

### P-197 — Patamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-197.ts) · [test](../../apps/api/src/cards/P/P-197.test.ts) · clause review (source removed; see History)<br>“encodes free Angel or TS hand digivolution at four or less memory”; “has the TS evolution requirement and inherited once-per-turn -2000 DP attack effect”; “reduces an opposing Digimon by 2000 when its inherited host attacks”; “free-digivolves into a qualifying Angel/TS card at the four-memory boundary”

### P-198 — DemiDevimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-198.ts) · [test](../../apps/api/src/cards/P/P-198.test.ts) · clause review (source removed; see History)<br>“encodes free Fallen Angel or TS hand digivolution at four or less memory”; “has the TS evolution requirement and inherited once-per-turn Draw 1 then hand trash”; “draws then trashes a card from hand when its inherited host attacks”; “free-digivolves into a qualifying Fallen Angel/TS card at the four-memory boundary”

### P-199 — Dan Yuki

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-199.ts) · [test](../../apps/api/src/cards/P/P-199.test.ts) · clause review (source removed; see History)<br>“suspends itself and reduces the next TS Digimon play by exactly 1”; “gives one of your Digimon +3000 DP when you have 4 or less memory”; “plays itself for free from Security”

### P-200 — Kanan Yuki

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-200.ts) · [test](../../apps/api/src/cards/P/P-200.test.ts) · clause review (source removed; see History)<br>“suspends one opponent Digimon at four or less memory”; “reduces your TS Digimon digivolution by 1 by suspending this Tamer”; “plays itself for free from Security”; “suspends an opposing Digimon at the four-memory boundary”

### P-201 — Phascomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-201.ts) · [test](../../apps/api/src/cards/P/P-201.test.ts) · clause review (source removed; see History)<br>“reveals three, adds a Belphemon/Gizmon-text card, bottoms the rest, then trashes a hand card”; “requires Kapurimon for zero-cost evolution and inherits the hand-trash suspension effect”; “reveals three, adds a Belphemon-text card, and trashes a hand card on play”; “repeats the reveal-and-trash effect when deleted”

### P-202 — Tyrannomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-202.ts) · [test](../../apps/api/src/cards/P/P-202.test.ts) · clause review (source removed; see History)<br>“requires a level 3 DM Digimon and has Training”; “reduces one suspended own digivolution by 1 for Tyrannomon, Dinosaur, or Ver.1 targets”; “preserves inherited Piercing”; “exposes Training on the live Tyrannomon”; “reduces a real suspended Tyrannomon digivolution by one memory”

### P-203 — Justimon: Accel Arm

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-203.ts) · [test](../../apps/api/src/cards/P/P-203.test.ts) · clause review (source removed; see History)<br>“encodes both named evolution paths”; “shares the once-per-turn De-Digivolve, Option cost, and keyword gain across three timings”; “restricts one opponent Digimon after either player's battle-area Option is effect-trashed”; “de-digivolves an opposing stack on play”

### P-204 — Release of the Sealed Knight!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-204.ts) · [test](../../apps/api/src/cards/P/P-204.test.ts) · clause review (source removed; see History)<br>“gates Draw 2 and placement behind trashing an X Antibody or Chronicle card”; “grants Delay when either player's Digimon attacks and allows the Chronicle evolution”; “activates its Main effect from Security”; “draws two after trashing an X Antibody card and places itself”; “gains Delay when a Digimon makes a real attack”

### P-205 — Insane Synthetic Monster

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-205.ts) · [test](../../apps/api/src/cards/P/P-205.test.ts) · clause review (source removed; see History)<br>“waives its color requirement only while you have a DM Digimon or Tamer”; “draws, trashes two, and places itself for Main and Security”; “deletes your low-cost Digimon and plays a named card from your trash with cost reduced by 3”; “draws two, trashes two cards, and places itself from Main”; “draws, trashes, and places itself from Security”; “activates Delay to delete a low-cost Digimon and play Millenniummon from trash”

### P-206 — Digital Gate Open

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-206.ts) · [test](../../apps/api/src/cards/P/P-206.test.ts) · clause review (source removed; see History)<br>“can be used without a matching color source or a separate waiver prompt”; “reveals distinct Digimon and Tamer cards, then places itself”; “delays same-color Tamer play and offers a low-cost Security play followed by recovery”; “plays a low-cost Digimon and returns itself to hand from Security”

### P-207 — Minervamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-207.ts) · [test](../../apps/api/src/cards/P/P-207.test.ts) · clause review (source removed; see History)<br>“requires a level 5 Beastkin or TS Digimon and has Alliance”; “plays eligible hand Digimon on play and digivolution, excluding Sea Animal”; “once per turn plays the same eligible card set from trash when attacking”; “exposes Alliance on the live Minervamon”; “plays an eligible level-4 Avian from hand on play”; “plays the same eligible card from hand when digivolving”; “plays an eligible level-4 card from trash after a real attack”

### P-208 — Merukimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-208.ts) · [test](../../apps/api/src/cards/P/P-208.test.ts) · clause review (source removed; see History)<br>“requires a level 5 Beastkin or TS Digimon and has Execute”; “plays an eligible card from trash on digivolution and deletion, excluding Sea Animal”; “once per turn returns an opponent's suspended Digimon to deck bottom when attacking”; “exposes Execute on the live Merukimon”; “plays an eligible level-4 Digimon from trash when deleted”; “plays an eligible level-4 Digimon from trash when digivolving”; “returns a suspended opposing Digimon to the bottom of the deck after a real attack”

### P-209 — Titamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-209.ts) · [test](../../apps/api/src/cards/P/P-209.test.ts) · clause review (source removed; see History)<br>“has the alternate Demon or TS digivolution requirement and Alliance”; “gates both on-play effects behind trashing a card, then suspends and restricts an opponent's Digimon or Tamer”; “once per turn may play a level 4 or lower Demon from trash when your hand is trashed”; “exposes Alliance on the live Titamon”; “trashes the required hand card, suspends an opponent, and prevents unsuspending it”; “plays a level-4 Demon from trash when an effect actually trashes a hand card”

### P-210 — Hiroko Sagisaka

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-210.ts) · [test](../../apps/api/src/cards/P/P-210.test.ts) · clause review (source removed; see History)<br>“gains memory at the start of your main phase when the opponent has a Digimon”; “may return a TS Digimon from your trash on play”; “plays itself without paying the cost in security”; “gains exactly 1 memory at the start of the main phase with an opposing Digimon”

### P-211 — Monica Simmons

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-211.ts) · [test](../../apps/api/src/cards/P/P-211.test.ts) · clause review (source removed; see History)<br>“gains memory at the start of your main phase when the opponent has a Digimon”; “restricts one opposing Digimon from attacking players until the opponent's turn ends”; “plays itself without paying the cost in security”; “restricts an opposing Digimon from attacking players on play”; “gains exactly 1 memory at the start of the main phase with an opposing Digimon”

### P-212 — Asuna Shiroki

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-212.ts) · [test](../../apps/api/src/cards/P/P-212.test.ts) · clause review (source removed; see History)<br>“gains memory at the start of your main phase when the opponent has a Digimon”; “draws, trashes from hand, and deletes a level 3 opponent Digimon only for a matching trashed card”; “plays itself without paying the cost in security”; “draws, trashes a matching TS card, and deletes an opposing level-3 Digimon”; “gains memory at the start of main phase when the opponent has a Digimon”

### P-213 — Aegiochusmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-213.ts) · [test](../../apps/api/src/cards/P/P-213.test.ts) · clause review (source removed; see History)<br>“has Raid, Decode, and the Aegiomon digivolution requirement”; “gains Rush and 3000 DP at three or fewer security, then may attack”; “grants Rush and +3000 DP at three security, but not at four”; “still permits the optional attack when the three-security bonus condition is false”

### P-214 — Betamon (X Antibody)

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-214.ts) · [test](../../apps/api/src/cards/P/P-214.test.ts) · clause review (source removed; see History)<br>“returns the opponent Digimon (level <= chosen Seadramon's level) to the deck”; “encodes Decode as a non-battle leave replacement with exact source names”; “plays a Betamon from its digivolution cards when it leaves play”; “does not play a non-matching card when Decode leaves play”

### P-215 — Icemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-215.ts) · [test](../../apps/api/src/cards/P/P-215.test.ts) · clause review (source removed; see History)<br>“shares the exact paid placement and two opponent-scoped protections across all triggers”; “registers inherited Blocker and the exact alternate evolution path”; “pays its On Play placement cost by putting an eligible level-4 card underneath”; “also places an eligible card when the Digimon moves from breeding”

### P-216 — WaruMonzaemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-216.ts) · [test](../../apps/api/src/cards/P/P-216.test.ts) · clause review (source removed; see History)<br>“has Blocker on the card and as an inherited keyword”; “plays a Dark Masters Digimon from hand and restricts that played card until opponent turn end”; “plays a face-up Dark Masters Digimon from security and deletes it at your turn end”; “plays a Dark Masters Digimon from hand on play”; “plays a face-up Dark Masters Digimon from Security on deletion”; “deletes the security-played Dark Masters Digimon at its owner's turn end”

### P-217 — Haru Shinkai

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-217.ts) · [test](../../apps/api/src/cards/P/P-217.test.ts) · clause review (source removed; see History)<br>“exposes On Play and Security effects”; “matches only traited cards linked by the current event”; “reveals three cards and adds one Social and one Creation/Navi/Tool card”; “plays itself from Security”; “gains memory by suspending itself when a matching card is linked”; “reacts to a real link-card intent and gains memory after paying the link cost”

### P-218 — Torajiro Asuka

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-218.ts) · [test](../../apps/api/src/cards/P/P-218.test.ts) · clause review (source removed; see History)<br>“exposes On Play and Security effects”; “matches only Entertainment, Tool, or Navi cards linked by the current event”; “reveals three cards and adds Entertainment and Navi/Tool/Awakening cards”; “plays itself from Security”; “gains memory by suspending itself when a matching card is linked”; “reacts to a real Navi link-card intent and gains memory after paying the link cost”

### P-219 — Flame Inferno

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-219.ts) · [test](../../apps/api/src/cards/P/P-219.test.ts) · clause review (source removed; see History)<br>“reduces its use cost by 3 only while the opponent has at least 10 trash cards”; “deletes a level 6 or lower opponent Digimon, then optionally plays Creepymon for the deletion cost”; “activates its Main effects from security”; “reduces the real use cost by exactly 3 when the opponent has 10 trash cards”; “deletes an opposing level-6-or-lower Digimon through Main”; “does not reduce its real use cost when the opponent has fewer than 10 trash cards”; “deletes its own Evil Digimon and plays Creepymon from trash with Rush and Blocker”

### P-220 — Millenniummon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-220.ts) · [test](../../apps/api/src/cards/P/P-220.test.ts) · clause review (source removed; see History)<br>“provides Reboot and Blocker continuously”; “returns three cost cards and only offers played trash Digimon at different levels”; “exposes Reboot and Blocker on a resident Millenniummon”; “de-digivolves an opposing Digimon by two and permits declining the optional deletion”; “returns three qualifying trash cards and plays two different-level eligible Digimon on deletion”

### P-221 — Chaosmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-221.ts) · [test](../../apps/api/src/cards/P/P-221.test.ts) · clause review (source removed; see History)<br>“naturally DNA digivolves from Yellow and Purple Lv.6 materials and records DNA immunity”; “reduces an opposing Digimon by exactly 10000 DP on When Digivolving”; “reduces an opposing Digimon by exactly 10000 DP when attacking”; “can choose an immune opposing Digimon, but its DP is not changed (Q5766)”; “has Security Attack +1 and the printed Partition requirement”; “grants DNA-only immunity to itself until the opponent's turn ends”; “gives one opposing Digimon -10000 DP on digivolution and when attacking”; “grants Security Attack +1 to a resident Chaosmon”

### P-222 — Rosemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-222.ts) · [test](../../apps/api/src/cards/P/P-222.test.ts) · clause review (source removed; see History)<br>“reduces play cost by 4 only with a face-up Wind Guardians security card”; “may suspend any Digimon on play and digivolving”; “once per turn may delete an opponent's lowest DP Digimon when any of yours suspends”; “reduces the real play cost by 4 with a face-up Wind Guardians security card”; “suspends a Digimon on play and resolves the once-per-turn lowest-DP deletion”; “allows declining the optional suspension and leaves the opposing Digimon intact”; “does not reduce play cost with face-down security”; “does not reduce play cost with a face-up non-Wind Guardians security card”

### P-223 — Kuzuhamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-223.ts) · [test](../../apps/api/src/cards/P/P-223.test.ts) · clause review (source removed; see History)<br>“reduces play cost by 4 with three or fewer security cards”; “uses one matching Onmyōjutsu or Plug-In Option from hand or trash”; “once per turn may play a Pipe Fox Token after a genuine Option use”; “uses a cost-6 Onmyōjutsu Option from hand without paying its cost”; “allows refusing the optional cost-6 Option use”

### P-224 — Kotone Amano

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-224.ts) · [test](../../apps/api/src/cards/P/P-224.test.ts) · clause review (source removed; see History)<br>“places an Xros Heart or Twilight Digimon under this Tamer before the conditional draw”; “suspends itself to play a level 5 or higher Xros Heart Digimon from under any Tamer at cost -1”; “plays itself without paying the cost in security”; “plays itself from Security through its Security effect”; “uses its Main effect to suspend itself and play a level-5 Xros Heart Digimon from under a Tamer”

### P-225 — DigiLab

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-225.ts) · [test](../../apps/api/src/cards/P/P-225.test.ts) · clause review (source removed; see History)<br>“waives color requirements while you have a CS Digimon or Tamer”; “draws 1 and places itself in the battle area”; “delays a top-stack CS placement cost into 2 memory”; “places itself in the battle area from security”; “draws one and places itself in the battle area through Main”; “places itself in the battle area through Security”

### P-227 — Unique Emblem: Primal Impact

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-227.ts) · [test](../../apps/api/src/cards/P/P-227.test.ts) · clause review (source removed; see History)<br>“reveals three, adds the two printed categories, and places itself”; “models the printed reactive Delay bullet”; “adds a Tyrannomon and LIBERATOR from the reveal and places itself”; “runs the printed Main reveal when this Option is checked in Security”; “reacts to its named Tamer and digivolves at a cost reduced by three”; “does not activate for a wrong Tamer or when Delay is declined”; “does not activate when the emblem entered play this turn”

### P-228 — Unique Emblem: Frozen Crown

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-228.ts) · [test](../../apps/api/src/cards/P/P-228.test.ts) · clause review (source removed; see History)<br>“reveals three, adds Ice-Snow and LIBERATOR cards, and places itself”; “models the printed reactive Delay bullet”; “adds an Ice-Snow and LIBERATOR from the reveal and places itself”; “runs its reveal effect when checked from Security”; “reacts to its named Tamer and digivolves at a cost reduced by three”

### P-229 — Unique Emblem: Narrative Ronde

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-229.ts) · [test](../../apps/api/src/cards/P/P-229.test.ts) · clause review (source removed; see History)<br>“reveals three, adds Puppet and LIBERATOR cards, and places itself”; “models the printed reactive Delay bullet”; “adds a Puppet and LIBERATOR from the reveal and places itself”; “runs its Puppet/LIBERATOR reveal when checked from Security”; “reacts to its named Tamer and digivolves at a cost reduced by three”

### P-230 — Unique Emblem: Honeycomb Commander

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-230.ts) · [test](../../apps/api/src/cards/P/P-230.test.ts) · clause review (source removed; see History)<br>“reveals three, adds Royal Base text and LIBERATOR cards, and places itself”; “models the printed reactive Delay bullet”; “adds a card with Royal Base in its text and a LIBERATOR, then places itself”; “runs its Royal Base/LIBERATOR reveal when checked from Security”; “reacts to its named Tamer and digivolves at a cost reduced by three”

### P-231 — Unique Emblem: Invincibly Invisible

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-231.ts) · [test](../../apps/api/src/cards/P/P-231.test.ts) · clause review (source removed; see History)<br>“reveals three, adds Cyborg or Machine and LIBERATOR cards, and places itself”; “models the printed reactive Delay bullet”; “adds a Cyborg and LIBERATOR from the reveal and places itself”; “runs its Cyborg/LIBERATOR reveal when checked from Security”; “reacts to its named Tamer and digivolves at a cost reduced by three”

### P-232 — Unique Emblem: Melting Recital

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-232.ts) · [test](../../apps/api/src/cards/P/P-232.test.ts) · clause review (source removed; see History)<br>“reveals three, adds an eligible Digimon and LIBERATOR card, and places itself”; “models the printed reactive Delay bullet”; “adds an Evil/Dark Dragon Digimon and LIBERATOR, then places itself”; “runs its Evil/Dark Dragon/LIBERATOR reveal when checked from Security”; “reacts to its named Tamer and digivolves at a cost reduced by three”; “digivolves from trash through the reactive Delay and trashes the emblem source”

### P-233 — Eri Karan

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-233.ts) · [test](../../apps/api/src/cards/P/P-233.test.ts) · clause review (source removed; see History)<br>“exposes On Play and Security effects”; “matches only eligible cards newly linked by the current event”; “reveals three cards and adds Game and Invincible/Life/Entertainment cards”; “plays itself from Security”; “gains memory by suspending itself when a matching card is linked”; “reacts to a real link-card intent for an Entertainment card”

### P-234 — Yujin Ozora

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-234.ts) · [test](../../apps/api/src/cards/P/P-234.test.ts) · clause review (source removed; see History)<br>“reveals four cards and adds one supported trait”; “links from hand after a link card is trashed, with the suspend cost and reduction”; “plays without cost from Security”; “reveals four cards and adds one System/Life/Transmutation-family card on play”; “plays itself from Security”; “links a matching hand card after a Digimon's link card is trashed”

### P-235 — Digital Accident Tactics Squad

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-235.ts) · [test](../../apps/api/src/cards/P/P-235.test.ts) · clause review (source removed; see History)<br>“requires a DATA SQUAD trait card and reveals three cards”; “gains two memory through Delay”; “places itself in the battle area from Security”; “adds a DATA SQUAD card from the top three and places itself”; “places itself after resolving its Security reveal”; “activates its armed Delay through the real effect intent and gains two memory”

### P-236 — Glowing Dawn

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-236.ts) · [test](../../apps/api/src/cards/P/P-236.test.ts) · clause review (source removed; see History)<br>“requires Glowing Dawn and reveals three cards before placement”; “gains two memory through Delay”; “places itself in the battle area from Security”; “adds a Glowing Dawn card from the top three and places itself”; “places itself after resolving its Security reveal”; “activates its armed Delay through the real effect intent and gains two memory”

### P-237 — Unique Emblem: Machina's Ascension

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-237.ts) · [test](../../apps/api/src/cards/P/P-237.test.ts) · clause review (source removed; see History)<br>“requires Maquinamon in text and plays Maquinamon or Unchained”; “grants Delay when an Unchained is played and digivolves from hand”; “activates its Main effects from Security”; “plays a Maquinamon from hand without cost and places itself”; “resolves its Security Main effect and plays Maquinamon before placing itself”; “arms Delay from a real Unchained play and digivolves without paying the qualifying card's cost”

### P-238 — Destruction Cannon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-238.ts) · [test](../../apps/api/src/cards/P/P-238.test.ts) · clause review (source removed; see History)<br>“requires CS, deletes an opposing level 6 or lower Digimon, and places itself”; “permanently grants Delay after a CS Digimon attacks”; “deletes and places itself from Security”; “deletes an opposing level-6-or-lower Digimon and places itself”; “deletes an opposing Digimon and places itself when its Security effect resolves”; “grants Delay after a CS Digimon makes a real attack”

### P-239 — DemiDevimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-239.ts) · [test](../../apps/api/src/cards/P/P-239.test.ts) · clause review (source removed; see History)<br>“has Blocker”; “places itself under a Myotismon-text Digimon before optional hand digivolution”; “trashes a hand card to delete an opposing level 4 or lower Digimon”; “trashes a hand card and deletes an opposing level-4 Digimon on host deletion”; “grants Blocker to a resident DemiDevimon”

### P-240 — Arcturusmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-240.ts) · [test](../../apps/api/src/cards/P/P-240.test.ts) · clause review (source removed; see History)<br>“has Collision, Piercing, Reboot, and Blocker”; “de-digivolves on play and when digivolving, then uses two qualifying trash cards”; “plays Proximamon from hand or trash on deletion and redirects one attack once per turn”; “de-digivolves three cards and places two qualifying trash cards underneath”; “also de-digivolves on the digivolving timing”; “plays Proximamon from hand when it is deleted”; “redirects an opponent attack to its inherited host once per turn”; “grants Collision to a resident Arcturusmon”

### P-241 — Yujin Ozora

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-241.ts) · [test](../../apps/api/src/cards/P/P-241.test.ts) · clause review (source removed; see History)<br>“sets memory to three at the start of turn when memory is two or less”; “handles linking in one trigger: grants Appmon Vortex and DP, then permits App Fuse”; “grants the Leviathan trait by Rule and plays from Security”; “sets memory to exactly three at the start of a real turn from memory two”; “plays itself without cost from Security”; “reacts to a real link by suspending, granting Vortex, and adding 3000 DP”; “accepts the linked-trigger App Fuse and merges a legal hand target”

### P-242 — Rei Katsura

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-242.ts) · [test](../../apps/api/src/cards/P/P-242.test.ts) · clause review (source removed; see History)<br>“links an eligible trash card to a friendly Digimon with a one-memory reduction after suspending”; “trashes a Life-trait card, draws 1, and gains 1 memory at the start of the main phase”; “does NOT fire when there is no Life/System/Transmutation card in hand”; “suspends itself and links an eligible Life card from trash to a Digimon at the reduced cost”

### P-243 — Digiseabass

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-243.ts) · [test](../../apps/api/src/cards/P/P-243.test.ts) · clause review (source removed; see History)<br>“requires DM and trashes a hand card to draw two and place itself”; “arms Delay only when the opponent has a Digimon and returns a DM Digimon before playing”; “plays a qualifying DM card from hand or trash through Security”; “trashes a hand card, draws two, and places itself”; “uses its Delay at the start of turn to return and play a low-cost DM Digimon”; “plays a qualifying low-cost DM card from trash through its real Security effect”

### P-244 — Unique Emblem: Ragnarok Attainer

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-244.ts) · [test](../../apps/api/src/cards/P/P-244.test.ts) · clause review (source removed; see History)<br>“delays on an effect-added Vemmon card and uses normal reduced-cost digivolution requirements”; “uses from hand, plays a qualifying Vemmon/Zenith, and places itself”; “plays EX11-066 Xeno from trash because its Rule also treats its name as Zenith”; “keeps P-244 in play when its Delay is declined during BT21-062's real Vemmon placement”; “accepts Delay and pays the qualifying digivolution with exactly 3 memory reduced”

### P-245 — Kakkinmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-245.ts) · [test](../../apps/api/src/cards/P/P-245.test.ts) · printed text unambiguous, no rulings needed (announced for Official Store Tournament 2026 Vol.4, street date 2026-10-01; `node tools/kb/query.mjs card P-245` returns no entries)<br>“draws once per turn at the end of all turns by suspending a black ＜Blocker＞”; “pays only with a black ＜Blocker＞, never a black non-Blocker or a purple Blocker”; “cannot pay with an already-suspended Blocker”; “draws at exactly seven cards in hand and does nothing at eight”; “declines the optional cost without suspending or drawing”; “fires once per turn across two end-of-turn windows”; “keeps the inherited clause after a real breeding digivolution”

### P-246 — Motimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-246.ts) · [test](../../apps/api/src/cards/P/P-246.test.ts) · printed text unambiguous, no rulings needed (announced for Official Store Tournament 2026 Vol.4, street date 2026-10-01; `node tools/kb/query.mjs card P-246` returns no entries)<br>“digivolves for free into a Sukamon-named destination on another Sukamon-named Digimon's deletion”; “digivolves into a Mamemon-named destination on a Mamemon-named deletion”; “does not fire on an Etemon-only deletion, though Etemon is a legal destination”; “does not fire on an unrelated name”; “does not fire on the opponent's Sukamon deletion or on the opponent's turn”; “declines the optional digivolution”; “fires once per turn across two qualifying deletions”

### P-247 — Nyaromon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-247.ts) · [test](../../apps/api/src/cards/P/P-247.test.ts) · printed text unambiguous, no rulings needed (announced for Official Store Tournament 2026 Vol.4, street date 2026-10-01; `node tools/kb/query.mjs card P-247` returns no entries)<br>“deletes an unsuspended level 4 or lower opponent Digimon by trashing a Dark Animal/Shaman/Undead/TS card”; “pays with any of the four accepted traits”; “only the unsuspended Lv.4 target dies on a mixed board; a suspended Lv.4 and an unsuspended Lv.5 survive”; “does nothing when only an unsuspended Lv.5 is present”; “does not pay with a wrong-trait hand”; “declines the optional cost”; “fires once per turn across two attack declarations”; “keeps the clause live through a real breeding-to-battle-area evolution stack”

### P-248 — Veemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-248.ts) · [test](../../apps/api/src/cards/P/P-248.test.ts) · printed text unambiguous, no rulings needed (announced for Official Store Tournament 2026 Vol.4, street date 2026-10-01; `node tools/kb/query.mjs card P-248` returns no entries)<br>“digivolves from DemiVeemon for cost 0 through the public digivolve intent”; “charges the printed cost of 1 for a same-colour non-DemiVeemon egg”; “draws and gains memory at the start of Main by trashing a Free, Armor Form or Veedramon-text card”; “does nothing when no qualifying card is in hand”; “does not fire on the opponent's turn”; “gets +2000 DP on its controller's turn, including after a real digivolution”

### P-249 — Strabimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-249.ts) · [test](../../apps/api/src/cards/P/P-249.test.ts) · printed text unambiguous, no rulings needed (announced for Official Store Tournament 2026 Vol.4, street date 2026-10-01; `node tools/kb/query.mjs card P-249` returns no entries)<br>“charges the printed cost reduced by exactly 2 on a genuine Hybrid digivolution”; “floors at 0 memory rather than refunding”; “places under a Tamer with inherited effects and digivolves that Tamer instead, leaving the source Digimon untouched”; “excludes a Tamer with no inherited effect from the host choice”; “does nothing on a non-Hybrid placement candidate”; “keeps the placement after declining the optional digivolution”; “does nothing at all when the whole clause is declined”; “plays a Tamer with inherited effects for free from a real On Deletion trigger”

### P-250 — Ogremon (X Antibody)

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-250.ts) · [test](../../apps/api/src/cards/P/P-250.test.ts) · printed text unambiguous, no rulings needed (announced for Official Store Tournament 2026 Vol.4, street date 2026-10-01; `node tools/kb/query.mjs card P-250` returns no entries)<br>“digivolves from the trash into itself, paying memory, when a Demon-trait Digimon exists at 5 or fewer cards in hand”; “does nothing at 6 or more cards in hand”; “reaches the printed cost-1 alternate route from a Demon Digimon named Ogremon, Fugamon or Hyogamon through the public digivolve intent, and refuses an illegal Lv.4 base”; “grants ＜Blocker＞ and ＜Retaliation＞ to one Demon/Shaman/Undead Digimon by trashing a card, never to a Flame-trait near-miss”; “shares one once-per-turn budget across on-play, when-digivolving and when-attacking”; “the granted keywords expire at the opponent's turn end”; “deletes an opponent Digimon with a play cost of 6 or less on deletion, and spares a play cost of 10”

## Mechanisms

### exact-name conjunction and absolute cost modifiers

P-116 requires Agumon, Pulsemon **and** Gammamon by exact name across both players, and its
absolute zero-cost modifier is active from hand. The old slash shorthand and unasserted cost
concealed both defects. Commit `d6880deb1` aligns direct IR, catalog text and persisted effects;
seven focused tests assert actual paid costs, incomplete names, exact names, Main and Security.

### security DP modification

P-122's inherited -2000 DP applies to opposing Security Digimon, not opposing battle-area Digimon.
Commit `a11f088d4` changes `ModifyDP` to `ModifySecurityDP` and proves a legal evolution stack and
an actual Security battle. P-096's Security return-to-hand proof is committed separately as
`f78a8512b`.

### foreign effect activation

P-147's attack effect activates the newly placed Pulsemon-text card's When Digivolving effect.
Commit `1e34f5cce` replaces self-reactivation with `ActivateForeignEffect` and `lastPlacedOnly`.

### intrinsic reactive delay

P-227–P-232's Delay opportunity belongs to the named Tamer play event; it must not grant permanent
Delay followed by an unrelated Main activation. Commit `411dac2c1` uses intrinsic reactive Delay.
The [Emblem boundary suite](../../apps/api/src/cards/P/P.emblem-delay-boundaries.test.ts) tests all
six destination filters with normally legal evolution candidates.

## Knowledge base index

Ruling IDs cited by P cards: Q4113,Q4124 Q4128,Q4132 Q4135,Q4138 Q4141,Q4144 Q4147,Q4148 Q4161,Q4169 Q4179,Q4180 Q4181,Q4182 Q4183,Q4184 Q4186,Q4187 Q4188,Q4191 Q4192,Q4195 Q4219,Q4224 Q4236,Q4239 Q4242,Q4251 Q4277,Q4421 Q4627,Q4628 Q4629,Q4630 Q4631,Q4632 Q4846,Q4849 Q4850,Q4854 Q4979,Q4980 Q4986,Q4987 Q5192,Q5193 Q5196,Q5197 Q5198,Q5199 Q5200,Q5201 Q5397,Q5398 Q5399,Q5400 Q5401,Q5519 Q5576,Q5579 Q5582,Q5585 Q5602,Q5606 Q5631,Q5634 Q5670,Q5758 Q5759,Q5760 Q5761,Q5762 Q5763,Q5764 Q5765,Q5766 Q5770,Q5771 Q5772,Q5773 Q5774,Q5960 Q5961,Q5962 Q5963,Q6119 Q6520,Q6521 Q6917,Q6922 Q7089,Q7090

## Open items

- No card scores below 10/10 and no ambiguity is recorded.
- P-226 and P-251 are absent from the committed catalog (unrevealed placeholder rows). The set is
  249 cards, and no module or score exists for either ID.
- P-245..P-250 are announced but not yet distributed (Official Store Tournament 2026 Vol.4, street
  date 2026-10-01). No card-specific KB rulings exist for them; each ledger entry records that and
  cites the general rules used instead. Two encoding notes worth carrying forward if a future card
  needs the same shape: P-249 uses a `CostGatedBlock` wrapping an optional `Digivolve` rather than
  an optional `Digivolve` carrying the cost (the latter would prompt before the cost is proven
  payable); P-250's `[Trash]` digivolve-from-trash clause follows BT24-080's accepted shape but
  sets `payCost: true` since P-250's print carries no "without paying the cost" waiver.
- Post-audit drift not covered by the 2026-09-05 evidence: `09dcca2a5` (2026-09-08) corrected
  `P-107.ts` (Defense Training) and its test after the ledger scored P-107 at 10/10; `969ed488f`
  (2026-09-10) removed `ts-nocheck` from 238 P modules; `d90434a3f` (2026-09-08) repaired settle
  predicates in 11 P test files. The collection re-run above is green at `eabe99351`, but the
  P-107 row's evidence predates its correction, and the shared gates (combined parity run, rendered
  scenarios, workspace typecheck, lint) were not re-run after that drift.
- P-177 and P-232 needed fixture work — peer-module registration and an explicit evolution-route
  choice with a memory baseline — rather than shared-engine changes. Temporary instrumentation and
  skipped reproductions were rejected as final evidence.

## History

- `docs/audits/P-AUDIT.md` — last in `a8136a499`, 2026-09-05. Recalculated 243-card scoring ledger;
  the winning source for the card ledger above.
- `docs/audits/PROMO-LM-RB-AUDIT-20260905.md` — last in `a8136a499`, 2026-09-05. Coordinator
  evidence for the shared P/LM/RB1 audit: corrections, artifact parity, verification and
  integration. Also recorded in `docs/audits/LM.md` and `docs/audits/RB1.md`.
- `docs/audits/P-20260905-001-122.md`, `docs/audits/P-20260905-123-176-review.md`,
  `docs/audits/P-20260905-177-225-review.md`, `docs/audits/P-20260905-227-244-review.md` — 4 files,
  last in `6e582b119`, 2026-09-05. Dated clause-level range reviews supplying printed clauses,
  exact test titles and KB tracing.
- `docs/audits/ST11-full.md` — last in `52da0b5bb`, 2026-08-28. One-card ST11 Special Entry Pack
  collection audit; its subject is `P-065`, so it is folded into this document.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for P: PR #4601; commit `84d55704c`.
