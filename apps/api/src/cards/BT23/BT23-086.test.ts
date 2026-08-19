import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-086.js";

describe("BT23-086 Yuugo", () => {
  it("sets memory to 3 when the controller has 2 or less", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
    });
  });

  it("pays by adding the top security card, then places a Zaxon Digimon face-up at the bottom", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      from: ["hand", "trash"],
      toTop: false,
      faceUp: true,
      cost: { kind: "securityToHand" },
      optional: true,
      abortOnDecline: true,
    });
    expect(effect.actions[0].source.filter.nameOrTrait).toEqual([{ tokens: ["Zaxon"], match: "trait" }]);
  });

  it("lets a level 6 Machine or Zaxon Digimon attack a player after suspending this Tamer", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "Attack",
      attackPlayer: true,
      optional: true,
      cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
    });
    expect(effect.actions[0].target.filter.levels).toEqual([6]);
  });
});
