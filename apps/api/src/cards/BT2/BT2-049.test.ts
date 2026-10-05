import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT2-049.js";

describe("BT2-049 Puppetmon", () => {
  it("uses the exact next-opponent-unsuspend-phase duration", () => {
    expect(runtimeCompiledCard("BT2-049")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnPlay",
          actions: expect.arrayContaining([
            expect.objectContaining({ kind: "Suspend" }),
            expect.objectContaining({
              kind: "Restrict",
              restriction: "unsuspendDuringOwnUnsuspendPhase",
              duration: "untilOpponentNextUnsuspendPhase",
            }),
          ]),
        }),
      ]),
    });
  });

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
        observe(s.engine).isRestricted(s.perm("chosen"), "unsuspendDuringOwnUnsuspendPhase") &&
        observe(s.engine).isRestricted(s.perm("alreadySuspended"), "unsuspendDuringOwnUnsuspendPhase"),
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
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
  });

  it("CR 15-11-2-2: also keeps an opposing Digimon that entered after On Play suspended", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT2-049", as: "source" }] },
        1: { battleArea: [{ card: "BT1-070", as: "chosen" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("chosen").isSuspended && s.state.pendingDecision === undefined);
    const late = s.putOnBoard(1, { card: "BT2-044", suspended: true });

    const unsuspend = (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase.bind(s.engine);
    await unsuspend(1);

    expect(late.isSuspended).toBe(true);
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

describe("BT2-049 Puppetmon — KB Q&A rulings", () => {
  it("does not suspend the opponent's unsuspended Digimon during their next unsuspend phase (Q1020)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT2-049", as: "puppetmon" }] },
        1: {
          battleArea: [
            { card: "BT1-070", as: "suspendedByPuppetmon" },
            { card: "BT2-043", as: "leftUnsuspended" },
            { card: "BT1-085", as: "unsuspendPhaseWitness", suspended: true },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("suspendedByPuppetmon").permanentId);
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("puppetmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("suspendedByPuppetmon").isSuspended &&
        observe(s.engine).isRestricted(s.perm("leftUnsuspended"), "unsuspendDuringOwnUnsuspendPhase"),
    );
    expect(s.perm("leftUnsuspended").isSuspended).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    expect(s.perm("suspendedByPuppetmon").isSuspended).toBe(true);
    expect(s.perm("leftUnsuspended").isSuspended).toBe(false);
    expect(s.perm("unsuspendPhaseWitness").isSuspended).toBe(false);
  });
});
