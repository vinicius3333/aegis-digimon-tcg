import type { GameState } from "@aegis/shared/schema/GameState";
import { evaluateSearchPosition } from "#api/bot/evolution/evaluateSearchPosition";
import { trainingObservation } from "#api/bot/training/observation";

export function getReplayAdvantage(state: GameState): number {
  const first = evaluateSearchPosition(trainingObservation(state, 0));
  const second = evaluateSearchPosition(trainingObservation(state, 1));
  return Math.round(((first + 1 - second) / 2) * 1000) / 1000;
}
