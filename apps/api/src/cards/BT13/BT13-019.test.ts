import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-019.js";

describe("BT13-019 Gankoomon", () => {
  it("optionally plays an allowed Sistermon or breeding-area Royal Knight", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const effect of compiled.effects) {
      expect(effect.keywords).toContainEqual(expect.objectContaining({ keyword: "Blocker" }));
      expect(effect.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash", "digivolutionCards"], target: { filter: { excludeNames: ["Omnimon", "Gankoomon"] } } });
    }
  });
});
