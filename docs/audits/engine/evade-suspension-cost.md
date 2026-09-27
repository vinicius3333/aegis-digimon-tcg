---
title: Evade suspension-cost audit
updated: 2026-09-27
---

# Evade and suspension costs

Discord report `1553846366260699166` describes an old Wingdramon using Evade while
it could not suspend. The committed catalog has four Wingdramon cards; only
`EX3-020` prints Evade. The report does not identify the card that imposed the
suspension prohibition, so the public reproduction uses `P-161` Bishop Device
as an explicit representative, followed by `BT11-097` Crimson Flare. The
`arena-ex3-wingdramon-evade-suspend-lock` layout exposes this sequence in
`/dev/arena`.

Comprehensive Rules §16-22-1/-3 (`data/kb/rules/comprehensive.md`) make
suspension the optional processing condition for Evade's deletion prevention.
When Bishop Device's printed "can't suspend" restriction is active, the cost
cannot be paid. Before the fix, the public effect-deletion and Raid-battle
cases both opened `evadePrompt` despite the restriction. An unrestricted
Wingdramon was correctly prompted, could accept, suspended, and survived.

`combat/legality.canPaySuspendCost` now reads the same continuous suspension
restriction used for attack and block legality. Effect deletion and battle
deletion check it before offering Evade; battle resolution checks it again
before paying. The same missing cost gate was reproduced for Alliance: a
restricted ally was offered in `alliancePrompt`. Both the combined and legacy
Alliance paths now exclude that ally. A paired unrestricted ally still pays
Alliance by suspending. Attack-declaration suspension remains on its existing
rules path.

Proof: `apps/api/src/engine/evadeCannotSuspendScenario.test.ts` runs public
`playCard` and `attack` intents for the printed cards, including the dev arena
layout. It covers unrestricted Evade, restricted effect-deletion Evade,
restricted Raid-battle Evade, restricted Alliance, and unrestricted Alliance.
At the time of the initial reproduction, the restricting card and exact
battle/deletion sequence were unknown, so Bishop Device established the
mechanism without claiming to reconstruct the match.

Subsequent read-only production logs identified `EX13-021` Wingdramon as the
actual suspension-lock source. Its effect was applied to `EX3-020` Wingdramon;
the server then issued `evadePrompt` and resolved the accepted Evade. The
`arena-ex13-wingdramon-evade-suspend-lock` layout now uses `EX13-021` to trash
both digivolution sources and prevent `EX3-020` from suspending before Crimson
Flare attempts deletion. This exact-card regression fails at the illegal
`evadePrompt` with the original engine files and passes with the shared cost
gate. The live match's deletion source is not reconstructed by this scenario.

The broader `mechanic.test.ts` run still fails its unrelated BT14-083
`TrashDigivolution` assertion at line 462. The isolated test fails the same
way with the modified engine files temporarily restored to `HEAD`.
