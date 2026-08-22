import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-047", () => {
  it("preserves optional Tamer digivolution, Save, and inherited opponent-turn Blocker", () => {
    const card = runtimeCompiledCard("BT19-047");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Digivolve",
            into: { nameOrTrait: [{ tokens: ["AtlurBallistamon"] }] },
            onto: { filter: { controller: "mine", kind: ["Tamer"] } },
            payCost: false,
            optional: true,
          },
        ],
      },
      { trigger: "OnDeletion", keywords: [{ keyword: "Save" }] },
      {
        trigger: "OpponentsTurn",
        isInherited: true,
        actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "permanent" }],
      },
    ]);
  });
});
