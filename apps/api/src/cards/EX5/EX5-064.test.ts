import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-064.js";

describe("EX5-064 Koh & Sayo", () => {
  it("sets memory to 3 at the start of your turn when memory is 2 or less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });
  });
  it("offers free evolution from hand with the compound suspend and Light Fang/Night Claw cost", () => {
    for (const trigger of ["OnPlay", "Main"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Digivolve",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
        into: { controllerDefault: "mine", kind: ["Digimon"] },
        cost: {
          kind: "compound",
          costs: [
            { kind: "suspend", target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
            {
              kind: "placeOwnTopAtStackBottom",
              target: {
                count: 1,
                filter: {
                  controller: "mine",
                  zone: "battleArea",
                  kind: ["Digimon"],
                  nameOrTrait: [{ match: "trait", tokens: ["Light Fang", "Night Claw"] }],
                },
              },
            },
          ],
        },
      });
    }
  });
  it("plays itself for free from security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", payCost: false, target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
      ],
    });
  });
});
