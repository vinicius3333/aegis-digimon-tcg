import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-060.js";

describe("LM-060 Shadow Training", () => {
  it("reveals two, adds a green or purple card, and places itself", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-064", "BT10-079"], hand: [{ card: "LM-060", as: "option" }], deck: ["BT1-064", "BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-060"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-064")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-060")).toBe(true);
  });

  it("reveals two and places itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-060", as: "option", faceUp: true }], deck: ["BT1-064", "BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-060"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-064")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-060")).toBe(true);
  });
});
