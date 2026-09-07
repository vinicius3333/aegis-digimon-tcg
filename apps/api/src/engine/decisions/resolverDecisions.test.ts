import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  EffectTiming,
  type DecisionRequest,
  type DecisionResponse,
  type Seat,
} from "@aegis/shared";
import { buildTriggerKey } from "@aegis/shared";
import { DecisionManager, type DecisionTransport } from "./index.js";
import { createResolverDecisions } from "./resolverDecisions.js";
import type { CollectedEffect } from "../effects/collect.js";
import type { CardSource } from "../effects/CardSource.js";
import type { Effect } from "../effects/Effect.js";

function gameWithSeats(): GameState {
  const game = new GameState();
  for (const seat of [0, 1] as Seat[]) {
    const p = new PlayerState();
    p.seat = seat;
    game.players.push(p);
  }
  return game;
}

function fakeCollected(
  effectKey: string,
  optional = false,
  instanceId = effectKey,
  cardId = effectKey,
): CollectedEffect {
  const source = {
    instanceId,
    cardId,
    ownerSeat: 0 as Seat,
    definition: {} as CardSource["definition"],
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } satisfies CardSource;
  const effect: Effect = {
    effectKey,
    description: `desc:${effectKey}`,
    optional,
    isInherited: false,
    isSecurity: false,
    isLinked: false,
    maxPerTurn: -1,
    canTrigger: () => true,
    canActivate: () => true,
    resolve: async () => {},
  };
  return { source, effect };
}

/**
 * A transport that answers the next decision with a response produced from the
 * request. Lets us drive the manager synchronously: when the manager raises a
 * decision, we immediately feed a respondDecision back.
 */
function autoTransport(answer: (req: DecisionRequest) => DecisionResponse): {
  transport: DecisionTransport;
  requests: DecisionRequest[];
  bind: (m: DecisionManager) => void;
} {
  const requests: DecisionRequest[] = [];
  let manager: DecisionManager | undefined;
  const transport: DecisionTransport = {
    requestDecision: (seat, req) => {
      requests.push(req);
      // Respond on a microtask so the manager's Promise is already wired up.
      queueMicrotask(() => manager?.respond(seat, req.decisionId, answer(req)));
    },
  };
  return { transport, requests, bind: (m) => (manager = m) };
}

