import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./P-006.js";

describe("P-006 Gatomon", () => {
  it("gives its host +1000 DP only on its owner's turn with at least 3 security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-057", as: "host", under: ["P-006"] }],
        security: 3,
      },
    });
    const baseDP = s.perm("host").baseDP;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(baseDP + 1000);

    const removedSecurity = s.state.players[0]!.security.pop();
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(baseDP);

    expect(removedSecurity).toBeDefined();
    s.state.players[0]!.security.push(removedSecurity!);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(baseDP);
  });
});
