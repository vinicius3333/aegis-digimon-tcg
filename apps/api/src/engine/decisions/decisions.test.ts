import { describe, it, expect, vi } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import {
  EffectTiming,
  GameState,
  PlayerState,
  type DecisionRequest,
  type DecisionResponse,
  type Seat,
} from "@aegis/shared";
import { DecisionManager, type DecisionTransport } from "./index.js";
import { createDecisionApi } from "./decisionApi.js";
import type { EffectContext } from "../effects/EffectContext.js";
import { createResolverDecisions } from "./resolverDecisions.js";
import type { CollectedEffect } from "../effects/collect.js";

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

  it("exports and restores a real trigger-order wait without carrying its Promise resolver", async () => {
    const sourceState = makeState();
    const sourceManager = new DecisionManager(sourceState, recordingTransport().transport, {
      executionFramesEnabled: true,
    });
    const sourceResolver = createResolverDecisions(sourceManager);
    const choosing = sourceResolver.chooseOrder(
      0,
      [collectedEffect("permanent-a", "BT1-010/on-play"), collectedEffect("permanent-b", "BT1-011/on-play")],
      EffectTiming.OnPlay,
    );
    await vi.waitFor(() => expect(sourceManager.hasPending).toBe(true));

    const serialized = JSON.stringify(sourceManager.exportExecutionFrame());
    const frame = JSON.parse(serialized) as ReturnType<typeof sourceManager.exportExecutionFrame>;
    const decisionId = frame.request.decisionId;
    const selectedKey = frame.validation.triggerKeys?.[1];
    expect(selectedKey).toBeDefined();
    expect(sourceManager.respond(0, decisionId, { kind: "orderTriggers", order: [selectedKey!] })).toBe(true);
    const sourceIndex = await choosing;
    const sourceContinuation = sourceManager.takeResumedExecutionFrameResult(decisionId);

    const destinationState = makeState();
    const destinationManager = new DecisionManager(destinationState, recordingTransport().transport, {
      executionFramesEnabled: true,
    });
    createResolverDecisions(destinationManager);
    destinationManager.restoreExecutionFrame(frame);

    expect(destinationState.pendingDecision).toMatchObject({ decisionId, kind: "orderTriggers", seat: 0 });
    expect(destinationManager.respond(0, decisionId, { kind: "orderTriggers", order: [selectedKey!] })).toBe(true);
    const destinationContinuation = destinationManager.takeResumedExecutionFrameResult(decisionId);

    expect(sourceIndex).toBe(1);
    expect(destinationContinuation).toEqual(sourceContinuation);
    expect(destinationContinuation?.value).toEqual({ selectedTriggerKey: selectedKey, selectedIndex: 1 });
    expect(destinationState.pendingDecision).toBeUndefined();
    expect(destinationManager.hasPending).toBe(false);
  });

  it("keeps execution-frame capture disabled in production even when requested", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const state = makeState();
      const manager = new DecisionManager(state, recordingTransport().transport, { executionFramesEnabled: true });
      const resolver = createResolverDecisions(manager);
      const choosing = resolver.chooseOrder(
        0,
        [collectedEffect("permanent-a", "BT1-010/on-play"), collectedEffect("permanent-b", "BT1-011/on-play")],
        EffectTiming.OnPlay,
      );
      await vi.waitFor(() => expect(manager.hasPending).toBe(true));

      expect(() => manager.exportExecutionFrame()).toThrow(/no serializable execution continuation/);
      const pending = state.pendingDecision!;
      expect(manager.respond(0, pending.decisionId, { kind: "orderTriggers", order: ["invalid"] })).toBe(false);
      const triggerKeys = JSON.parse(pending.payloadJson) as { triggerKeys: string[] };
      expect(
        manager.respond(0, pending.decisionId, { kind: "orderTriggers", order: [triggerKeys.triggerKeys[0]!] }),
      ).toBe(true);
      await expect(choosing).resolves.toBe(0);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

function collectedEffect(instanceId: string, effectKey: string): CollectedEffect {
  return {
    source: { cardId: "BT1-010", instanceId } as CollectedEffect["source"],
    effect: {
      effectKey,
      description: effectKey,
      optional: false,
      isInherited: false,
      isSecurity: false,
      isLinked: false,
      maxPerTurn: -1,
    } as CollectedEffect["effect"],
    timing: EffectTiming.OnPlay,
  };
}

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
      source: {
        ownerSeat: 0 as Seat,
        cardId: "AD1-020",
        instanceId: "tamer-instance",
        permanent: () => ({ permanentId: "tamer-permanent" }),
        definition: { nameEn: "Tommy, Takuya, & Zoe" },
      },
    } as unknown as EffectContext;

    const promise = api.optional(ctx, "Place 2 card(s) under");
    expect(sent[0]!.req.options?.timing).toBe("OnPlay");
    expect(sent[0]!.req).toMatchObject({ sourceInstanceId: "tamer-instance", sourcePermanentId: "tamer-permanent" });
    mgr.respond(0, sent[0]!.req.decisionId, { kind: "optional", accept: false });
    await promise;
  });

  it("leaves selections with context-dependent play-cost budgets outside the frame registry", async () => {
    const state = makeState();
    const manager = new DecisionManager(state, recordingTransport().transport, { executionFramesEnabled: true });
    const api = createDecisionApi(manager);
    const ctx = {
      source: {
        ownerSeat: 0 as Seat,
        cardId: "BT1-010",
        instanceId: "effect-source",
        definition: { nameEn: "Frame boundary" },
        permanent: () => undefined,
      },
      game: {},
    } as unknown as EffectContext;

    const selectingCards = api.selectCards(ctx, {
      candidates: ["card-a"],
      min: 0,
      max: 1,
      maxTotalPlayCost: 5,
    });
    await vi.waitFor(() => expect(manager.hasPending).toBe(true));
    expect(() => manager.exportExecutionFrame()).toThrow(/no serializable execution continuation/);
    const cardDecisionId = state.pendingDecision!.decisionId;
    expect(manager.respond(0, cardDecisionId, { kind: "selectCards", instanceIds: [] })).toBe(true);
    await expect(selectingCards).resolves.toEqual([]);

    const selectingPermanents = api.selectPermanents(ctx, {
      candidates: ["permanent-a"],
      min: 0,
      max: 1,
      maxTotalPlayCost: 5,
    });
    await vi.waitFor(() => expect(manager.hasPending).toBe(true));
    expect(() => manager.exportExecutionFrame()).toThrow(/no serializable execution continuation/);
    const permanentDecisionId = state.pendingDecision!.decisionId;
    expect(manager.respond(0, permanentDecisionId, { kind: "chooseTargets", instanceIds: [] })).toBe(true);
    await expect(selectingPermanents).resolves.toEqual([]);
  });
});
