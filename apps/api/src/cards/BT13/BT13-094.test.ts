import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT13-094.js";

// A3 for BT13-094 Kristy Damon (Red Tamer).
//
// Primary observable: the [On Play] effect is now registered at EffectTiming.OnPlay
// (not as a raw/inert RawUnparsed action). Previously the IR stub had the [On Play]
// clause as a single RawUnparsed action with no real resolve, meaning the grant-on-deletion
// watcher was never installed. The hand-written module registers a real OnPlay effect that,
// on resolve, calls subscribeSubTrigger for the chosen Digimon.
//
// FAILS-WHEN-REVERTED: if the hand-written EffectModule is removed and the IR stub is
// restored, EffectTiming.OnPlay returns 0 real effects from the EffectModule registry
// (the IR registerIrCard does NOT register into the same registry as registerCard).

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT13-094",
    set: "BT13",
    nameEn: "Kristy Damon",
    kinds: ["Tamer"] as never,
    colors: ["Red"] as never,
    playCost: 4,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "INST#KRISTY",
    cardId: "BT13-094",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT13-094 Kristy Damon — [On Play] grant [On Deletion] Biyomon-play effect", () => {
  const module = getEffectModule("BT13-094");

  it("registers on import", () => {
    expect(module, "BT13-094 must self-register on import").toBeDefined();
  });

  it("[On Play] is registered at OnPlay (not inert RawUnparsed)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    // Previously the IR produced a RawUnparsed stub that did nothing.
    // The hand-written module returns exactly 1 real effect.
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe("BT13-094/on-play-grant-on-deletion");
  });

  it("[On Play] is not optional (mandatory if canActivate)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    expect(effects[0]!.optional).toBe(false);
  });

  it("[Start of Your Main Phase] is registered at OnStartMainPhase", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnStartMainPhase, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe("BT13-094/start-main-phase-memory");
  });

  it("[Security] is registered at SecuritySkill", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.isSecurity).toBe(true);
  });
});
