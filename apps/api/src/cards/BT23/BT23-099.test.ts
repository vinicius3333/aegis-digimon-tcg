import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-099.js";

describe("BT23-099 Sistermon Sisters Training Gym", () => {
  it("grants color waiving with Huckmon on the field and places itself after drawing", () => {
    const waive = compiled.effects[0]?.actions?.[0] as any;
    expect(waive.condition.filter.zone).toEqual(["battleArea", "breedingArea"]);
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords) as any;
    expect(main.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }]);
  });

  it("activates Delay on Huckmon/Jesmon digivolution with the printed Sistermon play payload", () => {
    const arm = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(arm.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" });
    expect(arm.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(arm.actions[0].actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      optional: true,
    });
  });

  it("keeps the Security play optional but places the option in battle mandatorily", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(security.actions[0]).toMatchObject({ kind: "PlayWithoutCost", optional: true });
    expect(security.actions[1]).toEqual({ kind: "PlaceInBattleAreaSelf" });
  });
});
