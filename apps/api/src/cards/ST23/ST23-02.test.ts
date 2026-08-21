import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST23-02.js";

describe("ST23-02 Liollmon", () => {
  it("reduces a same-controller Glowing Dawn digivolution by 1 during its turn", () => {
    const yourTurn = runtimeCompiledCard("ST23-02")?.effects.find((effect) => effect.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({
      actions: [{
        kind: "Replacement",
        event: "wouldDigivolve",
        sourceFilter: { isSelfRef: true },
        into: { nameOrTrait: [{ match: "trait", tokens: ["Glowing Dawn"] }] },
        actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
      }],
    });
  });
});
