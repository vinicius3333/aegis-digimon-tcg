import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-061.js";

describe("BT21-061 MetalGreymon", () => {
  it("preserves both alternate Digivolution requirements and inherited Alliance", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, names: ["Greymon"], cost: 3, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 3, isAlternate: true, level: 4 },
    ]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        actions: [
          {
            kind: "GainKeyword",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
            duration: "permanent",
          },
        ],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("keeps the conditional Alliance and optional attack inside each trigger", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");

    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions).toHaveLength(2);
    for (const action of effect?.actions ?? []) {
      const nested = action as { event?: string; actions?: unknown[] };
      expect(["whenPlayed", "whenOneOfYoursDigivolves"]).toContain(nested.event);
      expect(nested.actions).toHaveLength(2);
      expect(nested.actions?.[0]).toMatchObject({
        kind: "GainKeyword",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
        duration: "forTheTurn",
        condition: { kind: "triggerSubjectMatchesFilter" },
      });
      expect(nested.actions?.[1]).toMatchObject({
        kind: "Attack",
        optional: true,
        withoutSuspending: false,
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      });
    }
  });
});
