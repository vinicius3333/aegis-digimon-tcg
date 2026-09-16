import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type PlayerState,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-046.js";

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT7-046",
    set: "BT7",
    nameEn: "Beetlemon",
    kinds: ["Digimon"] as never,
    colors: ["Green"] as never,
    playCost: 5,
    dp: 6000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "INST#BT7046",
    cardId: "BT7-046",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function fakeCardInstance(cardId: string, instanceId: string): CardInstance {
  return { cardId, instanceId, ownerSeat: 0 as Seat } as never;
}

function makeContext(opts: {
  recorder: Recorder;
  deckTop5: CardInstance[];
  cardDefinitions?: Record<string, Partial<CardDefinition>>;
  battleAreaFill?: Array<{ permanentId: string; cardId: string }>;
}): EffectContext {
  const battleArea = (opts.battleAreaFill ?? []).map((p) => ({
    permanentId: p.permanentId,
    isSuspended: false,
    currentDP: 0,
    stack: [] as never[],
    topCard: fakeCardInstance(p.cardId, p.permanentId + "-top"),
  }));

  const players = [
    { seat: 0 as Seat, battleArea, security: [], hand: [], deck: [...opts.deckTop5], trash: [] },
    { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 3, players, turnSeat: 0 } as unknown as GameState;

  const definitionOverrides: Record<string, Partial<CardDefinition>> = opts.cardDefinitions ?? {};

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id: string) => battleArea.find((p) => p.permanentId === id) as never,
    definitionOf: (card: CardInstance): CardDefinition => {
      const over = definitionOverrides[card.cardId] ?? {};
      return fakeDefinition({ cardId: card.cardId, ...over });
    },
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return [] as never;
    };

  const fx = {
    reveal: async (_seat: Seat, n: number): Promise<CardInstance[]> => {
      opts.recorder.calls.push({ verb: "reveal", args: [_seat, n] });
      return opts.deckTop5.slice(0, n);
    },
    returnToHand: record("returnToHand"),
    returnToDeck: record("returnToDeck"),
    draw: (...a: unknown[]) => {
      throw new Error(`Unexpected draw(${JSON.stringify(a)})`);
    },
    gainMemory: (...a: unknown[]) => {
      throw new Error(`Unexpected gainMemory(${JSON.stringify(a)})`);
    },
    setMemory: (...a: unknown[]) => {
      throw new Error(`Unexpected setMemory(${JSON.stringify(a)})`);
    },
    trash: (...a: unknown[]) => {
      throw new Error(`Unexpected trash(${JSON.stringify(a)})`);
    },
    deletePermanent: (...a: unknown[]) => {
      throw new Error(`Unexpected deletePermanent(${JSON.stringify(a)})`);
    },
    suspend: (...a: unknown[]) => {
      throw new Error(`Unexpected suspend(${JSON.stringify(a)})`);
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source: makeSource(), trigger: {}, game, fx, ask };
}

