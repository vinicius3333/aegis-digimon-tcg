import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-007.js";

describe("EX6-007 Zubamon", () => {
  it("pays 1 and places itself under a level 3 or Legend-Arms Digimon to give it +4000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 4000,
      duration: "forTheTurn",
      target: { fromSelectionRef: "placementTarget", count: 1 },
      cost: { kind: "payMemory", memory: 1 },
      additionalCosts: [
        {
          kind: "place",
          bindHostAs: "placementTarget",
          position: "bottom",
          target: { from: ["hand"], filter: { isSelfRef: true } },
          underFilter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 3 } },
          underOrFilters: [
            { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Legend-Arms"] }] },
          ],
          destination: "digivolutionStack",
        },
      ],
    });
  });
  it("draws once per turn when a digivolution card is added and inherits +2000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
  });

  it("pays 1 memory, places Zubamon under a level-3 Digimon, and grants +4000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host" }],
          hand: [{ card: "EX6-007", as: "zubamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const [effect] = JSON.parse(s.inst("zubamon").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(effect).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("zubamon").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("zubamon").instanceId));

    expect(s.state.memory).toBe(4);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("zubamon").instanceId)).toBe(true);
    expect(s.perm("host").currentDP).toBe(9000);
  });

  it("does not offer the hand effect without a level-3 or Legend-Arms host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX6-001", as: "ineligible" }],
        hand: [{ card: "EX6-007", as: "zubamon" }],
      },
    });
    await s.ready();

    expect(JSON.parse(s.inst("zubamon").activatableEffectsJson || "[]")).toHaveLength(0);
  });
});
