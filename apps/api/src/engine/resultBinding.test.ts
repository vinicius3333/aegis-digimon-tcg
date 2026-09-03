import { describe, it, expect } from "vitest";
import {
  CardColor,
  EffectTiming,
  type CardDefinition,
  type CompiledCard,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import type { CardSource } from "./effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "./effects/EffectContext.js";
import { irCardModule } from "./effects/interpreter.js";

/**
 * A3 for the ctx effect-RESULT-BINDING mechanism (built once, reused 4×): a producing action
 * writes its outcome on ctx; a subsequent gating Condition reads it. Driven through the REAL
 * interpreter (real runAction binds the outcome; real evaluateCondition reads it) with a fake fx
 * whose `deletePermanent`/`digivolveFromInstance` return controlled outcomes.
 *
 *  - Delete-count -> ctx.lastDeleteCount; Condition ifThisEffectDidNotDelete reads count===0.
 *    KB BT23-069 Q5338: a deletion-IMMUNE target (count 0) satisfies the "didn't delete" branch.
 *  - digivolve-result -> ctx.lastDigivolveResult; Condition ifThisEffectDigivolved reads it.
 *    KB BT19-084 Q3146-Q3150: the "then place" tail is gated on the digivolve happening.
 *
 * FAILS-WHEN-REVERTED: discard the deletePermanent count return (bind 1 unconditionally, or
 * stop reading the fx result) and the immune/no-delete assertion goes RED — documented inline.
 */

let seq = 0;

function makeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "X-000",
    set: "X",
    nameEn: "X",
    kinds: ["Digimon"] as never,
    colors: ["Red"] as never,
    level: 3,
    playCost: 0,
    dp: 3000,
    evoCosts: [{ color: CardColor.Red, level: 3, memoryCost: 0 }],
    maxCountInDeck: 4,
    ...over,
  };
}

function makePermanent(over: Partial<Permanent>): Permanent {
  seq += 1;
  return {
    permanentId: `p-${seq}`,
    controllerSeat: 1 as Seat,
    topCard: { instanceId: `i-${seq}`, cardId: "X-000", ownerSeat: 1 as Seat, faceUp: true } as never,
    stack: [] as never,
    linked: [] as never,
    baseDP: 3000,
    currentDP: 3000,
    isSuspended: false,
    inBreeding: false,
    ...over,
  } as unknown as Permanent;
}

function makeSource(selfPermanent?: Permanent): CardSource {
  return {
    instanceId: "SRC#1",
    cardId: "X-SRC",
    ownerSeat: 0 as Seat,
    definition: makeDefinition({ cardId: "X-SRC" }),
    permanent: () => selfPermanent,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

interface Recorder {
  calls: string[];
}

function makeContext(opts: {
  recorder: Recorder;
  opponentBattleArea?: Permanent[];
  ownHand?: { instanceId: string; cardId: string; ownerSeat: Seat; faceUp: boolean }[];
  /** What the fake deletePermanent reports as the count actually removed. */
  deleteCount: (ids: string[]) => number;
  /** What the fake digivolveFromInstance reports (a Permanent => digivolved; undefined => not). */
  digivolveResult: () => Permanent | undefined;
  /** The source's own battle-area permanent (for an isSelf digivolve target). */
  selfPermanent?: Permanent;
}): EffectContext {
  const rec = opts.recorder;
  const opponent = opts.opponentBattleArea ?? [];
  const hand = opts.ownHand ?? [];
  const ownArea = opts.selfPermanent ? [opts.selfPermanent] : [];
  const players = [
    { seat: 0, battleArea: ownArea, security: [], hand, deck: [], trash: [] },
    { seat: 1, battleArea: opponent, security: [], hand: [], deck: [], trash: [] },
  ];
  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => [...opponent, ...ownArea].find((p) => p.permanentId === id),
    definitionOf: (card) => makeDefinition({ cardId: card.cardId }),
    linkMax: () => 1,
  };
  const refuse =
    (verb: string) =>
    (..._a: unknown[]): never => {
      throw new Error(`unexpected ${verb}`);
    };
  const fx = {
    deletePermanent: async (ids: string[]) => {
      rec.calls.push("deletePermanent");
      return opts.deleteCount(ids);
    },
    digivolveFromInstance: async () => {
      rec.calls.push("digivolveFromInstance");
      return opts.digivolveResult();
    },
    endAttack: () => {
      rec.calls.push("endAttack");
    },
    gainMemory: () => {
      rec.calls.push("gainMemory");
    },
    gainMemoryForSeat: () => {
      rec.calls.push("gainMemory");
    },
    draw: async () => {
      rec.calls.push("draw");
      return [];
    },
  } as unknown as Primitives;
  // Any verb not explicitly modeled throws (keeps the A3 honest about what ran).
  void refuse;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_ctx, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_ctx, o) => o.candidates.slice(0, o.max),
    selectCards: async (_ctx, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return {
    source: makeSource(opts.selfPermanent),
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map<string, string>(),
  };
}

/** IR: Delete 1 opponent Digimon, THEN gain memory only "if this effect didn't delete". */
function deleteThenGatedCompiled(): CompiledCard {
  return {
    coverage: "full",
    effects: [
      {
        trigger: "OnPlay",
        actions: [
          { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
          {
            kind: "GainMemory",
            amount: 1,
            condition: { kind: "ifThisEffectDidNotDelete" },
          },
        ],
      },
    ],
  } as unknown as CompiledCard;
}

/** IR: Digivolve into a Digimon, THEN gain memory only "if it digivolved". */
function digivolveThenGatedCompiled(): CompiledCard {
  return {
    coverage: "full",
    effects: [
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Digivolve",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, isSelf: true },
            into: { kind: ["Digimon"] },
            from: ["hand"],
            payCost: false,
          },
          {
            kind: "GainMemory",
            amount: 1,
            condition: { kind: "ifThisEffectDigivolved" },
          },
        ],
      },
    ],
  } as unknown as CompiledCard;
}

