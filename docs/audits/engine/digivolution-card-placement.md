# Digivolution card placement audit

## Status

Next bounded deck-top payment correction at baseline `63f441978`: the shared cost primitive physically inserts the deck card on the bottom, but reports top. Public attacks by all three identified EX9 consumers expose this metadata gap, with refusal and empty-deck controls. The event now reports bottom; this is not a complete Training, paid-cost, card or collection certificate. Historical EX9 complete credit is reopened and the three consumers capped provisionally below ten.

Latest bounded position correction at baseline `fe7dcf218`: loose-card placement reported top/bottom backwards and individual/batch permanent relocation omitted the position. Event metadata now agrees with the physical insertion: `pushOnStack` is directly below the top card and `unshiftOnStack` is the bottom. Public Bagramon and Giromon events prove seven bottom-placement sequences; top/bottom/default arithmetic is supplemented by recording-port cases. Full placement/timing and downstream card certificates remain open.

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

## Earlier identity delivery gates

- `pnpm --filter @aegis/api exec vitest run`: final **5112 files, 42367 tests passed**, zero expected failures, **55.17 seconds**. Earlier green 53.20-second run precedes conditional-assertion lint cleanup and is superseded by the final gate.
- `pnpm typecheck`: final shared/API/web passed.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT11/BT11-088.test.ts src/engine/effects/primitives.test.ts src/engine/conformance/keyword-succession-lifecycle.test.ts src/engine/testkit/testkitSeam.guard.test.ts`: 4 files/191 tests passed with pinned citations. Final restored focus additionally includes `src/cards/audit-docs.test.ts` **5 files/195 tests passed**, 2.53 seconds.
- Scoped Oxlint on all four changed TypeScript files: no warnings after replacing conditional `expect` branches with one unconditional result assertion. Changed-file Oxfmt on all seven files passed.
- `pnpm audit:index --check`: current 66-set index. Layout: one file/four tests passed. `git diff --check`: clean. Independent read-only review found no blocker in this bounded correction.
- Final typed-fixture counterfactuals: disabling only the individual identity policy fails 3/167 with 164 controls green; disabling only the batch policy fails 1/167 with 166 controls green. The original engine bytes are restored in `finally`; the restored five-file focus passes as recorded above.
- No effects synchronization is needed: no authored card parameters or serialized IR changed.

## Open items

Public batch and linked-source producers, replacement/departure ordering and failure, actual downstream triggered payloads, ownership exchange, departed source snapshots, ordered multi-source placement and live continuous recalculation remain open. The next position checkpoint below supplies individual/batch metadata and aligns loose-card metadata; other producer shapes and event-timing certificates still require independent proof. All normative exceptions and consumer parameter shapes must still be inventoried.

## History

- `0f8db98d0`: Bagramon bottom/source-shedding parameters corrected; generic event identity was explicitly left open.
- Current checkpoint: public production bus observations expose that identity gap and both wrappers are corrected without changing registration or serialized IR.

## Position checkpoint: contract and implementation

The existing reviewed §4-7 stack contract preserves relative order; the committed Bagramon/Giromon text explicitly places the selected card on the bottom. The named physical insertion functions and primitive defaults determine the public engine port's position semantics. Loose placement defaults to bottom (`belowTop` false/undefined), while permanent relocation defaults to directly below the top (`belowTop` true/undefined). No card's authored position or the physical movement itself changes; the event description now matches it. `placeUnder` reports true→top, false/undefined→bottom. Both relocation wrappers report false→bottom, true/undefined→top. This repairs the shared event interface without adding another card registration or serialized IR field.

### Position obligation ledger

| Obligation                                                         | Public proof                                                                                                                                                                                                                            | Supplemental proof                                                | Status                                |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| Loose bottom event describes the actual bottom card                | Three Giromon legal evolution/place-from-hand/Bacchus evolution/attack sequences retain exact hidden stack, zones, controller, DP, memory and full pending resolution; scoped bus observation asserts bottom and actual hidden identity | Loose placement true/false/undefined with existing physical stack | verified for these producer shapes    |
| Individual permanent bottom event describes its moved top card     | Four Bagramon play/evolution and stacked/unstacked-source sequences retain exact destination order, shed trash and original neutral zones/costs; scoped bus observation asserts bottom                                                  | Existing default individual relocation event asserts top          | verified for these producer shapes    |
| Batch event uses actual top/bottom insertion and default           | No fresh legal real multi-source producer proof                                                                                                                                                                                         | Batch true/false/undefined with existing physical stack           | adapter verified; public shape queued |
| Downstream placement-specific card reaction and competing ordering | Not demonstrated by producer event assertions alone                                                                                                                                                                                     | Existing Moonmon suite is historical regression only              | queued                                |

### Position consumer coverage and baseline

Public producer modules: BT11-088 (both entry timings) and BT26-055 (When Digivolving), different collections. BT22-006 is the sole directly authored position-filter consumer found in the current module search; it additionally requires its own top-card rotation by an effect, and its existing colocated tests are regression rather than new full-card proof. They contain older injected timing and fixture limitations and do not certify the present generic event audit. The dynamic producer/consumer denominator remains open.

Initial accepted position baseline: three files **12 failed, 183 passed**, seven public producer events and five supplemental position cases. Default batch and individual assertions were then strengthened. A first default-test edit accidentally expected loose placement's default to be top; this assertion was corrected to the documented physical bottom before the final source-restored counterfactual. It is discarded as a rule failure. Corrected final focus with Moonmon/seam: **5 files, 202 tests passed**, 2.62 seconds.

### Position gates

- Final default-strengthened baseline restoration: all three old behaviors fail **14/196**, with 182 controls green. Reverting only loose position metadata fails **6/196** (190 controls green); omitting only individual relocation metadata fails **5/196** (191 controls green); omitting only batch metadata fails **3/196** (193 controls green). The exact fixed engine bytes are restored in `finally` before any broad gate.
- Final restored command: `pnpm --filter @aegis/api exec vitest run src/cards/BT11/BT11-088.test.ts src/engine/conformance/keyword-succession-lifecycle.test.ts src/engine/effects/primitives.test.ts src/cards/BT22/BT22-006.test.ts src/engine/testkit/testkitSeam.guard.test.ts src/cards/audit-docs.test.ts`: **6 files, 206 tests passed**, 2.56 seconds.
- Scoped Oxlint passes with no warnings. Current 66-set index and clean diff check pass. Independent read-only review found no blocker in the three metadata mappings. No authored card or serialized IR changed.
- `pnpm --filter @aegis/api exec vitest run`: **5112 files, 42373 tests passed**, zero expected failures, **52.72 seconds**. `pnpm typecheck`: shared/API/web passed. Changed-file Oxfmt on all six files passed. `pnpm audit:index --check` remains current; `git diff --check` is clean.

### Position open items

Actual downstream reaction eligibility, multi-source snapshot/timing, copied placement effects and inherited source/controller turnover remain open. The event observation proves metadata and exact resolved producer state, not a downstream gameplay failure or complete keyword/collection certification. Remaining position metadata from deck/egg/reveal/mixed producers must be inspected against their physical insertion semantics.

## Deck-top payment checkpoint

### Contract and sources

EX9-009 Greymon, EX9-025 Airdramon and EX9-061 Devimon place the actual top deck card face down as the attacking Digimon's bottom digivolution card. Their complete committed catalog records and direct modules were read, together with Airdramon Q4778 (one selected opposing target); local card queries expose no Greymon/Devimon Q&A. No fresh card-page read is claimed.

Comprehensive rules §15-7-1–5 define optional processing conditions: refusal or unsuccessful payment skips the subsequent processing, but the player may choose the condition even when payment is impossible (§15-7-4), and may pay when the subsequent payload has no eligible target (§15-7-5). Full local chunks comprehensive-0169 and comprehensive-0170 were read; their existing source pins are owned by [activation-costs.md](activation-costs.md). Each new public case enforces the applicable pinned citation. The earlier expectation that an empty deck suppresses the optional choice was incorrect and is discarded, together with experiments treating that suppression as desired behavior.

### Implementation and consumer trace

The three When Attacking clauses now express their printed condition as optional whole-effect `effect.cost`, rather than an optional payload action with an action cost. Existing triggered-effect handling asks the optional choice before affordability and target checks; refusal or failed payment exits the whole clause. Successful payment proceeds even if the subsequent payload cannot select an opposing Digimon. Shared affordability checks remain intact; no interpreter eligibility implementation changes. Exclusive `registerIrCard` registration is preserved.

The actual payment calls `placeUnderFromDeck`: take the actual deck top, turn it face down, insert with `unshiftOnStack`, then await the addition event. Its event position now reports bottom instead of top. EX9 sync/check against `63f441978` confirms 74 records, exactly three semantic changes and zero semantic or byte changes outside the collection; no complete dynamic consumer denominator is inferred from those records.

### Public obligation ledger

Eleven legal public security attacks use matching-color neutral level-3 sources, quiet deck/security cards and full effect/battle resolution. No costs, events or timing are injected. Scoped observation forwards the original production event unchanged.

- Paid paths for all three providers assert actual deck/card identities, physical bottom insertion, source visibility, bottom event position, effect seat, controller, memory, final zones and cleared pending state. Greymon reaches 6000 DP; Airdramon reduces the opposing 3000-DP Digimon to 1000; Devimon deletes the opposing level-3.
- Refusal paths for all three offer one choice and retain the original deck/stack, with no placement event or paid payload.
- Empty-deck paths for all three offer one accepted choice but cannot pay: no placement event, movement or paid payload; the security battle fully resolves.
- Airdramon and Devimon additionally offer and pay with no opposing Digimon. The actual hidden deck card still moves to the bottom and its event is emitted; the targetless payload changes no opposing field.

### Counterfactuals and current gates

The eleven public cases pass. Restoring only old deck event metadata fails five paid-event assertions with six controls passing. Restoring the three old card modules while retaining corrected metadata fails four cases with seven controls passing: all three empty-deck choices and Devimon's targetless choice/payment. Airdramon's older targetless path happens to pay already; its positive test establishes the desired behavior but is not claimed as a demonstrated historical defect. Exact corrected bytes are restored in `finally` before further validation.

The three original colocated suites were updated to match §15-7-4/5 and the new whole-effect IR shape. Their prior zero-choice/no-target-payment expectations are superseded, not preserved as rules certificates. Before the two new targetless public cases, the restored four-file focus passed 41 tests. Final synchronized gates: public/three-consumer/Succession/primitives/layout focus **7 files, 235 tests passed**, 3.70 seconds; EX9 collection **78 files, 990 tests passed**, 11.33 seconds; full default API **5113 files, 42384 tests passed**, zero expected failures, 60.14 seconds. Workspace shared/API/web typecheck passed. Scoped Oxlint reports no warnings; changed-file Oxfmt, current 66-set index and clean diff check pass. Independent read-only review read the full processing-condition rules and found no blocker; its earlier zero-choice assessment is explicitly withdrawn.

### Open obligations

Training lifecycle, complete OPT/reset and copied-source identities, all scaling boundaries, expiry, source loss, replacements, egg/reveal/material producers, downstream position-filter reactions and the complete dynamic producer denominator remain open. Consumer caps and collection status belong to [EX9.md](../EX9.md); these bounded paths do not establish whole-card or whole-collection ten-point completion.
