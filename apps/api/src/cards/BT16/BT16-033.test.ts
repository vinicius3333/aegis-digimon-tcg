import { describe, it, expect } from "vitest";
import { EffectTiming, CardKind, CardColor, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT16-033.js";

// BT16-033 — Harpymon (Yellow Lv.4 Digimon).
//
// Implementable clause: <Armor Purge> static keyword (EffectTiming.None).
// Engine-gap residual: [Your Turn] OnSecurityCheck branches (memory gain /
// Recovery +1) cannot be implemented — the engine fires no event for the
// security-attack check window.

function makeSource(overrides: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#BT16-033",
    cardId: "BT16-033",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "BT16-033",
      set: "BT16",
      nameEn: "Harpymon",
      kinds: [CardKind.Digimon],
      colors: [CardColor.Yellow],
      playCost: 5,
      dp: 5000,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: (c) => c === CardColor.Yellow,
    ...overrides,
  };
}

describe("BT16-033 Harpymon", () => {
  const module = getEffectModule("BT16-033");

  it("is registered", () => {
    expect(module, "BT16-033 must self-register on import").toBeDefined();
  });

  it("has cardId BT16-033", () => {
    expect(module!.cardId).toBe("BT16-033");
  });

  // <Armor Purge> is a static keyword routed to EffectTiming.None.
  it("exposes exactly one effect at EffectTiming.None (Armor Purge)", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });

  it("Armor Purge effect key contains 'armor-purge'", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    expect(effects[0]?.effectKey).toContain("armor-purge");
  });

  // No effects at timings this card does not implement.
  it("returns no effects at OnPlay", () => {
    expect(module!.effectsForTiming(EffectTiming.OnPlay, makeSource())).toHaveLength(0);
  });

  it("returns no effects at OnSecurityCheck (security-check window is engine-gap residual)", () => {
    expect(module!.effectsForTiming(EffectTiming.OnSecurityCheck, makeSource())).toHaveLength(0);
  });

  it("returns no effects at WhenDigivolving", () => {
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())).toHaveLength(0);
  });
});
