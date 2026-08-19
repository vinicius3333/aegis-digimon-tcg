import { describe, expect, it } from "vitest";
import { compiled as BT25_050 } from "./BT25-050.js";
import "../index.js";

describe("BT25-050 Togemon", () => {
  it("suspends a Digimon, then restricts unsuspension once two are suspended", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_050.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "Suspend", optional: true });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Restrict",
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        condition: {
          kind: "totalDigimonCount",
          filter: { suspended: true, kind: ["Digimon"] },
          op: "gte",
          value: 2,
        },
      });
    }
    const inherited = BT25_050.effects?.find((entry) => entry.isInherited);
    expect(inherited?.actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: 1000, duration: "permanent" });
  });
});
