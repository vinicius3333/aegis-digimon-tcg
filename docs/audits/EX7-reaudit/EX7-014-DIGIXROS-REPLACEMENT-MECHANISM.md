# EX7-014 Q3836/Q6718 — DigiXros replacement identity mechanism

Lane scope: EX7-014 only. No git write was performed.

## Contract

When EX7-014 is selected as an EX3-014 DigiXros material, its All Turns replacement may
activate because the departure is not by its controller's effect. The replacement card is
played from hand without cost and is not retroactively included in the already-selected
DigiXros materials (Q3836, Q6718).

## Red reproduction

The public `EX7-014.test.ts` DigiXros case was temporarily run as an ordinary test.
Independently, the assertion at line 514 failed because ST5-07 was not present as a
separate battle-area permanent after the DigiXros. This was a generic engine seam, not a
fixture-direction error.

## Root cause

`applyDigiXros` relocated a field material through the synchronous relocation dependency
without first consulting leave-play replacements. That bypassed EX7-014's replacement
entirely. The replacement also needs player-action provenance: a DigiXros declaration is
the player's action, so an `otherThanYourEffect` replacement must not be classified as the
player's own effect.

## Narrow fix and regression

The DigiXros dependency now optionally routes field-material relocation through an async
engine callback. The callback consults leave prevention with `playerAction: true`, rejects
the relocation if replaced, and otherwise delegates to the existing canonical relocation
primitive. The optional dependency preserves compatibility for direct callers that only
provide the existing synchronous dependency. Leave-prevention's new provenance option is
optional and leaves existing effect callers unchanged.

The mechanism regression uses a real EX3-014 DigiXros with EX7-014 as a selected field
material and ST5-07 as the matching replacement. It asserts all selected material
instances are on the EX3-014 stack, ST5-07 is a separate battle permanent, and ST5-07 is
not in the Xros stack. The test carries a `FAILS-WHEN-REVERTED` note for the bypass.

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

## Closeout review correction

The collection closeout review found that `applyDigiXros` ignored a `false` result from
the replacement-aware relocation callback. An outright leave prevention could therefore
leave the selected permanent in play while still reporting it as placed, retaining its
cost reduction, and including it in the On Play material count.

The action now records only successfully relocated materials. For each prevented field
move it restores that card's reduction to the paid play cost and passes the actual placed
count to On Play. A focused public-intent regression forces the production dependency's
prevented-relocation result and proves the field material remains in play, the DigiXros
stack remains empty, and BT10-061 pays its full printed cost.
