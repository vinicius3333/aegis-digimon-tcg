import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-055.js";

describe("BT11-055 MetalTyrannomon", () => {
  it("maps the dual-color mega and all three executable clauses", () => {
    expect(getCardDefinition("BT11-055")).toMatchObject({
      cardId: "BT11-055",
      colors: ["Green", "Black"],
      level: 5,
      playCost: 8,
      dp: 8000,
    });
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnPlay" });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [{ kind: "SubTrigger", sourceFilter: { isSelfRef: true } }],
    });
  });

  it("Q2088: suspends per green/black Tamer but locks only one suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-088", "BT1-089"],
          hand: [{ card: "BT11-055", as: "metalTyrannomon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "alreadySuspended", suspended: true },
            { card: "BT1-029", as: "first" },
            { card: "BT1-030", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalTyrannomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("alreadySuspended"), "unsuspend"));

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("alreadySuspended"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("first"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("second"), "unsuspend")).toBe(false);
  });

  it("trashes security after its host wins a public battle, only once that turn and again next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-080", as: "host", under: ["BT11-055"] },
          { card: "BT1-013", as: "spareAttacker" },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "firstTarget", suspended: true },
          { card: "BT1-009", as: "secondTarget", suspended: true },
          { card: "BT1-009", as: "thirdTarget", suspended: true },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
        security: [
          { card: "BT1-009", as: "top" },
          { card: "BT1-009", as: "next" },
          { card: "BT1-009", as: "later" },
        ],
      },
    });
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    const thirdTargetId = s.perm("thirdTarget").permanentId;
    s.state.memory = 3;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: firstTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((p) => p.permanentId !== firstTargetId));
    await settle(() => s.state.players[1]!.trash.length === 2);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstTarget").instanceId, s.inst("top").instanceId]),
    );
    expect(s.state.players[1]!.trash).toHaveLength(2);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("next").instanceId,
      s.inst("later").instanceId,
    ]);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await settle(() => s.state.players[1]!.trash.length === 2);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: secondTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 3);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("firstTarget").instanceId,
        s.inst("top").instanceId,
        s.inst("secondTarget").instanceId,
      ]),
    );
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.battleArea.every((p) => p.permanentId !== secondTargetId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.suspend([thirdTargetId]);
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
        target: { kind: "permanent", permanentId: thirdTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("firstTarget").instanceId,
        s.inst("top").instanceId,
        s.inst("secondTarget").instanceId,
        s.inst("thirdTarget").instanceId,
        s.inst("next").instanceId,
      ]),
    );
    expect(s.state.players[1]!.trash).toHaveLength(5);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
