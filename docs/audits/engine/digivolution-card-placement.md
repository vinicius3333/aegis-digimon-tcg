# Digivolution card placement audit

## Status

Bounded identity correction at baseline `0f8db98d0`, 2026-09-12. Source cards shed during permanent relocation must not be announced as cards added under the destination. Public Bagramon play/evolution witnesses the single relocation path; recording-port subsystem cases cover single and batch paths, with source-preserving controls. Complete placement, event and inherited-information certification remains open.

## Contract and sources

Reviewed full local comprehensive manual v4.2 (2026-08-18), §4-7-7 distinguishes the removed field permanent from its new stacked-card position; §4-7-8 requires its own sources to be trashed simultaneously. Full local Bagramon Q2113 explicitly confirms this same source-shedding rule. The committed card text places its top card as another opponent Digimon's bottom source. [Official manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf); the Bagramon card-page request failed and no fresh page verification is claimed.

Reviewed raw-content SHA-256 pins:

- `comprehensive-0292`: `703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855`.
- `comprehensive-0293`: `1220b7f0fc0cb6ccc76d4ad371d1f788922a265df857413971108e64da24bc0f`.

The internal event name is an engine interface, not printed text. Its identity list must describe the cards actually added so downstream card filters can apply printed placement conditions to the correct objects. This checkpoint does not claim a real downstream card already misfired; the demonstrated failure is the incorrect production event payload itself.

## Implementation trace

`effects/primitives.ts` already separates moved top cards from cards shed to their owners' trash when `shedOwnCards:true`. Its `relocatePermanentByEffect` and `relocatePermanentsByEffect` wrappers previously captured every source/linked card in `addedDigivolutionCardInstanceIds`, including the shed cards. Both wrappers now derive that identity list using the same source-shedding policy: top card only when shed, complete physical source group when preserved. Event subject and effect-seat provenance are unchanged. No card IR, catalog or persisted effect record changes.

`testkit/observe.ts` adds a named scoped observer for actual production SubTrigger dispatch. It copies the added-identity list, calls the original bus with the original payload and engine receiver, and restores the original dispatcher in `finally`. It injects no card, event, decision or outcome. Bagramon's four existing public placement/evolution cases now assert exactly one addition event, the actual destination, exactly the moved top-card identity and effect seat 0, alongside their previously established final physical zones and costs.

## Obligation ledger

| Obligation                                                             | Source                                       | Public action and observable result                                                                                                                | Proof                                                                     | Consumers                                                             | Status                                            |
| ---------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| Shed sources are excluded from individual relocation addition identity | §4-7-8, Q2113                                | Bagramon played/evolved over a real black level-5; stacked Tankmon moves under another opponent BigMamemon, its Gotsumon source goes only to trash | BT11-088 public bottom placement tests, scoped production bus observation | BT11-088 both entry timings                                           | verified, demonstrated shape                      |
| Unstacked relocation still announces its top card                      | same placement contract                      | Same play/evolution sequence with unstacked Tankmon; exact event and zones retained                                                                | Same two public controls                                                  | BT11-088 both entry timings                                           | verified, demonstrated shape                      |
| Batch shedding uses only added identities                              | §4-7-8                                       | Recording-port single/batch subsystem directly invokes the primitive with stack and linked attachments                                             | primitives.test.ts, explicitly supplemental                               | Generic batch port; legal real batch producer remains unexecuted here | queued for public certification; adapter verified |
| Source-preserving relocation keeps every added identity                | source-preserving authored relocation policy | Recording-port preservation controls include stack and link identities; exact physical stack/trash retained                                        | Same supplemental matrix                                                  | Other source-preserving modules not exhaustively audited              | queued for public certification; adapter verified |
| Correct position, atomicity and timing under competing departures      | Full placement/replacement inventory pending | More legal producers and refusals required                                                                                                         | Not supplied by current witness                                           | All shared consumers                                                  | queued                                            |

## Consumer coverage and baseline

The public producer is BT11-088 only, On Play and When Digivolving; its earlier two authored-parameter correction is owned by [BT11.md](../BT11.md#bt11-088--bagramon). It remains capped provisionally below ten. The single/batch supplemental matrix uses a recording PrimitivesEngine port and deliberately isolates stack/link identity arithmetic; it is not a legal linked-card gameplay certificate.

Valid unchanged baseline: card/primitives focus **4 failed, 163 passed**. Two public stacked-source events and two supplemental shedding cases include trashed identities; unstacked and source-preserving controls pass. Corrected focus with Succession and seam guard: **4 files, 191 tests passed**.

## Gates

- `pnpm --filter @aegis/api exec vitest run`: final **5112 files, 42367 tests passed**, zero expected failures, **55.17 seconds**. Earlier green 53.20-second run precedes conditional-assertion lint cleanup and is superseded by the final gate.
- `pnpm typecheck`: final shared/API/web passed.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT11/BT11-088.test.ts src/engine/effects/primitives.test.ts src/engine/conformance/keyword-succession-lifecycle.test.ts src/engine/testkit/testkitSeam.guard.test.ts`: 4 files/191 tests passed with pinned citations. Final restored focus additionally includes `src/cards/audit-docs.test.ts` **5 files/195 tests passed**, 2.53 seconds.
- Scoped Oxlint on all four changed TypeScript files: no warnings after replacing conditional `expect` branches with one unconditional result assertion. Changed-file Oxfmt on all seven files passed.
- `pnpm audit:index --check`: current 66-set index. Layout: one file/four tests passed. `git diff --check`: clean. Independent read-only review found no blocker in this bounded correction.
- Final typed-fixture counterfactuals: disabling only the individual identity policy fails 3/167 with 164 controls green; disabling only the batch policy fails 1/167 with 166 controls green. The original engine bytes are restored in `finally`; the restored five-file focus passes as recorded above.
- No effects synchronization is needed: no authored card parameters or serialized IR changed.

## Open items

Public batch and linked-source producers, replacement/departure ordering and failure, actual downstream triggered payloads, ownership exchange, departed source snapshots, ordered multi-source placement, position metadata and live continuous recalculation remain open. In particular, current wrappers do not supply placement position, and other placeUnder paths require an independent position audit; no position/event-timing certificate is implied by correct added identities. All normative exceptions and consumer parameter shapes must still be inventoried.

## History

- `0f8db98d0`: Bagramon bottom/source-shedding parameters corrected; generic event identity was explicitly left open.
- Current checkpoint: public production bus observations expose that identity gap and both wrappers are corrected without changing registration or serialized IR.
