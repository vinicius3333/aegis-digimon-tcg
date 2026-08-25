# BT10 Card Implementation Audit

This ledger records evidence gathered independently in ascending card ID order. A card is marked 10/10 only when its complete catalog and local knowledge-base contract maps to executable compiled IR, all directly used shared semantics have been traced, and focused observable-state tests prove the applicable boundaries.

## BT10-001 — DemiMeramon — 10/10

- Catalog evidence: red level 2 Digi-Egg; form `In-Training`, type `Flame`; inherited text is `[Your Turn] While a non-red card is in this Digimon's digivolution cards, this Digimon gets +1000 DP`; it has no main or Security effect and no evolution requirements.
- Knowledge base: Q1929 says a red multicolor source is still red and therefore does not satisfy “non-red”; no errata, restriction, or unresolved ambiguity was returned by `node tools/kb/query.mjs card BT10-001`.
- Implementation: one inherited `YourTurn` aura targets its own host, adds exactly 1000 DP, and is gated by `selfDigivolutionStackHasNonColor` for red. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT10-001", compiled)`.
- Primitive trace: the continuous-effect collector applies inherited effects from stack cards to the live host and scopes `YourTurn` to the source controller; the condition reads only that host's digivolution stack and succeeds only when a source lacks every requested color. Consequently a pure blue source matches, while a red/other-color source fails exactly as Q1929 requires.
- Cross-card and stack proof: the focused fixtures use DemiMeramon underneath realistic BT10 hosts, compare a blue source with both pure-red and red-multicolor sources, and confirm the inherited effect is absent during the opponent's turn. No peer uses this card-specific condition kind, so its direct interpreter branch and the Q1929 multicolor case are the relevant mechanism boundary.
- Behavioral proof: the focused suite proves the positive +1000 DP path, the Q1929 red-multicolor negative, the all-red negative, and turn ownership through observable `currentDP` versus `baseDP` assertions.
- Verification: focused suite — 3 passed; workspace typecheck — pending collection gate; `git diff --check` — passed.
