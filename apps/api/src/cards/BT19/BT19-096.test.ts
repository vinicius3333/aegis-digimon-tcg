import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-096 Hornet Eraser", () => {
  it("preserves face-up Royal Base recovery, face-up-security budget scaling, and Security activation", () => {
    const card = runtimeCompiledCard("BT19-096");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "addBottom",
            controller: "mine",
            source: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                zone: "trash",
                nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
              },
              count: 1,
            },
            faceUp: true,
            optional: true,
          },
          {
            kind: "DeleteBudget",
            filter: { controller: "opponent", kind: ["Digimon"] },
            budget: 8,
            upTo: true,
            scaling: {
              per: 1,
              filter: { controller: "mine", faceUp: true },
              unit: "security",
              budgetAdd: 2,
            },
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "ActivateMain" }],
      },
    ]);
  });
});
