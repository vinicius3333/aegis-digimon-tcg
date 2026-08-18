import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type Seat } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT19-043.js";

// A3 for BT19-043 (Lucemon X Antibody):
//
//   [All Turns][Once Per Turn] — leave-prevention replacement: if [Lucemon] in stack +
//     both security stacks non-empty + player pays (trash both top security), it doesn't leave.
//   [End of Your Turn][Once Per Turn] — opponent may trash top security; if not:
//     Recovery +1 (Deck) + delete 1 opponent Digimon/Tamer.
//
// KB: Q3096 — if either player's security is empty the prevention can't activate.
//
// FAILS-WHEN-REVERTED:
//   - Remove the subscribeReplacement in None → no leave-prevention registered.
//   - Remove the OnEndTurn clause → recoverToSecurity/deletePermanent never called.

function fakeDef(cardId: string, kind = CardKind.Digimon): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: [kind],
    colors: ["Yellow"] as never,
    playCost: 7,
    dp: 12000,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function lucemonDef(): CardDefinition {
  return { ...fakeDef("BT9-082"), nameEn: "Lucemon Falldown Mode" };
}

function makeCard(cardId: string, seat: Seat): CardInstance {
  return {
    instanceId: `inst-${cardId}-${Math.random()}`,
    cardId,
    ownerSeat: seat,
    faceUp: true,
  } as CardInstance;
}

function makeSelfPerm(permanentId = "self-lucemon-x"): Permanent {
  return {
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: makeCard("BT19-043", 0),
    stack: [],
    linked: [],
    baseDP: 12000,
    currentDP: 12000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(selfPerm: Permanent, isOwnerTurn = true): CardSource {
  return {
    instanceId: selfPerm.topCard!.instanceId,
    cardId: "BT19-043",
    ownerSeat: 0 as Seat,
    definition: fakeDef("BT19-043"),
    permanent: () => selfPerm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => isOwnerTurn,
    hasColor: () => false,
  };
}

type Call = { verb: string; args: unknown[] };

function makeCtx(opts: {
  calls: Call[];
  selfPerm: Permanent;
  ownerSecurity?: CardInstance[];
  opponentSecurity?: CardInstance[];
  opponentBattleArea?: Permanent[];
  isOwnerTurn?: boolean;
  opponentAcceptsTrash?: boolean;
}): EffectContext {
  const {
    calls,
    selfPerm,
    ownerSecurity = [makeCard("dummy-sec", 0)],
    opponentSecurity = [makeCard("dummy-sec-opp", 1)],
    opponentBattleArea = [],
    isOwnerTurn = true,
    opponentAcceptsTrash = false,
  } = opts;

  const players = [
    { battleArea: [selfPerm], security: ownerSecurity, hand: [], deck: [makeCard("deck-top", 0)], trash: [] },
    { battleArea: opponentBattleArea, security: opponentSecurity, hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: (isOwnerTurn ? 0 : 1) as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) =>
      [...players[0]!.battleArea, ...players[1]!.battleArea].find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => {
      if (card.cardId === "BT19-043") return fakeDef("BT19-043");
      if (card.cardId.includes("Lucemon") || card.cardId === "BT9-082") return lucemonDef();
      return fakeDef(card.cardId);
    },
  } as unknown as GameAccess;

  const fx = {
    trashFromSecurity: async (...a: unknown[]) => { calls.push({ verb: "trashFromSecurity", args: a }); },
    recoverToSecurity: async (...a: unknown[]) => { calls.push({ verb: "recoverToSecurity", args: a }); },
    deletePermanent: async (...a: unknown[]) => { calls.push({ verb: "deletePermanent", args: a }); },
    subscribeReplacement: (...a: unknown[]) => { calls.push({ verb: "subscribeReplacement", args: a }); },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    // Controls whether the optional prompts are accepted (opponent trashing or owner paying prevention).
    optional: async () => opponentAcceptsTrash,
    chooseTargets: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectPermanents: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectCards: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    chooseOption: async () => 0,
  };

  return {
    source: makeSource(selfPerm, isOwnerTurn),
    trigger: {},
    game,
    fx,
    ask,
  } as unknown as EffectContext;
}

describe("BT19-043 Lucemon (X Antibody)", () => {
  it("[None] registers a wouldLeavePlay replacement subscription", async () => {
    const calls: Call[] = [];
    const selfPerm = makeSelfPerm();
    const ctx = makeCtx({ calls, selfPerm });

    const mod = getEffectModule("BT19-043");
    expect(mod).toBeDefined();
    const effects = mod!.effectsForTiming(EffectTiming.None, makeSource(selfPerm));
    // FAILS-WHEN-REVERTED: no None effect → no subscribeReplacement.
    expect(effects.length).toBeGreaterThan(0);

    await effects[0]!.resolve(ctx);

    const repCalls = calls.filter((c) => c.verb === "subscribeReplacement");
    expect(repCalls).toHaveLength(1);
    const sub = repCalls[0]!.args[0] as { event?: string; mode?: string };
    expect(sub.event).toBe("wouldLeavePlay");
    expect(sub.mode).toBe("prevent");
  });

  it("[End of Your Turn] calls recoverToSecurity + deletePermanent when opponent does not trash", async () => {
    const calls: Call[] = [];
    const selfPerm = makeSelfPerm();
    const oppDigimon: Permanent = {
      permanentId: "opp-digimon",
      controllerSeat: 1 as Seat,
      topCard: makeCard("BT1-009", 1),
      stack: [],
      linked: [],
      baseDP: 4000,
      currentDP: 4000,
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const ctx = makeCtx({
      calls,
      selfPerm,
      opponentBattleArea: [oppDigimon],
      opponentAcceptsTrash: false, // opponent declines → triggers Recovery +1 + delete
    });

    const mod = getEffectModule("BT19-043")!;
    const effects = mod.effectsForTiming(EffectTiming.OnEndTurn, makeSource(selfPerm));
    // FAILS-WHEN-REVERTED: no OnEndTurn effect → recoverToSecurity never called.
    expect(effects.length).toBeGreaterThan(0);

    await effects[0]!.resolve(ctx);

    // Recovery +1 Deck: recoverToSecurity should be called.
    const recoverCalls = calls.filter((c) => c.verb === "recoverToSecurity");
    expect(recoverCalls).toHaveLength(1);

    // Delete 1 opponent Digimon/Tamer.
    const deleteCalls = calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls).toHaveLength(1);
  });

  it("[End of Your Turn] does NOT call recoverToSecurity when opponent trashes top security", async () => {
    const calls: Call[] = [];
    const selfPerm = makeSelfPerm();
    const ctx = makeCtx({
      calls,
      selfPerm,
      opponentAcceptsTrash: true, // opponent trashes → no recovery/deletion
    });

    const mod = getEffectModule("BT19-043")!;
    const effects = mod.effectsForTiming(EffectTiming.OnEndTurn, makeSource(selfPerm));
    expect(effects.length).toBeGreaterThan(0);

    await effects[0]!.resolve(ctx);

    // Opponent chose to trash their security → no Recovery +1 and no delete.
    const recoverCalls = calls.filter((c) => c.verb === "recoverToSecurity");
    expect(recoverCalls).toHaveLength(0);
    const deleteCalls = calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls).toHaveLength(0);
  });
});
