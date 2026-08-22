import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-033.js";

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
});
