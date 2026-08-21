import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-046.js";

describe("BT18-046 Waspmon", () => {
  it("grants Insectoid and prevents only qualifying opposing Digimon from attacking players", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-046", as: "waspmon" }] },
      1: {
        battleArea: [
          { card: "BT1-030", as: "smaller", dp: 3000 },
          { card: "BT1-030", as: "larger", dp: 5000 },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("waspmon"), "Insectoid")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("smaller"), "attackPlayers")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("larger"), "attackPlayers")).toBe(false);
  });
});
