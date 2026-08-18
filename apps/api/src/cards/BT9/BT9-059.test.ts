import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-059.js";

describe("BT9-059 Tapirmon", () => {
  it("grants +1000 DP only while its host has at least 2 colors", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT9-074", as: "twoColor", under: ["BT9-059"] },
      { card: "BT1-028", as: "oneColor", under: ["BT9-059"] },
    ] } });
    await s.ready();
    expect(s.perm("twoColor").currentDP).toBe(5000);
    expect(s.perm("oneColor").currentDP).toBe(3000);
  });
});
