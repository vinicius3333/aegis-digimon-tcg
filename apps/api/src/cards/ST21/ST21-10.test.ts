import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
describe("ST21-10", () => {
  it("requires either the 10000 DP opponent threshold or three Tamer colors", () => {
    const effect = (runtimeCompiledCard("ST21-10")?.effects ?? []).find((candidate) => candidate.trigger === "YourTurn");
    const action = effect?.actions[0];
    expect(action).toMatchObject({ kind: "Digivolve", payCost: true, from: ["hand"] });
    expect(action.into.nameOrTrait).toEqual([{ tokens: ["MetalGarurumon"], match: "name" }]);
    expect(action.condition).toMatchObject({ kind: "orCondition" });
    expect(action.condition.conditions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "opponentHas" }),
      expect.objectContaining({ kind: "zoneColorCount", value: 3 }),
    ]));
  });

  it("draws one then trashes one from hand once per turn as inherited behavior", () => {
    const effect = (runtimeCompiledCard("ST21-10")?.effects ?? []).find((candidate) => candidate.trigger === "WhenAttacking");
    expect(effect).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(effect?.actions).toEqual([
      expect.objectContaining({ kind: "Draw", amount: 1 }),
      expect.objectContaining({ kind: "Trash", target: expect.objectContaining({ filter: expect.objectContaining({ zone: "hand" }) }) }),
    ]);
  });
});
