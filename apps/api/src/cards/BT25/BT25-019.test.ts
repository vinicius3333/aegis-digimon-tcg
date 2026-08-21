import { describe, expect, it } from "vitest";
import { compiled } from "./BT25-019.js";

describe("BT25-019 UltimateBrachiomon", () => {
  it("offers the highest-DP opponent Digimon for deletion on play and digivolving", () => {
    expect(compiled.effects.filter((effect) => effect.trigger === "OnPlay" || effect.trigger === "WhenDigivolving")).toHaveLength(2);
    expect(compiled.effects[1]?.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { superlative: "highestDP" } } });
  });

  it("scopes the end-of-turn immunity to Digimon at 5+ memory and Options at 5 or less", async () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn", actions: [{ condition: { kind: "memoryAtLeast", value: 5 } }, { condition: { kind: "memoryAtMost", value: 5 } }] });
  });

  it("limits both immunities to opponent Digimon and Option effects", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")!;
    expect(effect.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceFilter: { controller: "opponent", kind: ["Digimon"] }, byOpponentEffectsOnly: true }),
      expect.objectContaining({ sourceFilter: { controller: "opponent", kind: ["Option"] }, byOpponentEffectsOnly: true }),
    ]));
  });
});
