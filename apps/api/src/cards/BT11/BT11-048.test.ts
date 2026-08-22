import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT11-048.js";
describe("BT11-048 ModokiBetamon", () => {
  it("registers the vanilla card", () => {
    expect(getEffectModule("BT11-048")).toBeDefined();
  });
});
