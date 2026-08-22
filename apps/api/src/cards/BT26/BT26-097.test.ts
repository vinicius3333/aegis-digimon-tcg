import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT26-097.js";
import "../index.js";

describe("BT26-097 compiled fidelity", () => {
  it("encodes the live security surcharge, permanent placement cost, authorized free evolution, and gated tail", () => {
    const card = getCompiledCard("BT26-097");
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "Static")?.actions).toMatchObject([
      { kind: "CostModifier", costType: "use", handResident: true, amount: 1, scaling: { unit: "security", per: 1 } },
    ]);
    const main = card?.effects?.find((effect) => effect.trigger === "Main")?.actions ?? [];
    expect(main[0]).toMatchObject({ kind: "PlaceUnder", targetIsPermanent: true, position: "bottom" });
    expect(main[1]).toMatchObject({ kind: "Digivolve", from: ["hand", "trash"], payCost: false, ignoreRequirements: true, optional: true });
    expect(main[2]).toMatchObject({ kind: "PlaceUnder", position: "top", optional: true, condition: { kind: "ifThisEffectDigivolved" } });
    expect(card?.effects?.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
      { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true },
      { kind: "AddToHandSelf" },
    ]);
  });

  it("plays a low-cost TS card from hand and returns itself to hand from Security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT26-097", as: "securityOption", faceUp: true }],
        hand: [{ card: "BT26-008", as: "tsCard" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-008")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId)).toBe(true);
  });
});
