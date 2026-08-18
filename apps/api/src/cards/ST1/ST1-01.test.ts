import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST1-01.js";

describe("ST1-01 Koromon", () => {
  it("gives its host +1000 DP only with 4 or more digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST1-06", as: "fourSources", under: ["ST1-01", "BT1-001", "BT1-001", "BT1-001"] },
          { card: "ST1-06", as: "threeSources", under: ["ST1-01", "BT1-001", "BT1-001"] },
        ],
      },
    });
    await s.ready();

    expect(s.perm("fourSources").currentDP).toBe(s.perm("fourSources").baseDP + 1000);
    expect(s.perm("threeSources").currentDP).toBe(s.perm("threeSources").baseDP);
  });

  it("counts Koromon itself among the 4 sources and applies only on its owner's turn (Q601)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST1-06", as: "host", under: ["ST1-01", "BT1-001", "BT1-001", "BT1-001"] }],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
