import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-010.js";

describe("EX4-010 BlackWarGrowlmon", () => {
  it("trashes three cards from both decks, then uses the combined-trash DP ceiling", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "TrashTopDeck", controller: "both", amount: 3 });
    expect(actions[1]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 0, upTo: true, totalDpCap: 3000 }, dpCeiling: 3000, dpCeilingScaling: { per: 10, amount: 2000, unit: "cards", filter: { zone: "trash", controllerDefault: "both" } } });
  });
});
