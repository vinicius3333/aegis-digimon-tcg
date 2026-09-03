import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-028.js";

describe("EX1-028 Angemon", () => {
  it("gives its host +1000 DP through the end of the opponent's turn with 3 security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["EX1-028"] }],
        security: ["BT1-001", "BT1-001", "BT1-001"],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 7000);
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("does not give the bonus with fewer than 3 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["EX1-028"] }],
        security: ["BT1-001", "BT1-001"],
      },
      1: { security: ["BT1-001"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("keeps the bonus through the opponent turn and expires at its end", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-060", as: "host", under: ["EX1-028"] }], security: ["BT1-001", "BT1-001", "BT1-001"] },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 7000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(7000);
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("does not apply the inherited bonus twice in one turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-060", as: "host", under: ["EX1-028"] }], security: ["BT1-001", "BT1-001", "BT1-001"] },
      1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
    });
    await s.ready();
    const attack = () => s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 7000);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("host").currentDP).toBe(7000);
  });
});
