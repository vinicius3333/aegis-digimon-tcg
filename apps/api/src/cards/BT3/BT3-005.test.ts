import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-005.js";

describe("BT3-005 Kakkinmon", () => {
  it("gains 1 memory when its level 7 host attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT9-111",
            as: "host",
            under: ["BT3-005", "BT3-059", "BT3-064", "BT3-068", "BT3-075"],
          },
        ],
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
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when its host is below level 7", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT3-075",
            as: "host",
            under: ["BT3-005", "BT3-059", "BT3-064", "BT3-068"],
          },
        ],
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
        deck: ["BT1-013", "BT1-014", "BT1-015"],
        hand: ["BT1-009"],
        battleArea: [
          {
            card: "BT9-111",
            as: "host",
            under: ["BT3-005", "BT3-059", "BT3-064", "BT3-068", "BT3-075"],
          },
        ],
      },
      1: { security: ["BT1-010", "BT1-011", "BT1-012"], deck: ["BT1-013", "BT1-014", "BT1-015"] },
    });
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 6);
    await settle(() => !observe(s.engine).isAttacking(), 5000);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1, 5000);
    expect(s.state.memory).toBe(6);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 6, 5000);
    expect(s.state.memory).toBe(6);
  });
});
