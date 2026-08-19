import { describe, expect, it } from "vitest";
import { compiled as BT25_055 } from "./BT25-055.js";
import "../index.js";

describe("BT25-055 Taomon", () => {
  it("uses the shared suspended-Digimon threshold and its two turn watchers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(BT25_055.effects?.find((entry) => entry.trigger === trigger)?.actions?.[1]).toMatchObject({
        kind: "Unsuspend",
        condition: { kind: "totalDigimonCount", filter: { suspended: true, kind: ["Digimon"] }, op: "gte", value: 2 },
      });
    }
    const allTurns = BT25_055.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect((allTurns?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      target: { filter: { controller: "mine", kind: ["Digimon"], dp: { op: "lte", value: 4000 } } },
    });
    const inherited = BT25_055.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "RedirectAttack",
      target: { filter: { controller: "mine", suspended: true, kind: ["Digimon"] } },
    });
  });
});
