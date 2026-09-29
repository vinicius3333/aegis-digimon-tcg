import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
    await settle(
      () =>
        s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("agumon").instanceId) &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId),
    );

    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("agumon").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId)).toBe(false);
  });

  it("does not return to hand when its host is deleted outside Digi-Burst", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT4-012",
            dp: 1000,
            as: "host",
            under: ["BT1-001", { card: "BT4-008", as: "agumon" }],
          },
        ],
      },
      1: { battleArea: [{ card: "BT1-057", dp: 5000, suspended: true, as: "target" }] },
    });
    const hostId = s.perm("host").permanentId;
    const agumonId = s.inst("agumon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId), 5000);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === agumonId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === agumonId)).toBe(true);
  });
});

describe("BT4-008 Agumon — KB Q&A rulings", () => {
  // Engine gap: a directly activated [Main] effect opens no resolving window, so the Digi-Burst
  // discard watcher resolves in the middle of the effect instead of after it.
  it.fails("returns to hand only after the Digi-Burst effect has resolved (Q1155)", async () => {
    const snapshots: { targetGone: boolean; agumonInHand: boolean }[] = [];
    let live: ReturnType<typeof setupEngine> | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-012", as: "host", under: [{ card: "BT1-001" }, { card: "BT4-008", as: "agumon" }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] },
      },
      {
        autoSelectCards: true,
        onEvent: () => {
          if (live === undefined) return;
          snapshots.push({
            targetGone: !live.state.players[1]!.battleArea.some(
              (p) => p.permanentId === live!.perm("target").permanentId,
            ),
            agumonInHand: live.state.players[0]!.hand.some((c) => c.instanceId === live!.inst("agumon").instanceId),
          });
        },
      },
    );
    live = s;
    await s.engine.recomputeContinuousEffects();
    const effectKey = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((effect) => effect.effectKey.startsWith("BT4-012/"))?.effectKey;
    expect(effectKey).toBeDefined();
    const targetId = s.perm("target").permanentId;
    const agumonId = s.inst("agumon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard!.instanceId,
        effectKey: effectKey!,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((c) => c.instanceId === agumonId) &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId),
    );

    const firstTargetGone = snapshots.findIndex((snapshot) => snapshot.targetGone);
    const firstAgumonInHand = snapshots.findIndex((snapshot) => snapshot.agumonInHand);
    expect(firstTargetGone).toBeGreaterThanOrEqual(0);
    expect(firstAgumonInHand).toBeGreaterThan(firstTargetGone);
  });
});
