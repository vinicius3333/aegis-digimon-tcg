import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-007.js";

describe("EX5-007 Coronamon", () => {
  it("gains memory at the start of the main phase with a Light Fang or Night Claw Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Tamer"],
          nameOrTrait: [{ match: "trait", tokens: ["Light Fang", "Night Claw"] }],
        },
      },
    });
  });
  it("once per turn gains two memory by moving its traited top card to the bottom of its stack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "moveTopCardToBottom",
            target: { filter: { isSelfRef: true, topCardHasTrait: ["Light Fang", "Night Claw"] } },
          },
        },
      ],
    });
  });
});
