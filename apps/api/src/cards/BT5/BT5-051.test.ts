import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-051.js";

describe("BT5-051 MoriShellmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-051", as: "moriShellmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("moriShellmon").currentDP).toBe(s.perm("moriShellmon").baseDP);
  });

  it("is registered with complete, residual-free runtime coverage", () => {
    expect(getEffectModule("BT5-051")).toBeDefined();
    expect(runtimeCompiledCard("BT5-051")).toMatchObject({ coverage: "full", residual: [] });
  });
});
