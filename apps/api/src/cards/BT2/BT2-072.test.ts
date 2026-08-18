import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-072.js";

describe("BT2-072 Vilemon", () => {
  it("has Blocker and loses 2 memory when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-072", as: "vilemon" }] },
      1: { security: ["BT1-010"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("vilemon"), "Blocker")).toBe(true);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("vilemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(1);
  });

  it("finishes the attack even when losing 2 memory crosses zero", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-072", as: "vilemon" }] },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("vilemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.memory === -1);

    expect(s.state.turnSeat).toBe(0);
    expect(s.state.memory).toBe(-1);
  });

  it("may block without losing memory because blocking is not attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT2-072", as: "vilemon" }],
        security: ["BT1-011"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("vilemon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.memory).toBe(3);
    expect(s.perm("vilemon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
