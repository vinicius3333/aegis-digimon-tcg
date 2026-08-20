import { describe, expect, it } from "vitest";
import { CardColor, CardKind, EffectDuration, EffectTiming, type CardDefinition, type CardInstance, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT13-008.js";

const CARD_ID = "BT13-008";

function definition(cardId: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId === CARD_ID ? "Agumon" : cardId === "BT12-092" ? "Marcus Damon" : cardId,
    kinds: [CardKind.Digimon],
    colors: [CardColor.Red],
    playCost: 3,
    dp: 2000,
    level: 3,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function instance(cardId: string, ownerSeat: Seat, instanceId: string): CardInstance {
  return { cardId, ownerSeat, instanceId, faceUp: true } as CardInstance;
}

function permanent(permanentId: string, card: CardInstance, currentDP: number): Permanent {
  return {
    permanentId,
    controllerSeat: card.ownerSeat,
    topCard: card,
    stack: [],
    linked: [],
    currentDP,
    baseDP: currentDP,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeContext(over: {
  ownBattleArea?: Permanent[];
  opponentBattleArea?: Permanent[];
  optionalAnswer?: boolean;
  suspendedPermanentId?: string;
}) {
  const ownBattleArea = over.ownBattleArea ?? [];
  const opponentBattleArea = over.opponentBattleArea ?? [];
  const players = [
    { seat: 0, battleArea: ownBattleArea, hand: [], trash: [], deck: [], security: [] },
    { seat: 1, battleArea: opponentBattleArea, hand: [], trash: [], deck: [], security: [] },
  ];
  const calls: { verb: string; args: unknown[] }[] = [];
  const definitions = new Map<string, CardDefinition>();
  for (const p of [...ownBattleArea, ...opponentBattleArea]) {
    if (p.topCard) definitions.set(p.topCard.cardId, definition(p.topCard.cardId, { kinds: p.topCard.cardId === "BT12-092" ? [CardKind.Tamer] : [CardKind.Digimon], colors: p.topCard.cardId === "BT12-092" ? [CardColor.Red] : [CardColor.Red] }));
  }
  const sourcePermanent = ownBattleArea.find((p) => p.topCard?.cardId === CARD_ID);
  const source: CardSource = {
    instanceId: sourcePermanent?.topCard?.instanceId ?? "source-instance",
    cardId: CARD_ID,
    ownerSeat: 0,
    definition: definition(CARD_ID),
    permanent: () => sourcePermanent,
    isOnBattleArea: () => sourcePermanent !== undefined,
    isOwnersTurn: () => true,
    hasColor: (color) => color === CardColor.Red || color === CardColor.Yellow,
  };
  const game: GameAccess = {
    state: { memory: 3, players, turnSeat: 0 } as unknown as GameState,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => [...ownBattleArea, ...opponentBattleArea].find((p) => p.permanentId === id),
    definitionOf: (card) => definitions.get(card.cardId) ?? definition(card.cardId),
  };
  const fx = {
    grantKind: (...args: unknown[]) => calls.push({ verb: "grantKind", args }),
    setBaseDP: (...args: unknown[]) => calls.push({ verb: "setBaseDP", args }),
    restrict: (...args: unknown[]) => calls.push({ verb: "restrict", args }),
    deletePermanent: async (...args: unknown[]) => {
      calls.push({ verb: "deletePermanent", args });
      return 1;
    },
    subscribeSubTrigger: (sub: unknown) => {
      calls.push({ verb: "subscribeSubTrigger", args: [sub] });
      return 1;
    },
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => over.optionalAnswer ?? true,
    chooseTargets: async (_ctx, options) => options.candidates.slice(0, options.max),
    selectPermanents: async (_ctx, options) => options.candidates.slice(0, options.max),
    selectCards: async (_ctx, options) => options.candidates.slice(0, options.max),
    chooseOption: async () => 0,
  };
  const ctx: EffectContext = {
    source,
    trigger: { suspendedPermanentId: over.suspendedPermanentId },
    game,
    fx,
    ask,
  };
  return { ctx, calls, source };
}

describe("BT13-008 Agumon", () => {
  const module = getEffectModule(CARD_ID);

  it("registers the card and exposes its main and inherited effects", () => {
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.OnDeclaration, {} as CardSource)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, {} as CardSource)).toHaveLength(2);
  });

  it("treats one Marcus Damon as a 3000 DP Digimon and restricts its digivolution", async () => {
    const agumon = permanent("agumon", instance(CARD_ID, 0 as Seat, "agumon-instance"), 2000);
    const marcus = permanent("marcus", instance("BT12-092", 0 as Seat, "marcus-instance"), 0);
    const { ctx, calls } = makeContext({ ownBattleArea: [agumon, marcus] });
    const effect = module!.effectsForTiming(EffectTiming.OnDeclaration, ctx.source)[0]!;

    await effect.resolve(ctx);

    expect(calls.find((call) => call.verb === "grantKind")?.args).toEqual(["marcus", [CardKind.Digimon], EffectDuration.UntilEachTurnEnd]);
    expect(calls.find((call) => call.verb === "setBaseDP")?.args).toEqual(["marcus", 3000, EffectDuration.UntilEachTurnEnd]);
    expect(calls.find((call) => call.verb === "restrict")?.args).toEqual(["marcus", "digivolve", EffectDuration.UntilEachTurnEnd]);
  });

  it("offers the inherited deletion as optional and does nothing when declined", async () => {
    const agumon = permanent("agumon", instance(CARD_ID, 0 as Seat, "agumon-instance"), 2000);
    const tamer = permanent("tamer", instance("BT12-092", 0 as Seat, "tamer-instance"), 0);
    const target = permanent("target", instance("OPPONENT-DIGIMON", 1 as Seat, "target-instance"), 3000);
    const { ctx, calls } = makeContext({
      ownBattleArea: [agumon, tamer],
      opponentBattleArea: [target],
      optionalAnswer: false,
      suspendedPermanentId: "tamer",
    });
    const effect = module!.effectsForTiming(EffectTiming.None, ctx.source)[1]!;

    await effect.resolve(ctx);
    const subscription = calls.find((call) => call.verb === "subscribeSubTrigger")?.args[0] as { run: (subCtx: EffectContext) => Promise<void> };
    expect(subscription).toBeDefined();
    await subscription.run(ctx);
    expect(calls.filter((call) => call.verb === "deletePermanent")).toHaveLength(0);
  });
});
