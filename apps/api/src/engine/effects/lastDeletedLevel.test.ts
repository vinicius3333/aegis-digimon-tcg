import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CompiledCard, type Permanent, type Seat } from "@aegis/shared";
import { irCardModule } from "./interpreter.js";
import { type DecisionApi, type EffectContext, type GameAccess, type Primitives } from "./EffectContext.js";
import type { CardSource } from "./CardSource.js";

/**
 * Dynamic level threshold `levelComparison.relativeTo:"lastDeleted"` (engine capability for the
 * BT8-107 / BT17-071 cluster): a Delete whose target level bound is the level of the Digimon just
 * deleted in this resolution (documented behavior LevelJustBeforeRemoveField).
 *
 *   BT8-107: "delete 1 of your Digimon to delete 1 of your opponent's unsuspended Digimon with a
 *            level less than or equal to the DELETED Digimon's level."  (cost-deleted bound)
 *   BT17-071: "when one of your other Digimon is deleted, delete 1 of your opponent's Digimon with
 *            level equal to or less than the deleted Digimon's level." (SubTrigger-subject bound)
 *
 * FAILS-WHEN-REVERTED: drop the `relativeTo:"lastDeleted"` branch in permanentMatchesFilter (or the
 * `ctx.lastDeletedLevel` capture in the deleteOwn cost) and the bound becomes unresolved => the
 * opponent target filter excludes everything (no deletePermanent on the opponent).
 */

const LEVELS: Record<string, number> = {
  COST5: 5, // cost-deleted / subject Digimon, level 5
  OPP4: 4, // opponent Digimon level 4 (<= 5: eligible)
  OPP6: 6, // opponent Digimon level 6 (> 5: ineligible)
};

function def(cardId: string, kinds: string[] = ["Digimon"]): CardDefinition {
  return {
    cardId,
    set: "T",
    nameEn: cardId,
    kinds: kinds as never,
    colors: [],
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    level: LEVELS[cardId],
  };
}

function perm(permanentId: string, seat: Seat, cardId: string, currentDP = 0): Permanent {
  return {
    permanentId,
    controllerSeat: seat,
    topCard: { instanceId: `${permanentId}#i`, cardId, ownerSeat: seat, faceUp: true } as never,
    stack: [] as never,
    linked: [] as never,
    baseDP: 0,
    currentDP,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeCtx(opts: {
  source: CardSource;
  own: Permanent[];
  opponent: Permanent[];
  trigger?: EffectContext["trigger"];
}): { ctx: EffectContext; deleted: string[][] } {
  const deleted: string[][] = [];
  const players = [
    { seat: 0, battleArea: opts.own, security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: opts.opponent, security: [], hand: [], deck: [], trash: [] },
  ];
  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0),
    permanentById: (id: string) =>
      [...players[0]!.battleArea, ...players[1]!.battleArea].find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => def(card.cardId),
    linkMax: () => 1,
  } as never;
  const fx = {
    deletePermanent: async (ids: string[]) => {
      deleted.push(ids);
      return ids.length;
    },
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  return {
    ctx: { source: opts.source, trigger: opts.trigger ?? {}, game, fx, ask, selections: new Map() },
    deleted,
  };
}

function source(cardId: string, p?: Permanent): CardSource {
  return {
    instanceId: "S#i",
    cardId,
    ownerSeat: 0 as Seat,
    definition: def(cardId),
    permanent: () => p,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } as never;
}

const oppTarget = {
  filter: {
    controller: "opponent",
    unsuspended: true,
    kind: ["Digimon"],
    levelComparison: { op: "lte", relativeTo: "lastDeleted" },
  },
  count: 1,
};

const oppDPTarget = {
  filter: {
    controller: "opponent",
    kind: ["Digimon"],
    dp: { op: "lte", relativeTo: "lastDeleted" },
  },
  count: 1,
};

describe("dp.relativeTo:lastDeleted (cost-deleted bound — RB1-029)", () => {
  it("uses the cost-deleted Digimon's live DP as the opponent target ceiling", async () => {
    const own = [perm("OWN", 0 as Seat, "COST5", 6_000)];
    const opponent = [perm("OPP_LO", 1 as Seat, "OPP4", 3_000), perm("OPP_HI", 1 as Seat, "OPP6", 7_000)];
    const src = source("X-RB1-029");
    const { ctx, deleted } = makeCtx({ source: src, own, opponent });
    const card = {
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "Delete",
              target: oppDPTarget,
              cost: {
                kind: "deleteOwn",
                target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              },
            },
          ],
        },
      ],
    } as never as CompiledCard;

    const effects = irCardModule("X-RB1-029", card).effectsForTiming(EffectTiming.OnUseOption, src);
    await effects[0]!.resolve(ctx);

    expect(deleted[0]).toEqual(["OWN"]);
    expect(deleted[1]).toEqual(["OPP_LO"]);
    expect(deleted.flat()).not.toContain("OPP_HI");
  });
});

