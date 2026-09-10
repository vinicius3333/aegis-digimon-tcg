# EX7-010 Q3831 — breeding-area static-grant mechanism

## Conclusion

No shared engine fix is justified. The retained red was a false fixture, not a leaked
`GrantStatic` trait. EX7-010 is therefore closed at **8/10**, with Observable behavior **2/2**.

## Red diagnosis

The original breeding probe attempted to play EX7-066, which is a **red** Three Musketeers
Option. After `ready()`, the EX7-010 permanent was in `inBreeding` and the continuous ledger
contained no `Three Musketeers` grant for it. Nevertheless, `applyIntent(playCard)` returned
`{ ok: true }`.

That result is correct for the fixture. The engine's printed Option color check includes the
player's battle-area and breeding-area Digimon/Tamer color sources, matching the Official Rule
Manual's color-requirement wording. EX7-010 is red, so EX7-066 can be played from this position
without using EX7-010's effect-granted trait. The `ok: true` result does not prove that Q3831's
trait grant leaked into breeding.

The existing generic static path is already bounded correctly:

- `YourTurn` routes to `staticModifier`, whose default source guard requires battle-area
  residency.
- EX7-010's IR target independently carries `zone: "battleArea"`.
- The permanent matcher distinguishes `inBreeding` from `battleArea`.
- The mechanism regression reads `grantedTraits(deputy.permanentId)` after recompute and gets
  `[]` for the breeding source.

## Corrected proof

The public Q3831 negative now uses EX7-071, a **purple** Three Musketeers Option. Its own
conditional color waiver can only make the play legal when a Three Musketeers Digimon is
available. EX7-010 in breeding supplies neither a granted trait nor a purple color source, so
the public play is rejected with the exact reason `color-requirement-unmet`; its stack remains
empty. The battle-area positive remains EX7-066 and still proves the intended trait grant by
placing the Option under Deputymon.

The focused engine regression in
`apps/api/src/engine/cards/ex7BreedingStaticGrant.test.ts` asserts both the empty grant ledger
and the public rejection. No engine source file was changed in this lane, so no full engine
regression rerun was required by the coordinator checkpoint.

## Verification

- EX7-010 focused card suite: **11 passed**.
- Focused mechanism regression: **1 passed**.
- Typecheck: **passed** for shared, API, and web.
- Oxlint, Oxfmt, and `git diff --check` on the bounded files: **passed**.

No ledger/RUN/catalog/card-module/shared-engine edits, git writes, commits, or pushes were made
for this mechanism lane.
