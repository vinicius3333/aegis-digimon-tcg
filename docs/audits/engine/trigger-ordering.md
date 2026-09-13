---
title: Trigger ordering audit
updated: 2026-09-12
---

# Trigger ordering

Status: bounded evidence only; the complete trigger, pending-activation, derived-trigger,
controller-choice, source-identity, and zone-departure surface remains open.

The first bounded conformance proof is
`apps/api/src/engine/conformance/trigger-ordering-source-departure.test.ts`.
It uses a legal equal-DP battle between two BT25-040 holders owned by opposing
controllers. The battle creates one simultaneous deletion event; after the real
turn loop reaches seat 0's Main Phase, seat 0 receives its `selectCards` processing
decision first, followed by seat 1. Both refusals preserve the exact deleted
instances in their owners' trash. This proves controller priority for this native
Ascension provider shape without claiming a shared cross-controller ordering prompt.

The second bounded case uses two physical EX7-072 Seventh Fascination cards in the
trash and a public digivolution into EX7-061 Lilithmon (X Antibody). Both real trash
triggers are offered in one `orderTriggers` decision with their distinct source
instance identities. After one selected source returns to the bottom of the deck,
the remaining pending source still resolves and also returns to the deck. This
proves one simultaneous controller choice and one source-departure transition for
this exact card shape.

The test cites comprehensive rules §§15-4-3, 15-4-4, 15-4-5 and 15-8-5. It does not certify all
simultaneous trigger pools, turn-player precedence, derived triggering, replacement
ordering, source movement between every zone, or all optional/refusal paths. No
engine-wide or keyword-wide certification follows from this case.

The same file also retains a three-card public equal-DP battle fixture with valid
level-5 Cyborg payloads. It asserts `state.turnSeat === 0` and phase `Main` before
the attack, then observes the first optional deletion request as seat 0/source
BT19-065. This confirms the controller-priority path when both source effects are
actually activatable; it does not claim derived-trigger precedence.

The fourth case completes a public derived-trigger chain using BT19-065, BT20-073,
and BT19-020. The turn player's BT19-065 plays a valid BT20-073 from trash; after
its public optional delete-own cost is answered with an exact permanent, BT20-073's
On Play deletes the opposing BT19-020. While the opposing BT19-065 deletion effect
is still pending, the newly generated BT19-020 On Deletion request is offered first;
the test then observes the older BT19-065 request and declines both. This is bounded
proof of non-turn-player derived-trigger precedence with exact request source IDs.

The fifth case proves pending-source departure with a public card flow. In seat 0's
Main Phase, equal-DP BT19-065 Machinedramon cards delete each other; seat 0's
Machinedramon plays BT20-073 MetalPhantomon from trash, creating both BT25-077
Bacchusmon “when played by an effect” watchers. Seat 0's watcher is accepted first
and deletes the only remaining enemy Digimon, seat 1's Bacchusmon. The enemy watcher
is pending at that moment, but no seat 1 decision follows and the attack resolves to
completion. A paired control adds lower-DP BT1-009 Agumon; seat 0's watcher deletes
Agumon instead, and the enemy Bacchusmon watcher is offered to seat 1 and declined.
This establishes both eligibility and source identity before departure.

## Current source and ordering classes

| Class                                                                  | Current public consumer/provider                                                                 | Executable proof                                                                                                      | Status                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Same-timing optional effects owned by both controllers                 | BT25-040 Ascension                                                                               | First case above, with exact seat order and physical trash IDs                                                        | Proven for this native shape               |
| Simultaneous pending sources that depart after order selection         | EX7-061 Lilithmon (X Antibody) with two EX7-072 Seventh Fascination cards                        | Second case above, with one `orderTriggers` request and both exact source IDs reaching deck                           | Proven for this trash-trigger shape        |
| Derived trigger while an older trigger remains pending                 | BT19-065, BT20-073, BT19-020                                                                     | Fourth case above, with exact source IDs and derived request precedence                                               | Proven for this chain                      |
| A pending source leaving or changing before that same source activates | BT25-077 Bacchusmon watcher created by effect-play, then deleted by the turn player's Bacchusmon | Fifth case deletes the enemy source before its pending watcher can activate; paired Agumon control proves eligibility | Proven for this public play/deletion shape |

The second class must not be described as a source leaving before its own activation:
the selected EX7-072 source departs after the public order decision and the remaining
source then resolves. The fourth class demonstrates pending/derived precedence, not
source identity mutation. Other trigger consumers and source movement shapes remain
outside this bounded proof.

## Future plan

- Add public fixtures for opposing-controller simultaneous pools and explicit
  controller-selected orders.
- Add source-identity cases where a pending trigger's card becomes a different physical
  card or moves within the same battle-area host.
- Add derived chains for other event families and preserve exact source identities
  and controller decisions in each request.
- Reconcile every trigger consumer and provider/exception denominator before claiming
  mechanism completion.
