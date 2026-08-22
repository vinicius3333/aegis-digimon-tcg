import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-048", () => {
  it("preserves Royal Base security DP, leave replacement, Insectoid rule grant, and inherited DP", () => {
    const card = runtimeCompiledCard("BT19-048");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "AllTurns", isSecurity: true, actions: [{ kind: "ModifyDP", amount: 1000 }] },
      {
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            mode: "prevent",
            sourceFilter: { excludeSelf: true, nameOrTrait: [{ tokens: ["Royal Base"] }], leaveReason: "effect" },
            cost: { kind: "placeAsSecurity", position: "faceUpBottom" },
          },
        ],
      },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Insectoid"] }] },
      { trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000 }] },
    ]);
  });
});
