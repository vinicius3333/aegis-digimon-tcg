import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-032.js";
import "./EX6-033.js";
import "../BT1/BT1-062.js";

describe("EX6-032 Lopmon", () => {
  it("suspends one Digimon on play and inherits once-per-turn -2000 DP on attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Suspend",
      optional: true,
      target: { count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    });
  });

  it("publicly suspends an opposing Digimon when played", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-032", as: "lopmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("opponent").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("lopmon") !== undefined && s.state.pendingDecision === undefined);
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("can suspend a friendly Digimon because the target is not opponent-scoped", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "ally" }],
          hand: [{ card: "EX6-032", as: "lopmon" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("ally").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("lopmon") !== undefined && s.state.pendingDecision === undefined);
    expect(s.perm("ally").isSuspended).toBe(true);
  });

  it("publicly reduces an opposing Digimon by 2000 from its inherited attack effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX6-033", as: "host", under: ["EX6-032"] }], deck: Array(10).fill("BT1-009") },
      1: {
        battleArea: [{ card: "EX6-031", as: "opponent" }],
        security: Array(5).fill("BT1-009"),
        deck: Array(10).fill("BT1-009"),
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const before = s.perm("opponent").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("opponent").currentDP === before - 2000);
    expect(s.perm("opponent").currentDP).toBe(before - 2000);
  });

  it("resolves its inherited attack reduction only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-033", as: "host", under: ["EX6-032"] }],
          hand: ["BT1-009"],
          deck: Array(10).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-062", as: "first", dp: 15000 },
            { card: "BT1-062", as: "second", dp: 15000 },
          ],
          security: Array(5).fill("BT1-009"),
          deck: Array(10).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    preferred.push(s.inst("first").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.security.length === 4 &&
        s.perm("first").currentDP === 13000 &&
        s.state.pendingDecision === undefined,
    );
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.security.length === 3 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("first").currentDP).toBe(13000);
    expect(s.perm("second").currentDP).toBe(15000);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    preferred.length = 0;
    preferred.push(s.inst("second").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.security.length === 2 &&
        s.perm("second").currentDP === 13000 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("second").currentDP).toBe(13000);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });

  it("expires the inherited attack reduction at the end of the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX6-033", as: "host", under: ["EX6-032"] }],
        hand: ["BT1-009"],
        deck: Array(10).fill("BT1-009"),
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "opponent", dp: 15000 }],
        security: Array(5).fill("BT1-009"),
        deck: Array(10).fill("BT1-009"),
      },
    });
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const before = s.perm("opponent").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("opponent").currentDP).toBe(before - 2000);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    expect(s.perm("opponent").currentDP).toBe(before);
  });
});
