import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-019 Jellymon", () => {
  it("preserves conditional Yao Qinglan play, the Aquatic rule trait, and inherited memory gain", () => {
    const card = runtimeCompiledCard("BT19-019");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Yao Qinglan"], match: "name" }] } },
            condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"], countMax: 1 } },
          },
        ],
      },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }] },
      {
        trigger: "EndOfAttack",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{ kind: "GainMemory", amount: 1 }],
      },
    ]);
  });
});
