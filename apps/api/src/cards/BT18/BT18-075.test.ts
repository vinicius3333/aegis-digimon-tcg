import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-075.js";

describe("BT18-075 Liollmon", () => {
  it("proves the once-per-turn multicolor purple/yellow reduction and Q3019 breeding boundary", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const replacements = compiled.effects[0]!.actions;
    expect(replacements).toHaveLength(2);
    expect(replacements[0]).toMatchObject({
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
      into: { multicolor: true, colors: ["Purple", "Yellow"] },
      actions: [{ mode: "reduceCost", amount: 1 }],
    });
    expect(replacements[1]).toMatchObject({
      event: "wouldDigivolve",
      sourceFilter: { controller: "mine", kind: ["Tamer"] },
      into: { multicolor: true, colors: ["Purple", "Yellow"] },
      actions: [{ mode: "reduceCost", amount: 1 }],
    });
    expect(compiled.effects[0]!.frequency).toBe("OncePerTurn");
    expect(compiled.effects[1]).toMatchObject({ isInherited: true, keywords: [{ keyword: "Retaliation" }] });
  });
});
