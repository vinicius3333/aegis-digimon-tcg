import { describe, expect, it } from "vitest";
import { EffectTiming, getCompiledCard } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT26-033.js";
import "../index.js";

describe("BT26-033 compiled fidelity", () => {
  it("encodes keywords, security recovery, use-cost surcharge, leave prevention, lowest-DP deletion, and the explicit turn seam", () => {
    const card = getCompiledCard("BT26-033");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.keywords?.map((keyword) => keyword.keyword)).toEqual(expect.arrayContaining(["Raid", "Alliance", "Engage"]));
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "SecurityManipulation", op: "toHand" }, { kind: "Modal", condition: { kind: "isYourTurn" }, options: [[{ kind: "PlayWithoutCost", reduceCostBy: 5 }], [{ kind: "UseOptionWithoutCost", reduceCostBy: 5 }]] }]);
    expect(card?.effects?.[1]?.actions).toMatchObject([{ kind: "CostModifier", costType: "use" }, { kind: "WaiveColorRequirement" }, { kind: "Replacement", mode: "prevent" }]);
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "Delete", target: { superlative: "lowestDP" } }, { kind: "SecurityManipulation", op: "placeFromDeck" }]);
  });

  it("resolves the Option face by deleting all lowest-DP opposing Digimon and recovering one", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-033", as: "jupiter" }],
        security: ["BT1-001"],
        deck: ["BT1-002"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "lowestA", dp: 3000 },
          { card: "BT1-010", as: "lowestB", dp: 3000 },
          { card: "BT1-011", as: "higher", dp: 5000 },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.Main, s.perm("jupiter"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([s.perm("higher").permanentId]);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
