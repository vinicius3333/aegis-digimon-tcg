# Inherited security watcher mechanism

## EX1-029 seam result

The retained EX1-029 red was initially reported as a failure to re-register an
inherited `[Your Turn][Once Per Turn] When a card is added to your security
stack` watcher after a public turn transition. The red was caused by an
under-provisioned deck fixture, not by the engine watcher lifecycle.

The public sequence consumes the controller's deck in this order:

1. BT1-087 T.K. Recovery consumes one card.
2. The controller's next-turn Draw phase consumes one card.
3. The digivolution consumes one card for its bonus draw before EX1-031's
   `When Digivolving` Recovery.
4. EX1-031 therefore needs a fourth initial deck card for Recovery to add a
   card and publish the `whenAddSecurity` event.

With only two initial deck cards, EX1-031 Recovery correctly adds zero cards,
so no `whenAddSecurity` event exists and memory remains 6 after the 4-cost
digivolution. The focused test now supplies four inert deck cards and waits for
the security stack to reach four cards, proving the real Recovery event. The
watcher then re-registers across continuous recomputation and the next-own-turn
once-per-turn ledger reset grants the expected +1 memory (10 - 4 + 1 = 7).

No engine behavior was changed. The stack assertion was also corrected to the
engine's documented bottom-first `Permanent.stack` order: the seeded EX1-029
is below the prior BT1-060 top card, so the observed stack is
`["EX1-029", "BT1-060"]`.
