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

## Continuation: complete items 1, 2 and 3

The requested continuation covers all of these deliverables, with atomic commits
after focused verification:

1. Real-room UI flows for DNA, Burst, App Fusion, Assembly, Link and DigiXros
   with multiple materials. Verify selected instances, paid costs, source order,
   consumed zones and rendered results; exercise cancellation where offered.
2. Strengthen normal/alternate evolution, Option use and activated Main effects:
   verify exact material/target identities, costs, draw/zone deltas and deferred
   processing as well as the visible result.
3. Complex decisions: multiple targets, selection minimum and maximum, duplicate
   names with different physical instances, cancellation/decline and a target
   becoming invalid during a legitimate resolving sequence. Pending decisions
   lock unrelated actions, so invalidation must follow actual rules processing.

Use legal seeded decks and ordinary gameplay to reach the fixtures. Capture the
owning client's room only to observe private identities. Do not inject board
state, bypass the chosen UI actions or replace room verification with a mocked
component response. Existing focused component tests can supplement these flows.

Link reviewed cases into the rule inventory and preserve earlier scopes. Final
gates are focused tests, the complete scenario regression, executable obligation
verification, formatting/lint and feasible types with 2 GB heaps. Record results
in the existing cross-set UI audit ledger. Browser visual tests and transport
fault expansion remain the separately listed items 4 and 5.
