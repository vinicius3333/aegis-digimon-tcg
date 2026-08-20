import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-100.js";

describe("BT23-100 Hudie Net CafxE9", () => {
  it("waives color requirements for a CS Digimon or Tamer in either field area", () => {
    const waive = compiled.effects.find((effect) => effect.trigger === "Static")?.actions?.[0] as any;
    expect(waive).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHave",
        filter: { kind: ["Digimon", "Tamer"], zone: ["battleArea", "breedingArea"] },
      },
    });
  });

  it("draws then places itself, and models the Delay Tamer play", () => {
    const main = compiled.effects.find(
      (effect) => effect.trigger === "Main" && effect.actions?.[0]?.kind === "Draw",
    ) as any;
    const delay = compiled.effects.find(
      (effect) => effect.trigger === "Main" && effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
    ) as any;
    expect(main.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }]);
    expect(delay.keywords[0].keyword).toBe("Delay");
    expect(delay.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], optional: true });
  });

  it("requires placing itself after the optional Security play", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(security.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true });
    expect(security.actions[0].target.filter).toMatchObject({ kind: ["Digimon"], levels: [3] });
    expect(security.actions[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
    expect(security.actions[1].optional).toBeUndefined();
  });
});
