import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT1-008.js";

describe("BT1-008 Frimon", () => {
  it("gives +2000 DP while the opponent has at least two suspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-008"] }] },
      1: {
        battleArea: [
          { card: "BT1-016", suspended: true },
          { card: "BT1-017", suspended: true },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("does not give +2000 DP with only one suspended opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-008"] }] },
      1: { battleArea: [{ card: "BT1-016", suspended: true }, "BT1-017"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("does not give +2000 DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-008"] }] },
      1: {
        battleArea: [
          { card: "BT1-016", suspended: true },
          { card: "BT1-017", suspended: true },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("does not count a suspended Digimon in the opponent's breeding area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-008"] }] },
      1: {
        battleArea: [{ card: "BT1-016", suspended: true }],
        breeding: { card: "BT1-017", suspended: true },
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
