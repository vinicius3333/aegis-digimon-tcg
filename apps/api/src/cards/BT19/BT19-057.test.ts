import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-057.js";

describe("BT19-057", () => {
  it("preserves optional Tamer digivolution, Save, and inherited Collision", () => {
    const card = runtimeCompiledCard("BT19-057");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "Digivolve",
            into: { nameOrTrait: [{ tokens: ["RaptorSparrowmon"] }] },
            onto: { filter: { controller: "mine", kind: ["Tamer"] } },
            optional: true,
          },
        ],
      },
      { trigger: "OnDeletion", keywords: [{ keyword: "Save" }] },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "GainKeyword", keyword: { keyword: "Collision" }, duration: "permanent" }],
      },
    ]);
  });
});
