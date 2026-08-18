import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT8-004.js";

describe("BT8-004 Bibimon", () => {
  it("gives its host +1000 DP on the opponent's turn while all own Digimon are suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-054", as: "host", under: ["BT8-004"], suspended: true }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
