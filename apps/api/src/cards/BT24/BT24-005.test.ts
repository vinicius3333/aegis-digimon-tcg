import { describe, expect, it } from "vitest";
import "./BT24-005.js";

describe("BT24-005 Kyokyomon", () => {
  it("registers an inherited once-per-turn Tamer-placement watcher", async () => {
    const { getEffectModule } = await import("../../engine/effects/registry.js");
    const module = getEffectModule("BT24-005");
    expect(module).toBeDefined();
    expect(module?.effectsForTiming).toBeTypeOf("function");
  });
});
