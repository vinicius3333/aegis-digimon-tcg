import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT1-004.js";

describe("BT1-004 Wanyamon", () => {
  it("gives +2000 DP while the opponent has at least two source-less Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "host", dp: 5000, under: ["BT1-004"] }] },
      1: { battleArea: ["BT1-016", "BT1-017"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("does not give +2000 DP with only one source-less opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "host", dp: 5000, under: ["BT1-004"] }] },
      1: { battleArea: ["BT1-016"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("does not give +2000 DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "host", dp: 5000, under: ["BT1-004"] }] },
      1: { battleArea: ["BT1-016", "BT1-017"] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("does not count source-less Digimon in the opponent's breeding area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "host", dp: 5000, under: ["BT1-004"] }] },
      1: { battleArea: ["BT1-016"], breeding: "BT1-017" },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
