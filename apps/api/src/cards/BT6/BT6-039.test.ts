import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-039.js";

describe("BT6-039 Mammothmon", () => {
  it("gives its host +1000 DP while you have at most 3 security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-062", under: ["BT6-039"], as: "host" }], security: 4 },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);

    s.state.players[0]!.security.pop();
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
