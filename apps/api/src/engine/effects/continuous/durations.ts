import { EffectDuration, type Seat } from "@aegis/shared";
import type { DurationBoundary } from "../modifiers.js";

/**
 * Which boundary sweep clears which duration.
 */

/** Which boundary clears a continuous duration (mirrors modifiers.clearsAt). */
export function clearsAt(
  duration: EffectDuration,
  boundary: DurationBoundary,
  ownerSeat: Seat,
  sweepSeat: Seat,
): boolean {
  switch (duration) {
    case EffectDuration.UntilOwnerTurnEnd:
      return (boundary === "ownerTurnEnd" || boundary === "eachTurnEnd") && ownerSeat === sweepSeat;
    case EffectDuration.UntilOpponentTurnEnd:
      return (
        (boundary === "ownerTurnEnd" || boundary === "opponentTurnEnd" || boundary === "eachTurnEnd") &&
        ownerSeat !== sweepSeat
      );
    case EffectDuration.UntilEachTurnEnd:
      return boundary === "eachTurnEnd" || boundary === "ownerTurnEnd" || boundary === "opponentTurnEnd";
    case EffectDuration.UntilEndAttack:
      return boundary === "endAttack";
    case EffectDuration.UntilEndBattle:
      return boundary === "endBattle";
    case EffectDuration.UntilOwnerActivePhase:
      return boundary === "ownerActivePhase" && ownerSeat === sweepSeat;
    case EffectDuration.UntilNextUntap:
      return boundary === "nextUntap" && ownerSeat === sweepSeat;
    case EffectDuration.UntilCalculateFixedCost:
      return boundary === "ownerTurnEnd" || boundary === "opponentTurnEnd" || boundary === "eachTurnEnd";
    case EffectDuration.Permanent:
      // A genuinely-permanent grant is never cleared by any boundary sweep (WR-03 / ENG-02).
      return false;
    default:
      return false;
  }
}
