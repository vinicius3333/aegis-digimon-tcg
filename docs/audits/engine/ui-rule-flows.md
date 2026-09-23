# UI rule flows

## Scope

Branch: `test/ui-rule-flows`. This work continues the existing engine route and
trigger matrices through the real React client, Colyseus room and WebSocket
transport. No game state is injected to bypass the actions under review.

The `ui-flows` verifier group combines `ui-main-actions`,
`simultaneous-triggers`, `optional-triggers` and `effect-play-routes`. It retains
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
NODE_OPTIONS=--max-old-space-size=2048 TEST_MAX_THREADS=1 pnpm exec vitest run test/*.scenario.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
```

All Node processes use a 2 GB heap limit. Workers are serialized per run.

The group contains 31 obligations, 74 scenario links and 62 distinct tests:
53 engine links and 21 UI links. The broader inventory now classifies 57 records
as proven and 7,780 as gaps; these counts are not a parity percentage.

## Verification

- The `ui-flows` verifier passed both engine and UI layers with no missing
  scenarios or execution errors.
- The complete existing UI scenario suite passed: 31 files and 36 tests,
  including desktop reconnect and all three phone viewports, after the final
  decision-loop correction.
- Frontend source typecheck passed with `pnpm --filter @aegis/web typecheck`
  under the 2 GB Node heap limit.
- The audit-document layout gate passed all four tests.
- Independent Sol and Luna reviews checked the scenario assertions, rule
  mappings, exact test names and documented limits. The block scenario was
  tightened to assert preserved security together with the completed battle
  outcome. The reconnect selector was corrected to match the actual rendered
  label before the successful integrated run.
- Formatting, lint of the changed scenarios, inventory validation and
  `git diff --check` passed. No production UI behavior changes were necessary
  for this scope.

## Limits

These are functional jsdom tests with real transport and engine behavior. They
do not establish physical browser geometry, clipping, touch hit areas or animation
timing; scenarios deliberately use reduced motion. The DigiXros UI case uses one
material and does not prove multi-slot source ordering, which remains covered by
the engine tests. The security case covers ordinary disposal, not every effect
that moves a revealed security card elsewhere. The target case covers one chosen
target, not every multi-target cardinality branch.

Other existing scenarios receive regression testing without being automatically
promoted to reviewed rule evidence. Further evolution, linking, complex payment
and browser visual coverage still need their own reviewed cases. Full API
typechecking remains subject to the previously recorded 2 GB limitation. This
work does not claim whole-game parity and does not add CI or deployment changes.
