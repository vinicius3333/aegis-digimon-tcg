import { describe, it, expect } from "vitest";
import { EffectTiming, CardKind, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
} from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX8-012.js";

// A3 for EX8-012 (Growlmon X Antibody):
//   [When Digivolving] Draw 1 card, then trash 1 from hand.
//   Inherited [Your Turn] (Once Per Turn): When any opponent Digimon is deleted,
//     gain 1 memory.
//
// FAILS-WHEN-REVERTED: IR models the inherited clause as a SubTrigger (bus is
// inert), so gainMemory is never called. The hand-written module fires at
// OnDestroyedAnyone directly via turnTiming with isInherited:true.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function makeCardDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "EX8-012",
    set: "EX8",
    nameEn: "Growlmon (X Antibody)",
    kinds: [CardKind.Digimon],
    colors: [] as never,
    playCost: 7,
    dp: 9000,
    level: 6,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#EX8-012",
    cardId: "EX8-012",
    ownerSeat: 0 as Seat,
    definition: makeCardDef(),
    permanent: () =>
      ({
        permanentId: "PERM#EX8-012",
        controllerSeat: 0 as Seat,
        topCard: { instanceId: "INST#EX8-012", cardId: "EX8-012", ownerSeat: 0, faceUp: true },
        stack: [],
        linked: [],
        baseDP: 9000,
        currentDP: 9000,
        isSuspended: false,
        inBreeding: false,
      }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

function makeCtx(
  recorder: Recorder,
  source: CardSource,
  opts: {
    ownerHand?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
    ownerTrash?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
    opponentTrash?: { instanceId: string; cardId: string; ownerSeat: Seat; kinds?: CardKind[] }[];
    deletedInstanceIds?: string[];
    drawResult?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
    instanceDefs?: Map<string, CardDefinition>;
  } = {},
): EffectContext {
  const ownerHand = opts.ownerHand ?? [];
  const ownerTrash = opts.ownerTrash ?? [];
  const opponentTrash = opts.opponentTrash ?? [];
  const deletedIds = opts.deletedInstanceIds ?? [];
  const drawResult = opts.drawResult ?? [];
  const instanceDefs = opts.instanceDefs ?? new Map<string, CardDefinition>();

  // After draw, the hand is expanded by the drawn cards
  let currentHand = [...ownerHand];

  const players = [
    {
      seat: 0 as Seat,
      battleArea: [],
      security: [],
      get hand() { return currentHand; },
      deck: [],
      trash: ownerTrash,
    },
    {
      seat: 1 as Seat,
      battleArea: [],
      security: [],
      hand: [],
      deck: [],
      trash: opponentTrash,
    },
  ];

  const game: GameAccess = {
    state: { memory: 3, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (c: { cardId: string; instanceId?: string }) => {
      if (c.instanceId !== undefined && instanceDefs.has(c.instanceId)) {
        return instanceDefs.get(c.instanceId) as never;
      }
      // For opponent trash cards that have explicit kinds, use those
      const trashCard = opponentTrash.find((t) => t.instanceId === c.instanceId);
      if (trashCard?.kinds) {
        return { cardId: c.cardId, kinds: trashCard.kinds, nameEn: "OpponentCard" } as never;
      }
      return { cardId: c.cardId, kinds: [CardKind.Digimon], nameEn: "SomeCard" } as never;
    },
  };

  const fx = {
    draw: async (seat: Seat, n: number) => {
      recorder.calls.push({ verb: "draw", args: [seat, n] });
      currentHand = [...currentHand, ...drawResult];
      return drawResult;
    },
    trash: async (ids: string[]) => {
      recorder.calls.push({ verb: "trash", args: [ids] });
      currentHand = currentHand.filter((c) => !ids.includes(c.instanceId));
      return [];
    },
    gainMemory: (n: number) => {
      recorder.calls.push({ verb: "gainMemory", args: [n] });
    },
    subscribeSubTrigger: (sub: unknown) => {
      recorder.calls.push({ verb: "subscribeSubTrigger", args: [sub] });
      return 0;
    },
    playInstances: async (ids: string[], opts?: unknown) => {
      recorder.calls.push({ verb: "playInstances", args: [ids, opts] });
      return [];
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
    source,
    trigger: { deletedInstanceIds: deletedIds },
    game,
    fx,
    ask,
  };
}

describe("EX8-012 Growlmon (X Antibody)", () => {
  const module = getEffectModule("EX8-012");

  it("is registered on import", () => {
    expect(module, "EX8-012 must self-register on import").toBeDefined();
  });

  it("produces a WhenDigivolving effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });

  it("produces an OnDestroyedAnyone effect (inherited)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.isInherited).toBe(true);
    expect(effects[0]!.maxPerTurn).toBe(1);
  });

  it("[When Digivolving] calls draw(ownerSeat, 1)", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source);

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    const drawCalls = recorder.calls.filter((c) => c.verb === "draw");
    expect(drawCalls).toHaveLength(1);
    expect(drawCalls[0]!.args[0]).toBe(0); // ownerSeat
    expect(drawCalls[0]!.args[1]).toBe(1);
  });

  it("[When Digivolving] trashes 1 card from hand after drawing", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const drawnCard = { instanceId: "drawn-1", cardId: "SOME-CARD", ownerSeat: 0 as Seat };
    const ctx = makeCtx(recorder, source, {
      drawResult: [drawnCard],
    });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: IR has no hand-selection trash — it uses filter-based trash
    // which does not go through selectCards + trash calls in this pattern.
    const trashCalls = recorder.calls.filter((c) => c.verb === "trash");
    expect(trashCalls).toHaveLength(1);
    expect((trashCalls[0]!.args[0] as string[]).length).toBe(1);
  });

  it("[When Digivolving] skips trash when hand is empty after drawing", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    // Draw returns nothing, hand stays empty
    const ctx = makeCtx(recorder, source, { drawResult: [] });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    expect(recorder.calls.filter((c) => c.verb === "trash")).toHaveLength(0);
  });

  it("[Inherited Your Turn] gainMemory(1) when opponent Digimon deleted", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const deletedCard = {
      instanceId: "opp-digi-1",
      cardId: "SOME-DIGI",
      ownerSeat: 1 as Seat,
      kinds: [CardKind.Digimon],
    };
    const ctx = makeCtx(recorder, source, {
      opponentTrash: [deletedCard],
      deletedInstanceIds: [deletedCard.instanceId],
    });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    expect(effects[0]!.canTrigger(ctx)).toBe(true);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: IR SubTrigger bus is inert — gainMemory is never called.
    const memoryCalls = recorder.calls.filter((c) => c.verb === "gainMemory");
    expect(memoryCalls).toHaveLength(1);
    expect(memoryCalls[0]!.args[0]).toBe(1);
  });

  it("[Inherited Your Turn] does not trigger when not owner's turn", () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource({ isOwnersTurn: () => false });
    const deletedCard = {
      instanceId: "opp-digi-1",
      cardId: "SOME-DIGI",
      ownerSeat: 1 as Seat,
      kinds: [CardKind.Digimon],
    };
    const ctx = makeCtx(recorder, source, {
      opponentTrash: [deletedCard],
      deletedInstanceIds: [deletedCard.instanceId],
    });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    expect(effects[0]!.canTrigger(ctx)).toBe(false);
  });

  it("[Inherited Your Turn] does not trigger when not on battle area", () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource({ isOnBattleArea: () => false });
    const deletedCard = {
      instanceId: "opp-digi-1",
      cardId: "SOME-DIGI",
      ownerSeat: 1 as Seat,
      kinds: [CardKind.Digimon],
    };
    const ctx = makeCtx(recorder, source, {
      opponentTrash: [deletedCard],
      deletedInstanceIds: [deletedCard.instanceId],
    });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    expect(effects[0]!.canTrigger(ctx)).toBe(false);
  });

  it("[Inherited Your Turn] does not trigger when no deletedInstanceIds", () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source, {
      opponentTrash: [],
      deletedInstanceIds: [],
    });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    expect(effects[0]!.canTrigger(ctx)).toBe(false);
  });
});

