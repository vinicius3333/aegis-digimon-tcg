# BT21 Card Implementation Audit

Date: 2026-09-02

Status: complete — 102/102 cards verified at 10/10

## Scope and method

The audit reconciled every card from `BT21-001` through `BT21-102` against the committed card catalog, the local rules knowledge base, its direct TypeScript module, colocated behavioral tests, representative peer and stack paths, shared interpreter mechanisms, and the persisted effects catalog.

Three Luna/high agents reviewed non-overlapping ranges under a resource-constrained workflow. Tests were reserved and executed serially with one fork, no file parallelism, and explicit hard timeouts. The same three auditors challenged the final typed production diff; their Security timing, DigiXros, and missing Security-branch findings were corrected and rechecked. Findings were promoted only after catalog or KB confirmation and observable regression proof.

The historical range reports under `internal-docs/audits/BT21/` and the prior internal collection ledger are superseded by this report and `docs/audits/BT21-STATIC-AUDIT.md`.

## Result

- Cards audited: 102
- Cards at 10/10: 102
- Unresolved or ambiguous cards: 0
- Registration: 102 direct modules use `registerIrCard(cardId, compiled)`; zero BT21 production modules use `registerCard`
- Type safety: all 99 inherited `// @ts-nocheck` directives were removed; zero BT21 production modules retain a TypeScript suppression
- Coverage: all authoritative modules and persisted records have `coverage: "full"` and an empty residual list
- Persistence: the scoped generator reports 86 BT21 records differing semantically from `origin/main`; zero semantic or byte changes occur outside BT21
- Exact equality: `BT21-catalog-sync.test.ts` checks the complete 102-key set, module/catalog equality, full coverage, and empty residuals

## Executable corrections and strengthened proof

| Card                                   | Correction or proof                                                                                                                                       | Reproducible boundary                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| BT21-013                               | Resolve the legitimate printed-versus-alternate evolution-route decision in the public attack test                                                        | The attack-triggered evolution settles on AD1-003 and pays the expected cost                                  |
| BT21-021                               | Add public Q4530 proof that “1 card” includes an eligible Xros Heart/Hero Tamer                                                                           | A real attack reaches End of Attack, plays BT21-083, deletes OmniShoutmon, and saves it under the Tamer       |
| BT21-076                               | Resolve the legitimate printed-versus-alternate evolution-route decision in attack tests                                                                  | Effect-driven evolution no longer stalls when both routes are legal                                           |
| BT21-093                               | Restrict both the host and destination to Reptile/Dragonkin, watch the opponent's security explicitly, and expose the armed bullet as a Main Delay action | A real security attack arms Delay; public activation evolves only the qualifying host and trashes the Option  |
| BT21-097                               | Require Link-capable material and explicitly choose one of the controller's Digimon as recipient                                                          | Q4621 rejects a non-Link card while public End of Turn Delay links the eligible card to the selected Digimon  |
| BT21-019, BT21-029, BT21-030           | Normalize continuous duration, the primary evolution requirement, and the typed DigiXros material shape                                                   | Focused structural assertions and the API typecheck reject the stale shapes                                   |
| BT21-041, BT21-043, BT21-067           | Route end-of-battle Security plays through the real `whenSecurityBattleEnded` event                                                                       | Public security checks play each card only through the deferred runtime path                                  |
| BT21-062, BT21-064, BT21-066           | Preserve free Option use, exact names, Save/Tamer targeting, and a structured one-card DigiXros recipe                                                    | Focused regressions prove the Option-use path, exact matching, mandatory Save, and one-material cap           |
| BT21-076, BT21-079, BT21-088, BT21-089 | Normalize controller, printed-text matching, and explicit IR typing                                                                                       | Focused tests prove both-player scope and Save/Hero targeting while the typecheck remains clean               |
| BT21-097, BT21-099, BT21-100           | Permit legal Link material, make the no-cost evolution/token exclusion explicit, canonicalize effect-deletion watching, and restore Security              | Focused regressions cover legal Link material, no-cost evolution, effect-only deletion, and BT21-100 Security |

BT21-093's public regression exposed two independent representation defects beyond the missing host filter: an `AllTurns` payload was never offered as a player activation, and a security-removal watcher without `sourceFilter.controller: "opponent"` defaulted to the controller's own security. The corrected shape follows the existing armed-Delay convention: `trigger: "Main"`, `requiresDelayArmed: true`, and an explicit opponent watcher.

The audit also repaired a pre-existing type-only gate failure in two state-synchronization tests. Their helpers now accept `Iterable` rather than ordinary array types, which reflects Colyseus `ArraySchema` without changing runtime behavior. Both state-sync suites pass 7/7.

## Persisted catalog

The complete BT21 catalog was regenerated from normalized direct modules with `pnpm effects:sync:set -- --set BT21 --base origin/main`, while preserving every non-BT21 record. The corresponding check command reports 86 changed keys, all matching `/^BT21-\d{3}$/`, and byte-for-byte stability outside BT21. The generated file was never edited manually. The catalog gate prevents future drift across all 102 records rather than checking only three selected cards.

## Reproducible verification

- Full BT21 collection:
  - command: `timeout 300s pnpm exec vitest run src/cards/BT21 --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`
  - result: 103 files, 840/840 tests passed in 15.22 seconds
- Shared mechanisms:
  - interpreter, capabilities, subtriggers, security removal, digivolution, Link, Delay, and keyword conformance
  - result: 17 files, 711/711 tests passed in 10.68 seconds
- State synchronization regressions:
  - result: 2 files, 7/7 tests passed in 3.04 seconds
- Changed-card focused gate:
  - result: 15 files, 107/107 tests passed; each file ran independently under a 60-second hard limit
- API typecheck:
  - result: passed in 19.05 seconds under a 300-second hard limit
- Generated effect snapshot:
  - result: scoped synchronization/check passed for 102 records, and the generator suite passed 13/13 tests
- Repository lint:
  - exited successfully with zero errors and historical warnings under a 180-second hard limit
- Delivery:
  - scoped formatting passed
  - `git diff --check` passed
  - persisted semantic diff is BT21-only
  - final Luna/high review reported no unresolved high-confidence findings

## Remaining queue

None for BT21. The chronological collection campaign continues with BT20.
