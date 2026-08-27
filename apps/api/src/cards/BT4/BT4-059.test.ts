import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-059.js";

describe("BT4-059 Lilamon", () => {
  it("Digi-Bursts 2 to suspend an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-059", as: "lila", under: ["BT1-001", "BT4-052"] }] },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const effectKey = effectsOf(
      EffectTiming.OnDeclaration,
      (s.engine as any).cardSourceOf(s.perm("lila").topCard!),
    ).find((effect) => effect.effectKey.startsWith("BT4-059/"))!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lila").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("lila").stack).toHaveLength(0);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("suspends an opposing Digimon when its host attacks while you have any Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-060", as: "host", under: ["BT4-059"] }, { card: "BT1-086" }] },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend an opposing Digimon from its inherited effect without a Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-060", as: "host", under: ["BT4-059"] }] },
      1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-001"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.perm("target").isSuspended).toBe(false);
  });
});
