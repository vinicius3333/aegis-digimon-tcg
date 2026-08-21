import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-195.js";

describe("P-195 Inori Misono", () => {
  it("gains memory at the start of the main phase when the opponent has a Digimon", () => {
    expect(runtimeCompiledCard("P-195")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }],
    });
  });

  it("offers Elecmon play or free Aegiomon digivolution on play", () => {
    expect(runtimeCompiledCard("P-195")!.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [{
        kind: "Modal",
        choose: 1,
        options: [
          [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, target: { count: 1, filter: { nameOrTrait: [{ tokens: ["Elecmon"], match: "name" }] } } }],
          [{ kind: "Digivolve", from: ["hand"], payCost: false, target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } }, into: { nameOrTrait: [{ tokens: ["Aegiomon"], match: "name" }] } }],
        ],
      }],
    });
  });

  it("plays itself for free from Security", () => {
    expect(runtimeCompiledCard("P-195")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }] });
  });
});
