import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-082.js";

describe("BT1-082 Rosemon", () => {
  it("rejects play when memory is below the cost floor", () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-082", as: "rosemon" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rosemon").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("suspends an opposing Digimon when another opposing Digimon attacks the player while Rosemon is suspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-082", as: "rosemon", suspended: true }], security: ["BT1-010"] },
        1: {
          battleArea: [
            { card: "BT1-016", as: "attacker" },
            { card: "BT1-017", as: "target" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("allows Rosemon's controller to choose an opposing Digimon with Blocker (Q936)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-082", as: "rosemon", suspended: true }], security: ["BT1-010"] },
      1: {
        battleArea: [
          { card: "BT1-016", as: "attacker" },
          { card: "BT1-072", as: "blocker" },
        ],
      },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("blocker").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blocker").isSuspended);

    expect(s.perm("blocker").isSuspended).toBe(true);
  });

  it("activates if Rosemon becomes suspended before activation (Q937)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-082", as: "rosemon" }], security: ["BT1-010"] },
        1: {
          battleArea: [
            { card: "BT1-016", as: "attacker" },
            { card: "BT1-017", as: "target" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.turnSeat = 1;
    await advance(s.engine).verb.suspend([s.perm("rosemon").permanentId], 1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not activate if Rosemon becomes unsuspended before activation (Q938)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-082", as: "rosemon", suspended: true }], security: ["BT1-010"] },
        1: {
          battleArea: [
            { card: "BT1-016", as: "attacker" },
            { card: "BT1-017", as: "target" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).verb.unsuspend([s.perm("rosemon").permanentId]);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("does not activate when the attack targets a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-082", as: "rosemon", suspended: true },
            { card: "BT1-010", as: "defender", suspended: true },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-016", as: "attacker" },
            { card: "BT1-017", as: "target" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const defenderId = s.perm("defender").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== defenderId));

    expect(s.perm("target").isSuspended).toBe(false);
  });
});
