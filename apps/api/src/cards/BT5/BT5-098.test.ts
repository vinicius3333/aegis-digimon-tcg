import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-098.js";

describe("BT5-098 Meteor Shower", () => {
  it("may play a yellow Starmon-named Digimon from hand for free", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-033"], hand: [{ card: "BT5-098", as: "option" }, { card: "BT5-035", as: "starmons" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("starmons").instanceId));
    expect(s.state.memory).toBe(2);
  });

  it("activates the Main effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-098", as: "securityOption", faceUp: true }], hand: [{ card: "BT5-035", as: "starmons" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("starmons").instanceId)).toBe(true);
  });
});
