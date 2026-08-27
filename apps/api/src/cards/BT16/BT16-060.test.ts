import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled } from "./BT16-060.js";

describe("BT16-060 Tankdramon IR", () => {
  it("scales each play-cost reduction from matching revealed cards", () => {
    const reductions = compiled.effects
      .flatMap((effect) => effect.actions)
      .filter((action) => action.kind === "Replacement");

    expect(reductions).toHaveLength(2);
    for (const reduction of reductions) {
      expect(reduction.scaling?.unit).toBe("cards");
      expect(reduction.scaling?.filter?.zone).toBe("revealed");
    }
    expect(irNode(compiled.effects[0]?.actions[0])?.rest).toBe("deckTopOrBottom");
    expect(irNode(compiled.effects[1]?.actions[0])?.rest).toBe("deckTopOrBottom");
  });
});
