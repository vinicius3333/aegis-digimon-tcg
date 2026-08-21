import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-038.js";

describe("LM-038 Grape Memory Boost!", () => {
  it("reveals three, adds a green or purple Digimon, and places itself", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-067"], hand: [{ card: "LM-038", as: "option" }], deck: ["BT1-067", "BT4-078", "BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3; await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-038"));
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT1-067" || c.cardId === "BT4-078")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-038")).toBe(true);
  });

  it("places itself in the battle area from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-038", as: "securityOption", faceUp: true }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-038"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-038")).toBe(true);
  });
});
