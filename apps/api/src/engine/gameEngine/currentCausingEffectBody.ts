import type { GameEngine } from "#api/engine/GameEngine";

export function currentCausingEffectBody(engine: GameEngine): number | undefined {
  return engine.effectBodyTokens.at(-1) ?? engine.activeWindowToken;
}
