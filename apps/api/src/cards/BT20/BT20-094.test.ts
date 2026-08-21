import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-094.js";

describe("BT20-094 Emperor Dragon of Calamity", () => {
  it("reduces the optional Free Digimon trash play by 5 and then places itself", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main" && !entry.keywords)).toMatchObject({
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: true, reduceCostBy: 5, optional: true }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("makes Dragon Mode from digivolution cards the Delay action", () => {
    const delay = compiled.effects.find((entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay"));
    expect(delay).toMatchObject({
      actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true, target: { filter: { nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "name" }] } } }],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions).toHaveLength(1);
  });
});
