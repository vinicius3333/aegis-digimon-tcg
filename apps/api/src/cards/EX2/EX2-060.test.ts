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
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX2-060.js";

// A3 for EX2-060 (Rika Nonaka):
//   [Your Turn] When you attack with [Renamon]/[Kyubimon]/[Taomon]/[Sakuyamon],
//     suspend this Tamer to use 1 [Plug-In] Option from hand without paying its cost.
//
// FAILS-WHEN-REVERTED: legacy IR leaves the whenAttacking SubTrigger body non-executable;
// body — no suspend call and no useOptionFromHand call are produced.

const PLUG_IN_ID = "ST9-016"; // A Plug-In Option card
const _OTHER_ID = "BT1-OTHER";

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function card(instanceId: string, cardId: string, seat: Seat = 0): CardInstance {
  return { instanceId, cardId, ownerSeat: seat, faceUp: true } as CardInstance;
}

function makeSource(suspended = false): CardSource {
  return {
    instanceId: "self-inst",
    cardId: "EX2-060",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "EX2-060",
      set: "EX2",
      nameEn: "Rika Nonaka",
      kinds: ["Tamer"] as never,
      colors: ["Yellow"] as never,
      playCost: 3,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () =>
      ({
        permanentId: "SELF-PERM",
        controllerSeat: 0 as Seat,
        topCard: { instanceId: "self-inst", cardId: "EX2-060", ownerSeat: 0 as Seat, faceUp: true } as never,
        stack: [] as never,
        linked: [] as never,
        baseDP: 0,
        currentDP: 0,
        isSuspended: suspended,
        inBreeding: false,
      }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

type PermanentEntry = {
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
    ownerHand?: CardInstance[];
    attackerPermanentId?: string;
    attackerCardId?: string;
    memory?: number;
  } = {},
): EffectContext {
  const {
    ownerHand = [],
    attackerPermanentId = "attacker-perm",
    attackerCardId = "Renamon-card",
    memory = 3,
  } = opts;

  const attackerPerm: PermanentEntry = {
    permanentId: attackerPermanentId,
    controllerSeat: 0 as Seat,
    topCard: card(`${attackerPermanentId}-top`, attackerCardId, 0),
    isSuspended: false,
    inBreeding: false,
  };

  const players = [
    {
      seat: 0 as Seat,
      battleArea: [attackerPerm],
      security: [],
      hand: ownerHand.map((c) => ({ ...c })),
      deck: [],
      trash: [],
    },
    {
      seat: 1 as Seat,
      battleArea: [],
      security: [],
      hand: [],
      deck: [],
      trash: [],
    },
  ];

  const game: GameAccess = {
    state: { memory, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) =>
      id === attackerPermanentId ? (attackerPerm as never) : undefined,
    definitionOf: (c: { cardId: string }) => {
      if (c.cardId === PLUG_IN_ID) {
        return { cardId: c.cardId, kinds: ["Option"], nameEn: "Plug-In S", playCost: 3 } as never;
      }
      if (c.cardId === "Renamon-card") {
        return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "Renamon", level: 3, playCost: 3 } as never;
      }
      if (c.cardId === "Sakuyamon-card") {
        return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "Sakuyamon", level: 6, playCost: 7 } as never;
      }
      return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "Other", level: 4, playCost: 4 } as never;
    },
  };

  const fx = {
    suspend: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "suspend", args });
      return args[0] as string[];
    },
    useOptionFromHand: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "useOptionFromHand", args });
    },
    setMemory: (...args: unknown[]) => {
      recorder.calls.push({ verb: "setMemory", args });
    },
    playFromSecurity: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "playFromSecurity", args });
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return {
    source,
    trigger: { attackerPermanentId },
    game,
    fx,
    ask,
  };
}

describe("EX2-060 Rika Nonaka", () => {
  it("registers full compiled IR without residuals", () => {
    const compiled = registeredCompiledCards.get("EX2-060");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });
  const module = getEffectModule("EX2-060");

  it("is registered on import", () => {
    expect(module).toBeDefined();
  });

  it("produces 1 OnStartTurn effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(1);
  });

  it("produces 1 OnAllyAttack effect", () => {
    const effect = registeredCompiledCards.get("EX2-060")?.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
  });

  it("[Start of Your Turn] sets memory to 3 when ≤ 2", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source, { memory: 2 });

    const effects = module!.effectsForTiming(EffectTiming.OnStartTurn, source);
    await effects[0]!.resolve(ctx);

    expect(recorder.calls.filter((c) => c.verb === "setMemory")).toHaveLength(1);
    expect(recorder.calls.find((c) => c.verb === "setMemory")!.args[0]).toBe(3);
  });

  it("[When Attacking] suspends self and uses a Plug-In Option from hand", () => {
    const effect = registeredCompiledCards.get("EX2-060")?.effects.find((entry) => entry.trigger === "YourTurn");
    const actions = (effect?.actions[0] as { actions?: unknown[] }).actions ?? [];
    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "Suspend" }),
      expect.objectContaining({ kind: "UseOptionWithoutCost", from: ["hand"], payCost: false }),
    ]));
  });

  it("requires the Tamer suspension as the activation cost", () => {
    const effect = registeredCompiledCards.get("EX2-060")?.effects.find((entry) => entry.trigger === "YourTurn");
    const actions = (effect?.actions[0] as { actions?: unknown[] }).actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "Suspend", target: { isSelf: true } });
  });

  it("filters the used card to Plug-In Options", () => {
    const effect = registeredCompiledCards.get("EX2-060")?.effects.find((entry) => entry.trigger === "YourTurn");
    const actions = (effect?.actions[0] as { actions?: unknown[] }).actions ?? [];
    expect(actions[1]).toMatchObject({ kind: "UseOptionWithoutCost", filter: { nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }] } });
  });

  it("matches all four printed attacker names", () => {
    const effect = registeredCompiledCards.get("EX2-060")?.effects.find((entry) => entry.trigger === "YourTurn");
    const sourceFilter = (effect?.actions[0] as { sourceFilter?: { nameOrTrait?: { tokens?: string[] }[] } }).sourceFilter;
    expect(sourceFilter?.nameOrTrait?.[0]?.tokens).toEqual(["Renamon", "Kyubimon", "Taomon", "Sakuyamon"]);
  });
});
