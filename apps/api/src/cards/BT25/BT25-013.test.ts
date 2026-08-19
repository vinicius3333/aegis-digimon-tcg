import { describe, expect, it } from "vitest";
import { compiled as BT25_013 } from "./BT25-013.js";
import "../index.js";

describe("BT25-013 Firamon", () => {
  it("trashes one hand card to optionally return a red/blue Iliad Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_013.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Return",
        optional: true,
        abortOnDecline: true,
        target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], colors: ["Red", "Blue"], nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] }, count: 1 },
        cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
      });
    }
  });

  it("uses a structured blue trigger gate for the Flaremon option", () => {
    const effect = BT25_013.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited);
    for (const event of ["whenPlayed", "whenOneOfYoursDigivolves"] as const) {
      const watcher = effect?.actions?.find((action) => action.kind === "SubTrigger" && action.event === event);
      expect(watcher).toMatchObject({ fireCondition: { kind: "triggerSubjectHasColor", filter: { colors: ["Blue"] } } });
      const subTrigger = watcher as { actions?: unknown[] } | undefined;
      expect(subTrigger?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true });
    }
  });

  it("keeps inherited +2000 DP during your turn", () => {
    expect(BT25_013.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }] });
  });
});
