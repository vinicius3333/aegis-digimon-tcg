import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-110.js";

describe("BT13-110 Royal Knights of the Purge", () => {
  it("draws, may place a Digimon from hand under a breeding-area King Drasil, then places itself", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main" && entry.actions?.[0]?.kind === "Draw")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1 });
    expect(actions[1]).toMatchObject({ kind: "PlaceUnder", from: ["hand"], optional: true, underFilter: { controller: "mine", zone: "breedingArea", nameOrTrait: [{ match: "name", tokens: ["King Drasil_7D6"] }] } });
    expect(actions[2]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
  });

  it("has a Delay branch that plays one Royal Knight from breeding digivolution cards with Rush", () => {
    const delay = compiled.effects?.find((entry) => entry.trigger === "Main" && entry.keywords?.some((keyword) => keyword.keyword === "Delay"));
    expect(delay).toBeDefined();
    expect(delay?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true, suppressOnPlayEffects: true, bindResultAs: "playedDigimon", target: { filter: { controller: "mine", location: "breedingArea", nameOrTrait: [{ match: "trait", tokens: ["Royal Knight"] }] }, count: 1 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Rush" }, duration: "forTheTurn", target: { bindReference: "playedDigimon" } });
  });
});
