import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-058.js";

describe("EX6-058 Creepymon", () => {
  it("has Blocker and deletes the opponent's lowest-DP Digimon, then trashes cards based on its level", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Blocker");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Delete", target: { filter: { superlative: "lowestDP" } } },
      { kind: "TrashTopDeck", controller: "mine", amount: 1, scaling: { per: 1, unit: "lastDeletedLevel" } },
    ]);
  });
  it("places a Seven Great Demon Lords card under a Gate of Deadly Sins when leaving play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      leaveCause: "otherThanBattle",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { zone: "trash" } },
          underFilter: { zone: "breeding", nameOrTrait: [{ match: "name", tokens: ["Gate of Deadly Sins"] }] },
          position: "bottom",
        },
      ],
    }));
});
