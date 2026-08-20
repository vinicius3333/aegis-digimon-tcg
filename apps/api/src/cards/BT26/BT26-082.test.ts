import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./BT26-082.js";

const CARD_ID = "BT26-082";

function fakeDef(cardId: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: "BT26",
    nameEn: cardId,
    kinds: ["Digimon"] as never,
    colors: ["Purple"] as never,
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "ravemon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef(CARD_ID),
    permanent: () => ({ permanentId: "ravemon-perm" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-082 alternate cost", () => {
  it("offers only the bottom-most face-down card from each Tamer", async () => {
    const source = makeSource();
    const tamer1 = {
      permanentId: "tamer-1",
      inBreeding: false,
      topCard: { cardId: "tamer" },
      stack: [
        { instanceId: "tamer-1-bottom", faceUp: false },
        { instanceId: "tamer-1-upper", faceUp: false },
      ],
    };
    const tamer2 = {
      permanentId: "tamer-2",
      inBreeding: false,
      topCard: { cardId: "tamer" },
      stack: [{ instanceId: "tamer-2-bottom", faceUp: false }],
    };
    const opponentDigimon = {
      permanentId: "opponent-digimon",
      topCard: { cardId: "opponent" },
      currentDP: 12000,
    };
    const players = [
      { seat: 0 as Seat, battleArea: [tamer1, tamer2] },
      { seat: 1 as Seat, battleArea: [opponentDigimon] },
    ];
    const game: GameAccess = {
      player: (seat: Seat) => players[seat] as never,
      opponentOf: () => 1 as Seat,
      definitionOf: (card: { cardId: string }) =>
        card.cardId === "tamer"
          ? fakeDef("tamer", { kinds: [CardKind.Tamer] as never })
          : fakeDef(card.cardId, { dp: 12000 }),
    } as unknown as GameAccess;
    const selected: string[][] = [];
    const trashed: string[][] = [];
    const fx = {
      trashDigivolutionCards: vi.fn<(...args: any[]) => any>(async (_host: string, ids: string[]) => {
        trashed.push(ids);
        return ids;
      }),
      deletePermanent: vi.fn<(...args: any[]) => any>(async () => 0),
    } as unknown as Primitives;
    const ask = {
      optional: vi.fn<(...args: any[]) => any>(async () => true),
      chooseOption: vi.fn<(...args: any[]) => any>(async () => 1),
      selectCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, options: { candidates: string[] }) => {
        selected.push(options.candidates);
        return options.candidates;
      }),
    } as unknown as EffectContext["ask"];
    const ctx = { source, game, fx, ask, trigger: {} } as unknown as EffectContext;

    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve(ctx);

    expect(selected).toEqual([["tamer-1-bottom", "tamer-2-bottom"]]);
    expect(trashed).toEqual([["tamer-1-bottom"], ["tamer-2-bottom"]]);
  });

  it("does not pay a partial 1-card Tamer cost or delete the opponent's Digimon", async () => {
    const source = makeSource();
    const players = [
      {
        seat: 0 as Seat,
        battleArea: [
          {
            permanentId: "tamer-1",
            inBreeding: false,
            topCard: { cardId: "tamer" },
            stack: [{ instanceId: "bottom-1", faceUp: false }],
          },
          {
            permanentId: "tamer-2",
            inBreeding: false,
            topCard: { cardId: "tamer" },
            stack: [{ instanceId: "bottom-2", faceUp: false }],
          },
        ],
      },
      {
        seat: 1 as Seat,
        battleArea: [{ permanentId: "opponent", topCard: { cardId: "opponent" }, currentDP: 12000 }],
      },
    ];
    const game = {
      player: (seat: Seat) => players[seat],
      opponentOf: () => 1 as Seat,
      definitionOf: (card: { cardId: string }) =>
        card.cardId === "tamer"
          ? fakeDef("tamer", { kinds: [CardKind.Tamer] as never })
          : fakeDef(card.cardId, { dp: 12000 }),
    } as unknown as GameAccess;
    const fx = {
      trashDigivolutionCards: vi.fn(async () => ["bottom-1"]),
      deletePermanent: vi.fn(async () => 1),
    } as unknown as Primitives;
    const ask = {
      optional: vi.fn(async () => true),
      chooseOption: vi.fn(async () => 1),
      selectCards: vi.fn(async () => ["bottom-1"]),
    } as unknown as EffectContext["ask"];

    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve({ source, game, fx, ask, trigger: {} } as unknown as EffectContext);

    expect(fx.trashDigivolutionCards).not.toHaveBeenCalled();
    expect(fx.deletePermanent).not.toHaveBeenCalled();
  });
});

describe("BT26-082 engine behavior", () => {
  it.each([
    ["BT13-085", "Crowmon by exact name"],
    ["BT26-044", "a level 5 with the DATA SQUAD trait"],
  ])("digivolves for 3 from %s (%s)", async (baseCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: CARD_ID, as: "ravemon" }],
          deck: ["BT5-022"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ravemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("ravemon").instanceId);

    expect(s.state.memory).toBe(0);
  });

  it("grants itself the Birdkin trait without granting near-match traits", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "ravemon" }] } });
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("ravemon"), "Birdkin")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("ravemon"), "Bird")).toBe(false);
  });

  it("plays itself free from face-up Security at the end of the opponent's turn", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, faceUp: true, as: "ravemon" }] } });
    s.state.turnSeat = 1;
    const instance = s.inst("ravemon");
    const memoryBefore = s.state.memory;

    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, instance);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instance.instanceId),
    );

    expect(s.state.memory).toBe(memoryBefore);
    expect(
      s.state.players[0]!.battleArea.map((permanent) => ({
        cardId: permanent.topCard?.cardId,
        instanceId: permanent.topCard?.instanceId,
        dp: permanent.currentDP,
      })),
    ).toEqual([{ cardId: CARD_ID, instanceId: instance.instanceId, dp: 12000 }]);
    expect(s.state.players[0]!.security.map((card) => ({ cardId: card.cardId, instanceId: card.instanceId }))).toEqual(
      [],
    );
  });

  it("does not play from face-up Security at the end of its owner's turn", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, faceUp: true, as: "ravemon" }] } });
    s.state.turnSeat = 0;

    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("ravemon"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
