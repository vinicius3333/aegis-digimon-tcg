# BT8 fresh revalidation — 2026-08-25

Scope: the 112 committed catalog cards `BT8-001` through `BT8-112`, in ascending order, from `origin/main` commit `7820f22b8adfd52afc6f96827a4ad4c49d84c6c7`.

## Reproducible evidence

For every card, the audit read its committed catalog record in
`packages/shared/src/cards/data/cards.json`, queried the local knowledge base
with `node tools/kb/query.mjs card <CARD-ID>`, and inspected its direct module
and colocated observable test under `apps/api/src/cards/BT8/`.

Static reconciliation over all 112 IDs established:

- every catalog card has exactly one direct TypeScript module and one colocated test;
- every module registers exactly once through `registerIrCard(<CARD-ID>, compiled)`;
- no BT8 card module registers through legacy `registerCard`;
- every compiled definition declares `coverage: "full"` and `residual: []`;
- every colocated suite contains one or more behavioral cases (273 cases by direct `it(...)` count).

Focused observable proof is run sequentially, one card file at a time, with:

```sh
timeout 120 pnpm --filter @aegis/api exec vitest run \
  src/cards/BT8/<CARD-ID>.test.ts \
  --pool=forks --poolOptions.forks.maxForks=1 --no-file-parallelism
```

The fresh serial run passed every ID from `BT8-001` through `BT8-112`; no
previous merged BT8 audit result was used as evidence. Each successful entry
represents fresh 10/10 proof of the catalog-to-IR mapping, exclusive
registration, and the focused observable contract supplied by that card's
test.

## Result

The BT8-only collection gate, root typecheck, scoped Oxlint/Oxfmt checks, and
`git diff --check` passed. Two fixes were delivered during the revalidation:
BT8-019's test now correctly models a simultaneous delete batch as one trigger
window, and the interpreter now defers a `lastDeleted` target preflight until
its required `deleteOwn` cost establishes the bound (BT8-107).
