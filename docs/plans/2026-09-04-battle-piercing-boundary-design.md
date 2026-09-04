# Battle deletion and Piercing trigger boundary

## Contract

Local KB EX8-023 Q3883 permits Piercing gained simultaneously with the last
opposing stacked Digimon's battle deletion. EX8-045 Q3931 preserves an already
triggered check when a later Fortitude replay removes conditional Piercing.
Gaining the ability through a subsequent reaction is too late for that battle.

## Reproducer

The EX8-023 runtime case uses Skadimon over BT1-037 and EX8-023 against a
one-source defender, so Ice Clad produces a surviving winner rather than a tie.
Explicit assertions establish defender deletion, attacker survival and security
loss. The old pre-removal snapshot fails the security assertion. A controller
test independently reproduces the deletion-state transition without card effects.

## Chosen implementation

Capture win/deletion SubTrigger eligibility while the source and loser are live.
Freeze their matching predicates and bind source contexts, retaining lifecycle
and once-per-turn checks for activation. Remove the battle losers, recompute
passive effects, and capture Piercing before executing those reactions. Preserve
turn-player win priority, then process deletion watchers and Fortitude.

A pre-removal snapshot misses Q3883. An unrestricted late read admits reaction
gains and loses Q3931. Reading only continuous grants is also insufficient:
a reaction can evolve into a host with continuously granted Piercing.

## Verification and remaining review

EX8-023, EX8-045 and controller tests pass together: 3 files / 47 tests.
Affected battle/Piercing/Fortitude selection passes: 3 files / 22 tests.
Final implementation `d1cde8569` passed four files / 50 tests, including a real
frozen watcher and a Token's single post-removal reaction. Token candidates now
survive deferred timing and rule pools without a pre-removal activation.
API typecheck passed. Independent review returned Ready with no
Critical/Important findings; Material Save source movement was reviewed.
This design does not declare EX8 collection completion.
