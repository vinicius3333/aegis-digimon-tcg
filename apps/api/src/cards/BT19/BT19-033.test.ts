import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-033 Dorulumon", () => {
  it("preserves optional JaegerDorulumon Tamer-onto digivolution, Save, and inherited Piercing", () => {
    const card = runtimeCompiledCard("BT19-033");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Digivolve",
            optional: true,
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            onto: { filter: { controller: "mine", kind: ["Tamer"] }, count: 1 },
            into: { nameOrTrait: [{ tokens: ["JaegerDorulumon"], match: "name" }] },
          },
        ],
      },
      { trigger: "OnDeletion", actions: [], keywords: [{ keyword: "Save" }] },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "GainKeyword", keyword: { keyword: "Piercing" }, duration: "permanent" }],
      },
    ]);
  });
});
