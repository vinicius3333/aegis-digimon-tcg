import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-032.js";

describe("BT4-032 MachGaogamon", () => {
  it("Digi-Bursts 2 to return a level 4 Digimon after trashing all of its sources", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-032", as: "mach", under: ["BT1-001", "BT4-021"] }] }, 1: { battleArea: [{ card: "BT3-025", as: "target", under: [{ card: "BT1-001", as: "oppBottom" }, { card: "BT2-001", as: "oppTop" }] }] } }, { autoSelectCards: true });
    const targetId = s.perm("target").permanentId;
    const opponentSources = [s.inst("oppBottom").instanceId, s.inst("oppTop").instanceId];
    const source = (s.engine as any).cardSourceOf(s.perm("mach").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT4-032/"))!.effectKey;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("mach").topCard!.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT3-025"));

    expect(s.perm("mach").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(opponentSources.every((id) => s.state.players[1]!.trash.some((card) => card.instanceId === id))).toBe(true);
  });

  it("gives +2000 DP to its host while you have a Tamer of any color", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-034", as: "host", under: ["BT4-032"] }, { card: "BT1-088" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });
});
