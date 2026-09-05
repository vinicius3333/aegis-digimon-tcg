import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-026.js";

describe("EX1-026 Gatomon", () => {
  it("gives an opposing Digimon -2000 DP on attack with 3 or more security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "host", under: ["BT1-006", "BT1-030", "EX1-026"] }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("does not modify a target when security is below three", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-057", as: "host", under: ["BT1-006", "BT1-030", "EX1-026"] }],
        security: ["BT1-001", "BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("modifies only once across two player attacks in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-057", as: "host", under: ["BT1-006", "BT1-030", "EX1-026"] }],
        hand: [{ card: "BT1-036", as: "unsuspender" }],
        security: ["BT1-001", "BT1-001", "BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-001", "BT1-001", "BT1-001"] },
    });
    s.state.memory = 10;
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("expires the modifier at the end of the attacking player's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "host", under: ["BT1-006", "BT1-030", "EX1-026"] }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
          hand: ["BT1-009"],
          deck: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
          hand: ["BT1-009"],
          deck: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
