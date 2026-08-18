import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST4-16.js";

describe("ST4-16 Electro Shocker", () => {
  it("returns a suspended opponent and trashes all its sources", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST4-03", as: "ally" }], hand: [{ card: "ST4-16", as: "option" }] }, 1: { battleArea: [{ card: "ST4-10", under: [{ card: "ST4-03", as: "source" }], as: "target", suspended: true }] } }, { autoSelectCards: true });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((c) => c.cardId === "ST4-10"));
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("source").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST4-03")).toBe(true);
  });
  it("activates the same return effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST4-16", as: "option", faceUp: true }] }, 1: { battleArea: [{ card: "ST4-10", under: ["ST4-03"], as: "target", suspended: true }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
});
