import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-095.js";

describe("BT23-095 Crescent Leaf", () => {
  it("activates Delay on a CS attack and returns a suspended Digimon in that window", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.actions[0].actions).toHaveLength(1);
    expect(turn.keywords[0].keyword).toBe("Delay");
    expect(turn.actions[0].actions[0]).toMatchObject({ kind: "Return", to: "deckBottom" });
  });

  it("keeps the Main and Security return-then-place sequences", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords) as any;
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(main.actions).toMatchObject([{ kind: "Return", to: "deckBottom" }, { kind: "PlaceInBattleAreaSelf" }]);
    expect(security.actions).toMatchObject([{ kind: "Return", to: "deckBottom" }, { kind: "PlaceInBattleAreaSelf" }]);
  });
});
