import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-070 Kimeramon", () => {
  it("preserves Composite evolution, three-card DigiXros, self-capable deletion sequence, and Machinedramon revival", () => {
    const card = runtimeCompiledCard("BT19-070");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Composite"], cost: 3, isAlternate: true },
    ]);
    expect(card?.digiXrosRequirement).toEqual([
      {
        materials: [{
          kind: ["Digimon"],
          levelComparison: { op: "eq", value: 4 },
          nameOrTrait: [{ tokens: ["Composite"], match: "trait" }],
          differentCardNumbers: true,
        }],
        count: 3,
        costReduction: 1,
      },
    ]);

    const deleteOwnCost = {
      kind: "deleteOwn",
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
    };
    const triggerActions = ["OnPlay", "WhenDigivolving"].map((trigger) => ({
      trigger,
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
          cost: deleteOwnCost,
          abortOnDecline: true,
        },
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [4] }, count: 1 } },
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [5] }, count: 1 } },
      ],
    }));

    expect(card?.effects).toMatchObject([
      ...triggerActions,
      {
        trigger: "OnDeletion",
        actions: [{
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Machinedramon"], match: "name" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                colors: ["Purple", "Red"],
                levelComparison: { op: "lte", value: 4 },
              },
              count: 1,
            },
          },
          optional: true,
          abortOnDecline: true,
        }],
      },
      {
        trigger: "Static",
        actions: [],
        isInherited: true,
        keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      },
    ]);
  });
});
