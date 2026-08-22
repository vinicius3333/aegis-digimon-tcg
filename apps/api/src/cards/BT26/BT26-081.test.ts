import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-081.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-081 compiled behavior", () => {
  it("proves both evolution paths, Assembly, the cost-8 Iliad play budget, and scaled DP reduction", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Minervamon"], cost: 2, isAlternate: true },
      { level: 5, traits: ["TS"], cost: 4, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toEqual([{ reduceCost: 5, materials: [{ names: ["Minervamon"], count: 1 }] }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [
        { kind: "PlayMultiple", from: ["hand", "trash"], payCost: false, totalCost: 8, filter: { nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] } },
        { kind: "ModifyDP", amount: -4000, duration: "untilOpponentTurnEnd", scaling: { per: 1, unit: "cards", filter: { nameOrTrait: [{ tokens: ["Iliad", "TS"], match: "trait" }] } } },
      ] });
    }
  });

  it("grants all four printed continuous effects only to Iliad Digimon", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toEqual([
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Alliance" }, target: { count: "all" } }),
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Reboot" }, target: { count: "all" } }),
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Blocker" }, target: { count: "all" } }),
      expect.objectContaining({ kind: "ModifyDP", amount: 2000, target: { count: "all" } }),
    ]);
  });

  it("plays eligible Iliad cards from hand and trash within 8 cost, then scales the DP reduction", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-081", as: "mervamon" }],
        hand: [
          { card: "BT26-032", as: "handCeresmon" },
          { card: "BT26-033", as: "handJupitermon" },
          { card: "BT26-067", as: "wrongTrait" },
        ],
        trash: [{ card: "BT26-080", as: "trashBacchusmon" }],
      },
      1: { battleArea: [{ card: "BT1-084", as: "target" }] },
    }, { autoSelectCards: true });

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("mervamon"));

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(expect.arrayContaining([
      "BT26-033",
      "BT26-080",
    ]));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT26-032")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT26-067")).toBe(true);
    expect(s.state.players[1]!.battleArea.find((p) => p.topCard?.cardId === "BT1-084")?.dp).toBe(3000);
  });
});
