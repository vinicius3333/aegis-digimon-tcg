import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-005.js";
import "./BT9-061.js";

describe("BT9-005 Tumblemon", () => {
  it("grants +1000 DP on the opponent's turn only while its host has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT9-061", as: "blocker", under: ["BT9-005"] },
      { card: "BT1-028", as: "other", under: ["BT9-005"] },
    ] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("blocker").currentDP).toBe(7000);
    expect(s.perm("other").currentDP).toBe(3000);
  });
});
