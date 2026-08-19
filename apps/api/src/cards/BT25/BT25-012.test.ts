import { describe, expect, it } from "vitest";
import { compiled as BT25_012 } from "./BT25-012.js";
import "../index.js";

describe("BT25-012 Grizzlymon", () => {
  it("grants Raid and +3000 DP to one eligible non-Sea Animal Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_012.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Raid" },
        duration: "forTheTurn",
        target: { filter: { controller: "mine", kind: ["Digimon"], excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }] }, count: 1 },
      });
      expect(effect?.actions?.[1]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "forTheTurn", target: { count: 1 } });
    }
  });

  it("preserves the inherited +1000 DP", () => {
    expect(BT25_012.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] });
  });
});
