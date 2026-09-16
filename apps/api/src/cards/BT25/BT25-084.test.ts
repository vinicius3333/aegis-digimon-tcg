import { describe, it, expect } from "vitest";
import { EffectTiming, digivolutionRequirementsFor, type PlayerState } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT25-084.js";

const TITAMON = "BT25-084";

function fireTiming(s: EngineSetup, timing: EffectTiming, trigger: Record<string, unknown> = {}): Promise<void> {
  return (
    s.engine as unknown as { fireTiming(t: EffectTiming, tr?: Record<string, unknown>): Promise<void> }
  ).fireTiming(timing, trigger);
}

function alive(p: PlayerState, permanentId: string): boolean {
  return p.battleArea.some((perm) => perm.permanentId === permanentId);
}

describe("A3 BT25-084 — shared OP/WD/WA + entered-by-effect security + leave cost", () => {
  it("uses the cost-2 exact Titamon path only when the base has fewer than 3 printed colors", async () => {
    expect(digivolutionRequirementsFor(TITAMON)).toEqual([
      { namesExact: ["Titamon"], baseColorCountMax: 2, cost: 2, isAlternate: true },
      { level: 5, traits: ["TS"], cost: 4, isAlternate: true },
    ]);

    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT11-057", as: "dualTitamon" }],
        hand: [{ card: TITAMON, as: "newTitamon" }],
        deck: ["BT1-013"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("dualTitamon").permanentId,
        instanceId: legal.inst("newTitamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("dualTitamon").topCard.cardId === TITAMON);
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("dualTitamon").stack.at(-1)?.cardId).toBe("BT11-057");

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: TITAMON, as: "threeColorTitamon" }],
        hand: [{ card: TITAMON, as: "newTitamon" }],
      },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("threeColorTitamon").permanentId,
        instanceId: illegal.inst("newTitamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(illegal.state.memory).toBe(2);
    expect(illegal.perm("threeColorTitamon").topCard.instanceId).not.toBe(illegal.inst("newTitamon").instanceId);

    const tsRoute = setupEngine({
      0: {
        battleArea: [{ card: "BT24-015", as: "level5Ts" }],
        hand: [{ card: TITAMON, as: "newTitamon" }],
        deck: ["BT1-013"],
      },
    });
    tsRoute.state.memory = 4;
    expect(
      tsRoute.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: tsRoute.perm("level5Ts").permanentId,
        instanceId: tsRoute.inst("newTitamon").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => tsRoute.perm("level5Ts").topCard.cardId === TITAMON);
    expect(tsRoute.state.memory).toBe(0);

    const wrongLevel = setupEngine({
      0: {
        battleArea: [{ card: "BT26-038", as: "level4Ts" }],
        hand: [{ card: TITAMON, as: "newTitamon" }],
      },
    });
    wrongLevel.state.memory = 4;
    expect(
      wrongLevel.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongLevel.perm("level4Ts").permanentId,
        instanceId: wrongLevel.inst("newTitamon").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(wrongLevel.state.memory).toBe(4);
  });

  it.each([
    ["purple", "BT10-012"],
    ["red", "AD1-002"],
    ["green", "AD1-011"],
  ] as const)("uses the ordinary %s Lv5 evolution at exact cost 5", async (_color, source) => {
    const s = setupEngine({
      0: { battleArea: [{ card: source, as: "base" }], hand: [{ card: TITAMON, as: "titamon" }] },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === TITAMON);
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard?.cardId).toBe(TITAMON);
  });

  it("rejects a blue Lv5 source on the ordinary route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-038", as: "base" }], hand: [{ card: TITAMON, as: "titamon" }] },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain(TITAMON);
  });

  it("(a) On Play (by effect) deletes ALL of the opponent's highest-DP Digimon (every tie)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, dp: 13000, as: "titamon" }],
          hand: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", dp: 12000, as: "high1" },
            { card: "BT1-013", dp: 12000, as: "high2" },
            { card: "BT1-013", dp: 5000, as: "low" },
          ],
          security: ["BT1-013", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const high1Id = s.perm("high1").permanentId;
    const high2Id = s.perm("high2").permanentId;
    const lowId = s.perm("low").permanentId;

    await s.engine.recomputeContinuousEffects();
    await fireTiming(s, EffectTiming.OnPlay, { enteredByEffect: 0 });
    await settle(() => !alive(p1, high1Id) && !alive(p1, high2Id) && !alive(p1, lowId));

    expect(alive(p1, high1Id)).toBe(false);
    expect(alive(p1, high2Id)).toBe(false);
    expect(alive(p1, lowId)).toBe(false);
  });

  it("Q6397 grants no deletion when the selected hand-trash payment does not actually move", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, as: "titamon" }],
          hand: [{ card: "BT1-013", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 4000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const primitives = (s.engine as unknown as { primitives: { trash(ids: string[]): Promise<unknown[]> } }).primitives;
    primitives.trash = async () => [];

    await fireTiming(s, EffectTiming.OnPlay, {
      subjectPermanentId: s.perm("titamon").permanentId,
      playedPermanentId: s.perm("titamon").permanentId,
    });

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(alive(s.state.players[1]!, targetId)).toBe(true);
  });

  it("(c)+(a) On Play by effect ALSO trashes the opponent's top security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, dp: 13000, as: "titamon" }],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 8000 }], security: ["BT1-013", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;

    expect(p1.security.length).toBe(2);
    await s.engine.recomputeContinuousEffects();
    await fireTiming(s, EffectTiming.OnPlay, { enteredByEffect: 0 });
    await settle(() => p1.security.length < 2);

    expect(p1.security.length).toBe(1);
  });

  it("(c) On Play NOT by effect (manual entry) deletes but does NOT trash security (the gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, dp: 13000, as: "titamon" }],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 9000, as: "target" }], security: ["BT1-013", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const targetId = s.perm("target").permanentId;

    await s.engine.recomputeContinuousEffects();
    await fireTiming(s, EffectTiming.OnPlay, {});
    await settle(() => !alive(p1, targetId));
    await settle(() => false, 80);

    expect(alive(p1, targetId)).toBe(false);
    expect(p1.security.length).toBe(2);
  });

  it("(c) When Attacking does NOT trash security (the entered-by-effect gate), but still deletes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, dp: 13000, as: "titamon" }],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 9000, as: "target" }], security: ["BT1-013", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const targetId = s.perm("target").permanentId;

    await s.engine.recomputeContinuousEffects();
    await fireTiming(s, EffectTiming.OnUseAttack, {});
    await settle(() => !alive(p1, targetId));
    await settle(() => false, 80);

    expect(alive(p1, targetId)).toBe(false);
    expect(p1.security.length).toBe(2);
  });

  it("(d) On Play and When Attacking in the same turn SHARE one [Once Per Turn] use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, dp: 13000, as: "titamon" }],
          hand: ["BT1-013", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 7000, as: "first" }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const firstId = s.perm("first").permanentId;

    await s.engine.recomputeContinuousEffects();
    await fireTiming(s, EffectTiming.OnPlay, { enteredByEffect: 0 });
    await settle(() => !alive(p1, firstId));
    await settle(() => false, 50);
    expect(alive(p1, firstId)).toBe(false);

    const second = s.putOnBoard(1, { card: "BT1-013", dp: 7000 });

    await fireTiming(s, EffectTiming.OnUseAttack, {});
    await settle(() => false, 60);

    expect(alive(p1, second.permanentId)).toBe(true);
  });

  it("(b) leave-prevention costs trashing 2 cards from hand (the Digimon survives)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, dp: 13000, as: "titamon" }],
          hand: ["BT1-013", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const titamonId = s.perm("titamon").permanentId;

    await s.engine.recomputeContinuousEffects();
    expect(p0.hand.length).toBe(2);

    const fx = (s.engine as unknown as { primitives: { deletePermanent(ids: string[]): Promise<number> } }).primitives;
    await fx.deletePermanent([titamonId]);
    await settle(() => p0.hand.length < 2);

    expect(alive(p0, titamonId)).toBe(true);
    expect(p0.hand.length).toBe(0);
  });

  it("Q6399 prevents the first 0-DP rule deletion, then the repeated rule check deletes it before its hand-trash trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, as: "titamon" }],
          hand: ["BT1-013", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 4000, as: "lowest" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const titamonId = s.perm("titamon").permanentId;
    const lowestId = s.perm("lowest").permanentId;
    await s.engine.recomputeContinuousEffects();
    s.perm("titamon").baseDP = 0;
    s.perm("titamon").currentDP = 0;

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    await settle(() => !alive(s.state.players[0]!, titamonId));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-013")).toHaveLength(2);
    expect(alive(s.state.players[1]!, lowestId)).toBe(true);
  });

  it("(producer) PLAYED by an effect fires its own On Play AND trashes security — no synthetic trigger", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: TITAMON, as: "titamon" }, "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 9000, as: "target" }], security: ["BT1-013", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const titamonId = s.inst("titamon").instanceId;
    const targetId = s.perm("target").permanentId;

    await s.engine.recomputeContinuousEffects();
    const fx = (s.engine as unknown as { primitives: { playInstances(ids: string[]): Promise<unknown[]> } }).primitives;
    await fx.playInstances([titamonId]);
    await settle(() => p1.security.length < 2);

    expect(alive(p1, targetId)).toBe(false);
    expect(p1.security.length).toBe(1);
  });

  it("(producer) DIGIVOLVED by an effect fires its own When Digivolving + entered-by-effect security trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-015", dp: 3000, as: "base" }],
          hand: [{ card: TITAMON, as: "titamon" }, "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 9000, as: "target" }], security: ["BT1-013", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const baseId = s.perm("base").permanentId;
    const titamonId = s.inst("titamon").instanceId;
    const targetId = s.perm("target").permanentId;

    await s.engine.recomputeContinuousEffects();
    const fx = (
      s.engine as unknown as {
        primitives: { digivolveFromInstance(targetPermanentId: string, sourceInstanceId: string): Promise<unknown> };
      }
    ).primitives;
    await fx.digivolveFromInstance(baseId, titamonId);
    await settle(() => p1.security.length < 2);

    expect(alive(p1, targetId)).toBe(false);
    expect(p1.security.length).toBe(1);
  });

  it("(e) [All Turns] when YOUR hand is trashed from, deletes 1 of the opponent's lowest-DP Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, dp: 13000, as: "titamon" }],
          hand: [{ card: "BT1-013", as: "handCard" }],
        },
        1: {
          battleArea: [
            { card: "BT1-013", dp: 11000, as: "high" },
            { card: "BT1-013", dp: 4000, as: "low" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const handCardId = s.inst("handCard").instanceId;
    const highId = s.perm("high").permanentId;
    const lowId = s.perm("low").permanentId;

    await s.engine.recomputeContinuousEffects();
    const fx = (s.engine as unknown as { primitives: { trash(ids: string[]): Promise<unknown[]> } }).primitives;
    await fx.trash([handCardId]);
    await settle(() => !alive(p1, lowId));

    expect(alive(p1, lowId)).toBe(false);
    expect(alive(p1, highId)).toBe(true);
  });

  it("Q6400/Q6401 fires once per hand-trash action, not once per card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, as: "titamon" }],
          hand: [
            { card: "BT1-013", as: "cost1" },
            { card: "BT1-013", as: "cost2" },
            { card: "BT1-013", as: "cost3" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", dp: 3000, as: "low1" },
            { card: "BT1-013", dp: 3000, as: "low2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    await s.engine.recomputeContinuousEffects();
    const fx = (s.engine as unknown as { primitives: { trash(ids: string[]): Promise<unknown[]> } }).primitives;

    await fx.trash([s.inst("cost1").instanceId, s.inst("cost2").instanceId]);
    await settle(() => p1.battleArea.length === 1);
    expect(p1.battleArea).toHaveLength(1);

    await fx.trash([s.inst("cost3").instanceId]);
    await settle(() => p1.battleArea.length === 0);
    expect(p1.battleArea).toHaveLength(0);
  });

  it("(e-neg) the opponent's hand being trashed does NOT fire it (your-hand-only seat gate)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: TITAMON, dp: 13000, as: "titamon" }] },
        1: {
          hand: [{ card: "BT1-013", as: "oppHandCard" }],
          battleArea: [{ card: "BT1-013", dp: 4000, as: "low" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const oppHandCardId = s.inst("oppHandCard").instanceId;
    const lowId = s.perm("low").permanentId;

    await s.engine.recomputeContinuousEffects();
    const fx = (s.engine as unknown as { primitives: { trash(ids: string[]): Promise<unknown[]> } }).primitives;
    await fx.trash([oppHandCardId]);
    await settle(() => false, 60);

    expect(alive(p1, lowId)).toBe(true);
  });

  it("(b-neg) with only 1 card in hand the 2-card cost cannot be paid -> the Digimon leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, dp: 13000, as: "titamon" }],
          hand: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const titamonId = s.perm("titamon").permanentId;

    await s.engine.recomputeContinuousEffects();
    const fx = (s.engine as unknown as { primitives: { deletePermanent(ids: string[]): Promise<number> } }).primitives;
    await fx.deletePermanent([titamonId]);
    await settle(() => !alive(p0, titamonId));

    expect(alive(p0, titamonId)).toBe(false);
  });
});
