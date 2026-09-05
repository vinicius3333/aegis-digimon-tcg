# EX9-061 cost-aware level targeting

## Contract and observed failure

Devimon places the deck top face down as its bottom source before calculating
the deletion ceiling: level 3 plus one per two face-down sources. Public attacks
with one or three existing hidden sources must therefore reach levels 4 or 5.
The focused test initially passed 7/9 cases; both threshold-crossing cases failed
before payment because the Delete action preflight scanned the current board.

## Decision

Use a read-only target projection in the Delete action preflight. For a payable, fixed-count,
face-down placement onto self, materialize the post-cost level ceiling in a copied
target. Do not mutate the stack, pay costs, consume choices, or alter live targeting.
Resolution still pays normally and evaluates the actual resulting stack.

Limit this seam to Delete with an inclusive level ceiling scaled by self face-down
sources. Variable counts, compound costs, alternative filters, other hosts, other destinations, and unpayable costs retain
their existing checks. Do not bypass no-target validation globally or simulate real
payment during eligibility checks. The activation board scan currently handles only
SetBaseDP; changing it would not affect this card, so it remains unchanged.

## Verification

The expanded focused suite passes 16/16, including odd/even thresholds, unpayable
costs, targets above the projected ceiling, public refusal, and a second attack
proving no repeated payment. Normal/alternate evolution, Training in battle and
breeding, and inherited Retaliation are also exercised through public intents.

The final affected run passes 4 files / 37 tests: EX9-061, EX9-006,
activateEffect, and lastDeletedLevel. The earlier EX9-059/060/061 run passed
35 tests before the final card-only additions. Scoped lint, formatting, and
diff validation pass. Collection-wide effects synchronization and final collection
gates remain part of the EX9 closeout, not this individual card change.
