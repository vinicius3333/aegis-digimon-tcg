import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST12-16 Quake! Blast! Fire! Father!", () => {
  it("deletes an opponent Digimon with play cost 13 or less", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST12-04"], hand: [{ card: "ST12-16", as: "option" }] }, 1: { battleArea: [{ card: "ST12-10", as: "target" }] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 7;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "ST12-10")).toBe(true);
  });

  it("cannot ignore its color requirement without Huckmon, Sistermon or a Royal Knight", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST12-16", as: "option" }] }, 1: { battleArea: ["ST12-10"] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 7;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("does not delete a Digimon whose play cost is 14 or more", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST12-04"], hand: [{ card: "ST12-16", as: "option" }] }, 1: { battleArea: [{ card: "BT10-112", as: "target" }] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 7;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "ST12-16"));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT10-112")).toBe(true);
  });

  it("activates the same deletion effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST12-16", as: "option", faceUp: true }] }, 1: { battleArea: ["ST12-10"] } }, { autoSelectCards: true, autoOrderTriggers: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
