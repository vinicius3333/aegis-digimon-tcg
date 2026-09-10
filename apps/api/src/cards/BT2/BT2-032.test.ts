import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-032.js";
import "./BT2-096.js";

describe("BT2-032 UlforceVeedramon", () => {
  it("unsuspends when one of its controller's blue Tamers becomes suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-032", as: "ulforce", under: ["BT2-027"], suspended: true },
          { card: "BT1-086", as: "tamer" },
        ],
      },
    });

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);

    expect(s.perm("ulforce").isSuspended).toBe(false);
  });

  it("gains 1 memory when it actually becomes unsuspended during its controller's main phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-032", as: "ulforce", under: ["BT2-027"], suspended: true }] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.unsuspend([s.perm("ulforce").permanentId]);

    expect(s.state.memory).toBe(1);
  });

  it("Q1007 does not react to a non-blue Tamer or an opponent's blue Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-032", as: "ulforce", under: ["BT2-027"], suspended: true },
          { card: "BT1-085", as: "redTamer" },
        ],
      },
      1: { battleArea: [{ card: "BT1-086", as: "opposingBlueTamer" }] },
    });

    await advance(s.engine).verb.suspend([s.perm("redTamer").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("opposingBlueTamer").permanentId]);

    expect(s.perm("ulforce").isSuspended).toBe(true);
  });

  it("Q1008 gains no memory when an already active copy is targeted by unsuspend", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-032", as: "ulforce", under: ["BT2-027"] }] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.unsuspend([s.perm("ulforce").permanentId]);

    expect(s.state.memory).toBe(0);
  });

  it("gains memory only once per turn even if it becomes unsuspended twice", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-032", as: "ulforce", under: ["BT2-027"], suspended: true }] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.unsuspend([s.perm("ulforce").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("ulforce").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("ulforce").permanentId]);

    expect(s.state.memory).toBe(1);
  });

  it("gains no memory when unsuspended outside its controller's main phase", async () => {
    const activePhase = setupEngine({
      0: { battleArea: [{ card: "BT2-032", as: "ulforce", under: ["BT2-027"], suspended: true }] },
    });
    activePhase.state.memory = 0;
    activePhase.state.phase = Phase.Active;
    await advance(activePhase.engine).verb.unsuspend([activePhase.perm("ulforce").permanentId]);
    expect(activePhase.state.memory).toBe(0);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "BT2-032", as: "ulforce", under: ["BT2-027"], suspended: true }] },
    });
    opponentTurn.state.memory = 0;
    opponentTurn.state.turnSeat = 1;
    await advance(opponentTurn.engine).verb.unsuspend([opponentTurn.perm("ulforce").permanentId]);
    expect(opponentTurn.state.memory).toBe(0);
  });

  it("proves the legal blue hatch stack, turn cycle, move, attack, and public unsuspend lifecycle", async () => {
    const deck = ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"];
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT2-002", as: "egg" }],
          battleArea: [{ card: "BT1-086", as: "tamer" }],
          hand: [
            { card: "BT2-022", as: "level3" },
            { card: "BT2-024", as: "level4" },
            { card: "BT2-027", as: "level5" },
            { card: "BT2-032", as: "ulforce" },
            { card: "BT2-096", as: "option" },
          ],
          deck,
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "sourceLessOpponent" },
            { card: "BT2-024", as: "stackedOpponent", under: ["BT2-022"] },
          ],
          security: ["BT1-010", "BT1-011"],
          deck,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    s.state.memory = 10;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    for (const alias of ["level3", "level4", "level5", "ulforce"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: breedingPermanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.breeding!.topCard.instanceId === s.inst(alias).instanceId,
      );
    }
    expect(s.state.players[0]!.breeding!.stack.map(({ cardId }) => cardId)).toEqual([
      "BT2-002",
      "BT2-022",
      "BT2-024",
      "BT2-027",
    ]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: breedingPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ulforce").isSuspended && s.state.pendingDecision === undefined);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("ulforce").isSuspended && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(1);
    expect(s.perm("stackedOpponent").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
