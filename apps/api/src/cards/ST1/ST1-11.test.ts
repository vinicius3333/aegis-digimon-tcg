import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./ST1-11.js";

describe("ST1-11 WarGreymon", () => {
  it("registers one Security Attack per complete pair of sources as complete IR", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [{ trigger: "YourTurn", actions: [{ kind: "GainKeyword", scaling: { per: 2, unit: "digivolutionCards" } }] }],
    });
  });

  it("rounds down each pair of sources, including Digi-Egg cards, and only applies on its turn (Q605)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST1-11", as: "twoSources", under: ["ST1-01", "ST1-03"] },
          { card: "ST1-11", as: "threeSources", under: ["ST1-01", "ST1-03", "ST1-04"] },
          { card: "ST1-11", as: "fourSources", under: ["ST1-01", "ST1-03", "ST1-04", "ST1-05"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("twoSources"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("threeSources"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("fourSources"), "SecurityAttack")).toBe(2);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("twoSources"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("threeSources"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("fourSources"), "SecurityAttack")).toBe(0);
  });
});
