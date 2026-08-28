import { describe, it, expect } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import { GameState, PlayerState, type DecisionRequest, type Seat } from "@aegis/shared";
import { DecisionManager, type DecisionTransport } from "./index.js";

/**
 * Hostile-client coverage for the `min` lower bound on `chooseTargets`/
 * `selectCards` decisions (docs/API-CONTRACT.md "Intent validation contract";
 * DecisionRequest.options.min). `clampSelection` (decisionApi.ts) already
 * enforces the allowlist, de-duplication, and `max`; `min` was never passed to
 * it and `OpenDecision` didn't even retain it, so a client could answer a
 * mandatory selection with an empty (or partial) array and the engine would
 * proceed as if the player legitimately chose nothing.
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

describe("DecisionManager — min enforcement against a hostile client", () => {
  it("rejects two instances with the same card number when the decision requires distinct cards", () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    void mgr.request({
      seat: 0,
      kind: "selectCards",
      promptText: "Select cards with different card numbers",
      options: {
        candidateInstanceIds: ["copy-a", "copy-b", "other"],
        visibleCards: [
          { instanceId: "copy-a", cardId: "EX1-048" },
          { instanceId: "copy-b", cardId: "EX1-048" },
          { instanceId: "other", cardId: "EX1-049" },
        ],
        min: 0,
        max: 2,
        distinctCardIds: true,
      },
    });
    const id = sent[0]!.req.decisionId;

    expect(
      mgr.respond(0, id, {
        kind: "selectCards",
        instanceIds: ["copy-a", "copy-b"],
      }),
    ).toBe(false);
    expect(mgr.hasPending).toBe(true);

    expect(
      mgr.respond(0, id, {
        kind: "selectCards",
        instanceIds: ["copy-a", "other"],
      }),
    ).toBe(true);
    expect(mgr.hasPending).toBe(false);
  });

  it("rejects an empty response to a mandatory min:1 selectCards decision", () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    void mgr.request({
      seat: 0,
      kind: "selectCards",
      promptText: "Trash 1 of your cards",
      options: { candidateInstanceIds: ["c1", "c2", "c3"], min: 1, max: 1 },
    });
    const id = sent[0]!.req.decisionId;

    // The client answers a mandatory trash-1 with nothing: refused, not
    // silently accepted as "the player chose to trash nothing".
    expect(mgr.respond(0, id, { kind: "selectCards", instanceIds: [] })).toBe(false);
    expect(mgr.hasPending).toBe(true);
    expect(state.pendingDecision).toBeDefined();

    // A conforming retry is accepted and resolves the decision.
    expect(mgr.respond(0, id, { kind: "selectCards", instanceIds: ["c1"] })).toBe(true);
    expect(mgr.hasPending).toBe(false);
  });

  it("rejects a partial response to a min:2 chooseTargets decision when 1 valid id is offered", () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    void mgr.request({
      seat: 0,
      kind: "chooseTargets",
      promptText: "Delete 2 of your opponent's Digimon",
      options: { candidateInstanceIds: ["p1", "p2", "p3"], min: 2, max: 2 },
    });
    const id = sent[0]!.req.decisionId;

    expect(mgr.respond(0, id, { kind: "chooseTargets", instanceIds: ["p1"] })).toBe(false);
    expect(mgr.hasPending).toBe(true);

    expect(mgr.respond(0, id, { kind: "chooseTargets", instanceIds: ["p1", "p2"] })).toBe(true);
    expect(mgr.hasPending).toBe(false);
  });

  it("accepts a legitimate shortage: min:2 with only 1 candidate offered", () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    void mgr.request({
      seat: 0,
      kind: "chooseTargets",
      promptText: "Delete 2 of your opponent's Digimon",
      options: { candidateInstanceIds: ["p1"], min: 2, max: 2 },
    });
    const id = sent[0]!.req.decisionId;

    // Only one legal candidate exists; picking it satisfies the mandatory
    // selection (Comprehensive Rules §15-10-2-1 / §1-3-2: "as many as
    // possible"), not a violation.
    expect(mgr.respond(0, id, { kind: "chooseTargets", instanceIds: ["p1"] })).toBe(true);
    expect(mgr.hasPending).toBe(false);
  });

  it("still rejects unoffered ids, collapses duplicates for min purposes, and lets clampSelection truncate over-max", () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    void mgr.request({
      seat: 0,
      kind: "selectCards",
      promptText: "Trash 2 of your cards",
      options: { candidateInstanceIds: ["c1", "c2", "c3"], min: 2, max: 2 },
    });
    const id = sent[0]!.req.decisionId;

    // Only unoffered ids + a duplicate: doesn't meet min via legitimate ids.
    expect(mgr.respond(0, id, { kind: "selectCards", instanceIds: ["c9", "c1", "c1"] })).toBe(false);
    expect(mgr.hasPending).toBe(true);

    // Enough distinct offered ids (plus an over-max extra, which clampSelection
    // — exercised at the decisionApi layer, not here — truncates downstream).
    expect(mgr.respond(0, id, { kind: "selectCards", instanceIds: ["c1", "c2", "c3"] })).toBe(true);
    expect(mgr.hasPending).toBe(false);
  });

  it("still allows declining an optional (min:0) selection with an empty array", () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    void mgr.request({
      seat: 0,
      kind: "selectCards",
      promptText: "You may trash up to 2 of your cards",
      options: { candidateInstanceIds: ["c1", "c2"], min: 0, max: 2 },
    });
    const id = sent[0]!.req.decisionId;

    expect(mgr.respond(0, id, { kind: "selectCards", instanceIds: [] })).toBe(true);
    expect(mgr.hasPending).toBe(false);
  });

  it("still allows declining when no min is specified at all", () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    void mgr.request({
      seat: 0,
      kind: "chooseTargets",
      promptText: "?",
      options: { candidateInstanceIds: ["p1", "p2"], max: 2 },
    });
    const id = sent[0]!.req.decisionId;

    expect(mgr.respond(0, id, { kind: "chooseTargets", instanceIds: [] })).toBe(true);
    expect(mgr.hasPending).toBe(false);
  });
});
