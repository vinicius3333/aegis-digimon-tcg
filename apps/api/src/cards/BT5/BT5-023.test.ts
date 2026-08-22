import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-023.js";

describe("BT5-023 Gesomon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-023", as: "gesomon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("gesomon").currentDP).toBe(s.perm("gesomon").baseDP);
  });

  it("is registered with complete, residual-free runtime coverage", () => {
    expect(getEffectModule("BT5-023")).toBeDefined();
    expect(runtimeCompiledCard("BT5-023")).toMatchObject({ effects: [], coverage: "full", residual: [] });
  });
});
