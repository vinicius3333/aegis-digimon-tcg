# BT20 Final Card Audit

Status: complete on 2026-09-01

## Outcome

The complete BT20 collection, `BT20-001` through `BT20-102`, is verified at 10/10.

- 102/102 direct production modules have `coverage: "full"` and empty residual coverage.
- 102/102 modules register through exactly one `registerIrCard(cardId, compiled)` call.
- No BT20 production module calls `registerCard`.
- All 102 persisted `effects.json` records are deeply equal to their authoritative direct modules.
- The detailed five-dimension, card-by-card evidence is preserved in `apps/api/src/cards/BT20/AUDIT.md`.

## Corrected defects

The final pass corrected source and event scope, target identity, cost semantics, zones, exact-name matching, and one shared security-placement primitive.

- `BT20-005`, `BT20-032`, and `BT20-034`: inherited watchers now follow only their own host/event source.
- `BT20-019`: opponent-effect immunity uses the canonical supported grant.
- `BT20-025`: Slayerdramon name treatment is limited to the battle area.
- `BT20-034` and `BT20-035`: Tamer-placement watchers bind the receiving Digimon and the newly added Tamer correctly.
- `BT20-040`: the reduced alternate evolution remains a player choice.
- `BT20-056`: the security-removal watcher observes either player's removal event as printed.
- `BT20-084`: `placeAsSecurity` with `fromDigivolutionTop` moves the top digivolution card, keeps the host in play, and does not detach the host's top card.
- `BT20-085`: the return cost goes to deck bottom and aborts the effect when declined.
- `BT20-087`: the reduced evolution still pays its reduced cost.
- `BT20-089`: Mind Link observes only the controller's Digimon; inherited keyword targeting is self-referential; Eiji Nagasumi matching is exact.
- `BT20-091`: the Royal Knight replacement is restricted to the battle area.
- `BT20-092`: the placement cost selects a hand card and places it under the chosen Tamer host.
- `BT20-093`, `BT20-094`, and `BT20-097`: Delay and security-removal watchers have the correct battle-area and player direction.
- `BT20-100`: Omnimon leave prevention is restricted to the controller's own battle area.

The audit retained BT20-098's exact total of 9 levels. The committed 2025-03-07 errata removes “up to,” and Q4439 explicitly rejects partial totals.

## Reproducible gates

Every test command used one worker, disabled file parallelism, and had an explicit timeout.

- BT20 collection: 103 files passed; 564 tests passed.
- Affected mechanism suites: 22 files passed; 916 tests passed.
- Persisted catalog contract: 104 tests passed, covering all 102 cards plus collection and registration invariants.
- Shared package build: passed.
- Serial workspace typecheck for shared, API, and web: passed.
- Global Oxlint: exited successfully; existing repository warnings remain non-blocking.
- Scoped Oxfmt check: 56 changed TypeScript files passed.
- `git diff --check`: passed.

## Catalog safety

The synchronization replaced only top-level BT20 records. A semantic comparison against `origin/main` found 80 changed BT20 records and zero changed records outside BT20. The temporary migration test was removed after the one-time update; the permanent catalog-sync test is read-only.

## Historical reports

`docs/audits/BT20-STATIC-AUDIT.md` and the range reports under `internal-docs/audits/BT20/` preserve the pre-execution static review. Their provisional scores and stale-snapshot notes are historical and are superseded by this report and the detailed final ledger.
