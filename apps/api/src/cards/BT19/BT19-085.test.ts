import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-085 Henry Wong", () => {
  it("preserves the named Digimon memory condition, green Digivolution watcher, suspend cost, and Security play", () => {
    const card = runtimeCompiledCard("BT19-085");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [{
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Terriermon", "Gargomon", "Rapidmon"], match: "name" }],
            },
          },
        }],
      },
      {
        trigger: "AllTurns",
        actions: [{
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Green"] },
          actions: [{
            kind: "Suspend",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            cost: {
              kind: "suspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
            optional: true,
            abortOnDecline: true,
          }],
        }],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        }],
      },
    ]);
  });
});
