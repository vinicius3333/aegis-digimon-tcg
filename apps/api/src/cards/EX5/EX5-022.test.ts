import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-022.js";

describe("EX5-022 Mihiramon", () => {
  it("draws and plays a unique Deva into breeding on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "PlayWithoutCost", breeding: true, notSameNameAs: ["battleArea", "trash"] },
    ]);
  });
  it("trashes one digivolution card from an opposing Digimon when one of your Digimon is played", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
          amount: 1,
          fromTop: true,
        },
      ],
    });
  });
  it("gains memory once per turn when inherited and traited", () => {
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
