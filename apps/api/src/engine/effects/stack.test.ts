import { describe, it, expect } from "vitest";
import { EffectTiming, type CardColor, type Seat } from "@aegis/shared";
import { resolveTiming, orderTurnPlayerFirst, type ResolutionEnv } from "./stack.js";
import type { CollectedEffect } from "./collect.js";
import type { CardSource } from "./CardSource.js";
import type { Effect } from "./Effect.js";
import type { EffectContext } from "./EffectContext.js";
import { UseTracker } from "./kernel.js";

/**
 * Resolver-focused fakes. The ordered, interruptible loop only reads
 * source.ownerSeat / source.instanceId / source.permanent() and
 * effect.{optional,effectKey,canActivate,resolve}; it never touches GameState
 * directly (that is the engine's `collect`/`makeContext`). So a minimal fake
 * CardSource/Effect exercises the loop exactly as production does.
 */

function fakeSource(seat: Seat, instanceId: string): CardSource {
  return {
    instanceId,
    cardId: instanceId,
    ownerSeat: seat,
    definition: {} as CardSource["definition"],
    permanent: () => undefined, // not on a permanent -> kernel placement guard passes
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: (_c: CardColor) => false,
  };
}

interface FakeEffectOptions {
  optional?: boolean;
  canActivate?: () => boolean;
  onResolve?: (ctx: EffectContext) => unknown | Promise<unknown>;
  /** Defaults to 1 so a resolved effect drops out of a stable collect() via the use
   *  ledger (the realistic "once" shape). Set -1 for an explicitly unlimited effect. */
  maxPerTurn?: number;
}

function fakeEffect(effectKey: string, opts: FakeEffectOptions = {}): Effect {
  return {
    effectKey,
    description: effectKey,
    optional: opts.optional ?? false,
    isInherited: false,
    isSecurity: false,
    isLinked: false,
    maxPerTurn: opts.maxPerTurn ?? 1,
    canTrigger: () => true,
    canActivate: () => (opts.canActivate ? opts.canActivate() : true),
    resolve: async (ctx) => {
      await opts.onResolve?.(ctx);
    },
  };
}

function collected(seat: Seat, instanceId: string, effect: Effect): CollectedEffect {
  return { source: fakeSource(seat, instanceId), effect };
}

/**
 * Build a ResolutionEnv over a fixed list of collected effects. The default `collect`
 * is STABLE — it returns the same seed every pass, mirroring production where
 * `gatherTriggeredEffects` re-queries live state each call; resolved effects drop out
 * because the default fake `maxPerTurn` is 1 (the kernel filters them via the use
 * ledger) or because their `canActivate` turns false. The loop asks for ordering only
 * when multiple effects share a controller's activation window, and `chooseOrder`
 * defaults to "resolve the first offered effect". Tests that need a one-shot or
 * growing trigger set override `collect`.
 */
function envOver(
  seed: CollectedEffect[],
  overrides: Partial<ResolutionEnv> = {},
): { env: ResolutionEnv; log: string[]; tracker: UseTracker } {
  const log: string[] = [];
  const tracker = new UseTracker();

  const env: ResolutionEnv = {
    turnSeat: 0,
    tracker,
    collect: () => seed,
    // The fakes' canActivate/resolve only read ctx.source; game/fx/ask are unused
    // here (they belong to real card bodies, exercised by the framework tests).
    makeContext: (c) => ({ source: c.source, trigger: {}, game: {}, fx: {}, ask: {} }) as never,
    ruleProcess: async () => {
      log.push("rule");
    },
    isGameOver: () => false,
    chooseOrder: async (_seat, active) => {
      log.push(`order(${active.map((c) => c.effect.effectKey).join(",")})`);
      return 0;
    },
    askOptional: async (_seat, c) => {
      log.push(`optional(${c.effect.effectKey})`);
      return true;
    },
    ...overrides,
  };
  return { env, log, tracker };
}

