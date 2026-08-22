import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./BT15-002.js";

describe("BT15-002", () => {
  it("registers the inherited once-per-turn On Add to Hand DP effect", () => {
    const effects = getEffectModule("BT15-002")?.effectsForTiming(EffectTiming.OnAddHand, {} as never);
    expect(effects).toHaveLength(1);
    expect(effects?.[0]).toMatchObject({ isInherited: true, maxPerTurn: 1 });
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Hand",
      frequency: "OncePerTurn",
      actions: [{ condition: { kind: "triggerByYourDigimonEffect" }, amount: 1000 }],
    });
  });
});
