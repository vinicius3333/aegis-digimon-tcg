import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-048.js";

describe("BT22-048 Togemon", () => {
  it("grants Raid and Piercing only with a same-level stack pair", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "forTheTurn" });
      expect(effect?.actions[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Raid" },
        condition: { kind: "stackHasSameLevelCards", count: 2 },
      });
      expect(effect?.actions[2]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Piercing" },
        condition: { kind: "stackHasSameLevelCards", count: 2 },
      });
    }
  });

  it("retains the inherited Your Turn +2000 DP", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: 2000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });
});
