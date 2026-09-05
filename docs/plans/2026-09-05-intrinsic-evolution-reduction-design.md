# Intrinsic evolution reduction provenance

## Evidence and contract

EX9-070 Q4939 combines Meat's reduction with ShinMonzaemon's own reduction.
BT22-038 evolving into BT22-076 costs 5 minus 2 intrinsically, or 1 when
Meat also reduces it by 2. Initializing continuous effects exposed a duplicate:
the live hand-resident IR modifier and the shared intrinsic projection both
subtracted ShinMonzaemon's reduction. Normal evolution cost 1 instead of 3;
the Meat route cost 0 instead of 1.

## Decision

Carry destination-card provenance on hand-resident, self-targeted, negative
digivolution modifiers. Query matching live provenance before consuming any
modifiers. If the live ledger already implements the intrinsic reduction, skip
the shared fallback for that calculation. Keep the shared projection for callers
without live IR state; do not change catalog data or introduce card registration
exceptions. Fixed costs and increases cannot suppress the reduction fallback.

The provenance follows the existing predicate, so controller and destination
matching remain authoritative. Clearing continuous modifiers removes provenance
with the modifier itself. Other reductions still compose normally.

## Verification

- EX9-070 exercises Q4939 through a paid public Delay evolution, alongside the
  Tokomon, BT22-038, BT22-061 and P-202 reduction combinations.
- BT22-076 initializes continuous effects before the public normal evolution
  and asserts the final cost is 3.
- Modifier ledger tests prove controller/destination matching, clearing,
  composition with unrelated reductions, and rejection of fixed/increasing costs.
- Selected BT7-040, BT10-086 and BT22-061 cost regressions remain green.

## Separate residual risk

Multiple copies of the same intrinsic reducer in hand may each install a
destination-card predicate. This change deduplicates the shared fallback against
live IR, not multiple physical sources against each other. That scenario needs
its own public reproduction and instance-identity review; this work does not
claim a complete BT22-076 audit.
