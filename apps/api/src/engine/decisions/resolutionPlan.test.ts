import { describe, expect, it } from "vitest";
import {
  buildTriggerKey,
  EffectTiming,
  GameState,
  PlayerState,
  type DecisionRequest,
  type DecisionResponse,
  type Seat,
} from "@aegis/shared";
import { DecisionManager, type DecisionTransport } from "./index.js";
import { createDecisionApi } from "./decisionApi.js";
import { createResolverDecisions } from "./resolverDecisions.js";
import { ResolutionPlan } from "./resolutionPlan.js";
import { resolveTiming, type ResolutionEnv } from "../effects/stack.js";
import { UseTracker } from "../effects/kernel.js";
import type { CardSource } from "../effects/CardSource.js";
import type { CollectedEffect } from "../effects/collect.js";
import type { Effect } from "../effects/Effect.js";
import type { EffectContext } from "../effects/EffectContext.js";

function gameWithSeats(): GameState {
  const game = new GameState();
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    game.players.push(player);
  }
  return game;
}

function pending(
  name: string,
  opts: { optional?: boolean; description?: string; resolve?: (ctx: EffectContext) => Promise<void> } = {},
): CollectedEffect {
  const source = {
    instanceId: name,
    cardId: name,
    ownerSeat: 0 as Seat,
    definition: {} as CardSource["definition"],
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } satisfies CardSource;
  const effect: Effect = {
    effectKey: name,
    description: opts.description ?? name,
    optional: opts.optional ?? false,
    isInherited: false,
    isSecurity: false,
    isLinked: false,
    maxPerTurn: 1,
    canTrigger: () => true,
    canActivate: () => true,
    resolve: opts.resolve ?? (async () => {}),
  };
  return { source, effect };
}

const key = (name: string): string => buildTriggerKey(name, name);

/** A seat that answers every decision from a script and records what it was asked. */
function scriptedSeat(answer: (request: DecisionRequest) => DecisionResponse) {
  const requests: DecisionRequest[] = [];
  let manager: DecisionManager | undefined;
  const transport: DecisionTransport = {
    requestDecision: (seat, request) => {
      requests.push(request);
      queueMicrotask(() => manager?.respond(seat, request.decisionId, answer(request)));
    },
  };
  manager = new DecisionManager(gameWithSeats(), transport);
  return { manager, requests };
}

function envFor(
  manager: DecisionManager,
  collect: () => CollectedEffect[],
): { env: ResolutionEnv; resolved: string[] } {
  const resolved: string[] = [];
  const tracker = new UseTracker();
  const decisions = createResolverDecisions(manager);
  const ask = createDecisionApi(manager);
  const env: ResolutionEnv = {
    turnSeat: 0,
    tracker,
    collect,
    makeContext: (c) => ({ source: c.source, trigger: {}, game: {}, fx: {}, ask }) as never,
    ruleProcess: async () => {},
    isGameOver: () => false,
    chooseOrder: (seat, active, timing, plan) => decisions.chooseOrder(seat, active, timing, plan),
    askOptional: (seat, collected, plan) => decisions.askOptional(seat, collected, plan),
    onResolved: (_timing, collected) => resolved.push(collected.effect.effectKey),
  };
  return { env, resolved };
}

describe("ResolutionPlan", () => {
  it("answers only while every offered key has a planned position", () => {
    const plan = new ResolutionPlan();
    plan.adopt(["b", "a"]);

    expect(plan.nextOf(["a", "b"])).toBe("b");
    expect(plan.nextOf(["a"])).toBe("a");
    expect(plan.nextOf(["a", "c"])).toBeUndefined();
  });

  it("moves a newer answer to the front and keeps the earlier plan for the rest", () => {
    const plan = new ResolutionPlan();
    plan.adopt(["a", "b"], { a: true });
    plan.adopt(["c"], { c: false });

    expect(plan.nextOf(["a", "b", "c"])).toBe("c");
    expect(plan.presetFor("a")).toBe(true);
    expect(plan.presetFor("c")).toBe(false);
    expect(plan.presetFor("b")).toBeUndefined();
  });
});

