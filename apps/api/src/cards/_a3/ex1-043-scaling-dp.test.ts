import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";

// Import the override so it self-registers on the registry.
import "../EX1/EX1-043.js";

// ---------------------------------------------------------------------------
// EX1-043 Kuwagamon scaling-DP A3
//
// EX1-043 grants itself +1000 DP for each Insectoid card in its digivolution
// stack during the owner's turn.
// where count() = PermanentOfThisCard().DigivolutionCards.Count(c => c.IsDigimon &&
// c.CardTraits.Contains("Insectoid")).
//
// FAILS-WHEN-REVERTED LEVER:
//   If the amount is reverted to a static 0 (or the count is dropped),
//   modifyDP is never called with a positive amount and the assertion FAILS → RED.
// ---------------------------------------------------------------------------

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(cardId: string, nameEn = cardId, traits?: string[]): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn,
    kinds: ["Digimon"] as never,
    colors: ["Green"] as never,
    playCost: 5,
    dp: 8000,
    evoCosts: [],
    maxCountInDeck: 4,
    types: traits,
  };
}

function fakeCardInstance(cardId: string, instanceId: string): CardInstance {
  return { cardId, instanceId, ownerSeat: 0 as Seat } as never;
}

function makeInsectoidStack(count: number): CardInstance[] {
  return Array.from(
    { length: count },
    (_, i) =>
      ({
        cardId: `insectoid-${i}`,
        instanceId: `stack-insectoid-${i}`,
        ownerSeat: 0 as Seat,
      }) as never,
  );
}

function fakePermanent(permanentId: string, digivolutionCards: CardInstance[]): Permanent {
  return {
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: fakeCardInstance("EX1-043", "inst-top"),
    stack: [fakeCardInstance("EX1-043", "inst-top"), ...digivolutionCards],
    digivolutionCards,
    inBreeding: false,
  } as never;
}

function makeSource(permanentId: string, digivolutionCards: CardInstance[]): CardSource {
  const perm = fakePermanent(permanentId, digivolutionCards);
  return {
    instanceId: "INST#EX1-043",
    cardId: "EX1-043",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition("EX1-043", "Kuwagamon"),
    permanent: () => perm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeContext(opts: {
  insectoidCountInStack: number;
  nonInsectoidCountInStack?: number;
  recorder: Recorder;
  isOwnersTurn?: boolean;
}): EffectContext {
  const isOwnersTurn = opts.isOwnersTurn ?? true;
  const selfPermanentId = "perm-ex1-043";
  const insectoidStack = makeInsectoidStack(opts.insectoidCountInStack);
  const source = makeSource(selfPermanentId, insectoidStack);

  const insectoidCardIds = new Set(insectoidStack.map((c) => c.cardId));

  const players = [
    {
      seat: 0 as Seat,
      battleArea: [fakePermanent(selfPermanentId, insectoidStack)],
      security: [],
      hand: [],
      deck: [],
      trash: [],
    },
    {
      seat: 1 as Seat,
      battleArea: [],
      security: [],
      hand: [],
      deck: [],
      trash: [],
    },
  ];

  const game: GameAccess = {
    state: { memory: 3, players, turnSeat: isOwnersTurn ? 0 : 1 } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => {
      if (id === selfPermanentId) return fakePermanent(selfPermanentId, insectoidStack);
      return undefined;
    },
    definitionOf: (card: CardInstance): CardDefinition => {
      if (insectoidCardIds.has(card.cardId)) {
        return fakeDefinition(card.cardId, card.cardId, ["Insectoid"]);
      }
      return fakeDefinition(card.cardId);
    },
  };

  const fx = {
    modifyDP: (id: string, amount: number, duration: unknown) => {
      opts.recorder.calls.push({ verb: "modifyDP", args: [id, amount, duration] });
    },
    // Stub out primitives the YourTurn SubTrigger clause may invoke.
    subscribeSubTrigger: () => {},
    grantKeyword: () => {},
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source, trigger: {}, game, fx, ask };
}

describe("EX1-043 Kuwagamon scaling-DP A3", () => {
  it("[None] modifyDP += 2000 when 2 Insectoid cards are in digivolution stack", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ insectoidCountInStack: 2, recorder });

    const module = getEffectModule("EX1-043");
    expect(module, "EX1-043 must self-register on import").toBeDefined();
    const source = ctx.source as CardSource;
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    expect(effects.length, "EX1-043 must expose a [None] scaling-DP effect").toBeGreaterThanOrEqual(1);

    for (const effect of effects) {
      if (effect.canTrigger(ctx)) {
        await effect.resolve(ctx);
      }
    }

    const dpCalls = recorder.calls.filter((c) => c.verb === "modifyDP");
    expect(dpCalls.length, "modifyDP must be called at least once").toBeGreaterThanOrEqual(1);
    const amounts = dpCalls.map((c) => c.args[1] as number);
    expect(amounts).toContain(2000);
  });

  it("[None] modifyDP += 1000 when exactly 1 Insectoid card is in digivolution stack", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ insectoidCountInStack: 1, recorder });

    const module = getEffectModule("EX1-043");
    const source = ctx.source as CardSource;
    const effects = module!.effectsForTiming(EffectTiming.None, source);

    for (const effect of effects) {
      if (effect.canTrigger(ctx)) {
        await effect.resolve(ctx);
      }
    }

    const dpCalls = recorder.calls.filter((c) => c.verb === "modifyDP");
    const amounts = dpCalls.map((c) => c.args[1] as number);
    expect(amounts).toContain(1000);
  });

  // REVERT LEVER: if the scaling is removed (amount set to static 0), modifyDP is
  // never called with a positive amount and this assertion FAILS → RED confirmed.
  it("[None] does NOT call modifyDP with positive amount when no Insectoid in digivolution stack", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ insectoidCountInStack: 0, recorder });

    const module = getEffectModule("EX1-043");
    const source = ctx.source as CardSource;
    const effects = module!.effectsForTiming(EffectTiming.None, source);

    for (const effect of effects) {
      if (effect.canTrigger(ctx)) {
        await effect.resolve(ctx);
      }
    }

    const dpCalls = recorder.calls.filter((c) => c.verb === "modifyDP");
    const nonZeroAmounts = dpCalls.filter((c) => (c.args[1] as number) > 0);
    expect(nonZeroAmounts.length, "modifyDP must not be called with positive amount when count=0").toBe(0);
  });
});
