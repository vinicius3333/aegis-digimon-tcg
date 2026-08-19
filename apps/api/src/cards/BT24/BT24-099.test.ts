import { describe, expect, it } from "vitest";
import { compiled as BT24_099 } from "./BT24-099.js";
import "../index.js";

describe("BT24-099 Super Hacking", () => {
  it("implements the Appmon cost, deletion arming, and Delay link", () => {
    expect(BT24_099.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon", "Tamer"],
          nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
        },
      },
    });
    const main = BT24_099.effects?.find((entry) => entry.trigger === "Main" && entry.keywords === undefined);
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      cost: {
        kind: "trash",
        target: {
          filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
          count: 1,
        },
      },
    });
    expect(main?.actions?.[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
    const arm = BT24_099.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(arm?.actions?.[0] as { event?: string; sourceFilter?: unknown; actions?: unknown[] }).toMatchObject({
      event: "onDeletionOf",
      sourceFilter: { controller: "any", kind: ["Digimon"] },
    });
    expect((arm?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Delay" },
    });
    const delay = BT24_099.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Delay"));
    expect(delay?.actions?.[0]).toMatchObject({
      kind: "Link",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
        count: 1,
      },
      recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
    });
  });
});
