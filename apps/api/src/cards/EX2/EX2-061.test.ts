import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-061.js";

describe("EX2-061 Henry Wong", () => {
  it("may suspend to suspend an opponent when Gargomon or Rapidmon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-027", as: "attacker" },
            { card: "EX2-061", as: "henry" },
          ],
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("henry").isSuspended && s.perm("target").isSuspended);
    expect(s.perm("henry").isSuspended).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("sets memory at Start of Your Turn only at 2 or less", async () => {
    const eligible = setupEngine({
      0: { battleArea: [{ card: "EX2-061", as: "henry" }], deck: ["BT1-001"], security: ["BT1-002"] },
    });
    eligible.state.memory = 2;
    await eligible.ready();
    const eligibleTurn = eligible.engine.runOneTurn();
    await advance(eligible.engine).waitForMainPhase(0);
    expect(eligible.state.memory).toBe(3);
    advance(eligible.engine).endMainPhaseIfOpen(0);
    await eligibleTurn;

    const boundary = setupEngine({
      0: { battleArea: [{ card: "EX2-061", as: "henry" }], deck: ["BT1-001"], security: ["BT1-002"] },
    });
    boundary.state.memory = 3;
    await boundary.ready();
    const boundaryTurn = boundary.engine.runOneTurn();
    await advance(boundary.engine).waitForMainPhase(0);
    expect(boundary.state.memory).toBe(3);
    advance(boundary.engine).endMainPhaseIfOpen(0);
    await boundaryTurn;
  });

  it("keeps Henry and the target unchanged when the suspension is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-027", as: "attacker" },
            { card: "EX2-061", as: "henry" },
          ],
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }], security: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("henry").isSuspended).toBe(false);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("plays EX2-061 from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], security: ["BT1-001"] },
      1: { security: [{ card: "EX2-061", as: "securityHenry" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityHenry").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityHenry").instanceId),
    ).toBe(true);
  });
});
