import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-077.js";

describe("BT5-077 Vajramon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-077", as: "vajramon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("vajramon").currentDP).toBe(s.perm("vajramon").baseDP);
  });

  it("is registered with complete, residual-free runtime coverage", () => {
    expect(getEffectModule("BT5-077")).toBeDefined();
    expect(runtimeCompiledCard("BT5-077")).toMatchObject({ coverage: "full", residual: [] });
  });
});
