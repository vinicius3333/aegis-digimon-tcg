import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-092.js";

// A3 for BT13-092 Ravemon: Burst Mode.
//
// Primary observable: the [When Attacking] effect is registered at OnAllyAttack (not as
// a raw/inert stub). Previously the IR had a `condition.kind:"raw"` that never evaluated,
// meaning the same-name delete was always inert. The hand-written module provides a real
// canActivate + resolve that tracks the name of the returned card.
//
// FAILS-WHEN-REVERTED: if the hand-written EffectModule is removed and the IR stub is
// restored, EffectTiming.OnAllyAttack returns 0 effects (the IR maps "WhenAttacking" to
// OnAllyAttack but the raw condition makes it inert and the IR doesn't emit a hand-written
// EffectModule for that timing). With the hand-written module, OnAllyAttack returns exactly
// 1 effect keyed "BT13-092/when-attacking" with optional=true.

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT13-092",
    set: "BT13",
    nameEn: "Ravemon: Burst Mode",
    kinds: ["Digimon"] as never,
    colors: ["Purple"] as never,
    playCost: 0,
    dp: 15000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "INST#RBM",
    cardId: "BT13-092",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT13-092 Ravemon: Burst Mode — [When Attacking] delete same-named Digimon", () => {
  const module = getEffectModule("BT13-092");

  it("registers on import", () => {
    expect(module, "BT13-092 must self-register on import").toBeDefined();
  });

  it("[When Attacking] is a real effect at OnAllyAttack (not inert IR stub)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnAllyAttack, source);
    // Previously the IR produced this timing via the interpreter but with a raw condition
    // (never true). The hand-written module produces exactly 1 explicit effect.
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe("BT13-092/when-attacking");
  });

  it("[When Attacking] is optional (player may decline)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnAllyAttack, source);
    expect(effects[0]!.optional).toBe(true);
  });

  it("[When Digivolving] is registered at WhenDigivolving", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe("BT13-092/when-digivolving");
    expect(effects[0]!.optional).toBe(false);
  });

  it("trashes an opponent hand card, then adds security when the post-trash hand has 7 or fewer cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-092", as: "ravemon" }] },
        1: {
          hand: [
            { card: "BT13-001" },
            { card: "BT13-002" },
            { card: "BT13-003" },
            { card: "BT13-004" },
            { card: "BT13-005" },
            { card: "BT13-006" },
            { card: "BT13-007" },
            { card: "BT13-008" },
          ],
          security: [{ card: "BT13-009" }],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ravemon"));
    await settle(() => s.state.players[1]!.hand.length === 8);

    expect(s.state.players[1]!.hand).toHaveLength(8);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
});
