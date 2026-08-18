import { describe, it, expect } from "vitest";
import { EffectTiming, CardKind, CardColor, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./AD1-023.js";

// AD1-023 J.P., Koji, & Koichi (Black/Yellow/Purple Tamer).
// [Start of Your Main Phase] [On Play] You may place up to 2 [Hybrid] trait cards
//   with different colors from your hand or trash under this Tamer. If this effect
//   placed, <Draw 1>. Then, if there are 4 or more [Hybrid] trait cards under this
//   Tamer, gain 2 memory (Q6114: evaluated regardless of whether this activation placed).
// Inherited [All Turns] [Once Per Turn]: when this Digimon with [Hybrid]/[Ten
//   Warriors] would leave the battle area, by adding your top security card to
//   hand, it doesn't leave.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function tamerDef(): CardDefinition {
  return {
    cardId: "AD1-023",
    set: "AD1",
    nameEn: "J.P., Koji, & Koichi",
    kinds: [CardKind.Tamer],
    colors: [CardColor.Black, CardColor.Yellow, CardColor.Purple],
    playCost: 5,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function hybridDigimonDef(cardId: string, color: CardColor): CardDefinition {
  return {
    cardId,
    set: "AD1",
    nameEn: `Hybrid-${cardId}`,
    kinds: [CardKind.Digimon],
    colors: [color],
    forms: ["Hybrid"],
    attributes: ["Variable"],
    types: ["Warrior"],
    level: 4,
    playCost: 4,
    dp: 3000,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

type PermStub = {
  permanentId: string;
  topCard: { instanceId: string; cardId: string; ownerSeat: Seat };
  currentDP: number;
  isSuspended: boolean;
  stack: { instanceId: string; cardId: string; ownerSeat: Seat }[];
};

function makePermanent(permanentId: string, cardId: string, stack: PermStub["stack"] = []): PermStub {
  return {
    permanentId,
    topCard: { instanceId: `INST#${permanentId}`, cardId, ownerSeat: 0 as Seat },
    currentDP: 0,
    isSuspended: false,
    stack,
  };
}

function makeSource(overrides: Partial<CardSource> = {}, self?: PermStub): CardSource {
  return {
    instanceId: "INST#AD1-023",
    cardId: "AD1-023",
    ownerSeat: 0 as Seat,
    definition: tamerDef(),
    permanent: () => self as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
    ...overrides,
  };
}

function makeContext(opts: {
  recorder: Recorder;
  self: PermStub;
  hand?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  trash?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  security?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  defMap: Map<string, CardDefinition>;
  selectCardsImpl?: DecisionApi["selectCards"];
  optionalImpl?: DecisionApi["optional"];
}): EffectContext {
  const { recorder, self, defMap } = opts;
  const hand = opts.hand ?? [];
  const trash = opts.trash ?? [];
  const security = opts.security ?? [];

  const players = [
    { seat: 0, battleArea: [self], security, hand, deck: [], trash },
    { seat: 1, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 3, players, turnSeat: 0 } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id) => (id === self.permanentId ? (self as never) : undefined),
    definitionOf: (card) => {
      const def = defMap.get(card.cardId);
      if (def) return def;
      return tamerDef();
    },
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      recorder.calls.push({ verb, args });
      return undefined as never;
    };

  const fx = {
    placeUnder: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "placeUnder", args });
      const [targetId, instanceIds] = args as [string, string[]];
      if (targetId === self.permanentId) {
        const moved = [...hand, ...trash].filter((c) => instanceIds.includes(c.instanceId));
        self.stack.push(...moved);
      }
      return [];
    },
    draw: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "draw", args });
      return [];
    },
    gainMemoryForSeat: record("gainMemoryForSeat"),
    subscribeReplacement: record("subscribeReplacement"),
    securityToHand: record("securityToHand"),
    playFromSecurity: record("playFromSecurity"),
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: opts.optionalImpl ?? (async () => true),
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: opts.selectCardsImpl ?? (async (_c, o) => o.candidates.slice(0, o.max)),
    chooseOption: async () => 0,
  };

  return { source: makeSource({}, self), trigger: {}, game, fx, ask };
}

