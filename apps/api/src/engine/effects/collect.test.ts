import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine } from "../testkit/harness.js";
import { createCardSource } from "../cards/CardSource.js";
import { effectsOf, collectTriggeredEffects } from "./collect.js";
import { UseTracker } from "./kernel.js";
import {
  createGameAccess,
  createCardStateLookup,
  createEffectContext,
  unimplementedPrimitives,
  unimplementedDecisions,
  gatherTriggeredEffects,
} from "./context.js";
import { ContinuousEffectLedger } from "./continuous.js";
import type { CardSource } from "./CardSource.js";
import type { Effect } from "./Effect.js";
import type { EffectContext, TriggerInfo } from "./EffectContext.js";

// Importing the cards barrel registers the example EffectModules as a side effect
// (card-module contract) — the same path apps/api/src/index.ts uses at boot.
import "../../cards/index.js";

describe("effectsOf (single card)", () => {
  it("returns the effects a registered module contributes at a timing", () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-089", as: "card" }] } });
    const lookup = createCardStateLookup(s.state);
    const source = createCardSource(s.inst("card"), lookup);

    // BT7-089 contributes a Security effect at SecuritySkill.
    const sec = effectsOf(EffectTiming.SecuritySkill, source);
    expect(sec).toHaveLength(1);
    expect(sec[0]?.effectKey).toBe("BT7-089/ir-26-0");
    expect(sec[0]?.isSecurity).toBe(true);

    // ...its static modifiers at None, including the inherited Piercing provider...
    const stat = effectsOf(EffectTiming.None, source);
    expect(stat.map((e) => e.effectKey)).toEqual(["BT7-089/ir-35-0", "BT7-089/ir-35-1"]);
    expect(stat.find((effect) => effect.effectKey === "BT7-089/ir-35-1")?.isInherited).toBe(true);

    // Piercing is continuous, not a security-check timing effect.
    expect(effectsOf(EffectTiming.OnDetermineDoSecurityCheck, source)).toEqual([]);

    // ...and nothing at an unrelated timing.
    expect(effectsOf(EffectTiming.OnDraw, source)).toEqual([]);
  });

  it("returns [] for an un-implemented card (no module registered) instead of throwing", () => {
    // A real card id that exists in the data table but has no EffectModule implemented.
    const s = setupEngine({ 0: { hand: [{ card: "BT1-001", as: "card" }] } });
    const lookup = createCardStateLookup(s.state);
    const source = createCardSource(s.inst("card"), lookup);
    expect(effectsOf(EffectTiming.OnPlay, source)).toEqual([]);
  });
});

describe("collectTriggeredEffects (kernel canTrigger applied)", () => {
  it("keeps the BT7-089 static effect only when on the controller's battle area on their turn", () => {
    // Put BT7-089 as the top card of a battle-area permanent controlled by seat 0.
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-089", as: "perm" }] } });
    s.state.turnSeat = 0;

    const lookup = createCardStateLookup(s.state);
    const gameAccess = createGameAccess(s.state);
    const source = createCardSource(s.perm("perm").topCard, lookup);
    const makeContext = (src: CardSource, _e: Effect): EffectContext =>
      createEffectContext({
        source: src,
        trigger: {},
        game: gameAccess,
        fx: unimplementedPrimitives(),
        ask: unimplementedDecisions(),
      });

    const onTurn = collectTriggeredEffects(EffectTiming.None, [source], makeContext, new UseTracker());
    expect(onTurn.map((c) => c.effect.effectKey)).toEqual(["BT7-089/ir-35-0", "BT7-089/ir-35-1"]);

    // On the opponent's turn the `when` guard (isOwnersTurn) fails -> not collected.
    s.state.turnSeat = 1;
    const offTurn = collectTriggeredEffects(EffectTiming.None, [source], makeContext, new UseTracker());
    expect(offTurn.map((c) => c.effect.effectKey)).toEqual(["BT7-089/ir-35-1"]);
  });

  it("respects maxPerTurn across collection (BT15-002 once-per-turn)", () => {
    // BT15-002 inherited effect: source must be a STACK card under a Digimon top,
    // on its owner's turn, with addedToHand caused by the owner's Digimon effect.
    // BT7-089 is any Digimon top card.
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-089", as: "top", under: [{ card: "BT15-002", as: "ess" }] }] },
    });
    s.state.turnSeat = 0;

    const lookup = createCardStateLookup(s.state);
    const gameAccess = createGameAccess(s.state);
    const source = createCardSource(s.inst("ess"), lookup);

    const trigger: TriggerInfo = {
      addedToHand: { instanceIds: ["x#1"], byEffect: { ownerSeat: 0, isDigimonEffect: true } },
    };
    const makeContext = (src: CardSource, _e: Effect): EffectContext =>
      createEffectContext({
        source: src,
        trigger,
        game: gameAccess,
        fx: unimplementedPrimitives(),
        ask: unimplementedDecisions(),
      });

    const tracker = new UseTracker();
    const first = collectTriggeredEffects(EffectTiming.OnAddHand, [source], makeContext, tracker);
    expect(first.map((c) => c.effect.effectKey)).toEqual(["BT15-002/ir-5-0"]);

    // Record a use; the once-per-turn effect should no longer trigger.
    tracker.register(source.instanceId, "BT15-002/ir-5-0");
    const second = collectTriggeredEffects(EffectTiming.OnAddHand, [source], makeContext, tracker);
    expect(second).toEqual([]);
  });

  it("does NOT collect BT15-002 when the add-to-hand was not caused by the owner's Digimon effect", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-089", as: "top", under: [{ card: "BT15-002", as: "ess" }] }] },
    });
    s.state.turnSeat = 0;

    const lookup = createCardStateLookup(s.state);
    const gameAccess = createGameAccess(s.state);
    const source = createCardSource(s.inst("ess"), lookup);
    // byEffect undefined => the `when` predicate is false.
    const makeContext = (src: CardSource, _e: Effect): EffectContext =>
      createEffectContext({
        source: src,
        trigger: {},
        game: gameAccess,
        fx: unimplementedPrimitives(),
        ask: unimplementedDecisions(),
      });

    expect(collectTriggeredEffects(EffectTiming.OnAddHand, [source], makeContext, new UseTracker())).toEqual([]);
  });
});

