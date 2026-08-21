import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT25-054.js";

describe("BT25-054 GreatGrizzlymon", () => {
  it("registers the blocker and both battle-area timing windows", () => {
    expect(getCardDefinition("BT25-054")).toMatchObject({ nameEn: "GreatGrizzlymon", level: 5, playCost: 8 });
    const module = getEffectModule("BT25-054")!;
    expect(module.cardId).toBe("BT25-054");
    expect(module.effectsForTiming(EffectTiming.OnPlay, {} as never)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, {} as never)).toHaveLength(1);
  });
});
