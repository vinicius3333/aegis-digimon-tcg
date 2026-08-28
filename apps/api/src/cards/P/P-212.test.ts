import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-212.js";

describe("P-212 Asuna Shiroki", () => {
  it("gains memory at the start of your main phase when the opponent has a Digimon", () => {
    expect(
      runtimeCompiledCard("P-212")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("draws, trashes from hand, and deletes a level 3 opponent Digimon only for a matching trashed card", () => {
    expect(runtimeCompiledCard("P-212")!.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", bindResultAs: "trashed", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
        {
          kind: "Delete",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], levels: [3] } },
          condition: {
            kind: "bindingContains",
            ref: "trashed",
            filter: { nameOrTrait: [{ tokens: ["Three Musketeers", "TS"], match: "trait" }] },
          },
        },
      ],
    });
  });

  it("plays itself without paying the cost in security", () => {
    expect(runtimeCompiledCard("P-212")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", payCost: false, target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
      ],
    });
  });
});
