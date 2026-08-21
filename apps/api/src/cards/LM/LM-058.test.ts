import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-058.js";

describe("LM-058 Parkour Training", () => {
  it("reveals two, adds a blue or green card, and places itself", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-027", "BT1-064"], hand: [{ card: "LM-058", as: "option" }], deck: ["BT1-027", "BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-058"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-027")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-058")).toBe(true);
  });

  it("reveals two and places itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-058", as: "option", faceUp: true }], deck: ["BT1-027", "BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-058"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-027")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-058")).toBe(true);
  });
});
