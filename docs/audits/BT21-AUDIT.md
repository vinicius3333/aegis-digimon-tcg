# BT21 Card Implementation Audit

Date: 2026-09-01

Status: complete — 102/102 cards verified at 10/10

## Scope and method

The audit reconciled every card from `BT21-001` through `BT21-102` against the committed card catalog, the local rules knowledge base, its direct TypeScript module, colocated behavioral tests, representative peer and stack paths, shared interpreter mechanisms, and the persisted effects catalog.

Three Luna/high agents reviewed non-overlapping ranges under a resource-constrained workflow. Tests were reserved for the coordinator and executed serially with one worker, no file parallelism, and explicit hard timeouts. A final Luna/high challenge review examined the cards whose prior evidence was most dependent on direct timing seams. Findings were promoted only after catalog or KB confirmation and observable regression proof.

The historical range reports under `internal-docs/audits/BT21/` and the prior internal collection ledger are superseded by this report and `docs/audits/BT21-STATIC-AUDIT.md`.

## Result

- Cards audited: 102
- Cards at 10/10: 102
- Unresolved or ambiguous cards: 0
- Registration: 102 direct modules use `registerIrCard(cardId, compiled)`; zero BT21 production modules use `registerCard`
- Coverage: all authoritative modules and persisted records have `coverage: "full"` and an empty residual list
- Persistence: 85 BT21 records differ semantically from `origin/main`; zero semantic changes occur outside BT21
- Exact equality: `BT21-catalog-sync.test.ts` checks the complete 102-key set, module/catalog equality, full coverage, and empty residuals

## Executable corrections and strengthened proof

| Card | Correction or proof | Reproducible boundary |
| --- | --- | --- |
| BT21-013 | Resolve the legitimate printed-versus-alternate evolution-route decision in the public attack test | The attack-triggered evolution settles on AD1-003 and pays the expected cost |
| BT21-021 | Add public Q4530 proof that “1 card” includes an eligible Xros Heart/Hero Tamer | A real attack reaches End of Attack, plays BT21-083, deletes OmniShoutmon, and saves it under the Tamer |
| BT21-076 | Resolve the legitimate printed-versus-alternate evolution-route decision in attack tests | Effect-driven evolution no longer stalls when both routes are legal |
| BT21-093 | Restrict both the host and destination to Reptile/Dragonkin, watch the opponent's security explicitly, and expose the armed bullet as a Main Delay action | A real security attack arms Delay; public activation evolves only the qualifying host and trashes the Option |
| BT21-097 | Require Link-capable material and explicitly choose one of the controller's Digimon as recipient | Q4621 rejects a non-Link card while public End of Turn Delay links the eligible card to the selected Digimon |

BT21-093's public regression exposed two independent representation defects beyond the missing host filter: an `AllTurns` payload was never offered as a player activation, and a security-removal watcher without `sourceFilter.controller: "opponent"` defaulted to the controller's own security. The corrected shape follows the existing armed-Delay convention: `trigger: "Main"`, `requiresDelayArmed: true`, and an explicit opponent watcher.

The audit also repaired a pre-existing type-only gate failure in two state-synchronization tests. Their helpers now accept `Iterable` rather than ordinary array types, which reflects Colyseus `ArraySchema` without changing runtime behavior. Both state-sync suites pass 7/7.

## Persisted catalog

The complete BT21 catalog was regenerated from normalized direct modules while preserving every non-BT21 record. A semantic comparison against `origin/main` reports 85 changed keys, all matching `/^BT21-\d{3}$/`. The new catalog gate prevents future drift across all 102 records rather than checking only three selected cards.

## Reproducible verification

- Full BT21 collection:
  - command: `timeout 300s pnpm --filter @aegis/api exec vitest run src/cards/BT21 --maxWorkers=1 --no-file-parallelism`
  - result: 103 files, 837/837 tests passed in 13.22 seconds
- Shared mechanisms:
  - interpreter, capabilities, subtriggers, security removal, digivolution, Link, Delay, and keyword conformance
  - result: 13 files, 614/614 tests passed in 10.51 seconds
- State synchronization regressions:
  - result: 2 files, 7/7 tests passed in 3.10 seconds
- Serial workspace typecheck:
  - shared build plus shared, API, and web typechecks passed under a 300-second hard limit with workspace concurrency 1
- Repository lint:
  - exited successfully with zero errors and historical warnings under a 180-second hard limit
- Delivery:
  - scoped formatting passed
  - `git diff --check` passed
  - persisted semantic diff is BT21-only
  - final Luna/high review reported no unresolved high-confidence findings

## Remaining queue

None for BT21. The chronological collection campaign continues with BT20.
