# BT9 Card Implementation Audit

This ledger is built strictly in ascending card-ID order. A card receives 10/10 only after its complete catalog contract and local knowledge-base record are inspected, every clause is traced through its direct compiled-IR module and relevant shared primitives, observable focused tests cover the applicable positive and negative boundaries, and the recorded verification commands pass.

## BT9-001 — Koromon — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red level-2 Digi-Egg, `In-Training` form, `Lesser` type, no evolution recipe, no main or Security text, and a four-copy limit were checked in `packages/shared/src/cards/data/cards.json`.
2. **Printed inherited timing (1/1):** `[Your Turn]` is encoded as an inherited `YourTurn` continuous effect, so the grant is absent during the opponent's turn.
3. **Agumon name branch (1/1):** `selfHasNameContaining` includes `Agumon`; a Koromon-under-Agumon X stack receives exactly +1000 DP.
4. **Greymon name branch (1/1):** The same OR condition includes `Greymon`; a Koromon-under-Greymon stack receives exactly +1000 DP.
5. **Negative name boundary (1/1):** A Koromon-under-Elecmon peer remains at printed DP, proving the aura is not an unconditional inherited modifier.
6. **Amount and recipient (1/1):** `Aura` targets `isSelfRef` and applies `modifyDP: 1000` only to the live carrier, with no other friendly permanent modified.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT9-001` returns no rulings, errata, restrictions, or unresolved ambiguity.
8. **Direct IR and registration (1/1):** `apps/api/src/cards/BT9/BT9-001.ts` has `coverage: "full"`, an empty residual list, and exactly one executable registration: `registerIrCard("BT9-001", compiled)`; it contains no `registerCard` call.
9. **Primitive and stack trace (1/1):** `runStaticAction` re-evaluates the aura continuously; `selfHasNameContaining` checks the carrier's live top-card English name with case-insensitive OR semantics; focused tests exercise realistic Koromon evolution stacks across both turn owners.
10. **Reproducible verification (1/1):** Focused proof passed 3/3, the `LANE-F-14` shared name-condition regression passed 4/4, workspace typecheck passed, and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-001
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-001.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-001.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/engine/effects/capabilities.test.ts -t 'LANE-F-14' --reporter=dot
pnpm typecheck
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-001.
