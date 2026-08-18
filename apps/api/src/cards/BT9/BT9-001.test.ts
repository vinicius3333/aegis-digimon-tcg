import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-001.js";

describe("BT9-001 Koromon", () => {
  it("grants +1000 DP only while its host has Agumon or Greymon in its name", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT9-008", as: "matching", under: ["BT9-001"] },
      { card: "BT1-028", as: "other", under: ["BT9-001"] },
    ] } });
    await s.ready();
    expect(s.perm("matching").currentDP).toBe(3000);
    expect(s.perm("other").currentDP).toBe(3000);
  });
});
