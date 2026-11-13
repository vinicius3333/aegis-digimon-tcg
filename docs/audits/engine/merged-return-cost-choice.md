# Merged return cost choice

Some cards print alternative costs that return one card to the same place: "by
returning 1 of your other Digimon or 1 [Jesmon] or [X Antibody] from this
Digimon's digivolution cards to the bottom of the deck". The player chooses a
card, not a cost. Asking first which printed cost to pay and then which card to
return showed two long uppercase buttons, followed by a second prompt.

`payOneCostOption` now hands such costs to `payMergedReturnCost`. When every
payable option is a `return` of exactly one card with the same destination, from
the battle area or from digivolution cards, it offers all their candidates in
one `selectCards` decision tagged as a cost. The client groups them by zone
("Your battle area", "Digivolution cards"). The picked card binds to a selection
reference, and the cost that owns it is paid through the normal `payCost` path,
so leave prevention and destination handling are unchanged.

Any other combination keeps the existing choice between costs. The shape check is
synchronous and returns `undefined` without awaiting, so the unchanged path keeps
its exact microtask order; an extra await there shifted concurrent resolution and
broke two recorded replays by one state version. When only one
cost is payable, the player still sees only that cost's card choice.

Cards on this path: BT27-016 Jesmon (X Antibody) activates its Option side, and
BT27-068 Gankoomon (X Antibody) prevents leaving. BT23-073's options delete
the Digimon or place a card, so it keeps the choice between costs.

`BT27-016.test.ts` and `BT27-068.test.ts` assert one cost selection that holds
both another Digimon and a matching digivolution card, and no `chooseOption`.
The Jesmon (X Antibody) test fails without the merge.