describe("resolution plan through the stack resolver", () => {
  it("resolves a fully ordered window from one prompt and applies yes/no presets", async () => {
    let bodyAnswer: boolean | undefined;
    const effects = [
      pending("mandatory"),
      pending("optional-effect", { optional: true }),
      pending("asks-in-body", {
        description: "You may draw 1.",
        resolve: async (ctx) => {
          bodyAnswer = await ctx.ask.optional(ctx, "Draw 1?");
        },
      }),
    ];
    const { manager, requests } = scriptedSeat(() => ({
      kind: "orderTriggers",
      order: [key("asks-in-body"), key("optional-effect"), key("mandatory")],
      optionalAnswers: { [key("asks-in-body")]: true, [key("optional-effect")]: false },
    }));
    const { env, resolved } = envFor(manager, () => effects);

    await resolveTiming(EffectTiming.OnDeletion, env);

    expect(requests).toHaveLength(1);
    expect(requests[0]!.options).toMatchObject({
      acceptsResolutionPlan: true,
      triggerIsOptional: [false, true, true],
    });
    expect(bodyAnswer).toBe(true);
    expect(resolved).toEqual(["asks-in-body", "mandatory"]);
  });

  it("asks again when the offered effects include one the plan does not order", async () => {
    const effects = [pending("first"), pending("second"), pending("third")];
    const { manager, requests } = scriptedSeat((request) => ({
      kind: "orderTriggers",
      order: requests.length === 1 ? [key("second")] : [...(request.options?.triggerKeys ?? [])].reverse(),
    }));
    const { env, resolved } = envFor(manager, () => effects);

    await resolveTiming(EffectTiming.OnDeletion, env);

    expect(requests.map((request) => request.options?.triggerKeys)).toEqual([
      [key("first"), key("second"), key("third")],
      [key("first"), key("third")],
    ]);
    expect(resolved).toEqual(["second", "third", "first"]);
  });

  it("asks yes/no questions for effects the controller left on Ask", async () => {
    const effects = [pending("left-on-ask", { optional: true }), pending("other")];
    const { manager, requests } = scriptedSeat((request) =>
      request.kind === "optional"
        ? { kind: "optional", accept: true }
        : { kind: "orderTriggers", order: [key("left-on-ask"), key("other")] },
    );
    const { env, resolved } = envFor(manager, () => effects);

    await resolveTiming(EffectTiming.OnDeletion, env);

    expect(requests.map((request) => request.kind)).toEqual(["orderTriggers", "optional"]);
    expect(resolved).toEqual(["left-on-ask", "other"]);
  });
});

describe("DecisionManager resolution plan validation", () => {
  async function respondTo(options: DecisionRequest["options"], response: DecisionResponse): Promise<boolean> {
    let accepted = false;
    let manager: DecisionManager | undefined;
    const transport: DecisionTransport = {
      requestDecision: (seat, request) => {
        queueMicrotask(() => {
          accepted = manager!.respond(seat, request.decisionId, response);
          manager!.cancel();
        });
      },
    };
    manager = new DecisionManager(gameWithSeats(), transport);
    await manager.request({ seat: 0, kind: "orderTriggers", promptText: "order", options });
    return accepted;
  }

  const offered = { triggerKeys: ["a", "b", "c"] };
  const plannable = { ...offered, acceptsResolutionPlan: true };

  it("keeps plain prompts at exactly one key", async () => {
    expect(await respondTo(offered, { kind: "orderTriggers", order: ["a"] })).toBe(true);
    expect(await respondTo(offered, { kind: "orderTriggers", order: ["a", "b"] })).toBe(false);
    expect(await respondTo(offered, { kind: "orderTriggers", order: ["a"], optionalAnswers: { a: true } })).toBe(false);
  });

  it("accepts a partial or full plan of offered keys", async () => {
    expect(await respondTo(plannable, { kind: "orderTriggers", order: ["c", "a"] })).toBe(true);
    expect(
      await respondTo(plannable, { kind: "orderTriggers", order: ["c", "a", "b"], optionalAnswers: { b: false } }),
    ).toBe(true);
  });

  it("rejects repeated, unknown, or malformed plan entries", async () => {
    expect(await respondTo(plannable, { kind: "orderTriggers", order: ["a", "a"] })).toBe(false);
    expect(await respondTo(plannable, { kind: "orderTriggers", order: ["a", "z"] })).toBe(false);
    expect(await respondTo(plannable, { kind: "orderTriggers", order: [] })).toBe(false);
    expect(await respondTo(plannable, { kind: "orderTriggers", order: ["a"], optionalAnswers: { z: true } })).toBe(
      false,
    );
    expect(
      await respondTo(plannable, {
        kind: "orderTriggers",
        order: ["a"],
        optionalAnswers: { a: "yes" } as unknown as Record<string, boolean>,
      }),
    ).toBe(false);
  });
});
