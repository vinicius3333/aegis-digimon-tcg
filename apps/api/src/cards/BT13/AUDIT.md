# BT13 Audit Completion

Final status: **112/112 cards verified at reproducible 10/10** and typed again on 2026-09-02.

The authoritative detailed ledger is `docs/audits/BT13-AUDIT.md`. It records the catalog and rules trace, direct IR registration, card-local behavioral evidence, typed revalidation corrections, and bounded delivery gates.

## Typed revalidation

- Removed 111 `@ts-nocheck` directives; BT13-008 was already typed. Production modules and focused tests now contain no TypeScript suppression directives or unsafe `as any`/`as unknown`/`as never` casts.
- BT13-008 now selects one Marcus Damon once and reuses that exact permanent for the kind, base-DP, and digivolution-restriction bundle.
- Corrected typed IR details for BT13-012, BT13-019, BT13-044, BT13-048, BT13-049, BT13-061, BT13-064, BT13-076, BT13-085, BT13-086, BT13-088, BT13-098, BT13-107, BT13-110, and BT13-111.
- Typed BT13-074's shared filter and BT13-112's modal action without changing their behavior. BT13-080 deliberately retains both `Digimon` and `DigiEgg` kinds for its level-2 breeding-area target under the field-card rules.
- Narrowed the shared dynamic play-cost modifier contract and made unsupported dynamic variants fail safely before arithmetic or payment. BT12-083 now narrows the numeric branch explicitly.
- Replaced private test reach-throughs with typed public test seams and discriminant narrowing.

## Persistence contract

`effects.json` is generated, never manually edited, for this scope with:

```text
pnpm effects:sync:set -- --set BT13 --base origin/main
pnpm effects:check:set -- --set BT13 --base origin/main
```

The final hardened check reported 94 semantic BT13 changes, zero semantic or byte changes outside BT13, and all 112 records already synchronized. The catalog contract passed 115 tests.

## Delivery gates

- Changed/evidence suites: 31 files, 195 tests.
- Full collection: 113 files, 729 tests.
- Mechanism suites: 9 files, 774 tests.
- Shared package: 8 files, 133 tests.
- State synchronization: 6 files, 49 tests.
- Synchronizer and tool tests: 10 tests.
- Web effect projection: 4 files, 131 tests.
- Shared, API, and web typechecks passed serially.
- Oxfmt and Oxlint passed for the changed source, tests, and docs.
- The generated JSON semantic/byte scope check and `git diff --check` passed.

Every BT13 production module uses one matching `registerIrCard` registration and no legacy `registerCard` registration. All 112 persisted records have `coverage: "full"` and an empty residual list.
