import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-050.js";

describe("EX5-050 Sinduramon", () => {
  it("has Decoy for Deva/Four Sovereigns and draws then plays a unique Deva into breeding", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Decoy" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      {
        kind: "PlayWithoutCost",
        breeding: true,
        payCost: false,
        optional: true,
        notSameNameAs: ["battleArea", "trash"],
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Deva"] }] },
          count: 1,
        },
      },
    ]);
  });
  it("inherits Blocker while it has Four Sovereigns or God Beast", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Blocker" } },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ match: "trait", tokens: ["Four Sovereigns", "God Beast"] }] },
          },
        },
      ],
    });
  });
});
