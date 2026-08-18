import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT3-052.js";

describe("BT3-052 Rapidmon", () => {
  it("gives its host +1000 DP for each suspended opposing Digimon during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-054", as: "host", under: ["BT3-052"] }] },
      1: {
        battleArea: [
          { card: "BT1-019", suspended: true },
          { card: "BT1-019", suspended: true },
          { card: "BT1-019", suspended: false },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("does not apply the inherited bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-054", as: "host", under: ["BT3-052"] }] },
      1: { battleArea: [{ card: "BT1-019", suspended: true }] },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
