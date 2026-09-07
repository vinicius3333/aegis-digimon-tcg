# BT20 exact-name and public-flow review checkpoint

This is an in-progress evidence record, not collection completion.

- CR 2-3-1-2 exact bracket-name defects are reproduced for 051 (paired Kota), 061 (Gyuukimon), and 084 (already Awakened Ciel). Before-fix JSON reports are named-tamer-red-results.json and ciel-name-red-results.json. Lead corrections use the existing nameExact matcher. Named Dorumon/Ryudamon targets on 015/053 are normalized too; no current catalog variants were found for those two names.
- Nine BT20 effects catalog entries change: five exact-name corrections plus 083 and 093–095. Initial set-scoped sync succeeded for the five name corrections; a later build timed out at the fixed 120-second limit and is being retried. Final successful sync/check logs supersede the failed attempt.
- Public 014 entry/deletion and natural end-turn evolution proofs, 015 breeding choices and non-attack controls, 016 actual Piercing combat/expiry, 017 watcher attack/reset and paid full-stack token evolution, 018 legal during-attack breeding evolution, 020 restriction expiry and natural OPT/reset, 021 public shared OPT/Blast, and 102 survivor deck-bottom return are integrated or under lead validation. Final acceptance requires completed gates and hashes.
- 014/015 runtime-disabled mutants fail observable state assertions; the runner now preserves previous cards in its summary.
- The 018 fixture exposed a peer limitation in P-176: its Digivolve action omits payCost while the printed effect requires ordinary payment. The interpreter treats omission as free. This is recorded as an existing out-of-collection card encoding limitation. The BT20 proof now uses the correct BT20-087 paid/reduced evolution route and does not depend on P-176.
- Root corrected invalid proposed fixtures: Digi-Egg hand cards, memory above 10, incorrect inherited ExVeemon deletion claims, reversed De-Digivolve stacks, optional attack assigned to an ally when the text says this Digimon, stale dead-permanent lookups, absent optional candidates, missing deck cards, and omitted turn-seat transitions.

## Tail review follow-ups

- 085/086/087/088/089/090/092 still need direct Security deployment evidence where not covered elsewhere, plus the card-specific cost/refusal and face-up/breeding controls recorded by independent review.
- 093 now has live immediate Delay DNA, refusal, Security hand/trash play, and battle exclusion. The old later-Main encoding was wrong. Root also confirmed that 094/095 use the same incorrect GainKeyword-then-later-Main structure despite printed All Turns reactive windows; both must be corrected with public trigger-time proof. The reviewer's proposed later-Main activation fixtures are rejected. 096 needs actual Trash Main activation; 097 needs exact reduced evolution payment and boundary control; 098 needs exact-nine-level refusal/under-nine and repeated-level return proof.
- 099/100/101 independent reviews found no substantive new gap; final lead clause review and runtime sensitivity remain required. 102 now adds public surviving opponent deck-bottom return.
- 083 was incorrectly described by a reviewer as having Sistermon trash behavior; discard that claim. Omekamon's actual catalog and Q&A must govern its final review.
- 084 ordering proves Q4413/Q4414 source invalidation, not recursion. Actual suspend-lock expiry and Tamer target behavior still require final review.
- 056 during-attack breeding and Ouryuken inherited leave protection, 057 combined play reductions, and 078 opponent evolution ordering remain listed in round 2.

All unaccepted cards remain provisional. Historical scores and a green partial suite do not satisfy the persistent collection goal.

## Shared replacement registry barrier

`GameEngine.consultLeavePrevention` now awaits `recomputeContinuousEffects()` before reading replacement subscriptions. The public 093/ST2-16 fixture observed a registered reaction before the Option intent but an empty registry at the actual immediate consult while another continuous rebuild was between clear and refill. The existing asynchronous barrier handles this overlap and preserves reentrant continuous behavior. The isolated `replacementRecomputeBarrier.test.ts` is green; removing just the added wait fails an observable missing-Examon assertion (replacement-barrier-mechanism-red.log). No change to the generic replacement payload or matching semantics is needed.

## Immediate Delay and targeted movement integration

The current 083 refusal regression fails before its optional Digivolve flag is added: Omekamon evolves despite refusal. The 094/095 public regressions fail before replacing later Main activation with intrinsic All Turns Delay: the immediate Dragon Mode play or breeding evolution is absent. `reactive-083-095-red-results.json` preserves these intended failures; its remaining same-turn-memory failure was a fixture auto-pass, corrected by retaining a playable hand card.

094 now resolves at opponent security removal, trashes the Option as its activation cost, and plays the exact Dragon Mode source from Fighter Mode. Public acceptance, feasible refusal, entry-turn exclusion, own-security exclusion, and Security hand/trash recovery are integrated. 095 uses the errata's non-Chronicle level-3 breeding source, with public hand/trash evolution, Delay refusal, non-Chronicle deletion and egg-level controls.

095 exposed a second shared gap: `moveToBattleArea` cost only moved the effect source, which was the already-trashed Option. The cost now supports an explicit breeding target and binds the moved permanent. Digivolve preflight checks that cost target before payment; the payload evolves the bound permanent afterward. Legacy self-movement behavior remains scoped to costs without a target. The new `targetedBreedingMoveCost.test.ts` includes another allied Digimon on the field. Both accepted/refused cases pass, and reverting only the two shared implementation files produces the intended missing-evolution assertion (`targeted-movement-mechanism-red.log`).

The 24 affected mechanism files pass 552 tests (`reactive-movement-affected-results.json`). Independent Luna review found no substantive shared-engine or 093/095 IR defect. Whole collection, catalog, typecheck, style, sensitivity, acceptance hashes and pushed delivery remain separate final gates.

Lead corrections also addressed misleading fixtures: 018's wrong-trait control needed Ouryumon actually available and the attacking base explicitly selected over the breeding base; 024's inherited host must carry 024 rather than 022; 025's normal and alternate cost paths differ, and its inherited extra-check test needed to answer Slayerdramon's intervening optional unsuspend. No unchanged-state assertion alone is credited for an unexercised trigger.

## Prepared next review batch

- 027: add actual opponent-security removal -> optional matching-text unsuspend, feasible refusal, same-turn OPT and next-turn reset. Prior 093 fixtures exercise related public timing but do not replace this complete card-specific repeat proof.
- 028: independent Luna review found no substantive remaining gap; lead must inspect current clauses, run sensitivity and record final gates.
- 029: confirm Your Turn cost reduction is absent off-turn through a legal effect-driven evolution or a documented engine seam. The reviewer's suggested ordinary out-of-turn evolution intent is illegal and is not an acceptable fixture.
- 030: add the missing exact public play-cost assertion; independently review search categories and inherited Barrier outcomes before sensitivity/acceptance.
- 031: independent Luna review found no substantive remaining gap; lead clause review and sensitivity remain.
- 032: inherited battle-deletion memory needs public same-turn repeat suppression and next-turn reset; strengthen exact top-security identity for the On Play recovery choice.

These next batches are prepared read-only while the current checkpoint completes validation and atomic delivery. All remain unaccepted until separately proven.
