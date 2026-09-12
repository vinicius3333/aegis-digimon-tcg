---
title: Trigger ordering audit
updated: 2026-09-12
---

# Trigger ordering

Status: bounded evidence only; the complete trigger, pending-activation, derived-trigger,
controller-choice, source-identity, and zone-departure surface remains open.

The first bounded conformance proof is
`apps/api/src/engine/conformance/trigger-ordering-source-departure.test.ts`.
It uses two physical EX7-072 Seventh Fascination cards in the trash and a public
digivolution into EX7-061 Lilithmon (X Antibody). Both real trash triggers are offered
in one `orderTriggers` decision with their distinct source instance identities. After
one selected source returns to the bottom of the deck, the remaining pending source
still resolves and also returns to the deck. This proves one simultaneous controller
choice and one source-departure transition for this exact card shape.

The test cites comprehensive rules §15-4-3 and §15-4-4. It does not certify all
simultaneous trigger pools, turn-player precedence, derived triggering, replacement
ordering, source movement between every zone, or all optional/refusal paths. No
engine-wide or keyword-wide certification follows from this case.

The same file also uses a legal equal-DP battle between two BT25-040 holders owned by
opposing controllers. The battle creates one simultaneous deletion event; after the
real turn loop reaches seat 0's Main Phase, seat 0 receives its `selectCards` processing
decision first, followed by seat 1. Both refusals preserve the exact deleted instances
in their owners' trash. This proves controller priority for this native Ascension
provider shape without claiming a shared cross-controller ordering prompt.

## Future plan

- Add public fixtures for opposing-controller simultaneous pools and explicit
  controller-selected orders.
- Add source-identity cases where a pending trigger's card becomes a different physical
  card or moves within the same battle-area host.
- Add derived-trigger precedence and optional refusal cases while retaining exact
- trigger source identities in each decision.
- Reconcile every trigger consumer and provider/exception denominator before claiming
  mechanism completion.
