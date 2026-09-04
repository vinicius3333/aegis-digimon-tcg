import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-011.js";

describe("EX8-011", () => {
  it("plays itself from security and gains +3000 DP at the start of the main phase and when digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityBattleEnded",
      once: true,
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 3000,
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 3000,
      duration: "untilOpponentTurnEnd",
    });
  });
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));
  it("publishes the exact Reptile alternate route", () => {
    expect(digivolutionRequirementsFor("EX8-011")).toContainEqual({
      level: 3,
      traits: ["Reptile"],
      cost: 2,
      isAlternate: true,
    });
  });

  it("applies the inherited DP increase only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-053", as: "host", under: [{ card: "EX8-011", as: "tyrannomon" }] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(12000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(10000);
  });

  it("plays the revealed card from security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: { security: [{ card: "EX8-011", as: "tyrannomon" }] },
    });
    const instanceId = s.inst("tyrannomon").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("gains +3000 DP at the start of its controller's main phase through the public timing seam", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-011", as: "tyrannomon" }], deck: ["BT1-046"] },
      1: { deck: ["BT1-045"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tyrannomon"));
    expect(s.perm("tyrannomon").currentDP).toBe(8000);
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("tyrannomon").currentDP).toBe(5000);
  });

  it("gains +3000 DP when digivolving through the off-color Reptile route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "gabumon" }],
        hand: [{ card: "EX8-011", as: "tyrannomon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gabumon").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gabumon").topCard.instanceId === s.inst("tyrannomon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("gabumon").currentDP).toBe(8000);
  });

  it("rejects the alternate route for an off-color non-Reptile level 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "elecmon" }],
        hand: [{ card: "EX8-011", as: "tyrannomon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("elecmon").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
