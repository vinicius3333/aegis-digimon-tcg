import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-002 Puyoyomon", () => {
  it("trashes the bottom card under an opponent Digimon by paying a blue hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-009", as: "host", under: [{ card: "RB1-002" }] }],
          hand: ["RB1-011", "RB1-011"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "RB1-024", as: "target", suspended: true, under: ["RB1-017", "RB1-020", "RB1-017"] }],
          security: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 2);
    await settle();
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "RB1-011")).toHaveLength(1);
    expect(s.perm("target").stack).toHaveLength(2);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;

    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "RB1-011")).toHaveLength(2);
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("does not activate when the player declines the optional payment", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-005", as: "host", under: [{ card: "RB1-002" }] }], hand: ["RB1-011"] },
        1: { battleArea: [{ card: "RB1-024", as: "target", suspended: true, under: ["RB1-017"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("target").stack).toHaveLength(1);
  });
});
