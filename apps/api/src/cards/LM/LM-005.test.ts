import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./LM-005.js";

describe("LM-005 Amphimon", () => {
  it("requires three Jellymon-text cards from trash for its attacking Security Attack +1", () => {
    const effect = runtimeCompiledCard("LM-005")!.effects.find((entry) => entry.trigger === "WhenAttacking")!;
    expect(effect.actions).toContainEqual(expect.objectContaining({
      kind: "GainKeyword",
      keyword: expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
      cost: expect.objectContaining({ kind: "return", to: "deckBottom", target: expect.objectContaining({ count: 3 }) }),
    }));
  });
});
