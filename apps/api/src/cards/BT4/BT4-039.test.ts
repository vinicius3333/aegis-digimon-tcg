import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-039.js";

describe("BT4-039 Growlmon", () => {
  it("gives +1000 DP to its host while you have 3 or fewer security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-047", as: "host", under: ["BT4-039"] }],
        security: ["BT1-001", "BT1-002", "BT1-003"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give DP to its host while you have 4 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-047", as: "host", under: ["BT4-039"] }],
        security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
