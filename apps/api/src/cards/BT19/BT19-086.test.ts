import { describe, expect, it } from "vitest";
import { matchNameOrTrait, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-086 Ryo Akiyama", () => {
  it("preserves Device placement and draw, compound suspend/trash cost, optional Cyberdramon play, and Security play", () => {
    const card = runtimeCompiledCard("BT19-086");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 1,
            cost: {
              kind: "place",
              target: {
                filter: {
                  zone: "battleArea",
                  controller: "mine",
                  kind: ["Option"],
                  nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
                },
                count: 1,
                from: ["hand"],
              },
              destination: "battleArea",
            },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "CostGatedBlock",
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "compound",
              costs: [
                {
                  kind: "suspend",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                },
                {
                  kind: "deleteOwn",
                  target: {
                    filter: {
                      controller: "mine",
                      zone: "battleArea",
                      kind: ["Option"],
                      nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
                    },
                    count: 4,
                  },
                },
              ],
            },
            actions: [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: { controller: "mine", nameOrTrait: [{ tokens: ["Cyberdramon"], match: "nameExact" }] },
                  count: 1,
                },
                from: ["hand", "trash"],
                payCost: false,
                optional: true,
              },
            ],
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

  it("keeps the bracketed Cyberdramon target name exact", () => {
    const reference = { tokens: ["Cyberdramon"], match: "nameExact" as const };

    expect(matchNameOrTrait({ nameEn: "Cyberdramon" }, reference)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Cyberdramon (X Antibody)" }, reference)).toBe(false);
  });
});
