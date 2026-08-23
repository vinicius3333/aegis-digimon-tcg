import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-058.js";

describe("EX4-058 Ravemon", () => {
  it("can delete itself at end of the opponent's turn to play Ravemon from trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "endOfOpponentTurn",
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { location: "trash", controller: "mine" } }],
      cost: {
        kind: "deleteOwn",
        target: {
          filter: {
            isSelfRef: true,
            digivolutionStackNameOrTrait: [
              { match: "trait", tokens: ["Bird"] },
              { match: "trait", tokens: ["Avian"] },
            ],
          },
        },
      },
    });
  });
  it("trashes an opponent hand card at eight or more cards, otherwise adds security to hand", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "Trash",
      target: { chooser: "opponent" },
      condition: { kind: "zoneCount", op: "gte", value: 8 },
    });
    expect(actions?.[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "toHand",
      condition: { kind: "zoneCount", op: "lte", value: 7 },
    });
  });
});
