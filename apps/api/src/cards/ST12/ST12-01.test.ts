import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST12-01.js";

describe("ST12-01 Gurimon", () => {
  it("gives its host +1000 DP while its owner has at least 2 Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-04", as: "host", under: ["ST12-01"] }, "ST12-03"] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not grant the bonus while its host is the owner's only Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-04", as: "host", under: ["ST12-01"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
