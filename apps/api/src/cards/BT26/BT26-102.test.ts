import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT26-102.js";
import "../index.js";

describe("BT26-102 compiled fidelity", () => {
  it("keeps the Seven Code waiver and complete Security clause while exposing the mixed placement seam", () => {
    const card = getCompiledCard("BT26-102");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "WaiveColorRequirement" }]);
    expect(card?.effects?.[1]?.actions).toMatchObject([{ kind: "PlaceUnder", mixedSources: { battleAreaPermanents: true, linkedCards: true, trash: true }, trackCount: "sevenCodeMaterials" }, { kind: "Digivolve", ignoreRequirements: true, payCost: false, condition: { kind: "namedCountAtLeast", countSource: "sevenCodeMaterials", count: 6 } }]);
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false }, { kind: "AddToHandSelf" }]);
  });

  it("plays an eligible Appmon from hand and returns itself to hand from Security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT26-102", as: "securityOption", faceUp: true }],
        hand: [{ card: "BT26-010", as: "appmon" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-010")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId)).toBe(true);
  });
});
