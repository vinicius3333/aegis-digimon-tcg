import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { EffectTiming } from "@aegis/shared";
import "../index.js";

describe("BT24-044 Muchomon", () => {
  it("exposes the optional On Play effect and inherited battle-delete memory effect", () => {
    const module = getEffectModule("BT24-044");
    const onPlay = module?.effectsForTiming(EffectTiming.OnPlay, {} as never)?.[0];
    expect(onPlay?.optional).toBe(true);
    const inherited = module?.effectsForTiming(EffectTiming.OnBattleDeleteOpponent, {} as never)?.[0];
    expect(inherited?.isInherited).toBe(true);
    expect(inherited?.maxPerTurn).toBe(1);
  });
});
