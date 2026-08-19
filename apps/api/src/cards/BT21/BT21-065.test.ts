import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-065.js";

describe("BT21-065 Ghostmon", () => {
  it("reduces Ghost digivolution cost on your turn and gains memory on deletion", () => {
    expect(compiled.effects).toContainEqual({
      trigger: "YourTurn",
      actions: [
        expect.objectContaining({
          kind: "Replacement",
          event: "wouldDigivolve",
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
