import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-036.js";

describe("LM-036 Jade Memory Boost!", () => {
  it("reveals three, adds a blue or green Digimon, and places itself", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-029"], hand: [{ card: "LM-036", as: "option" }], deck: ["BT1-029", "BT1-067", "BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3; await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-036"));
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT1-029" || c.cardId === "BT1-067")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-036")).toBe(true);
  });

  it("places itself in the battle area from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-036", as: "securityOption", faceUp: true }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-036"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-036")).toBe(true);
  });
});
