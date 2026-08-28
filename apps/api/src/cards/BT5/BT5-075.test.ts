import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-075.js";

describe("BT5-075 Musyamon", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-075")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-075", as: "musya", under: ["BT5-073"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("musya"), "Jamming")).toBe(true);
  });
});
