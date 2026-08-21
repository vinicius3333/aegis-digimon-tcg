import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-054.js";

describe("LM-054 Treadmill Training", () => {
  it("reveals two, adds a yellow or black card, and places itself", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-045", "BT10-022"], hand: [{ card: "LM-054", as: "option" }], deck: ["BT1-045", "BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-054"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-045")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-054")).toBe(true);
  });

  it("reveals two and places itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-054", as: "option", faceUp: true }], deck: ["BT1-045", "BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-054"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-045")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-054")).toBe(true);
  });
});
