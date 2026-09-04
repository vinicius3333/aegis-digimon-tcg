import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-035.js";

describe("EX4-035 BlackGargomon", () => {
  it("provides Alliance as a printed keyword", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      actions: [],
      keywords: [{ keyword: "Alliance" }],
    });
  });
  it("gains 2000 DP when an effect suspends it", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
          actions: [{ kind: "ModifyDP", amount: 2000, duration: "untilOpponentTurnEnd" }],
        },
      ],
    });
  });
});

function board() {
  return {
    0: {
      battleArea: [
        { card: "EX4-035", as: "attacker" },
        { card: "BT1-010", as: "fodder" },
      ],
    },
    1: {
      battleArea: [
        { card: "BT1-021", as: "target", dp: 15000, suspended: true },
        { card: "ST18-07", as: "blocker", dp: 7000 },
      ],
    },
  };
}

describe("EX4-035 Alliance attack", () => {
  it("suspends another Digimon and adds its DP through the real attack path", async () => {
    const s = setupEngine(board(), { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const dpBefore = s.perm("attacker").currentDP;

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
    expect(s.perm("attacker").currentDP).toBe(dpBefore + s.perm("fodder").currentDP);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
  });

  it("digivolves from the exact Lopmon alternate name for two memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-034", as: "lopmon" }],
        hand: [{ card: "EX4-035", as: "blackGargomon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lopmon").permanentId,
        instanceId: s.inst("blackGargomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lopmon").topCard.cardId === "EX4-035");
    expect(s.perm("lopmon").topCard.cardId).toBe("EX4-035");
    expect(s.state.memory).toBe(0);
  });

  it("limits the inherited suspension bonus to once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "host", under: ["EX4-035"] },
            { card: "BT1-064", as: "first" },
            { card: "BT1-064", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const baseDP = s.perm("host").currentDP;

    await advance(s.engine).verb.suspend([s.perm("first").permanentId], 0);
    await settle(() => s.perm("host").currentDP === baseDP + 2000);
    await advance(s.engine).verb.suspend([s.perm("second").permanentId], 0);

    expect(s.perm("host").currentDP).toBe(baseDP + 2000);
  });
});
