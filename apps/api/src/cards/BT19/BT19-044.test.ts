import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-044", () => {
  it("preserves Henry Wong/Calumon memory gain and inherited attack suspension", () => {
    const card = runtimeCompiledCard("BT19-044");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Henry Wong", "Calumon"] }] } },
          },
        ],
      },
      {
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] } } }],
      },
    ]);
  });
});