describe("createResolverDecisions.chooseOrder", () => {
  it("defensively auto-selects a lone pending trigger without raising a decision", async () => {
    const game = gameWithSeats();
    const { transport, requests, bind } = autoTransport((req) => ({
      kind: "orderTriggers",
      order: (req.options?.triggerKeys ?? []).slice(0, 1),
    }));
    const manager = new DecisionManager(game, transport);
    bind(manager);

    const decisions = createResolverDecisions(manager);
    const index = await decisions.chooseOrder(0, [fakeCollected("EX2-059")], EffectTiming.OnPlay);

    expect(index).toBe(0);
    expect(requests).toEqual([]);
  });

  it("identifies a shared source card across multiple pending effects", async () => {
    const game = gameWithSeats();
    const { transport, requests, bind } = autoTransport((req) => ({
      kind: "orderTriggers",
      order: (req.options?.triggerKeys ?? []).slice(0, 1),
    }));
    const manager = new DecisionManager(game, transport);
    bind(manager);

    const decisions = createResolverDecisions(manager);
    await decisions.chooseOrder(0, [
      fakeCollected("ST10-04/on-play-a", false, "gatomon", "ST10-04"),
      fakeCollected("ST10-04/on-play-b", false, "gatomon", "ST10-04"),
    ]);

    expect(requests[0]?.sourceCardId).toBe("ST10-04");
  });

  it("raises an orderTriggers decision carrying per-instance trigger keys", async () => {
    const game = gameWithSeats();
    const { transport, requests, bind } = autoTransport(() => ({
      kind: "orderTriggers",
      order: [buildTriggerKey("b", "b")],
    }));
    const manager = new DecisionManager(game, transport);
    bind(manager);

    const decisions = createResolverDecisions(manager);
    const active = [fakeCollected("a"), fakeCollected("b"), fakeCollected("c")];
    const index = await decisions.chooseOrder(0, active);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.kind).toBe("orderTriggers");
    expect(requests[0]?.options?.triggerKeys).toEqual([
      buildTriggerKey("a", "a"),
      buildTriggerKey("b", "b"),
      buildTriggerKey("c", "c"),
    ]);
    expect(requests[0]?.options?.triggerCardIds).toEqual(["a", "b", "c"]);
    // The controller put "b" first -> index 1.
    expect(index).toBe(1);
  });

  it("carries the firing window of each pending trigger", async () => {
    const game = gameWithSeats();
    const { transport, requests, bind } = autoTransport((req) => ({
      kind: "orderTriggers",
      order: (req.options?.triggerKeys ?? []).slice(0, 1),
    }));
    const manager = new DecisionManager(game, transport);
    bind(manager);

    const decisions = createResolverDecisions(manager);
    // One Megadramon whose [On Play] and [When Digivolving] both fired: same
    // permanent, same card, two windows.
    await decisions.chooseOrder(
      0,
      [
        { ...fakeCollected("EX1-069/on-play", false, "megadramon", "EX1-069"), timing: EffectTiming.OnPlay },
        {
          ...fakeCollected("EX1-069/when-digivolving", false, "megadramon", "EX1-069"),
          timing: EffectTiming.WhenDigivolving,
        },
      ],
      EffectTiming.OnPlay,
    );

    expect(requests[0]?.options?.triggerTimings).toEqual(["OnPlay", "WhenDigivolving"]);
  });

  it("falls back to the decision timing and omits the field when no window is known", async () => {
    const game = gameWithSeats();
    const { transport, requests, bind } = autoTransport((req) => ({
      kind: "orderTriggers",
      order: (req.options?.triggerKeys ?? []).slice(0, 1),
    }));
    const manager = new DecisionManager(game, transport);
    bind(manager);

    const decisions = createResolverDecisions(manager);
    await decisions.chooseOrder(0, [fakeCollected("a"), fakeCollected("b")], EffectTiming.OnPlay);
    await decisions.chooseOrder(0, [fakeCollected("c"), fakeCollected("d")]);

    expect(requests[0]?.options?.triggerTimings).toEqual(["OnPlay", "OnPlay"]);
    expect(requests[1]?.options?.triggerTimings).toBeUndefined();
  });

  it("maps the chosen key to its index", async () => {
    const game = gameWithSeats();
    const { transport, bind } = autoTransport(() => ({
      kind: "orderTriggers",
      order: [buildTriggerKey("c", "c")],
    }));
    const manager = new DecisionManager(game, transport);
    bind(manager);

    const decisions = createResolverDecisions(manager);
    const index = await decisions.chooseOrder(0, [fakeCollected("a"), fakeCollected("b"), fakeCollected("c")]);
    expect(index).toBe(2); // "c"
  });

  /**
   * The regression this fix targets: two permanents of the SAME card (e.g. two
   * BT1-085 "Tai Kamiya" both triggering [Start of Your Turn]) produce the same
   * `effect.effectKey` (`cardId/effect-index`). Before the fix, `triggerKeys` was
   * built from `effectKey` alone, so both entries collided into one key — the
   * client rendered duplicate React keys, both order buttons toggled the same
   * entry, and the controller could never address the second permanent
   * independently. The fix threads `source.instanceId` into the key via
   * `buildTriggerKey`, so same-card, different-instance triggers are distinct
   * decision entries and the controller can pick either one first.
   */
  it("keeps two permanents of the SAME card independently addressable", async () => {
    const game = gameWithSeats();
    const permanentA = fakeCollected("BT1-085/start-of-turn", false, "instance-A");
    const permanentB = fakeCollected("BT1-085/start-of-turn", false, "instance-B");
    const keyA = buildTriggerKey("instance-A", "BT1-085/start-of-turn");
    const keyB = buildTriggerKey("instance-B", "BT1-085/start-of-turn");

    const { transport, requests, bind } = autoTransport(() => ({
      kind: "orderTriggers",
      order: [keyB], // controller picks the SECOND permanent to resolve first.
    }));
    const manager = new DecisionManager(game, transport);
    bind(manager);

    const decisions = createResolverDecisions(manager);
    const index = await decisions.chooseOrder(0, [permanentA, permanentB]);

    const triggerKeys = requests[0]?.options?.triggerKeys ?? [];
    // Both entries must be present and distinct — this is the assertion that
    // fails (collapses to a single duplicate key) when the fix is reverted.
    expect(new Set(triggerKeys).size).toBe(2);
    expect(triggerKeys).toEqual([keyA, keyB]);
    // The controller chose permanent B (index 1), not A.
    expect(index).toBe(1);
  });
});

describe("createResolverDecisions.askOptional", () => {
  it("returns true when the controller accepts the optional effect", async () => {
    const game = gameWithSeats();
    const { transport, requests, bind } = autoTransport(() => ({ kind: "optional", accept: true }));
    const manager = new DecisionManager(game, transport);
    bind(manager);

    const decisions = createResolverDecisions(manager);
    const use = await decisions.askOptional(0, {
      ...fakeCollected("opt", true),
      timing: EffectTiming.OnUseOption,
    });

    expect(use).toBe(true);
    expect(requests[0]?.kind).toBe("optional");
    expect(requests[0]?.promptText).toBe("Use this effect?");
    expect(requests[0]?.options?.effectText).toBe("desc:opt");
    expect(requests[0]?.options?.timing).toBe("OnUseOption");
  });

  it("returns false when the controller declines", async () => {
    const game = gameWithSeats();
    const { transport, bind } = autoTransport(() => ({ kind: "optional", accept: false }));
    const manager = new DecisionManager(game, transport);
    bind(manager);

    const decisions = createResolverDecisions(manager);
    const use = await decisions.askOptional(0, fakeCollected("opt", true));
    expect(use).toBe(false);
  });

  it("raises the decision to the seat passed by the resolver", async () => {
    const game = gameWithSeats();
    const { transport, requests, bind } = autoTransport(() => ({ kind: "optional", accept: true }));
    const manager = new DecisionManager(game, transport);
    bind(manager);

    const decisions = createResolverDecisions(manager);
    await decisions.askOptional(1, fakeCollected("opt", true));
    expect(requests[0]?.seat).toBe(1);
  });
});
