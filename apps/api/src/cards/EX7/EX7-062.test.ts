import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-062.js";
describe("EX7-062 Gulfmon", () => {
  it("trashes two cards from hand before deleting within its DP", () =>
    expect(compiled.effects?.[0]?.actions).toMatchObject([
      { kind: "Trash", target: { filter: { zone: "hand", controller: "mine" }, count: 2 } },
      { kind: "Delete", target: { filter: { controller: "opponent", dp: { op: "lte", relativeToSource: true } } } },
    ]));
  it("reduces the trash play-cost ceiling by one per card in hand", () =>
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: { filter: { playCostLte: 8, playCostLteScaling: { subtract: 1, unit: "cards" } } },
    }));
});
