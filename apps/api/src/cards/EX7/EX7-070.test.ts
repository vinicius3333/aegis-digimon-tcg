import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-070.js";
describe("EX7-070 Deputymon", () => {
  it("De-Digivolves an opponent when this stack card is trashed", () =>
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDigivolutionCardDiscarded",
      sourceFilter: { isSelfRef: true },
      requireByEffect: true,
      actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3 }],
    }));
  it("deletes the lowest-cost opponent and places itself under a Three Musketeers Digimon", () =>
    expect(compiled.effects?.find((e) => e.trigger === "Main")?.actions).toMatchObject([
      { kind: "Delete", target: { filter: { superlative: "lowestPlayCost" } } },
      { kind: "PlaceUnder", position: "bottom" },
    ]));
  it("deletes the lowest-cost opponent from security", () =>
    expect(compiled.effects?.find((e) => e.isSecurity)?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "lowestPlayCost" } },
    }));
});
