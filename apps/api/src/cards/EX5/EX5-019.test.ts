import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-019.js";

describe("EX5-019 Antylamon", () => {
  it("draws and plays a unique Deva into breeding on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "PlayWithoutCost", breeding: true, notSameNameAs: ["battleArea", "trash"] },
    ]);
  });
  it("trashes one digivolution card from an opposing Digimon when attacking and gains memory with its trait", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "TrashDigivolution",
      target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
      amount: 1,
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ match: "trait", tokens: ["Four Sovereigns", "God Beast"] }] },
          },
        },
      ],
    });
  });
});
