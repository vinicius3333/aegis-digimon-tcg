import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-088.js";

describe("BT18-088 Takuya Kanbara & Koji Minamoto", () => {
  it("covers security, turn setup, main-phase placement, rule names, and inherited attack", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3 }] },
      {
        trigger: "StartOfYourMainPhase",
        actions: [{ kind: "PlaceUnder", target: { count: 1, upTo: true, from: ["trash"] } }],
      },
      {
        trigger: "Rule",
        actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Takuya Kanbara", "Koji Minamoto"] }],
      },
      {
        trigger: "EndOfYourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{ kind: "Attack", attackPlayer: true }],
      },
    ]);
  });

  it("raises placement capacity by two for each other Tamer", () => {
    expect(compiled.effects[2]).toMatchObject({
      actions: [{ kind: "PlaceUnder", target: { countModifier: { amount: 2, scaling: { unit: "cards", per: 1 } } } }],
    });
  });
});
