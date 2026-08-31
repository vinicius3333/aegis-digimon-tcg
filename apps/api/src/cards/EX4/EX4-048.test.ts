import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
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

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-048");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-048");
});
