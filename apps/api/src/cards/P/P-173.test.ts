import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-173.js";

describe("P-173 RustTyrannomon", () => {
  it("requires a level 5 Tyrannomon for its alternate digivolution", () => {
    expect(runtimeCompiledCard("P-173")!.digivolutionRequirement).toEqual([
      { level: 5, names: ["Tyrannomon"], cost: 4, isAlternate: true },
    ]);
  });

  it("encodes Collision, Piercing, Blocker, and De-Digivolve 4", () => {
    const card = runtimeCompiledCard("P-173")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Collision", raw: "＜Collision＞" },
      { keyword: "Piercing", raw: "＜Piercing＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        { kind: "DeDigivolve", amount: 4, target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } } },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { actions: [{ kind: "Unsuspend" }], fireCondition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
      ],
    });
  });
});
