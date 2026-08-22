import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-027.js";

describe("BT5-027 MarineDevimon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-027", as: "marineDevimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("marineDevimon").currentDP).toBe(s.perm("marineDevimon").baseDP);
  });

  it("is registered with complete, residual-free runtime coverage", () => {
    expect(getEffectModule("BT5-027")).toBeDefined();
    expect(runtimeCompiledCard("BT5-027")).toMatchObject({ effects: [], coverage: "full", residual: [] });
  });
});