describe("gatherTriggeredEffects (full instance -> source -> collection chain)", () => {
  it("builds sources from instances and collects triggered effects", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-089", as: "perm" }] } });
    s.state.turnSeat = 0;
    const card = s.perm("perm").topCard;

    const collected = gatherTriggeredEffects(
      {
        state: s.state,
        fx: unimplementedPrimitives(),
        ask: unimplementedDecisions(),
        tracker: new UseTracker(),
        continuous: new ContinuousEffectLedger(),
      },
      EffectTiming.None,
      [card],
    );
    expect(collected.map((c) => c.effect.effectKey)).toEqual(["BT7-089/ir-35-0", "BT7-089/ir-35-1"]);
    expect(collected[0]?.source.cardId).toBe("BT7-089");
  });
});

describe("createGameAccess / createCardStateLookup", () => {
  it("resolves a permanent's top card placement and turn ownership", () => {
    const s = setupEngine({
      1: { battleArea: [{ card: "BT7-089", as: "top", under: [{ card: "BT15-002", as: "ess" }] }] },
    });
    s.state.turnSeat = 1;
    const permanentId = s.perm("top").permanentId;
    const topId = s.perm("top").topCard.instanceId;
    const essId = s.inst("ess").instanceId;

    const lookup = createCardStateLookup(s.state);
    expect(lookup.permanentOf(topId)?.permanentId).toBe(permanentId);
    expect(lookup.permanentOf(essId)?.permanentId).toBe(permanentId); // stack card resolves too
    expect(lookup.isOnBattleArea(topId)).toBe(true);
    expect(lookup.isOnBattleArea("missing#1")).toBe(false);
    expect(lookup.isSeatsTurn(1)).toBe(true);
    expect(lookup.isSeatsTurn(0)).toBe(false);

    const access = createGameAccess(s.state);
    expect(access.opponentOf(1)).toBe(0);
    expect(access.permanentById(permanentId)?.controllerSeat).toBe(1);
    expect(access.definitionOf(s.perm("top").topCard).cardId).toBe("BT7-089");
  });

  it("treats a breeding-area permanent as not on the battle area", () => {
    const s = setupEngine({ 0: { breeding: { card: "BT7-089", as: "egg" } } });
    const eggId = s.perm("egg").topCard.instanceId;

    const lookup = createCardStateLookup(s.state);
    expect(lookup.permanentOf(eggId)?.permanentId).toBe(s.perm("egg").permanentId);
    expect(lookup.isOnBattleArea(eggId)).toBe(false); // in breeding, not battle area
  });
});

describe("unimplemented seams fail loudly", () => {
  it("primitives throw a clear, subsystem-attributed error", () => {
    const fx = unimplementedPrimitives();
    expect(() => fx.gainMemory(1)).toThrow(/effect-primitives not implemented: gainMemory/);
  });
  it("decisions throw a clear, subsystem-attributed error", async () => {
    const ask = unimplementedDecisions();
    const ctx = {} as EffectContext;
    expect(() => ask.optional(ctx, "?")).toThrow(/effect-stack-resolution not implemented: ask.optional/);
  });
});
