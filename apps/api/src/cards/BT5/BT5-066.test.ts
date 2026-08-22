import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-066.js";

describe("BT5-066 WaruMonzaemon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-066", as: "waruMonzaemon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("waruMonzaemon").currentDP).toBe(s.perm("waruMonzaemon").baseDP);
  });

  it("is registered with complete, residual-free runtime coverage", () => {
    expect(getEffectModule("BT5-066")).toBeDefined();
    expect(runtimeCompiledCard("BT5-066")).toMatchObject({ coverage: "full", residual: [] });
  });
});
