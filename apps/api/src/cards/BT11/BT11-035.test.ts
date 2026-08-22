import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT11-035.js";
describe("BT11-035 ClearAgumon", () => {
  it("registers the vanilla card", () => {
    expect(getEffectModule("BT11-035")).toBeDefined();
  });
});
