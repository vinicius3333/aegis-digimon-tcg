import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-097.js";

describe("BT22-097 Music of the Heart", () => {
  it("waives color requirements only while an Appmon is in the field", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(effect?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHave",
        filter: {
          zone: ["battleArea", "breedingArea"],
          kind: ["Digimon", "Tamer"],
          nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
        },
      },
    });
  });

  it("draws and places itself in the battle area from Main", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions).toEqual([{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }]);
  });

  it("grants Delay when an own Appmon is played and links only eligible Appmon cards", () => {
    const armed = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(armed?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
      },
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" }, duration: "permanent" }],
    });

    const delay = compiled.effects.find(
      (entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay"),
    );
    expect(delay?.actions[0]).toMatchObject({
      kind: "Link",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
          hasLinkRequirement: true,
        },
      },
      recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
    });
  });

  it("places itself in the battle area from Security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true, actions: [{ kind: "PlaceInBattleAreaSelf" }] });
  });
});
