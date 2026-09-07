import { describe, it, expect } from "vitest";
import { EffectTiming, digivolutionRequirementsFor, type PlayerState } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
// Register only the card under audit. The fixtures need catalog definitions, not the effects of
// every other card in the set; avoiding the set-wide index keeps this focused gate low-memory.
import "./BT25-084.js";

/**
 * A3 — BT25-084 (Titamon, Purple). documented behavior ref: documented behavior.
 *
 * Shared On Play / When Digivolving / When Attacking ([Once Per Turn], one hashValue): by trashing
 * 1 card in hand, delete ALL of the opponent's highest-DP Digimon; AFTER, if this card entered the
 * battle area BY AN EFFECT (played/digivolved by an effect — never on a When Attacking entry), trash
 * the opponent's top security card. Plus an [All Turns] [Once Per Turn] leave-prevention: when this
 * Digimon would leave, by trashing 2 cards in hand it doesn't leave.
 *
 * Drives the REAL GameEngine: the OP/WD/WA windows via the timing seam (the established mechanic.test
 * pattern), the leave-prevention via the real delete primitive's consult.
 *
 * FAILS-WHEN-REVERTED levers:
 *   (a) delete-ALL-ties: revert Delete count "all" -> 1 and only one of the tied max-DP Digimon dies.
 *   (b) trash-2 leave cost: drop the Replacement cost and the prevention is free (hand keeps its 2).
 *   (c) entered-by-effect gate: drop `triggerEnteredByEffect` (or its OP/WD gating) and a When
 *       Attacking entry would trash security; the gate keeps security intact on attack.
 *   (d) shared once-per-turn: drop `sharedUseKey` and OP + WA in one turn delete TWICE; the shared
 *       key makes the second window inert.
 */

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
          hand: ["BT1-013"], // the trash-1 cost fuel
        },
        1: {
          battleArea: [
            { card: "BT1-013", dp: 12000, as: "high1" },
            { card: "BT1-013", dp: 12000, as: "high2" }, // tied maximum
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

    // BOTH tied 12000 Digimon are deleted by the OP clause (count:"all" — reverting it to 1 leaves
    // one tie alive). The 5000 `low` is deleted by the SEPARATE [All Turns] 3rd clause that fires on
    // the trash-1 cost (your hand was trashed from -> delete opp lowest-DP).
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
    // OnPlay window WITHOUT enteredByEffect — a manual hard play. The `triggerEnteredByEffect`
    // gate fails, so security is NOT trashed even though the SecurityManipulation action exists.
    await fireTiming(s, EffectTiming.OnPlay, {});
    await settle(() => !alive(p1, targetId));
    await settle(() => false, 80); // fully flush so a (wrong) security trash WOULD be observed

    expect(alive(p1, targetId)).toBe(false); // delete still happens
    expect(p1.security.length).toBe(2); // security UNTOUCHED (entered-by-effect gate failed)
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
    // No enteredByEffect on the When Attacking window (OnUseAttack) — the security clause must NOT fire.
    await fireTiming(s, EffectTiming.OnUseAttack, {});
    await settle(() => !alive(p1, targetId));
    await settle(() => false, 80); // fully flush so a (wrong) security trash WOULD be observed

    expect(alive(p1, targetId)).toBe(false); // delete still happens
    expect(p1.security.length).toBe(2); // security UNTOUCHED on attack
  });

  it("(d) On Play and When Attacking in the same turn SHARE one [Once Per Turn] use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, dp: 13000, as: "titamon" }],
          hand: ["BT1-013", "BT1-013"], // fuel for two attempts
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
    await settle(() => false, 50); // let the On Play window fully resolve + register the shared use
    expect(alive(p1, firstId)).toBe(false); // first use spent

    // A SECOND target for the When Attacking window, same turn.
    const second = s.putOnBoard(1, { card: "BT1-013", dp: 7000 });

    await fireTiming(s, EffectTiming.OnUseAttack, {});
    await settle(() => false, 60); // flush; nothing should delete `second`

    // The shared use is already spent -> the When Attacking window is inert this turn.
    expect(alive(p1, second.permanentId)).toBe(true);
  });

  it("(b) leave-prevention costs trashing 2 cards from hand (the Digimon survives)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, dp: 13000, as: "titamon" }],
          hand: ["BT1-013", "BT1-013"], // exactly the 2-card cost
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const titamonId = s.perm("titamon").permanentId;

    await s.engine.recomputeContinuousEffects(); // installs the wouldLeavePlay prevention
    expect(p0.hand.length).toBe(2);

    // An (opponent) effect tries to delete Titamon; the prevention pays trash-2 and keeps it.
    const fx = (s.engine as unknown as { primitives: { deletePermanent(ids: string[]): Promise<number> } }).primitives;
    await fx.deletePermanent([titamonId]);
    await settle(() => p0.hand.length < 2);

    expect(alive(p0, titamonId)).toBe(true); // prevented from leaving
    expect(p0.hand.length).toBe(0); // 2 cards trashed as the cost
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
          // loose in hand — played BY AN EFFECT, not placed
          hand: [{ card: TITAMON, as: "titamon" }, "BT1-013"], // the trash-1 cost fuel
        },
        1: { battleArea: [{ card: "BT1-013", dp: 9000, as: "target" }], security: ["BT1-013", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const titamonId = s.inst("titamon").instanceId;
    const targetId = s.perm("target").permanentId;

    await s.engine.recomputeContinuousEffects();
    // The REAL effect-play verb (PlayWithoutCost) — the producer fires the played card's own On Play
    // with enteredByEffect set. Reverting the producer leaves On Play unfired (delete + security both
    // skipped), so this fails-when-reverted on the producer itself, not just the gate.
    const fx = (s.engine as unknown as { primitives: { playInstances(ids: string[]): Promise<unknown[]> } }).primitives;
    await fx.playInstances([titamonId]);
    await settle(() => p1.security.length < 2);

    expect(alive(p1, targetId)).toBe(false); // On Play delete fired (the window ran at all)
    expect(p1.security.length).toBe(1); // entered-by-effect security trash fired (producer set the marker)
  });

  it("(producer) DIGIVOLVED by an effect fires its own When Digivolving + entered-by-effect security trash", async () => {
    // BT24-015 (MetalGreymon, Lv.5, [TS] trait) satisfies BT25-084's printed alternate digivolve
    // requirement ("[Digivolve] Lv.5 w/[TS] trait: Cost 4") — a level-3, non-[TS] base (as the
    // other cases in this file use) fails BOTH of Titamon's digivolve paths, so
    // digivolveFromInstance would legitimately no-op before the [When Digivolving] window ever
    // fires. The 3-color-only BT1-013 stand-in used elsewhere in this file doesn't apply here
    // because THIS test exercises the digivolve verb itself, not a play/replacement primitive.
    const s = setupEngine(
      {
        0: {
          // the Digimon BT25-084 digivolves on top of
          battleArea: [{ card: "BT24-015", dp: 3000, as: "base" }],
          // loose in hand — digivolved BY AN EFFECT
          hand: [{ card: TITAMON, as: "titamon" }, "BT1-013"], // the trash-1 cost fuel
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

    expect(alive(p1, targetId)).toBe(false); // When Digivolving delete fired
    expect(p1.security.length).toBe(1); // entered-by-effect security trash fired
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
            { card: "BT1-013", dp: 4000, as: "low" }, // the lowest-DP — the 3rd clause's target
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
    // ANY trash from p0's hand (here a direct effect-trash, not Titamon's own cost) fires the real
    // whenHandTrashed producer; the [All Turns] watcher deletes the opponent's lowest-DP Digimon.
    const fx = (s.engine as unknown as { primitives: { trash(ids: string[]): Promise<unknown[]> } }).primitives;
    await fx.trash([handCardId]);
    await settle(() => !alive(p1, lowId));

    expect(alive(p1, lowId)).toBe(false); // lowest-DP deleted
    expect(alive(p1, highId)).toBe(true); // the 11000 survives (only the lowest is hit)
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

    // One action moving two cards emits one event, therefore deletes only one tied minimum.
    await fx.trash([s.inst("cost1").instanceId, s.inst("cost2").instanceId]);
    await settle(() => p1.battleArea.length === 1);
    expect(p1.battleArea).toHaveLength(1);

    // A separate trash action emits a second event and may delete the remaining Digimon.
    await fx.trash([s.inst("cost3").instanceId]);
    await settle(() => p1.battleArea.length === 0);
    expect(p1.battleArea).toHaveLength(0);
  });

  it("(e-neg) the opponent's hand being trashed does NOT fire it (your-hand-only seat gate)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: TITAMON, dp: 13000, as: "titamon" }] },
        1: {
          hand: [{ card: "BT1-013", as: "oppHandCard" }], // the OPPONENT's hand
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
    await fx.trash([oppHandCardId]); // trashing the OPPONENT's hand
    await settle(() => false, 60);

    expect(alive(p1, lowId)).toBe(true); // NOT deleted — only YOUR hand being trashed fires it
  });

  it("(b-neg) with only 1 card in hand the 2-card cost cannot be paid -> the Digimon leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TITAMON, dp: 13000, as: "titamon" }],
          hand: ["BT1-013"], // only 1 — cannot pay trash-2
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

    expect(alive(p0, titamonId)).toBe(false); // unpaid cost -> leaves
  });
});
