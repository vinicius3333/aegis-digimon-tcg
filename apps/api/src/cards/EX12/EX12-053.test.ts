import { describe, expect, it } from "vitest";
import { compiled } from "./EX12-053.js";

describe("EX12-053 Hagurumon", () => {
  it("reveals three and adds one matching Machine/Cyborg/Mutant and one ME card", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0];

    expect(action).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(action).toMatchObject({
      add: [
        { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "trait", tokens: ["Machine", "Cyborg", "Mutant"] }] } },
        { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "trait", tokens: ["ME"] }] } },
      ],
    });
  });

  it("retains inherited Blocker and the alternate ME evolution", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["ME"], cost: 0, isAlternate: true }]);
  });
});
