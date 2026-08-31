import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-073.js";

describe("EX7-073", () => {
  it("may use a Three Musketeers Option from hand without cost when digivolving", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
    }));
  it("may trash 2 Three Musketeers digivolution cards to delete the opponent's highest-level Digimon and trash the top security when digivolving or attacking", () => {
    const digivolving = compiled.effects?.filter((entry) => entry.trigger === "WhenDigivolving")[1]?.actions ?? [];
    const attacking = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions ?? [];
    expect(digivolving[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "highestLevel" } },
      cost: { kind: "trash", target: { count: 2, filter: { isSelfRef: true, zone: "digivolutionCards" } } },
    });
    expect(digivolving[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "trash",
      controller: "opponent",
      amount: 1,
      toTop: true,
      condition: { kind: "ifThisEffectActed" },
    });
    expect(attacking).toHaveLength(2);
    expect(attacking[0]).toMatchObject({
      kind: "Delete",
      cost: { kind: "trash", target: { count: 2, filter: { isSelfRef: true, zone: "digivolutionCards" } } },
    });
  });
});
