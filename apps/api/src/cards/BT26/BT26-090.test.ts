import { CardKind, EffectTiming, type CardDefinition, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT26-090.js";

const CARD_ID = "BT26-090";

function definition(cardId: string): CardDefinition {
  const option = cardId.startsWith("option");
  return {
    cardId,
    set: "BT26",
    nameEn: cardId,
    colors: ["Green"] as never,
    kinds: [option ? CardKind.Option : CardKind.Tamer],
    playCost: cardId === "option-7" ? 7 : 3,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    types: cardId === "option-wrong-trait" ? ["ADAMAS"] : ["TS"],
  };
}

function makeHarness(options: {
  memory?: number;
  suspended?: boolean;
  suspendSucceeds?: boolean;
  hand?: string[];
  decline?: boolean;
  ownersTurn?: boolean;
} = {}) {
  const self = {
    permanentId: "kanan",
    controllerSeat: 0 as Seat,
    isSuspended: options.suspended ?? false,
    inBreeding: false,
    topCard: { instanceId: "kanan-card", cardId: CARD_ID, ownerSeat: 0 as Seat, faceUp: true },
  } as Permanent;
  const source = {
    instanceId: "kanan-card",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition(CARD_ID),
    permanent: () => self,
    isOnBattleArea: () => true,
    isOwnersTurn: () => options.ownersTurn ?? true,
    hasColor: () => true,
  } as CardSource;
  const hand = (options.hand ?? []).map((cardId) => ({ instanceId: `${cardId}-instance`, cardId }));
  const players = [
    { seat: 0 as Seat, hand, battleArea: [self] },
    { seat: 1 as Seat, hand: [], battleArea: [] },
  ];
  const state = { memory: options.memory ?? 0, turnSeat: 0 as Seat, players } as unknown as GameState;
  const calls: string[] = [];
  const fx = {
    gainMemory: vi.fn((amount: number) => calls.push(`memory:${amount}`)),
    suspend: vi.fn(async () => {
      calls.push("suspend:kanan");
      return options.suspendSucceeds === false ? [] : [self.permanentId];
    }),
    useOptionFromHand: vi.fn(async (_ctx: EffectContext, id: string, cost?: number) =>
      calls.push(`use:${id}:${cost}`),
    ),
    playFromSecurity: vi.fn(async (id: string, opts: { payCost: boolean }) =>
      calls.push(`security:${id}:${opts.payCost}`),
    ),
  } as unknown as Primitives;
  const offered: string[][] = [];
  const ask = {
    selectCards: vi.fn(async (_ctx: unknown, selection: { candidates: string[] }) => {
      offered.push(selection.candidates);
      return options.decline ? [] : [selection.candidates[0]!];
    }),
  } as unknown as EffectContext["ask"];
  const game = {
    state,
    player: (seat: Seat) => players[seat],
    opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
    definitionOf: (card: { cardId: string }) => definition(card.cardId),
  } as unknown as GameAccess;
  return { calls, ctx: { source, trigger: {}, game, fx, ask } as EffectContext, offered, source };
}

function effect(timing: EffectTiming, source: CardSource, key: string) {
  const found = getEffectModule(CARD_ID)!.effectsForTiming(timing, source).find((item) => item.effectKey.endsWith(key));
  expect(found).toBeDefined();
  return found!;
}

describe("BT26-090 Kanan Yuki", () => {
  it("gains 1 at 4 memory, but not at 5 or during the opponent's turn (Q7143)", async () => {
    const atFour = makeHarness({ memory: 4 });
    const atFive = makeHarness({ memory: 5 });
    const opponentTurn = makeHarness({ memory: -4, ownersTurn: false });
    const key = "start-main-conditional-gain-memory";

    expect(effect(EffectTiming.OnStartMainPhase, atFour.source, key).canActivate(atFour.ctx)).toBe(true);
    await effect(EffectTiming.OnStartMainPhase, atFour.source, key).resolve(atFour.ctx);
    expect(atFour.calls).toEqual(["memory:1"]);
    expect(effect(EffectTiming.OnStartMainPhase, atFive.source, key).canActivate(atFive.ctx)).toBe(false);
    expect(effect(EffectTiming.OnStartMainPhase, opponentTurn.source, key).canTrigger(opponentTurn.ctx)).toBe(false);
  });

  it("filters to TS Options, suspends first, and pays printed cost minus opponent memory", async () => {
    const h = makeHarness({
      memory: -3,
      hand: ["option-7", "option-wrong-trait", "not-an-option"],
    });
    const end = effect(EffectTiming.OnEndTurn, h.source, "end-turn-suspend-use-ts-option");

    expect(end.canActivate(h.ctx)).toBe(true);
    await end.resolve(h.ctx);
    expect(h.offered).toEqual([["option-7-instance"]]);
    expect(h.calls).toEqual(["suspend:kanan", "memory:-4", "use:option-7-instance:7"]);
  });

  it("floors the paid cost at 0 when the opponent has enough memory", async () => {
    const h = makeHarness({ memory: -8, hand: ["option-7"] });
    await effect(EffectTiming.OnEndTurn, h.source, "end-turn-suspend-use-ts-option").resolve(h.ctx);
    expect(h.calls).toEqual(["suspend:kanan", "use:option-7-instance:7"]);
  });

  it("pays no suspend cost when the optional use is declined", async () => {
    const h = makeHarness({ hand: ["option-7"], decline: true });
    await effect(EffectTiming.OnEndTurn, h.source, "end-turn-suspend-use-ts-option").resolve(h.ctx);
    expect(h.calls).toEqual([]);
  });

  it("does not pay or use the Option when suspending the Tamer fails", async () => {
    const h = makeHarness({ hand: ["option-7"], suspendSucceeds: false });
    await effect(EffectTiming.OnEndTurn, h.source, "end-turn-suspend-use-ts-option").resolve(h.ctx);
    expect(h.calls).toEqual(["suspend:kanan"]);
  });

  it("cannot activate while suspended or without a TS Option", () => {
    const suspended = makeHarness({ suspended: true, hand: ["option-7"] });
    const wrongHand = makeHarness({ hand: ["option-wrong-trait", "not-an-option"] });
    const key = "end-turn-suspend-use-ts-option";
    expect(effect(EffectTiming.OnEndTurn, suspended.source, key).canActivate(suspended.ctx)).toBe(false);
    expect(effect(EffectTiming.OnEndTurn, wrongHand.source, key).canActivate(wrongHand.ctx)).toBe(false);
  });

  it("plays itself from security without paying the cost", async () => {
    const h = makeHarness();
    await effect(EffectTiming.SecuritySkill, h.source, "security-play-free").resolve(h.ctx);
    expect(h.calls).toEqual(["security:kanan-card:false"]);
  });
});
