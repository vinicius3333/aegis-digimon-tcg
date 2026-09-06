# BT20-096 trash Main activation diagnosis

## Observed failure

The public BT20-096 case puts Black Sabbath in the trash with four cards in hand and memory 10, advances to the owner's real Main phase, and reads the source card's `activatableEffectsJson`. The list is empty, so the test cannot reach the printed six-memory return-to-deck cost.

## Cause

`irCardModule` computes `isOptionPlayBody` for the first plain `Main` effect of every Option. “Plain” currently excludes only Security and Delay effects. BT20-096's first `Main` effect is its `[Trash][Main]` clause (`isFromTrash: true`), so it is incorrectly marked as the Option's ordinary play body. `timingsForTrigger` therefore routes it only to `OnUseOption` and omits `OnDeclaration`, which is the timing used by `activateEffect` and by the trash activation projection. The later ordinary `[Main]` clause is then treated as the play body instead.

This is a registration/timing classification defect, not a hand-size or memory affordability failure. The `activated` builder already has the correct `isFromTrash` residency guard, and `syncActivatableEffects` already scans the turn player's trash. Q4438 confirms that the effect is activatable only while the card is actually in trash.

## Minimal proposed fix

Change the `isPlainMain` predicate in `apps/api/src/engine/effects/interpreter/registration/module.ts` so a trash-resident Main clause is not eligible to become an Option play body:

```ts
const isPlainMain = (e: CardEffect): boolean =>
  e.trigger === "Main" &&
  !e.isSecurity &&
  !e.isFromTrash &&
  !(e.keywords ?? []).some((kw) => kw.keyword === "Delay");
```

With that classification, BT20-096's trash clause remains available at `OnDeclaration` and the ordinary hand-play clause remains the sole `OnUseOption` body. The existing `isFromTrash` activation guard then requires the physical trash instance, while the clause's hand-count condition and six-memory return cost are evaluated during activation/resolution. The fix should preserve the existing rule that a normal Option play body does not re-activate from its newly placed permanent.

## Verification fixture

The existing BT20-096 public fixture is sufficient after the registration fix: source in trash, exactly four hand cards or fewer, memory 10, one unsuspended opposing Digimon, and a spare deck. Obtain the projected activation entry, activate it through `activateEffect`, assert memory decreases by 6, the exact source instance is at the bottom of the owner's deck, and only the unsuspended opposing target is deleted. The five-card negative must continue to expose no usable activation and leave memory/source/target unchanged.

No engine or card module was edited here; coordinator owns implementation and execution.
