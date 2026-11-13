import type { GameEngine } from "../GameEngine.js";
import { prospectiveColorWaiver } from "#api/engine/effects/interpreter/actions/prospectiveColorWaiver";
import { buildEffectContext, cardSourceOf } from "#api/engine/gameEngine/effectContext";

export function printedHandColorWaiver(engine: GameEngine, instanceId: string): boolean {
  for (const player of engine.state.players) {
    const card = player?.hand.find((handCard) => handCard.instanceId === instanceId);
    if (card !== undefined)
      return prospectiveColorWaiver(buildEffectContext(engine, cardSourceOf(engine, card), {}), card);
  }
  return false;
}
