# Gotsumon printed-Blocker arena scenario

Add a live `/dev/arena` scenario selected with
`?scenario=arena-ex13-gotsumon-blocker-search`. The server-owned development
layout gives seat 0 three memory and EX13-047 Gotsumon in hand. After security
setup, it places these cards on top of the main deck in order:

1. BT20-047, which prints `<Blocker>` in its main card text;
2. BT1-079, whose `<Blocker>` appears only in its inherited effect;
3. BT1-009, a neutral non-match.

The existing room, intent, effect, reveal, decision, and zone-movement pipeline
remains unchanged. The developer ends the breeding phase, plays Gotsumon, and
should see only BT20-047 offered for the `<Blocker>` search slot. BT1-079 and
BT1-009 must return to the bottom of the deck.

Verification consists of a focused API scenario-layout test plus web typecheck.
The existing EX13-047 behavioral suite remains the authoritative engine proof.
