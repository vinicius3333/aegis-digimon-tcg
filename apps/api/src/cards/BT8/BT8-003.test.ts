import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT8-003.js";

describe("BT8-003 Frimon", () => {
  it("gives its host +1000 DP during your turn with at least 3 security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-034", as: "host", under: ["BT8-003"] }],
        security: ["BT8-034", "BT8-034", "BT8-034"],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not grant DP with only 2 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-034", as: "host", under: ["BT8-003"] }],
        security: ["BT8-034", "BT8-034"],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not grant DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-034", as: "host", under: ["BT8-003"] }],
        security: ["BT8-034", "BT8-034", "BT8-034"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
