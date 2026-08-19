import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "../index.js";

describe("BT24-066 Guilmon", () => {
  it("models the reveal/search/trash On Play and inherited level-3 deletion", () => {
    const module = getEffectModule("BT24-066");
    const source = {} as never;
    const onPlay = module?.effectsForTiming(EffectTiming.OnPlay, source)?.[0];
    expect(onPlay?.description).toContain("qualifying trait card");
    const inherited = module?.effectsForTiming(EffectTiming.OnUseAttack, source)?.[0];
    expect(inherited?.isInherited).toBe(true);
    expect(inherited?.maxPerTurn).toBe(1);
  });
});
