import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-024 Lamortmon", () => {
  it("suspends an opponent Digimon when an Angoramon card is in its evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-022", as: "base", under: [{ card: "RB1-020" }] }],
          hand: [{ card: "RB1-024", as: "lamort" }],
        },
        1: { battleArea: [{ card: "EX2-045", as: "target" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lamort").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["RB1-020", "RB1-022"]);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("does not suspend when the evolution stack lacks Angoramon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-021", as: "base" }], hand: [{ card: "RB1-024", as: "lamort" }] },
      1: { battleArea: [{ card: "EX2-045", as: "target" }] },
    });

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lamort").instanceId,
      }),
    ).toEqual({ ok: true });

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("trashes the opponent security top when this inherited Digimon deletes in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "RB1-025", as: "host", under: [{ card: "RB1-020" }, { card: "RB1-024", as: "lamort" }] }],
      },
      1: { battleArea: [{ card: "EX2-045", as: "target", suspended: true }], security: ["BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.players[1]!.battleArea.length).toBe(0);
    expect(s.state.players[1]!.security.length).toBe(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("uses the inherited security trash once per turn and resets on the next owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "host", under: [{ card: "RB1-024" }] }],
          hand: ["BT1-010"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true },
            { card: "BT1-009", as: "second", suspended: true },
            { card: "BT1-009", as: "third" },
          ],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    const thirdId = s.perm("third").permanentId;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId));
    await settle();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: secondId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId));
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    expect(s.state.players[1]!.security).toHaveLength(2);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).verb.suspend([thirdId]);
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: thirdId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
