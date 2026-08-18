import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT4/BT4-026.js";
import "./BT7-003.js";

describe("BT7-003 Kyaromon", () => {
  it("gives an opposing Digimon -1000 DP when trashed for its host's Digi-Burst", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-026", under: [{ card: "BT7-003", as: "kyaromon" }, "BT1-001"], as: "host" }], deck: ["BT1-010"] }, 1: { battleArea: [{ card: "BT6-016", as: "target" }] } }, { autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.inst("kyaromon").instanceId);
    const source = (s.engine as any).cardSourceOf(s.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT4-026/"))!.effectKey;
    const baseDP = s.perm("target").baseDP;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("host").topCard!.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === baseDP - 1000);

    expect(s.perm("target").currentDP).toBe(baseDP - 1000);
  });
});
