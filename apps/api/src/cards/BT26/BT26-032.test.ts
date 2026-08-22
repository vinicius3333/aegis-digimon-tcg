import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-032.js";

describe("BT26-032 compiled fidelity", () => {
  it("encodes Alliance/Succession, suspended-Digimon DP reduction, suspend-paid play/use, Option mode, and the explicit turn-gate seam", () => {
    const card = getCompiledCard("BT26-032");
    expect(card?.coverage).toBe("partial");
    expect(card?.residual).toEqual(["The When Digivolving 'if it's your turn' gate is not represented by a dedicated IR condition; the suspend/play branch remains explicit but must be reopened if cross-turn digivolution behavior fails."]);
    expect(card?.keywords?.map((keyword) => keyword.keyword)).toEqual(expect.arrayContaining(["Alliance", "Succession"]));
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "ModifyDP", amount: -5000 }, { kind: "Suspend" }, { kind: "Modal", choose: 1 }]);
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "Suspend", optional: true }, { kind: "Restrict", restriction: "unsuspend" }]);
  });
});
