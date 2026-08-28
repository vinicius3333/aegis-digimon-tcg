import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-066.js";

describe("BT4-066 Golemon", () => {
  it("gives itself and all of your other black Digimon +1000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT4-066", as: "gole" },
          { card: "BT4-067", as: "other" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("gole").currentDP).toBe(s.perm("gole").baseDP + 1000);
    expect(s.perm("other").currentDP).toBe(s.perm("other").baseDP + 1000);
  });

  it("does not give DP to a non-black Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-066", as: "gole" }, { card: "BT4-057", as: "nonBlack" }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("nonBlack").currentDP).toBe(s.perm("nonBlack").baseDP);
  });
});
