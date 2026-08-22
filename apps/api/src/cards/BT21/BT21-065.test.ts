import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-065.js";

describe("BT21-065 Ghostmon", () => {
  it("preserves complete residual-free coverage", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("reduces Ghost digivolution cost on your turn and gains memory on deletion", () => {
    expect(compiled.effects).toContainEqual({
      trigger: "YourTurn",
      actions: [
        expect.objectContaining({
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
          actions: [expect.objectContaining({ kind: "Replacement", mode: "reduceCost", amount: 1 })],
        }),
      ],
    });
    expect(compiled.effects).toContainEqual({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
      isInherited: true,
    });
  });
});
