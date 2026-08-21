import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-044 Terriermon", () => {
  it("preserves its Henry Wong/Calumon memory condition and inherited effect", () => {
    const card = runtimeCompiledCard("BT19-044");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [{
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Henry Wong", "Calumon"], match: "name" }],
            },
          },
        }],
      },
      {
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        }],
      },
    ]);
  });
});
