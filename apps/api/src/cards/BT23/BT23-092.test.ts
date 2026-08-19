import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-092.js";

describe("BT23-092 Ice Archery", () => {
  it("restricts one opposing Digimon and Tamer before placing itself", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords) as any;
    expect(main.actions).toMatchObject([
      { kind: "Restrict", restriction: "suspend" },
      { kind: "Restrict", restriction: "suspend" },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    expect(main.actions[0].target.filter.kind).toEqual(["Digimon"]);
    expect(main.actions[1].target.filter.kind).toEqual(["Tamer"]);
  });

  it("arms Delay on a CS attack and keeps the Security sequence", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
    const delay = compiled.effects.find((effect) =>
      effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
    ) as any;
    expect(delay.actions).toHaveLength(2);
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(security.actions[2]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
  });
});
