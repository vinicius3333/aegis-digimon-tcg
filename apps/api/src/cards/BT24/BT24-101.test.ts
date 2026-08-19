import { describe, expect, it } from "vitest";
import { compiled as BT24_101 } from "./BT24-101.js";
import "../index.js";

describe("BT24-101 Hadesmon", () => {
  it("trashes the correct security cards and protects TS Digimon/Tamers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT24_101.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "mine",
        amount: 1,
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "ModifyDP",
        amount: -13000,
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions?.[2]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTop",
        source: "deck",
        amount: 2,
        condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 1 },
      });
    }
    const securityWatcher = BT24_101.effects?.find(
      (entry) => entry.trigger === "AllTurns" && !entry.isInherited && entry.actions?.[0]?.kind === "SubTrigger",
    );
    expect((securityWatcher?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "trashSecurityTop",
      controller: "opponent",
      count: 1,
    });
    const replacement = BT24_101.effects?.find(
      (entry) => entry.trigger === "AllTurns" && entry.actions?.[0]?.kind === "Replacement",
    );
    expect((replacement?.actions?.[0] as { sourceFilter?: unknown }).sourceFilter).toMatchObject({
      controller: "mine",
      kind: ["Digimon", "Tamer"],
      nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
    });
    expect(
      (replacement?.actions?.[0] as { actions?: Array<{ cost?: { target?: { filter?: unknown } } }> }).actions?.[0]
        ?.cost?.target?.filter,
    ).toMatchObject({ controller: "mine", zone: "security", position: "top" });
  });
});
