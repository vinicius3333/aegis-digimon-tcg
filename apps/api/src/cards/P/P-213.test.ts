import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-213.js";

describe("P-213 Aegiochusmon", () => {
  it("has Raid, Decode, and the Aegiomon digivolution requirement", () => {
    const card = runtimeCompiledCard("P-213")!;
    expect(card.digivolutionRequirement).toEqual([{ names: ["Aegiomon"], cost: 3, isAlternate: true }]);
    expect(card.effects.filter((effect) => effect.trigger === "Static").map((effect) => effect.keywords)).toEqual([
      [{ keyword: "Raid", raw: "＜Raid＞" }],
      [{ keyword: "Decode", raw: "＜Decode ([Aegiomon])＞" }],
      [{ keyword: "Decode", raw: "＜Decode ([Aegiomon])＞" }],
    ]);
  });

  it("gains Rush and 3000 DP at three or fewer security, then may attack", () => {
    expect(runtimeCompiledCard("P-213")!.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush", raw: "＜Rush＞" },
          duration: "untilOpponentTurnEnd",
          target: { count: 1, isSelf: true },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
        },
        {
          kind: "ModifyDP",
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          target: { count: 1, isSelf: true },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
        },
        { kind: "Attack", optional: true, withoutSuspending: false, target: { count: 1, isSelf: true } },
      ],
    });
  });
});
