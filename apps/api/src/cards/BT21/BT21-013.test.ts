import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT21-013.js";
import "../index.js";

// BT21-013 (Agunimon, Red Hybrid) registers TWO alternate digivolution conditions in documented behavior
//   1. base TopCard.IsTamer && CardColors.Contains(Red) → cost 2
//   2. base TopCard.EqualsCardName("BurningGreymon")     → cost 0
// The text parser only kept #1's sibling (BurningGreymon); the red-Tamer path is restored
// via ALTERNATE_DIGIVOLUTION_OVERRIDES, since the compiler cannot express baseIsTamer/baseColors.
describe("BT21-013 Agunimon — alternate digivolution conditions", () => {
  it("may digivolve from a red Tamer for cost 2", () => {
    const req = matchingAlternateDigivolutionRequirement("BT21-013", "BT1-085"); // Tai Kamiya (Red Tamer)
    expect(req).toBeDefined();
    expect(req?.cost).toBe(2);
    expect(req?.baseIsTamer).toBe(true);
  });

  it("may digivolve from BurningGreymon for cost 0", () => {
    const req = matchingAlternateDigivolutionRequirement("BT21-013", "BT12-013"); // BurningGreymon
    expect(req).toBeDefined();
    expect(req?.cost).toBe(0);
    expect(req?.namesExact).toEqual(["BurningGreymon"]);
  });

  it("may NOT digivolve from a non-red Tamer", () => {
    const req = matchingAlternateDigivolutionRequirement("BT21-013", "AD1-019"); // Blue/Yellow Tamer
    expect(req).toBeUndefined();
  });
});

// --- [When Digivolving] placement destination -------------------------------
// documented behavior CanSelectPermanent accepts EITHER this Digimon's own permanent ("as this
// Digimon's bottom digivolution card") OR a red Tamer with inherited effects. The generated
// IR only carried the Tamer half, so a controller with no red Tamer got no card selection at
// all. FAILS-WHEN-REVERTED: drop `underOrFilters` and the no-Tamer case places nothing.

const CARD_ID = "BT21-013";

const DEFINITIONS: Record<string, Partial<CardDefinition>> = {
  [CARD_ID]: {
    nameEn: "Agunimon",
    kinds: [CardKind.Digimon] as never,
    colors: ["Red"] as never,
    forms: ["Hybrid"] as never,
    types: ["Wizard", "Hero"] as never,
  },
  "BT12-013": {
    nameEn: "BurningGreymon",
    kinds: [CardKind.Digimon] as never,
    colors: ["Red"] as never,
    forms: ["Hybrid"] as never,
  },
  "BT1-085": {
    nameEn: "Tai Kamiya",
    kinds: [CardKind.Tamer] as never,
    colors: ["Red"] as never,
    inheritedEffectText: "[Your Turn] This Digimon gets +1000 DP.",
  },
};

function fakeDefinition(cardId: string): CardDefinition {
  return {
    cardId,
    set: "BT21",
    nameEn: cardId,
    kinds: [] as never,
    colors: [] as never,
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...DEFINITIONS[cardId],
  } as CardDefinition;
}

