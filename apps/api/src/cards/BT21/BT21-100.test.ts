import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-100.js";

describe("BT21-100 The Digimon I Designed", () => {
  it("models the Takato waiver, Main draw/trash/place, and separate effect-delete Delay payload", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(staticEffect?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", condition: { kind: "youHave" } });

    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      expect.objectContaining({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } }),
      { kind: "PlaceInBattleAreaSelf" },
    ]);

    const turns = compiled.effects.filter((entry) => entry.trigger === "YourTurn");
    expect(turns).toHaveLength(2);
    expect(turns[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenEffectDeletes",
      sourceFilter: { kind: ["Digimon"] },
    });
    expect(turns[1]?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(turns[1]?.actions[0]).toMatchObject({ kind: "Digivolve", payCost: false, from: ["trash"], optional: true });
    expect(compiled.effects.some((entry) => entry.trigger === "Security")).toBe(false);
  });
});
