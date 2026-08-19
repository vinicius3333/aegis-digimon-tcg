import { describe, expect, it } from "vitest";
import { compiled as BT24_100 } from "./BT24-100.js";
import "../index.js";

describe("BT24-100 Iliad", () => {
  it("waives color requirements and reveals TS before entering the battle area", () => {
    expect(BT24_100.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon", "Tamer"],
          nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
        },
      },
    });
    const main = BT24_100.effects?.find(
      (entry) => entry.trigger === "Main" && entry.actions?.[0]?.kind === "RevealAdd",
    );
    expect(main?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        {
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
          count: 1,
          to: "hand",
        },
      ],
    });
    expect(main?.actions?.[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
    const delay = BT24_100.effects?.find(
      (entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay"),
    );
    expect(delay?.actions?.[0]).toMatchObject({ kind: "GainMemory", amount: 2 });
    expect(BT24_100.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "PlaceInBattleAreaSelf",
    });
  });
});
