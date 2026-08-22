import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-008.js";

describe("EX5-008 Firamon", () => {
  it("reveals three and adds one Light Fang and one Night Claw/Galaxy card", () => {
    const effects = compiled.effects?.filter(
      (entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving",
    );
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [
          { filter: { controllerDefault: "mine", nameOrTrait: [{ match: "trait", tokens: ["Light Fang"] }] } },
          {
            filter: { controllerDefault: "mine", nameOrTrait: [{ match: "trait", tokens: ["Night Claw", "Galaxy"] }] },
          },
        ],
      });
    }
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: 2000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });
});
