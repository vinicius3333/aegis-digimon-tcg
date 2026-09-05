import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-054.js";

describe("EX4-054 Wendigomon", () => {
  it("exposes the parenthetical Alliance keyword as a static ability", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Alliance" },
    ]);
  });
  it("returns a green Digimon from trash once per turn when another own Digimon is suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: { filter: { zone: "trash", colors: ["Green"] } },
          condition: { kind: "youHave", filter: { excludeSelf: true, suspended: true } },
        },
      ],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-054");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("digivolves from a Terriermon-named level-three for the alternate cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-032", as: "terrier" }],
        hand: [{ card: "EX4-054", as: "wendigomon" }],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("terrier").permanentId,
        instanceId: s.inst("wendigomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("terrier").topCard?.cardId === "EX4-054");
    expect(s.perm("terrier").topCard?.cardId).toBe("EX4-054");
    expect(s.state.memory).toBe(0);
  });

  it("uses a real Alliance attack to suspend an ally and add its DP and Security Attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-054", as: "attacker", dp: 4000 },
            { card: "BT1-010", as: "fodder", dp: 2000 },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "target", dp: 7000, suspended: true },
            { card: "ST18-07", as: "blocker", dp: 7000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("attacker").keywords).toContain("Alliance");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("fodder").permanentId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => {
      const activeCombat = (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat;
      return s.perm("fodder").isSuspended && activeCombat.hasOpenBlockWindow;
    });
    expect(s.perm("fodder").isSuspended).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(6000);
    expect(s.perm("attacker").securityAttack).toBe(2);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
  });

  it("returns a green Digimon from trash at end of attack when another is suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "attacker", under: ["EX4-054"] },
            { card: "BT1-010", as: "suspended", suspended: true },
          ],
          trash: [{ card: "BT1-064", as: "greenTrash" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("attacker"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("greenTrash").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("greenTrash").instanceId);
  });
  ex4CardBehaviorTests("EX4-054");
});
