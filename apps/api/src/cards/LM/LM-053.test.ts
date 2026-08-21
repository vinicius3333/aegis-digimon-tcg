import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-053.js";

describe("LM-053 Onyx Memory Boost!", () => {
  it("reveals three, adds a black or purple Digimon, and places itself", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT10-022"], hand: [{ card: "LM-053", as: "option" }], deck: ["BT10-079", "BT1-009", "BT1-064"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-053"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-079")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-053")).toBe(true);
  });

  it("places itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-053", as: "option", faceUp: true }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-053"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-053")).toBe(true);
  });
});
