import { describe, it, expect } from "vitest";
import {
  CardKind,
  EffectDuration,
  EffectTiming,
  type CardDefinition,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-094.js";

// A3 for BT10-094 (Breaclaw, Red Option)
//
// [Main] 1 Digimon gets +2000 DP. Optionally place a Gammamon from hand under a Digimon
//   as its bottom digivolution card → Draw 1.
// [Security] Play 1 Gammamon from hand or trash without cost.
//
// Primary A3: [Main] calls modifyDP(+2000) on the chosen Digimon, and if a Gammamon
// is placed, calls placeUnder then draw. Without the effect these would not be called.
//
// FAILS-WHEN-REVERTED: if [Main] were removed, modifyDP would never be called.

const CARD_ID = "BT10-094";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? CARD_ID,
    set: "BT10",
    nameEn: over.nameEn ?? "Breaclaw",
    kinds: (over.kinds as never) ?? (["Option"] as never),
    colors: (over.colors as never) ?? (["Red"] as never),
    playCost: over.playCost ?? 4,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
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

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "inst-breaclaw",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef(),
    permanent: () => undefined,
    isOnBattleArea: () => false, // Option cards are not on battle area
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

interface FxRecord {
  modifyDPCalls: { permanentId: string; delta: number; duration: EffectDuration }[];
  placeUnderCalls: { targetPermanentId: string; instanceIds: string[] }[];
  drawCalls: { seat: Seat; n: number }[];
}

function makeContext(opts: {
  source?: CardSource;
  ownerBattleArea?: Permanent[];
  ownerHand?: { instanceId: string; cardId: string }[];
  ownerTrash?: { instanceId: string; cardId: string }[];
  definitions?: Record<string, Partial<CardDefinition>>;
  record?: FxRecord;
}): EffectContext {
  const {
    source,
    ownerBattleArea = [],
    ownerHand = [],
    ownerTrash = [],
    definitions = {},
    record = { modifyDPCalls: [], placeUnderCalls: [], drawCalls: [] },
  } = opts;

  const players = [
    { seat: 0 as Seat, battleArea: ownerBattleArea, hand: ownerHand, trash: ownerTrash, security: [], deck: [] },
    { seat: 1 as Seat, battleArea: [], hand: [], trash: [], security: [], deck: [] },
  ];
  const state = { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => ownerBattleArea.find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => {
      const over = definitions[card.cardId] ?? {};
      return fakeDef({ cardId: card.cardId, ...over });
    },
  };

  const fx: Primitives = {
    modifyDP: (permanentId: string, delta: number, duration: EffectDuration) => {
      record.modifyDPCalls.push({ permanentId, delta, duration });
    },
    placeUnder: async (targetPermanentId: string, instanceIds: string[]) => {
      record.placeUnderCalls.push({ targetPermanentId, instanceIds: [...instanceIds] });
      return [];
    },
    draw: async (seat: Seat, n: number) => {
      record.drawCalls.push({ seat, n });
      return [];
    },
    playInstances: async () => [],
    gainMemory: () => {},
    gainMemoryForSeat: () => {},
    restrictMemoryGain: () => {},
    restrictCostReduction: () => {},
    declareWinner: () => {},
    setMemory: () => {},
    setBaseDP: () => {},
    playFromHand: async () => [],
    playFromSecurity: async () => undefined,
    digivolveFromInstance: async () => undefined,
    dnaDigivolveInto: async () => undefined,
    deDigivolve: () => [],
    placeOwnTopAtStackBottom: () => false,
    relocatePermanent: () => false,
    link: async () => [],
    trash: async () => [],
    trashDigivolutionCards: async () => [],
    trashFromSecurity: async () => [],
    deletePermanent: async () => 0,
    suspend: async () => [],
    unsuspend: () => {},
    returnToHand: async () => [],
    returnToDeck: async () => [],
    reveal: async () => [],
    searchDeck: async () => [],
    addSecurity: async () => {},
    grantPierce: () => {},
    changeEvoCost: () => {},
    changePlayCost: () => {},
    grantNameTrait: () => {},
    grantKeyword: () => {},
    grantLinkMax: () => {},
    grantLinkCostReduction: () => {},
    waiveColorRequirement: () => {},
    shuffleSecurity: () => {},
    securityToHand: () => [],
    recoverToSecurity: async () => [],
    flipTopSecurity: () => false,
    flipSecurityFaceUp: () => false,
    forceAttack: async () => {},
    redirectAttack: async () => {},
    subscribeSubTrigger: () => 0,
    subscribeReplacement: () => 0,
    conferStackEffects: () => {},
    fireOptionUsed: async () => {},
    fireOnDiscardLibrary: async () => {},
    fireWhenTrashedFromDeck: async () => {},
    restrict: () => {},
    cannotIgnoreDigivolution: () => {},
    addColorGrant: () => {},
    movePermanentZone: async () => false,
    hatch: () => undefined,
    placeUnderFromEggDeck: async () => undefined,
    placeAsTopFromEggDeck: async () => undefined,
    endAttack: () => {},
    useOptionFromHand: async () => [],
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max ?? 1),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max ?? 1),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max ?? 1),
    chooseOption: async () => 0,
  };

  return { source: source ?? makeSource(), trigger: {}, game, fx, ask };
}

