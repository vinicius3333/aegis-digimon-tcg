# EX7-014 Q3835/Q6509 — breeding move restriction mechanism

Lane scope: EX7-014 only. No git write was performed.

## Contract

EX7-014's When Digivolving effect restricts the opponent from playing or moving Digimon
with 6000 DP or less until the end of that opponent's turn. Q3835 and Q6509 specifically
apply the restriction to an opponent effect that moves P-143 into breeding at end of turn.

## Red reproduction

The public `EX7-014.test.ts` case was temporarily run as an ordinary test. Independently,
the assertion at line 476 failed: P-143 was found in seat 1's breeding area after its
end-turn move. The card restriction was present; the failure was in the generic movement
path, not the fixture direction.

## Root cause

`PrimitivesEngine.movePermanentZone(..., "toBreeding")` checked leave-battle-area
restrictions but did not consult the continuous play/move blocker. Consequently an
effect-driven move bypassed `RestrictPlay` even though the restriction mode was
`playOrMove`.

## Narrow fix and regression

The primitive now resolves the effect seat (`effectSeatStack` with permanent-owner
fallback) and calls `continuous.isPlayBlocked(effectSeat, card, "move", true)` before
extracting the permanent. The prior leave-restriction check and canonical move emission
remain unchanged.

`apps/api/src/engine/cards/ex7VolcanicdramonMechanism.test.ts` adds a generic regression
that creates the restriction through a real EX7-014 digivolution and drives the real turn
loop. It asserts P-143 remains in battle and breeding is empty. The test is marked with a
`FAILS-WHEN-REVERTED` note tied to removing the new gate.

## Evidence

```text
Independent pre-fix red: 1 expected fail, 10 skipped
Mechanism regression after fix: 1/1 passed
Public EX7-014 lane after fix: 11/11 passed
Affected six-file suite: 420/420 passed
Full src/engine regression: 261 files, 7303/7303 passed
Oxlint: PASS
Oxfmt --check: PASS
git diff --check: PASS
```

The workspace `pnpm typecheck` passes for shared, web, and API with no diagnostics.
