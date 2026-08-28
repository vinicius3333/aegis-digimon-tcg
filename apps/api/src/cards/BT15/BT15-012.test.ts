import { describe, it, expect } from "vitest";
import { EffectTiming, digiXrosRequirementFor, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-012.js";

// A3 behavioral test for BT15-012 (Shoutmon X2):
//   [On Play] Suspend 1 of your opponent's Digimon.
//
// Primary observable: playing BT15-012 causes the target opp Digimon to become suspended.
//
// FAILS-WHEN-REVERTED: remove the [On Play] resolve body → the opp Digimon stays unsuspended.

describe("BT15-012 Shoutmon X2 [On Play] suspend", () => {
  it("encodes deletion prevention, the DigiXros restriction, and both treated-as names", () => {
    expect(digiXrosRequirementFor("BT15-012")).toEqual([
      { materials: [{ names: ["Shoutmon"] }, { names: ["Ballistamon"] }], count: 2 },
    ]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "MaterialSave", amount: 2 }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Suspend" },
        {
          kind: "Restrict",
          duration: "untilOpponentNextUnsuspendPhase",
          condition: { kind: "digiXrosCount", minimum: 2 },
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Shoutmon", "Ballistamon"] }],
    });
  });

  it("DigiXroses with Shoutmon and Ballistamon, freezes the suspended target, then Material Saves both", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT10-087", as: "tamer" }],
          hand: [
            { card: "BT15-012", as: "shoutmonX2" },
            { card: "BT10-008", as: "shoutmon" },
            { card: "BT10-049", as: "ballistamon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const materialIds = [s.inst("shoutmon").instanceId, s.inst("ballistamon").instanceId];

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("shoutmonX2").instanceId,
        digiXros: { materialInstanceIds: materialIds },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended && s.perm("shoutmonX2").stack.length === 2);

    const unsuspend = (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase.bind(s.engine);
    expect(await unsuspend(1)).not.toContain(s.perm("target").permanentId);
    expect(s.perm("target").isSuspended).toBe(true);
    await s.ready();

    const sourceId = s.perm("shoutmonX2").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([sourceId])).toBe(1);
    await settle(() => s.perm("tamer").stack.length === 2);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourceId)).toBe(false);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(materialIds));
  });

  it("deletes itself at start of turn to gain exactly 1 memory", async () => {
    const s = setup(
      { 0: { battleArea: [{ card: "BT15-012", as: "shoutmonX2" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const sourceId = s.perm("shoutmonX2").permanentId;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("shoutmonX2"));
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourceId));

    expect(s.state.memory).toBe(1);
  });

  it("is treated as Shoutmon and Ballistamon in the battle area", async () => {
    const s = setup({ 0: { battleArea: [{ card: "BT15-012", as: "shoutmonX2" }] } });
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("shoutmonX2"))).toEqual(
      expect.arrayContaining(["shoutmon x2", "shoutmon", "ballistamon"]),
    );
  });

  it("playing BT15-012 suspends 1 of the opponent's Digimon", async () => {
    const s = setup(
      {
        0: { hand: [{ card: "BT15-012", as: "shoutmonX2" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 1000, as: "oppDigimon" }] }, // Monodramon Lv.3
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    const shoutmonX2 = s.inst("shoutmonX2");
    const oppDigimon = s.perm("oppDigimon");

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: shoutmonX2.instanceId,
    });
    expect(res).toEqual({ ok: true });

    // Wait for the opp Digimon to become suspended
    await settle(() => oppDigimon.isSuspended, 600);

    // The opp Digimon should be suspended
    expect(oppDigimon.isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(oppDigimon, "unsuspend")).toBe(false);
  });
});
