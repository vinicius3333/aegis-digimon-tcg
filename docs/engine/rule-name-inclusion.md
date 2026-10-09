# Rule name inclusion versus exact identity

## Contract

A `(Rule)` clause saying that a card's name also contains a bracketed name contributes an inclusion alias. Filters asking whether the card's name includes that token may use the alias, but the alias does not replace or add an exact effective card identity.

The continuous ledger retains two views of name grants:

- inclusion grants, including aliases with `ruleDerived` provenance;
- exact effective names, which exclude `ruleDerived` inclusion aliases.

An original-card-information rewrite still replaces the printed identity and suppresses Rule-derived aliases, preserving the Q7295 provenance behavior. Names granted by ordinary effects remain exact effective aliases unless their own provenance marks them as Rule-derived.

## Q7377 regression

Thundermon EX13-053 has a Rule alias stating that its name includes Mamemon. It therefore receives effects targeting cards with Mamemon in their names, while its exact effective identity remains Thundermon rather than Mamemon.

Covered by `engine/effects/continuous.test.ts` and the focused EX13-053 Q7377 test.
