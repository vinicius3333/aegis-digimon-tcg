# Gotsumon printed-Blocker arena scenario

Add a live `/dev/arena` scenario selected with
`?scenario=arena-ex13-gotsumon-blocker-search`. The server-owned development
layout gives seat 0 three memory and EX13-047 Gotsumon in hand. After security
setup, it places a neutral BT1-009 on top to absorb the turn draw, followed by
these three cards for Gotsumon's reveal in order:

1. BT20-047, which prints `<Blocker>` in its main card text;
2. BT19-069, whose `<Blocker>` appears only in its inherited effect;
3. EX8-046, whose `<Blocker>` appears only in its inherited effect.

The existing room, intent, effect, reveal, decision, and zone-movement pipeline
remains unchanged. After the automatic turn draw, the developer ends the
breeding phase, plays Gotsumon, and should see only BT20-047 offered for the
`<Blocker>` search slot. BT19-069 and EX8-046 must return to the bottom of the
deck.

Verification consists of a focused API scenario-layout test plus web typecheck.
The existing EX13-047 behavioral suite remains the authoritative engine proof.
