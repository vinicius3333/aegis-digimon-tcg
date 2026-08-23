import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("ST24-02 Gaomon", () => {
  it("places exactly one hand card under a DATA SQUAD Tamer to draw 2", () => {
    const compiled = registeredCompiledCards.get("ST24-02") ?? getCompiledCard("ST24-02")!;
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 2,
          optional: true,
          cost: {
            kind: "place",
            target: { count: 1, from: ["hand"] },
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
            },
          },
        },
      ],
    });
  });
});
