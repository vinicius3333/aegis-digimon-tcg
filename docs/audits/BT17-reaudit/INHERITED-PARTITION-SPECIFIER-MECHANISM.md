# Granted ＜Partition＞ reads its specifier from the granting card (BT17-097, Q2889)

## Symptom

A Digimon whose ＜Partition＞ comes from a BT16-025 sitting in its DIGIVOLUTION CARDS (top
card BT12-030, which prints no Partition) never offered the reaction when it left the battle
area. Q2889 says the specified blue Lv.4 and green Lv.4 cards are played from the stack.

## Root cause

`partitionCandidates` in `apps/api/src/engine/effects/primitives.ts` gates on
`continuous.hasKeyword(permanentId, "Partition")`, which correctly accepts the inherited
grant, and then reads the specifier with `partitionSpecOf(perm.topCard.cardId)`. The
specifier is printed on the GRANTING card, so with a non-holder on top it came back
undefined and the candidate was dropped.

`partitionSpecOf` compounded it by scanning `effectText` only. A digivolution card's copy of
the marker is in `inheritedEffectText` — the reminder-worded "(When this Digimon with each of
the specified digivolution cards would leave the battle area ...)" — so even a direct lookup
against the granting card would have missed it for cards that print it there alone.

## Fix

- `combat/keywords.ts` `partitionSpecOf`: scan `effectText`, then `inheritedEffectText`.
- `effects/primitives.ts` `partitionCandidates`: when the top card yields no specifier, take
  the first one found among the permanent's digivolution cards.

The keyword gate is unchanged, so a permanent that does not actually have ＜Partition＞ is
still never considered; this only supplies the specifier for one the continuous tier has
already said holds the keyword.

## Evidence

```
pnpm --filter @aegis/api exec vitest run src/cards/BT17/BT17-097.test.ts --maxWorkers=1 --no-file-parallelism
Tests  14 passed | 1 expected fail (15)   # red
Tests  15 passed (15)                     # green
```
