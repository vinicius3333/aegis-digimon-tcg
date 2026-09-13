import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST17-01.js";

describe("ST17-01 Gummymon [When Attacking]", () => {
  it("draws once when its host attacks while its owner has a green Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-02", as: "host", dp: 20000, under: ["ST17-01"] },
            { card: "ST17-10", as: "henry" },
          ],
          deck: ["ST17-03", "ST17-04"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;
    const handBefore = player.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.hand.length === handBefore + 1 && s.state.players[1]!.security.length === 0);

    expect(player.hand.length).toBe(handBefore + 1);
    expect(player.deck.length).toBe(1);
  });

  it("does not draw when the owner has no green Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST17-02", as: "host", dp: 20000, under: ["ST17-01"] }],
        deck: ["ST17-03"],
      },
      1: { security: ["BT1-009"] },
    });
    const player = s.state.players[0]!;
    const handBefore = player.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(player.hand.length).toBe(handBefore);
    expect(player.deck).toHaveLength(1);
  });

  it("fires once per turn, then resets on its owner's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-02", as: "host", dp: 20000, under: ["ST17-01"] },
            { card: "ST17-10", as: "henry" },
          ],
          deck: ["ST17-03", "ST17-04", "ST17-05", "ST17-07", "ST17-08", "ST17-09", "ST17-10", "ST17-11"],
        },
        1: {
          hand: [{ card: "BT1-009" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const host = s.perm("host").permanentId;
    const player = s.state.players[0]!;
    const firstMainHand = player.hand.length;
    const firstMainDeck = player.deck.length;

    const attack = () =>
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host, target: { kind: "player" } });
    expect(attack()).toEqual({ ok: true });
    await settle(
      () =>
        player.hand.length === firstMainHand + 1 &&
        player.deck.length === firstMainDeck - 1 &&
        s.state.players[1]!.security.length === 2 &&
        !observe(s.engine).isAttacking(),
    );
    await advance(s.engine).verb.unsuspend([host]);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(player.hand).toHaveLength(firstMainHand + 1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.memory = -s.state.memory;
    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.memory = -s.state.memory;
    s.state.turnSeat = 0;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const nextMainHand = player.hand.length;
    const nextMainDeck = player.deck.length;
    await advance(s.engine).verb.unsuspend([host]);
    expect(attack()).toEqual({ ok: true });
    await settle(
      () =>
        player.hand.length === nextMainHand + 1 &&
        player.deck.length === nextMainDeck - 1 &&
        !observe(s.engine).isAttacking(),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
    expect(player.hand).toHaveLength(nextMainHand + 1);
  });
});
