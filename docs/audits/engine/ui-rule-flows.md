# UI rule flows

## Scope

Branch: `test/ui-rule-flows`. This work continues the existing engine route and
trigger matrices through the real React client, Colyseus room and WebSocket
transport. No game state is injected to bypass the actions under review.

The `ui-flows` verifier group combines `ui-main-actions`,
`simultaneous-triggers`, `optional-triggers`, `effect-play-routes` and
`ui-mechanics`. It retains
their engine evidence as well as the UI scenarios. An obligation classified as
proven refers to its described scenario branches, not every interaction allowed
by the entire clause.

## Reviewed flows

| Flow                    | Input and authoritative outcome                                                                                                         | Rendered evidence                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Play Biyomon            | Playing from hand consumes one card, places one active permanent with no sources and pays three memory                                  | Same permanent ID on board, cost on gauge, stack viewer opens           |
| DigiXros                | Cancel preserves hand, battle and memory; confirm consumes StarSword and Shoutmon, with Shoutmon under the resulting card and cost four | Resulting card, one-source badge and Shoutmon entry in viewer           |
| Choose a target         | Brave Shield targets one of two same-name suspended Monodramon; only the chosen permanent unsuspends                                    | Chosen ID becomes active; the other remains suspended                   |
| Attack security         | The security pile loses one instance, which reaches trash                                                                               | Security clash and count five to four                                   |
| Attack a Digimon        | The exact Frigimon instance leaves battle for trash; Muchomon survives                                                                  | Opposing battle card disappears, trash shows Frigimon, Muchomon remains |
| Block                   | Monmon redirects Agumon's attack, reaches trash and preserves five security; Agumon survives suspended                                  | Block choice and Monmon's removal from the board                        |
| Pass                    | Explicit passes advance both seats, phases and turn count; each incoming turn starts with three memory                                  | Opponent turn, then Your turn and memory +3                             |
| Optional processing     | Existing acceptance/refusal scenarios distinguish paid cost and memory gain from declining                                              | Decision closes, hand and gauge reflect the branch                      |
| Trigger order           | Existing Tai/T.K. scenario checks the selected source's event and rejects the other seat's response                                     | Both choices shown, selected effect resolves and prompt closes          |
| Reconnect desktop/phone | Preserve the decision ID across a real socket drop, then answer and pay one specific hand card after resuming                           | Restored board, resolved prompt, updated hand/trash and memory -3       |

## Expanded mechanics and decisions

The continuation covers DNA, Burst, App Fusion, Assembly, Link from hand and
battle, and two-material DigiXros. Each scenario uses legal seeded decks and real
UI actions, then observes synchronized identities, costs, zones and rendered
results. Cancellation is exercised in the available route and material dialogs.

Normal and alternate evolution now assert exact result/source identities and the
mandatory draw. Gravity Crush checks the selected Option in trash and completes
its end-of-turn memory debt. Meramon's activated Main checks the exact deleted
opponent card and two-memory payment.

Complex decisions cover a required minimum of one, an optional zero-target
resolution, and three selections from four same-name candidates. The existing
picker replaces the oldest selection on the fourth click while retaining the
maximum of three; exact returned and surviving instance IDs are verified. Yuuki's
optional follow-up preserves hand, trash identities and owner-perspective memory
when declined. A WarGrowlmon attack deletes its own selected attack target before
battle, preserves the other same-name Digimon and defending security, closes the
attack without battle/security checks, and allows the next ordinary UI action.

Two production defects were exposed by these stronger assertions:

- Same-patch bottom insertion produced correct server sources but duplicate card
  identities in the client. The synchronized-array insertion seam now clears
  stale index operations before re-appending and exposing the ordered cards.
  Codec tests cover both seat views, hand and field material origins, and owner
  hand ordering with opponent redaction. The real two-material DigiXros scenarios
  reproduce the original failure and pass with the correction.
- DNA source order followed declaration order instead of the printed material
  recipe. Matching now assigns complete material groups to printed slots and
  reverses those groups for the bottom-first stack representation, preserving each
  group's internal order. Tests cover both declaration orders, effect-driven DNA,
  and the UI; explicit Blast DNA ordering remains verified. A surplus third
  material is rejected for a two-slot recipe without paying or moving cards.

