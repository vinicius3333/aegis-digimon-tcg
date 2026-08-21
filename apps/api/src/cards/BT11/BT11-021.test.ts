import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT11-021.js";

describe("BT11-021 SnowGoblimon", () => {
  it("registers as a vanilla Digimon with no effects", () => {
    const module = getEffectModule("BT11-021");
    expect(module).toBeDefined();
  });
});
