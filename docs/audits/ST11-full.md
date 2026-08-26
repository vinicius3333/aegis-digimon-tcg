# ST11 Special Entry Pack collection audit

Date: 2026-08-26

Scope: the ST11 Special Entry Pack product. It is not a starter-deck set with
`ST11-*` card IDs: the committed `cardPool.ts` promo-product entry labels the
product and maps it to `P-065`, so this one-card collection is audited in
catalog order.

## Inventory result

| Source | Result |
| --- | --- |
| `packages/shared/src/cards/cardPool.ts` | Authoritative labeled ST11 entry: `2022-10-14`, `cardIds: "065"`; `promoProductCardIds()` derives `P-065` |
| `packages/shared/src/cards/data/cards.json` | `P-065` Gammamon, Red Lv.3, 2000 DP |
| `apps/api/src/cards/P/P-065.ts` | Direct compiled-IR module, exclusively `registerIrCard("P-065", compiled)` |
| `packages/shared/src/effects/effects.json` | Matching full compiled IR with no residual behavior |
| `node tools/kb/query.mjs card P-065` | No KB entry; catalog text is the local printed contract |
| `apps/api/src/cards/P/ST11.collection.test.ts` | Reproducible derived-product inventory and per-derived-ID IR-registration gate |

## Per-card ledger

The derived inventory is exactly `P-065`; it is the complete ST11 product
inventory and receives 10/10. The direct module and generated effects record
agree: both clauses delete exactly one
opponent Digimon at 2000 DP or less, respectively on play and as an inherited
when-attacking effect.

| Card | Catalog | KB | Direct module | Compiled IR | Behavioral evidence | Score |
| --- | --- | --- | --- | --- | --- | --- |
| P-065 | present; all printed fields checked | no local ruling | exclusive `registerIrCard` | full/no residual | `P-065.test.ts`: on-play boundary plus inherited attack boundary and negative 3000-DP target | 10/10 |

## Verification commands

- Focused card proof: `pnpm --filter @aegis/api exec vitest run src/cards/P/P-065.test.ts --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`.
- Exact serial collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/P/ST11.collection.test.ts --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`.
- Typecheck, inventory verification, and `git diff --check` are recorded with
  their actual outcomes in the delivery report.

## Conclusion

There is no unresolved printed clause or unsupported engine behavior for this
one-card product. The collection gate derives its inventory from the labeled
authoritative promo-product mapping, asserts the exact ID list, then applies
the compiled-IR and `registerIrCard` checks to every derived ID.
