import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-069 Deltamon", () => {
  it("preserves alternate Gazimon/Gizamon evolution, hand-trash deletion on all triggers, and inherited Blocker", () => {
    const card = runtimeCompiledCard("BT19-069");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { names: ["Gazimon", "Gizamon"], cost: 2, isAlternate: true },
    ]);

    const expectedAction = {
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
        count: 1,
      },
      cost: {
        kind: "trash",
        target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
      },
      optional: true,
      abortOnDecline: true,
    };

    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving", "OnDeletion"].map((trigger) => ({
        trigger,
        actions: [expectedAction],
      })),
      {
        trigger: "Static",
        actions: [],
        isInherited: true,
        keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
      },
    ]);
  });
});
