import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-067.js";

describe("EX10-067 Ryoma Mogami", () => {
  it("gates Alliance on a Save digivolution and pays with suspension plus a Save card under a Tamer", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const action = compiled.effects!.find((entry) => entry.trigger === "YourTurn")!.actions[0]!;
    expect(action).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], keywords: ["Save"] },
      cost: {
        kind: "compound",
        costs: [
          { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
          {
            kind: "place",
            target: {
              filter: { controller: "mine", kind: ["Digimon"], zone: "underTamers", keywords: ["Save"] },
              from: ["underTamers"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "triggerSource",
          },
        ],
      },
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Alliance" },
          duration: "forTheTurn",
        },
      ],
    });
  });
});
