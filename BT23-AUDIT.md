# BT23 Card Implementation Audit

This ledger records the evidence gathered in ascending card ID order. A card is marked 10/10 only when its catalog text and local knowledge-base evidence map completely to compiled IR, the shared primitives have been traced, and focused observable-state tests cover every applicable contract boundary.

## BT23-001 — Flickmon — 10/10

- Catalog evidence: Blue level 2 Digi-Egg; form `Appmon`, attribute `Game`, type `Flick`; inherited text is `[When Attacking] [Once Per Turn] If this Digimon has the [Appmon] trait, <Draw 1>`; no main or Security text and no evolution requirements.
- Knowledge base: `node tools/kb/query.mjs card BT23-001` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT23-001.ts` contains one inherited `WhenAttacking`, `OncePerTurn` effect. Its conditional `Draw 1` uses `selfHasTrait(Appmon)` and the module registers exclusively through `registerIrCard("BT23-001", compiled)` with full coverage and no residual clauses.
- Primitive trace: interpreter registration maps `frequency: "OncePerTurn"` to `maxPerTurn: 1` while preserving inherited source identity; `selfHasTrait` checks the live host top card only and `matchNameOrTrait` treats forms, attributes, and types as the complete trait union; `Draw` moves exactly one top-deck card to the effect controller's hand.
- Behavioral proof: the focused suite checks the exact catalog and IR contract, draws for a realistic Flickmon-under-Appmon stack, refuses the draw for a non-Appmon carrier, suppresses a second attack in the same turn, and permits two distinct Flickmon sources to draw independently.
- Verification: focused suite — 4 passed; `condition.selfHasTrait` mechanism regression — 3 passed; workspace typecheck — passed; `git diff --check` — passed.

## Remaining queue

BT23-002 through BT23-102.
