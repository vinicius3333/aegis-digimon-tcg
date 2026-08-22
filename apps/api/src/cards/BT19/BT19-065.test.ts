import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-065.js";

describe("BT19-065", () => {
  it("preserves level deletion, trash play, Composite trait, and inherited attack redirect", () => {
    const card = runtimeCompiledCard("BT19-065");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "Delete", target: { filter: { kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } } } },
        ],
      })),
      {
        trigger: "OnDeletion",
        actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
      },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Composite"] }] },
      {
        trigger: "OpponentsTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          { kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true }] },
        ],
      },
    ]);
  });
});
