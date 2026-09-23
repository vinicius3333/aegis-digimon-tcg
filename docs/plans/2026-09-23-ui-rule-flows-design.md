# UI rule flows

## Objective

Continue rule-obligation verification through the real client on branch
`test/ui-rule-flows`. Preserve the earlier engine and verifier work. Run locally,
with a 2 GB Node heap and serialized test workers; no CI changes.

## Approach

Use the existing React scenario harness, real Colyseus room and real WebSocket
transport. Component-only tests cannot prove server resolution; introducing a
second browser harness would duplicate the existing functional setup. Strengthen
the existing integration scenarios and record their exact executed names in the
rule inventory instead.

Each reviewed flow must connect user input to authoritative synchronized state
and the rendered result. Identity-sensitive actions must check the exact selected
instance, rather than merely the number or name of remaining cards.

## Coverage

- Playing a card: hand consumption, paid cost, resulting permanent and available
  UI actions.
- DigiXros: selection, materials, reduced cost and resulting source stack.
- Decisions: chosen target, optional acceptance/refusal, simultaneous ordering.
- Combat: attack against security, attack against a permanent and blocking.
- Passing: authoritative turn/phase and memory transitions, then rendered turn.
- Reconnection: preserve the pending decision, answer after resuming and prove
  the resulting cost/effect on desktop and the three existing phone viewports.

Use existing reviewed flows where they already establish these properties. Add
assertions or correct implementation where evidence is missing. Link the bounded
branches to their actual comprehensive-rule clauses without claiming that a
transport reconnect is itself a card-game rule.

## Verification and limits

Run the affected scenarios, the local obligation verifier and the complete
existing scenario suite to check interactions. Review changes independently and
check formatting, lint and feasible scoped types under the memory limit.
Record audit evidence only in `docs/audits/engine/ui-rule-flows.md`.

These are functional DOM scenarios with a real server. They do not establish
pixel geometry, browser-specific rendering, animation timing or whole-game
parity. Existing reduced-motion behavior remains explicit.
