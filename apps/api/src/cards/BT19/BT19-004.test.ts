import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-004 Tokomon", () => {
  it("gives only its host +2000 DP on its turn while another green Digimon exists", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-044", as: "host", under: ["BT19-004"] },
          { card: "BT1-064", as: "otherGreen" },
        ],
      },
      1: { battleArea: [{ card: "BT1-028", as: "opponentBlue" }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.perm("otherGreen").currentDP).toBe(3000);
    expect(s.perm("opponentBlue").currentDP).toBe(3000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(1000);

    s.state.turnSeat = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("otherGreen").permanentId]);
    expect(s.perm("host").currentDP).toBe(1000);
  });
});
