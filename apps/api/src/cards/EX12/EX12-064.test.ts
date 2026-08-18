import { describe, it, expect } from "vitest";
import { EffectTiming, type CardInstance, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
} from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX12-064.js";

// A3 for EX12-064 (Megadramon):
//   [On Play] / [When Digivolving] Delete 1 opponent Digimon Lv.4 or lower;
//     if none deleted, de-digivolve 1 opponent Digimon 1 time.
//   [Inherited][End of Attack][Once Per Turn] By unsuspending this Digimon,
//     delete 1 of your Digimon with the lowest play cost.
//
// FAILS-WHEN-REVERTED: the IR RawUnparsed stub for the AllTurns clause means
// the module produces 0 effects for OnPlay and OnDestroyedAnyone in the IR;
// reverting to the declarative effect record means deletePermanent is never called from
// those windows.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function card(instanceId: string, cardId: string, seat: Seat = 0): CardInstance {
  return { instanceId, cardId, ownerSeat: seat, faceUp: true } as CardInstance;
}

function makeSource(suspended = false): CardSource {
  return {
    instanceId: "self-inst",
    cardId: "EX12-064",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "EX12-064",
      set: "EX12",
      nameEn: "Megadramon",
      kinds: ["Digimon"] as never,
      colors: ["Black"] as never,
      playCost: 5,
      dp: 5000,
      level: 5,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () =>
      ({
        permanentId: "SELF-PERM",
        controllerSeat: 0 as Seat,
        topCard: { instanceId: "self-inst", cardId: "EX12-064", ownerSeat: 0 as Seat, faceUp: true } as never,
        stack: [] as never,
        linked: [] as never,
        baseDP: 5000,
        currentDP: 5000,
        isSuspended: suspended,
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
  isSuspended: boolean;
  inBreeding: boolean;
};

function makeCtx(
  recorder: Recorder,
  source: CardSource,
  opts: {
    oppBattleArea?: BattleAreaEntry[];
    ownBattleArea?: BattleAreaEntry[];
    deleteReturns?: number;
  } = {},
): EffectContext {
  const { oppBattleArea = [], ownBattleArea = [], deleteReturns = 1 } = opts;

  const players = [
    {
      seat: 0 as Seat,
      battleArea: ownBattleArea,
      security: [],
      hand: [],
      deck: [],
      trash: [],
    },
    {
      seat: 1 as Seat,
      battleArea: oppBattleArea,
      security: [],
      hand: [],
      deck: [],
      trash: [],
    },
  ];

  const game: GameAccess = {
    state: { memory: 3, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (c: { cardId: string }) => {
      if (c.cardId === "LV4-DIGIMON") {
        return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "LowLevelDigimon", level: 4, playCost: 3 } as never;
      }
      if (c.cardId === "LV5-DIGIMON") {
        return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "HighLevelDigimon", level: 5, playCost: 5 } as never;
      }
      if (c.cardId === "OWN-LOW") {
        return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "OwnLow", level: 4, playCost: 2 } as never;
      }
      if (c.cardId === "OWN-HIGH") {
        return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "OwnHigh", level: 5, playCost: 5 } as never;
      }
      return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "Unknown", level: 5, playCost: 5 } as never;
    },
  };

  const fx = {
    deletePermanent: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "deletePermanent", args });
      return deleteReturns;
    },
    deDigivolve: (...args: unknown[]) => {
      recorder.calls.push({ verb: "deDigivolve", args });
      return [];
    },
    unsuspend: (...args: unknown[]) => {
      recorder.calls.push({ verb: "unsuspend", args });
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source, trigger: {}, game, fx, ask };
}

function lv4OppPermanent(n = 1): BattleAreaEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    permanentId: `opp-lv4-${i}`,
    controllerSeat: 1 as Seat,
    topCard: card(`opp-lv4-top-${i}`, "LV4-DIGIMON", 1),
    isSuspended: false,
    inBreeding: false,
  }));
}

function lv5OppPermanent(): BattleAreaEntry[] {
  return [
    {
      permanentId: "opp-lv5-0",
      controllerSeat: 1 as Seat,
      topCard: card("opp-lv5-top-0", "LV5-DIGIMON", 1),
      isSuspended: false,
      inBreeding: false,
    },
  ];
}

describe("EX12-064 Megadramon", () => {
  const module = getEffectModule("EX12-064");

  it("is registered on import", () => {
    expect(module).toBeDefined();
  });

  it("produces 1 OnPlay effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
  });

  it("produces 1 WhenDigivolving effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });

  it("produces 1 OnEndAttack (inherited) effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnEndAttack, source)).toHaveLength(1);
  });

  it("[On Play] deletes a Lv.4 or lower opponent Digimon when one exists", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source, { oppBattleArea: lv4OppPermanent() });

    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: IR stub doesn't have this OnPlay delete path
    const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0]!.args[0]).toEqual(["opp-lv4-0"]);
  });

  it("[On Play] de-digivolves when delete didn't happen (Lv.4 candidate is immune)", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    // deleteReturns = 0 means deletion was prevented
    const ctx = makeCtx(recorder, source, {
      oppBattleArea: [...lv4OppPermanent(), ...lv5OppPermanent()],
      deleteReturns: 0,
    });

    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: no de-digivolve call in IR
    const dedigiCalls = recorder.calls.filter((c) => c.verb === "deDigivolve");
    expect(dedigiCalls).toHaveLength(1);
  });

  it("[On Play] de-digivolves when no Lv.4 or lower opponent Digimon exists", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source, { oppBattleArea: lv5OppPermanent() });

    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);

    // No delete called (no lv4 target), de-digivolve is called
    const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls).toHaveLength(0);
    const dedigiCalls = recorder.calls.filter((c) => c.verb === "deDigivolve");
    expect(dedigiCalls).toHaveLength(1);
  });

  it("[Inherited End of Attack] unsuspends self then deletes own lowest-cost Digimon", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource(true); // suspended
    const ownBattleArea: BattleAreaEntry[] = [
      {
        permanentId: "own-low-perm",
        controllerSeat: 0 as Seat,
        topCard: card("own-low-top", "OWN-LOW", 0),
        isSuspended: false,
        inBreeding: false,
      },
      {
        permanentId: "own-high-perm",
        controllerSeat: 0 as Seat,
        topCard: card("own-high-top", "OWN-HIGH", 0),
        isSuspended: false,
        inBreeding: false,
      },
    ];
    const ctx = makeCtx(recorder, source, { ownBattleArea });

    const effects = module!.effectsForTiming(EffectTiming.OnEndAttack, source);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: IR inherited effect uses "raw" cost; no unsuspend+delete call
    const unsuspendCalls = recorder.calls.filter((c) => c.verb === "unsuspend");
    expect(unsuspendCalls).toHaveLength(1);
    const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls).toHaveLength(1);
    // Should target the lowest-cost (playCost=2) one
    expect(deleteCalls[0]!.args[0]).toEqual(["own-low-perm"]);
  });
});
