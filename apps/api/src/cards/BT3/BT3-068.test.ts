import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT3-068.js";

describe("BT3-068 Giromon", () => {
  it("gives its host +1000 DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-070", as: "host", under: ["BT3-068"] }] },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
