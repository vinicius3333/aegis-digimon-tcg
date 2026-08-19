import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-048.js";

describe("BT23-048 Gotsumon", () => {
  it("reveals 3 and adds one Hudie card plus one CS Tamer/Option, bottoming the rest", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnPlay") as any).actions[0];
    expect(action).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { filter: { nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }] }, count: 1, to: "hand" },
        {
          filter: { kind: ["Tamer", "Option"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          count: 1,
          to: "hand",
        },
      ],
      rest: "deckBottom",
    });
  });

  it("inherited effect optionally plays a Hudie Digimon up to play cost 5, then locks its digivolution and deletes it at opponent turn end", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any;
    expect(effect).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    const actions = effect.actions;
    expect(actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      abortOnDecline: true,
      bindResultAs: "playedHudie",
      target: { filter: { playCostLte: 5, nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }] } },
    });
    expect(actions[1]).toMatchObject({
      kind: "Restrict",
      restriction: "digivolve",
      duration: "permanent",
      target: { filter: { boundRef: "playedHudie" } },
    });
    expect(actions[2]).toMatchObject({ kind: "DelayedDelete", timing: "endOfOpponentTurn" });
  });
});
