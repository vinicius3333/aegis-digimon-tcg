import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT2-071.js";
import "./BT2-072.js";
import "./BT2-073.js";
import "./BT2-074.js";
import "./BT2-075.js";
import "./BT2-076.js";
import "./BT2-077.js";
import "./BT2-078.js";
import "./BT2-079.js";
import "./BT2-080.js";

const card = (cardId: string) => runtimeCompiledCard(cardId);

describe("BT2-071 through BT2-080 IR coverage", () => {
  it("registers every card with complete executable coverage", () => {
    for (const cardId of [
      "BT2-071",
      "BT2-072",
      "BT2-073",
      "BT2-074",
      "BT2-075",
      "BT2-076",
      "BT2-077",
      "BT2-078",
      "BT2-079",
      "BT2-080",
    ]) {
      expect(card(cardId), `${cardId} must register compiled IR`).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves printed gates, costs, targets, keywords, and inherited clauses", () => {
    expect(card("BT2-071")?.effects).toMatchObject([
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "GainKeyword",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            keyword: { keyword: "Retaliation" },
            condition: {
              kind: "youHave",
              filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], colors: ["Yellow"] },
            },
          },
        ],
      },
      { trigger: "OnDeletion", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
    ]);

    expect(card("BT2-072")?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker" }] },
      { trigger: "WhenAttacking", actions: [{ kind: "GainMemory", amount: -2 }] },
    ]);

    expect(card("BT2-073")?.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });

    expect(card("BT2-074")?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Retaliation" }] },
      { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Retaliation" }] },
    ]);

    expect(card("BT2-075")?.effects).toEqual([]);

    expect(card("BT2-076")?.effects[0]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        { kind: "Draw", controller: "mine", amount: 2 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      ],
    });

    expect(card("BT2-077")?.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
            count: 1,
          },
          cost: {
            kind: "deleteOwn",
            target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
          },
          optional: true,
        },
      ],
    });

    expect(card("BT2-078")?.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          cost: {
            kind: "deleteOwn",
            target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
          },
          optional: true,
        },
      ],
    });

    expect(card("BT2-079")?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "SecurityAttack", amount: 1 }] },
      {
        trigger: "OpponentsTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSuspended",
            sourceFilter: { controller: "opponent", kind: ["Digimon"] },
            actions: [{ kind: "GainMemory", amount: 1 }],
          },
        ],
      },
    ]);

    expect(card("BT2-080")?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Retaliation" }] },
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Purple"],
                levelComparison: { op: "lte", value: 4 },
              },
              count: 2,
              upTo: true,
            },
            from: ["trash"],
            payCost: false,
            optional: true,
            suppressOnPlayEffects: true,
          },
        ],
      },
    ]);
  });
});
