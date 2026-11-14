# Merged return cost choice

Some cards print alternative costs that return one card to the same place: "by
returning 1 of your other Digimon or 1 [Jesmon] or [X Antibody] from this
Digimon's digivolution cards to the bottom of the deck". The player chooses a
card, not a cost. Asking first which printed cost to pay and then which card to
return showed two long uppercase buttons, followed by a second prompt.

`payOneCostOption` now hands such costs to `payMergedReturnCost`. When every
payable option is a `return` of exactly one card with the same destination, from
the battle area or from digivolution cards, `mergedReturnCandidates` collects
all their candidates and one `selectCards` decision offers them, tagged as a
cost. The client groups them by zone ("Your battle area", "Digivolution
cards"). The picked card binds to a selection reference, and the cost that owns
it is paid through the normal `payCost` path, so leave prevention and
destination handling are unchanged.

The return is an optional processing condition (CR 15-7-1), so the picker has a
minimum of 0 and `declinesCost`, which the client shows as "Don't use".
Declining leaves the cost unpaid: the activation or prevention does not happen
(CR 15-7-2).

When the action itself is optional ("Then, by returning …, activate 1 [Main]
effect"), `runAction` drops its "Use this effect?" prompt and lets the picker
carry the decision, as it already does for hand costs. The picker then appears
even when only one cost is payable. Accepting marks the activation as chosen;
declining marks it as declined, as a "No" did. Gankoomon (X Antibody)'s leave
prevention keeps its own "Prevent leaving?" prompt; its picker can still be
declined, and then Gankoomon leaves.

Any other combination keeps the existing choice between costs. The shape check is
synchronous and returns `undefined` without awaiting, so the unchanged path keeps
its exact microtask order; an extra await there shifted concurrent resolution and
broke two recorded replays by one state version.

Cards on this path: BT27-016 Jesmon (X Antibody) activates its Option side, and
BT27-068 Gankoomon (X Antibody) prevents leaving. BT23-073's options delete
the Digimon or place a card, so it keeps the choice between costs.

`BT27-016.test.ts` and `BT27-068.test.ts` assert one cost selection that holds
both another Digimon and a matching digivolution card, no `chooseOption`, no
separate optional prompt for Jesmon (X Antibody), and that declining the picker
keeps the DP gain or lets Gankoomon (X Antibody) leave. The Jesmon (X Antibody)
merge test fails without the merge.
