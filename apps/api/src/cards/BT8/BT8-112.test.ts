import { describe, expect, it } from "vitest";
import { compiled } from "./BT8-112.js";

describe("BT8-112 Imperialdramon: Paladin Mode", () => {
  it("reduces its evolution cost by 4 by returning a white level 7 from trash", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "BeforePayCost",
      actions: [{
        kind: "Replacement",
        event: "wouldDigivolve",
        into: { cardId: "BT8-112" },
        actions: [{ kind: "Replacement", mode: "reduceCost", amount: 4, cost: { kind: "return", to: "deckBottom" } }],
      }],
    });
  });

  it("requires a returned two-color card before trashing an opponent stack", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions).toMatchObject([
      { kind: "TrashDigivolution", amount: 99, cost: { kind: "return", target: { filter: { colorCount: 2 } } } },
      { kind: "Return", to: "deckBottom", target: { filter: { digivolutionCards: "none" }, count: "all" } },
    ]);
  });
});
