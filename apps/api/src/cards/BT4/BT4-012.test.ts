import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-012.js";

describe("BT4-012 GeoGreymon", () => {
  it("trashes 2 of its sources to delete an opposing Digimon with 4000 DP or less", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-012", as: "geo", under: ["BT1-001", "BT4-008"] }] },
        1: { battleArea: [{ card: "BT1-009", dp: 4000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const geo = s.perm("geo");
    const effectKey = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(geo.topCard!)).find((e) =>
      e.effectKey.startsWith("BT4-012/"),
    )?.effectKey;
    expect(effectKey).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: geo.topCard!.instanceId,
        effectKey: effectKey!,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId));

    expect(geo.stack).toHaveLength(0);
    expect(geo.topCard?.cardId).toBe("BT4-012");
    expect(s.state.players[0]!.battleArea).toContain(geo);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("cannot delete an opposing Digimon with more than 4000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-012", as: "geo", under: ["BT1-001", "BT4-008"] }] },
        1: { battleArea: [{ card: "BT1-009", dp: 5000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const geo = s.perm("geo");
    const targetId = s.perm("target").permanentId;
    const effectKey = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(geo.topCard!)).find((e) =>
      e.effectKey.startsWith("BT4-012/"),
    )?.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: geo.topCard!.instanceId,
        effectKey: effectKey!,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.decisions).toHaveLength(0);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
    expect(geo.stack).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
