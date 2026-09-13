import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-019.js";
import "../BT1/BT1-060.js";
import "./EX6-020.js";

describe("EX6-019 Angemon", () => {
  it("has Barrier and inherits once-per-turn conditional draw", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Barrier");
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "selfHasTrait" } }],
    });
  });

  it("exposes Barrier on top and draws when an Angel-trait host attacks", async () => {
    const top = setupEngine({ 0: { battleArea: [{ card: "EX6-019", as: "angemon" }] } });
    await top.ready();
    expect(observe(top.engine).hasKeyword(top.perm("angemon"), "Barrier")).toBe(true);

    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["EX6-016", "EX6-019"] }],
        deck: [{ card: "BT1-009", as: "drawn" }, { card: "BT1-010", as: "nextDraw" }, ...Array(8).fill("BT1-011")],
      },
      1: { deck: Array(10).fill("BT1-010"), security: Array(6).fill("BT1-010") },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(false);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const deckBeforeAttack = s.state.players[0]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 5 &&
        s.state.players[0]!.deck.length === deckBeforeAttack - 1 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    const deckAfterFirst = s.state.players[0]!.deck.length;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 4 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.deck).toHaveLength(deckAfterFirst);
    expect(s.state.players[1]!.security).toHaveLength(4);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const deckBeforeResetAttack = s.state.players[0]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.deck).toHaveLength(deckBeforeResetAttack - 1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-010");
    await advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("does not draw from the inherited effect on a non-Angel host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-058", as: "host", under: ["EX6-016", "EX6-019"] }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...Array(9).fill("BT1-010")],
      },
      1: { deck: Array(10).fill("BT1-010"), security: Array(5).fill("BT1-010") },
    });
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 4 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(4);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
