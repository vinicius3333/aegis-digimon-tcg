import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-102.js";

describe("BT15-102", () => {
  it("reduces its play cost by 4 per distinct Dark Masters placed from battle area/trash", () =>
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      actions: [
        {
          kind: "Replacement",
          mode: "reduceCost",
          amount: 4,
          amountPerPlaced: 4,
          cost: { kind: "place", target: { count: 3, upTo: true } },
        },
      ],
    }));
  it("at end of turn may place a level 6 or lower trash card underneath and trashes opponent deck per level 6 source", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        { kind: "ActivateEffect", effectType: "OnPlay", cost: { kind: "place" } },
        { kind: "TrashTopDeck", controller: "opponent", amount: 2, scaling: { per: 1, unit: "digivolutionCards" } },
      ],
    }));
});
