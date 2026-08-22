import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-052.js";

describe("BT5-052 Garbagemon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-052", as: "garbagemon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("garbagemon").baseDP).toBe(8000);
    expect(s.perm("garbagemon").currentDP).toBe(8000);
  });
  it("is registered with complete, residual-free runtime coverage", () => {
    expect(getEffectModule("BT5-052")).toBeDefined();
    expect(runtimeCompiledCard("BT5-052")).toMatchObject({ coverage: "full", residual: [] });
  });
});
