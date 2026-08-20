# BT24 Audit Ledger — Wave 1

Scope: `BT24-102` through `BT24-098`, audited in descending order on 2026-08-20. Evidence sources are the committed catalog, `node tools/kb/query.mjs card <ID>`, direct module/IR, shared interpreter seams, and colocated behavioral tests. A score is recorded only after all ten rubric points pass.

## BT24-102 — Homeros — 10/10

1. **Catalog:** White Tamer, play cost 5, traits Iliad/TS, no evolution/inherited/link clauses. Exact clauses: `[Start of Your Main Phase] Gain 1 memory. Then, if you have 5 or more memory, suspend this Tamer and ＜Draw 1＞`; `[All Turns] All of your [TS] trait Digimon get +1000 DP`; `[End of Your Turn] By suspending this Tamer, you may activate 1 [On Play] or [When Digivolving] effect of 1 of your [Olympos XII] trait Digimon`; Security plays this card free.
2. **KB (exact query mapping):** Q5719: “5 or more memory” means 5 or farther left on the controller's side. Q5720: suspend/draw is mandatory at the threshold. Q5721: a disabled When Digivolving effect cannot be activated, but a combined On Play/When Digivolving effect may use its legal On Play branch. Q6029: exhausted per-turn uses cannot be reactivated. Q6251: Draw 1 still happens if suspension is prevented. Q6945: effects gained through Succession are eligible. The module uses owner-turn memory perspective, an unconditional suspend attempt followed by draw, and `reactivateOnPlay` with both timings and normal effect gates/use tracking.
3. **Every clause:** `OnStartMainPhase`, `None` static, `OnEndTurn`, and `SecuritySkill` each map to one direct effect; tests cover all four.
4. **Evolution/traits:** no evolution requirement. Mixed-board public test proves only the controller's TS Digimon receives +1000 DP; own non-TS and opponent TS do not.
5. **Costs/failures:** the end-turn suspend is paid through `payActivationCost`; already-suspended negative proof produces no reactivation. Start-main below 5 gains memory but does not suspend/draw; Q6251 ordering is explicit in code.
6. **Decisions/controllers:** end-turn activation is optional, selects exactly one controller-owned Olympos XII Digimon, and combines On Play/When Digivolving into one pool. Owner-turn and controller filters are explicit.
7. **Zones/order/face:** source Tamer and target Digimon must be in the battle area and not breeding; Security moves the physical source instance into battle without cost. Public test asserts unchanged memory and final battle-area zone.
8. **Complex interactions:** stub Olympos XII On Play effect proves real cross-card reactivation and memory change; use/can-activate restrictions are delegated to the shared reactivation seam and mapped to Q5721/Q6029/Q6945.
9. **UI applicability:** no presentation-only path; all choices and state transitions use engine decisions/intents. Browser validation not applicable.
10. **Gates:** `BT24-102.test.ts` passes 6 tests in the five-card focused run; wave aggregate, typecheck, formatting/lint, and diff gates are recorded below.

## BT24-101 — Jupitermon — 10/10

