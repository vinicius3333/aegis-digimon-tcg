import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-028.js";

describe("BT22-028 Ariemon", () => {
  it("plays one qualifying stack card at each level and shares the once-per-turn costed reaction", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.6 or lower w/[Aqua]/[Sea Animal] in any trait)＞" }],
      }),
    );
    const digivolving = compiled.effects.filter((entry) => entry.trigger === "WhenDigivolving");
    expect(digivolving[0]?.actions).toHaveLength(3);
    expect(digivolving[0]?.actions.map((action) => (action as any).target.filter.levels)).toEqual([[3], [4], [5]]);
    expect(
      digivolving[0]?.actions.every(
        (action) => (action as any).from?.[0] === "digivolutionCards" && (action as any).optional === false,
      ),
    ).toBe(true);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger && entry.actions[0]?.kind === "Return");
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "Return",
            to: "deckBottom",
            optional: true,
            abortOnDecline: true,
            cost: { kind: "place", position: "bottom", destination: "digivolutionStack", host: "self" },
          },
          { kind: "Unsuspend", target: { filter: { isSelfRef: true }, isSelf: true } },
        ],
      });
    }
  });
});
