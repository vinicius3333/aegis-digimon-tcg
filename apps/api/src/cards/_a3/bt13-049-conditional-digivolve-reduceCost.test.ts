import { describe, it, expect } from "vitest";
import {
  CardKind,
  CardColor,
  EffectTiming,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";

// Import the compiled IR so it self-registers on the registry.
import "../BT13/BT13-049.js";

// ---------------------------------------------------------------------------
// BT13-049 conditional digivolve-cost reduction A3
//
// BT13-049's [Your Turn] ability reduces its OWN digivolution cost by 1 "if you have
// a green Tamer", compiled as a nested `Replacement{mode:"reduceCost", condition:youHave}`
// hoisted under an outer `wouldDigivolve` Replacement wrapper. `runReplacement`'s
// nestedReduceCost heuristic (interpreter.ts) hoists the nested action's mode/amount to
// install the cost-reduction subscription but used to DROP the nested action's own
// `condition` — installing the discount UNCONDITIONALLY regardless of whether a green
// Tamer is actually in play.
//
// FAILS-WHEN-REVERTED LEVER:
//   If the `nestedReduceCost.condition` guard is removed from runReplacement, this test's
//   "WITHOUT a green Tamer" case installs the reduceCost subscription anyway (subs.length
//   becomes 1 with amount:1 instead of 0 subscriptions) — RED.
// ---------------------------------------------------------------------------

function fakeDefinition(cardId: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: [CardKind.Digimon],
    colors: [],
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakeCardInstance(cardId: string, instanceId: string): CardInstance {
  return { cardId, instanceId, ownerSeat: 0 as Seat, faceUp: true } as never;
}

function fakePermanent(permanentId: string, topCardId: string): Permanent {
  return {
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: fakeCardInstance(topCardId, "top-" + permanentId),
    stack: [],
    linked: [],
    baseDP: 5000,
    currentDP: 5000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(cardId: string, permanent: Permanent | undefined): CardSource {
  return {
    instanceId: "INST#" + cardId,
    cardId,
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(cardId),
    permanent: () => permanent,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

async function runYourTurnReduceCost(opts: { withGreenTamer: boolean }) {
  const selfPerm = fakePermanent("perm-bt13-049", "BT13-049");
  const tamerPerm = fakePermanent("perm-tamer", "SOME-GREEN-TAMER");

  const battleArea = opts.withGreenTamer ? [selfPerm, tamerPerm] : [selfPerm];

  const players = [
    { seat: 0 as Seat, battleArea, security: [], hand: [], deck: [], trash: [] },
    { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 0, players, turnSeat: 0 } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) =>
      [...players[0]!.battleArea, ...players[1]!.battleArea].find((p) => p.permanentId === id) as never,
    definitionOf: (card: CardInstance): CardDefinition => {
      if (card.cardId === "SOME-GREEN-TAMER") {
        return fakeDefinition("SOME-GREEN-TAMER", { kinds: [CardKind.Tamer], colors: [CardColor.Green] });
      }
      return fakeDefinition(card.cardId);
    },
  };

  const subscribeCalls: Record<string, unknown>[] = [];
  const fx = {
    subscribeReplacement: (sub: Record<string, unknown>) => {
      subscribeCalls.push(sub);
      return subscribeCalls.length;
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  const source = makeSource("BT13-049", selfPerm);
  const ctx: EffectContext = { source, trigger: {}, game, fx, ask };

  const module = getEffectModule("BT13-049");
  expect(module, "BT13-049 must self-register on import").toBeDefined();
  // "YourTurn" is a continuous/static trigger — timingForTrigger maps it to EffectTiming.None.
  const effects = module!.effectsForTiming(EffectTiming.None, source);
  expect(effects.length, "BT13-049 must expose a [Your Turn] reduceCost effect").toBeGreaterThanOrEqual(1);
  for (const effect of effects) await effect.resolve(ctx);

  return subscribeCalls;
}

describe("BT13-049 conditional digivolve-cost reduceCost A3", () => {
  it("installs the reduceCost subscription WITH a green Tamer in play", async () => {
    const subs = await runYourTurnReduceCost({ withGreenTamer: true });
    const reduceCostSubs = subs.filter((s) => s.mode === "reduceCost");
    expect(reduceCostSubs).toHaveLength(1);
    expect(reduceCostSubs[0]!.amount).toBe(1);
  });

  // FAILS-WHEN-REVERTED: without the nestedReduceCost.condition guard, this installs the
  // reduceCost subscription anyway — the discount would apply with no green Tamer present.
  it("does NOT install the reduceCost subscription WITHOUT a green Tamer in play", async () => {
    const subs = await runYourTurnReduceCost({ withGreenTamer: false });
    const reduceCostSubs = subs.filter((s) => s.mode === "reduceCost");
    expect(reduceCostSubs).toHaveLength(0);
  });
});
