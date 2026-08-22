import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-081 Kiriha Aonuma", () => {
  it("preserves hand placement for memory, any-Tamer DigiXros replacement, and Security play", () => {
    const card = runtimeCompiledCard("BT19-081");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            cost: {
              kind: "place",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Blue Flare", "Xros Heart"], match: "trait" }],
                },
                count: 1,
              },
              underFilter: { controller: "mine", kind: ["Tamer"] },
            },
          },
        ],
      },
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }],
              hasDigiXrosRequirements: true,
            },
            actions: [
              {
                kind: "PlaceUnder",
                target: { filter: { controller: "mine", zone: "underTamer" }, count: "any" },
                underFilter: { isTriggerSource: true },
                asDigiXrosMaterial: true,
                cost: {
                  kind: "suspend",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                },
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
});
