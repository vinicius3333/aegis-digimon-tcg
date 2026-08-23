import { describe, it, expect, vi } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import { GameState, PlayerState, type DecisionRequest, type DecisionResponse, type Seat } from "@aegis/shared";
import { DecisionManager, type DecisionTransport } from "./index.js";
import { createDecisionApi } from "./decisionApi.js";
import type { EffectContext } from "../effects/EffectContext.js";

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

describe("DecisionManager", () => {
  it("raises a request, mirrors it into state.pendingDecision, and resolves on a matching respond", async () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);

    const promise = mgr.request({ seat: 1, kind: "optional", promptText: "Use it?" });

    expect(mgr.hasPending).toBe(true);
    expect(mgr.pendingSeat).toBe(1);
    expect(sent).toHaveLength(1);
    const decisionId = sent[0]!.req.decisionId;
    expect(sent[0]!.seat).toBe(1);
    // Mirrored into synchronized state so the wire gate + UI can see it.
    expect(state.pendingDecision).toBeDefined();
    expect(state.pendingDecision!.decisionId).toBe(decisionId);
    expect(state.pendingDecision!.seat).toBe(1);
    expect(state.pendingDecision!.kind).toBe("optional");

    const accepted = mgr.respond(1, decisionId, { kind: "optional", accept: true });
    expect(accepted).toBe(true);

    const response = await promise;
    expect(response).toEqual({ kind: "optional", accept: true });
    expect(mgr.hasPending).toBe(false);
    expect(state.pendingDecision).toBeUndefined();
  });

  it("rejects a respond from the wrong seat", () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    void mgr.request({ seat: 0, kind: "optional", promptText: "?" });
    const id = sent[0]!.req.decisionId;

    // Wrong seat answers: ignored (source OptionalSkill ignores selections for the
    // wrong player).
    expect(mgr.respond(1, id, { kind: "optional", accept: true })).toBe(false);
    expect(mgr.hasPending).toBe(true);
  });

  it("rejects a respond with a stale/unknown decisionId", () => {
    const state = makeState();
    const { transport } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    void mgr.request({ seat: 0, kind: "optional", promptText: "?" });

    expect(mgr.respond(0, "dec-999", { kind: "optional", accept: true })).toBe(false);
    expect(mgr.hasPending).toBe(true);
  });

  it("rejects a respond whose kind does not match the request", () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    void mgr.request({ seat: 0, kind: "chooseTargets", promptText: "?" });
    const id = sent[0]!.req.decisionId;

    // An optional response cannot satisfy a chooseTargets request.
    expect(mgr.respond(0, id, { kind: "optional", accept: true })).toBe(false);
    expect(mgr.hasPending).toBe(true);
    // The correct kind is accepted.
    expect(mgr.respond(0, id, { kind: "chooseTargets", instanceIds: [] })).toBe(true);
  });

  it("keeps an orderTriggers decision open until the client chooses exactly one offered trigger", async () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    const triggerKeys = ["instance-a::effect", "instance-b::effect"];
    const promise = mgr.request({
      seat: 0,
      kind: "orderTriggers",
      promptText: "Choose the next effect.",
      options: { triggerKeys },
    });
    const id = sent[0]!.req.decisionId;

    expect(mgr.respond(0, id, { kind: "orderTriggers", order: [] })).toBe(false);
    expect(mgr.respond(0, id, { kind: "orderTriggers", order: ["unknown"] })).toBe(false);
    expect(mgr.respond(0, id, { kind: "orderTriggers", order: triggerKeys })).toBe(false);
    expect(mgr.hasPending).toBe(true);

    expect(mgr.respond(0, id, { kind: "orderTriggers", order: [triggerKeys[1]!] })).toBe(true);
    await expect(promise).resolves.toEqual({ kind: "orderTriggers", order: [triggerKeys[1]!] });
  });

  it("throws when a second decision is requested while one is open", () => {
    const state = makeState();
    const { transport } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    void mgr.request({ seat: 0, kind: "optional", promptText: "first" });
    expect(() => mgr.request({ seat: 1, kind: "optional", promptText: "second" })).toThrow(/still open/);
  });

  it("auto-resolves a stalled decision with the safe default after the timeout", async () => {
    vi.useFakeTimers();
    try {
      const state = makeState();
      const { transport } = recordingTransport();
      const mgr = new DecisionManager(state, transport, { timeoutMs: 1000 });

      const promise = mgr.request({ seat: 0, kind: "optional", promptText: "?" });
      vi.advanceTimersByTime(1000);

      const response = await promise;
      // Safe default for an optional is decline.
      expect(response).toEqual({ kind: "optional", accept: false });
      expect(mgr.hasPending).toBe(false);
      expect(state.pendingDecision).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancel() resolves the awaiting promise with the safe default and clears state", async () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);

    const promise = mgr.request({ seat: 1, kind: "selectCards", promptText: "?" });
    mgr.cancel();

    const response: DecisionResponse = await promise;
    expect(response).toEqual({ kind: "selectCards", instanceIds: [] });
    expect(mgr.hasPending).toBe(false);
    expect(state.pendingDecision).toBeUndefined();
    expect(sent).toHaveLength(1); // request was sent before cancel
  });

  it("forwards kind-specific options to the transport", () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    void mgr.request({
      seat: 0,
      kind: "chooseOption",
      promptText: "pick",
      options: { choices: ["A", "B"] },
    });
    expect(sent[0]!.req.options).toEqual({ choices: ["A", "B"] });
    // Options are JSON-encoded into the synchronized PendingDecision payload.
    expect(JSON.parse(state.pendingDecision!.payloadJson)).toEqual({ choices: ["A", "B"] });
  });
});

describe("createDecisionApi", () => {
  /**
   * The overlay slices the printed clause for `options.timing` out of the card's full
   * effect text. Without a timing an optional prompt fell back to the WHOLE text, so a
   * card whose first printed clause is [Security] (AD1-020) showed its security effect
   * while resolving its [On Play] body.
   */
  it("tags an optional prompt with the resolving effect's timing", async () => {
    const state = makeState();
    const { transport, sent } = recordingTransport();
    const mgr = new DecisionManager(state, transport);
    const api = createDecisionApi(mgr);
    const ctx = {
      activeTiming: "OnPlay",
      source: { ownerSeat: 0 as Seat, cardId: "AD1-020", definition: { nameEn: "Tommy, Takuya, & Zoe" } },
    } as unknown as EffectContext;

    const promise = api.optional(ctx, "Place 2 card(s) under");
    expect(sent[0]!.req.options?.timing).toBe("OnPlay");
    mgr.respond(0, sent[0]!.req.decisionId, { kind: "optional", accept: false });
    await promise;
  });
});
