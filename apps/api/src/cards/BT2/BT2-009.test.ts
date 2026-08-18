import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-009.js";

describe("BT2-009 Guilmon", () => {
  it("gives +1000 DP during its turn at the 5-card opponent-trash threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-013", as: "host", under: ["BT2-009"] }] },
      1: { trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give +1000 DP with only 4 cards in the opponent's trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-013", as: "host", under: ["BT2-009"] }] },
      1: { trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not count cards in its owner's trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-013", as: "host", under: ["BT2-009"] }],
        trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not give +1000 DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-013", as: "host", under: ["BT2-009"] }] },
      1: { trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
