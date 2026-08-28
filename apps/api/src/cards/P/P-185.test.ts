import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-185.js";

describe("P-185 EmperorGreymon", () => {
  it("requires a Takuya Kanbara Tamer with five Hybrid cards under it", () => {
    expect(runtimeCompiledCard("P-185")!.digivolutionRequirement).toEqual([
      {
        names: ["Takuya Kanbara"],
        cost: 4,
        isAlternate: true,
        baseIsTamer: true,
        minTraitStackCount: 5,
        minTraitStackTraits: ["Hybrid"],
      },
    ]);
  });

  it("encodes Blocker, DP-relative deletion, color scaling, and end-of-turn unsuspend", () => {
    const card = runtimeCompiledCard("P-185")!;
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Blocker" }],
    });
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: {
            count: 1,
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
          },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          scaling: { per: 1, unit: "colors", filter: { controllerDefault: "mine" } },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", target: { isSelf: true } }],
    });
  });
});