describe("orderTurnPlayerFirst", () => {
  it("places the turn player's effects before the opponent's, stable within each side", () => {
    const turn = 0 as Seat;
    const a = collected(0, "a", fakeEffect("a"));
    const b = collected(1, "b", fakeEffect("b"));
    const c = collected(0, "c", fakeEffect("c"));
    const d = collected(1, "d", fakeEffect("d"));

    const ordered = orderTurnPlayerFirst([b, a, d, c], turn);
    expect(ordered.map((x) => x.effect.effectKey)).toEqual(["a", "c", "b", "d"]);
  });

  it("orders opponent-first when the opponent is the turn player", () => {
    const a = collected(0, "a", fakeEffect("a"));
    const b = collected(1, "b", fakeEffect("b"));
    const ordered = orderTurnPlayerFirst([a, b], 1 as Seat);
    expect(ordered.map((x) => x.effect.effectKey)).toEqual(["b", "a"]);
  });
});

describe("resolveTiming: ordering and single-trigger resolution", () => {
  it("re-entrantly drains the remaining effects without re-entering the current effect", async () => {
    const order: string[] = [];
    const first = fakeEffect("first", {
      onResolve: async (ctx) => {
        order.push("first:start");
        await ctx.drainCurrentTimingWindow?.();
        order.push("first:end");
      },
    });
    const second = fakeEffect("second", { onResolve: () => order.push("second") });
    const { env, tracker } = envOver([collected(0, "a", first), collected(0, "b", second)]);

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(order).toEqual(["first:start", "second", "first:end"]);
    expect(tracker.count("a", "first")).toBe(1);
    expect(tracker.count("b", "second")).toBe(1);
  });

  it("does not re-offer an optional effect declined during a re-entrant drain", async () => {
    const order: string[] = [];
    const first = fakeEffect("first", {
      onResolve: async (ctx) => {
        order.push("first:start");
        await ctx.drainCurrentTimingWindow?.();
        order.push("first:end");
      },
    });
    const declined = fakeEffect("declined", { optional: true, onResolve: () => order.push("unexpected") });
    let optionalCalls = 0;
    const { env } = envOver([collected(0, "a", first), collected(0, "b", declined)], {
      askOptional: async (_seat, effect) => {
        if (effect.effect.effectKey === "declined") optionalCalls += 1;
        return false;
      },
    });

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(order).toEqual(["first:start", "first:end"]);
    expect(optionalCalls).toBe(1);
  });

  it("propagates a drained effect error and clears the outer effect's in-progress guard", async () => {
    const order: string[] = [];
    let shouldThrow = true;
    const first = fakeEffect("first", {
      onResolve: async (ctx) => {
        order.push("first:start");
        await ctx.drainCurrentTimingWindow?.();
        order.push("first:end");
      },
    });
    const second = fakeEffect("second", {
      onResolve: () => {
        order.push("second");
        if (shouldThrow) {
          shouldThrow = false;
          throw new Error("drained failure");
        }
      },
    });
    const { env } = envOver([collected(0, "a", first), collected(0, "b", second)]);

    await expect(resolveTiming(EffectTiming.OnPlay, env)).rejects.toThrow("drained failure");
    await resolveTiming(EffectTiming.OnPlay, env);

    expect(order).toEqual(["first:start", "second", "first:start", "second", "first:end"]);
  });

  it("resolves a single mandatory triggered effect without an ordering decision", async () => {
    const order: string[] = [];
    const eff = fakeEffect("solo", { onResolve: () => order.push("solo") });
    const { env, log } = envOver([collected(0, "s1", eff)]);

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(order).toEqual(["solo"]);
    expect(log).not.toContain("order(solo)");
  });

  it("resolves the turn player's bucket fully before the opponent's", async () => {
    const order: string[] = [];
    const turnEff = fakeEffect("turn", { onResolve: () => order.push("turn") });
    const oppEff = fakeEffect("opp", { onResolve: () => order.push("opp") });
    // Seed deliberately opponent-first to prove ordering, not input order, decides.
    const { env } = envOver([collected(1, "o1", oppEff), collected(0, "t1", turnEff)]);

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(order).toEqual(["turn", "opp"]);
  });

  it("records a use per resolved effect (maxPerTurn accounting)", async () => {
    const eff = fakeEffect("counted");
    const { env, tracker } = envOver([collected(0, "c1", eff)]);

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(tracker.count("c1", "counted")).toBe(1);
  });

  it("resolves an UNLIMITED mandatory triggered effect exactly once per window", async () => {
    // maxPerTurn = -1 (unlimited) with a standing canTrigger/canActivate that never
    // clears: without the window's resolved-set this would re-collect and re-resolve
    // forever (until MAX_RESOLUTION_PASSES throws). The single-trigger rule
    // (§15-4-4-2) requires it to fire once. `collect` is the realistic stable seed.
    let resolveCount = 0;
    const eff = fakeEffect("loopy", { maxPerTurn: -1, onResolve: () => (resolveCount += 1) });
    const { env } = envOver([collected(0, "u1", eff)]);

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(resolveCount).toBe(1);
  });
});

