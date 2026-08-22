import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./ST19-15.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

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
    const option = s.inst("arts");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 1000, 200);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("applies only the base -6000 reduction below the three-Digimon threshold", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST19-15", as: "arts" }] },
        1: { battleArea: [{ card: "AD1-001", as: "target", dp: 13000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 50;
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
