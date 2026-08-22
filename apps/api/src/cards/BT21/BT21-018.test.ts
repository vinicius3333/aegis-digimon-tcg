import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-018.js";

describe("BT21-018 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("preserves Rush, Raid, and the once-per-turn attack after linking", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Rush", raw: "＜Rush＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenLinked",
            actions: [
              {
                kind: "Attack",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                withoutSuspending: false,
                optional: true,
              },
            ],
          },
        ],
      }),
    );
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Gatchmon", "Navimon", "Tweetmon"], cost: 0 }]);
  });
});
