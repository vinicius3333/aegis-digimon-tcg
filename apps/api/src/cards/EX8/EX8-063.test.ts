import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./EX8-063.js";

/**
 * A3 for EX8-063 Barbamon (X Antibody) — shared [When Digivolving]/[When Attacking]
 * "opponent may trash 1 from hand; if not, you may play 1 [Fallen Angel] ≤7 from trash"
 *
 * Two scenarios tested:
 *  1. Opponent has no cards in hand → trash step skipped → controller may play from trash.
 *  2. Opponent has a card and trashes it → play-from-trash step is skipped.
 *
 * FAILS-WHEN-REVERTED: strip the opponentTrashed gate — the play-from-trash step always
 * fires regardless of whether the opponent trashed, so playInstances would be called even
 * in scenario 2.
 */

const cardId = "EX8-063";

let seq = 0;
function inst(cId: string, owner: Seat = 0): CardInstance {
  seq++;
  return {
    instanceId: `i-${seq}`,
    cardId: cId,
    ownerSeat: owner,
    faceUp: true,
  } as unknown as CardInstance;
}

function makePerm(permanentId: string, topCardId: string, seat: Seat = 0): Permanent {
  seq++;
  return {
    permanentId,
    controllerSeat: seat,
    topCard: inst(topCardId, seat),
    stack: [],
    linked: [],
    baseDP: 7000,
    currentDP: 7000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(permanentId = "perm-barbamon"): CardSource {
  const topCard = inst(cardId, 0);
  const perm = makePerm(permanentId, cardId, 0);
  perm.topCard = topCard;
  return {
    instanceId: topCard.instanceId,
    cardId,
    ownerSeat: 0 as Seat,
    definition: {
      cardId,
      set: "EX8",
      nameEn: "Barbamon (X Antibody)",
      kinds: [CardKind.Digimon] as never,
      colors: ["Purple"] as never,
      playCost: 13,
      level: 7,
      evoCosts: [],
      maxCountInDeck: 4,
    } as unknown as CardDefinition,
    permanent: () => perm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

interface TestState {
  ownHand: CardInstance[];
  ownTrash: CardInstance[];
  opponentHand: CardInstance[];
  opponentTrash: CardInstance[];
  ownBattleArea: Permanent[];
  opponentBattleArea: Permanent[];
}

function makeContext(state: TestState, decisions: {
  optionalAnswers: boolean[];
  selectCardsResults: string[][];
}): { ctx: EffectContext; trashedIds: string[]; playedInstanceIds: string[] } {
  const trashedIds: string[] = [];
  const playedInstanceIds: string[] = [];

  let optIdx = 0;
  let selIdx = 0;

  const ownPlayer = {
    seat: 0 as Seat,
    battleArea: state.ownBattleArea,
    hand: state.ownHand,
    trash: state.ownTrash,
    deck: [],
    security: [],
  };
  const opponentPlayer = {
    seat: 1 as Seat,
    battleArea: state.opponentBattleArea,
    hand: state.opponentHand,
    trash: state.opponentTrash,
    deck: [],
    security: [],
  };

  const allCards = new Map<string, CardInstance>([
    ...state.ownHand.map((c) => [c.instanceId, c] as [string, CardInstance]),
    ...state.ownTrash.map((c) => [c.instanceId, c] as [string, CardInstance]),
    ...state.opponentHand.map((c) => [c.instanceId, c] as [string, CardInstance]),
    ...state.opponentTrash.map((c) => [c.instanceId, c] as [string, CardInstance]),
  ]);

  const fallenAngelDef: CardDefinition = {
    cardId: "BT2-049",
    set: "BT2",
    nameEn: "Devimon",
    kinds: [CardKind.Digimon] as never,
    colors: ["Purple"] as never,
    playCost: 5,
    level: 4,
    types: ["Fallen Angel"] as never,
    evoCosts: [],
    maxCountInDeck: 4,
  } as unknown as CardDefinition;

  const vanillaDef: CardDefinition = {
    cardId: "BT2-001",
    set: "BT2",
    nameEn: "Agumon",
    kinds: [CardKind.Digimon] as never,
    colors: ["Red"] as never,
    playCost: 3,
    level: 3,
    types: [],
    evoCosts: [],
    maxCountInDeck: 4,
  } as unknown as CardDefinition;

  const game: GameAccess = {
    state: {} as never,
    player: (seat: Seat) => (seat === 0 ? ownPlayer : opponentPlayer) as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (card: CardInstance) => {
      // Use the right def based on cardId
      if (card.cardId === "BT2-049") return fallenAngelDef;
      return vanillaDef;
    },
  };

  const fx = {
    trash: async (ids: string[]) => {
      trashedIds.push(...ids);
      // Move from opponent hand to trash
      for (const id of ids) {
        const idx = opponentPlayer.hand.findIndex((c) => c.instanceId === id);
        if (idx >= 0) {
          const [removed] = opponentPlayer.hand.splice(idx, 1);
          opponentPlayer.trash.push(removed!);
        }
      }
      return ids.map((id) => allCards.get(id)).filter(Boolean) as CardInstance[];
    },
    playInstances: async (ids: string[]) => {
      playedInstanceIds.push(...ids);
      return [];
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async (_ctx, _prompt) => {
      const answer = decisions.optionalAnswers[optIdx] ?? false;
      optIdx++;
      return answer;
    },
    selectCards: async (_ctx, opts) => {
      const result = decisions.selectCardsResults[selIdx] ?? opts.candidates.slice(0, opts.max);
      selIdx++;
      return result;
    },
    chooseTargets: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectPermanents: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    chooseOption: async () => 0,
  };

  const source = makeSource();

  const ctx: EffectContext = {
    source,
    trigger: {},
    game,
    fx,
    ask,
  };

  return { ctx, trashedIds, playedInstanceIds };
}

describe("EX8-063 Barbamon (X Antibody) — opponent-hand-discard-or-play-Fallen-Angel", () => {
  const mod = getEffectModule(cardId);

  it("registers as a hand-written EffectModule (not the IR stub)", () => {
    expect(mod).toBeDefined();
    expect(typeof mod!.effectsForTiming).toBe("function");
  });

  it("produces 1 effect for WhenDigivolving timing", () => {
    const source = makeSource();
    const effects = mod!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects).toHaveLength(1);
  });

  it("produces 1 effect for OnAllyAttack timing (WhenAttacking)", () => {
    const source = makeSource();
    const effects = mod!.effectsForTiming(EffectTiming.OnAllyAttack, source);
    expect(effects).toHaveLength(1);
  });

  it("both timings share the same effectKey (shared once-per-turn counter)", () => {
    const source = makeSource();
    const digivolvingEffect = mod!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    const attackingEffect = mod!.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]!;
    expect(digivolvingEffect.effectKey).toBe(attackingEffect.effectKey);
  });

  it("produces no effects for unrelated timings", () => {
    const source = makeSource();
    expect(mod!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    expect(mod!.effectsForTiming(EffectTiming.None, source)).toHaveLength(0);
  });

  describe("[When Digivolving] — opponent has no hand cards", () => {
    it("skips the trash step and lets the controller play a Fallen Angel from trash", async () => {
      const fallenAngel = inst("BT2-049", 0); // Fallen Angel, cost 5
      const state: TestState = {
        ownHand: [],
        ownTrash: [fallenAngel],
        opponentHand: [],       // empty — trash step is skipped
        opponentTrash: [],
        ownBattleArea: [],
        opponentBattleArea: [],
      };

      // optional[0]: controller says "yes" to playing from trash
      const { ctx, trashedIds, playedInstanceIds } = makeContext(state, {
        optionalAnswers: [true],
        selectCardsResults: [[fallenAngel.instanceId]],
      });

      const source = makeSource();
      const effects = mod!.effectsForTiming(EffectTiming.WhenDigivolving, source);
      await effects[0]!.resolve(ctx);

      expect(trashedIds).toHaveLength(0); // opponent did NOT trash
      expect(playedInstanceIds).toContain(fallenAngel.instanceId); // controller played from trash
    });
  });

  describe("[When Digivolving] — opponent trashes a card", () => {
    it("trashes the opponent's selected card and skips the play-from-trash step", async () => {
      const opponentCard = inst("BT2-001", 1); // vanilla card in opponent's hand
      const fallenAngel = inst("BT2-049", 0); // Fallen Angel, cost 5, in controller's trash
      const state: TestState = {
        ownHand: [],
        ownTrash: [fallenAngel],
        opponentHand: [opponentCard],
        opponentTrash: [],
        ownBattleArea: [],
        opponentBattleArea: [],
      };

      // optional[0]: the prompt for "opponent may trash" → true (they trash)
      // selectCards[0]: they pick their own hand card
      // (the play-from-trash step is skipped because opponentTrashed = true)
      const { ctx, trashedIds, playedInstanceIds } = makeContext(state, {
        optionalAnswers: [true],
        selectCardsResults: [[opponentCard.instanceId]],
      });

      const source = makeSource();
      const effects = mod!.effectsForTiming(EffectTiming.WhenDigivolving, source);
      await effects[0]!.resolve(ctx);

      expect(trashedIds).toContain(opponentCard.instanceId); // opponent trashed
      expect(playedInstanceIds).toHaveLength(0); // play-from-trash step was skipped
    });
  });
});
