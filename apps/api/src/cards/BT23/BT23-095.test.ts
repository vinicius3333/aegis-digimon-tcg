import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-095.js";

describe("BT23-095 Crescent Leaf", () => {
  it("arms Delay on a CS attack without returning a Digimon immediately", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.actions[0].actions).toHaveLength(1);
    expect(turn.actions[0].actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Delay" } });
    const delay = compiled.effects.find((effect) =>
      effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
    ) as any;
    expect(delay.actions[0]).toMatchObject({ kind: "Return", to: "deckBottom" });
  });

  it("keeps the Main and Security return-then-place sequences", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords) as any;
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(main.actions).toMatchObject([{ kind: "Return", to: "deckBottom" }, { kind: "PlaceInBattleAreaSelf" }]);
    expect(security.actions).toMatchObject([{ kind: "Return", to: "deckBottom" }, { kind: "PlaceInBattleAreaSelf" }]);
  });
});
