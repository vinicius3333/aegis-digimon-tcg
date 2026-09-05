import { describe, it, expect } from "vitest";
import { EffectTiming, type CardInstance, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX2-012.js";

// A3 for EX2-012 (Megidramon):
//   [When Digivolving] Delete 1 opponent Digimon with ≤10000 DP; if none deleted, mill 5 both.
//   [On Deletion] You may play 1 [Guilmon] and 1 [Takato Matsuki] from hand/trash without cost.
//
// FAILS-WHEN-REVERTED: the legacy IR stub can't execute [On Deletion], and its
// [When Digivolving] mill branch as a raw condition — neither playInstances nor
// the correct reveal+trash mill path is called.

const GUILMON_ID = "EX2-008";
const TAKATO_ID = "EX2-063";
const OTHER_ID = "BT1-OTHER";

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function card(instanceId: string, cardId: string, seat: Seat = 0): CardInstance {
  return { instanceId, cardId, ownerSeat: seat, faceUp: true } as CardInstance;
}

function makeSource(): CardSource {
  return {
    instanceId: "self-inst",
    cardId: "EX2-012",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "EX2-012",
      set: "EX2",
      nameEn: "Megidramon",
      kinds: ["Digimon"] as never,
      colors: ["Red"] as never,
      playCost: 14,
      dp: 15000,
      level: 7,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () =>
      ({
        permanentId: "SELF-PERM",
        controllerSeat: 0 as Seat,
        topCard: { instanceId: "self-inst", cardId: "EX2-012", ownerSeat: 0 as Seat, faceUp: true } as never,
        stack: [] as never,
        linked: [] as never,
        baseDP: 15000,
        currentDP: 15000,
        isSuspended: false,
        inBreeding: false,
      }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

type BattleAreaEntry = {
  permanentId: string;
  controllerSeat: Seat;
  topCard: CardInstance;
  currentDP: number;
  isSuspended: boolean;
  inBreeding: boolean;
};

function makeCtx(
  recorder: Recorder,
  source: CardSource,
  opts: {
    oppBattleArea?: BattleAreaEntry[];
    ownerHand?: CardInstance[];
    ownerTrash?: CardInstance[];
    ownerDeck?: CardInstance[];
    opponentDeck?: CardInstance[];
    deleteReturns?: number;
    optionalAccepted?: boolean;
  } = {},
): EffectContext {
  const {
    oppBattleArea = [],
    ownerHand = [],
    ownerTrash = [],
    ownerDeck = Array.from({ length: 5 }, (_, i) => card(`deck-0-${i}`, OTHER_ID, 0)),
    opponentDeck = Array.from({ length: 5 }, (_, i) => card(`deck-1-${i}`, OTHER_ID, 1)),
    deleteReturns = 1,
    optionalAccepted = true,
  } = opts;

  const players = [
    {
      seat: 0 as Seat,
      battleArea: [],
      security: [],
      hand: ownerHand.map((c) => ({ ...c })),
      deck: ownerDeck.map((c) => ({ ...c })),
      trash: ownerTrash.map((c) => ({ ...c })),
    },
    {
      seat: 1 as Seat,
      battleArea: oppBattleArea,
      security: [],
      hand: [],
      deck: opponentDeck.map((c) => ({ ...c })),
      trash: [],
    },
  ];

  const game: GameAccess = {
    state: { memory: 3, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (c: { cardId: string }) => {
      if (c.cardId === GUILMON_ID) {
        return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "Guilmon", level: 3, playCost: 3 } as never;
      }
      if (c.cardId === TAKATO_ID) {
        return { cardId: c.cardId, kinds: ["Tamer"], nameEn: "Takato Matsuki", level: undefined, playCost: 2 } as never;
      }
      return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "Other", level: 4, playCost: 4 } as never;
    },
  };

  const fx = {
    deletePermanent: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "deletePermanent", args });
      return deleteReturns;
    },
    reveal: async (seat: Seat, n: number) => {
      recorder.calls.push({ verb: "reveal", args: [seat, n] });
      const deckCards = seat === 0 ? ownerDeck : opponentDeck;
      return deckCards.slice(0, n);
    },
    trash: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "trash", args });
      return [];
    },
    fireOnDiscardLibrary: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "fireOnDiscardLibrary", args });
    },
    fireWhenTrashedFromDeck: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "fireWhenTrashedFromDeck", args });
    },
    playInstances: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "playInstances", args });
      return [];
    },
    grantNameTrait: (...args: unknown[]) => {
      recorder.calls.push({ verb: "grantNameTrait", args });
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => optionalAccepted,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source, trigger: {}, game, fx, ask };
}

