import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-054.js";

describe("BT5-054 Piximon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-054", as: "piximon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("piximon").currentDP).toBe(s.perm("piximon").baseDP);
  });

  it("is registered with complete, residual-free runtime coverage", () => {
    expect(getEffectModule("BT5-054")).toBeDefined();
    expect(runtimeCompiledCard("BT5-054")).toMatchObject({ coverage: "full", residual: [] });
  });
});
