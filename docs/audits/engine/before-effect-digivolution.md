# Before-effect digivolution

Verified 2026-10-05 on supported Node 26.10.0, against feature-branch base `ed92a96a5aa553e40dd88405f5675f45d6fe7935` and the accompanying source changes.

## Contract and correction

An ordinary evolution caused by a card effect must resolve eligible before-digivolution actions while the original top is still present, before memory payment and card placement. [P-075](../P.md#p-075--okuwamon) exposes this boundary with a granted suspension effect; its public BT9-109 X Antibody producer also proves that the grant precedes the destination's When Digivolving suspension. The former post-evolution P-075 clause and the ordinary effect primitive's missing pre-evolution invocation were separate defects.

`apps/api/src/engine/effects/verbs/digivolve.ts` now invokes the existing `PrimitivesEngine.fireWouldDigivolve` port once after route/cost decisions and before the final affordability check, alternate placement payment, memory payment and evolution. Paid, cost-free and cost-free ignore-requirements paths share this boundary. The existing production effect context already supplies the port; no new interface or wiring is required. Finalized cost decisions are retained once, so optional costs/reductions are not requested or paid twice. Memory gained during the reaction is visible to the affordability check.

The declaration captures the original permanent, top-card object and ID, controller and breeding state, and result instance, card ID, owner, loose area and physical source host for stacked/linked results. These are rechecked after cost decisions, the pre-evolution reaction and alternate placement payment. A stale declaration returns without evolving, drawing or paying the evolution memory cost. This checks current identity and location; it does not claim historical tracking of a card that leaves and returns to the same location. Existing source-placement validation in `gameEngine/subTriggers.ts` is unchanged.

## Evidence and limits

`cards/P/P-075.test.ts` passes 16 cases. Its ordinary and X Antibody producers use public play/evolution/attack intents, while its paid/free primitive controls are explicitly supplemental. `cards/EX11/EX11-074.test.ts` passes 24 cases, including suppression and later reactivation of the opponent-granted effect. Their complete printed contracts are recorded only in their set ledgers.

`engine/effects/primitives.test.ts` passes 215 cases, including eight new boundary cases: paid/free invocation exactly once before movement/payment; removal or top replacement of the base; result movement to another area or another host within the same area; base removal during the finalized-cost decision; and pre-payment memory gain without repeating that decision. Those eight inject recording collaborators into the production primitive harness and are supplemental engine evidence, not autonomous bot or printed-card mastery claims.

The final affected regression passes **818 files / 13,779 tests** with Node 26.10.0, one fork and no file parallelism. Selectors cover `src/bot`, `src/engine`, all BT26/EX13, and BT22-094, EX6-006, P-074/075/076, EX11-062/074, EX2-056, BT9-052/109. The regression receipt confirms all seven changed source files remain byte-identical during execution. Full workspace typecheck, scoped source lint and formatting pass. Earlier failed proofs are retained; two newly added negative fixtures were corrected to avoid BT1-083's own printed Piercing.

Independent delivered-code review reports no findings and passes **297 tests in five files** on Node 26.10.0, including BT8-024 and ordinary action-digivolution controls. Source hashes remain identical before and after that check. Review script/report SHA-256 are `0d6ca642fe97587a7a45142df63ac4be9de1a0b848308e68d69eb8866c6ee9f9` / `600a0fb5042e4b61e62324bde82926dab507a202cea61b898fac34c25a94034a`.

`pnpm effects:check:set -- --set P --base HEAD` passes with all 249 records synchronized, one semantic change against the base and zero semantic or byte changes outside P. Audit layout passes all four tests; `pnpm audit:index --check` confirms the existing 66-set index is current. The catalog edit changes only P-075's missing timing word.

This targeted seam change does not extend claims to DNA evolution, browser transport, all-card mastery or learned strength. Existing desktop runs remain bound to their original sources. A later immutable build, fingerprint migration and policy requalification are required before this source can support those runtime claims.
