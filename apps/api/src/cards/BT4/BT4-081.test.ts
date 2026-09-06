import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-081.js";

describe("BT4-081 Devimon", () => {
  it("Digi-Bursts 2 to delete an opposing level 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-081", as: "devimon", under: ["BT4-077", "BT3-076"] }] },
        1: { battleArea: [{ card: "BT3-076", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const source = observe(s.engine).cardSource(s.perm("devimon").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT4-081/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("devimon").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));

    expect(s.perm("devimon").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });

  it("does not pay Digi-Burst or delete an opposing level 4 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-081", as: "devimon", under: ["BT4-077", "BT3-076"] }] },
        1: { battleArea: [{ card: "BT4-082", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const source = observe(s.engine).cardSource(s.perm("devimon").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT4-081/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("devimon").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.decisions).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("devimon").stack).toHaveLength(2);
  });
});
