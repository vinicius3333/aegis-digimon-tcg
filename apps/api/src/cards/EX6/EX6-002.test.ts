import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-002.js";

describe("EX6-002 Yokomon", () => {
  it("inherits a once-per-turn attack cost to place a blue level 3 Digimon from hand under this Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlaceUnder",
          optional: true,
          position: "bottom",
          underFilter: { isSelfRef: true },
          target: {
            count: 1,
            from: ["hand"],
            filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"], levels: [3] },
          },
        },
      ],
    });
  });

  it("places exactly one eligible blue level 3 at the bottom of its host on attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-040", as: "host", under: ["EX6-002", "BT12-021"] }],
          hand: [
            { card: "BT12-021", as: "blueLevel3" },
            { card: "BT12-021", as: "secondBlueLevel3" },
            { card: "BT12-021", as: "thirdBlueLevel3" },
          ],
          deck: Array(10).fill("BT1-009"),
        },
        1: { deck: Array(10).fill("BT1-009"), security: Array(5).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
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
    await settle(() => s.state.players[1]!.security.length === 4);
    await settle(
      () => s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("blueLevel3").instanceId),
      600,
    );

    // EX6-007's own [Your Turn] watcher may draw after the successful placement, so
    // prove the selected card moved rather than asserting an incidental hand size.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("blueLevel3").instanceId);
    expect(s.perm("host").stack[0]!.instanceId).toBe(s.inst("blueLevel3").instanceId);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT12-021", "EX6-002", "BT12-021"]);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);
    expect(s.perm("host").stack).toHaveLength(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("secondBlueLevel3").instanceId,
    );

    await advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settle(() =>
      s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("secondBlueLevel3").instanceId),
    );
    expect(s.perm("host").stack).toHaveLength(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("thirdBlueLevel3").instanceId,
    );
    await advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });

  it("may decline and cannot select a non-blue level 3", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-040", as: "host", under: ["EX6-002", "BT12-021"] }],
          hand: [{ card: "BT12-021", as: "blueLevel3" }],
        },
        1: { deck: Array(10).fill("BT1-009"), security: Array(3).fill("BT1-009") },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: declined.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.players[1]!.security.length === 2);
    expect(declined.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      declined.inst("blueLevel3").instanceId,
    );

    const wrongColor = setupEngine({
      0: {
        battleArea: [{ card: "BT13-040", as: "host", under: ["EX6-002", "BT12-021"] }],
        hand: [{ card: "BT1-009", as: "redLevel3" }],
      },
      1: { deck: Array(10).fill("BT1-009"), security: Array(3).fill("BT1-009") },
    });
    await wrongColor.ready();
    expect(
      wrongColor.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: wrongColor.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => wrongColor.state.players[1]!.security.length === 2);
    expect(wrongColor.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      wrongColor.inst("redLevel3").instanceId,
    );
  });
});
