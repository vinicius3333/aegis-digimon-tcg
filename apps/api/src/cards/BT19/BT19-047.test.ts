import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-047 Ballistamon", () => {
  it("preserves optional Tamer digivolution, Save, and inherited Blocker", () => {
    const card = runtimeCompiledCard("BT19-047");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [{
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["AtlurBallistamon"], match: "name" }] },
          onto: { filter: { controller: "mine", kind: ["Tamer"] }, count: 1 },
          payCost: false,
          optional: true,
        }],
      },
      { trigger: "OnDeletion", actions: [], keywords: [{ keyword: "Save", raw: "＜Save＞" }] },
      {
        trigger: "OpponentsTurn",
        isInherited: true,
        actions: [{
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
          duration: "permanent",
        }],
      },
    ]);
  });
});
