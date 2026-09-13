import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST17-12.js";

describe("ST17-12 Giant Missile", () => {
  it("suspends and bottoms one opposing Digimon, then restricts the remaining Digimon from unsuspending", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-03" }], hand: [{ card: "ST17-12", as: "missile" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "bottomed", suspended: true },
          { card: "BT1-010", as: "restricted" },
        ],
      },
    });
    await s.ready();
    s.state.memory = 10;
    const opponentDeckSize = s.state.players[1]!.deck.length;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("missile").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("restricted").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("bottomed").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.deck.length > opponentDeckSize &&
        s.state.players[1]!.battleArea.length === 1 &&
        observe(s.engine).isRestricted(s.perm("restricted"), "unsuspend"),
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-010");
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "unsuspend")).toBe(true);
  });

  it("activates its Main effect from Security during a real attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST17-03" }], security: [{ card: "ST17-12", as: "missile" }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: ["BT1-010", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("missile").instanceId),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("missile").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === attackerId)).toBe(false);
    expect(s.state.players[1]!.deck.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves with no opposing Digimon without opening a decision", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-03" }],
          hand: [{ card: "ST17-12", as: "missile" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: false },
    );
    await s.ready();
    s.state.memory = 10;
    const optionId = s.inst("missile").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId, useAs: "option" } as never)).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined && s.state.players[0]!.trash.some((card) => card.instanceId === optionId),
    );
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("expires the unsuspend restriction after the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST17-03" }], hand: [{ card: "ST17-12", as: "missile" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "restricted" },
            { card: "BT1-010", as: "bottomed", suspended: true },
          ],
          hand: ["BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("missile").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("restricted").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("bottomed").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision === undefined && observe(s.engine).isRestricted(s.perm("restricted"), "unsuspend"),
    );
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "unsuspend")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    s.state.memory = 3;
    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "unsuspend")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "unsuspend")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
