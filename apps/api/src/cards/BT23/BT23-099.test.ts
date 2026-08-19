import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-099.js";

describe("BT23-099 Sistermon Sisters Training Gym", () => {
  it("grants color waiving with Huckmon on the field and places itself after drawing", () => {
    const waive = compiled.effects[0]?.actions?.[0] as any;
    expect(waive.condition.filter.zone).toEqual(["battleArea", "breedingArea"]);
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords) as any;
    expect(main.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }]);
  });

  it("arms Delay on Huckmon/Jesmon digivolution and has the printed Sistermon play payload", () => {
    const arm = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(arm.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" });
    expect(arm.actions[0].actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Delay" } });
    const delay = compiled.effects.find((effect) =>
      effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
    ) as any;
    expect(delay.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true });
  });
});