describe("levelComparison.relativeTo:lastDeleted (cost-deleted bound — BT8-107)", () => {
  function card(): CompiledCard {
    return {
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "Delete",
              target: oppTarget,
              cost: {
                kind: "deleteOwn",
                target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              },
            },
          ],
        },
      ],
    } as never;
  }

  it("deletes only the opponent Digimon whose level is <= the cost-deleted Digimon's level", async () => {
    const own = [perm("OWN", 0 as Seat, "COST5")]; // cost-deleted level 5
    const opponent = [perm("OPP_LO", 1 as Seat, "OPP4"), perm("OPP_HI", 1 as Seat, "OPP6")];
    const src = source("X-BT8-107");
    const { ctx, deleted } = makeCtx({ source: src, own, opponent });
    const effects = irCardModule("X-BT8-107", card()).effectsForTiming(EffectTiming.OnUseOption, src);
    await effects[0]!.resolve(ctx);
    // First delete = the cost (own Digimon). Second delete = the eligible opponent (level 4 only).
    expect(deleted[0]).toEqual(["OWN"]);
    expect(deleted[1]).toEqual(["OPP_LO"]);
    // The level-6 opponent was never offered as a candidate.
    expect(deleted.flat()).not.toContain("OPP_HI");
  });
});

describe("levelComparison.relativeTo:lastDeleted (SubTrigger-subject bound — BT17-071)", () => {
  it("deletes only the opponent Digimon with level <= the deletion subject's level", async () => {
    const opponent = [perm("OPP_LO", 1 as Seat, "OPP4"), perm("OPP_HI", 1 as Seat, "OPP6")];
    // The just-deleted (subject) Digimon is still live at fire time; its level (5) is the bound.
    const subject = perm("SUBJ", 0 as Seat, "COST5");
    const src = source("X-BT17-071");
    const { ctx, deleted } = makeCtx({
      source: src,
      own: [subject],
      opponent,
      trigger: { deletedPermanentId: "SUBJ" },
    });
    // Model the SubTrigger payload directly: a Delete resolving inside the onDeletionOf window,
    // whose trigger context carries the deletion subject (the just-deleted Digimon, still live).
    const card = {
      coverage: "full",
      residual: [],
      effects: [{ trigger: "Main", actions: [{ kind: "Delete", target: oppTarget }] }],
    } as never as CompiledCard;
    const effects = irCardModule("X-BT17-071", card).effectsForTiming(EffectTiming.OnUseOption, src);
    await effects[0]!.resolve(ctx);
    expect(deleted.flat()).toEqual(["OPP_LO"]);
    expect(deleted.flat()).not.toContain("OPP_HI");
  });
});

describe("levelLteTriggerSource snapshot (ST10-06, KB Q737/Q738)", () => {
  it("keeps the played Digimon's trigger-time level after that Digimon has left play", async () => {
    const opponent = [perm("OPP_LO", 1 as Seat, "OPP4"), perm("OPP_HI", 1 as Seat, "OPP6")];
    const src = source("ST10-06");
    const { ctx, deleted } = makeCtx({
      source: src,
      own: [],
      opponent,
      // There is deliberately no live subject permanent: Q738 says the bound survives it
      // leaving the battle area before Mastemon's pending effect resolves.
      trigger: { subjectPermanentId: "ALREADY_LEFT", playedByEffect: true, playedLevel: 5 },
    });
    const card = {
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelLteTriggerSource: true },
                count: 1,
              },
            },
          ],
        },
      ],
    } as never as CompiledCard;

    const effects = irCardModule("ST10-06", card).effectsForTiming(EffectTiming.OnUseOption, src);
    await effects[0]!.resolve(ctx);

    expect(deleted).toEqual([["OPP_LO"]]);
    expect(deleted.flat()).not.toContain("OPP_HI");
  });
});

describe("levelEqTriggerSource snapshot (EX3-023)", () => {
  it("matches only the opponent Digimon with the played-from-sources Digimon's exact level", async () => {
    const opponent = [perm("OPP_LO", 1 as Seat, "OPP4"), perm("OPP_HI", 1 as Seat, "OPP6")];
    const src = source("EX3-023");
    const { ctx, deleted } = makeCtx({
      source: src,
      own: [],
      opponent,
      trigger: { subjectPermanentId: "ALREADY_LEFT", playedByEffect: true, playedLevel: 4 },
    });
    const card = {
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelEqTriggerSource: true },
                count: 1,
              },
            },
          ],
        },
      ],
    } as never as CompiledCard;

    const effects = irCardModule("EX3-023-level-eq", card).effectsForTiming(EffectTiming.OnUseOption, src);
    await effects[0]!.resolve(ctx);

    expect(deleted).toEqual([["OPP_LO"]]);
    expect(deleted.flat()).not.toContain("OPP_HI");
  });
});
