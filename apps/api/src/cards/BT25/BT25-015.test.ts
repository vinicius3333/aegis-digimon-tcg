import { describe, expect, it } from "vitest";
import { compiled as BT25_015 } from "./BT25-015.js";
import "../index.js";

describe("BT25-015 Garudamon", () => {
  it("deletes one opposing Digimon at 6000 DP or less on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_015.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: 1 } });
    }
  });

  it("limits inherited security trash to this Digimon deleting in battle", () => {
    const inherited = BT25_015.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ frequency: "OncePerTurn" });
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenDeletesInBattle",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
    });
  });
});
