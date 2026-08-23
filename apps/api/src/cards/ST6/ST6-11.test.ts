import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST6-11.js";

describe("ST6-11 WereGarurumon", () => {
  it("gives its host +2000 DP on your turn with 5 cards in trash", async () => {
    const s = setupEngine({
      0: {
        trash: ["ST6-01", "ST6-03", "ST6-04", "ST6-06", "ST6-08"],
        battleArea: [{ card: "ST6-13", as: "host", under: ["ST6-11"] }],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(14000);
  });
});
