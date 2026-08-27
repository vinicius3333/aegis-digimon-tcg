import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT8-047.js";

describe("BT8-047 Pulsemon", () => {
  it("gives its host +1000 DP for each other suspended Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-042", as: "host", under: ["BT8-047"], suspended: true },
          { card: "BT8-034", suspended: true },
          { card: "BT8-035", suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT8-034", suspended: true }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });
});
