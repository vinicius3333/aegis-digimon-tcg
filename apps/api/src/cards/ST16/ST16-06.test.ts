import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST16-06.js";

describe("ST16-06 Bakemon", () => {
  it("surfaces its printed Blocker keyword on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST16-06", as: "bakemon" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("bakemon"), "Blocker")).toBe(true);
  });
});
