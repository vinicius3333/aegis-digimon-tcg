import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-085.js";
import "./BT4-047.js";

describe("BT4-047 Rasielmon", () => {
  it("recovers 2 cards from the deck when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-046", as: "base" }],
        hand: [{ card: "BT4-047", as: "rasiel" }],
        deck: ["BT1-001", "BT1-002", "BT1-003"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rasiel").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("trashes the top security card at the end of the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-047" }],
        security: [{ card: "BT1-001", as: "top" }, "BT1-002"],
        deck: ["BT1-009"],
      },
      1: { deck: ["BT1-009"], hand: ["BT1-010"] },
    });
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as any).mainPhase as { isOpen: boolean };
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
  });

  it("trashes one security card for each Rasielmon copy", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT4-047", as: "rasielA" },
          { card: "BT4-047", as: "rasielB" },
        ],
        security: [{ card: "BT1-001", as: "top" }, { card: "BT1-002", as: "next" }, "BT1-003"],
        deck: ["BT1-009"],
      },
      1: { deck: ["BT1-009"], hand: ["BT1-010"] },
    });
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as any).mainPhase as { isOpen: boolean };
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("top").instanceId, s.inst("next").instanceId]),
    );
  });
});

describe("BT4-047 Rasielmon — KB Q&A rulings", () => {
  const OPPONENT_ATTACKER = "BT1-019";

  const runOpponentTurn = async (s: ReturnType<typeof setupEngine>, duringMain?: () => Promise<void>) => {
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as any).mainPhase as { isOpen: boolean };
    await settle(() => mainPhase.isOpen);
    await duringMain?.();
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
  };

  it("does not make you lose when your security is empty at the end of the opponent's turn (Q1206)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-047" }], deck: ["BT1-009"] },
      1: { deck: ["BT1-009"], hand: ["BT1-010"] },
    });
    await runOpponentTurn(s);

    expect(s.events.some((event) => event.kind === "turnEnded" && event.endingSeat === 1)).toBe(true);
    expect(s.events.some((event) => event.kind === "gameOver")).toBe(false);
    expect(s.state.winnerSeat).toBe(-1);

    const attacked = setupEngine({
      0: { battleArea: [{ card: "BT4-047" }], deck: ["BT1-009"] },
      1: { battleArea: [{ card: OPPONENT_ATTACKER, as: "attacker" }], deck: ["BT1-009"] },
    });
    attacked.state.turnSeat = 1;
    expect(
      attacked.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacked.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => attacked.events.some((event) => event.kind === "gameOver"));
    expect(attacked.state.winnerSeat).toBe(1);
  });

  it("does not activate [Security] effects of the security cards it trashes (Q1207)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-047" }],
          security: [{ card: "BT1-085", as: "checkedTamer" }, { card: "BT1-085", as: "trashedTamer" }, "BT1-009"],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: OPPONENT_ATTACKER, as: "attacker" }], deck: ["BT1-009"], hand: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tamerOnField = (alias: string) =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst(alias).instanceId);

    await runOpponentTurn(s, async () => {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => tamerOnField("checkedTamer") && !(s.engine as any).combat.isAttacking);
    });

    expect(tamerOnField("checkedTamer")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashedTamer").instanceId);
    expect(tamerOnField("trashedTamer")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("trashes one security card per Rasielmon when you have multiple copies (Q1208)", async () => {
    const setupWithCopies = (copies: number) =>
      setupEngine({
        0: {
          battleArea: Array.from({ length: copies }, () => "BT4-047"),
          security: ["BT1-009", "BT1-010", "BT1-012"],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-009"], hand: ["BT1-010"] },
      });

    const twoCopies = setupWithCopies(2);
    await runOpponentTurn(twoCopies);
    expect(twoCopies.state.players[0]!.security).toHaveLength(1);
    expect(twoCopies.state.players[0]!.trash).toHaveLength(2);

    const oneCopy = setupWithCopies(1);
    await runOpponentTurn(oneCopy);
    expect(oneCopy.state.players[0]!.security).toHaveLength(2);
  });
});
