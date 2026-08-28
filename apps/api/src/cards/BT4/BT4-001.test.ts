import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-001.js";

describe("BT4-001 Sakuttomon", () => {
  it("gains 1 memory when its level 7 host attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT3-019",
            as: "host",
            under: ["BT4-001", "BT4-008", "BT4-010", "BT4-014", "BT4-018"],
          },
        ],
      },
      1: { security: ["BT1-011"] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1, 5000);

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when its host is below level 7", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-018", as: "host", under: ["BT4-001", "BT4-008", "BT4-010", "BT4-014"] }],
      },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.memory).toBe(0);
  });

  it("gains memory only once when its level 7 host attacks twice in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT3-019",
            as: "host",
            under: ["BT4-001", "BT4-008", "BT4-010", "BT4-014", "BT4-018"],
          },
        ],
      },
      1: { security: ["BT1-010", "BT1-011"] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
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

    expect(s.state.memory).toBe(1);
  });
});
