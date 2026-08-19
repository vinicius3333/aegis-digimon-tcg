import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-094.js";

describe("BT22-094 Yuugo Kamishiro", () => {
  it("reveals three cards and adds one CS card to hand", () => {
    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          filter: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
          },
          count: 1,
          to: "hand",
        },
      ],
      rest: "deckBottom",
    });
  });

  it("reduces play cost for your CS Digimon or Tamers by returning itself", () => {
    const replacement = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions[0] as any;
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon", "Tamer"],
        nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
      },
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 2,
          cost: {
            kind: "return",
            to: "deckBottom",
            target: { filter: { isSelfRef: true }, isSelf: true },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
  });

  it("plays itself from security without paying its cost", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { filter: { isSelfRef: true }, isSelf: true, count: 1 },
    });
  });
});
