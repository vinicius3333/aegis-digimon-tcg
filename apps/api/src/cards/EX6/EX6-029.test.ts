import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./EX6-029.js";

// A3 for EX6-029 (Mastemon)
//
// [On Play] [When Digivolving] ... Then, if DNA digivolving, place 1 other Digimon at
// the bottom of its owner's security stack, and trash cards from the top of your
// opponent's security stack UNTIL IT HAS 4 LEFT.
//
// `SecurityManipulation.leaveCount: 4` is what the interpreter's trashTop case reads
// to compute the amount ("max(0, security.length - leaveCount)"). The card used to
// carry `amount: null` + an unread `until: {securityCount: 4}`, which resolved via
// `action.amount ?? 1` to a FIXED 1-card trash regardless of the opponent's actual
// security count — not "until 4 remain".
//
// FAILS-WHEN-REVERTED: restoring `amount: null` + `until` (dropping `leaveCount`)
// makes the interpreter trash exactly 1 security card no matter how many the
// opponent has, so the assertion on the trashed COUNT below flips from 2 to 1.

const CARD_ID = "EX6-029";

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? CARD_ID,
    set: "EX6",
    nameEn: over.nameEn ?? "Mastemon",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? (["White"] as never),
    playCost: over.playCost ?? 15,
    dp: 13000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSecurityCards(seat: Seat, n: number): CardInstance[] {
  return Array.from({ length: n }, (_, i) => ({
    instanceId: `sec-${seat}-${i}`,
    cardId: "AD1-001",
    ownerSeat: seat,
    faceUp: false,
  })) as unknown as CardInstance[];
}

function makeSource(): CardSource {
  const perm = {
    permanentId: "self-p1",
    controllerSeat: 0 as Seat,
    topCard: { instanceId: "self-top", cardId: CARD_ID, ownerSeat: 0 as Seat },
    stack: [] as never,
    linked: [] as never,
    baseDP: 13000,
    currentDP: 13000,
    isSuspended: false,
    inBreeding: false,
  } as never;
  return {
    instanceId: "inst-self",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => perm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } as CardSource;
}

function makeContext(opponentSecurityCount: number, trashFromSecurityCalled: { seat: Seat; n: number }[]): EffectContext {
  const source = makeSource();
  const players = [
    { seat: 0 as Seat, battleArea: [], hand: [], trash: [], security: [], deck: [] },
    { seat: 1 as Seat, battleArea: [], hand: [], trash: [], security: makeSecurityCards(1 as Seat, opponentSecurityCount), deck: [] },
  ];
  const state = { memory: 10, players, turnSeat: 0 as Seat } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: () => undefined,
    definitionOf: (card: { cardId: string }) => fakeDefinition({ cardId: card.cardId }),
  };

  const fx: Primitives = {
    trashFromSecurity: async (seat: Seat, n: number) => {
      trashFromSecurityCalled.push({ seat, n });
      const player = players[seat]!;
      const removed = player.security.splice(0, n);
      return removed as unknown as CardInstance[];
    },
    useOptionFromHand: async () => [],
    addSecurity: async () => {},
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

  return { source, trigger: { isDnaDigivolve: true }, game, fx, ask } as unknown as EffectContext;
}

describe("EX6-029 (Mastemon)", () => {
  const module = getEffectModule(CARD_ID);

  it("is registered", () => {
    expect(module, "EX6-029 must self-register on import").toBeDefined();
  });

  it("[When Digivolving][DNA] trashes down to exactly 4 remaining opponent security", async () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);

    const trashFromSecurityCalled: { seat: Seat; n: number }[] = [];
    const ctx = makeContext(6, trashFromSecurityCalled);

    for (const effect of effects) await effect.resolve(ctx);

    expect(trashFromSecurityCalled.length).toBeGreaterThanOrEqual(1);
    // 6 security cards, leave 4 => trash exactly 2, not a fixed 1.
    const total = trashFromSecurityCalled.reduce((sum, c) => sum + c.n, 0);
    expect(total).toBe(2);
  });
});
