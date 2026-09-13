import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-003.js";

describe("EX6-003 Cupimon", () => {
  it("returns one security card to hand and places an Angel excluding Fallen Angel as security", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            count: 1,
            filter: {
              kind: ["Digimon"],
              nameOrTrait: [{ match: "trait", tokens: ["Angel", "Archangel", "Three Great Angels"] }],
            },
          },
          from: ["hand"],
          toTop: false,
        },
      ],
    });
  });

  it("exchanges top security for an eligible Angel at security bottom when its host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-038", as: "host", under: ["EX6-003", "BT1-045"] }],
          hand: [
            { card: "BT1-053", as: "angel" },
            { card: "BT1-053", as: "secondAngel" },
          ],
          security: [{ card: "BT1-009", as: "securityTop" }],
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
    await settle(
      () => s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("angel").instanceId),
      600,
    );
    await settle(() => s.state.players[1]!.security.length === 4);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("securityTop").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: s.inst("angel").instanceId, faceUp: false });

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("angel").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("secondAngel").instanceId);

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
      s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("secondAngel").instanceId),
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("angel").instanceId);
    expect(s.state.players[0]!.security.at(-1)!.instanceId).toBe(s.inst("secondAngel").instanceId);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });

  it("does not place a non-Angel card when the optional exchange has no legal hand target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-038", as: "host", under: ["EX6-003", "BT1-045"] }],
          hand: [{ card: "BT1-009", as: "nonAngel" }],
          security: [{ card: "BT1-010", as: "securityTop" }],
        },
        1: { deck: Array(10).fill("BT1-009"), security: Array(3).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("securityTop").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("nonAngel").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