// [When Digivolving]'s conditional [On Deletion] grant:
//   "Then, if [Growlmon] or [X Antibody] is in this Digimon's digivolution cards,
//   until the end of your opponent's turn, this Digimon gains '[On Deletion] You
//   may play 1 card with [Guilmon] in its name from your trash without paying the
//   cost.'"
//
// FAILS-WHEN-REVERTED: the original module returned after the draw/trash body —
// no subscribeSubTrigger("onDeletionOf", ...) call, so the stack-condition check
// and the grant were never made.
describe("EX8-012 [When Digivolving] conditional [On Deletion] grant", () => {
  const module = getEffectModule("EX8-012");

  function permanentWithStack(stack: { instanceId: string; cardId: string; ownerSeat: Seat }[]) {
    return () =>
      ({
        permanentId: "PERM#EX8-012",
        controllerSeat: 0 as Seat,
        topCard: { instanceId: "INST#EX8-012", cardId: "EX8-012", ownerSeat: 0, faceUp: true },
        stack,
        linked: [],
        baseDP: 9000,
        currentDP: 9000,
        isSuspended: false,
        inBreeding: false,
      }) as never;
  }

  it("installs the onDeletionOf watcher when [Growlmon] is in the digivolution cards", async () => {
    const recorder: Recorder = { calls: [] };
    const growlmonCard = { instanceId: "stack-1", cardId: "SOME-GROWLMON", ownerSeat: 0 as Seat };
    const source = makeSource({ permanent: permanentWithStack([growlmonCard]) });
    const instanceDefs = new Map<string, CardDefinition>([
      ["stack-1", makeCardDef({ cardId: "SOME-GROWLMON", nameEn: "Growlmon" })],
    ]);
    const ctx = makeCtx(recorder, source, { instanceDefs });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    const subs = recorder.calls.filter((c) => c.verb === "subscribeSubTrigger");
    expect(subs).toHaveLength(1);
    const sub = subs[0]!.args[0] as {
      event: string;
      sourcePermanentId: string;
      once: boolean;
      expiresOnTurnEndOf: Seat;
      matches: (c: EffectContext) => boolean;
    };
    expect(sub.event).toBe("onDeletionOf");
    expect(sub.sourcePermanentId).toBe("PERM#EX8-012");
    expect(sub.once).toBe(true);
    expect(sub.expiresOnTurnEndOf).toBe(1); // opponent seat
  });

  it("installs the onDeletionOf watcher when a stack card has the [X Antibody] trait (even without the [Growlmon] name)", async () => {
    const recorder: Recorder = { calls: [] };
    const xaCard = { instanceId: "stack-1", cardId: "SOME-XA", ownerSeat: 0 as Seat };
    const source = makeSource({ permanent: permanentWithStack([xaCard]) });
    const instanceDefs = new Map<string, CardDefinition>([
      ["stack-1", makeCardDef({ cardId: "SOME-XA", nameEn: "Not Growlmon", types: ["X Antibody"] })],
    ]);
    const ctx = makeCtx(recorder, source, { instanceDefs });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    expect(recorder.calls.filter((c) => c.verb === "subscribeSubTrigger")).toHaveLength(1);
  });

  it("does NOT install the watcher when neither [Growlmon] nor [X Antibody] is in the digivolution cards", async () => {
    const recorder: Recorder = { calls: [] };
    const plainCard = { instanceId: "stack-1", cardId: "SOME-PLAIN", ownerSeat: 0 as Seat };
    const source = makeSource({ permanent: permanentWithStack([plainCard]) });
    const instanceDefs = new Map<string, CardDefinition>([
      ["stack-1", makeCardDef({ cardId: "SOME-PLAIN", nameEn: "Plainmon", types: [] })],
    ]);
    const ctx = makeCtx(recorder, source, { instanceDefs });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    expect(recorder.calls.filter((c) => c.verb === "subscribeSubTrigger")).toHaveLength(0);
  });

  it("does NOT install the watcher when this Digimon has no digivolution cards", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource({ permanent: permanentWithStack([]) });
    const ctx = makeCtx(recorder, source);

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    expect(recorder.calls.filter((c) => c.verb === "subscribeSubTrigger")).toHaveLength(0);
  });

  it("the granted watcher's run() plays a [Guilmon]-named card from the owner's trash without paying the cost", async () => {
    const recorder: Recorder = { calls: [] };
    const growlmonCard = { instanceId: "stack-1", cardId: "SOME-GROWLMON", ownerSeat: 0 as Seat };
    const guilmonInTrash = { instanceId: "trash-1", cardId: "GUILMON-CARD", ownerSeat: 0 as Seat };
    const source = makeSource({ permanent: permanentWithStack([growlmonCard]) });
    const instanceDefs = new Map<string, CardDefinition>([
      ["stack-1", makeCardDef({ cardId: "SOME-GROWLMON", nameEn: "Growlmon" })],
      ["trash-1", makeCardDef({ cardId: "GUILMON-CARD", nameEn: "Guilmon" })],
    ]);
    const ctx = makeCtx(recorder, source, { ownerTrash: [guilmonInTrash], instanceDefs });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    const sub = recorder.calls.find((c) => c.verb === "subscribeSubTrigger")!.args[0] as {
      matches: (c: EffectContext) => boolean;
      run: (c: EffectContext) => Promise<void>;
    };

    // matches() only fires for THIS permanent being deleted.
    const matchesCtx = { ...ctx, trigger: { subjectPermanentId: "PERM#EX8-012" } } as EffectContext;
    expect(sub.matches(matchesCtx)).toBe(true);
    const otherCtx = { ...ctx, trigger: { subjectPermanentId: "PERM#OTHER" } } as EffectContext;
    expect(sub.matches(otherCtx)).toBe(false);

    await sub.run(matchesCtx);

    const playCalls = recorder.calls.filter((c) => c.verb === "playInstances");
    expect(playCalls).toHaveLength(1);
    expect(playCalls[0]!.args[0]).toEqual(["trash-1"]);
    expect(playCalls[0]!.args[1]).toEqual({ payCost: false });
  });
});
