import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-014 Thetismon", () => {
  it("pays blue cards and trashes cards under an opponent stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-013", as: "base" }],
          hand: [{ card: "RB1-014", as: "thetismon" }, "RB1-011", "RB1-013"],
        },
        1: {
          battleArea: [
            { card: "RB1-024", as: "stacked", under: ["RB1-017", "RB1-020"] },
            { card: "EX2-045", as: "empty" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("thetismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stacked").stack.length === 0);

    expect(s.state.players[0]!.trash.filter((card) => ["RB1-011", "RB1-013"].includes(card.cardId))).toHaveLength(2);
    expect(s.perm("stacked").stack).toHaveLength(0);
    expect(
      [s.perm("stacked"), s.perm("empty")].some((permanent) => observe(s.engine).hasRestriction(permanent, "suspend")),
    ).toBe(true);
  });

  it("leaves cards untouched when no blue payment cards are available", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-013", as: "base" }], hand: [{ card: "RB1-014", as: "thetismon" }] },
        1: { battleArea: [{ card: "RB1-024", as: "stacked", under: ["RB1-017"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("thetismon").instanceId,
      }),
    ).toEqual({ ok: true });

    expect(s.perm("stacked").stack).toHaveLength(1);
  });

  it("returns three Jellymon-text cards from trash and unsuspends after its attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-016", as: "host", under: [{ card: "RB1-014" }] }],
          trash: ["RB1-011", "RB1-011", "RB1-011"],
        },
        1: { security: ["RB1-005", "RB1-005", "RB1-005"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const returnedIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => returnedIds.every((id) => s.state.players[0]!.deck.some((card) => card.instanceId === id)));
    expect(s.perm("host").isSuspended).toBe(false);
    expect(returnedIds.every((id) => s.state.players[0]!.deck.some((card) => card.instanceId === id))).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => returnedIds.includes(card.instanceId))).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not unsuspend after its attack when fewer than three Jellymon-text cards are in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-016", as: "host", under: [{ card: "RB1-014" }] }],
          trash: ["RB1-011", "RB1-011"],
        },
        1: { security: ["RB1-005", "RB1-005", "RB1-005"] },
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
    await settle();
    expect(s.perm("host").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("uses the inherited once-per-turn return cost once, then resets on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-016", as: "host", under: [{ card: "RB1-014" }] }],
          trash: ["RB1-011", "RB1-011", "RB1-011", "RB1-011", "RB1-011", "RB1-011"],
          deck: Array.from({ length: 10 }, () => "BT1-010"),
        },
        1: { security: Array.from({ length: 5 }, () => "BT1-010"), deck: Array.from({ length: 10 }, () => "BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "RB1-011").length === 3);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "RB1-011")).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = advance(s.engine).runTurn(1);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "RB1-011").length === 0);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
