import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-096.js";

describe("BT23-096 Comet Hammer", () => {
  it("arms Delay when a CS Digimon attacks instead of de-digivolving immediately", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.actions).toHaveLength(1);
    expect(turn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
    const delay = compiled.effects.find((effect) =>
      effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
    ) as any;
    expect(delay.actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 4 });
  });

  it("keeps the Main and Security de-digivolve-then-place sequences", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords) as any;
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(main.actions).toMatchObject([{ kind: "DeDigivolve", amount: 4 }, { kind: "PlaceInBattleAreaSelf" }]);
    expect(security.actions).toMatchObject([{ kind: "DeDigivolve", amount: 4 }, { kind: "PlaceInBattleAreaSelf" }]);
  });
});
