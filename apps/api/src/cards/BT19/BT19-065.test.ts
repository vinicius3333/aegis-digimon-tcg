import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-065 Machinedramon", () => {
  it("preserves five-card DigiXros, controller-agnostic deletion, recovery, and redirect", () => {
    const card = runtimeCompiledCard("BT19-065");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digiXrosRequirement).toEqual([
      { materials: [{ kind: ["Digimon"], levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["Cyborg", "Composite"], match: "trait" }], differentCardNumbers: true }], count: 5, costReduction: 1 },
    ]);
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [{ kind: "Delete", target: { filter: { kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } }, count: 1 } }],
      })),
      { trigger: "OnDeletion", actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }] },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Composite"] }] },
      {
        trigger: "OpponentsTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "RedirectAttack", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Composite", "Wicked God"], match: "trait" }] }, count: 1 }, optional: true }],
        }],
      },
    ]);
  });
});
