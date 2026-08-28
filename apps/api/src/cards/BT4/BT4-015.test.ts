import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-015.js";

describe("BT4-015 Volcdramon", () => {
  it("gives Security Attack +1 to its host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-018", as: "host", under: ["BT4-015"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
