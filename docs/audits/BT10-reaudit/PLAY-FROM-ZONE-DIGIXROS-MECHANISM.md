# BT10 PlayFromZone DigiXros mechanism

## Named seam

The affected path is an effect-driven `PlayFromZone` action with
`digiXrosMaterialsFrom: ["trash"]`:

```text
BT10-104 Immortal Ruler (Main)
  -> play BT10-066 DarkKnightmon from trash
  -> select DigiXros materials from trash
  -> play the selected card and resolve its On Play window
```

The reusable engine seam is `GameEngine.fireEnteredByEffectTiming` in
`apps/api/src/engine/GameEngine.ts`. `playInstances` already computes the
selected material count and passes it as `digiXrosMaterialCount`; the On Play
branch must preserve that field when it calls `firePlayEntryWindows`.

## Catalog and rules behavior

- BT10-104 is a Black Option whose Main effect trashes the top three cards of
  its controller's deck, then may play one DarkKnightmon from the trash,
  paying its cost and allowing DigiXros materials to be selected from the
  trash.
- BT10-066 has `[DigiXros -2] [SkullKnightmon] x [DeadlyAxemon]`. Its On Play
  effect De-Digivolves one opponent Digimon, then deletes one opponent
  Digimon with play cost 5 or less **if DigiXrosing with 2 cards**.
- Comprehensive rule reference `comprehensive-0117` (§7-2-2-10) defines the
  count gate in terms of the actual number of material cards placed. Two
  selected materials therefore make `digiXrosCount >= 2` true even when the
  played card came from the trash through an effect.

## Red symptom

The retained deck gauntlet,
`apps/api/src/cards/BT10/darkknightmon-nene-immortal-ruler-deck.test.ts`,
proved that BT10-104 selected the exact two trash materials and placed them
under BT10-066, but the opponent's post-De-Digivolve target remained in play.
The pre-fix command was:

```bash
pnpm --filter @aegis/api exec vitest run \
  src/cards/BT10/darkknightmon-nene-immortal-ruler-deck.test.ts \
  --no-file-parallelism --maxWorkers=1
```

It failed at the assertion that the opponent's target had entered the trash.
This distinguished the problem from material selection or placement: the
stack was correct, while only the conditional On Play clause was missing.

## Exact root cause and minimal fix

`fireEnteredByEffectTiming` forwarded `digiXrosMaterialCount` in its generic
timing branch but omitted it in the `EffectTiming.OnPlay` branch. That branch
called `firePlayEntryWindows` with `enteredByEffect` and other entry metadata,
but no material count. The condition interpreter consequently read
`(ctx.trigger.digiXrosMaterialCount ?? 0)`, saw zero, and correctly skipped
BT10-066's conditional Delete action.

The minimal fix forwards the existing optional field unchanged in the On Play
payload. No card module, DigiXros recipe, material picker, or condition logic
was changed.

## Mutation rationale

The focused regression is
`apps/api/src/engine/playFromZoneDigiXrosCount.test.ts`. It uses the real
BT10-104 -> BT10-066 route, selects `[SkullKnightmon]` and `[DeadlyAxemon]`
from trash, asserts both materials are attached, and asserts that the
opponent's Digimon is deleted.

Mutation: remove the `digiXrosMaterialCount` spread from the On Play call in
`fireEnteredByEffectTiming`. Under that mutation, both materials still attach,
but the final deletion assertion fails because the On Play trigger sees an
unset count. This proves the test is sensitive to the intended engine seam,
not merely to material movement.

## Focused evidence

```text
pnpm --filter @aegis/api exec vitest run \
  src/engine/playFromZoneDigiXrosCount.test.ts \
  --no-file-parallelism --maxWorkers=1
  1 test passed

pnpm --filter @aegis/api exec vitest run \
  src/engine/conformance/ch07-playing-a-card.test.ts \
  --no-file-parallelism --maxWorkers=1
  20 tests passed

pnpm --filter @aegis/api exec vitest run \
  src/cards/BT10/BT10-066.test.ts src/cards/BT10/BT10-104.test.ts \
  --no-file-parallelism --maxWorkers=1
  14 tests passed
```

The repository-wide `pnpm typecheck` attempt was blocked by pre-existing
worktree dependency resolution failures (`vitest` and `@colyseus/schema` were
not found while building `@aegis/shared`).
