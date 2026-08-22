import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-009 Growlmon", () => {
  it("preserves conditional Takato play and the inherited memory-gated deletion cap", () => {
    const card = runtimeCompiledCard("BT19-009");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Takato Matsuki"], match: "name" }] } },
            condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"], countMax: 1 } },
            optional: true,
          },
        ],
      },
      {
        trigger: "AllTurns",
        isInherited: true,
        actions: [
          {
            kind: "GrantStatic",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            grant: "effects",
            tokens: ["DeleteCap+2000"],
            condition: { kind: "memoryAtMost", value: 0, controller: "mine" },
          },
        ],
      },
    ]);
  });
});
