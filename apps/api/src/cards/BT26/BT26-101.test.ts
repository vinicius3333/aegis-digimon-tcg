import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT26-101.js";
import "../index.js";

describe("BT26-101 compiled fidelity", () => {
  it("preserves the TS waiver, conditional grant, modal, and Security play with the DP seam explicit", () => {
    const card = getCompiledCard("BT26-101");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "WaiveColorRequirement" }]);
    expect(card?.effects?.[1]?.actions).toMatchObject([{ kind: "GainKeyword", keyword: { keyword: "Blocker" } }, { kind: "ModifyDP", amount: 3000 }, { kind: "Modal", choose: 1, options: [[{ kind: "SelectBind" }, { kind: "Delete" }], [{ kind: "Unsuspend" }]] }]);
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true }]);
  });

  it("plays a low-cost TS card from hand when revealed in Security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT26-101", as: "securityOption", faceUp: true }],
        hand: [{ card: "BT26-008", as: "tsCard" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-008")).toBe(true);
  });
});
