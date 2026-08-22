import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-148.js";

describe("P-148 Wanyamon", () => {
  it("encodes the inherited once-per-turn conditional Draw 1", () => {
    const compiled = runtimeCompiledCard("P-148")!;
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [expect.objectContaining({
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: expect.objectContaining({
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["NSp"], match: "trait" }] },
          }),
        })],
      }),
    ]));
  });
});
