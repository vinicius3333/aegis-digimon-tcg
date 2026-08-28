import { describe, it, expect, vi } from "vitest";
import { EffectDuration } from "@aegis/shared";
import type { CardSource } from "./CardSource.js";
import type { EffectContext, ReplacementInstall, SubTriggerInstall } from "./EffectContext.js";
import { breeding, staticModifier, turnTiming } from "./builders.js";

function fakeSource(instanceId: string): CardSource {
  return {
    instanceId,
    cardId: "TEST-001",
    ownerSeat: 0,
    definition: {} as CardSource["definition"],
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function fakeCtx(source: CardSource, subscribeSubTrigger: (sub: SubTriggerInstall) => number): EffectContext {
  return {
    source,
    trigger: {} as EffectContext["trigger"],
    game: {} as EffectContext["game"],
    ask: {} as EffectContext["ask"],
    fx: { subscribeSubTrigger } as unknown as EffectContext["fx"],
  };
}

/**
 * Regression guard for the `maxPerTurn`-declared-but-uncounted shape (BT13-008,
 * EX4-030, BT26-079 pre-fix: the corresponding regression coverage, "A
 * sixth instance"). `maxPerTurn` on a persistent (`EffectTiming.None`) effect is
 * documented as uncounted for the static's OWN re-firing (GameEngine.ts); the only
 * thing it can mean is a `[Once Per Turn]` budget on a `subscribeSubTrigger` watcher
 * the static installs. Before this fix, that watcher needed `oncePerTurnKey` threaded
 * by hand — a card could set `maxPerTurn` and still install an unbudgeted watcher.
 */
describe("staticModifier: maxPerTurn auto-threads a stable oncePerTurnKey onto subscribeSubTrigger", () => {
  it("explicitly marks keyword grants as continuous even without a per-turn budget", async () => {
    const source = fakeSource("inst-keyword");
    const grantKeyword = vi.fn();
    const effect = staticModifier({
      source,
      effectKey: "TEST-001/static-keyword",
      description: "[Your Turn] test keyword",
      resolve: async (ctx) => {
        ctx.fx.grantKeyword("P1", "SecurityAttack", EffectDuration.Permanent, 1);
      },
    });
    const ctx = fakeCtx(source, () => 0);
    ctx.fx.grantKeyword = grantKeyword;

    await effect.resolve(ctx);

    expect(grantKeyword).toHaveBeenCalledWith("P1", "SecurityAttack", EffectDuration.Permanent, 1, {
      continuous: true,
    });
  });

  it("injects a stable key when maxPerTurn is set and the card supplies none", async () => {
    const installed: SubTriggerInstall[] = [];
    const source = fakeSource("inst-1");
    const effect = staticModifier({
      source,
      effectKey: "TEST-001/watcher",
      description: "[All Turns] [Once Per Turn] test watcher",
      maxPerTurn: 1,
      resolve: async (ctx) => {
        ctx.fx.subscribeSubTrigger({
          event: "whenAttacking",
          sourcePermanentId: "P1",
          once: false,
          description: "test",
          run: async () => {},
        });
      },
    });
    const subscribeSubTrigger = vi.fn((sub: SubTriggerInstall) => {
      installed.push(sub);
      return 0;
    });
    await effect.resolve(fakeCtx(source, subscribeSubTrigger));

    expect(installed).toHaveLength(1);
    expect(installed[0]!.oncePerTurnKey).toBe("inst-1/TEST-001/watcher");
  });

  it("is stable across two resolves with a DIFFERENT sub-installer id each time (recompute reinstall)", async () => {
    const keys: (string | undefined)[] = [];
    const source = fakeSource("inst-2");
    const effect = staticModifier({
      source,
      effectKey: "TEST-001/watcher",
      description: "[All Turns] [Once Per Turn] test watcher",
      maxPerTurn: 1,
      resolve: async (ctx) => {
        ctx.fx.subscribeSubTrigger({
          event: "whenAttacking",
          sourcePermanentId: "P1",
          once: false,
          description: "test",
          run: async () => {},
        });
      },
    });
    let nextId = 100;
    const subscribeSubTrigger = (sub: SubTriggerInstall) => {
      keys.push(sub.oncePerTurnKey);
      return nextId++; // a fresh subscription id each recompute pass, like the real registry
    };
    await effect.resolve(fakeCtx(source, subscribeSubTrigger));
    await effect.resolve(fakeCtx(source, subscribeSubTrigger));

    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]); // same STRING key both passes, despite the different install ids above
  });

  it("does not override an explicit oncePerTurnKey the card already supplies", async () => {
    const installed: SubTriggerInstall[] = [];
    const source = fakeSource("inst-3");
    const effect = staticModifier({
      source,
      effectKey: "TEST-001/watcher",
      description: "[All Turns] [Once Per Turn] test watcher",
      maxPerTurn: 1,
      resolve: async (ctx) => {
        ctx.fx.subscribeSubTrigger({
          event: "whenAttacking",
          sourcePermanentId: "P1",
          once: false,
          description: "test",
          oncePerTurnKey: "TEST-001/custom-key",
          run: async () => {},
        });
      },
    });
    const subscribeSubTrigger = (sub: SubTriggerInstall) => {
      installed.push(sub);
      return 0;
    };
    await effect.resolve(fakeCtx(source, subscribeSubTrigger));

    expect(installed[0]!.oncePerTurnKey).toBe("TEST-001/custom-key");
  });

  it("threads the same physical-source budget onto a prevent replacement", async () => {
    const installed: ReplacementInstall[] = [];
    const source = fakeSource("inst-prevent");
    const effect = staticModifier({
      source,
      effectKey: "TEST-001/prevent-leave",
      description: "[All Turns] [Once Per Turn] prevent leaving",
      maxPerTurn: 1,
      resolve: async (ctx) => {
        ctx.fx.subscribeReplacement({
          event: "wouldLeavePlay",
          mode: "prevent",
          sourcePermanentId: "P1",
          description: "test prevent",
          preventCheck: async () => true,
        });
      },
    });
    const ctx = fakeCtx(source, () => 0);
    ctx.fx.subscribeReplacement = (replacement) => {
      installed.push(replacement);
      return 0;
    };

    await effect.resolve(ctx);

    expect(installed[0]!.oncePerTurnKey).toBe("inst-prevent/TEST-001/prevent-leave");
  });

  it("leaves subscribeSubTrigger untouched when maxPerTurn is not set (no forced budget on an unlimited [All Turns] watcher)", async () => {
    const installed: SubTriggerInstall[] = [];
    const source = fakeSource("inst-4");
    const effect = staticModifier({
      source,
      effectKey: "TEST-001/unlimited-watcher",
      description: "[All Turns] test watcher with no per-turn cap",
      resolve: async (ctx) => {
        ctx.fx.subscribeSubTrigger({
          event: "whenAttacking",
          sourcePermanentId: "P1",
          once: false,
          description: "test",
          run: async () => {},
        });
      },
    });
    const subscribeSubTrigger = (sub: SubTriggerInstall) => {
      installed.push(sub);
      return 0;
    };
    await effect.resolve(fakeCtx(source, subscribeSubTrigger));

    expect(installed[0]!.oncePerTurnKey).toBeUndefined();
  });

  it("REGRESSION: pre-fix shape (no wrapper) lets a maxPerTurn watcher install with no key at all", async () => {
    // This test intentionally bypasses staticModifier's wrapper to document the exact
    // bug it fixes: a resolve() that calls ctx.fx.subscribeSubTrigger directly (as every
    // pre-fix card did) with no oncePerTurnKey installs an unbudgeted watcher even though
    // the hosting effect declares maxPerTurn. If this test ever fails, either the shape
    // it documents no longer compiles (good — even stronger) or something changed in a
    // way that needs re-reading.
    const installed: SubTriggerInstall[] = [];
    const rawResolve = async (ctx: EffectContext) => {
      ctx.fx.subscribeSubTrigger({
        event: "whenAttacking",
        sourcePermanentId: "P1",
        once: false,
        description: "test",
        run: async () => {},
      });
    };
    const subscribeSubTrigger = (sub: SubTriggerInstall) => {
      installed.push(sub);
      return 0;
    };
    await rawResolve(fakeCtx(fakeSource("inst-5"), subscribeSubTrigger));
    expect(installed[0]!.oncePerTurnKey).toBeUndefined();
  });
});

