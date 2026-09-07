import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "./testkit/harness.js";
import { internalsOf } from "./testkit/internals.js";
import { advance } from "./testkit/advance.js";

describe("Main action readiness boundary", () => {
  // Once the turn is genuinely the player's, an open timing window does NOT refuse a main
  // verb: the engine serializes verbs on its own main-verb chain, so the play is accepted and
  // completes. Only the start-of-main readiness window (below) refuses outright.
  it("accepts a public play while a timing window is active and completes it", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-009"], hand: [{ card: "BT1-009", as: "option" }] },
      1: { deck: ["BT1-009"], security: 3 },
    });
    await s.ready();
    const internals = internalsOf(s.engine);
    const outermost = internals.beginResolvingWindow();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    internals.endResolvingWindow(outermost);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("option").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("option").instanceId)).toBe(
      true,
    );
  });

  it("rejects play and endPhase during the real held start-main window", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-010"],
        battleArea: [{ card: "BT1-009", as: "host" }],
        hand: [{ card: "BT1-009", as: "play" }],
      },
      1: { deck: ["BT1-009", "BT1-010"], security: 3 },
    });
    await s.ready();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered = false;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "startOfYourMainPhase",
      sourcePermanentId: s.perm("host").permanentId,
      once: false,
      run: async () => {
        entered = true;
        await gate;
      },
      description: "test held start-main effect",
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => entered);
    expect(entered).toBe(true);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.pendingDecision).toBeUndefined();
    const hand = s.state.players[0]!.hand.length;
    const memory = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("play").instanceId })).toEqual({
      ok: false,
      reason: "wrong-phase",
    });
    expect(s.state.players[0]!.hand).toHaveLength(hand);
    expect(s.state.memory).toBe(memory);
    release();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("play").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("play").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("play").instanceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // A voluntary pass submitted during the held start-main window is DEFERRED, not refused.
  // The readiness invariant is that no main action takes effect before the turn is actually
  // handed to the player; the pass satisfies it by being replayed once entry finalizes.
  // Refusing it outright strands any client that passes as soon as Main appears to open,
  // which is exactly what the production turn drivers do.
  it("defers, rather than refuses, a pass during the real held start-main window", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-010"],
        battleArea: [{ card: "BT1-009", as: "host" }],
        hand: [{ card: "BT1-009", as: "play" }],
      },
      1: { deck: ["BT1-009", "BT1-010"], security: 3 },
    });
    await s.ready();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered = false;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "startOfYourMainPhase",
      sourcePermanentId: s.perm("host").permanentId,
      once: false,
      run: async () => {
        entered = true;
        await gate;
      },
      description: "test held start-main effect",
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => entered);
    expect(s.state.phase).toBe(Phase.Main);
    const hand = s.state.players[0]!.hand.length;
    const memory = s.state.memory;

    // Accepted, but it must not end the phase while the window is still held.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.players[0]!.hand).toHaveLength(hand);
    expect(s.state.memory).toBe(memory);

    // Releasing the held effect finalizes entry, which replays the deferred pass and hands
    // the turn over. (The loop then opens the opponent's own Main, so the turn seat — not the
    // phase — is what proves seat 0's Main actually ended.)
    release();
    await settle(() => s.state.turnSeat === 1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
