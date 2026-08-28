import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./P-009.js";

describe("P-009 Agumon", () => {
  it("gives +2000 DP only to a Greymon-family host during its owner's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-010", as: "greymon", under: ["P-009"] },
          { card: "BT1-010", as: "agumon", under: ["P-009"] },
        ],
      },
    });
    const greymonBase = s.perm("greymon").baseDP;
    const agumonBase = s.perm("agumon").baseDP;
    await s.ready();

    expect(s.perm("greymon").currentDP).toBe(greymonBase + 2000);
    expect(s.perm("agumon").currentDP).toBe(agumonBase);
  });
});
