import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-093.js";

describe("BT4-093 Thomas H. Norstein", () => {
  it("draws one card on play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT4-093", as: "source" }], deck: [{ card: "BT4-026", as: "drawn" }] },
    });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(player.deck).toHaveLength(0);
  });

  it("suspends to unsuspend a Gao Digimon while the opponent has 8 cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-093", as: "thomas" },
            { card: "BT4-035", as: "gao", suspended: true },
          ],
        },
        1: { hand: Array.from({ length: 8 }, () => "BT1-001") as string[] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const source = (s.engine as any).cardSourceOf(s.perm("thomas").topCard);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.includes("BT4-093"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("thomas").topCard.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("thomas").isSuspended && !s.perm("gao").isSuspended, 5000);
    expect(s.perm("thomas").isSuspended).toBe(true);
    expect(s.perm("gao").isSuspended).toBe(false);
  });

  it("does not activate the unsuspend effect at 7 opposing hand cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-093", as: "thomas" },
            { card: "BT4-035", as: "gao", suspended: true },
          ],
        },
        1: { hand: Array.from({ length: 7 }, () => "BT1-001") as string[] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const source = (s.engine as any).cardSourceOf(s.perm("thomas").topCard);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.includes("BT4-093"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("thomas").topCard.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("thomas").isSuspended).toBe(false);
    expect(s.perm("gao").isSuspended).toBe(true);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-093", as: "securityTamer", faceUp: true }] } });
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });
});
