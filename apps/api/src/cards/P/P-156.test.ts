import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./P-156.js";

describe("P-156 Future Potential!", () => {
  it("offers the same-color play from hand or trash after choosing a Tamer", () => {
    const module = getEffectModule("P-156")!;
    const source = { ownerSeat: 0 } as never;
    const effects = module.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.description).toContain("same color");
  });

  it("registers color waiver and Security optional Tamer play", () => {
    const module = getEffectModule("P-156")!;
    expect(module.effectsForTiming(EffectTiming.None, { ownerSeat: 0 } as never)).toHaveLength(1);
    const security = module.effectsForTiming(EffectTiming.SecuritySkill, { ownerSeat: 0 } as never);
    expect(security).toHaveLength(1);
    expect(security[0]!.description).toContain("play 1 Tamer");
  });
});
