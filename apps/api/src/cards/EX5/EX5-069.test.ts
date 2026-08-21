import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-069.js";

describe("EX5-069 Biting Crush", () => {
  it("deletes an opposing level 6 or lower Digimon by trashing a hand card, then plays Leviamon when the trashed card is a Seven Great Demon Lord", () => {
    expect(
      compiled.effects?.find((entry) => entry.trigger === "Main" && entry.actions?.[0]?.kind === "Delete")?.actions,
    ).toMatchObject([
      {
        kind: "Delete",
        target: {
          count: 1,
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 6 } },
        },
        cost: {
          kind: "trash",
          target: { count: 1, bindAs: "trashedCard", filter: { controller: "mine", zone: "hand" } },
        },
      },
      {
        kind: "PlaceInBattleAreaSelf",
        condition: {
          kind: "boundCardHasTrait",
          bindRef: "trashedCard",
          nameOrTrait: [{ match: "trait", tokens: ["Seven Great Demon Lords"] }],
        },
      },
    ]);
  });
  it("arms Delay when an effect plays an opposing Digimon and activates the security Main effect", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea", byEffect: true },
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" } }],
    });
    expect(
      compiled.effects?.find(
        (entry) => entry.trigger === "Main" && entry.keywords?.some((keyword) => keyword.keyword === "Delay"),
      )?.actions[0],
    ).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      requiresDelayArmed: true,
      target: {
        count: 1,
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Leviamon"] }] },
      },
    });
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]?.kind).toBe("ActivateMain");
  });
});
