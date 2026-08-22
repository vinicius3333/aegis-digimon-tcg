import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT11-051.js";
describe("BT11-051 Ogremon", () => {
  it("registers the vanilla card", () => {
    expect(getEffectModule("BT11-051")).toBeDefined();
  });
});
