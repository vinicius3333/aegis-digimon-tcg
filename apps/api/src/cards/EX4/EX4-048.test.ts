import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-048.js";

describe("EX4-048 Gaiomon", () => {
  it("is also treated as Greymon and deletes an opposing Digimon costing at least thirteen", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Greymon"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { playCostGte: 13 } },
    });
  });
  it("trashes security when no Digimon was deleted and can free-digivolve with a Tamer", () => {
    const effects = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(effects?.[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "trashTop",
      condition: { kind: "ifThisEffectDidNotDelete" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: false,
      ignoreRequirements: true,
      condition: { kind: "youHave" },
      into: { playCostGte: 13 },
    });
  });
});
