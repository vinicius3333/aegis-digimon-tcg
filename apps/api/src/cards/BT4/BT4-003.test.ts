import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-003.js";

describe("BT4-003 Koromon", () => {
  it("gives an opposing Digimon -1000 DP when its host attacks at 3 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-032", as: "host", under: ["BT4-003"] }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-019", as: "target" }],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === s.perm("target").baseDP - 1000, 5000);

    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 1000);
  });

  it("does not reduce DP while its controller has 4 security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-032", as: "host", under: ["BT4-003"] }],
        security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
      1: {
        battleArea: [{ card: "BT1-019", as: "target" }],
        security: ["BT1-011"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);
  });

  it("reduces DP only once when its host attacks twice in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-032", as: "host", under: ["BT4-003"] }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-019", as: "target" }],
          security: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === s.perm("target").baseDP - 1000);
    await settle(() => !observe(s.engine).isAttacking(), 5000);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 5000);

    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 1000);
  });
});
