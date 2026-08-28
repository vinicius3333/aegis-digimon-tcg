import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX1-044.js";

describe("EX1-044 Keramon", () => {
  it("gives its host +1000 DP for each other Digimon with the host's name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX1-044"], dp: 2000 },
          { card: "BT1-009", as: "same1" },
          { card: "BT1-009", as: "same2" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
  });
});
