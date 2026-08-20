import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX7-061.js";

describe("EX7-061", () => {
  const source = { instanceId: "source", cardId: "EX7-061", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers two all-turns effects with once-per-turn protection and deletion response", () => {
    const effects = getEffectModule("EX7-061")!.effectsForTiming(EffectTiming.None, source);
    expect(effects).toHaveLength(2);
    expect(effects.map((effect) => effect.maxPerTurn)).toEqual([1, 1]);
  });
});
