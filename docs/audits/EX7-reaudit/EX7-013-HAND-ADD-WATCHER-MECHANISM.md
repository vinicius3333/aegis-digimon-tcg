# EX7-013 Q3832 hand-add watcher mechanism

## Conclusion

Q3832 is a fixture-direction correction, not an engine seam. No production engine source was changed. The corrected public EX7-013 test is ordinary green and the card audit is promoted to 8/10 with Behavior 2/2.

## Causal evidence

BT10-077 already registers an `[Opponent's Turn]` `whenEffectAddsToOpponentHand` watcher. The generic effect-draw primitive emits that event with the recipient seat and the five added instance IDs. Its watcher body then:

1. pays BT10-077's cost by trashing `BT1-104` from its own digivolution stack into seat 1's trash; and
2. makes the opponent, seat 0, trash five cards from seat 0's hand into seat 0's trash.

The original EX7-013 retained red did not model that result: it declined the optional BT10-077 activation and expected seat 0's hand cards to be stored in seat 1's trash alongside the cost card. That expectation conflated the cost payer's trash with the opponent's hand-trashing destination.

## Regression proof

`apps/api/src/engine/cards/ex7HandAddWatcher.test.ts` uses a real BT10-077 permanent with `BT1-104` under it, drives the canonical effect-draw primitive through the testkit's `drawByEffect` affordance, and asserts the exact result: seat 0 retains `BT1-014`, seat 0's trash contains five cards, and seat 1's trash contains only `BT1-104`. The test also confirms one real `whenEffectAddsToOpponentHand` subscription is installed.

The helper is retained because the existing `advance.verb.draw` intentionally models the normal draw path, while this regression needs the canonical effect-driven hand-add path used by `ctx.fx.draw`. It changes no production behavior and preserves the normal-draw helper's semantics.

## Scope and compatibility

Only `apps/api/src/engine/testkit/advance.ts`, the focused mechanism regression, the EX7-013 public test, this report, and the EX7-013 audit report were touched. No card module, production engine source, catalog, ledger, RUN file, commit, or push was changed. The existing watcher behavior and activation semantics remain intact.
