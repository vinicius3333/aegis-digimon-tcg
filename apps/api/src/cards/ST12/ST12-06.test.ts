import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST12-06.js";

describe("ST12-06 BaoHuckmon", () => {
  it("gives a Huckmon-name host +1000 DP as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-08", as: "host", under: ["ST12-06"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("also gives a Royal Knight host +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-10", as: "host", under: ["ST12-06"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
