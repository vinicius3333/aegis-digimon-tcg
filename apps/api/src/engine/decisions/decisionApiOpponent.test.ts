import { describe, it, expect } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import { GameState, PlayerState, type DecisionRequest, type Seat } from "@aegis/shared";
import { DecisionManager, type DecisionTransport } from "./index.js";
import { createDecisionApi, requireOpponentAsk } from "./decisionApi.js";
import type { EffectContext } from "../effects/EffectContext.js";

/**
 * Proves the 7th BT26-engine-gaps fix: the decision API can address the effect's
 * NON-controlling seat, and the routing that makes that safe end to end —
 * `DecisionManager` unicasts to (and only accepts a response from) the addressed
 * seat, regardless of which seat is the effect's controller.
 */

function makeState(): GameState {
  const state = new GameState();
  state.players = new ArraySchema<PlayerState>();
  for (const seat of [0, 1] as const) {
    const p = new PlayerState();
    p.seat = seat;
    state.players[seat] = p;
  }
  return state;
}

function recordingTransport(): { transport: DecisionTransport; sent: Array<{ seat: Seat; req: DecisionRequest }> } {
  const sent: Array<{ seat: Seat; req: DecisionRequest }> = [];
  return {
    sent,
    transport: { requestDecision: (seat, req) => sent.push({ seat, req }) },
  };
}

/** A minimal EffectContext: controller is seat 0, opponentOf flips 0<->1. */
function makeCtx(): EffectContext {
  return {
    activeTiming: "OnDestroyedAnyone",
    source: { ownerSeat: 0 as Seat, cardId: "BT26-072", definition: { nameEn: "Peckmon" } },
    game: { opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat },
  } as unknown as EffectContext;
}

describe("ctx.ask.opponent (opponent-addressed decisions)", () => {
  it("addresses the request to the opponent's seat, not the controller's", async () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    const api = createDecisionApi(mgr);
    const ctx = makeCtx(); // controller is seat 0

    const promise = api.opponent!.selectCards(ctx, { candidates: ["c1", "c2"], min: 1, max: 1 });

    expect(sent).toHaveLength(1);
    expect(sent[0]!.seat).toBe(1); // opponent of seat 0, not the controller
    expect(state.pendingDecision!.seat).toBe(1);

    mgr.respond(1, sent[0]!.req.decisionId, { kind: "selectCards", instanceIds: ["c1"] });
    expect(await promise).toEqual(["c1"]);
  });

  it("the controller (wrong seat) cannot answer a decision addressed to the opponent", async () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    const api = createDecisionApi(mgr);
    const ctx = makeCtx();

    const promise = api.opponent!.selectCards(ctx, { candidates: ["c1"], min: 1, max: 1 });
    const decisionId = sent[0]!.req.decisionId;

    // Seat 0 is the controller (ctx.source.ownerSeat) but NOT the addressed seat (1).
    // FAILS-WHEN-REVERTED (routing broken to accept the controller's seat instead of
    // the addressed seat): this would return true and resolve the promise wrongly.
    expect(mgr.respond(0, decisionId, { kind: "selectCards", instanceIds: ["c1"] })).toBe(false);
    expect(mgr.hasPending).toBe(true); // still open — the wrong-seat answer was ignored

    // The addressed seat (1) can still answer it.
    expect(mgr.respond(1, decisionId, { kind: "selectCards", instanceIds: ["c1"] })).toBe(true);
    expect(await promise).toEqual(["c1"]);
  });

  it("ctx.ask.* (no .opponent) still addresses the controller, unaffected by the addition", async () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    const api = createDecisionApi(mgr);
    const ctx = makeCtx();

    const promise = api.selectCards(ctx, { candidates: ["c1"], min: 1, max: 1 });
    expect(sent[0]!.seat).toBe(0); // ctx.source.ownerSeat
    mgr.respond(0, sent[0]!.req.decisionId, { kind: "selectCards", instanceIds: ["c1"] });
    await promise;
  });

  it("keeps public permanents visible while only legal targets are selectable", async () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    const api = createDecisionApi(mgr);
    const ctx = makeCtx();

    const promise = api.chooseTargets(ctx, {
      candidates: ["active-1", "active-2"],
      visible: ["active-1", "active-2", "suspended"],
      min: 1,
      max: 1,
    });

    expect(sent[0]!.req.options).toMatchObject({
      candidateInstanceIds: ["active-1", "active-2"],
      visibleInstanceIds: ["active-1", "active-2", "suspended"],
    });
    mgr.respond(0, sent[0]!.req.decisionId, { kind: "chooseTargets", instanceIds: ["active-2"] });
    expect(await promise).toEqual(["active-2"]);
  });

  it("requireOpponentAsk throws loudly rather than silently no-op when ctx.ask.opponent is missing", () => {
    const ctx = { ask: {} } as unknown as EffectContext;
    // FAILS-WHEN-REVERTED (a card reading ctx.ask.opponent directly instead of going
    // through this guard): `undefined?.selectCards(...)` resolves to `undefined` and a
    // caller that doesn't check would treat that as an empty/no-op selection instead of
    // a loud failure.
    expect(() => requireOpponentAsk(ctx)).toThrow(/ctx\.ask\.opponent is not wired/);
  });
});
