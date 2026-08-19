import { describe, expect, it } from "vitest";
import { compiled as BT24_086 } from "./BT24-086.js";
import "../index.js";

describe("BT24-086 The Crossroad Witch", () => {
  it("mind-links to the correct traits and scopes the inherited play to this stack", () => {
    const allTurns = BT24_086.effects?.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited);
    for (const action of allTurns?.actions ?? []) {
      expect(action).toMatchObject({
        kind: "SubTrigger",
        event: expect.stringMatching(/whenPlayed|whenOneOfYoursDigivolves/),
        actions: [
          {
            kind: "MindLink",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["X Antibody", "DigiPolice", "SEEKERS"], match: "trait" }],
              },
            },
          },
        ],
      });
    }
    const inherited = BT24_086.effects?.find((entry) => entry.trigger === "EndOfAllTurns");
    expect(inherited?.actions?.[0]).toMatchObject({ from: ["digivolutionCards"], fromOwnDigivolutionStack: true });
  });
});
