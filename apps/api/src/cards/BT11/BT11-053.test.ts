import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT11-053.js";
describe("BT11-053 Digitamamon", () => {
  it("registers the vanilla card", () => {
    expect(getEffectModule("BT11-053")).toBeDefined();
  });
});
