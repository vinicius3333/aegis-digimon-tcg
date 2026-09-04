import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-009.js";

describe("EX6-009 Duramon", () => {
  it("pays 2 and places itself under a level 5 or Legend-Arms Digimon to give Security Attack +1", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      target: { fromSelectionRef: "placementTarget", count: 1 },
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "forTheTurn",
      cost: { kind: "payMemory", memory: 2 },
      additionalCosts: [
        {
          kind: "place",
          bindHostAs: "placementTarget",
          position: "bottom",
          target: { from: ["hand"], filter: { isSelfRef: true } },
          underFilter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 5 } },
          underOrFilters: [
            { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Legend-Arms"] }] },
          ],
        },
      ],
    });
  });
  it("inherits a once-per-turn attack-target switch that trashes security and grants Raid/Piercing on stack addition", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
    expect(
      compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Raid" } },
        { kind: "GainKeyword", keyword: { keyword: "Piercing" } },
      ],
    });
  });

  it("pays 2 memory, places itself under a level-5 Digimon, and grants Security Attack +1", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-020", as: "host" }], hand: [{ card: "EX6-009", as: "dura" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const [effect] = JSON.parse(s.inst("dura").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("dura").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("dura").instanceId));
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("trashes one opponent security card on a matching target switch and only once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "host", under: ["EX6-009"] }] },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not offer the hand effect without a level-5 or Legend-Arms host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "ineligible" }], hand: [{ card: "EX6-009", as: "dura" }] },
    });
    await s.ready();
    expect(JSON.parse(s.inst("dura").activatableEffectsJson || "[]")).toHaveLength(0);
  });
});
