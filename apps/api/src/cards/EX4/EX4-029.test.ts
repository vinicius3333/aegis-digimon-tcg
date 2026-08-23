import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-029.js";

describe("EX4-029 Antylamon", () => {
  it("adds the suspended Digimon's DP and Security Attack plus one for the attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "AddDPFromSuspendedCost",
          dpSource: { kind: "suspendedTarget" },
          duration: "forThisAttack",
          alsoGainKeywords: [{ keyword: "SecurityAttack", amount: 1 }],
        },
      ],
    });
  });
  it("places the top deck card into security at three or fewer security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions?.[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeFromDeck",
      toTop: true,
      condition: { kind: "youHave", count: 3, comparison: "lte" },
    });
  });
});
