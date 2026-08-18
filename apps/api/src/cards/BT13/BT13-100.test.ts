import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT13-100.js";

// A3 for BT13-100 Yoshino Fujieda (Green Tamer).
//
// Primary observable: the [Your Turn] sub-trigger for "when a Vegetation/Plant/Fairy
// Digimon digivolves" is now registered at OnEnterFieldAnyone (not as a partial RawUnparsed).
// Previously the IR had the trait filter only for "Vegetation" and the "Plant" / "Fairy"
// part was a RawUnparsed that never resolved — making the trigger fire for any Vegetation
// Digimon but fail the Plant/Fairy condition check (the raw condition never evaluated true).
//
// The hand-written module registers a staticModifier at OnEnterFieldAnyone that installs
// a whenOneOfYoursDigivolves sub-trigger with the correct 3-trait filter.
//
// FAILS-WHEN-REVERTED: if the hand-written EffectModule is removed and the IR stub is
// restored, EffectTiming.OnEnterFieldAnyone returns 0 real effects from the EffectModule
// registry (registerIrCard vs registerCard).

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT13-100",
    set: "BT13",
    nameEn: "Yoshino Fujieda",
    kinds: ["Tamer"] as never,
    colors: ["Green"] as never,
    playCost: 3,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "INST#YOSHINO",
    cardId: "BT13-100",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT13-100 Yoshino Fujieda — [Your Turn] Vegetation/Plant/Fairy digivolve trigger", () => {
  const module = getEffectModule("BT13-100");

  it("registers on import", () => {
    expect(module, "BT13-100 must self-register on import").toBeDefined();
  });

  it("[Your Turn] digivolve sub-trigger is registered at OnEnterFieldAnyone (not inert IR)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source);
    // Previously the IR had this partially (sub-trigger with RawUnparsed for Plant/Fairy).
    // The hand-written module registers a real staticModifier here.
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe("BT13-100/your-turn-digivolve-trigger");
  });

  it("[Start of Your Turn] set memory to 3 is registered", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnStartTurn, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe("BT13-100/start-turn-set-memory");
  });

  it("[Security] is registered at SecuritySkill", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.isSecurity).toBe(true);
  });
});