describe("effect-result binding — delete-count -> ifThisEffectDidNotDelete", () => {
  it("a Delete that removes 1 binds count 1 => ifThisEffectDidNotDelete FALSE (gated action skipped)", async () => {
    const rec: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder: rec,
      opponentBattleArea: [makePermanent({})],
      deleteCount: (ids) => ids.length, // a real delete: 1 removed
      digivolveResult: () => undefined,
    });
    const effects = irCardModule("X-DEL-1", deleteThenGatedCompiled()).effectsForTiming(
      EffectTiming.OnPlay,
      ctx.source,
    );
    await effects[0]!.resolve(ctx);

    expect(ctx.lastDeleteCount).toBe(1);
    expect(rec.calls).toContain("deletePermanent");
    // The "if this effect DIDN'T delete" gate is FALSE => the gated GainMemory must NOT run.
    expect(rec.calls).not.toContain("gainMemory");
  });

  it("a Delete whose only target is IMMUNE binds count 0 => ifThisEffectDidNotDelete TRUE (Q5338)", async () => {
    const rec: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder: rec,
      opponentBattleArea: [makePermanent({})],
      // The target was chosen, but it is deletion-immune => 0 actually removed (Q5338).
      deleteCount: () => 0,
      digivolveResult: () => undefined,
    });
    const effects = irCardModule("X-DEL-0", deleteThenGatedCompiled()).effectsForTiming(
      EffectTiming.OnPlay,
      ctx.source,
    );
    await effects[0]!.resolve(ctx);

    expect(ctx.lastDeleteCount).toBe(0);
    // FAILS-WHEN-REVERTED: if the interpreter discards the deletePermanent count (always binds a
    // truthy count), this gate is FALSE and gainMemory never runs => RED here.
    expect(rec.calls).toContain("gainMemory");
  });
});

describe("effect-result binding — digivolve-result -> ifThisEffectDigivolved", () => {
  it("a successful digivolve binds TRUE => the gated tail runs", async () => {
    const rec: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder: rec,
      ownHand: [{ instanceId: "h1", cardId: "X-INTO", ownerSeat: 0 as Seat, faceUp: true }],
      deleteCount: () => 0,
      digivolveResult: () => makePermanent({ controllerSeat: 0 as Seat }), // it digivolved
      selfPermanent: makePermanent({ controllerSeat: 0 as Seat }),
    });
    const effects = irCardModule("X-DIG-1", digivolveThenGatedCompiled()).effectsForTiming(
      EffectTiming.OnPlay,
      ctx.source,
    );
    await effects[0]!.resolve(ctx);

    expect(ctx.lastDigivolveResult).toBe(true);
    // FAILS-WHEN-REVERTED: drop the `ctx.lastDigivolveResult = true` binding write in runDigivolve
    // => the gate stays FALSE and the gated gainMemory never runs => RED here.
    expect(rec.calls).toContain("gainMemory");
  });

  it("a digivolve with no eligible source leaves it FALSE => the gated tail is skipped", async () => {
    const rec: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder: rec,
      ownHand: [], // no card in hand to digivolve into => no digivolve happens
      deleteCount: () => 0,
      digivolveResult: () => undefined,
      selfPermanent: makePermanent({ controllerSeat: 0 as Seat }),
    });
    const effects = irCardModule("X-DIG-0", digivolveThenGatedCompiled()).effectsForTiming(
      EffectTiming.OnPlay,
      ctx.source,
    );
    await effects[0]!.resolve(ctx);

    expect(ctx.lastDigivolveResult).toBe(false);
    // FAILS-WHEN-REVERTED: if the interpreter binds the digivolve result TRUE unconditionally,
    // the gate passes and gainMemory wrongly runs => RED here.
    expect(rec.calls).not.toContain("gainMemory");
  });
});
