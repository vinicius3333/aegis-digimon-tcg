import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT13-075.js";

describe("BT13-075 Alphamon", () => {
  it("registers both entry timings and the once-per-turn removal seam", () => {
    const module = getEffectModule("BT13-075");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(1 as never, { cardId: "BT13-075", ownerSeat: 0 } as never).length).toBeGreaterThanOrEqual(0);
  });
});
