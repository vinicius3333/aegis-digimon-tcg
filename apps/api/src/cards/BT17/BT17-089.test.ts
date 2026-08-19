import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { module } from "./BT17-089.js";

describe("BT17-089 Rhythm", () => {
  it("provides both suspension-triggered Your Turn effects", () => {
    const effects = module.effectsForTiming(EffectTiming.OnTappedAnyone, {} as never);
    expect(effects).toHaveLength(2);
    expect(effects[0]).toMatchObject({ optional: true });
    expect(effects[0]?.description).toContain("When an effect suspends one of your Digimon");
    expect(effects[1]?.description).toContain("When this Tamer becomes suspended");
  });

  it("provides the Security play effect", () => {
    const [effect] = module.effectsForTiming(EffectTiming.SecuritySkill, {} as never);
    expect(effect).toMatchObject({ isSecurity: true, description: expect.stringContaining("Play this card") });
  });
});
