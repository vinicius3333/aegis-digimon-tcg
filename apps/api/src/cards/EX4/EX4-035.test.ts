import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-035.js";

describe("EX4-035 BlackGargomon", () => {
  it("adds a suspended Digimon's DP and Security Attack plus one", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "AddDPFromSuspendedCost",
          dpSource: { kind: "suspendedTarget" },
          alsoGainKeywords: [{ keyword: "SecurityAttack", amount: 1 }],
        },
      ],
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

// The inherited [When Attacking] clause pays "by suspending 1 of your other Digimon". Paying is
// the controller's choice, so the attack must offer the decline before anything suspends.
function board() {
  return {
    0: {
      battleArea: [
        { card: "BT1-010", as: "attacker", under: ["EX4-035"] },
        { card: "BT1-010", as: "fodder" },
      ],
    },
  };
}

describe("EX4-035 inherited attack cost", () => {
  it("suspends the chosen Digimon and adds its DP when accepted", async () => {
    const s = setupEngine(board(), { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const dpBefore = s.perm("attacker").currentDP;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle(() => s.perm("fodder").isSuspended);

    expect(s.perm("fodder").isSuspended).toBe(true);
    // The same effect-driven suspension also fires the inherited once-per-turn +2000 bonus.
    expect(s.perm("attacker").currentDP).toBe(dpBefore + s.perm("fodder").currentDP + 2000);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
  });

  it("suspends nothing and adds no DP when the cost is declined", async () => {
    const s = setupEngine(board(), { autoDeclineOptional: true, autoSelectCards: true });
    await s.ready();
    const dpBefore = s.perm("attacker").currentDP;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle(() => false, 60);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("fodder").isSuspended).toBe(false);
    expect(s.perm("attacker").currentDP).toBe(dpBefore);
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
