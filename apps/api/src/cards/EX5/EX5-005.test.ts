import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-005.js";
import "../index.js";

describe("EX5-005 Tokomon", () => {
  it("matches the catalog and encodes the inherited opponent-turn deletion draw", () => {
    expect(getCardDefinition("EX5-005")).toMatchObject({
      cardId: "EX5-005",
      nameEn: "Tokomon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      dp: 0,
      inheritedEffectText: "[On Deletion] If it's your opponent's turn, ＜Draw 1＞ (Draw 1 card from your deck).",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: { kind: "isOpponentsTurn", raw: "it's your opponent's turn" },
        },
      ],
    });
  });

  it("draws after public battle deletion on the opponent's turn, but not on its own turn", async () => {
    const opponentTurn = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-005"], suspended: true }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "attacker" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await opponentTurn.ready();
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = 10;
    const opponentLoop = opponentTurn.engine.runOneTurn();
    await advance(opponentTurn.engine).waitForMainPhase(1);
    expect(
      opponentTurn.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: opponentTurn.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: opponentTurn.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => opponentTurn.state.players[0]!.battleArea.length === 0);
    expect(opponentTurn.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      opponentTurn.inst("drawn").instanceId,
    ]);
    expect(opponentTurn.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX5-005", "BT1-009"]);
    expect(opponentTurn.state.pendingDecision).toBeUndefined();
    expect(observe(opponentTurn.engine).isAttacking()).toBe(false);
    advance(opponentTurn.engine).endMainPhaseIfOpen(1);
    await opponentLoop;

    const ownTurn = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-005"] }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "target", suspended: true }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await ownTurn.ready();
    ownTurn.state.memory = 10;
    const ownLoop = ownTurn.engine.runOneTurn();
    await advance(ownTurn.engine).waitForMainPhase(0);
    expect(
      ownTurn.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ownTurn.perm("host").permanentId,
        target: { kind: "permanent", permanentId: ownTurn.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => ownTurn.state.players[0]!.battleArea.length === 0);
    expect(ownTurn.state.players[0]!.hand).toHaveLength(0);
    expect(ownTurn.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX5-005", "BT1-009"]);
    expect(ownTurn.state.pendingDecision).toBeUndefined();
    expect(observe(ownTurn.engine).isAttacking()).toBe(false);
    advance(ownTurn.engine).endMainPhaseIfOpen(0);
    await ownLoop;
  });

  it("keeps the inherited draw through a legal evolution stack and opponent battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-005"] }],
          hand: [{ card: "BT1-014", as: "evolution" }],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "attacker" }],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const ownLoop = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-014");
    expect(s.perm("host").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-005", "BT1-009"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.perm("host").currentDP).toBe(4000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownLoop;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentLoop = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentLoop;
  });

  it("rejects an evolution whose source level does not match the legal route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-005"] }],
        hand: [{ card: "BT1-013", as: "invalid" }],
      },
    });
    await s.ready();
    s.state.memory = 5;
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("invalid").instanceId,
    });
    expect(result.ok).toBe(false);
    expect(s.perm("host").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-005"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
