import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-065.js";

describe("BT2-065 WarGreymon", () => {
  it("has Blocker and Reboot and may redirect an opponent's attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT2-065", as: "warGreymon" }],
        security: ["BT1-011"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("warGreymon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("warGreymon"), "Reboot")).toBe(true);

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
        blockerPermanentId: s.perm("warGreymon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.perm("warGreymon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("may decline to block", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT2-065", as: "warGreymon" }],
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

    expect(s.perm("warGreymon").isSuspended).toBe(false);
  });

  it("Reboot unsuspends it during the opponent's unsuspend phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-065", as: "warGreymon", suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    const unsuspendedIds = await (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase(1);

    expect(s.perm("warGreymon").isSuspended).toBe(false);
    expect(unsuspendedIds).toContain(s.perm("warGreymon").permanentId);
  });
});
