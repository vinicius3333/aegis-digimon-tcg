import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-079.js";
import "../index.js";

describe("BT26-079 compiled behavior", () => {
  it("proves evolution, Assembly, Trash Main, keywords, Decode, and the shared delete cost", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      actions: [
        { kind: "Trash", target: { untilHandSize: 4 } },
        { kind: "Trash", target: { untilHandSize: 4 }, chooser: "opponent" },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Plutomon"], cost: 1, isAlternate: true },
      { level: 5, traits: ["TS"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toEqual([{ reduceCost: 2, materials: [{ names: ["Plutomon"], count: 1 }] }]);
    expect(compiled.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
        expect.objectContaining({ keyword: "Decode" }),
        expect.objectContaining({ keyword: "Retaliation" }),
      ]),
    );
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      isFromTrash: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          reduceCostBy: 4,
          condition: { kind: "handAtMost", value: 5 },
          assembly: {
            target: {
              filter: { zone: "trash", nameOrTrait: [{ tokens: ["Plutomon"], match: "nameExact" }] },
              count: 1,
            },
            reduceCostBy: 2,
          },
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "bt26-079-trash-cost-delete",
        actions: [
          {
            kind: "CostGatedBlock",
            cost: { kind: "trash" },
            optional: true,
            abortOnDecline: true,
            actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 6 } } } }],
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "instead",
      actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, payCost: false }],
    });
  });

  it("declares Assembly during its Trash Main play and stacks the Plutomon for cost 6 (Q7110)", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [
            { card: "BT26-079", as: "zombiePlutomon" },
            { card: "BT26-059", as: "plutomon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, s.inst("zombiePlutomon"));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT26-079");
    expect(played?.stack.map(({ cardId }) => cardId)).toEqual(["BT26-059"]);
    expect(s.state.memory).toBe(0);
  });

  it("uses the supported dynamic hand-trim action", () => {
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        }),
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenAnyDigivolves",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        }),
      ]),
    );
  });

  it("publicly trashes a hand card to delete an opponent's level 6 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-079", as: "zombiePlutomon" }], hand: [{ card: "BT1-001", as: "cost" }] },
        1: { battleArea: [{ card: "BT26-074", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("zombiePlutomon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
  });

  it("does not trash or delete when the activation cost is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-079", as: "zombiePlutomon" }], hand: [{ card: "BT1-001" }] },
        1: { battleArea: [{ card: "BT26-074", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("zombiePlutomon"));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
