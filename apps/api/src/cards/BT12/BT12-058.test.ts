import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-058.js";

describe("BT12-058 Zenimon", () => {
  it("is hand-written and carries its zero-cost Save-text alternate requirement", () => {
    expect(getEffectModule("BT12-058")?.cardId).toBe("BT12-058");
    expect(digivolutionRequirementsFor("BT12-058")).toContainEqual(
      expect.objectContaining({
        level: 2,
        texts: ["Save"],
        cost: 0,
        isAlternate: true,
      }),
    );
  });
});
