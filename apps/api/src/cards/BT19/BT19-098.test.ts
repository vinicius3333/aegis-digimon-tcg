import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-098.js";

describe("BT19-098 King Device", () => {
  it("has complete IR for waiver, trash trigger, Main, and Security", () => {
    const card = runtimeCompiledCard("BT19-098");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects.map((effect) => effect.trigger)).toEqual(["Static", "AllTurns", "Main", "Security"]);
    const main = card!.effects.find((effect) => effect.trigger === "Main")!;
    expect(main.actions[0]).toMatchObject({ kind: "PlaceInBattleAreaSelf", target: { from: ["trash"] } });
    expect(main.actions[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
    const security = card!.effects.find((effect) => effect.trigger === "Security")!;
    expect(security.isSecurity).toBe(true);
    expect(security.actions[1]).toMatchObject({ kind: "AddToHandSelf" });
  });
});