describe("EX2-012 Megidramon", () => {
  it("registers full compiled IR for every printed clause", () => {
    const compiled = registeredCompiledCards.get("EX2-012");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
    expect(compiled?.effects.find((effect) => effect.trigger === "OnDeletion")?.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand", "trash"] })]),
    );
  });
  const module = getEffectModule("EX2-012");

  it("is registered on import", () => {
    expect(module).toBeDefined();
  });

  it("registers full compiled IR for every printed clause", () => {
    const compiled = registeredCompiledCards.get("EX2-012");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
    expect(compiled?.effects.find((effect) => effect.trigger === "OnDeletion")?.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand", "trash"] })]),
    );
  });

  it("produces 1 WhenDigivolving effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });

  it("produces 1 OnDestroyedAnyone effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)).toHaveLength(1);
  });

  it("[When Digivolving] deletes a ≤10000 DP opponent Digimon when one exists", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const oppBattleArea: BattleAreaEntry[] = [
      {
        permanentId: "opp-lv4",
        controllerSeat: 1 as Seat,
        topCard: card("opp-lv4-top", OTHER_ID, 1),
        currentDP: 8000,
        isSuspended: false,
        inBreeding: false,
      },
    ];
    const ctx = makeCtx(recorder, source, { oppBattleArea });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: IR uses raw condition, doesn't call deletePermanent
    const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls).toHaveLength(1);
    // Mill should NOT fire (delete succeeded)
    expect(recorder.calls.filter((c) => c.verb === "reveal")).toHaveLength(0);
  });

  it("[When Digivolving] mills both decks 5 when delete fails (immune Digimon)", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const oppBattleArea: BattleAreaEntry[] = [
      {
        permanentId: "opp-lv4",
        controllerSeat: 1 as Seat,
        topCard: card("opp-lv4-top", OTHER_ID, 1),
        currentDP: 8000,
        isSuspended: false,
        inBreeding: false,
      },
    ];
    // deleteReturns=0 → deletion was prevented
    const ctx = makeCtx(recorder, source, { oppBattleArea, deleteReturns: 0 });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: IR raw condition doesn't trigger mill
    const revealCalls = recorder.calls.filter((c) => c.verb === "reveal");
    expect(revealCalls).toHaveLength(2); // both players
    for (const call of revealCalls) {
      expect(call.args[1]).toBe(5);
    }
  });

  it("[When Digivolving] mills both decks 5 when no ≤10000 DP target exists", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    // Opponent has no Digimon on battle area → no delete possible → mill
    const ctx = makeCtx(recorder, source, { oppBattleArea: [] });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    const revealCalls = recorder.calls.filter((c) => c.verb === "reveal");
    expect(revealCalls).toHaveLength(2);
  });

  it("[On Deletion] plays Guilmon and Takato Matsuki from hand/trash without cost", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const guilmon = card("guilmon-1", GUILMON_ID, 0);
    const takato = card("takato-1", TAKATO_ID, 0);
    const ctx = makeCtx(recorder, source, {
      ownerHand: [guilmon],
      ownerTrash: [takato],
    });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: IR has no playInstances call from OnDeletion
    const playCalls = recorder.calls.filter((c) => c.verb === "playInstances");
    expect(playCalls).toHaveLength(2); // one for Guilmon, one for Takato
    for (const call of playCalls) {
      expect((call.args[1] as { payCost: boolean }).payCost).toBe(false);
    }
  });

  it("[On Deletion] does nothing when neither Guilmon nor Takato is available", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source, { ownerHand: [], ownerTrash: [] });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    await effects[0]!.resolve(ctx);
    expect(recorder.calls.filter((call) => call.verb === "playInstances")).toHaveLength(0);
  });

  it("[On Deletion] may be declined even when Guilmon and Takato are available", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source, {
      ownerHand: [card("guilmon-1", GUILMON_ID)],
      ownerTrash: [card("takato-1", TAKATO_ID)],
      optionalAccepted: false,
    });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    await effects[0]!.resolve(ctx);
    expect(recorder.calls.filter((call) => call.verb === "playInstances")).toHaveLength(0);
  });
});
