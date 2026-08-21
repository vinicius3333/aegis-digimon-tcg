import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-005.js";

describe("EX6-005 Kakkinmon", () => {
  it("inherits a start-of-main-phase memory effect costing a Legend-Arms card from the stack", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      isInherited: true,
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "return",
            target: {
              count: 1,
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
                kind: ["Digimon"],
                nameOrTrait: [{ match: "trait", tokens: ["Legend-Arms"] }],
              },
            },
          },
        },
      ],
    });
  });
});
