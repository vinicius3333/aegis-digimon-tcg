import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT11-026.js";
describe("BT11-026 Hyogamon", () => {
  it("registers the vanilla card", () => {
    expect(getEffectModule("BT11-026")).toBeDefined();
  });
});
