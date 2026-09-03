import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-028.js";

describe("BT6-028 Pukumon", () => {
  it("Digi-Bursts 2 to prevent all own Digimon from being blocked for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-028", under: ["BT1-001", "BT1-002"], as: "pukumon" },
            { card: "BT1-010", as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT6-056", as: "blocker" }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    const source = observe(s.engine).cardSource(s.perm("pukumon"));
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT6-028/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("pukumon").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("pukumon").stack.length === 0 &&
        observe(s.engine).isRestricted(s.perm("pukumon"), "cantBeBlocked") &&
        observe(s.engine).isRestricted(s.perm("attacker"), "cantBeBlocked"),
    );

    expect(s.perm("pukumon").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("pukumon"), "cantBeBlocked")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("attacker"), "cantBeBlocked")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });
});
