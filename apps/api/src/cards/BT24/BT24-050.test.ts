import { describe, expect, it } from "vitest";
import { compiled as BT24_050 } from "./BT24-050.js";

describe("BT24-050 WereGarurumon", () => {
  it("unsuspends your Digimon and restricts an opposing Digimon or Tamer", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_050.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Unsuspend",
        optional: true,
        target: { filter: { controller: "mine", kind: ["Digimon"] } },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Restrict",
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
      });
    }
  });
  it("keeps the inherited once-per-turn hand play filter", () => {
    const inherited = BT24_050.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as any).target.filter).toMatchObject({
      dp: { op: "lte", value: 4000 },
      excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
    });
  });
});
