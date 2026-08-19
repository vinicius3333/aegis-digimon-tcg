import { describe, it, expect, beforeEach } from "vitest";
import {
  EffectTiming,
  type CardDefinition,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT19-084.js";

/**
 * A3 for BT19-084's [Main] face-up-security digivolve SOURCE + the digivolve-RESULT binding
 * gating the "then place [Royal Base]" clause (KB BT19-084; documented behavior).
 *
 *   "[Main] By suspending this Tamer, 1 of your Digimon digivolves into a Digimon card in your
 *    FACE-UP security cards. If this effect digivolved, you may place 1 [Royal Base] Digimon
 *    from hand face up as your bottom security card."
 *
 * Two new/reused surfaces proven, each through the REAL interpreter:
 *  - face-up-security SOURCE: runDigivolve drops face-DOWN security candidates (documented behavior !IsFlipped).
 *  - result binding (08-01 ifThisEffectDigivolved): the place-[Royal Base] clause runs only if
 *    the digivolve happened.
 *
 * FAILS-WHEN-REVERTED:
 *  - (source) make the security card FACE DOWN => no eligible digivolve source => no digivolve
 *    => the place clause is skipped (and digivolveFromInstance is never called).
 *  - (binding) drop `ctx.lastDigivolveResult = true` in runDigivolve => the success-case place
 *    clause never runs.
 */

let seq = 0;

function makeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "X-000",
    set: "X",
    nameEn: "X",
    kinds: ["Digimon"] as never,
    colors: [],
    playCost: 0,
    dp: 3000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makePermanent(over: Partial<Permanent> & { cardId?: string }): Permanent {
  seq += 1;
  return {
    permanentId: `p-${seq}`,
    controllerSeat: 0 as Seat,
    topCard: { instanceId: `i-${seq}`, cardId: over.cardId ?? "X-000", ownerSeat: 0 as Seat, faceUp: true },
    stack: [],
    linked: [],
    baseDP: 3000,
    currentDP: 3000,
    isSuspended: false,
    inBreeding: false,
    ...over,
  } as unknown as Permanent;
}

const ROYAL_BASE = "ROYAL-BASE-DIGIMON";
const SEC_DIGIMON = "SEC-DIGIMON";

function makeSource(self: Permanent): CardSource {
  return {
    instanceId: "SRC#1",
    cardId: "BT19-084",
    ownerSeat: 0 as Seat,
    definition: makeDefinition({ cardId: "BT19-084", kinds: ["Tamer"] as never }),
    permanent: () => self,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

interface Harness {
  ctx: EffectContext;
  digivolveCalls: number;
  addSecurityCalls: { ids: string[]; faceUp?: boolean }[];
  suspendCalls: number;
}

function makeHarness(opts: {
  securityFaceUp: boolean;
  /** When false, runDigivolve's fake reports "no digivolve" even with a source (binding lever). */
  digivolveSucceeds?: boolean;
}): Harness {
  seq = 0;
  const self = makePermanent({ cardId: "BT19-084", controllerSeat: 0 as Seat });
  const friendly = makePermanent({ permanentId: "friendly", cardId: "X-FRIEND", controllerSeat: 0 as Seat });
  // The Digimon card sitting in seat 0's security (face-up or face-down per the case).
  const secCard = { instanceId: "sec-1", cardId: SEC_DIGIMON, ownerSeat: 0 as Seat, faceUp: opts.securityFaceUp };
  const royalBaseInHand = { instanceId: "rb-1", cardId: ROYAL_BASE, ownerSeat: 0 as Seat, faceUp: false };
  const players = [
    {
      seat: 0,
      battleArea: [self, friendly],
      security: [secCard],
      hand: [royalBaseInHand],
      deck: [],
      trash: [],
    },
    { seat: 1, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];
  const byId: Record<string, Permanent> = { [self.permanentId]: self, friendly };
  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 } as never,
    player: (s: Seat) => players[s] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => byId[id],
    definitionOf: (card) =>
      makeDefinition({
        cardId: card.cardId,
        nameEn: card.cardId,
        kinds: ["Digimon"] as never,
        // Tag the Royal Base card with the trait so the place-source filter matches it.
        attributes: card.cardId === ROYAL_BASE ? ["Royal Base"] : [],
      }),
    linkMax: () => 1,
  };
  const h: Harness = { ctx: undefined as never, digivolveCalls: 0, addSecurityCalls: [], suspendCalls: 0 };
  const fx = {
    suspend: async (ids: string[]) => {
      h.suspendCalls += 1;
      return ids;
    },
    digivolveFromInstance: async () => {
      h.digivolveCalls += 1;
      return opts.digivolveSucceeds === false ? undefined : makePermanent({ cardId: SEC_DIGIMON });
    },
    addSecurity: async (_seat: Seat, ids: string[], o?: { faceUp?: boolean }) => {
      h.addSecurityCalls.push({ ids, faceUp: o?.faceUp });
    },
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  h.ctx = {
    source: makeSource(self),
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map<string, string>(),
  };
  return h;
}

async function runMain(h: Harness): Promise<void> {
  const module = getEffectModule("BT19-084")!;
  // The [Main] activated ability is reachable at OnDeclaration (timingsForTrigger maps Main).
  const effects = module.effectsForTiming(EffectTiming.OnDeclaration, h.ctx.source);
  for (const e of effects) await e.resolve(h.ctx);
}

describe("BT19-084 — face-up-security digivolve source + result-bound place clause", () => {
  beforeEach(() => {
    seq = 0;
  });

  it("a FACE-UP security Digimon source => the digivolve runs and the [Royal Base] place clause runs", async () => {
    const h = makeHarness({ securityFaceUp: true });
    await runMain(h);
    expect(h.digivolveCalls).toBe(1);
    // The place-[Royal Base] clause ran (gated true) and placed face up.
    expect(h.addSecurityCalls.length).toBe(1);
    expect(h.addSecurityCalls[0]!.faceUp).toBe(true);
    expect(h.addSecurityCalls[0]!.ids).toContain("rb-1");
  });

  it("a FACE-DOWN security card is NOT an eligible source => no digivolve, place clause skipped", async () => {
    const h = makeHarness({ securityFaceUp: false });
    await runMain(h);
    // FAILS-WHEN-REVERTED (source filter): a face-down security card would otherwise be a source.
    expect(h.digivolveCalls).toBe(0);
    expect(h.addSecurityCalls.length).toBe(0);
  });

  it("the digivolve does NOT happen (no result) => the place clause is skipped (result binding)", async () => {
    const h = makeHarness({ securityFaceUp: true, digivolveSucceeds: false });
    await runMain(h);
    expect(h.digivolveCalls).toBe(1); // a source was found and attempted
    // FAILS-WHEN-REVERTED (binding): if runDigivolve bound TRUE unconditionally, the place clause runs.
    expect(h.addSecurityCalls.length).toBe(0);
  });
});
