import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-055.js";

describe("BT3-055 Dinobeemon", () => {
  it("has Piercing and Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-055", as: "dinobeemon" }] } });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasPierce(s.perm("dinobeemon"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("dinobeemon"), "Jamming")).toBe(true);
  });
});
