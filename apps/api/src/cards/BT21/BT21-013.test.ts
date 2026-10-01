import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT21-013.js";
import "../index.js";

describe("BT21-013 Agunimon — alternate digivolution conditions", () => {
  it("may digivolve from a red Tamer for cost 2", () => {
    const req = matchingAlternateDigivolutionRequirement("BT21-013", "BT1-085");
    expect(req).toBeDefined();
    expect(req?.cost).toBe(2);
    expect(req?.baseIsTamer).toBe(true);
  });

  it("may digivolve from BurningGreymon for cost 0", () => {
    const req = matchingAlternateDigivolutionRequirement("BT21-013", "BT12-013");
    expect(req).toBeDefined();
    expect(req?.cost).toBe(0);
    expect(req?.namesExact).toEqual(["BurningGreymon"]);
  });

  it("may NOT digivolve from a non-red Tamer", () => {
    const req = matchingAlternateDigivolutionRequirement("BT21-013", "AD1-019");
    expect(req).toBeUndefined();
  });
});

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

  it("publicly digivolves from a red Tamer through the printed cost-2 alternate route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-082", as: "redTamer" }],
          hand: [
            { card: "BT21-013", as: "agunimon" },
            { card: "BT21-016", as: "heroMaterial" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redTamer").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redTamer").topCard.cardId === "BT21-013");

    expect(s.state.memory).toBe(3);
    expect(s.perm("redTamer").stack.map((card) => card.cardId)).toContain("BT21-016");
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

  it("publicly places an eligible Hero from trash under the qualifying red Tamer only", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-013", as: "burning" },
            { card: "BT21-082", as: "qualifyingTamer" },
            { card: "BT1-085", as: "redWithoutInherited" },
            { card: "BT17-083", as: "nonRedInherited" },
          ],
          hand: [{ card: "BT21-013", as: "agunimon" }],
          trash: [{ card: "BT21-016", as: "trashHero" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("qualifyingTamer").topCard.instanceId);
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

    expect(s.perm("qualifyingTamer").stack.map((card) => card.instanceId)).toContain(s.inst("trashHero").instanceId);
    expect(s.perm("redWithoutInherited").stack.map((card) => card.instanceId)).not.toContain(
      s.inst("trashHero").instanceId,
    );
    expect(s.perm("nonRedInherited").stack.map((card) => card.instanceId)).not.toContain(
      s.inst("trashHero").instanceId,
    );
    expect(s.perm("burning").stack.map((card) => card.instanceId)).not.toContain(s.inst("trashHero").instanceId);
  });

  it("leaves placement empty when no Hybrid/Hero source exists", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-013", as: "burning" }],
        hand: [{ card: "BT21-013", as: "agunimon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
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
    expect(s.perm("burning").stack).toHaveLength(1);
    expect(s.perm("burning").stack[0]!.cardId).toBe("BT12-013");
  });

  it("publicly declines an eligible Hybrid/Hero placement after BurningGreymon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-013", as: "burning" }],
          hand: [
            { card: "BT21-013", as: "agunimon" },
            { card: "BT21-016", as: "eligible" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
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
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eligible").instanceId)).toBe(true);
    expect(s.perm("burning").stack).toHaveLength(1);
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

const TAKUYA = "BT21-082";
const BURNING_GREYMON = "BT12-013";
const CALUMON = "EX2-045";
const KING_DRASIL = "BT13-007";
const FILLER = ["BT1-010", "BT1-010", "BT1-010"];

function digivolveAgunimonOnto(s: EngineSetup, baseAlias: string, agunimonAlias = "agunimon") {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(baseAlias).permanentId,
    instanceId: s.inst(agunimonAlias).instanceId,
    useAlternateCost: true,
  });
}

function attackPlayer(s: EngineSetup, attackerAlias: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(attackerAlias).permanentId,
    target: { kind: "player" },
  });
}

async function digivolvedFromTakuya(options: { enteredThisTurn?: boolean; opponentSecurity?: string[] } = {}) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: TAKUYA, as: "tamer", enteredThisTurn: options.enteredThisTurn ?? false }],
        hand: [{ card: CARD_ID, as: "agunimon" }],
        deck: [{ card: "BT1-010", as: "drawn" }, "BT1-010"],
      },
      1: { security: options.opponentSecurity ?? ["BT1-010", "BT1-010"], deck: [...FILLER] },
    },
    { autoSelectCards: true, autoDeclineOptional: true },
  );
  s.state.memory = 3;
  await s.ready();
  expect(digivolveAgunimonOnto(s, "tamer")).toEqual({ ok: true });
  await settle(() => s.perm("tamer").topCard.cardId === CARD_ID);
  expect(s.perm("tamer").topCard.cardId).toBe(CARD_ID);
  expect(s.state.memory).toBe(1);
  return s;
}

