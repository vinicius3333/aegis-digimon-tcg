import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-051 AtlurBallistamon", () => {
  it("preserves DigiXros-only Ballistamon identity and every printed effect", () => {
    const card = runtimeCompiledCard("BT19-051");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Xros Heart"], cost: 3, isAlternate: false },
    ]);
    expect(card?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [{
          kind: "GrantStatic",
          grant: "name",
          tokens: ["Ballistamon"],
          digiXrosOnly: true,
        }],
      },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "ModifyDP", target: { bindAs: "atlurTarget", filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, amount: 3000, duration: "untilOpponentTurnEnd" },
          { kind: "Restrict", target: { fromSelectionRef: "atlurTarget" }, restriction: "beReturned", duration: "untilOpponentTurnEnd" },
        ],
      })),
      {
        trigger: "OnDeletion",
        actions: [{
          kind: "PlaceUnder",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare"], match: "trait" }] },
            count: 1,
            source: ["hand", "trash"],
          },
          underFilter: { controller: "mine", kind: ["Tamer"] },
          optional: true,
        }],
      },
      {
        trigger: "OpponentsTurn",
        isInherited: true,
        actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker", raw: "＜Blocker＞" }, duration: "permanent" }],
      },
    ]);
  });
});
