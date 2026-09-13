import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT13-002.js";

describe("BT13-002 Chapmon", () => {
  it("gives its evolved stack +1000 DP during the opponent's turn while you have another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-030", as: "host", under: ["BT13-002"] },
          { card: "BT1-011", as: "other" },
        ],
      },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.perm("other").currentDP).toBe(s.perm("other").baseDP);
  });

  it("does not give the bonus during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-030", as: "host", under: ["BT13-002"] },
          { card: "BT1-011", as: "other" },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(3000);
  });

  it("does not count its own evolved stack as another Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT13-002"] }] },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(3000);
  });

  it("does not count a Digimon in the breeding area as another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-030", as: "host", under: ["BT13-002"] }],
        breeding: "BT1-011",
      },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(3000);
  });
});
