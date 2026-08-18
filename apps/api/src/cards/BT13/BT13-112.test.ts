import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT13-112.js";

// A3 for BT13-112 Omnimon (BT13, White Lv.7 Digimon).
//
// Primary observable: the [On Play] and [When Digivolving] effects are registered as real
// EffectModule effects (not IR stubs). Previously, the IR had a Modal with one branch being
// a RawUnparsed (the "play Royal Knights from breeding" option) — this branch was inert.
// The hand-written module provides both branches:
//   (a) Delete 1 opponent's Digimon (fully addressable).
//   (b) Play Royal Knight Digimon from breeding digivolution cards using playInstances
//       (now implemented — playInstances can reach digivolution stack cards).
//
// FAILS-WHEN-REVERTED: if the hand-written EffectModule is removed and the IR stub is
// restored, EffectTiming.OnPlay returns 0 real effects from the EffectModule registry
// (registerIrCard vs registerCard).

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT13-112",
    set: "BT13",
    nameEn: "Omnimon",
    kinds: ["Digimon"] as never,
    colors: ["White"] as never,
    playCost: 15,
    dp: 15000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "INST#OMNIMON",
    cardId: "BT13-112",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT13-112 Omnimon — [On Play][When Digivolving] delete or play Royal Knights", () => {
  const module = getEffectModule("BT13-112");

  it("registers on import", () => {
    expect(module, "BT13-112 must self-register on import").toBeDefined();
  });

  it("[On Play] is a real effect at OnPlay (not inert IR stub)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    // Previously the IR registered via registerIrCard (not registerCard), so
    // getEffectModule returned undefined. The hand-written module returns 1 real effect.
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe("BT13-112/on-play");
  });

  it("[On Play] is optional (player may decline both branches)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    expect(effects[0]!.optional).toBe(true);
  });

  it("[When Digivolving] is a real effect at WhenDigivolving", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe("BT13-112/when-digivolving");
    expect(effects[0]!.optional).toBe(true);
  });

  it("no effects at SecuritySkill (not a security card)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effects).toHaveLength(0);
  });
});
