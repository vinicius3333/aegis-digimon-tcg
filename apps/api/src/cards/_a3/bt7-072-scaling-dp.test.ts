import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";

// Import the override so it self-registers on the registry.
import "../BT7/BT7-072.js";

// ---------------------------------------------------------------------------
// BT7-072 Eyesmon scaling-DP A3
//
// BT7-072 (Eyesmon) grants itself +2000 DP for each [Eyesmon: Scatter Mode] in
// the owner's trash while it is on the battle area during the owner's turn.
// where count() = TrashCards.Count(cardNames.Contains("Eyesmon: Scatter Mode")).
//
// FAILS-WHEN-REVERTED LEVER:
//   If the amount is reverted to a static 0 (or the scaling count is dropped),
//   the modifyDP call is never made (or is 0), and the "modifyDP called with 6000"
//   assertion goes RED.
// ---------------------------------------------------------------------------

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(cardId: string, nameEn = cardId): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn,
    kinds: ["Digimon"] as never,
    colors: ["Purple"] as never,
    playCost: 4,
    dp: 2000,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function fakeCardInstance(cardId: string, instanceId: string, _nameEn?: string): CardInstance {
  return { cardId, instanceId, ownerSeat: 0 as Seat } as never;
}

function fakePermanent(permanentId: string, cardId: string): Permanent {
  return {
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: fakeCardInstance(cardId, `inst-${permanentId}`),
    stack: [],
    inBreeding: false,
  } as never;
}

function makeSource(cardId: string, permanentId: string): CardSource {
  const perm = fakePermanent(permanentId, cardId);
  return {
    instanceId: `INST#${cardId}`,
    cardId,
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(cardId, "Eyesmon"),
    permanent: () => perm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeContext(opts: { trashNames: string[]; recorder: Recorder; isOwnersTurn?: boolean }): EffectContext {
  const isOwnersTurn = opts.isOwnersTurn ?? true;
  const selfPermanentId = "perm-bt7-072";
  const source = makeSource("BT7-072", selfPermanentId);

  const trashInstances: CardInstance[] = opts.trashNames.map(
    (name, i) =>
      ({
        cardId: `trash-card-${i}`,
        instanceId: `trash-${i}`,
        ownerSeat: 0 as Seat,
      }) as never,
  );

  const players = [
    {
      seat: 0 as Seat,
      battleArea: [fakePermanent(selfPermanentId, "BT7-072")],
      security: [],
      hand: [],
      deck: [],
      trash: trashInstances,
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

  const definitionMap: Record<string, string> = {};
  opts.trashNames.forEach((name, i) => {
    definitionMap[`trash-card-${i}`] = name;
  });

  const game: GameAccess = {
    state: { memory: 3, players, turnSeat: isOwnersTurn ? 0 : 1 } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => {
      if (id === selfPermanentId) return fakePermanent(selfPermanentId, "BT7-072");
      return undefined;
    },
    definitionOf: (card: CardInstance): CardDefinition => {
      const name = definitionMap[card.cardId] ?? card.cardId;
      return fakeDefinition(card.cardId, name);
    },
  };

  const fx = {
    modifyDP: (id: string, amount: number, duration: unknown) => {
      opts.recorder.calls.push({ verb: "modifyDP", args: [id, amount, duration] });
    },
    // Stub out primitives the PlayWithoutCost static clause may invoke.
    playInstances: async () => [],
    subscribeSubTrigger: () => {},
    grantKeyword: () => {},
    restrict: () => {},
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

describe("BT7-072 Eyesmon scaling-DP A3", () => {
  it("[None] modifyDP += 6000 when 3 Eyesmon: Scatter Mode are in trash", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      trashNames: ["Eyesmon: Scatter Mode", "Eyesmon: Scatter Mode", "Eyesmon: Scatter Mode"],
      recorder,
    });

    const module = getEffectModule("BT7-072");
    expect(module, "BT7-072 must self-register on import").toBeDefined();
    const source = ctx.source as CardSource;
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    expect(effects.length, "BT7-072 must expose a [None] scaling-DP effect").toBeGreaterThanOrEqual(1);

    // Run the static effect — find the scaling-DP effect
    for (const effect of effects) {
      if (effect.canTrigger(ctx)) {
        await effect.resolve(ctx);
      }
    }

    const dpCalls = recorder.calls.filter((c) => c.verb === "modifyDP");
    expect(dpCalls.length, "modifyDP must be called at least once").toBeGreaterThanOrEqual(1);
    const amounts = dpCalls.map((c) => c.args[1] as number);
    expect(amounts).toContain(6000);
  });

  it("[None] modifyDP += 2000 when exactly 1 Eyesmon: Scatter Mode is in trash", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      trashNames: ["Eyesmon: Scatter Mode", "Eyesmon", "Other Card"],
      recorder,
    });

    const module = getEffectModule("BT7-072");
    const source = ctx.source as CardSource;
    const effects = module!.effectsForTiming(EffectTiming.None, source);

    for (const effect of effects) {
      if (effect.canTrigger(ctx)) {
        await effect.resolve(ctx);
      }
    }

    const dpCalls = recorder.calls.filter((c) => c.verb === "modifyDP");
    const amounts = dpCalls.map((c) => c.args[1] as number);
    expect(amounts).toContain(2000);
  });

  // REVERT LEVER: if the scaling is removed (amount set to static 0), modifyDP is
  // never called (scale=0 => early return) and this assertion FAILS → RED confirmed.
  it("[None] does NOT call modifyDP when no Eyesmon: Scatter Mode is in trash", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      trashNames: ["Eyesmon", "Other Card"],
      recorder,
    });

    const module = getEffectModule("BT7-072");
    const source = ctx.source as CardSource;
    const effects = module!.effectsForTiming(EffectTiming.None, source);

    for (const effect of effects) {
      if (effect.canTrigger(ctx)) {
        await effect.resolve(ctx);
      }
    }

    const dpCalls = recorder.calls.filter((c) => c.verb === "modifyDP");
    const nonZeroAmounts = dpCalls.filter((c) => (c.args[1] as number) > 0);
    expect(nonZeroAmounts.length, "modifyDP must not be called with a non-zero amount when count=0").toBe(0);
  });
});
