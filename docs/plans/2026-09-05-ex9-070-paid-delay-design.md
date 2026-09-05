# EX9-070 paid Delay evolution

Meat permits a DM evolution with its cost reduced by two, not a free
evolution. Its Digivolve IR omitted `payCost: true`, which the shared
interpreter requires for paid effect-driven evolution. The existing case
used a cost-two evolution and could not distinguish the two behaviors.

A real Delay activation now uses EX9-038 into EX9-063: alternate cost four,
minus two from Meat and one intrinsic Ver.4 reduction from the newly placed
face-down card. The expected payment is one; the original module paid zero.
An attempted second Meat activation during the pending first decision is
rejected, and that second copy must remain in the battle area.

Set `payCost: true` in the card's existing IR. Do not change the interpreter's
default, which intentionally supports free evolution effects. Retain exact
memory and zone assertions plus independent off-color field/breeding waiver
and refusal cases. Further linked timing rulings remain audit work.
