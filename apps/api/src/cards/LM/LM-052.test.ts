import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-052.js";

describe("LM-052 Azure Memory Boost!", () => {
  it("reveals three, adds a blue or yellow Digimon, and places itself", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-027"], hand: [{ card: "LM-052", as: "option" }], deck: ["BT1-027", "BT1-009", "BT1-064"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-052"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-027")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-052")).toBe(true);
  });

  it("places itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-052", as: "option", faceUp: true }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-052"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-052")).toBe(true);
  });
});
