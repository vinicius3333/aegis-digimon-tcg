import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-085.js";

describe("BT22-085 Rina Shinomiya", () => {
  it("sets memory to 3 at the start of your turn when memory is 2 or less", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
    });
  });

  it("gives exactly one of your Veedramon-name Digimon +3000 DP on play", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 3000,
      duration: "untilOpponentTurnEnd",
      target: {
        count: 1,
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }],
        },
      },
    });
  });

  it("applies Jamming to the attacking Veedramon, not an arbitrary Digimon", () => {
    const trigger = compiled.effects.find((entry) => entry.trigger === "YourTurn")?.actions[0];
    expect(trigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }],
      },
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Jamming" },
          target: { sourceRef: "triggerSubject", count: 1 },
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect((trigger as any).actions[0].cost).toMatchObject({
      kind: "return",
      raw: "by returning this Tamer to the hand",
    });
  });

  it("plays itself from security without paying its cost", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { isSelf: true, count: 1 },
    });
  });
});
