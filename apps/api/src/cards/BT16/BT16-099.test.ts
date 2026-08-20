import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-099.js";

describe("BT16-099", () => {
  it("reveals three, adds a SoC card, trashes one, and places itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }, { kind: "Trash", target: { count: 1 }, condition: { kind: "ifThisEffectActed" } }, { kind: "PlaceInBattleAreaSelf" }] });
  });

  it("models Delay to play a SoC card from trash with 2 cost reduction", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Main", keywords: [{ keyword: "Delay" }], actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: true, reduceCostBy: 2, optional: true }] });
  });

  it("repeats the reveal/trash/place effect from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "RevealAdd", revealCount: 3 }, { kind: "Trash" }, { kind: "PlaceInBattleAreaSelf" }] });
  });
});
