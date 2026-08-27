import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-034.js";

describe("EX5-034 BanchoLeomon", () => {
  it("reduces play cost by five when combined security is six or fewer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      actions: [
        {
          kind: "Replacement",
          mode: "reduceCost",
          amount: 5,
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "playedFromZone", zone: "hand" },
              { kind: "totalSecurityCount", op: "lte", value: 6 },
            ],
          },
        },
      ],
    });
  });
  it("suspends on play/digivolving and applies the bound -4000/Security Attack -1 package", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent" } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Suspend",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { kind: ["Digimon"] },
          actions: [
            { kind: "SelectBind", optional: true, target: { bindAs: "ex5034OptionalTarget" } },
            { kind: "ModifyDP", amount: -4000, target: { fromSelectionRef: "ex5034OptionalTarget" } },
            {
              kind: "GainKeyword",
              keyword: { keyword: "SecurityAttack", amount: -1 },
              target: { fromSelectionRef: "ex5034OptionalTarget" },
            },
          ],
        },
      ],
    });
  });
});
