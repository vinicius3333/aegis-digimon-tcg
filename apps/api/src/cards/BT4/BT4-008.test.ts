import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-008.js";
import "./BT4-012.js";

describe("BT4-008 Agumon", () => {
  it("returns itself to hand after it is trashed for its host's Digi-Burst", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-012", as: "host", under: [{ card: "BT1-001" }, { card: "BT4-008", as: "agumon" }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
    const source = (s.engine as any).cardSourceOf(s.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((e) =>
      e.effectKey.startsWith("BT4-012/"),
    )?.effectKey;
    expect(effectKey).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard!.instanceId,
        effectKey: effectKey!,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("agumon").instanceId));

    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("agumon").instanceId)).toBe(true);
  });
});
