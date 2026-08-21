import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-035.js";

describe("LM-035 Amber Memory Boost!", () => {
  it("reveals three, adds a yellow or purple Digimon, and places itself", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT4-078"], hand: [{ card: "LM-035", as: "option" }], deck: ["BT1-045", "BT4-078", "BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3; await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-035"));
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT1-045" || c.cardId === "BT4-078")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-035")).toBe(true);
  });

  it("places itself in the battle area from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-035", as: "securityOption", faceUp: true }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-035"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-035")).toBe(true);
  });
});
