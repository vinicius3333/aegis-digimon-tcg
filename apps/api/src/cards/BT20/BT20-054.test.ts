import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-054.js";

describe("BT20-054 Bulbmon", () => {
  it("has Blocker and may replace leaving the battle area during the opponent's turn", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Static")).toMatchObject({ keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects.find((effect) => effect.trigger === "OpponentsTurn" && !effect.isInherited)).toMatchObject({ actions: [{ kind: "Replacement", event: "wouldLeavePlay", sourceFilter: { isSelfRef: true, zone: "battleArea" }, actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true, target: { filter: { controller: "mine", kind: ["Digimon"], playCostLte: 4 }, count: 1 } }] }] });
  });

  it("may redirect one opposing attack to itself once per opponent turn as inherited text", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true, target: { filter: { isSelfRef: true }, isSelf: true } }] }] });
  });
});
