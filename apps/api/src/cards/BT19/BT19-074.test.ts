import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-074.js";

describe("BT19-074", () => {
  it("preserves Blast Digivolve, conditional deletion, and ten-card security trash cost", () => {
    const card = runtimeCompiledCard("BT19-074");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "Delete", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 6 } } } },
          {
            kind: "Delete",
            target: { filter: { controller: "opponent" } },
            condition: { kind: "zoneCount", zone: "trash", op: "gte", value: 10 },
          },
        ],
      })),
      {
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "trash",
            controller: "opponent",
            cost: {
              kind: "return",
              target: { filter: { zone: "trash", kind: ["Digimon", "Tamer", "Option"] }, count: 10 },
            },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
    ]);
  });
});
