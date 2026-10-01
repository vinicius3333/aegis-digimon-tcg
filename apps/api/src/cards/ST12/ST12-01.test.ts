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

  it("stays at exactly +1000 DP with 4 Digimon, not +1000 per extra Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST12-04", as: "host", under: ["ST12-01"] }, "ST12-03", "ST12-02", "ST12-06"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not grant its Your Turn bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST12-04", as: "host", under: ["ST12-01"] }, "ST12-03"] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});

describe("ST12-01 Gurimon — KB Q&A rulings", () => {
  it("counts its own host toward the 2 or more Digimon condition (Q750)", async () => {
    const withOneOther = setupEngine({
      0: { battleArea: [{ card: "ST12-02", as: "host", under: ["ST12-01"] }, "ST12-03"] },
    });
    await withOneOther.engine.recomputeContinuousEffects();
    expect(withOneOther.perm("host").currentDP).toBe(withOneOther.perm("host").baseDP + 1000);

    const hostAlone = setupEngine({ 0: { battleArea: [{ card: "ST12-02", as: "host", under: ["ST12-01"] }] } });
    await hostAlone.engine.recomputeContinuousEffects();
    expect(hostAlone.perm("host").currentDP).toBe(hostAlone.perm("host").baseDP);
  });

  it("gives only +1000 DP with 4 Digimon, not +2000 (Q751)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST12-02", as: "host", under: ["ST12-01"] }, "ST12-03", "ST12-02", "ST12-03"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.state.players[0]!.battleArea).toHaveLength(4);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
