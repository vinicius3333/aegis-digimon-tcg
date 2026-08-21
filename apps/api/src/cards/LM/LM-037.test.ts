import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-037.js";

describe("LM-037 Sepia Memory Boost!", () => {
  it("reveals three, adds a yellow or black Digimon, and places itself", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-045"], hand: [{ card: "LM-037", as: "option" }], deck: ["BT1-045", "BT4-063", "BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3; await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-037"));
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT1-045" || c.cardId === "BT4-063")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-037")).toBe(true);
  });

  it("places itself in the battle area from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-037", as: "securityOption", faceUp: true }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-037"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-037")).toBe(true);
  });
});
