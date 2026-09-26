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

  it("re-arms the inherited once-per-turn bonus on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "host", under: ["EX4-035"] },
            { card: "EX4-035", as: "firstAttacker", dp: 15000 },
            { card: "EX4-035", as: "secondAttacker", dp: 15000 },
            { card: "EX4-035", as: "thirdAttacker", dp: 15000 },
            { card: "BT1-064", as: "firstAlly" },
            { card: "BT1-064", as: "secondAlly" },
            { card: "BT1-064", as: "thirdAlly" },
          ],
          deck: Array(8).fill("BT1-009"),
        },
        1: { security: Array(10).fill("BT1-009"), deck: Array(8).fill("BT1-009") },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const baseDP = s.perm("host").currentDP;

    const attackWithAlliance = async (
      attacker: "firstAttacker" | "secondAttacker" | "thirdAttacker",
      ally: "firstAlly" | "secondAlly" | "thirdAlly",
    ): Promise<void> => {
      const securityBefore = s.state.players[1]!.security.length;
      const promptsBefore = s.events.filter((event) => event.kind === "alliancePrompt").length;
      const resolutionsBefore = s.events.filter((event) => event.kind === "allianceResolved").length;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(attacker).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.filter((event) => event.kind === "alliancePrompt").length > promptsBefore, 3000);
      expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm(ally).permanentId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.perm(ally).isSuspended &&
          s.events.filter((event) => event.kind === "allianceResolved").length > resolutionsBefore,
        3000,
      );
      await settle(() => s.state.players[1]!.security.length < securityBefore);
    };

    await attackWithAlliance("firstAttacker", "firstAlly");
    await settle(() => s.perm("host").currentDP === baseDP + 2000);
    await attackWithAlliance("secondAttacker", "secondAlly");
    expect(s.perm("host").currentDP).toBe(baseDP + 2000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    await attackWithAlliance("thirdAttacker", "thirdAlly");
    expect(s.perm("host").currentDP).toBe(baseDP + 2000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("requires an effect to suspend another own Digimon, excluding self and opponents", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "host", under: ["EX4-035"] },
            { card: "BT1-064", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-019", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const baseDP = s.perm("host").currentDP;

    await advance(s.engine).verb.suspend([s.perm("host").permanentId], 0);
    expect(s.perm("host").currentDP).toBe(baseDP);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId], 0);
    expect(s.perm("host").currentDP).toBe(baseDP);
  });

  it("expires at the opponent turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "host", under: ["EX4-035"] },
            { card: "BT1-064", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-019", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const baseDP = s.perm("host").currentDP;

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId], 0);
    await settle(() => s.perm("host").currentDP === baseDP + 2000);
    expect(s.perm("host").currentDP).toBe(baseDP + 2000);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").currentDP).toBe(baseDP);
  });
});
