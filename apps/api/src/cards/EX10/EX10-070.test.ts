import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-070.js";

describe("EX10-070 God Grade Unleashed", () => {
  it("reacts only to a friendly Digimon link-card trash and arms the delayed Appmon Link", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "AllTurns")!.actions[0]!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(action).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinkTrashed",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Delay" }, duration: "untilActivated" },
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
            },
          },
          onto: { filter: { isSourceRef: true } },
          optional: true,
          delayedEffect: true,
        },
      ],
    });
  });
});
