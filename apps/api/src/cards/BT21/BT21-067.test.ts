import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-067.js";

describe("BT21-067 Garurumon", () => {
  it("supports security play, ADVENTURE recovery, and inherited draw-trash", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Security", actions: [expect.objectContaining({ kind: "PlayWithoutCost" })] }),
    );
    expect(
      compiled.effects.filter((entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving"),
    ).toHaveLength(2);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: expect.arrayContaining([
          expect.objectContaining({ kind: "Draw", amount: 1 }),
          expect.objectContaining({ kind: "Trash" }),
        ]),
      }),
    );
  });
});