1. **Catalog:** Yellow level 6 Digimon, play 12, DP 13000, standard yellow level-5 cost 5; Shaman/Olympos XII/Iliad/TS. Exact alternate clauses: level-5 TS cost 3; level-5 Aegiochusmon-name cost 1 for each own security. Entry clause trashes own top security, gives one opposing Digimon -13000 DP through opponent turn end, then Recovery +2 if own security is 1 or fewer. First All Turns once-per-turn trashes opponent top security when own security is removed. Second All Turns once-per-turn prevents any own TS Digimon/Tamers leaving by trashing own top security.
2. **KB (exact query mapping):** Q5714: the Aegiochusmon path costs 0 with zero security. Q5715: DP reduction remains possible when zero security prevents the initial trash. Q5716: 0-DP deletion waits for the post-effect rule check. Q5717: Security effects resolve before other simultaneous security-check triggers, then turn-player pending effects first. Q5718: one replacement activation prevents all simultaneously leaving qualifying Digimon/Tamers without individual selection.
3. **Every clause:** both entry timings carry identical three-action sequences; both once-per-turn All Turns effects are present. The previously missing live dynamic evolution cost and owner-security event scope were corrected.
4. **Evolution/traits:** standard catalog path remains; alternate IR has TS level 5 cost 3 and Aegiochusmon-name level 5 eligibility. A hand-resident fixed-cost modifier sets the Aegiochusmon path to live own-security count; public evolution from BT24-014 proves cost 3 and cost 0.
5. **Costs/failures:** security trash actions tolerate an empty stack, preserving the Q5715 DP branch. Replacement cost selects the top own security card, is optional, and aborts on decline/unpayable cost.
6. **Decisions/controllers:** DP target is exactly one opponent Digimon. Replacement source filter is all controller-owned TS Digimon/Tamers, matching Q5718's no-individual-target semantics; both effects have distinct once-per-turn identities.
7. **Zones/order/face:** own top security is trashed before DP reduction; Recovery reads the resulting security count and adds two from deck top. Replacement pays from top security and keeps all protected permanents in battle.
8. **Complex interactions:** dynamic set-cost uses the same modifier ledger as public digivolve; Q5716/Q5717 rule-check/priority remain shared-engine responsibilities. Owner-security trigger now has `triggerRemovedSecuritySeat: mine`, preventing opponent-removal false positives.
9. **UI applicability:** evolution, target selection, and replacement are engine-owned; no presentation-only validation applies.
10. **Gates:** `BT24-101.test.ts` passes 3 tests, including two public digivolve intents and owner/once-per-turn security-removal behavior. Reverting the dynamic modifier makes the 3-security case pay 1 and the 0-security case pay 1 instead of 3/0.

## BT24-100 — In-Between Theater — 10/10

1. **Catalog:** White Option, use cost 3, TS trait. Exact clauses: color requirements are ignored while the controller has a TS Digimon or Tamer on the field; Main reveals top 3, adds one TS card, returns the rest to deck bottom, then places this Option in battle; Main Delay gains 2 memory; Security places it in battle.
2. **KB (exact query mapping):** Q5713: “on the field” includes battle area or breeding area. The shared `youHave` condition evaluates the complete controller field and uses the Form/Attribute/Type trait union.
3. **Every clause:** Static waiver, first Main reveal/place, Delay Main gain, and Security placement are all encoded and asserted.
4. **Evolution/traits:** no evolution. Mixed filter requires Digimon/Tamer plus TS; option self is the waiver target. TS search accepts the complete trait union and not unrelated cards.
5. **Costs/failures:** normal use cost is paid by public `playCard`; Delay cannot activate on the entry turn and trashes the Option as activation cost before gaining memory.
6. **Decisions/controllers:** reveal selects at most the one printed controller-owned eligible card; test automation selects it and orders the remainder. No opponent decision exists.
7. **Zones/order/face:** public test proves selected TS goes deck-to-hand, two cards remain at deck bottom, Option enters battle, then Delay moves it to trash. Security physical instance enters battle.
8. **Complex interactions:** public play succeeds with no white field source because a TS permanent grants the waiver. Delay activation is tested only after making the entry-turn restriction false, proving the shared Delay timing gate.
9. **UI applicability:** engine intents expose play and activation; no UI-only path exists.
10. **Gates:** `BT24-100.test.ts` passes 3 tests, covering exact IR plus public Main/Delay/Security state.

## BT24-099 — Super Hacking — 10/10

1. **Catalog:** Purple Option, use cost 3, Appmon form. Exact clauses: Appmon Digimon/Tamer field waiver; Main “By trashing 1 Appmon card from hand, Draw 2. Then place this card in battle”; All Turns any Digimon deletion grants Delay to optionally link one Appmon Digimon from own trash to one own Digimon free; Security places this card in battle.
2. **KB (exact query mapping):** Q5711: failing/declining the Appmon trash cost prevents both Draw 2 and the post-“Then” placement. Q5712: a deleted On Deletion card linked out of trash by Delay can no longer activate its pending On Deletion effect. IR uses `optional + abortOnDecline` on the cost-bearing Draw and physical trash-zone movement for Link.
3. **Every clause:** waiver, paid Main, any-controller Digimon deletion watcher, Delay Link, and Security placement are encoded and asserted.
4. **Evolution/traits:** no evolution. Appmon matching uses the shared Form/Attribute/Type trait union; public test uses BT21-009 as both field waiver and hand cost.
5. **Costs/failures:** Main trash cost is selected and paid before draw; `abortOnDecline` makes placement atomic with payment per Q5711. Link has no link cost and is optional; Delay itself trashes this Option before its payload.
6. **Decisions/controllers:** deletion watcher accepts either controller's Digimon. Link source is controller-owned Appmon in trash; recipient is exactly one controller-owned Digimon.
7. **Zones/order/face:** public test proves cost card hand-to-trash, two deck cards to hand, and Option hand-to-battle. Link explicitly moves the physical deleted card out of trash, which enforces Q5712. Security instance enters battle.
8. **Complex interactions:** all-controller deletion arming and Q5712 pending-effect identity are mapped to the deletion watcher and physical-zone semantics. Appmon near-match risk is covered by exact form/trait matching rather than name substring.
9. **UI applicability:** decisions use engine selection APIs; no presentation-specific path applies.
10. **Gates:** `BT24-099.test.ts` passes 3 tests with exact IR and public paid Main/Security proofs.

