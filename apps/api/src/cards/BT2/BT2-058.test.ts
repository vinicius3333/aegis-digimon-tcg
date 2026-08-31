import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-058.js";

describe("BT2-058 Guardromon", () => {
  it("has Blocker and may redirect an opponent's attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT2-058", as: "guardromon" }],
        security: ["BT1-011"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("guardromon"), "Blocker")).toBe(true);

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
        blockerPermanentId: s.perm("guardromon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.perm("guardromon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("may decline to block", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT2-058", as: "guardromon" }],
        security: ["BT1-011"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("guardromon").isSuspended).toBe(false);
  });

  it("cannot attack during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-058", as: "guardromon" }] },
      1: { security: ["BT1-010"] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).isRestricted(s.perm("guardromon"), "attack")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("guardromon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("can attack during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-058", as: "guardromon" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).isRestricted(s.perm("guardromon"), "attack")).toBe(false);
  });
});
