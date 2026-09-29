import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./ST19-15.js";
import { type EngineSetup, setupEngine, settle } from "../../engine/testkit/harness.js";

describe("ST19-15 Noble Family Arts", () => {
  it("matches the two-stage total-Digimon DP reduction and Security activation", () => {
    expect(getCardDefinition("ST19-15")).toMatchObject({
      effectText: expect.stringContaining("gets -6000 DP"),
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
  });

  it("reduces the same opponent Digimon by 12000 when three Digimon exist", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST19-15", as: "arts" }], deck: ["BT1-009"], battleArea: ["BT1-045"] },
        1: { battleArea: [{ card: "AD1-001", as: "target", dp: 13000 }, "AD1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 50;
    await s.ready();
    const option = s.inst("arts");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 1000, 200);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("applies only the base -6000 reduction below the three-Digimon threshold", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST19-15", as: "arts" }], battleArea: [{ card: "BT1-045" }] },
        1: { battleArea: [{ card: "AD1-001", as: "target", dp: 13000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 50;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arts").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 7000, 200);
    expect(s.perm("target").currentDP).toBe(7000);
  });

  it("activates the Main effect when revealed from security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 13000 }] },
        1: {
          security: [{ card: "ST19-15", as: "arts" }],
          battleArea: [
            { card: "AD1-001", as: "one" },
            { card: "AD1-001", as: "two" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").currentDP === 1000);
    expect(s.perm("attacker").currentDP).toBe(1000);
  });
});

describe("ST19-15 Noble Family Arts — KB Q&A rulings", () => {
  async function playArtsAgainst(ownDigimon: string[], opponentDPs: number[]): Promise<EngineSetup> {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST19-15", as: "arts" }], battleArea: ownDigimon },
        1: { battleArea: opponentDPs.map((dp, index) => ({ card: "AD1-001", as: `opponent${index}`, dp })) },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 50;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arts").instanceId })).toEqual({ ok: true });
    return s;
  }

  it("counts both players' Digimon toward the 3-Digimon threshold for -12000 DP (Q863)", async () => {
    const combined = await playArtsAgainst(["BT1-045", "BT1-045"], [13000]);
    await settle(() => combined.perm("opponent0").currentDP === 1000, 200);
    expect(combined.perm("opponent0").currentDP).toBe(1000);

    const belowThreshold = await playArtsAgainst(["BT1-045"], [13000]);
    await settle(() => belowThreshold.perm("opponent0").currentDP === 7000, 200);
    expect(belowThreshold.perm("opponent0").currentDP).toBe(7000);
  });

  it("stacks the further -6000 DP on the same chosen Digimon for a total of -12000 DP (Q864)", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST19-15", as: "arts" }], battleArea: ["BT1-045"] },
      1: {
        battleArea: [
          { card: "AD1-001", as: "spared", dp: 13000 },
          { card: "AD1-001", as: "chosen", dp: 13000 },
        ],
      },
    });
    s.state.memory = 50;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arts").instanceId })).toEqual({ ok: true });

    await settle(() => s.decisions.some(({ req }) => req.kind === "chooseTargets"), 50);
    const targeting = s.decisions.filter(({ req }) => req.kind === "chooseTargets");
    expect(targeting).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targeting[0]!.req.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("chosen").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("chosen").currentDP === 1000, 200);

    expect(s.perm("chosen").currentDP).toBe(1000);
    expect(s.perm("spared").currentDP).toBe(13000);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
  });
});
