# DP deletion maximums in replacement costs

EX13-015 Q7252 confirms that a continuous “add X000 to the maximum your DP-based deletion effects can delete” modifier also applies when the deletion is the `deleteOwn` cost of a would-leave replacement.

The interpreter now raises a `deleteOwn` target's printed numeric `dp <= N` cap in both places that must agree:

- `canPayCost`, which decides whether the replacement can be offered;
- `payDeleteOwnCost`, which selects and deletes the cost target.

Both paths reuse `raiseDeletionDpCap`. Relative DP thresholds remain unchanged because that helper only raises printed numeric upper bounds.

Proof:

- `src/engine/effects/interpreter.test.ts`: “raises a deleteOwn cost target's printed DP cap for feasibility and payment (Q7252)”;
- `src/cards/EX13/EX13-015.test.ts`: “Q7252 raises the leave-prevention deletion maximum from 9000 to 11000”.
