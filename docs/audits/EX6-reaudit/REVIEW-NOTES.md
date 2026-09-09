# EX6 re-audit review notes

## Coordinator decisions

- Printed catalog text and local KB/rules are the behavior contract.
- Card modules must register exclusively through `registerIrCard(cardId, compiled)`.
- Existing audit claims are context only; this run requires fresh per-card evidence and fresh gates.

## Engine seam queue

No seams reported yet.

## Fixture traps

- No Digi-Egg cards in deck or security fixtures.
- No injected timing (`advance.fire`, `fireTiming`, or `fireSubTrigger`) as behavioral proof.
- Evolution proof must assert cost and resulting stack, not only `{ ok: true }`.
- Once-per-turn proof must include same-turn refusal and next-turn reset.

