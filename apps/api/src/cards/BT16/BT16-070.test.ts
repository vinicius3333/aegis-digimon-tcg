import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-070.js";

describe("BT16-070", () => {
  it("models Armor Purge", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Armor Purge" }] });
  });

  it("deletes a chosen own Digimon and an opposing Digimon with equal-or-lower DP", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "SelectBind", optional: true, abortOnDecline: true, target: { bindAs: "chosenDigimon" } });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Delete", target: { fromSelectionRef: "chosenDigimon" } });
      expect(effect.actions?.[2]).toMatchObject({ kind: "Delete", target: { filter: { relativeTo: { attr: "dp", op: "lte", selectionRef: "chosenDigimon" } } } });
    }
  });
});
