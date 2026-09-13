import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-017.js";
import "../BT1/BT1-060.js";
import "./EX6-020.js";

describe("EX6-017 Luxmon", () => {
  it("reveals three and adds up to Angel/Archangel and Three Great Angels cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    });
  });
  it("inherits once-per-turn draw when attacking with the required traits", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "selfHasTrait" } }],
    });
  });

  it("draws once when its Angel-family stack host attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["EX6-017", "EX6-020"] }],
        deck: [{ card: "BT1-009", as: "drawn" }, { card: "BT1-010", as: "nextDraw" }, ...Array(8).fill("BT1-011")],
      },
      1: { deck: Array(10).fill("BT1-010"), security: Array(6).fill("BT1-010") },
    });
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const deckBefore = s.state.players[0]!.deck.length;
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
        s.state.players[0]!.deck.length === deckBefore - 1 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.players[1]!.security).toHaveLength(5);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    const deckAfterFirst = s.state.players[0]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 4 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.deck).toHaveLength(deckAfterFirst);
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
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
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

  it("does not draw from the inherited effect when the host lacks the required trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX6-020", as: "host", under: ["EX6-017"] }],
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
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(4);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("publicly resolves both reveal buckets and bottoms the remaining card", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX6-017", as: "lux" }], deck: ["EX6-019", "EX6-027", "BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lux").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lux").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX6-019", "EX6-027"]));
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.deck[0]!.cardId).toBe("BT1-009");
  });

  it("adds the only matching reveal bucket and bottoms both unmatched cards", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX6-017", as: "lux" }], deck: [{ card: "EX6-019", as: "angel" }, "BT1-009", "BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lux").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("angel").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX6-019")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });
});
