import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-076.js";
describe("BT21-076 WarGrowlmon", () => {
  it("mills two, grants keywords, and offers once-per-turn evolution", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: expect.arrayContaining([
          expect.objectContaining({ kind: "Digivolve" }),
          expect.objectContaining({ kind: "Replacement", mode: "reduceCost", scaling: expect.anything() }),
        ]),
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "Trash",
            target: expect.objectContaining({ filter: { controller: "opponent" } }),
          }),
        ],
      }),
    );
  });
});
