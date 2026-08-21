import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-072.js";

describe("BT17-072 Ornismon", () => {
  it("deletes one opposing unsuspended Digimon on play and digivolving", () => {
    expect(compiled.effects.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger))).toHaveLength(2);
    for (const effect of compiled.effects.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger))) {
      expect(effect.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", unsuspended: true, kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("grants both continuous bonuses while another level-6 Digimon exists", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect?.actions).toEqual([
      expect.objectContaining({ effect: { kind: "modifyDP", amount: 2000 }, while: expect.objectContaining({ kind: "youHave", filter: expect.objectContaining({ levels: [6], excludeSelf: true }) }) }),
      expect.objectContaining({ effect: { kind: "keyword", keyword: expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }) }, while: expect.objectContaining({ kind: "youHave", filter: expect.objectContaining({ levels: [6], excludeSelf: true }) }) }),
    ]);
  });
});
