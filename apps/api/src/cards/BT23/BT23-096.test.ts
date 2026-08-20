import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-096.js";

describe("BT23-096 Comet Hammer", () => {
  it("activates Delay when a CS Digimon attacks and de-digivolves in that window", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.actions).toHaveLength(1);
    expect(turn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
    expect(turn.keywords[0].keyword).toBe("Delay");
    expect(turn.actions[0].actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 4 });
  });

  it("keeps the Main and Security de-digivolve-then-place sequences", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords) as any;
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(main.actions).toMatchObject([{ kind: "DeDigivolve", amount: 4 }, { kind: "PlaceInBattleAreaSelf" }]);
    expect(security.actions).toMatchObject([{ kind: "DeDigivolve", amount: 4 }, { kind: "PlaceInBattleAreaSelf" }]);
  });
});
