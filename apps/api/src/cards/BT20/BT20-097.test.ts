import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-097.js";

describe("BT20-097 The Apostle of Doom Descends!", () => {
  it("uses the reduced-cost trash digivolution and then places itself", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main" && !entry.keywords)).toMatchObject({
      actions: [{ kind: "Digivolve", from: ["trash"], reduceCostBy: 4, optional: true }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("makes the DeathXmon play a Delay action paid by a stacked Dorumon", () => {
    const delay = compiled.effects.find((entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay"));
    expect(delay).toMatchObject({
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], optional: true, abortOnDecline: true, cost: { kind: "return", target: { filter: { zone: "digivolutionCards", nameOrTrait: [{ tokens: ["Dorumon"], match: "name" }] } } } }],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions).toHaveLength(1);
  });
});
