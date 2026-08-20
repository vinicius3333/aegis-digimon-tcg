import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../../cards/index.js";

describe("AD1-020 Tommy, Takuya, & Zoe", () => {
  it("documents and encodes the four-Hybrid threshold for gaining 2 memory", () => {
    const compiled = registeredCompiledCards.get("AD1-020");
    expect(compiled).toBeDefined();
    for (const trigger of ["StartOfYourMainPhase", "OnPlay"]) {
      const effect = compiled!.effects.find((entry) => entry.trigger === trigger);
      const gain = effect?.actions.find((action) => action.kind === "GainMemory");
      expect(gain).toMatchObject({ amount: 2, condition: { kind: "selfDigivolutionStackCountAtLeast", count: 4 } });
      expect((gain as { condition?: { raw?: string } }).condition?.raw).toContain("4 or more");
    }
  });
});
