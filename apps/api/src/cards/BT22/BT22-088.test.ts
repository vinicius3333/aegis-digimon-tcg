import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-088.js";

describe("BT22-088 Arisa Kinosaki", () => {
  it("requires returning this Tamer before resolving the then clause", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "return",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      },
    });
    expect(effect?.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      optional: true,
      condition: { kind: "youHaveNone", filter: { kind: ["Digimon"] } },
    });
  });

  it("watches both friendly Tokens and Puppet Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    const watcher = effect?.actions[0] as any;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        or: [{ isToken: true }, { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] }],
      },
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: { kind: "suspend" },
        },
      ],
    });
  });

  it("plays itself from security without paying its cost", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
    });
  });
});
