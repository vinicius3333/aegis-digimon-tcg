import { describe, it, expect } from "vitest";
import { EffectTiming, Phase, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

function fireTiming(
  s: ReturnType<typeof setupEngine>,
  timing: EffectTiming,
  trigger: Record<string, unknown> = {},
): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing, trigger);
}

describe("P-143 [End of Your Turn][OPT] move to breeding area", () => {
  it("moves Drimogemon from the battle area to the empty breeding area on end of turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-143", dp: 5000, as: "drimogemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const drimogemonId = s.perm("drimogemon").permanentId;

    expect(p0.breeding).toBeUndefined();

    await fireTiming(s, EffectTiming.OnEndTurn);
    await settle(() => p0.breeding !== undefined);

    expect(p0.breeding).toBeDefined();
    expect(p0.breeding!.permanentId).toBe(drimogemonId);
    expect(p0.battleArea.some((perm) => perm.permanentId === drimogemonId)).toBe(false);
  });

  it("preserves digivolution cards when moving to breeding (KB Q4251)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-143", dp: 5000, as: "drimogemon", under: [{ card: "BT1-064", as: "stackCard", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const stackCardId = s.inst("stackCard").instanceId;

    await fireTiming(s, EffectTiming.OnEndTurn);
    await settle(() => p0.breeding !== undefined);

    expect(p0.breeding!.stack.some((c) => c.instanceId === stackCardId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === stackCardId)).toBe(false);
  });

  it("does NOT move when the breeding area is already occupied", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-143", dp: 5000, as: "drimogemon" }],
          breeding: { card: "BT1-001", dp: 3000, as: "breeder" },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const drimogemonId = s.perm("drimogemon").permanentId;
    const breedingBefore = s.perm("breeder").permanentId;

    await fireTiming(s, EffectTiming.OnEndTurn);
    for (let i = 0; i < 30; i++) await Promise.resolve();

    expect(p0.breeding?.permanentId).toBe(breedingBefore);
    expect(p0.battleArea.some((perm) => perm.permanentId === drimogemonId)).toBe(true);
  });

  it("does NOT move when it is not the owner's turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-143", dp: 5000, as: "drimogemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const p0 = s.state.players[0] as PlayerState;
    const drimogemonId = s.perm("drimogemon").permanentId;

    await fireTiming(s, EffectTiming.OnEndTurn);
    for (let i = 0; i < 30; i++) await Promise.resolve();

    expect(p0.breeding).toBeUndefined();
    expect(p0.battleArea.some((perm) => perm.permanentId === drimogemonId)).toBe(true);
  });

  it("resets after a natural owner turn and can move again from breeding", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-143", as: "drimogemon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(p0.breeding?.permanentId).toBe(s.perm("drimogemon").permanentId);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Breeding" && p0.breeding !== undefined);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: p0.breeding!.permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Breeding" && p0.breeding !== undefined);
    expect(p0.breeding?.permanentId).toBe(s.perm("drimogemon").permanentId);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("P-143 Drimogemon — KB Q&A rulings", () => {
  async function endOfTurn(s: EngineSetup): Promise<void> {
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle(() => s.state.pendingDecision === undefined);
  }

  function inBreeding(s: EngineSetup): boolean {
    return s.state.players[0]!.breeding?.topCard.cardId === "P-143";
  }

  async function moveBackWithLui(s: EngineSetup): Promise<void> {
    s.state.phase = Phase.Main;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lui").instanceId })).toEqual({ ok: true });
    await settle(() => !inBreeding(s) && s.state.pendingDecision === undefined);
    await settle(() => s.state.pendingDecision === undefined);
  }

  async function leaveBreedingPhaseAndSurrender(s: EngineSetup): Promise<void> {
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  }

  it("can't move to breeding after EX7-014's [When Digivolving] forbids moving Digimon (Q3835)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [{ card: "EX7-014", as: "volcanic" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "P-143", as: "drimogemon" }], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-014" && s.state.pendingDecision === undefined);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);

    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "P-143")).toBe(true);
    expect(s.state.players[1]!.breeding).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not process <Overflow> of a digivolution card when it moves to breeding (Q4250)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-143", as: "drimogemon", under: [{ card: "BT14-014", as: "ace" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    await endOfTurn(s);

    expect(inBreeding(s)).toBe(true);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toContain(s.inst("ace").instanceId);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("is unaffected by an opponent's ＜Security A. -1＞ in breeding and affected again back in play (Q4252)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-143", as: "drimogemon" }],
          hand: [{ card: "P-130", as: "lui" }],
          deck: Array(10).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "EX13-035", as: "kingEtemon" },
            { card: "BT3-063", as: "sukamon" },
            { card: "BT3-070", as: "etemon" },
          ],
          deck: Array(10).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const drimogemonId = s.perm("drimogemon").permanentId;
    const securityAttack = () => {
      const player = s.state.players[0]!;
      const permanent =
        player.breeding?.permanentId === drimogemonId
          ? player.breeding
          : player.battleArea.find(({ permanentId }) => permanentId === drimogemonId)!;
      return observe(s.engine).keywordAmount(permanent, "SecurityAttack");
    };
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(securityAttack()).toBe(-1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(inBreeding(s)).toBe(true);
    expect(securityAttack()).toBe(0);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 0 && [Phase.Breeding, Phase.Main].includes(s.state.phase as Phase));
    if (s.state.phase === Phase.Breeding) expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(securityAttack()).toBe(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lui").instanceId })).toEqual({ ok: true });
    await settle(() => !inBreeding(s) && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === drimogemonId)).toBe(true);
    expect(securityAttack()).toBe(-1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("can't use its [Once Per Turn] move again after returning to the battle area that turn (Q4253)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-143", as: "drimogemon" }], hand: [{ card: "P-130", as: "lui" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await endOfTurn(s);
    expect(inBreeding(s)).toBe(true);

    await moveBackWithLui(s);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "P-143")).toBe(true);

    await endOfTurn(s);
    expect(inBreeding(s)).toBe(false);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "P-143")).toBe(true);
    assertNoLoudGap(s);
  });

  async function davisKenReturnAfterEndOfTurn(declineMove: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-085", as: "davisKen" }],
          hand: [
            { card: "BT16-040", as: "wormmon" },
            { card: "P-143", as: "drimogemon" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: declineMove ? ["breeding"] : [] },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const wormmon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("wormmon").instanceId,
    );
    expect(wormmon).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wormmon!.permanentId,
        instanceId: s.inst("drimogemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => wormmon!.topCard.cardId === "P-143" && s.state.pendingDecision === undefined);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);

    const outcome = {
      inBreeding: s.state.players[0]!.breeding?.permanentId === wormmon!.permanentId,
      returnedToHand: s.state.players[0]!.hand.some(({ cardId }) => cardId === "P-143"),
    };
    if (outcome.inBreeding) await leaveBreedingPhaseAndSurrender(s);
    else expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    return outcome;
  }

  it("is not returned to the hand by BT16-085 while it sits in the breeding area (Q4254)", async () => {
    expect(await davisKenReturnAfterEndOfTurn(false)).toEqual({ inBreeding: true, returnedToHand: false });
    expect(await davisKenReturnAfterEndOfTurn(true)).toEqual({ inBreeding: false, returnedToHand: true });
  });

  async function endTurnUnderPhantomPain(firstTrigger: string) {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-143", as: "drimogemon" }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
        1: {
          battleArea: ["BT2-067"],
          hand: [{ card: "EX6-070", as: "phantomPain" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [firstTrigger] },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("phantomPain").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.hand.length === 0);
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).customEffectGrants(s.perm("drimogemon"))).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const [endOfTurnOrder] = s.decisions.filter(({ req }) => req.kind === "orderTriggers");
    expect(endOfTurnOrder?.req.options?.triggerKeys).toHaveLength(2);
    const outcome = {
      inBreeding: inBreeding(s),
      deleted: s.state.players[0]!.trash.some(({ cardId }) => cardId === "P-143"),
    };
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    return outcome;
  }

  it("escapes EX6-070 Phantom Pain's granted deletion by moving to breeding first (Q4255)", async () => {
    expect(await endTurnUnderPhantomPain("P-143/")).toEqual({ inBreeding: true, deleted: false });
    expect(await endTurnUnderPhantomPain("granted/")).toEqual({ inBreeding: false, deleted: true });
  });

  it("stays suspended when it moves to the breeding area (Q4256)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-143", as: "drimogemon", suspended: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await endOfTurn(s);
    expect(inBreeding(s)).toBe(true);
    expect(s.state.players[0]!.breeding!.isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("is unsuspended in the breeding area during its owner's next unsuspend phase (Q4257)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-143", as: "drimogemon" }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("drimogemon").permanentId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(inBreeding(s)).toBe(true);
    expect(s.state.players[0]!.breeding!.isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);

    expect(inBreeding(s)).toBe(true);
    expect(s.state.players[0]!.breeding!.isSuspended).toBe(false);
    await leaveBreedingPhaseAndSurrender(s);
    await loop;
  });

  it("can't be chosen as an attack target while suspended in the breeding area (Q4258)", async () => {
    const s = setupEngine(
      {
        0: { breeding: { card: "P-143", as: "drimogemon", suspended: true } },
        1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    await s.ready();
    const result = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("drimogemon").permanentId },
    });
    expect(result.ok).toBe(false);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
  });
});
