import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-097.js";

describe("BT17-097 Return to the Primogenitor", () => {
  it("keeps the Main digivolution requirement and places the Option afterward", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          reduceCost: 4,
          optional: true,
          into: { kind: ["Digimon"], levelComparison: { op: "gte", value: 5 }, nameOrTrait: [{ tokens: ["Free"], match: "trait" }] },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("uses the intrinsic Delay replacement only for another effect's deletion", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay" }],
      actions: [{ kind: "Replacement", event: "wouldBeDeleted", leaveCause: "otherThanYourEffect" }],
    });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      actions: [
        { kind: "Digivolve", from: ["hand"], payCost: false, bindResultAs: "digivolvedToPreventDeletion", into: { nameOrTrait: [{ tokens: ["Imperialdramon"], match: "name" }] } },
        { kind: "Prevent", condition: { kind: "bindingExists", ref: "digivolvedToPreventDeletion" } },
      ],
    });
  });

  it("keeps the Security Tamer recovery path scoped to Davis or Ken", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true, target: { filter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["Davis Motomiya", "Ken Ichijoji"], match: "name" }] } } },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });
});
