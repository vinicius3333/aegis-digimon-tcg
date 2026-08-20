import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-098.js";

describe("BT20-098 Apparition Legion", () => {
  it("matches the errata and applies Rush and Blocker to every Digimon it played", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main");
    const play = main?.actions[0];
    const returnCost = play?.kind === "PlayPerLevel" ? play.cost : undefined;
    const keywordActions = main?.actions.slice(1);

    expect(returnCost).toMatchObject({
      kind: "return",
      target: { totalLevels: 9, upTo: false },
    });
    expect(keywordActions).toHaveLength(2);
    expect(keywordActions?.map((action) => action.kind)).toEqual(["GainKeyword", "GainKeyword"]);
    expect(keywordActions?.map((action) => action.keyword.keyword)).toEqual(["Rush", "Blocker"]);
    expect(keywordActions?.every((action) => action.target.count === "all")).toBe(true);
    expect(keywordActions?.every((action) => action.optional !== true)).toBe(true);
  });
});