## BT24-098 — Invasion of the Titans — 10/10

1. **Catalog:** Purple Option, use cost 3, Titan/TS traits. Exact clauses: Main Draw 2 and trash two hand cards, then place in battle; Your Turn when own Titan Digimon is played, Delay may play an own level-5-or-lower Titan from trash free if opponent has at least 5 memory; Security may play a level-4-or-lower Titan from hand/trash free, then adds this Option to hand.
2. **KB (exact query mapping):** Q5709: opponent “5 or more” is 5 or farther right on the opponent's side. Q5710: Delay may still be paid/trash the Option, but no Digimon is played if live opponent memory has fallen below 5 before Delay resolves. The action condition is evaluated on resolution with `controller: opponent` and the play action requires armed Delay.
3. **Every clause:** Main three-action sequence, owner/Titan/Your Turn watcher, gated Delay play, and the previously absent two-action Security effect are all encoded and asserted.
4. **Evolution/traits:** no evolution. Delay filters level <=5 Titan in own trash; Security independently tightens to level <=4 from hand/trash. Tests mix eligible BT24-042 and ineligible level-5 BT24-075.
5. **Costs/failures:** Main draw is mandatory and exactly two hand cards are trashed; Delay payment is independent of the live memory condition per Q5710; optional play decline is preserved. Security play is optional, but the following self-to-hand action is mandatory.
6. **Decisions/controllers:** watcher is only own played Titan during own turn. Both plays select at most one controller-owned eligible card; opponent memory is read from the opponent perspective.
7. **Zones/order/face:** public Main proof ends with exactly two cards in trash, two drawn cards in hand, and Option in battle. Public Security proof plays the eligible hand Titan, leaves the level-5 trash Titan untouched, and moves the physical Security Option to hand.
8. **Complex interactions:** dynamic Delay arming/consumption and late memory recheck map directly to Q5710. Level boundary and hand-vs-trash source union are explicit regression assertions.
9. **UI applicability:** all choices and movements are engine-level; no presentation-only UI path applies.
10. **Gates:** `BT24-098.test.ts` passes 3 tests. Reverting the prior Security restoration fails both structural and public zone assertions.

## Wave commands and results

- Catalog extraction: Node read of `packages/shared/src/cards/data/cards.json` for all five IDs — exact records present.
- KB: `node tools/kb/query.mjs card BT24-{102,101,100,099,098}` — 6, 5, 1, 2, and 2 Q&A entries respectively; all mapped above, no errata/restriction ambiguity reported.
- Focused wave: `pnpm --filter @aegis/api exec vitest run src/cards/BT24/BT24-{102,101,100,099,098}.test.ts` — 5 files and 18 tests passed.
- BT24 regression suite: `pnpm --filter @aegis/api exec vitest run src/cards/BT24` — 104 files and 169 tests passed.
- Workspace typecheck: `pnpm typecheck` — shared, API, and web typechecks passed.
- Shared seams inspected: IR trigger routing, hand-resident fixed digivolution cost modifiers, public digivolve cost ledger, Delay entry-turn/trash cost, definition trait union, Security self movement, action-cost abort semantics, and replacement/subtrigger controller gates.
- UI: not applicable for these five cards; no presentation-only behavior.
- Remaining ambiguity: none for this wave. This ledger does not claim any audit status for BT24-097 or older IDs.
