---
title: Activated Main projection refresh
updated: 2026-09-29
---

# Activated Main projection refresh

A directly activated `[Main]` effect (a Digimon or Tamer `[Main]`, or a `＜Delay＞` Option in the battle area) does not resolve inside a timing window. `handleActivateEffect` in `gameEngine/intents/play.ts` ran the rule check right after the effect, but it never recomputed the continuous layer. That broke the documented `ruleProcess` precondition (the continuous DP tier must be current). It also left the client projections stale: `Permanent.keywords`, `summoningSick`, `canAttackPlayer` and `attackablePermanentIds` are only rebuilt by `recomputeContinuousEffects`.

A grant made as the last instruction of such an effect was therefore live in the engine but not published. The client hid the attack, and the next unrelated recompute (for example, another play) repaired the view.

## Reported case

Discord bug 1554301049614110770, match `dd487753-8aff-4566-ae00-154cddc7dfe3`. At 01:15:36 UTC the player activated BT13-110 Royal Knights of the Purge's Delay and played BT20-102 Omnimon (X Antibody) from King Drasil_7D6's digivolution cards. King Drasil's play-cost replacement was offered (dec-39), then two BT20-091 Tamers resolved their play reactions. The Delay then granted ＜Rush＞, but no recompute followed. The player sent no attack intent before playing BT20-083 at 01:17:46 and ending the turn.

The engine itself accepted the attack. A harness run of the same board shows `hasKeyword(..., "Rush")` true and `attack` accepted, while the projection reads `keywords = [Blocker, Piercing, Raid]`, `summoningSick = true` and `canAttackPlayer = false`.

## Fix

`handleActivateEffect` now awaits `engine.recomputeContinuousEffects()` before `ruleProcess(engine)`. This is the same recompute that a timing window performs after each resolved effect.

## Evidence

| Case                                                                    | Test                                                                            | Before the fix          | After the fix                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------- |
| BT13-110 Delay plays BT20-102 from King Drasil with two BT20-091 Tamers | `BT13-110.test.ts` "publishes the Delay Rush…"                                  | `keywords` lacks Rush   | Rush projected, not summoning sick, can attack the player |
| Same, through the live turn loop                                        | `bt13RoyalPurgeDelayRushScenario.test.ts` (`arena-bt13-royal-purge-delay-rush`) | `keywords` lacks Rush   | passes                                                    |
| BT23-030 Etemon `[Main]` play, then Reboot and Blocker                  | `BT23-030.test.ts` "publishes the granted Reboot and Blocker…"                  | `keywords = [Alliance]` | Reboot and Blocker projected                              |
| BT22-010 Meramon `[Main]` Raid and Piercing, attack declined            | `BT22-010.test.ts` "publishes Raid and Piercing…"                               | `keywords = []`         | Raid and Piercing projected                               |

Options used from the hand are not affected: they resolve inside the `OnUseOption` timing window, which already recomputes.

## Open questions

- King Drasil_7D6's optional "reduce the play cost by 4" is still offered when the Delay plays a card without paying the cost. The KB has no ruling on a reduction offered for a free play (Q753, Q779, Q1755 and Q3838 only say that a free play is not a cost reduction). The behavior is unchanged.
- BT20-091's "when played" reactions resolve before the Delay grants ＜Rush＞, and `effectActivated` is emitted afterwards. Whether those reactions should wait until the Delay effect fully resolves was not changed here.
