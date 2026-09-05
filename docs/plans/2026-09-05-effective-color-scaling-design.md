# Effective colors after stack placement

BT8-084's When Digivolving reduction counts its own colors. Its Your Turn
effect grants the colors of visible digivolution cards; hidden sources have no
usable color information, and the grant does not apply on the opponent's turn.

The prior `selfAndDigivolutionCardColors` shortcut read every printed stack
color. Two focused regressions showed an extra hidden red color and extra
opponent-turn colors. Use the existing effective-color query instead, and
exclude hidden sources when constructing the continuous color grant.

The positive real evolution then exposed stale continuous state after placing
the blue source: the following reduction saw white/red but not the newly added
blue. Recompute continuous effects at the successful `placeUnder` boundary
before placement reactions and the next parent action. This keeps the common
effective-color source authoritative instead of rebuilding a card-specific
color union inside scaling.

Tests prove exact bottom ordering, hidden exclusion, opponent-turn behavior,
and the ordinary three-color positive. EX9-074's affected color cases and
placement/Training/Tamer/trigger-stack regressions accompany the change.
The broader per-color matching audit remains a separate delivery block.
