import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-012.js";

describe("EX12-012 Apemon", () => {
  it("requires the SW hand-trash cost in both timing windows", () => {
    const card = registeredCompiledCards.get("EX12-012")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = card.effects.find((e) => e.trigger === trigger)!.actions[0]!;
      expect(action).toMatchObject({ kind: "Draw", amount: 2, cost: { kind: "trash" } });
      expect(action).not.toHaveProperty("optional");
      expect(action).not.toHaveProperty("abortOnDecline");
    }
  });
});
