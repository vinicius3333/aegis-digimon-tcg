import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-038.js";

describe("EX12-038 Kokuwamon", () => {
  it("does not allow Draw 2 without paying the mandatory trash cost", () => {
    const action = registeredCompiledCards.get("EX12-038")!.effects[0]!.actions[0]!;
    expect(action).toMatchObject({ kind: "Draw", amount: 2, cost: { kind: "trash" } });
    expect(action).not.toHaveProperty("optional");
    expect(action).not.toHaveProperty("abortOnDecline");
  });
});
