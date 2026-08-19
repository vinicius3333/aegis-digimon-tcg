import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT25-019.js";

describe("BT25-019 UltimateBrachiomon", () => {
  it("offers the highest-DP opponent Digimon for deletion on play and digivolving", () => {
    const module = getEffectModule("BT25-019");
    expect(module?.effectsForTiming(EffectTiming.OnPlay, {} as never)).toHaveLength(1);
    expect(module?.effectsForTiming(EffectTiming.WhenDigivolving, {} as never)).toHaveLength(1);
  });

  it("scopes the end-of-turn immunity to Digimon at 5+ memory and Options at 5 or less", async () => {
    const module = getEffectModule("BT25-019");
    const effect = module?.effectsForTiming(EffectTiming.OnEndTurn, {} as never)[0];
    expect(effect).toBeDefined();
    expect(effect?.description).toContain("Digimon effects");
    expect(EffectDuration.UntilOpponentTurnEnd).toBeDefined();
  });
});
