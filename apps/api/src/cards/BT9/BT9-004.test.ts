import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-004.js";

describe("BT9-004 Motimon", () => {
  it("grants +1000 DP only to an Insectoid host during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT9-052", as: "insectoid", under: ["BT9-004"] },
      { card: "BT1-028", as: "other", under: ["BT9-004"] },
    ] } });
    await s.ready();
    expect(s.perm("insectoid").currentDP).toBe(9000);
    expect(s.perm("other").currentDP).toBe(3000);
  });
});
