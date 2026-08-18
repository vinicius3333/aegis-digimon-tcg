import { describe, it, expect } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import {
  GameState,
  PlayerState,
  PendingDecision,
  Phase,
  type Seat,
  type ServerEvent,
  type DecisionRequest,
} from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "./GameEngine.js";

/**
 * End-to-end routing of the intent-protocol-and-room verbs through
 * GameEngine.applyIntent: ready, surrender, endPhase, respondDecision, plus the
 * validation gates (turn/phase, open-decision). The board is built directly
 * (deck-and-setup is a separate subsystem) and the turn cursor placed in a seat's
 * Main phase where relevant.
 */

interface Harness {
  engine: GameEngine;
  state: GameState;
  events: ServerEvent[];
  decisions: Array<{ seat: Seat; req: DecisionRequest }>;
}

function setup(opts: { turnSeat?: Seat; phase?: Phase; memory?: number } = {}): Harness {
  const state = new GameState();
  state.phase = opts.phase ?? Phase.Main;
  state.turnSeat = opts.turnSeat ?? 0;
  state.memory = opts.memory ?? 5;
  state.players = new ArraySchema<PlayerState>();
  for (const seat of [0, 1] as const) {
    const p = new PlayerState();
    p.seat = seat;
    state.players[seat] = p;
  }

  const events: ServerEvent[] = [];
  const decisions: Array<{ seat: Seat; req: DecisionRequest }> = [];
  const hooks: GameEngineHooks = {
    seed: 1,
    emit: (event) => events.push(event),
    requestDecision: (seat, req) => decisions.push({ seat, req }),
  };
  return { engine: new GameEngine(state, hooks), state, events, decisions };
}

describe("applyIntent routing (intent-protocol-and-room)", () => {
  it("accepts a ready intent (lobby acknowledgement)", () => {
    const h = setup();
    expect(h.engine.applyIntent(0, { type: "ready" })).toEqual({ ok: true });
    expect(h.engine.applyIntent(1, { type: "ready" })).toEqual({ ok: true });
  });

  it("fires onBothReady only once, when the second seat sends ready", () => {
    const state = new GameState();
    state.players = new ArraySchema<PlayerState>();
    for (const seat of [0, 1] as const) {
      const p = new PlayerState();
      p.seat = seat;
      state.players[seat] = p;
    }
    let bothReadyCount = 0;
    const hooks: GameEngineHooks = {
      seed: 1,
      emit: () => {},
      requestDecision: () => {},
      onBothReady: () => bothReadyCount++,
    };
    const engine = new GameEngine(state, hooks);

    engine.applyIntent(0, { type: "ready" });
    expect(bothReadyCount).toBe(0);

    engine.applyIntent(1, { type: "ready" });
    expect(bothReadyCount).toBe(1);

    // Redundant readies (e.g. a reconnect resending it) do not re-fire it.
    engine.applyIntent(0, { type: "ready" });
    engine.applyIntent(1, { type: "ready" });
    expect(bothReadyCount).toBe(1);
  });

  it("surrender ends the game in the opponent's favour and emits gameOver", () => {
    const h = setup();
    const result = h.engine.applyIntent(1, { type: "surrender" });
    expect(result).toEqual({ ok: true });
    expect(h.state.gameOver).toBe(true);
    expect(h.state.winnerSeat).toBe(0);
    expect(h.state.players[1]?.lost).toBe(true);
    expect(h.events).toContainEqual({
      kind: "gameOver",
      result: { outcome: "win", winnerSeat: 0 },
      reason: "surrender",
    });
  });

  it("surrender is rejected once the game is already over", () => {
    const h = setup();
    h.engine.applyIntent(0, { type: "surrender" });
    expect(h.engine.applyIntent(1, { type: "surrender" })).toEqual({
      ok: false,
      reason: "illegal-target",
    });
  });

  it("endPhase from the non-turn seat is rejected (not-your-turn)", () => {
    const h = setup({ turnSeat: 0 });
    expect(h.engine.applyIntent(1, { type: "endPhase" })).toEqual({
      ok: false,
      reason: "not-your-turn",
    });
  });

  it("endPhase outside an open Main phase is rejected (wrong-phase)", () => {
    // The turn loop is not running, so no Main phase is open for the turn seat.
    const h = setup({ turnSeat: 0, phase: Phase.Main });
    expect(h.engine.applyIntent(0, { type: "endPhase" })).toEqual({
      ok: false,
      reason: "wrong-phase",
    });
  });

  it("respondDecision with no open decision is rejected", () => {
    const h = setup();
    expect(
      h.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: "dec-1",
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: false, reason: "decision-pending" });
  });

  it("while a decision is open, a turn verb is rejected with decision-pending", () => {
    const h = setup({ turnSeat: 0, phase: Phase.Main });
    // Simulate an effect having raised a decision (the wire gate keys off
    // state.pendingDecision, which the DecisionManager mirrors).
    const pending = new PendingDecision();
    pending.decisionId = "dec-1";
    pending.seat = 0;
    pending.kind = "optional";
    h.state.pendingDecision = pending;

    const result = h.engine.applyIntent(0, { type: "playCard", instanceId: "x" });
    expect(result).toEqual({ ok: false, reason: "decision-pending" });

    // endPhase is likewise gated while a decision is open.
    expect(h.engine.applyIntent(0, { type: "endPhase" })).toEqual({
      ok: false,
      reason: "decision-pending",
    });
  });

  it("a turn-restricted verb during another seat's turn is rejected", () => {
    const h = setup({ turnSeat: 0 });
    // playCard as seat 1 (not the turn player): rejected before any lookup.
    const result = h.engine.applyIntent(1, { type: "playCard", instanceId: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-your-turn");
  });

  it("activateEffect for an unknown source is rejected (card-not-in-zone)", () => {
    const h = setup({ turnSeat: 0, phase: Phase.Main });
    const result = h.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: "nope",
      effectKey: "x/y",
    });
    expect(result).toEqual({ ok: false, reason: "card-not-in-zone" });
  });

  it("a mulligan with no open mulligan window is rejected (decision-pending)", () => {
    const h = setup();
    expect(h.engine.applyIntent(0, { type: "mulligan", keep: true })).toEqual({
      ok: false,
      reason: "decision-pending",
    });
  });

  it("breeding verbs outside the breeding phase are rejected", () => {
    const h = setup({ turnSeat: 0, phase: Phase.Main });
    // wrong-phase reasons collapse onto the shared vocabulary; both are rejected.
    expect(h.engine.applyIntent(0, { type: "hatchEgg" }).ok).toBe(false);
    expect(
      h.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: "p" }).ok,
    ).toBe(false);
  });
});
