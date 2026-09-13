# Non-preventing replacement costs

## Status

Bounded correction at baseline `b88aeb69f22995641622ab4388086ff771b23dc0`, 2026-09-13. Public EX6-054/073 focus passes 17 tests, independently confirmed in the third coordinator collection checkpoint. Broad mechanism, final typecheck and delivery gates remain pending.

## Contract and implementation

EX6-054 Lucemon: Chaos Mode's printed leave reaction offers a paid play of exact Lucemon: Satan Mode. It does not say to prevent the original departure. Its IR explicitly uses the non-preventing `instead` mode, overriding the interpreter's cost-bearing default of prevention. The local EX6 ledger owns the catalog/ruling judgment.

The interpreter's `instead` branch formerly executed nested payloads without checking or paying the outer cost. It now checks payment availability before offering the optional effect and pays after acceptance, before executing nested actions. Unavailable/refused payment performs no payload and does not prevent the original leave event.

The generic combined-zone return-cost branch formerly routed non-top returns to the Digi-Egg deck even when the authored destination was regular `deckBottom`. An explicit regular deck-bottom destination now calls `returnToDeck` with `toTop:false`; existing top and implicit legacy egg-deck routes are preserved. The demonstrated consumer pays exact Lucemon from trash or its hosted digivolution cards.

## Reproducible proof

With only explicit mode correction, the focused EX6-054/073 run had 14 passed / 3 failed: Satan Mode could play without a valid Lucemon, and a selected hosted Lucemon did not reach the regular deck bottom. The original Chaos Mode departure proceeded. The cost handling and explicit combined-zone destination correction make all 17 pass.

EX6-054 public deletion cases prove payment, optional refusal and rejection of a non-exact Lucemon name. They inspect the original Chaos Mode trash identity, Satan Mode field/trash identities and exact paid Lucemon deck-bottom identity.

EX6-073 Q6040 proves the full real attack continuation through competing leave reactions: Chaos Mode leaves, Creepymon is played and mills, Ogudomon loses its sources, and six security cards are trashed. The test checks physical zones and settled decisions.

```sh
TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-054.test.ts src/cards/EX6/EX6-073.test.ts --maxWorkers=1 --no-file-parallelism
```

Result: **17 tests passed**. The collection checkpoint also passes both suites. Top/egg destination preservation has not yet received a complete consumer matrix.

## Baseline control outside this seam

The pristine baseline BT14-090 Option acceptance control initially reproduced **17 passed / 1 failed**, and a stronger wait still observed no paid materials. The separate ordered loose compound placement branch rejected string `host:"target"` despite the existing `underFilter` contract. Its narrow host-resolution correction now passes the 7-file / 71-test focus, including BT14-090, BT25-096 object-host control and the affected EX6 consumers. The first coordinator broad checkpoint independently confirms all included engine and cross-set controls green. Details belong to [activation-costs.md](activation-costs.md#ordered-loose-placement-host-checkpoint-2026-09-13). Closing gates and delivery remain pending; no wait-only diagnosis is claimed.
