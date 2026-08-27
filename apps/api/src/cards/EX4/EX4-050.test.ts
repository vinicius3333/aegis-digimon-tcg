import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-050.js";

describe("EX4-050 ShadowSeraphimon", () => {
  it("requires the exact Seraphimon name for its alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toMatchObject([{ namesExact: ["Seraphimon"], cost: 1 }]);
  });

  it("De-Digivolves an opposing Digimon when security is removed during the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      actions: [{ kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent" } } }],
    });
  });
  it("adds one security and reduces opposing DP by 4000 per own security on deletion", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "SecurityManipulation", op: "addTop", source: "deck", amount: 1 });
    expect(actions?.[1]).toMatchObject({ kind: "ModifyDP", amount: -4000, scaling: { per: 1, unit: "security" } });
  });
});
