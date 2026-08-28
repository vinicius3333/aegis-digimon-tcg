import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-191.js";

describe("P-191 Apollomon", () => {
  it("encodes Light Fang/Night Claw evolution and Blast Digivolve", () => {
    const card = runtimeCompiledCard("P-191")!;
    expect(card.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Light Fang", "Night Claw"], cost: 4, isAlternate: true },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("uses a 7000 DP deletion budget plus one per Olympos XII Digimon at both timings", () => {
    const card = runtimeCompiledCard("P-191")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -4000,
            scaling: { per: 1, unit: "cards", filter: { nameOrTrait: [{ tokens: ["Olympos XII"], match: "trait" }] } },
          },
          {
            kind: "DeleteByDPBudget",
            baseBudget: 7000,
            target: { count: "all" },
            budgetBonus: {
              per: 1,
              unit: "cards",
              filter: { nameOrTrait: [{ tokens: ["Olympos XII"], match: "trait" }] },
            },
          },
        ],
      });
    }
  });

  it("keeps the DNA-then-attack sequence and inherited once-per-turn attack", () => {
    const card = runtimeCompiledCard("P-191")!;
    expect(card.effects.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [
        {
          kind: "DnaDigivolve",
          optional: true,
          payCost: true,
          into: { nameOrTrait: [{ tokens: ["GraceNovamon"], match: "name" }] },
        },
        { kind: "Attack", optional: true },
      ],
    });
    expect(card.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "Attack", optional: true }],
    });
  });
});
