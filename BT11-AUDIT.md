# BT11 Card Implementation Audit

This ledger records evidence gathered independently in ascending card ID order. A card is marked 10/10 only when its exact committed catalog and local knowledge-base evidence map completely to compiled IR, shared behavior has been traced, and focused observable-state tests prove every applicable contract boundary.

## BT11-001 — Yokomon — 10/10

- Catalog evidence: Red level 2 Digi-Egg; form `In-Training`, type `Bulb`; inherited text is `[On Deletion] If you have a red Tamer in play, <Draw 1>`; no main text, Security text, evolution requirements, attribute, or frequency clause.
- Knowledge base: `node tools/kb/query.mjs card BT11-001` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT11-001.ts` contains one inherited `OnDeletion` effect whose `Draw 1` is gated by `youHave` an exact controller-owned red Tamer in the battle area. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT11-001", compiled)`.
- Primitive trace: deletion snapshots the complete deleted stack and collects inherited `OnDeletion` effects from their stack-card source identities; the inherited placement guard rejects top-card or breeding-only use; `youHave` evaluates live controller-owned battle-area definitions and color; `Draw` moves exactly one top-deck card to that effect controller's hand.
- Behavioral proof: the focused suite checks the exact catalog and complete IR, deletes a realistic Yokomon evolution stack while a friendly red Tamer remains and observes exactly one draw, and proves an opposing red Tamer does not satisfy the controller-qualified condition.
- Verification: focused suite — 3 passed; inherited Digi-Egg and deletion-subtrigger mechanism regressions — 9 passed; workspace typecheck — passed; `git diff --check` — passed.

## BT11-002 — Wanyamon — 10/10

- Catalog evidence: Blue level 2 Digi-Egg; form `In-Training`, type `Lesser`; inherited text is `[When Attacking][Once Per Turn] If you have a blue Tamer in play, <Draw 1>`; no main text, Security text, evolution requirements, attribute, or other effect.
- Knowledge base: `node tools/kb/query.mjs card BT11-002` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT11-002.ts` contains one inherited, once-per-turn `WhenAttacking` effect whose `Draw 1` is gated by `youHave` an exact controller-owned blue Tamer in the battle area. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT11-002", compiled)`.
- Primitive trace: attack declaration fires the inherited timing from Wanyamon's stack-card source; registration converts `frequency: "OncePerTurn"` to a source-instance-scoped `maxPerTurn: 1`; `youHave` forces controller ownership while matching the live Tamer kind and blue color; `Draw` moves exactly one top-deck card to the effect controller's hand.
- Behavioral proof: the focused suite checks the exact catalog and complete IR, draws from a realistic Wanyamon evolution stack with a friendly blue Tamer, proves a second attack by the same source in the turn does not draw again, and proves an opposing blue Tamer does not satisfy the condition.
- Verification: focused suite — 3 passed; inherited collection and once-per-turn kernel mechanism regressions — 28 passed; workspace typecheck — passed; `git diff --check` — passed.
