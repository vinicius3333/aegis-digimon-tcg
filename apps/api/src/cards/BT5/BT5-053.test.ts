import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-053.js";

describe("BT5-053 Deramon", () => {
  it("gets +2000 DP for each other suspended own Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-053", as: "dera", suspended: true },
          { card: "BT1-009", suspended: true },
          { card: "BT1-010", suspended: true },
          { card: "BT1-011", as: "unsuspended" },
          { card: "BT1-085", as: "tamer", suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT1-011", suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("dera").currentDP).toBe(s.perm("dera").baseDP + 4000);
  });

  it("recomputes the live count and only applies it during the owner's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-053", as: "dera" },
          { card: "BT1-009", as: "ally", suspended: true },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();
    expect(s.perm("dera").currentDP).toBe(s.perm("dera").baseDP + 2000);

    await advance(s.engine).verb.unsuspend([s.perm("ally").permanentId]);
    expect(s.perm("dera").currentDP).toBe(s.perm("dera").baseDP);

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    expect(s.perm("dera").currentDP).toBe(s.perm("dera").baseDP + 2000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("dera").currentDP).toBe(s.perm("dera").baseDP);
  });
});
