import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-091.js";

describe("BT21-091 Spirit Evolution!", () => {
  it("keeps the inherited-Tamer watcher separate from the Delay digivolution payload", () => {
    const allTurns = compiled.effects.filter((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toHaveLength(2);
    expect(allTurns[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { hasInheritedEffects: true, kind: ["Tamer"] },
    });
    expect(allTurns[1]?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(allTurns[1]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      payCost: false,
      from: ["hand"],
      optional: true,
      target: { filter: { kind: ["Tamer"] } },
      into: { nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        actions: [expect.objectContaining({ kind: "Draw", abortOnDecline: true }), { kind: "PlaceInBattleAreaSelf" }],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: expect.arrayContaining([
          expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true }),
          expect.objectContaining({ kind: "AddToHandSelf" }),
        ]),
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
