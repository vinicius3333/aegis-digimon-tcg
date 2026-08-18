import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST8-12.js";

describe("ST8-12 V-Wing Blade", () => {
  it("returns an opposing level 6 or lower and trashes all of its sources", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST8-04"], hand: [{ card: "ST8-12", as: "option" }] }, 1: { battleArea: [{ card: "ST8-09", as: "target", under: [{ card: "ST8-08", as: "source" }] }] } }, { autoSelectCards: true });
    const targetId = s.perm("target").topCard.instanceId;
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST8-12", as: "option", faceUp: true }] }, 1: { battleArea: [{ card: "ST8-09", under: ["ST8-08"] }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
});