describe("AD1-023 J.P., Koji, & Koichi", () => {
  const module = getEffectModule("AD1-023");

  it("is registered", () => {
    expect(module, "AD1-023 must self-register on import").toBeDefined();
  });

  it("routes to SecuritySkill, OnPlay, OnStartMainPhase, and None (inherited)", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source).length).toBe(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBe(1);
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source).length).toBe(1);
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBe(1);
  });

  it("[On Play] places up to 2 differently-colored [Hybrid] cards, draws, and does NOT yet gain memory below 4 under", async () => {
    const recorder: Recorder = { calls: [] };
    const self = makePermanent("PERM#tamer", "AD1-023");
    const redCard = { instanceId: "INST#red", cardId: "RED-HYBRID", ownerSeat: 0 as Seat };
    const blueCard = { instanceId: "INST#blue", cardId: "BLUE-HYBRID", ownerSeat: 0 as Seat };
    const defMap = new Map<string, CardDefinition>([
      ["RED-HYBRID", hybridDigimonDef("RED-HYBRID", CardColor.Red)],
      ["BLUE-HYBRID", hybridDigimonDef("BLUE-HYBRID", CardColor.Blue)],
    ]);

    const ctx = makeContext({
      recorder,
      self,
      hand: [redCard, blueCard],
      defMap,
      selectCardsImpl: async (_c, o) => o.candidates.slice(0, o.max), // always take max offered
    });

    const [effect] = module!.effectsForTiming(EffectTiming.OnPlay, makeSource({}, self));
    await effect!.resolve(ctx);

    const placeCalls = recorder.calls.filter((c) => c.verb === "placeUnder");
    expect(placeCalls).toHaveLength(1);
    expect(placeCalls[0]!.args[1]).toEqual(["INST#red", "INST#blue"]);

    const drawCalls = recorder.calls.filter((c) => c.verb === "draw");
    expect(drawCalls).toHaveLength(1);

    // Only 2 Hybrid cards are now under the Tamer — below the 4-card threshold.
    const memoryCalls = recorder.calls.filter((c) => c.verb === "gainMemoryForSeat");
    expect(memoryCalls).toHaveLength(0);
  });

  it("gains 2 memory once 4+ [Hybrid] cards sit under the Tamer, even without placing this activation (Q6114)", async () => {
    const recorder: Recorder = { calls: [] };
    const existingStack = [
      { instanceId: "INST#h1", cardId: "H1", ownerSeat: 0 as Seat },
      { instanceId: "INST#h2", cardId: "H2", ownerSeat: 0 as Seat },
      { instanceId: "INST#h3", cardId: "H3", ownerSeat: 0 as Seat },
      { instanceId: "INST#h4", cardId: "H4", ownerSeat: 0 as Seat },
    ];
    const self = makePermanent("PERM#tamer", "AD1-023", existingStack);
    const defMap = new Map<string, CardDefinition>([
      ["H1", hybridDigimonDef("H1", CardColor.Red)],
      ["H2", hybridDigimonDef("H2", CardColor.Blue)],
      ["H3", hybridDigimonDef("H3", CardColor.Green)],
      ["H4", hybridDigimonDef("H4", CardColor.Yellow)],
    ]);

    const ctx = makeContext({
      recorder,
      self,
      hand: [], // nothing to place this activation
      defMap,
    });

    const [effect] = module!.effectsForTiming(EffectTiming.OnStartMainPhase, makeSource({}, self));
    await effect!.resolve(ctx);

    expect(recorder.calls.filter((c) => c.verb === "placeUnder")).toHaveLength(0);
    expect(recorder.calls.filter((c) => c.verb === "draw")).toHaveLength(0);

    const memoryCalls = recorder.calls.filter((c) => c.verb === "gainMemoryForSeat");
    expect(memoryCalls).toHaveLength(1);
    expect(memoryCalls[0]!.args).toEqual([0, 2]);
  });

  it("inherited leave-prevention installs a wouldLeavePlay replacement that pays by adding top security to hand", async () => {
    const recorder: Recorder = { calls: [] };
    const host = makePermanent("PERM#host", "SOME-HYBRID-HOST");
    const defMap = new Map<string, CardDefinition>([
      ["SOME-HYBRID-HOST", hybridDigimonDef("SOME-HYBRID-HOST", CardColor.Red)],
    ]);
    const topSecurity = { instanceId: "INST#sec", cardId: "SEC-CARD", ownerSeat: 0 as Seat };

    const ctx = makeContext({
      recorder,
      self: host,
      security: [topSecurity],
      defMap,
    });

    const [effect] = module!.effectsForTiming(EffectTiming.None, makeSource({}, host));
    await effect!.resolve(ctx);

    const subs = recorder.calls.filter((c) => c.verb === "subscribeReplacement");
    expect(subs).toHaveLength(1);
    const sub = subs[0]!.args[0] as {
      event: string;
      sourcePermanentId: string;
      mode: string;
      protects: (ctx: EffectContext, leavingId: string) => boolean;
      preventCheck: (ctx: EffectContext) => Promise<boolean>;
    };
    expect(sub.event).toBe("wouldLeavePlay");
    expect(sub.sourcePermanentId).toBe("PERM#host");
    expect(sub.mode).toBe("prevent");

    // protects() gates on the host's top card carrying Hybrid/Ten Warriors.
    expect(sub.protects(ctx, "PERM#host")).toBe(true);
    expect(sub.protects(ctx, "PERM#other")).toBe(false);

    // preventCheck() pays by returning the top security card to hand.
    const prevented = await sub.preventCheck(ctx);
    expect(prevented).toBe(true);
    const secCalls = recorder.calls.filter((c) => c.verb === "securityToHand");
    expect(secCalls).toHaveLength(1);
    expect(secCalls[0]!.args).toEqual([0, 1, { fromTop: true }]);
  });
});
