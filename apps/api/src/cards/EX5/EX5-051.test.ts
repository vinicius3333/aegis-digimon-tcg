import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-051.js";

describe("EX5-051 Zhuqiaomon", () => {
  it("has Blocker and draws then plays a unique Deva from hand into breeding", () => {
    expect(compiled.effects?.[0]?.keywords?.[0]?.keyword).toBe("Blocker");
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
  it("grants inherited Blocker while this Digimon has Four Sovereigns or God Beast", () => {
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
