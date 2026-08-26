// Mapping the IR's duration markers onto the engine's EffectDuration.

import { EffectDuration } from "@aegis/shared";
import type { EffectDurationRef } from "@aegis/shared";

// ---------------------------------------------------------------------------
// Duration mapping (IR -> engine EffectDuration)
// ---------------------------------------------------------------------------

export function toDuration(ref: EffectDurationRef): EffectDuration {
  switch (ref) {
    case "forTheTurn":
      return EffectDuration.UntilEachTurnEnd;
    case "forTheAttack":
    case "forThisAttack":
      return EffectDuration.UntilEndAttack;
    case "untilYourTurnEnd":
      return EffectDuration.UntilOwnerTurnEnd;
    case "untilOpponentTurnEnd":
      return EffectDuration.UntilOpponentTurnEnd;
    case "untilOpponentNextTurnEnd":
      return EffectDuration.UntilNextOpponentTurnEnd;
    case "endOfOpponentTurn":
      return EffectDuration.UntilOpponentTurnEnd;
    case "untilEndOfAttack":
      return EffectDuration.UntilEndAttack;
    case "untilEndOfBattle":
      return EffectDuration.UntilEndBattle;
    case "untilOpponentNextUnsuspendPhase":
      return EffectDuration.UntilNextUntap;
    case "permanent":
      // A genuine name/trait/color grant from a resolved effect must survive turn
      // boundaries (WR-03 / ENG-02); it is never cleared by the boundary sweep.
      return EffectDuration.Permanent;
    default:
      return EffectDuration.UntilEachTurnEnd;
  }
}

/** Resolve "opponent's next turn" relative to the turn in which the source acts. */
export function toSourceRelativeDuration(ref: EffectDurationRef, isOwnersTurn: boolean): EffectDuration {
  if (ref === "untilOpponentNextTurnEnd" && isOwnersTurn) return EffectDuration.UntilOpponentTurnEnd;
  return toDuration(ref);
}
