import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-036 Wizardmon", () => {
  it("preserves security cycling, Wizardmon/X Antibody hand placement, and inherited protection", () => {
    const card = runtimeCompiledCard("BT19-036");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true },
          {
            kind: "SecurityManipulation",
            op: "addBottom",
            controller: "mine",
            amount: 1,
            source: "hand",
            optional: true,
            filter: { playCostLte: 5, colors: ["Yellow", "Purple"] },
            condition: { kind: "selfDigivolutionStackHasTrait" },
          },
        ],
      })),
      {
        trigger: "AllTurns",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            actions: [
              {
                kind: "Prevent",
                mode: "leavePlay",
                optional: true,
                abortOnDecline: true,
                cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security" }, count: 1 } },
              },
            ],
          },
        ],
      },
    ]);
  });
});