function makePermanent(permanentId: string, seat: Seat, cardId: string): Permanent {
  return {
    permanentId,
    controllerSeat: seat,
    topCard: { instanceId: `${permanentId}-top`, cardId, ownerSeat: seat },
    stack: [] as never,
    linked: [] as never,
    baseDP: 5000,
    currentDP: 5000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

const selfPermanent = makePermanent("self-p", 0 as Seat, CARD_ID);

function makeSource(): CardSource {
  return {
    instanceId: "inst-self",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(CARD_ID),
    permanent: () => selfPermanent,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  } as unknown as CardSource;
}

interface PlaceUnderCall {
  hostId: string;
  instanceIds: string[];
}

function makeContext(opts: {
  ownerHand?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  ownerBattleArea?: Permanent[];
  placed: PlaceUnderCall[];
}): EffectContext {
  const { ownerHand = [], ownerBattleArea = [selfPermanent], placed } = opts;
  const players = [
    { seat: 0 as Seat, battleArea: ownerBattleArea, hand: ownerHand, trash: [], security: [], deck: [] },
    { seat: 1 as Seat, battleArea: [], hand: [], trash: [], security: [], deck: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => ownerBattleArea.find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => fakeDefinition(card.cardId),
  } as unknown as GameAccess;

  // Any primitive the interpreter reaches for is a recorded no-op except placeUnder, which is
  // the observable this test asserts on.
  const fx = new Proxy(
    {
      placeUnder: async (hostId: string, instanceIds: string[]) => {
        placed.push({ hostId, instanceIds });
        return instanceIds;
      },
    } as Record<string, unknown>,
    {
      get: (base, prop: string) => base[prop] ?? (async () => undefined),
      has: (base, prop: string) => prop in base,
    },
  ) as unknown as Primitives;

  const pickFirst = async (_c: unknown, o: { candidates: string[]; max?: number }) => o.candidates.slice(0, o.max ?? 1);
  const ask = {
    optional: async () => true,
    chooseTargets: pickFirst,
    selectPermanents: pickFirst,
    selectCards: pickFirst,
    chooseOption: async () => 0,
  } as unknown as DecisionApi;

  return { source: makeSource(), trigger: {}, game, fx, ask } as unknown as EffectContext;
}

describe("BT21-013 Agunimon — [When Digivolving] placement", () => {
  const module = getEffectModule(CARD_ID);

  it("is registered", () => {
    expect(module).toBeDefined();
  });

  it("places the card under THIS Digimon when no red Tamer is in play", async () => {
    const placed: PlaceUnderCall[] = [];
    const ctx = makeContext({
      ownerHand: [{ instanceId: "hybrid-inst", cardId: "BT12-013", ownerSeat: 0 as Seat }],
      placed,
    });
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, ctx.source);
    expect(effects.length).toBeGreaterThanOrEqual(1);

    await effects[0]!.resolve(ctx);

    expect(placed).toHaveLength(1);
    expect(placed[0]!.hostId).toBe("self-p");
    expect(placed[0]!.instanceIds).toEqual(["hybrid-inst"]);
  });

  it("offers the red Tamer with inherited effects alongside this Digimon", async () => {
    const placed: PlaceUnderCall[] = [];
    const tamer = makePermanent("tamer-p", 0 as Seat, "BT1-085");
    const ctx = makeContext({
      ownerHand: [{ instanceId: "hybrid-inst", cardId: "BT12-013", ownerSeat: 0 as Seat }],
      ownerBattleArea: [selfPermanent, tamer],
      placed,
    });
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, ctx.source);

    const offered: string[][] = [];
    const ask = ctx.ask as unknown as { chooseTargets: DecisionApi["chooseTargets"] };
    const original = ask.chooseTargets;
    ask.chooseTargets = async (c, o) => {
      offered.push([...o.candidates]);
      return original(c, o);
    };

    await effects[0]!.resolve(ctx);

    expect(offered[0]).toEqual(expect.arrayContaining(["self-p", "tamer-p"]));
    expect(placed).toHaveLength(1);
  });
});

describe("BT21-013 Agunimon — observable game behavior", () => {
  it("digivolves from BurningGreymon for 0 and bottoms a selected Hero card from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-013", as: "burningGreymon" }],
          hand: [
            { card: "BT21-013", as: "agunimon" },
            { card: "BT21-016", as: "placedHero" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("burningGreymon").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burningGreymon").topCard.cardId === "BT21-013");
    expect(s.state.memory).toBe(0);
    expect(s.perm("burningGreymon").stack[0]?.instanceId).toBe(s.inst("placedHero").instanceId);
  });

  it("publicly places a Hero under a qualifying red inherited-effect Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-013", as: "burning" },
            { card: "BT21-082", as: "tamer" },
          ],
          hand: [
            { card: "BT21-013", as: "agunimon" },
            { card: "BT21-016", as: "material" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("tamer").topCard.instanceId);
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("burning").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burning").topCard.cardId === "BT21-013");
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toContain(s.inst("material").instanceId);
  });

  it("when attacking, pays the matching red Hero evolution cost reduced by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-013", as: "agunimon" }],
          hand: [{ card: "AD1-003", as: "warGrowlmon" }],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("agunimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agunimon").topCard.cardId === "AD1-003");
    expect(s.perm("agunimon").topCard.cardId).toBe("AD1-003");
    expect(s.state.memory).toBe(3);
  });

  it("does not offer a non-Hybrid/non-Hero attack evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-013", as: "agunimon" }],
          hand: [{ card: "BT1-020", as: "groundramon" }],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("agunimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("agunimon").topCard.cardId).toBe("BT21-013");
    expect(s.state.memory).toBe(5);
  });

  it("grants inherited +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-021", as: "host", dp: 8000, under: ["BT21-013"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(10000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(8000);
  });
});