describe("resolveTiming: choosing which effect to process first", () => {
  it("prompts chooseOrder when two same-side effects are simultaneously active and resolves the chosen one first", async () => {
    const order: string[] = [];
    const first = fakeEffect("first", { onResolve: () => order.push("first") });
    const second = fakeEffect("second", { onResolve: () => order.push("second") });

    // Controller picks index 1 ("second") first; the remaining mandatory "first"
    // effect then resolves directly because there is no ordering choice left.
    let asked = 0;
    const { env, log } = envOver([collected(0, "e1", first), collected(0, "e2", second)], {
      chooseOrder: async (_seat, active) => {
        asked += 1;
        log.push(`order(${active.map((c) => c.effect.effectKey).join(",")})`);
        return active.findIndex((c) => c.effect.effectKey === "second");
      },
    });

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(asked).toBe(1);
    expect(log).not.toContain("order(first)");
    expect(order).toEqual(["second", "first"]);
  });

  it("honors a decline (null) only when every remaining effect is optional", async () => {
    const order: string[] = [];
    const optA = fakeEffect("optA", { optional: true, onResolve: () => order.push("optA") });
    const optB = fakeEffect("optB", { optional: true, onResolve: () => order.push("optB") });

    const { env } = envOver([collected(0, "a", optA), collected(0, "b", optB)], {
      chooseOrder: async () => null, // decline all
    });

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(order).toEqual([]); // nothing resolved; decline was honored
  });

  it("coerces a chooseOrder decline to the first effect when a mandatory effect remains", async () => {
    const order: string[] = [];
    const mandatory = fakeEffect("must", { onResolve: () => order.push("must") });
    const optional = fakeEffect("may", { optional: true, onResolve: () => order.push("may") });

    // Two active (one mandatory, one optional) -> chooseOrder is consulted; a decline
    // is INVALID here (a mandatory trigger is present) so the resolver forces index 0
    // ("must"). After "must" resolves, only the optional remains: with a single active
    // effect there is no choose-order prompt, and its own optional prompt is declined.
    const { env } = envOver([collected(0, "m", mandatory), collected(0, "o", optional)], {
      chooseOrder: async () => null,
      askOptional: async () => false,
    });

    await resolveTiming(EffectTiming.OnPlay, env);

    // "must" ran despite the decline (coercion); "may" was offered alone and declined.
    expect(order).toEqual(["must"]);
  });

  it("forces the mandatory effect first when chooseOrder declines, then offers the lone optional", async () => {
    const order: string[] = [];
    const mandatory = fakeEffect("must", { onResolve: () => order.push("must") });
    const optional = fakeEffect("may", { optional: true, onResolve: () => order.push("may") });

    // Same as above but the controller ACCEPTS the lone optional when finally asked.
    const { env } = envOver([collected(0, "m", mandatory), collected(0, "o", optional)], {
      chooseOrder: async () => null,
      askOptional: async () => true,
    });

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(order).toEqual(["must", "may"]);
  });
});

describe("resolveTiming: optional prompt", () => {
  it("skips an optional effect the controller declines and does NOT record a use", async () => {
    const order: string[] = [];
    const eff = fakeEffect("maybe", { optional: true, onResolve: () => order.push("maybe") });
    const { env, tracker } = envOver([collected(0, "x", eff)], {
      askOptional: async () => false,
    });

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(order).toEqual([]);
    expect(tracker.count("x", "maybe")).toBe(0);
  });

  it("resolves an optional effect the controller accepts and records the use", async () => {
    const order: string[] = [];
    const eff = fakeEffect("maybe", { optional: true, onResolve: () => order.push("maybe") });
    const { env, tracker } = envOver([collected(0, "x", eff)], {
      askOptional: async () => true,
    });

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(order).toEqual(["maybe"]);
    expect(tracker.count("x", "maybe")).toBe(1);
  });
});

