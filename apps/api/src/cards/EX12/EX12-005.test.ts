import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-005.js";

describe("EX12-005 Agumon", () => {
  it("requires the printed hand-trash cost", () => {
    const action = registeredCompiledCards.get("EX12-005")!.effects[0]!.actions[0]!;
    expect(action).toMatchObject({ kind: "Draw", amount: 2, cost: { kind: "trash" } });
    expect(action).not.toHaveProperty("optional");
    expect(action).not.toHaveProperty("abortOnDecline");
  });
});
