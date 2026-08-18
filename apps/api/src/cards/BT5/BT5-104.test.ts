import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-104.js";

describe("BT5-104 Catastrophe Cannon", () => {
  it("De-Digivolves 2 and may play a Diaboromon Token when you control Diaboromon", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-084", "BT5-059"], hand: [{ card: "BT5-104", as: "option" }] }, 1: { battleArea: [{ card: "BT5-084", as: "target", under: [{ card: "BT5-060", as: "bottom" }, { card: "BT5-064", as: "middle" }, { card: "BT5-068", as: "upper" }] }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const originalTopId = s.perm("target").topCard.instanceId;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1 && s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.includes("TOKEN")));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([originalTopId, s.inst("upper").instanceId]));
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("middle").instanceId);
  });

  it("can create the token even when there is no De-Digivolve target", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-084", "BT5-059"], hand: [{ card: "BT5-104", as: "option" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.includes("TOKEN")));
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
  });

  it("activates the full Main effect from security", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-084"], security: [{ card: "BT5-104", as: "securityOption", faceUp: true }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.includes("TOKEN"))).toBe(true);
  });
});
