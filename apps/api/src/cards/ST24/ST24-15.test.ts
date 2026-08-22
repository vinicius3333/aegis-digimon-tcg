import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("ST24-15 DNA Charge", () => {
  it("preserves the DATA SQUAD use requirement, Main placement, start-phase cost, and Security activation", () => {
    const card = runtimeCompiledCard("ST24-15");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [{ kind: "WaiveColorRequirement" }] },
      {
        trigger: "Main",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand", "trash"],
            payCost: false,
            optional: true,
            abortOnDecline: true,
            target: {
              filter: {
                controller: "mine",
                playCostLte: 4,
                nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
              },
              count: 1,
            },
          },
          { kind: "PlaceInBattleAreaSelf" },
        ],
      },
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          { kind: "Draw", amount: 1, cost: { kind: "place", underFilter: { controller: "mine", kind: ["Tamer"] } } },
          { kind: "GainMemory", amount: 1 },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ]);
  });
});
