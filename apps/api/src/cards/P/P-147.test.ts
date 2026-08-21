import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-147.js";

describe("P-147 Pal", () => {
  it("encodes the mandatory When Digivolving reactivation after placing a Pulsemon-text level 4", () => {
    const compiled = runtimeCompiledCard("P-147")!;
    const attacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
    expect(attacking).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{
        kind: "ReactivateEffect",
        fromTrigger: "WhenDigivolving",
        count: 1,
        optional: true,
        abortOnDecline: true,
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "bottom",
          target: { filter: { zone: "hand", levels: [4], nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } },
        },
      }],
    });
  });

  it("encodes Tamer DP and the Pulsemon Rule name", () => {
    const compiled = runtimeCompiledCard("P-147")!;
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "YourTurn", actions: [expect.objectContaining({ kind: "Aura", effect: { kind: "modifyDP", amount: 3000 }, while: expect.objectContaining({ kind: "youHave" }) })] }),
      expect.objectContaining({ trigger: "Rule", actions: [expect.objectContaining({ kind: "GrantStatic", grant: "name", tokens: ["Pulsemon"] })] }),
    ]));
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Bibimon"], cost: 0, isAlternate: true }]);
  });
});
