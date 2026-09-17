import { ArraySchema } from "@colyseus/schema";
import type { PrimitivesEngine } from "./types.js";
import { CardKind, Permanent, CardInstance } from "@aegis/shared";
import type { CardDefinition, PlayerState } from "@aegis/shared";
import { placePermanent as appendPermanent, setTopCard } from "../../state/access.js";

/**
 * Putting a card on the board: what counts as a permanent, and where a new one goes.
 */

/** -1 sentinel (no play cost) is paid as 0 (source HasPlayCost). */
export function normalizeCost(playCost: number): number {
  return playCost < 0 ? 0 : playCost;
}

/** A Digimon, Tamer, or DigiEgg is a field permanent kind (source IsPermanent). */
export function isPermanentKind(definition: CardDefinition): boolean {
  return (
    definition.kinds.includes(CardKind.Digimon) ||
    definition.kinds.includes(CardKind.Tamer) ||
    definition.kinds.includes(CardKind.DigiEgg)
  );
}

/**
 * Create a new battle-area Permanent for `instance` and append it to `owner`'s battle
 * area. DP is seeded from the definition for Digimon (0 otherwise). Mirrors the
 * placement half of rule implementation (and matches the play-card action's placePermanent
 * so the two cannot diverge).
 */
export function placePermanent(
  engine: PrimitivesEngine,
  owner: PlayerState,
  instance: CardInstance,
  definition: CardDefinition,
  suspended: boolean,
): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = engine.nextPermanentId();
  permanent.controllerSeat = owner.seat;
  setTopCard(permanent, instance);
  permanent.stack = new ArraySchema<CardInstance>();
  permanent.linked = new ArraySchema<CardInstance>();
  const dp = definition.kinds.includes(CardKind.Digimon) ? definition.dp : 0;
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  permanent.isSuspended = suspended;
  permanent.inBreeding = false;
  permanent.enterFieldTurnCount = engine.state.turnCount;
  appendPermanent(owner, permanent);
  engine.modifiers.recomputeDP(engine.state, permanent.permanentId);
  return permanent;
}
