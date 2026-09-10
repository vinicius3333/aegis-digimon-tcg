# Newly evolved inherited watcher mechanism

## EX1-039 seam result

The retained red initially evolved EX1-039 directly onto a level-4
BT1-070. That made EX1-039 the top card of the permanent. Because EX1-039's
clause is inherited, it was correctly inactive while it remained the top card;
the public suspension therefore could not grant Security Attack +1. The red
was a fixture/stack-boundary error, not a missing watcher registration seam.

The public regression now starts with EX1-039 as the top card and legally
digivolves it into EX1-042 (green level 6). That places EX1-039 in the
digivolution stack as a newly active inherited source in the same turn. A
subsequent public play of BT1-070 suspends the opponent's Digimon, and the
watcher grants Security Attack +1. The focused test passes without engine
changes.
