# Attack effect follow-up timing

## Contract

An effect-directed attack can declare an attack and choose a later scaled modal branch
at the attack-declaration boundary. If that branch is a direct `Battle`, its defender
is selected after the attack completes. An opponent's immediate effect during the
attack can therefore play a Digimon that is eligible for the chosen Battle (EX13-077
Q7477). The number of scaled activations remains the snapshot taken at the modal's
activation; later choices are reevaluated in sequence after the first branch resolves
(Q7474/Q7476).

## Engine seam

The interpreter keeps the modal choice made during attack declaration and queues its
Battle branch until the attack's end. `CombatController` runs that continuation after
attack cleanup, so the later Battle reads the live board and can resolve as a separate
battle. The effect body's outer continuation remains active until the queued branch
finishes. Other attack timings and ordinary deletion reactions retain their existing
windows.

## Evidence

- `apps/api/src/cards/EX13/EX13-077.test.ts` Q7477 uses public EX13-077 On Play,
  AD1-025 Raid, and opponent BT9-050 Leomon (X Antibody). The Battle modal choice is
  recorded before BT9-050's immediate would-be-deleted-in-battle replacement plays
  BT1-035 Leomon. That exact new instance is live at the Battle activation prompt and
  leaves in the selected Battle after the first attack has resolved.
- EX13-077's scaled Battle/Recovery tests preserve sequential choice, snapshot count,
  and pending On Deletion behavior. The EX13 collection and engine regression suites
  pass without an expected failure.