The added `ui-main-actions` obligations are CR 7-1-3-2, 7-1-3-3,
6-5-1-7-1, 15-10-2-1, 11-5-1-3-1, 13-1-8-4 and 12-1-1.
DigiXros adds UI evidence to CR 7-2-3-3. Reconnect exercises existing optional
processing under a transport interruption; it is not a separate card-game rule.

## Gaps corrected in the evidence

- Mobile reconnect previously stopped when the decision reappeared, although the
  inventory claimed that it was answered. It now completes the action through
  the mobile controls at all three existing phone viewports.
- Desktop reconnect previously accepted any displayed memory above -4. The
  assertions now require the exact cost card, one paid trash card, memory -3,
  no remaining decision and the next turn at memory 3.
- Reconnect completion now follows the authoritative turn transition and
  explicitly declines Yuuki's subsequent optional end-of-turn return. An empty
  prompt between actions or a display update on one socket is insufficient to
  prove that all processing has finished on the observing connection.
- Several combat and action scenarios previously checked only card names or
  visible counts. They now connect those results to synchronized permanent or
  card-instance identities and explicit zone/cost changes.
- The pass scenario now drives the opposing phases explicitly, making each
  authoritative transition observable before proceeding.

## Reproduce

```bash
NODE_OPTIONS=--max-old-space-size=2048 node tools/kb/verify-rule-scenarios.mjs ui-flows
```

For the entire existing scenario suite:

```bash
cd apps/web
NODE_OPTIONS=--max-old-space-size=2048 TEST_MAX_THREADS=1 TEST_MAX_WORKERS=1 TEST_HEAP_MB=2048 pnpm exec vitest run test/*.scenario.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
```

All Node processes use a 2 GB heap limit. Workers are serialized per run.

The group contains 41 obligations, 95 scenario links and 78 distinct tests:
55 engine links and 40 UI links. The broader inventory now classifies 67 records
as proven and 7,770 as gaps; these counts are not a parity percentage.

## Verification

- The final `ui-flows` verifier passed all **95 links to 78 distinct tests**
  across **41 obligations**: 55 engine links and 40 UI links. Both layers report
  `verified: true`, with empty `gaps` and `errors` arrays.
- The complete UI scenario suite passed: **38 files and 45 tests**, including all
  added mechanics/decisions, desktop reconnect and all three phone viewports.
- Focused API mechanism regressions passed **88 tests across 11 files** in three
  serialized runs: DNA/order/Blast consent (24), synchronized array insertion
  and both seat views (10), and Blast DNA, pending triggers, mutation seam and
  visibility regressions (54).
- Frontend source typecheck passed with `pnpm --filter @aegis/web typecheck`
  under the 2 GB Node heap limit. Full API typecheck exceeded that limit before
  producing TypeScript diagnostics; it is not reported as passed.
- The audit-document layout gate passed all four tests.
- Independent Sol and Luna reviews checked items 1–3 against the plan, exact
  instance assertions, rule mappings, runtime test names and limits. The DNA
  source-order review exposed the reversed grouping and surplus-material gap;
  both have engine regressions. Final review found no remaining substantive
  mismatch in the requested three items.
- Formatting, lint of the changed code, inventory validation and
  `git diff --check` passed. No CI, deployment or browser visual gate was added.

## Limits

These are functional jsdom tests with real transport and engine behavior. They
do not establish physical browser geometry, clipping, touch hit areas or animation
timing; scenarios deliberately use reduced motion. DigiXros covers two distinct
printed material slots and both hand and field origins; it does not enumerate
every alternate recipe or material-saving route. The security case covers ordinary
disposal, not every effect that moves a revealed security card elsewhere. Target
decisions cover required one and optional zero-to-three branches, including
a fourth eligible candidate; other cardinalities and aggregate payment budgets
remain outside these reviewed cases.

Other existing scenarios receive regression testing without being automatically
promoted to reviewed rule evidence. These reviewed evolution and Link cases do
not exhaust every card-specific interaction. Browser visual coverage remains
separate. Full API typechecking remains subject to the recorded 2 GB limitation. This
work does not claim whole-game parity and does not add CI or deployment changes.
