# Should a kind-less "play 1 card" pool reach Option cards?

**Status: open. Needs a rules decision before the engine changes.**

## Printed clause

EX13-060 Alphamon: "[End of Your Turn] [Once Per Turn] You may play 1 [Chronicle] trait card
without [Alphamon] in its name from your hand with the cost reduced by 6. It gains ＜Rush＞
for the turn."

The IR filter carries no `kind`, which is the printed reading — the clause names "1 card".

## Where it lives

`apps/api/src/engine/effects/interpreter/actions/play.ts` — `playableCandidates`. When the
target names no kind, Option-only cards are dropped from the pool. DUAL Digimon/Option cards
are kept, because they have a playable side.

## Expected vs actual

`EX13-060.test.ts` "reaches a [Chronicle] OPTION from hand" expects BT20-095 (a black
[X Antibody]/[Chronicle] Option, printed cost 3, floored at 0 by the reduction) to leave
hand. It stays in hand.

## Why the engine was not changed

1. Comprehensive rules §6-5 lists the Main-phase actions as "play a Digimon card or Tamer
   card from the hand ... **use** an Option card from the hand". "Play" and "use" are
   distinct operations; "play 1 card" does not reach an Option.
2. The printed rider "It gains ＜Rush＞ for the turn" describes a permanent. An Option is
   trashed on resolution and has nothing to gain ＜Rush＞.
3. `playableCandidates` drops Option-only cards deliberately and documents why. Reversing it
   changes **every** kind-less play IR in the catalog (BT21-098 and others), not just this
   card.

## The decision needed

Either:

- **Confirm the rules reading** — the expectation is wrong. Delete the `it.fails` test, and
  record in `docs/audits/EX13.md` that the clause reaches Digimon and Tamers only.
- **Override it** with a KB ruling that "play 1 card" reaches Options for this wording. Then
  `playableCandidates` keeps Option-only candidates for a kind-less target, gated on
  `ctx.game.optionColorRequirementMet?.(seat, instanceId, definition)` so the colour
  requirement still binds as it would on a normal use, and the whole card suite is re-run to
  price the blast radius.

Until then the test stays `it.fails` with its comment pointing here.
