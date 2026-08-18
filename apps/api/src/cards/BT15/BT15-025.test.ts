import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import "./BT15-025.js";

// A3 for BT15-025 (Seadramon) — Blue Lv.3 Digimon.
//
// [Static] ＜Rush＞ (non-inherited)
// [Static][Inherited] ＜Jamming＞
//
// documented behavior:
//
// FAILS-WHEN-REVERTED: remove the staticModifier returns from BT15-025.ts and
// grantKeyword is never called for Rush or Jamming, so neither keyword is granted.

interface Call {
  verb: string;
  args: unknown[];
}

function makeSource(permanentId = "PERM#sea"): CardSource {
  return {
    instanceId: "INST#BT15-025",
    cardId: "BT15-025",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "BT15-025",
      set: "BT15",
      nameEn: "Seadramon",
      kinds: ["Digimon"],
      colors: ["Blue"],
      playCost: 3,
      dp: 3000,
      evoCosts: [],
      maxCountInDeck: 4,
    } as never,
    permanent: () => ({
      permanentId,
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "INST#BT15-025", cardId: "BT15-025", ownerSeat: 0 as Seat },
      isSuspended: false,
      stack: [],
    } as never),
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeContext(recorder: { calls: Call[] }, source: CardSource) {
  const fx = new Proxy({} as Primitives, {
    get: (_, verb: string) =>
      (...args: unknown[]) => {
        recorder.calls.push({ verb, args });
      },
  });
  return {
    source,
    trigger: {},
    game: {} as never,
    fx,
    ask: {} as never,
  };
}

describe("BT15-025 Seadramon — static Rush + inherited Jamming keyword grants", () => {
  const module = getEffectModule("BT15-025");

  it("is registered", () => {
    expect(module, "BT15-025 must self-register on import").toBeDefined();
  });

  it("returns two effects at EffectTiming.None (Rush + Jamming) and none at other timings", () => {
    const source = makeSource();
    const noneEffects = module!.effectsForTiming(EffectTiming.None, source);
    expect(noneEffects).toHaveLength(2);
    // No effects at other timings.
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.OnEndTurn, source)).toHaveLength(0);
  });

  it("Rush effect is not inherited", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    const rush = effects.find((e) => e.effectKey?.includes("rush"));
    expect(rush, "Rush effect must exist").toBeDefined();
    expect(rush!.isInherited).toBe(false);
  });

  it("Jamming effect is inherited", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    const jamming = effects.find((e) => e.effectKey?.includes("jamming"));
    expect(jamming, "Jamming effect must exist").toBeDefined();
    expect(jamming!.isInherited).toBe(true);
  });

  it("resolving Rush effect calls grantKeyword(permanentId, 'Rush', UntilEachTurnEnd)", async () => {
    const source = makeSource("PERM#sea");
    const recorder: { calls: Call[] } = { calls: [] };
    const ctx = makeContext(recorder, source);

    const effects = module!.effectsForTiming(EffectTiming.None, source);
    const rush = effects.find((e) => e.effectKey?.includes("rush"));
    expect(rush, "Rush effect must exist").toBeDefined();

    await rush!.resolve(ctx as never);

    const call = recorder.calls.find((c) => c.verb === "grantKeyword" && c.args[1] === "Rush");
    expect(call, "grantKeyword('Rush') must be called").toBeDefined();
    expect(call!.args[0]).toBe("PERM#sea");
    expect(call!.args[2]).toBe(EffectDuration.UntilEachTurnEnd);
  });

  it("resolving Jamming effect calls grantKeyword(permanentId, 'Jamming', UntilEachTurnEnd)", async () => {
    const source = makeSource("PERM#sea");
    const recorder: { calls: Call[] } = { calls: [] };
    const ctx = makeContext(recorder, source);

    const effects = module!.effectsForTiming(EffectTiming.None, source);
    const jamming = effects.find((e) => e.effectKey?.includes("jamming"));
    expect(jamming, "Jamming effect must exist").toBeDefined();

    await jamming!.resolve(ctx as never);

    const call = recorder.calls.find((c) => c.verb === "grantKeyword" && c.args[1] === "Jamming");
    expect(call, "grantKeyword('Jamming') must be called").toBeDefined();
    expect(call!.args[0]).toBe("PERM#sea");
    expect(call!.args[2]).toBe(EffectDuration.UntilEachTurnEnd);
  });

  it("does not call grantKeyword when not on the battle area (canTrigger guard)", () => {
    // canTrigger checks source.isOnBattleArea() — when off-field, resolve is never called.
    // The effect is gated at the canTrigger level so this test verifies the guard exists.
    const source: CardSource = { ...makeSource(), isOnBattleArea: () => false, permanent: () => undefined };
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    // Both effects exist but their canTrigger returns false when off-field.
    for (const effect of effects) {
      const triggered = effect.canTrigger({ source } as never);
      expect(triggered, `${effect.effectKey} must not trigger off-field`).toBe(false);
    }
  });
});
