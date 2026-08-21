import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-088 Ai & Mako", () => {
  it("preserves opponent-presence memory, thresholded Impmon-to-Beelzemon Digivolution, and Security play", () => {
    const card = runtimeCompiledCard("BT19-088");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            condition: {
              kind: "opponentHas",
              filter: { controllerDefault: "opponent", kind: ["Digimon"] },
            },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "Digivolve",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [{ tokens: ["Impmon"], match: "name" }],
              },
              count: 1,
            },
            into: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Beelzemon"], match: "name" }],
            },
            payCost: true,
            from: ["hand", "trash"],
            costOverride: 4,
            ignoreRequirements: true,
            optional: true,
            condition: {
              kind: "zoneCount",
              seat: "mine",
              zone: "trash",
              op: "gte",
              value: 20,
            },
            cost: {
              kind: "suspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
            abortOnDecline: true,
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            payCost: false,
          },
        ],
      },
    ]);
  });
});
