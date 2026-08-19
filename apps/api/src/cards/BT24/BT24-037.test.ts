import { describe, expect, it } from "vitest";
import { compiled as BT24_037 } from "./BT24-037.js";

describe("BT24-037 Silphymon", () => {
  it("allows yellow/red or TS level-4-or-lower stack plays", () => {
    const replacements = BT24_037.effects?.filter((entry) => entry.trigger === "AllTurns");
    expect(replacements).toHaveLength(2);
    for (const effect of replacements ?? []) {
      const play = (effect.actions?.[0] as any).actions?.[0];
      expect(play).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], optional: true });
      expect(play.target.filter).toMatchObject({
        levelComparison: { op: "lte", value: 4 },
        or: [{ colors: ["Red", "Yellow"] }, { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] }],
      });
    }
  });
  it("models the conditional DNA attack bonuses", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_037.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: -5000 });
      expect(actions[2]).toMatchObject({
        kind: "GainKeyword",
        duration: "forTheTurn",
        condition: { kind: "raw", raw: "DNA digivolving" },
      });
    }
  });
});
