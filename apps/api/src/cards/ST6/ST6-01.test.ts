import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST6-01.js";

describe("ST6-01 Pagumon", () => {
  it("trashes the top 2 cards when its host is deleted", async () => {
    const s = setupEngine({
      0: {
        deck: ["ST6-03", "ST6-04"],
        battleArea: [{ card: "ST6-03", as: "host", under: ["ST6-01"], suspended: true }],
      },
      1: { battleArea: [{ card: "ST6-13", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(4);
    expect(s.state.gameOver).toBe(false);
  });
});

describe("ST6-01 Pagumon — KB Q&A rulings", () => {
  it("does not lose when its effect empties the deck, only at the next draw phase with 0 cards (Q670)", async () => {
    const s = setupEngine({
      0: {
        deck: ["ST6-03", "ST6-04"],
        battleArea: [{ card: "ST6-03", as: "host", under: ["ST6-01"], suspended: true }],
        security: ["ST6-02"],
      },
      1: { battleArea: [{ card: "ST6-13", as: "attacker" }], deck: ["ST6-02", "ST6-02"], security: ["ST6-02"] },
    });
    s.state.isFirstPlayersFirstTurn = false;
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.gameOver).toBe(false);
    expect(s.state.turnSeat).toBe(1);

    advance(s.engine).endMainPhaseIfOpen(1);
    await loop;

    expect(s.state.gameOver).toBe(true);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe(Phase.Draw);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "gameOver", reason: "deckOut", result: { outcome: "win", winnerSeat: 1 } }),
    );
  });
});
