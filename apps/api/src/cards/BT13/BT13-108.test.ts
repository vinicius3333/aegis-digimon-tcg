import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-108.js";

// A3 for BT13-108 Waltz's End (Black Option).
//
// Primary observable: the [Main] Option effect is registered at EffectTiming.OnUseOption
// (not as a RawUnparsed stub). Previously the IR had only a RawUnparsed action for the
// [Main] clause, meaning neither the suspension-delete nor the Option-immunity grant was
// installed. The hand-written module provides both effects via subscribeSubTrigger (for
// the when-suspended delete) and restrict(..., "beAffected", ..., {fromSourceKind:["Option"]})
// for the Option immunity.
//
// FAILS-WHEN-REVERTED: if the hand-written EffectModule is removed and the IR stub is
// restored, EffectTiming.OnUseOption returns 0 real effects from the EffectModule registry.

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT13-108",
    set: "BT13",
    nameEn: "Waltz's End",
    kinds: ["Option"] as never,
    colors: ["Black"] as never,
    playCost: 5,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "INST#WALTZ",
    cardId: "BT13-108",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT13-108 Waltz's End — [Main] grant suspension-delete + Option immunity", () => {
  const module = getEffectModule("BT13-108");

  it("registers on import", () => {
    expect(module, "BT13-108 must self-register on import").toBeDefined();
  });

  it("[Main] is a real effect at OnUseOption (not inert RawUnparsed)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    // Previously the IR returned a RawUnparsed that did nothing.
    // The hand-written module returns exactly 1 activated effect at OnUseOption.
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe("BT13-108/main-grant-effects");
  });

  it("[Main] effect is not optional", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(effects[0]!.optional).toBe(false);
  });

  it("[Security] delete lowest play cost is registered", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.isSecurity).toBe(true);
    expect(effects[0]!.effectKey).toBe("BT13-108/security-delete-lowest");
  });

  it("[Security] deletes one of the opponent's Digimon with the lowest play cost", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT13-108", as: "waltz", faceUp: true }] },
        1: {
          battleArea: [
            { card: "AD1-001", as: "cheap" },
            { card: "AD1-004", as: "expensive" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    const cheapId = s.perm("cheap").permanentId;
    const expensiveId = s.perm("expensive").permanentId;
    s.state.turnSeat = 1;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("waltz"));
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === cheapId));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === cheapId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === expensiveId)).toBe(true);
  });
});
