# ST12 audit ledger

Scope: all 16 committed ST12 catalog cards, audited in ascending catalog order
against the complete card contract and local rules knowledge base, then traced
through direct compiled IR, focused production-harness tests, and applicable
peer/evolution-stack behavior. Each row records five independently verified
2/2 components and a 10/10 total.

Overall completion: **16/16 cards (100%) at 10/10**.

| Card    | Exact catalog name          | Contract | KB/rules | Direct IR | Focused proof | Peer/stack integration |     Total | Evidence                                                                                                                                                                                                                                                          |
| ------- | --------------------------- | -------: | -------: | --------: | ------------: | ---------------------: | --------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ST12-01 | Gurimon                     |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-01.ts) · [test](../../apps/api/src/cards/ST12/ST12-01.test.ts); Q&A: Q750–Q751; inherited DP threshold, count boundary, and evolution-stack proof passed.                                                             |
| ST12-02 | Candlemon                   |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-02.ts) · [test](../../apps/api/src/cards/ST12/ST12-02.test.ts); no KB entry; explicit empty IR, printed play, and evolution proof passed.                                                                             |
| ST12-03 | Solarmon                    |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-03.ts) · [test](../../apps/api/src/cards/ST12/ST12-03.test.ts); Q&A: Q752–Q755, Q4295, Q6732, Q6756, Q6802, Q6806, Q6811, Q6827, Q6967, Q6984, Q7167; both-player, free-play, and green-Tamer cost boundaries passed. |
| ST12-04 | Huckmon                     |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-04.ts) · [test](../../apps/api/src/cards/ST12/ST12-04.test.ts); Q&A: Q756; Sistermon filters, simultaneous-play event, once-per-turn boundary, and inherited DP proof passed.                                         |
| ST12-05 | Meramon                     |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-05.ts) · [test](../../apps/api/src/cards/ST12/ST12-05.test.ts); no KB entry; explicit empty IR, printed play, and evolution proof passed.                                                                             |
| ST12-06 | BaoHuckmon                  |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-06.ts) · [test](../../apps/api/src/cards/ST12/ST12-06.test.ts); no KB entry; inherited Huckmon-name and Royal Knight trait boundaries passed.                                                                         |
| ST12-07 | SkullMeramon                |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-07.ts) · [test](../../apps/api/src/cards/ST12/ST12-07.test.ts); no KB entry; explicit empty IR, printed play, and evolution proof passed.                                                                             |
| ST12-08 | SaviorHuckmon               |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-08.ts) · [test](../../apps/api/src/cards/ST12/ST12-08.test.ts); no KB entry; turn-scoped unsuspended attack, hand/trash Sistermon play, Royal Knight condition, optional refusal, and once-per-turn proof passed.     |
| ST12-09 | Volcanomon                  |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-09.ts) · [test](../../apps/api/src/cards/ST12/ST12-09.test.ts); no KB entry; actual Blocker redirection and two-check inherited Security Attack combat proof passed.                                                  |
| ST12-10 | Jesmon                      |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-10.ts) · [test](../../apps/api/src/cards/ST12/ST12-10.test.ts); Q&A: Q757; Blitz, attack-time Sistermon play, effect-only bonus gate, same-attack bonus, and second effect-play once-per-turn cap passed.             |
| ST12-11 | Gankoomon                   |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-11.ts) · [test](../../apps/api/src/cards/ST12/ST12-11.test.ts); no KB entry; optional trash play, target filtering, De-Digivolve, evolution stack, and second effect-play once-per-turn cap passed.                   |
| ST12-12 | Sistermon Blanc             |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-12.ts) · [test](../../apps/api/src/cards/ST12/ST12-12.test.ts); Q&A: Q758; optional hand-trash Draw 2 and actual opponent-effect Decoy Red/Black replacement with a blue negative passed.                             |
| ST12-13 | Sistermon Ciel              |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-13.ts) · [test](../../apps/api/src/cards/ST12/ST12-13.test.ts); Q&A: Q759–Q760, Q5224; Sistermon Noir/Virus rule identity, Reboot, and reveal proof passed.                                                           |
| ST12-14 | Aus Generics                |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-14.ts) · [test](../../apps/api/src/cards/ST12/ST12-14.test.ts); Q&A: Q761; independent DP/Piercing targets, conditional memory, and Security proof passed.                                                            |
| ST12-15 | From Master to Disciple     |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-15.ts) · [test](../../apps/api/src/cards/ST12/ST12-15.test.ts); Q&A: Q762–Q763; no-hit placement, Security, one-shot Delay, manual evolution, and effect-driven evolution proof passed.                               |
| ST12-16 | Quake! Blast! Fire! Father! |      2/2 |      2/2 |       2/2 |           2/2 |                    2/2 | **10/10** | [module](../../apps/api/src/cards/ST12/ST12-16.ts) · [test](../../apps/api/src/cards/ST12/ST12-16.test.ts); no KB entry; color waiver, play-cost threshold, deletion boundary, and Security proof passed.                                                         |

## Verification commands

- Per-card catalog contract and rules evidence: `node tools/kb/query.mjs card <CARD-ID>` for all 16 ST12 cards; applicable comprehensive rules, Q&A, errata, restrictions, and trait/evolution boundaries reviewed.
- Focused cards, mixed deck, and collection gate: `pnpm --filter @aegis/api exec vitest run --pool=threads --poolOptions.threads.singleThread=true src/cards/ST12` — 18 files / 87 tests passed.
- Shared collection contract and affected production mechanisms: `pnpm --filter @aegis/api exec vitest run --pool=threads --poolOptions.threads.singleThread=true src/cards/ST12 src/cards/remaining-collections.audit.test.ts src/engine/combat/advancedKeywords.test.ts src/engine/conformance/ch11-attacking.test.ts src/engine/conformance/ch12-blocking.test.ts src/engine/conformance/ch16a-security-blocker-draw.test.ts src/engine/subTriggerSeams.test.ts src/engine/effects/primitives.test.ts` — 25 files / 322 tests passed.
- Workspace typecheck: `pnpm typecheck` — passed for shared, API, and web workspaces.
- Changed-file lint and formatting: `pnpm exec oxlint <changed TypeScript files>` and `pnpm exec oxfmt --check <changed files>` — passed with no warnings and no format drift.
- Diff validation: `git diff --check` — passed.

## Collection invariants

Every ST12 catalog card has a direct module, colocated focused test, ST12 index
import, exactly one exclusive `registerIrCard` registration, `coverage: "full"`,
and `residual: []`; no legacy `registerCard` registration or `RawUnparsed`
runtime clause remains. ST12-02, ST12-05, and ST12-07 explicitly register
empty IR because their catalog text has no behavioral effect. Applicable Q&A,
errata, restriction, trait-peer, and evolution-stack boundaries are represented
by the focused suites and the Jesmon mixed-deck regression proof.
