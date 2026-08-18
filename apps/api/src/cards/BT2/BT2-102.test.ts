import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-102.js";

describe("BT2-102 Flower Cannon", () => {
  it("returns a suspended opposing Digimon to deck bottom", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT2-042"], hand: [{ card: "BT2-102", as: "option" }] }, 1: { battleArea: [{ card: "BT2-045", as: "target", suspended: true, under: [{ card: "BT2-001", as: "source" }] }], deck: ["BT2-043"] } }, { autoSelectCards: true });
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT2-045");
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });

  it("activates its Main return-to-deck effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-102", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT2-045", as: "target", suspended: true, under: [{ card: "BT2-001", as: "source" }] }], deck: ["BT2-043"] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT2-045");
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });
});
