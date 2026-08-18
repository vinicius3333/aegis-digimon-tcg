import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-006.js";

describe("BT2-006 Tsumemon", () => {
  it("Q995 gives +2000 DP while another Digimon has the evolved host's name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-009", as: "host", under: ["BT2-006"] },
          { card: "BT2-009", as: "other" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("does not give +2000 DP for a differently named allied Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-009", as: "host", under: ["BT2-006"] },
          { card: "BT2-008", as: "different" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not count an opponent's Digimon with the same name", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-009", as: "host", under: ["BT2-006"] }] },
      1: { battleArea: ["BT2-009"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not give +2000 DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-009", as: "host", under: ["BT2-006"] }, "BT2-009"] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