describe("BT10-094 (Breaclaw)", () => {
  const module = getEffectModule(CARD_ID);

  it("is registered", () => {
    expect(module, "BT10-094 must self-register on import").toBeDefined();
  });

  it("routes [Main] to OnUseOption timing", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it("[Main] calls modifyDP +2000 on the chosen Digimon", async () => {
    // Primary A3: modifyDP(+2000, UntilEachTurnEnd) is called for the chosen Digimon.
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);

    const digiPerm = makePermanent("digi-p1", 0, "BT3-019");
    const record: FxRecord = { modifyDPCalls: [], placeUnderCalls: [], drawCalls: [] };

    const ctx = makeContext({
      source,
      ownerBattleArea: [digiPerm],
      ownerHand: [],
      definitions: {
        "BT3-019": { cardId: "BT3-019", nameEn: "Agumon", kinds: [CardKind.Digimon] as never, dp: 5000 },
      },
      record,
    });

    await effects[0]!.resolve(ctx);

    const dpCall = record.modifyDPCalls.find((c) => c.permanentId === "digi-p1");
    expect(dpCall, "modifyDP must be called for the chosen Digimon").toBeDefined();
    expect(dpCall!.delta).toBe(2000);
    expect(dpCall!.duration).toBe(EffectDuration.UntilEachTurnEnd);
  });

  it("[Main] calls placeUnder and draw 1 when Gammamon is in hand", async () => {
    // With a Gammamon in hand and a Digimon on field, placeUnder + draw 1 are called.
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);

    const digiPerm = makePermanent("digi-p2", 0, "BT3-019");
    const gammamonCard = { instanceId: "gammamon-inst", cardId: "BT10-GammaBase" };
    const record: FxRecord = { modifyDPCalls: [], placeUnderCalls: [], drawCalls: [] };

    const ctx = makeContext({
      source,
      ownerBattleArea: [digiPerm],
      ownerHand: [gammamonCard],
      definitions: {
        "BT3-019": { cardId: "BT3-019", nameEn: "Agumon", kinds: [CardKind.Digimon] as never, dp: 5000 },
        "BT10-GammaBase": {
          cardId: "BT10-GammaBase",
          nameEn: "Gammamon",
          kinds: [CardKind.Digimon] as never,
          dp: 2000,
        },
      },
      record,
    });

    await effects[0]!.resolve(ctx);

    expect(record.placeUnderCalls.length).toBeGreaterThanOrEqual(1);
    expect(record.placeUnderCalls[0]!.instanceIds).toContain("gammamon-inst");
    expect(record.drawCalls.length).toBeGreaterThanOrEqual(1);
    expect(record.drawCalls[0]!.n).toBe(1);
    expect(record.drawCalls[0]!.seat).toBe(0);
  });

  it("routes [Security] to SecuritySkill timing", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source).length).toBeGreaterThanOrEqual(1);
  });

  it("Security plays Gammamon without cost from either hand or trash", async () => {
    for (const zone of ["hand", "trash"] as const) {
      const s = setupEngine(
        {
          0: {
            security: [{ card: CARD_ID, as: "source", faceUp: true }],
            [zone]: [{ card: "BT8-008", as: "gammamon" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      const gammamonId = s.inst("gammamon").instanceId;
      s.state.memory = 0;

      await s.ready();
      await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("source"));
      await settle(() =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === gammamonId),
      );

      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === gammamonId)).toBe(
        true,
      );
      expect(s.state.players[0]![zone].some((card) => card.instanceId === gammamonId)).toBe(false);
    }
  });

  it("Security may decline playing Gammamon", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: CARD_ID, as: "source", faceUp: true }],
          hand: [{ card: "BT8-008", as: "gammamon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const gammamonId = s.inst("gammamon").instanceId;

    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("source"));
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === CARD_ID));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === gammamonId)).toBe(
      false,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === gammamonId)).toBe(true);
  });
});