/**
 * Comprehensive Rules §3-4-5-6 (comprehensive-0061): "Trigger conditions can't be met by cards
 * in breeding areas, except for effects that explicitly specify or reference breeding areas."
 * The guard lives in the shared `build()` wrapper, so every timing builder inherits it; the
 * matching watcher-side guard is GameEngine.breedingHidesSubjectFrom (covered end to end by
 * EX11-066's test and the §3-4-5-6 conformance case).
 */
describe("timing builders: a breeding-area subject can't meet another card's trigger condition", () => {
  const subjectCtx = (source: CardSource, subjectInBreeding: boolean): EffectContext => ({
    source,
    trigger: { subjectPermanentId: "P-subject" } as EffectContext["trigger"],
    game: {
      permanentById: (permanentId: string) =>
        permanentId === "P-subject" ? ({ inBreeding: subjectInBreeding } as never) : undefined,
    } as unknown as EffectContext["game"],
    ask: {} as EffectContext["ask"],
    fx: {} as EffectContext["fx"],
  });

  const observer = (source: CardSource) =>
    turnTiming({
      source,
      effectKey: "TEST-001/observer",
      description: "[All Turns] When your Digimon digivolves, ...",
      resolve: async () => {},
    });

  it("triggers on a battle-area subject", () => {
    const source = fakeSource("inst-observer");
    expect(observer(source).canTrigger(subjectCtx(source, false))).toBe(true);
  });

  it("does not trigger on a breeding-area subject", () => {
    const source = fakeSource("inst-observer");
    expect(observer(source).canTrigger(subjectCtx(source, true))).toBe(false);
  });

  it("still triggers for a [Breeding] effect, which sits in the breeding area itself", () => {
    const source: CardSource = {
      ...fakeSource("inst-breeding-observer"),
      isOnBattleArea: () => false,
      isOnBreedingArea: () => true,
    };
    const breedingEffect = breeding({
      source,
      effectKey: "TEST-001/breeding-observer",
      description: "[Breeding] ...",
      resolve: async () => {},
    });
    expect(breedingEffect.canTrigger(subjectCtx(source, true))).toBe(true);
  });
});
