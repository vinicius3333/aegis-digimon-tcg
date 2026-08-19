import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-090.js";

describe("BT22-090 Rie Kishibe", () => {
  it("gains memory only when the opponent has a Digimon at the start of the main phase", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions).toMatchObject([
      {
        kind: "GainMemory",
        amount: 1,
        condition: {
          kind: "opponentHas",
          filter: { controllerDefault: "opponent", kind: ["Digimon"] },
        },
      },
    ]);
  });

  it("requires deleting one other Knightmon-text/CS permanent before the once-per-turn digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect?.actions[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      from: ["hand"],
      into: {
        controllerDefault: "mine",
        nameOrTrait: [{ tokens: ["LordKnightmon"], match: "name" }],
      },
      reduceCost: 3,
      cost: {
        kind: "deleteOwn",
        target: {
          filter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon", "Tamer"],
            nameOrTrait: [
              { tokens: ["Knightmon"], match: "text" },
              { tokens: ["CS"], match: "trait" },
            ],
          },
          count: 1,
        },
      },
      abortOnDecline: true,
    });
  });

  it("plays itself from security without paying its play cost", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(effect).toMatchObject({ isSecurity: true });
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { isSelf: true, filter: { isSelfRef: true } },
    });
  });
});
