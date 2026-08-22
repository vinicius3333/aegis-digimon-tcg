import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT11-075.js";
describe("BT11-075 DoKunemon", () => {
  it("registers the vanilla card", () => {
    expect(getEffectModule("BT11-075")).toBeDefined();
  });
});
