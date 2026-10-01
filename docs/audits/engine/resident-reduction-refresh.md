---
title: Resident cost-reduction refresh
updated: 2026-09-28
---

# Resident cost-reduction refresh

A resident cost reducer (a battle-area or breeding-area `wouldBePlayed` / `wouldDigivolve` `reduceCost` replacement) is registered again in every payment window. Its amount is computed at registration, so a scaled clause such as "further reduce it by 1 for each of this Digimon's digivolution cards" stores the board count at that moment.

`SubTriggerRegistry.subscribeReplacement` deduplicates registrations by source and activation identity. It used to return the existing record unchanged. An earlier payment window (any play by the same seat, including a card the reducer does not apply to) therefore left the old count in place, and a later Royal Knight play charged it.

Discord bug 1554297556551340062 and match `dd487753-8aff-4566-ae00-154cddc7dfe3` (2026-09-29, `/opt/aegis-rollout/logs`) show four King Drasil_7D6 (BT13-007) plays, each charging the source count from the previous registration:

| Time (UTC) | Played                             | Sources | Charged | Correct |
| ---------- | ---------------------------------- | ------- | ------- | ------- |
| 01:00:26   | EX13-014 Jesmon (12)               | 2       | 7       | 6       |
| 01:06:10   | EX13-014 Jesmon (12)               | 5       | 6       | 3       |
| 01:12:16   | EX13-023 UlforceVeedramon (12)     | 8       | 2       | 0       |
| 01:14:10   | BT20-102 Omnimon (X Antibody) (16) | 10      | 4       | 2       |

The reporter's reading ("only counts differently named sources") matched the first two plays by coincidence. The same-name King Drasil eggs are counted once the reducer is fresh.

## Fix

When a resident reduction is registered again, the fresh record replaces the existing one and keeps its id. The amount and the closures that capture the registration context then describe the current board. Non-resident triggered grants keep their first registration.

## Proof

- `subtriggers.test.ts`: re-registering a resident reduction replaces its amount.
- `BT13-007.test.ts`: two same-name egg sources after an earlier play charge Jesmon 6 (pre-fix 7); three eggs and a Jesmon source charge 4 (pre-fix 6). The existing next-turn reset test expected the stale count (cost 2 with three sources) and now expects cost 0.
- `EX2-007.test.ts`: Mother D-Reaper counts an ADR-02 Searcher placed after an earlier play (cost 1, pre-fix 2).
- `bt13KingDrasilSourceCountScenario.test.ts` and `/dev/arena?scenario=arena-bt13-king-drasil-source-count`: Omekamon's play registers the reducer, its On Play adds a fourth source, and Jesmon then costs 4 (memory 5 to 1; pre-fix 5 to 0).

Other scaled resident reducers share the same seam: EX2-007 (checked above), and the `YourTurn` digivolve reducers BT11-064 and P-076, whose amount scales with the destination's colors through `amountForInto` and is unaffected by board drift.
