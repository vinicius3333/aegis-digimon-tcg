import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-071.js";
import "../index.js";

describe("BT15-071", () => {
  it("may trash a hand card to delete an opposing Digimon with 3000 DP or less and draws with SoC in stack", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { dp: { op: "lte", value: 3000 } } },
      cost: { kind: "trash" },
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Draw",
      amount: 1,
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
  });
  it("gains 1 memory once per turn after attacking when the opponent has memory", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "memoryAtLeast" } }],
    }));

  it("naturally pays the hand cost, deletes at 3000 DP, draws from a stacked SoC Tamer, and gains end-of-attack memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-071", as: "loogamon", under: ["BT14-087"] }],
          hand: [{ card: "BT1-009", as: "costCard" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-030", as: "target" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("loogamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("costCard").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("naturally pays the hand cost and still draws when no opposing Digimon can be deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-071", as: "loogamon", under: ["BT14-087"] }],
          hand: [{ card: "BT1-009", as: "costCard" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("loogamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("costCard").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("gains end-of-attack memory once per turn and resets after the next real owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-114", as: "loogamon", under: ["BT15-071", "BT1-017"] }],
          hand: [
            { card: "BT1-009", as: "costCard" },
            { card: "BT1-009", as: "secondCostCard" },
            { card: "BT1-009", as: "nextCostCard" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", suspended: true },
            { card: "BT1-009", as: "secondTarget", suspended: true },
            { card: "BT1-009", as: "nextTarget", suspended: true },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 4;
    await s.ready();
    const firstTargetId = s.perm("target").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    const nextTargetId = s.perm("nextTarget").permanentId;

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("loogamon").permanentId,
        target: { kind: "permanent", permanentId: firstTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === 0 && !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    await advance(s.engine).verb.unsuspend([s.perm("loogamon").permanentId]);
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("loogamon").permanentId,
        target: { kind: "permanent", permanentId: secondTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondTargetId),
    );
    expect(s.state.memory).toBe(-1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 4;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("loogamon").permanentId]);
    await advance(s.engine).verb.suspend([nextTargetId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("loogamon").permanentId,
        target: { kind: "permanent", permanentId: nextTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === 0 && !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
