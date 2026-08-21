import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-082.js";

describe("BT17-082 Minami Uehara", () => {
  it("plays Labramon or Seasarmon from hand or a digivolution stack", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "PlayWithoutCost", from: ["hand", "digivolutionCards"], payCost: false, optional: true, target: { filter: { nameOrTrait: [{ tokens: ["Labramon", "Seasarmon"], match: "name" }] } } }] });
  });

  it("triggers only when one of your Digimon is played from digivolution cards", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], fromDigivolution: true },
      actions: [{
        kind: "GainKeyword",
        keyword: { keyword: "Rush" },
        duration: "forTheTurn",
        cost: { kind: "suspend", target: { isSelf: true } },
        optional: true,
        abortOnDecline: true,
      }],
    });
  });

  it("limits the temporary keyword to one blue Digimon", () => {
    expect(compiled.effects?.[1]?.actions?.[0]?.actions?.[0]).toMatchObject({ target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"] }, count: 1 } });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }] });
  });
});
