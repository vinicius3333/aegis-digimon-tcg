import { describe, it, expect } from "vitest";
import {
  CardKind,
  EffectTiming,
  type CardDefinition,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT21-082.js";

// BT21-082 (Takuya Kanbara)
//
// [Start of Your Main Phase] 1 of your Digimon or Tamers may digivolve into a [Hybrid]/[Hero]
// Digimon card in the hand. For each of your red Tamers with DIFFERENT NAMES, reduce this
// effect's digivolution cost by 1. (documented behavior)
//
// documented behavior passes `reduceCostTuple: (reduceCost: costReduction(), ...)` directly into
// DigivolveIntoHandOrTrashCard, so the reduction is part of THIS digivolve. The earlier IR
// modelled it as a sibling `wouldDigivolve` Replacement, which could never reach the digivolve
// in the same action list — the full cost was always charged.
//
// KB Q4595: with only this card in the battle area the cost is still reduced by 1 (it counts
// itself). Q4595 is the assertion in "counts itself" below.
//
// FAILS-WHEN-REVERTED: revert `reduceCostScaling` to the Replacement encoding and costDelta
// arrives as undefined instead of -1 / -2.

const CARD_ID = "BT21-082";

const DEFINITIONS: Record<string, Partial<CardDefinition>> = {
  [CARD_ID]: {
    nameEn: "Takuya Kanbara",
    kinds: [CardKind.Tamer] as never,
    colors: ["Red"] as never,
    types: ["Hero"] as never,
  },
  // A second red Tamer with a DIFFERENT name — adds 1 to the reduction.
  "BT21-083": {
    nameEn: "Koji Minamoto",
    kinds: [CardKind.Tamer] as never,
    colors: ["Red"] as never,
    types: ["Hero"] as never,
  },
  // The [Hybrid] Digimon in hand this effect digivolves into.
  "BT21-013": {
    nameEn: "Agunimon",
    kinds: [CardKind.Digimon] as never,
    colors: ["Red"] as never,
    level: 4,
    forms: ["Hybrid"] as never,
    types: ["Wizard", "Hero"] as never,
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

function makePermanent(permanentId: string, cardId: string): Permanent {
  return {
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: { instanceId: `${permanentId}-top`, cardId, ownerSeat: 0 as Seat },
    stack: [] as never,
    linked: [] as never,
    baseDP: 0,
    currentDP: 0,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

const selfPermanent = makePermanent("takuya-p", CARD_ID);

function makeSource(): CardSource {
  return {
    instanceId: "inst-takuya",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(CARD_ID),
    permanent: () => selfPermanent,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  } as unknown as CardSource;
}

interface DigivolveCall {
  permanentId: string;
  instanceId: string;
  opts?: { costDelta?: number; payCost?: boolean };
}

function makeContext(opts: { battleArea: Permanent[]; calls: DigivolveCall[] }): EffectContext {
  const { battleArea, calls } = opts;
  const hand = [{ instanceId: "agunimon-inst", cardId: "BT21-013", ownerSeat: 0 as Seat }];
  const players = [
    { seat: 0 as Seat, battleArea, hand, trash: [], security: [], deck: [] },
    { seat: 1 as Seat, battleArea: [], hand: [], trash: [], security: [], deck: [] },
  ];

  const game = {
    state: { memory: 10, players, turnSeat: 0 as Seat } as unknown as GameState,
    player: (seat: Seat) => players[seat],
    opponentOf: (seat: Seat) => ((seat === 0 ? 1 : 0) as Seat),
    permanentById: (id: string) => battleArea.find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => fakeDefinition(card.cardId),
  } as unknown as GameAccess;

  const fx = new Proxy(
    {
      digivolveFromInstance: async (permanentId: string, instanceId: string, o?: DigivolveCall["opts"]) => {
        calls.push({ permanentId, instanceId, opts: o });
        return battleArea.find((p) => p.permanentId === permanentId);
      },
    } as Record<string, unknown>,
    {
      get: (base, prop: string) => base[prop] ?? (async () => undefined),
      has: (base, prop: string) => prop in base,
    },
  ) as unknown as Primitives;

  const pickFirst = async (_c: unknown, o: { candidates: string[]; max?: number }) =>
    o.candidates.slice(0, o.max ?? 1);
  const ask = {
    optional: async () => true,
    chooseTargets: pickFirst,
    selectPermanents: pickFirst,
    selectCards: pickFirst,
    chooseOption: async () => 0,
  } as unknown as DecisionApi;

  return { source: makeSource(), trigger: {}, game, fx, ask } as unknown as EffectContext;
}

async function resolveStartOfMainPhase(ctx: EffectContext): Promise<void> {
  const module = getEffectModule(CARD_ID);
  const effects = module!.effectsForTiming(EffectTiming.OnStartMainPhase, ctx.source);
  expect(effects.length).toBeGreaterThanOrEqual(1);
  for (const effect of effects) await effect.resolve(ctx);
}

describe("BT21-082 Takuya Kanbara — [Start of Your Main Phase] digivolve", () => {
  it("is registered", () => {
    expect(getEffectModule(CARD_ID)).toBeDefined();
  });

  it("reduces the cost by 1 when only this Tamer is in play (KB Q4595)", async () => {
    const calls: DigivolveCall[] = [];
    await resolveStartOfMainPhase(makeContext({ battleArea: [selfPermanent], calls }));

    expect(calls).toHaveLength(1);
    expect(calls[0]!.opts?.costDelta).toBe(-1);
    expect(calls[0]!.opts?.payCost).toBe(true);
  });

  it("counts red Tamers by distinct name, not by copy", async () => {
    const calls: DigivolveCall[] = [];
    const secondCopy = makePermanent("takuya-p2", CARD_ID); // same name — must not add
    const differentName = makePermanent("koji-p", "BT21-083");

    await resolveStartOfMainPhase(
      makeContext({ battleArea: [selfPermanent, secondCopy, differentName], calls }),
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.opts?.costDelta).toBe(-2);
  });
});
