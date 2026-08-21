import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-061.js";

describe("LM-061 Punching Training", () => {
  it("reveals two, adds a red or black card, and places itself", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-009", "BT10-022"], hand: [{ card: "LM-061", as: "option" }], deck: ["BT1-009", "BT1-027"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-061"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-061")).toBe(true);
  });

  it("reveals two and places itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-061", as: "option", faceUp: true }], deck: ["BT1-009", "BT1-027"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-061"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-061")).toBe(true);
  });
});
