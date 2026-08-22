import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-035 Starmon", () => {
  it("preserves the Starmons alias, Xros Heart play trigger, same-target debuffs, Save, and inherited DP effect", () => {
    const card = runtimeCompiledCard("BT19-035");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Starmons"] }] },
      {
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenPlayed",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
            },
            actions: [
              {
                kind: "GainKeyword",
                keyword: { keyword: "SecurityAttack", amount: -1 },
                duration: "untilOpponentTurnEnd",
              },
              {
                kind: "ModifyDP",
                amount: -3000,
                duration: "untilOpponentTurnEnd",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
              },
            ],
          },
        ],
      },
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "PlaceUnder",
            optional: true,
            target: { from: ["hand", "trash"] },
            underFilter: { controller: "mine", kind: ["Tamer"] },
          },
        ],
      },
      {
        trigger: "WhenAttacking",
        isInherited: true,
        actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", condition: { kind: "selfHasTrait" } }],
      },
    ]);
  });
});
