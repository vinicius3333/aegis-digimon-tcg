import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-048.js";

describe("BT5-048 Floramon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-048", as: "floramon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("floramon").currentDP).toBe(s.perm("floramon").baseDP);
  });

  it("is registered with complete, residual-free runtime coverage", () => {
    expect(getEffectModule("BT5-048")).toBeDefined();
    expect(runtimeCompiledCard("BT5-048")).toMatchObject({ coverage: "full", residual: [] });
  });
});