describe("BT7-046 Beetlemon [When Digivolving]", () => {
  const module = getEffectModule("BT7-046");

  it("digivolves onto a green Tamer and resolves both reveal picks through public game state", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-089", as: "jp" }],
          hand: [{ card: "BT7-046", as: "beetlemon" }],
          deck: [
            "BT7-007",
            { card: "BT7-047", as: "hybrid" },
            { card: "BT7-089", as: "searchedJp" },
            "BT7-012",
            "BT7-020",
            "BT7-048",
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const hybridId = s.inst("hybrid").instanceId;
    const jpId = s.inst("searchedJp").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jp").permanentId,
        instanceId: s.inst("beetlemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => [hybridId, jpId].every((id) => player.hand.some((card) => card.instanceId === id)));

    expect(s.state.memory).toBe(0);
    expect(s.perm("jp").topCard.cardId).toBe("BT7-046");
    expect(s.perm("jp").stack).toHaveLength(1);
    expect(player.hand.some((card) => card.instanceId === hybridId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === jpId)).toBe(true);
    expect(player.deck).toHaveLength(3);
  });

  it("registers on import", () => {
    expect(module, "BT7-046 must self-register on import").toBeDefined();
  });

  it("routes to WhenDigivolving and nothing else", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(0);
  });

  it("reveals exactly 5 cards regardless of field state (Q1579: no youHave gate)", async () => {
    const deckCards = [
      fakeCardInstance("C1", "i1"),
      fakeCardInstance("C2", "i2"),
      fakeCardInstance("C3", "i3"),
      fakeCardInstance("C4", "i4"),
      fakeCardInstance("C5", "i5"),
    ];
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, deckTop5: deckCards });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const reveals = recorder.calls.filter((c) => c.verb === "reveal");
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.args[1]).toBe(5);
  });

  it("adds a Hybrid-trait card to hand when one is revealed (Q1579: independent add specs)", async () => {
    const hybridCard = fakeCardInstance("BT1-XXX", "i-hybrid");
    const plainCards = [
      fakeCardInstance("C1", "i1"),
      fakeCardInstance("C2", "i2"),
      fakeCardInstance("C3", "i3"),
      fakeCardInstance("C4", "i4"),
    ];
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      deckTop5: [hybridCard, ...plainCards],
      cardDefinitions: {
        "BT1-XXX": { nameEn: "Agunimon", types: ["Hybrid"], kinds: ["Digimon"] as never },
      },
    });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const handedIds = recorder.calls.filter((c) => c.verb === "returnToHand").flatMap((c) => c.args[0] as string[]);
    expect(handedIds).toContain("i-hybrid");
  });

  it("adds J.P. Shibayama to hand when one is revealed (Q1579: independent add specs)", async () => {
    const jpCard = fakeCardInstance("BT7-087", "i-jp");
    const plainCards = [
      fakeCardInstance("C1", "i1"),
      fakeCardInstance("C2", "i2"),
      fakeCardInstance("C3", "i3"),
      fakeCardInstance("C4", "i4"),
    ];
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      deckTop5: [jpCard, ...plainCards],
      cardDefinitions: {
        "BT7-087": { nameEn: "J.P. Shibayama", kinds: ["Tamer"] as never },
      },
    });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const handedIds = recorder.calls.filter((c) => c.verb === "returnToHand").flatMap((c) => c.args[0] as string[]);
    expect(handedIds).toContain("i-jp");
  });

  it("sends unreturned revealed cards to deck bottom (Q1579: remaining cards placement)", async () => {
    const hybridCard = fakeCardInstance("BT1-XXX", "i-hybrid");
    const jpCard = fakeCardInstance("BT7-087", "i-jp");
    const plainCards = [fakeCardInstance("C1", "i1"), fakeCardInstance("C2", "i2"), fakeCardInstance("C3", "i3")];
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      deckTop5: [hybridCard, jpCard, ...plainCards],
      cardDefinitions: {
        "BT1-XXX": { nameEn: "Agunimon", types: ["Hybrid"], kinds: ["Digimon"] as never },
        "BT7-087": { nameEn: "J.P. Shibayama", kinds: ["Tamer"] as never },
      },
    });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const deckReturns = recorder.calls.filter((c) => c.verb === "returnToDeck");
    expect(deckReturns.length).toBeGreaterThanOrEqual(1);
    const deckIds = deckReturns.flatMap((c) => c.args[0] as string[]);
    for (const plain of plainCards) {
      expect(deckIds).toContain(plain.instanceId);
    }
    for (const call of deckReturns) {
      const opts = call.args[1] as { toTop?: boolean } | undefined;
      expect(opts?.toTop).toBeFalsy();
    }
  });

  it("IR description contains only RevealAdd — no spurious Return actions (runtime record bug)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects).toHaveLength(1);
    const desc = (effects[0] as unknown as { description?: string }).description ?? "";
    expect(desc).not.toMatch(/Return/);
  });
});
