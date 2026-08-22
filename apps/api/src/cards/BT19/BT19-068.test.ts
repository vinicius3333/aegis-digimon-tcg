import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-068.js";

describe("BT19-068", () => {
  it("preserves Twilight/Composite reveal, Nene play, self placement, and Composite trait", () => {
    const card = runtimeCompiledCard("BT19-068");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [{ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }], rest: "trash" }],
      },
      {
        trigger: "OnDeletion",
        actions: [
          { kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true },
          {
            kind: "PlaceUnder",
            underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
            optional: true,
          },
        ],
      },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Composite"] }] },
    ]);
  });
});
