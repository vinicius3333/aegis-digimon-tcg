import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "../../cards/index.js";

describe("BT26-038 Kuwagamon", () => {
  it("installs the inherited when-battle-won digivolution watcher", () => {
    const module = getEffectModule("BT26-038");
    expect(module).toBeDefined();
    const source = { cardId: "BT26-038", instanceId: "test", ownerSeat: 0, permanent: () => undefined, isOnBattleArea: () => true } as never;
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    expect(effects.some((effect) => effect.effectKey.includes("battle-won-digivolve") && effect.isInherited)).toBe(true);
  });
});
