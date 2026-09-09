# EX4 re-audit review notes

## Coordinator decisions

- Printed catalog text and local KB/rules are the behavior contract.
- Card modules must register exclusively through `registerIrCard(cardId, compiled)`.
- Existing audit claims and green collection tests are context only; this run requires fresh per-card clause evidence.
- Luna workers are used by explicit user request. Resource safety takes priority over the skill's usual higher concurrency.

## Engine seam queue

No seams reported yet.

## Fixture traps

- No Digi-Egg cards in deck or security fixtures.
- BT1-001 through BT1-008 and ST1-01/ST3-01/ST4-01 are Digi-Egg cards; replace them when used in deck or security, while uses in egg deck or as evolution sources remain valid.
- No injected timing (`advance.fire`, `fireTiming`, or `fireSubTrigger`) as behavioral proof.
- Evolution proof must assert cost, bonus draw, and resulting stack, not only `{ ok: true }`.
- Once-per-turn proof must include same-turn refusal and next-own-turn reset.
