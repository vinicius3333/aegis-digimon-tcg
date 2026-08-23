import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-194.js";

describe("P-194 Aegiomon", () => {
  it("requires a level 3 TS Digimon for evolution", () => {
    expect(runtimeCompiledCard("P-194")!.digivolutionRequirement).toEqual([
      { level: 3, traits: ["TS"], cost: 2, isAlternate: true },
    ]);
  });

  it("has Blocker and Barrier, with inherited Barrier preserved", () => {
    const card = runtimeCompiledCard("P-194")!;
    expect(card.effects.filter((effect) => !effect.isInherited).flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Blocker", raw: "＜Blocker＞" },
      { keyword: "Barrier", raw: "＜Barrier＞" },
    ]);
    expect(card.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    });
  });
});
