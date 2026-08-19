import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-089.js";

describe("BT22-089 Mirei Mikagura", () => {
  it("returns itself to the deck bottom before playing a qualifying card", () => {
    const start = compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase");
    expect(start?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "return",
        to: "deckBottom",
        target: { filter: { isSelfRef: true }, isSelf: true },
      },
      target: {
        filter: {
          controller: "mine",
          kind: ["Tamer"],
          playCost: { op: "gte", value: 4 },
          nameOrTrait: expect.arrayContaining([
            { tokens: ["Mirei Mikagura"], match: "name" },
            { tokens: ["CS"], match: "trait" },
          ]),
        },
      },
    });
  });

  it("trashes a qualifying hand card to draw two on play", () => {
    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 2,
      cost: {
        kind: "trash",
        target: {
          filter: {
            controller: "mine",
            zone: "hand",
            nameOrTrait: expect.arrayContaining([
              { tokens: ["Holy Beast"], match: "trait" },
              { tokens: ["Angel"], match: "trait" },
              { tokens: ["Archangel"], match: "trait" },
              { tokens: ["Fallen Angel"], match: "trait" },
              { tokens: ["CS"], match: "trait" },
            ]),
          },
          count: 1,
        },
      },
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
