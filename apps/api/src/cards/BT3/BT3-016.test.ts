import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-016.js";

describe("BT3-016 Durandamon", () => {
  it("grants Piercing to its host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-084", as: "host", under: ["BT3-016"] }] } });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
  });
});
