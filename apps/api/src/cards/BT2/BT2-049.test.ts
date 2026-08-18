import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-049.js";

describe("BT2-049 Puppetmon", () => {
  it("Q1019-Q1021 suspends one Digimon, then only opposing Digimon stay suspended next unsuspend phase", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT2-049", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-070", as: "chosen" },
            { card: "BT2-044", as: "alreadySuspended", suspended: true },
            { card: "BT2-043", as: "alreadyReady" },
            { card: "BT1-085", as: "tamer", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("chosen").isSuspended &&
        observe(s.engine).isRestricted(s.perm("chosen"), "unsuspend") &&
        observe(s.engine).isRestricted(s.perm("alreadySuspended"), "unsuspend"),
    );

    const unsuspend = (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase.bind(s.engine);
    const unsuspendedIds = await unsuspend(1);

    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("alreadySuspended").isSuspended).toBe(true);
    expect(s.perm("alreadyReady").isSuspended).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(unsuspendedIds).toContain(s.perm("tamer").permanentId);
    expect(unsuspendedIds).not.toContain(s.perm("chosen").permanentId);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(false);
  });

  it("gains 1 memory when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-049", as: "puppetmon" }] },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("puppetmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });
});
