import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-084.js";

describe("BT24-084 Inori Misono", () => {
  it("gains memory only at 4 or less at the start of your main phase", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "memoryAtMost", value: 4, controller: "mine" },
        },
      ],
    });
  });

  it("reacts only to your security removal and pays the suspend cost before free digivolution", () => {
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Aegiomon"], match: "name" }],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Aegiochusmon"], match: "name" }],
              },
              from: ["hand"],
              payCost: false,
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              },
            },
          ],
        },
      ],
    });
  });

  it("plays itself from security without paying the cost", () => {
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    });
  });
});
