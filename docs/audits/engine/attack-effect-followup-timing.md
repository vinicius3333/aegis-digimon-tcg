# Attack effect follow-up timing

## Open seam

An effect can declare an attack and continue with later actions at the attack
declaration boundary. EX13-077 Q7477 shows a remaining gap when a later `Battle` action
is selected before the attack's `When Attacking` effects finish resolving: the Battle
target is scanned against the current board, which can still be empty, and the action
then no-ops even though a nested trigger subsequently plays a valid opponent Digimon.

The observable reproduction is
`apps/api/src/cards/EX13/EX13-077.test.ts` Q7477. At the Battle target scan,
`BT1-013` is absent from the opponent's battle area; WaruSeadramon's attack effect
plays it later in the same EX13-077 `[On Play]` resolution. Its presence afterward
does not retroactively resume the already-completed Battle action.

## Scope and evidence

The Q7477 ruling says the chosen Battle can use a Digimon played after that effect
choice. The current WaruSeadramon fixture is an engine ordering probe, not full ruling
evidence: WaruSeadramon is controlled by the Merciful Mode player, while Q7477 specifies
an opponent-controlled producer. Local KB queries found no opponent-owned producer in
this fixture's exact attack sequence.

No production change is made. Deferring only the Battle action until after attack
triggers, while retaining its earlier modal choice, needs an explicit action-continuation
contract and proof against other clauses that continue at attack declaration. Moving all
remaining card actions after attack triggers changes when the Battle choice itself is
made. Keep Q7477 below full proof until the ordering contract and a ruling-faithful
opponent-controlled producer are established.
