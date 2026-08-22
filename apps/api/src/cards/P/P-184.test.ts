import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-184.js";

describe("P-184 Dorugoramon", () => {
  it("encodes DoruGreymon and SoC alternate digivolution requirements", () => {
    expect(runtimeCompiledCard("P-184")!.digivolutionRequirement).toEqual([
      { level: 5, names: ["DoruGreymon"], cost: 3, isAlternate: true },
      { traits: ["SoC"], cost: 3, isAlternate: true, level: 5 },
    ]);
  });

  it("encodes Collision, Security Attack +1, and the conditional SoC unsuspend", () => {
    const card = runtimeCompiledCard("P-184")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Collision", raw: "＜Collision＞" },
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd", target: { isSelf: true, count: 1 } },
        {
          kind: "Unsuspend",
          target: { count: "all", filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["SoC"], match: "trait" }] } },
          condition: { kind: "selfDigivolutionStackHasTrait", filter: { nameOrTrait: [{ tokens: ["Kosuke Kisakata"], match: "name" }] } },
        },
      ],
    });
  });
});
