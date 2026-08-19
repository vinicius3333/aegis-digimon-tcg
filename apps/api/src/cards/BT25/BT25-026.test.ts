import { describe, expect, it } from "vitest";
import { compiled as BT25_026 } from "./BT25-026.js";
import "../index.js";

describe("BT25-026 Crescemon", () => {
  it("trashes the bottom three opponent digivolution cards, then restricts one empty stack", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_026.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "TrashDigivolution",
        amount: 3,
        fromTop: false,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" }, count: 1 },
      });
    }
  });

  it("gates the Dianamon-from-trash option on a red Digimon event during your turn", () => {
    const effect = BT25_026.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited);
    expect(effect?.actions?.some((action) => action.kind === "SubTrigger" && action.event === "whenPlayed" && action.fireCondition?.kind === "allOf")).toBe(true);
    expect(effect?.actions?.some((action) => action.kind === "SubTrigger" && action.event === "whenOneOfYoursDigivolves" && action.fireCondition?.kind === "allOf")).toBe(true);
    for (const action of effect?.actions ?? []) {
      if (action.kind !== "SubTrigger") continue;
      expect(action.fireCondition).toMatchObject({ kind: "allOf", conditions: expect.arrayContaining([
        { kind: "triggerSubjectHasColor", filter: { colors: ["Red"] } },
        { kind: "isYourTurn" },
      ]) });
      expect(action.actions?.[0]).toMatchObject({
        kind: "Digivolve",
        into: { nameOrTrait: [{ tokens: ["Dianamon"], match: "name" }] },
        from: ["trash"],
        payCost: true,
        costDelta: -2,
        optional: true,
      });
    }
  });

  it("keeps the inherited attack-target restriction", () => {
    const inherited = BT25_026.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "YourTurn" });
    expect(inherited?.actions?.[0]).toMatchObject({ kind: "Restrict", restriction: "attackTargetChange", duration: "permanent" });
  });
});