describe("BT21-013 Agunimon — KB Q&A rulings", () => {
  it("places the card on the bottom of the cards already under the red Tamer (Q4522)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BURNING_GREYMON, as: "burning" },
            { card: TAKUYA, as: "tamer", under: [{ card: "BT21-016", as: "alreadyUnder" }] },
          ],
          hand: [
            { card: CARD_ID, as: "agunimon" },
            { card: "BT21-016", as: "placed" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("tamer").topCard.instanceId);
    s.state.memory = 0;
    await s.ready();

    expect(digivolveAgunimonOnto(s, "burning")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 2);

    expect(s.perm("tamer").topCard.cardId).toBe(TAKUYA);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      s.inst("placed").instanceId,
      s.inst("alreadyUnder").instanceId,
    ]);
  });

  it("digivolves from a Tamer as-is: no 'when a Digimon digivolves' trigger and a can't-digivolve lock does not stop it (Q6671)", async () => {
    const watcherBoard = async (base: "tamer" | "burning") => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              base === "tamer" ? { card: TAKUYA, as: "base" } : { card: BURNING_GREYMON, as: "base" },
              { card: CALUMON, as: "calumon" },
            ],
            hand: [{ card: CARD_ID, as: "agunimon" }],
            deck: [...FILLER],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 3;
      await s.ready();
      expect(digivolveAgunimonOnto(s, "base")).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      await drainMicrotasks();
      return s;
    };

    const fromTamer = await watcherBoard("tamer");
    expect(fromTamer.perm("calumon").isSuspended).toBe(false);
    // Near-miss: digivolving from a Digimon fires Calumon's "when one of your Digimon digivolves".
    const fromDigimon = await watcherBoard("burning");
    expect(fromDigimon.perm("calumon").isSuspended).toBe(true);

    const locked = setupEngine(
      {
        0: {
          breeding: { card: KING_DRASIL, as: "drasil" },
          battleArea: [
            { card: TAKUYA, as: "tamer" },
            { card: BURNING_GREYMON, as: "burning" },
          ],
          hand: [
            { card: CARD_ID, as: "agunimon" },
            { card: CARD_ID, as: "secondAgunimon" },
          ],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    locked.state.memory = 3;
    await locked.ready();

    expect(digivolveAgunimonOnto(locked, "burning", "secondAgunimon")).toMatchObject({ ok: false });
    expect(locked.perm("burning").topCard.cardId).toBe(BURNING_GREYMON);
    expect(digivolveAgunimonOnto(locked, "tamer")).toEqual({ ok: true });
    await settle(() => locked.perm("tamer").topCard.cardId === CARD_ID);
    expect(locked.perm("tamer").topCard.cardId).toBe(CARD_ID);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q6672)", async () => {
    const s = await digivolvedFromTakuya();
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q6673)", async () => {
    const freshTamer = await digivolvedFromTakuya({ enteredThisTurn: true });
    expect(attackPlayer(freshTamer, "tamer")).toMatchObject({ ok: false });
    expect(freshTamer.perm("tamer").isSuspended).toBe(false);
    expect(freshTamer.state.players[1]!.security).toHaveLength(2);

    const establishedTamer = await digivolvedFromTakuya({ enteredThisTurn: false });
    expect(attackPlayer(establishedTamer, "tamer")).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves the field (Q6674)", async () => {
    const s = await digivolvedFromTakuya();
    const tamerCard = s.perm("tamer").stack[0]!;
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual([TAKUYA]);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId])).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [tamerCard.instanceId, s.inst("agunimon").instanceId].sort(),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6675)", async () => {
    const s = await digivolvedFromTakuya({ opponentSecurity: [TAKUYA, "BT1-010"] });
    const buriedTamerId = s.perm("tamer").stack[0]!.instanceId;

    // Opening a [Security] window on the whole stack also collects the buried Tamer's effects,
    // so only the ruling keeps its "play this card" effect from firing.
    await advance(s.engine).fireForPermanent(EffectTiming.SecuritySkill, s.perm("tamer"));
    await drainMicrotasks();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([buriedTamerId]);

    // Near-miss: the same Tamer checked from security does play itself.
    expect(attackPlayer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === TAKUYA));
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([TAKUYA]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([buriedTamerId]);
  });
  it("gains the inherited effect of the Tamer in its digivolution cards (Q6676)", async () => {
    const attackWithAgunimon = async (base: typeof TAKUYA | typeof BURNING_GREYMON) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base" }],
            hand: [
              { card: CARD_ID, as: "agunimon" },
              { card: "BT1-085", as: "redTamer" },
            ],
            deck: [...FILLER],
          },
          1: { security: ["BT1-010", "BT1-010"], deck: [...FILLER] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 3;
      await s.ready();
      expect(digivolveAgunimonOnto(s, "base")).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([base]);

      expect(attackPlayer(s, "base")).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
      await drainMicrotasks();
      return s;
    };

    const fromTakuya = await attackWithAgunimon(TAKUYA);
    expect(
      fromTakuya.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === fromTakuya.inst("redTamer").instanceId,
      ),
    ).toBe(true);
    expect(fromTakuya.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(
      fromTakuya.inst("redTamer").instanceId,
    );

    // Near-miss: without Takuya among its digivolution cards, the same security removal plays nothing.
    const fromBurningGreymon = await attackWithAgunimon(BURNING_GREYMON);
    expect(fromBurningGreymon.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      fromBurningGreymon.inst("redTamer").instanceId,
    );
    expect(fromBurningGreymon.state.players[0]!.battleArea).toHaveLength(1);
  });
});