describe("resolveTiming: effects triggered during resolution (re-scan)", () => {
  it("resolves an effect that becomes active only after an earlier one resolves", async () => {
    const order: string[] = [];
    let secondReady = false;
    const firstEff = fakeEffect("first", {
      onResolve: () => {
        order.push("first");
        secondReady = true; // first makes second activatable
      },
    });
    const secondEff = fakeEffect("second", {
      canActivate: () => secondReady,
      onResolve: () => order.push("second"),
    });

    // Both are collected up front for the same seat, but `second` cannot activate
    // until `first` resolves. `collect` is stable (re-queried each pass); the loop
    // re-checks canActivate so `second` joins the active set only after `first` runs.
    // Each fake is maxPerTurn=1, so a resolved effect drops out of the stable set.
    const seed = [collected(0, "f", firstEff), collected(0, "s", secondEff)];
    const { env } = envOver(seed, {
      // With one active at a time, no prompt is needed; index 0 each pass.
      chooseOrder: async () => 0,
    });

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(order).toEqual(["first", "second"]);
  });

  it("picks up a brand-new trigger surfaced by collect() after a resolution", async () => {
    const order: string[] = [];
    const initial = fakeEffect("initial", { onResolve: () => order.push("initial") });
    // The reactive trigger is edge-triggered: it is only collectable on the pass
    // right after `initial` resolves (its trigger condition just became true), then
    // stops being offered — the realistic shape of an "on X happening" trigger.
    let resolved = false;
    const reactive = fakeEffect("reactive", {
      canActivate: () => !resolved,
      onResolve: () => {
        order.push("reactive");
        resolved = true;
      },
    });

    const seed = [collected(0, "i", initial)];
    const reactiveCollected = collected(0, "r", reactive);

    let calls = 0;
    const { env } = envOver(seed, {
      collect: () => {
        calls += 1;
        if (calls === 1) return seed; // initial scan: only `initial`
        if (calls === 2) return [reactiveCollected]; // after `initial` resolves, `reactive` triggers
        return []; // quiet thereafter
      },
    });

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(order).toEqual(["initial", "reactive"]);
  });

  it("stops immediately when the game ends mid-resolution", async () => {
    const order: string[] = [];
    let over = false;
    const ender = fakeEffect("ender", {
      onResolve: () => {
        order.push("ender");
        over = true; // this resolution ends the game
      },
    });
    const never = fakeEffect("never", { onResolve: () => order.push("never") });

    const seed = [collected(0, "e", ender), collected(0, "n", never)];
    const { env } = envOver(seed, {
      isGameOver: () => over,
      collect: () => seed, // would keep offering "never", but game-over short-circuits
      chooseOrder: async () => 0,
    });

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(order).toEqual(["ender"]); // "never" never runs
  });
});

describe("resolveTiming: pass-cap overflow (Comprehensive Rules §18-3-2 infinite loops)", () => {
  it("throws when the pass cap is exceeded and the env has no declareDraw (today's safety net)", async () => {
    // A fresh instance id each pass never dedupes against the `resolved` ledger (keyed
    // on instanceId+effectKey), so the fixpoint spins forever — a runaway effect that
    // re-derives a "new" trigger every pass instead of clearing its own guard — until
    // MAX_RESOLUTION_PASSES trips.
    const runaway = fakeEffect("runaway", { maxPerTurn: -1 });
    let n = 0;
    const { env } = envOver([], { collect: () => [collected(0, `r${n++}`, runaway)] });

    await expect(resolveTiming(EffectTiming.OnPlay, env)).rejects.toThrow(/exceeded 1000 resolution passes/);
  });

  it("§18-3-2: resolves the match to a draw instead of throwing when the env wires declareDraw", async () => {
    const runaway = fakeEffect("runaway", { maxPerTurn: -1 });
    let n = 0;
    let drawDeclared = false;
    let gameOver = false;
    const { env } = envOver([], {
      collect: () => [collected(0, `r${n++}`, runaway)],
      isGameOver: () => gameOver,
      declareDraw: async () => {
        drawDeclared = true;
        gameOver = true;
      },
    });

    await expect(resolveTiming(EffectTiming.OnPlay, env)).resolves.toBeUndefined();
    expect(drawDeclared).toBe(true);
  });
});
