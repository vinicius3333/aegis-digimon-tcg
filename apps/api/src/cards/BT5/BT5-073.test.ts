import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-073.js";

describe("BT5-073 Pillomon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-073", as: "pillomon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("pillomon").currentDP).toBe(s.perm("pillomon").baseDP);
  });

  it("is registered with complete, residual-free runtime coverage", () => {
    expect(getEffectModule("BT5-073")).toBeDefined();
    expect(runtimeCompiledCard("BT5-073")).toMatchObject({ coverage: "full", residual: [] });
  });
});
