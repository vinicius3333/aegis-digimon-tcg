import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-099.js";

describe("BT22-099 Kuremi Detective Agency", () => {
  it("waives color requirements while a CS card is in either field area", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(effect?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "anyOf",
        conditions: [
          { kind: "youHave", filter: { kind: ["Digimon", "Tamer"] } },
          { kind: "youHave", filter: { zone: "breeding", kind: ["Digimon", "Tamer"] } },
        ],
      },
    });
  });

  it("reveals three, adds one CS card, bottoms the rest, then places itself", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect?.actions).toMatchObject([
      {
        kind: "RevealAdd",
        revealCount: 3,
        add: [{ filter: { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] }, count: 1, to: "hand" }],
        rest: "deckBottom",
      },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
  });

  it("keeps the Delay memory effect and Security placement", () => {
    const delay = compiled.effects.find(
      (entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay"),
    );
    expect(delay?.actions).toEqual([{ kind: "GainMemory", amount: 2 }]);
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlaceInBattleAreaSelf" }],
    });
  });
});
