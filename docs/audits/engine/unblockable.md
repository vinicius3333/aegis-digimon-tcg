# Unblockable consumer audit

Focused proof is green: 1 file, 5 tests passing, including the natural turn-boundary expiry case.

The reviewed §12-1 source is `comprehensive-0151`, SHA-256
`1c4e669751a989f9da2bdc3b1b198b4c2c4a03210f54b17ac1f6ba87faa9a566`.

EX4-042 is the current printed provider. Its public Your Turn effect grants
Unblockable to itself and matching Knightmon/Knightsmon names. The focused
consumer proof drives a real attack against an opponent holding printed
AD1-005 Blocker and confirms the attack reaches security without
opening a block window or suspending the blocker. Existing EX4-042 tests verify the
catalog, grant targets, turn expiry, and `cantBeBlocked` restriction. The
keyword remains outside the 46-name canonical union as a restriction encoding.
The third focused case attacks with a separate Knightmon recipient, proving
EX4-042's matching-name grant applies beyond its source card.

The second case is a public plain BT1-009 control against the same AD1-005
Blocker: it opens a block window and resolves through the exact blocker and
security instances. The runtime reader is the `cantBeBlocked` legality path in
`engine/combat/legality.ts`; the provider is the compiled EX4-042 self/name
grant. Name-target grant behavior is covered by colocated card evidence, while
additional granted-recipient attack shapes remain open. The fifth case checks
the live `cantBeBlocked` restriction before the source player's turn ends and
after the natural opponent-turn handoff, then resolves the now-blockable
EX4-040 SkullKnightmon attack through the exact blocker, attacker, and
seat-0 security instances. The lifecycle fixture uses printed AD1-005 Gaiamon
as the blocker; its higher DP leaves the blocker suspended while the attacking
SkullKnightmon is trashed, making the post-boundary result deterministic.
