import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT1-005.js";

describe("BT1-005 Kyaromon", () => {
  it("gives +2000 DP while its controller has at least six security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-052", as: "host", dp: 5000, under: ["BT1-005"] }], security: 6 },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("does not give +2000 DP with only five security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-052", as: "host", dp: 5000, under: ["BT1-005"] }], security: 5 },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("does not give +2000 DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-052", as: "host", dp: 5000, under: ["BT1-005"] }], security: 6 },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
