import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT22-067.js";

describe("BT22-067 LordKnightmon", () => {
  it("matches the printed card identity and keyword package", () => {
    expect(getCardDefinition("BT22-067")).toMatchObject({
      cardId: "BT22-067",
      nameEn: "LordKnightmon",
      colors: ["Black", "Red"],
      types: expect.arrayContaining(["CS"]),
      effectText: expect.stringContaining("1 of your Digimon gets +3000 DP"),
    });
  });

  it("registers effects for play, digivolving, ally player attacks, and continuous keywords", () => {
    const module = getEffectModule("BT22-067");
    expect(module).toBeDefined();
    const source = {} as never;
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(2);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnAllyAttack, source)).toHaveLength(1);
  });
});
