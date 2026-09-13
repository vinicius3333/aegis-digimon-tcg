---
title: Trigger ordering audit
updated: 2026-09-12
---

# Trigger ordering

Status: finite bounded classes closed for the public providers listed below. This ledger does
not claim whole-collection or engine-wide completion; unlisted event families remain outside
this audit.

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

The test cites comprehensive rules §§15-4-3, 15-4-4, 15-4-5 and 15-8-5. The historical
Ascension, trash-source, derived-trigger, and deletion cases below are finite evidence for
their named providers; they do not certify unlisted simultaneous pools, replacement ordering,
source movement between every zone, or every optional/refusal path.

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

The sixth bounded case covers the deletion exception in comprehensive §§15-8-3-5 and
15-16-4-1. A public battle deletes a suspended BT20-078 Reapermon carrying face-up
BT20-073 MetalPhantomon; the inherited On Deletion trigger remains associated with
the original top card while the host leaves play and De-Digivolves a separate
opponent stack by exactly one, preserving every physical instance ID.

The seventh case exercises the same exception through a nested public timing window.
BT8-085 Yolei deletes an opposing BT19-065 carrying BT20-073 while a public attack is
still resolving. Seat 1 orders the two deletion effects by the exact BT20-073 source
key, and the inherited effect De-Digivolves the attacking BT25-077 stack; the former
top card is in trash and the buried physical card is the new top. The separate native
BT19-065 optional effect is then declined, so the result cannot be attributed to that
effect. This uses the §15-8-3-5 event snapshot and keeps the source-departure exception
scoped to the deleted stack source and its former top card.

The eighth and ninth cases cover copied effects whose source changes role before activation.
Both use a seeded, legal BT26-060 Chronomon: Destroy Mode over BT26-016 Chronomon: Holy
Mode and a public attack. In the negative case, Yolei is ordered first, its deletion
causes BT20-073 to De-Digivolve Chronomon so BT26-016 becomes the physical top card, and
the copied BT26-016 attack effect is absent while the native BT19-065 reaction is declined.
The paired control removes BT20-073; the same copied effect is then offered, accepted,
and deletes a 6,000-DP survivor. Both cases assert the old/new physical IDs, trigger
keys, trash, security, and completed attack.

## Current source and ordering classes

| Class                                                                  | Current public consumer/provider                                                                 | Executable proof                                                                                                      | Status                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Same-timing optional effects owned by both controllers                 | BT25-040 Ascension                                                                               | First case above, with exact seat order and physical trash IDs                                                        | Proven for this native shape               |
| Simultaneous pending sources that depart after order selection         | EX7-061 Lilithmon (X Antibody) with two EX7-072 Seventh Fascination cards                        | Second case above, with one `orderTriggers` request and both exact source IDs reaching deck                           | Proven for this trash-trigger shape        |
| Derived trigger while an older trigger remains pending                 | BT19-065, BT20-073, BT19-020                                                                     | Fourth case above, with exact source IDs and derived request precedence                                               | Proven for this chain                      |
| A pending source leaving or changing before that same source activates | BT25-077 Bacchusmon watcher created by effect-play, then deleted by the turn player's Bacchusmon | Fifth case deletes the enemy source before its pending watcher can activate; paired Agumon control proves eligibility | Proven for this public play/deletion shape |
| Inherited On Deletion after the carrier leaves play                     | BT20-073 under a battle-deleted BT20-078 Reapermon                              | Sixth case keeps the inherited trigger's original top-card identity and De-Digivolves a separate stacked target       | Proven for this public battle shape                 |
| Nested inherited On Deletion after a public deletion window             | BT8-085 Yolei deletes BT19-065 carrying BT20-073 during an attack             | Seventh case selects the exact BT20-073 trigger key, then checks old/new attacker top IDs and all trash zones          | Proven for this public nested shape                 |
| Copied effect loses its source role before activation                    | BT26-060 over BT26-016; Yolei + BT20-073 De-Digivolve the Chronomon attacker | Eighth case orders Yolei, then BT20-073, and observes no BT26-016 optional attack effect after the source becomes top   | Proven for this copied-source turnover shape        |
| Copied effect remains eligible when source role is unchanged              | Same Chronomon stack without BT20-073                                       | Ninth case accepts the copied BT26-016 effect and deletes the eligible 6,000-DP survivor                            | Proven by paired control                              |

The second class must not be described as a source leaving before its own activation:
the selected EX7-072 source departs after the public order decision and the remaining
source then resolves. The fourth class demonstrates pending/derived precedence, not
source identity mutation. The eighth/ninth pair closes the concrete copied-source role-change
path for the current Succession consumer. Other event families and source movement shapes
remain outside this finite audit.

## Future plan

- Extend this audit only when a new concrete provider or event family is admitted; retain
  exact source identities and controller decisions in each added request.
- Keep inherited On Deletion separate from ordinary pending source departure: §15-8-3-5
  anchors it to the original top card after deletion.
