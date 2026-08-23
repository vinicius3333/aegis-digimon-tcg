import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-077.js";

describe("BT17-077 Imperialdramon: Paladin Mode", () => {
  it("trashes all opponent digivolution cards on play and when digivolving", () => {
    for (const effect of [compiled.effects?.[1], compiled.effects?.[2]]) {
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "TrashDigivolution",
        amount: 99,
        target: { count: "all", filter: { controller: "opponent", kind: ["Digimon"] } },
      });
    }
  });

  it("lets the activating player choose whose entire Trash returns to the bottom of the deck", () => {
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "Modal",
      choose: 1,
      options: [
        [
          {
            kind: "Return",
            to: "deckBottom",
            bindResultAs: "returnedTrashCards",
            target: { count: "all", filter: { zone: "trash", controller: "mine" } },
          },
        ],
        [
          {
            kind: "Return",
            to: "deckBottom",
            bindResultAs: "returnedTrashCards",
            target: { count: "all", filter: { zone: "trash", controller: "opponent" } },
          },
        ],
      ],
    });
    expect(compiled.effects?.[1]?.actions?.[2]).toMatchObject({
      kind: "GainMemory",
      amount: 3,
      condition: {
        kind: "bindingContains",
        ref: "returnedTrashCards",
        filter: { kind: ["Digimon"], colors: ["White"], levelComparison: { op: "eq", value: 7 } },
      },
    });
  });

  it("unsuspends by returning an opponent Digimon with no digivolution cards", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: { isSelf: true },
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "return",
            to: "deckBottom",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" } },
          },
        },
      ],
    });
  });
});
