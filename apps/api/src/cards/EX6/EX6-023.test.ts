import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-023.js";

describe("EX6-023 Gokuumon", () => {
  it("shares a once-per-turn DigiXros effect that grants Security Attack -1 and deletes a 6000 DP or lower Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "GainKeyword",
        optional: true,
        target: { filter: { controller: "any" } },
        keyword: { keyword: "SecurityAttack", amount: -1 },
      },
      {
        kind: "Delete",
        target: { filter: { dp: { op: "lte", value: 6000 } } },
        condition: { kind: "digiXrosCount", minimum: 1 },
      },
    ]);
  });
  it("permits exactly one listed DigiXros material", () =>
    expect(compiled.digiXrosRequirement).toMatchObject([{ count: 2, maxMaterials: 1 }]));
  it("returns a yellow Digimon source from its own stack when it would leave play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: { filter: { colors: ["Yellow"], zone: "digivolutionCards", hostFilter: { isSelfRef: true } } },
        },
      ],
    }));
});
