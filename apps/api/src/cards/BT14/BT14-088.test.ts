import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-088.js";

describe("BT14-088", () => {
  it("adds a level 3 Digimon and a non-white Tamer from the top five", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          rest: "deckBottom",
          add: [
            { filter: { levels: [3] }, count: 1, to: "hand" },
            {
              filter: { kind: ["Tamer"], colors: ["Red", "Blue", "Yellow", "Green", "Black", "Purple"] },
              count: 1,
              to: "hand",
            },
          ],
        },
      ],
    });
  });

  it("moves a DP-bearing breeding Digimon after an opponent level-5-or-higher attack and pays by suspending Gennai", () => {
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "MovePermanent",
          direction: "toBattle",
          target: {
            filter: { location: "breedingArea", dp: { op: "gt", value: 0 } },
            cost: { kind: "suspend" },
            optional: true,
          },
        },
      ],
    });
  });

  it("plays itself for free from security", () => {
    expect(compiled.effects[2]).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });
});
