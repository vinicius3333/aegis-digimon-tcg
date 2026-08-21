import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT10-041.js";

// A3 for BT10-041 (Sakuyamon: Maid Mode)
//
// [When Digivolving] Use 1 Option card with [Plug-In] in its name, or yellow cost ≤5,
//   from hand without cost. Place the used Option on top of security instead of trash.
// [When Attacking] This Digimon may digivolve into a [Sakuyamon] from hand for cost 1,
//   ignoring digivolution requirements.
//
// Primary effect under test: [When Digivolving] — after useOptionFromHand, the Option
// (found in trash) is moved to owner's security via addSecurity. Without this routing,
// addSecurity would never be called.
//
const CARD_ID = "BT10-041";

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? CARD_ID,
    set: "BT10",
    nameEn: over.nameEn ?? "Sakuyamon: Maid Mode",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? (["Yellow"] as never),
    playCost: over.playCost ?? 13,
    dp: 12000,
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
    baseDP: 6000,
    currentDP: 6000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  const perm = makePermanent("self-p1", 0, CARD_ID);
  return {
    instanceId: "inst-self",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => perm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

function makeContext(opts: {
  source?: CardSource;
  ownerHand?: { instanceId: string; cardId: string }[];
  ownerTrash?: { instanceId: string; cardId: string }[];
  ownerSecurity?: { instanceId: string; cardId: string }[];
  ownerBattleArea?: Permanent[];
  useOptionFromHandCalled?: { ids: string[] };
  addSecurityCalled?: { seat: Seat; ids: string[] };
  definitions?: Record<string, Partial<CardDefinition>>;
}): EffectContext {
  const {
    source,
    ownerHand = [],
    ownerTrash = [],
    ownerSecurity = [],
    ownerBattleArea = [],
    useOptionFromHandCalled = { ids: [] },
    addSecurityCalled = { seat: -1 as Seat, ids: [] },
    definitions = {},
  } = opts;

  const players = [
    {
      seat: 0 as Seat,
      battleArea: ownerBattleArea,
      hand: ownerHand,
      trash: ownerTrash,
      security: ownerSecurity,
      deck: [],
    },
    { seat: 1 as Seat, battleArea: [], hand: [], trash: [], security: [], deck: [] },
  ];
  const state = { memory: 10, players, turnSeat: 0 as Seat } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => ownerBattleArea.find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => {
      const over = definitions[card.cardId] ?? {};
      return fakeDefinition({ cardId: card.cardId, ...over });
    },
  };

  const fx: Primitives = {
    useOptionFromHand: async (_ctx: EffectContext, instanceId: string) => {
      useOptionFromHandCalled.ids.push(instanceId);
      // simulate the card being moved to trash after use
      const idx = ownerHand.findIndex((c) => c.instanceId === instanceId);
      if (idx >= 0) {
        const [card] = ownerHand.splice(idx, 1);
        if (card) ownerTrash.push(card);
      }
      return [];
    },
    addSecurity: async (seat: Seat, ids: string[]) => {
      addSecurityCalled.seat = seat;
      addSecurityCalled.ids = ids;
      return;
    },
    digivolveFromInstance: async () => undefined,
    draw: async () => [],
    gainMemory: () => {},
    gainMemoryForSeat: () => {},
    restrictMemoryGain: () => {},
    restrictCostReduction: () => {},
    declareWinner: () => {},
    setMemory: () => {},
    modifyDP: () => {},
    setBaseDP: () => {},
    playFromHand: async () => [],
    playFromSecurity: async () => undefined,
    playInstances: async () => [],
    dnaDigivolveInto: async () => undefined,
    deDigivolve: () => [],
    placeUnder: async () => [],
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

describe("BT10-041 (Sakuyamon: Maid Mode)", () => {
  const module = getEffectModule(CARD_ID);

  it("is registered", () => {
    expect(module, "BT10-041 must self-register on import").toBeDefined();
  });

  it("routes [When Digivolving] to WhenDigivolving timing", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it("[When Digivolving] uses option from hand and moves it to security", async () => {
    // Primary A3: after [When Digivolving] resolves with a Plug-In option in hand,
    // useOptionFromHand is called and the card is placed on security via addSecurity.
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);

    const handCard = { instanceId: "plugin-inst", cardId: "P-037" };
    const ownerHand = [handCard];
    const ownerTrash: { instanceId: string; cardId: string }[] = [];
    const useOptionFromHandCalled = { ids: [] as string[] };
    const addSecurityCalled = { seat: -1 as Seat, ids: [] as string[] };

    const ctx = makeContext({
      source,
      ownerHand,
      ownerTrash,
      useOptionFromHandCalled,
      addSecurityCalled,
      definitions: {
        "P-037": {
          cardId: "P-037",
          nameEn: "Plug-In",
          kinds: [CardKind.Option] as never,
          playCost: 4,
          colors: ["Yellow"] as never,
        },
      },
    });

    await effects[0]!.resolve(ctx);

    // useOptionFromHand must be called with the plugin's instanceId.
    expect(useOptionFromHandCalled.ids).toContain("plugin-inst");
    // After use, card is in trash → addSecurity must be called to move it to security.
    expect(addSecurityCalled.ids).toContain("plugin-inst");
    expect(addSecurityCalled.seat).toBe(0);
  });

  it("[When Digivolving] does NOT call addSecurity when eligible option is absent", async () => {
    // canActivate guard: no eligible option in hand means the effect does not fire.
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);

    const addSecurityCalled = { seat: -1 as Seat, ids: [] as string[] };
    const useOptionFromHandCalled = { ids: [] as string[] };
    const ctx = makeContext({ source, ownerHand: [], addSecurityCalled, useOptionFromHandCalled });

    // canActivate returns false when hand is empty.
    const canActivate = effects[0]!.canActivate?.(ctx) ?? true;
    expect(canActivate).toBe(false);
  });

  it("routes [When Attacking] to OnUseAttack timing", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnUseAttack, source).length).toBeGreaterThanOrEqual(1);
  });
});
