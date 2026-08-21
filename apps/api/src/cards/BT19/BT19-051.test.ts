import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-051.js";

describe("BT19-051", () => {
  it("preserves Ballistamon DigiXros naming, bound DP protection, deletion placement, and inherited Blocker", () => {
    const card = runtimeCompiledCard("BT19-051");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Ballistamon"], digiXrosOnly: true }],
      },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" },
          { kind: "Restrict", restriction: "beReturned", duration: "untilOpponentTurnEnd" },
        ],
      })),
      {
        trigger: "OnDeletion",
        actions: [{ kind: "PlaceUnder", underFilter: { kind: ["Tamer"] }, optional: true }],
      },
      {
        trigger: "OpponentsTurn",
        isInherited: true,
        actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" } }],
      },
    ]);
  });
});
