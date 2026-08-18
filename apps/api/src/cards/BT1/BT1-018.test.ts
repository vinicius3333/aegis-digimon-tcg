import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-018.js";

describe("BT1-018 Flarerizamon", () => {
  it("gains Security Attack +1 while its controller has 3 or more memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-018", as: "digimon" }] } });
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "SecurityAttack")).toBe(true);
  });
});
