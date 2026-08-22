import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-038", () => {
  it("preserves Dorulumon naming, opponent lockout, deletion placement, and inherited Piercing", () => {
    const card = runtimeCompiledCard("BT19-038");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [{ kind: "GrantStatic", grant: "nameForDigiXros", tokens: ["Dorulumon"] }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "Suspend" },
          { kind: "Restrict", restriction: "cannotActivateWhenDigivolving", duration: "untilOpponentTurnEnd" },
          { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
        ],
      })),
      { trigger: "OnDeletion", actions: [{ kind: "PlaceUnder", from: ["hand", "trash"], optional: true }] },
      { trigger: "YourTurn", isInherited: true, actions: [{ kind: "GainKeyword", keyword: { keyword: "Piercing" } }] },
    ]);
  });
});
