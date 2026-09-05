# EX9-067 reduced-play filter

The catalog permits Arisa Kinosaki or a Puppet-trait Digimon from the
controller's hand. Q4827 prohibits combining two Mirai effects into one
six-memory discount.

The existing filter uses `controller: mine` plus `orFilters`. That construct
unions the primary filter with alternatives, so the unrestricted primary
branch admits any card owned by the controller. A real Puppet evolution with
two Mirai copies reproduced an illegal second play of the mandatory draw,
BT1-048, whose On Play effect then moved both returned Tamers to hand.

Use the existing `or` construct for the two required alternatives beneath
the common controller constraint. Changing the union interpreter would break
its documented contract; inventing a card-specific runtime check is unnecessary.
The card remains registered exclusively through `registerIrCard`.

Proof uses public evolution with one and two Mirai copies, independently for
Puppet and Arisa. Assert exact payment, legal played instance, mandatory draw
remaining in hand, deck routing, and no unresolved decision. Independent
Puppet-only/LIBERATOR-only searches include an unrevealed deck anchor.
