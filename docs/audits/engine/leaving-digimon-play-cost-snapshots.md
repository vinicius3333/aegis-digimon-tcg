# Leaving-Digimon play-cost snapshots

## Contract

An effect whose play-cost filter is relative to a Digimon that leaves play must
use that Digimon's last-known card information. Its delayed body can resolve
after the permanent has left the battle area, so a live permanent lookup alone
is insufficient.

## Correction

Both deletion and return producers now attach the leaving permanent snapshot
and top card ID to `whenLeavesPlay`. Pending `PlayFromZone` bodies can therefore
evaluate `playCost.relativeToLeavingDigimon` after movement without weakening
the existing source-residency rules.

## Behavioral proof

`relativeToLeavingDigimon.test.ts` deletes a play-cost-2 and a play-cost-3
Digimon through a `deleteOwn` processing cost. In each case the pending watcher
plays exactly the Reptile whose printed play cost is one higher and rejects the
other candidate.
