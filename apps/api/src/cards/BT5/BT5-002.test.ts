import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-002.js";

describe("BT5-002 Tsunomon", () => {
  it("gives its Garurumon host +1000 DP on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-114", as: "host", under: ["BT5-002"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("also recognizes Omnimon but not an unrelated Greymon name", async () => {
    const omnimon = setupEngine({ 0: { battleArea: [{ card: "BT5-086", as: "host", under: ["BT5-002"] }] } });
    await omnimon.engine.recomputeContinuousEffects();
    expect(omnimon.perm("host").currentDP).toBe(omnimon.perm("host").baseDP + 1000);

    const unrelated = setupEngine({ 0: { battleArea: [{ card: "BT4-113", as: "host", under: ["BT5-002"] }] } });
    await unrelated.engine.recomputeContinuousEffects();
    expect(unrelated.perm("host").currentDP).toBe(unrelated.perm("host").baseDP);
  });
});
