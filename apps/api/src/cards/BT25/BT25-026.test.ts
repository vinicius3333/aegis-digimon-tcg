import { describe, it, expect, beforeEach } from "vitest";
import {
  CardColor,
  EffectTiming,
  type CardDefinition,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
  SubTriggerInstall,
} from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT25-026.js";


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
  const cardId = over.cardId ?? "X-000";
  return {
    permanentId: `p-${seq}`,
    controllerSeat: 0 as Seat,
    topCard: { instanceId: `i-${seq}`, cardId, ownerSeat: 0 as Seat, faceUp: true },
    stack: [],
    linked: [],
    baseDP: 3000,
    currentDP: 3000,
    isSuspended: false,
    inBreeding: false,
    ...over,
  } as unknown as Permanent;
}

function makeSource(selfPermanent: Permanent): CardSource {
  return {
    instanceId: "SRC#1",
    cardId: "BT25-026",
    ownerSeat: 0 as Seat,
    definition: makeDefinition({ cardId: "BT25-026", colors: [CardColor.Blue] }),
    permanent: () => selfPermanent,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

interface Harness {
  installs: SubTriggerInstall[];
  digivolveCalls: number;
  ctx: EffectContext;
  /** Build a freshly bound sub-context for a fired event whose subject is `subjectId`. */
  subCtxFor(subjectId: string): EffectContext;
}

const RED_DIGIMON = "DIG-RED";
const BLUE_DIGIMON = "DIG-BLUE";
const DIANAMON = "DIANAMON";

function makeHarness(turnSeat: Seat): Harness {
  seq = 0;
  const self = makePermanent({ cardId: "BT25-026", controllerSeat: 0 as Seat });
  const redSubject = makePermanent({ permanentId: "subj-red", cardId: RED_DIGIMON, controllerSeat: 0 as Seat });
  const blueSubject = makePermanent({ permanentId: "subj-blue", cardId: BLUE_DIGIMON, controllerSeat: 0 as Seat });
  const byId: Record<string, Permanent> = {
    [self.permanentId]: self,
    "subj-red": redSubject,
    "subj-blue": blueSubject,
  };
  const colorsByCard: Record<string, CardColor[]> = {
    [RED_DIGIMON]: [CardColor.Red],
    [BLUE_DIGIMON]: [CardColor.Blue],
    [DIANAMON]: [CardColor.Blue],
    "BT25-026": [CardColor.Blue],
  };
  const players = [
    {
      seat: 0,
      battleArea: [self, redSubject, blueSubject],
      security: [],
      hand: [],
      deck: [],
      // A [Dianamon] in trash so the digivolve has a source to find.
      trash: [{ instanceId: "t-dianamon", cardId: DIANAMON, ownerSeat: 0 as Seat, faceUp: false }],
    },
    { seat: 1, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];
  const game: GameAccess = {
    state: { memory: 0, players, turnSeat } as never,
    player: (s: Seat) => players[s] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => byId[id],
    definitionOf: (card) =>
      makeDefinition({
        cardId: card.cardId,
        nameEn: card.cardId === DIANAMON ? "Dianamon" : card.cardId,
        colors: colorsByCard[card.cardId] ?? [],
      }),
    linkMax: () => 1,
  };
  const harness: Harness = {
    installs: [],
    digivolveCalls: 0,
    ctx: undefined as never,
    subCtxFor: undefined as never,
  };
  const fx = {
    subscribeSubTrigger: (install: SubTriggerInstall) => {
      harness.installs.push(install);
      return harness.installs.length;
    },
    digivolveFromInstance: async () => {
      harness.digivolveCalls += 1;
      return makePermanent({ cardId: DIANAMON });
    },
    // The inherited [Restrict attackTargetChange] effect also resolves at EffectTiming.None;
    // no-op it so installing the [Your Turn] watchers does not throw.
    restrict: () => {},
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  const baseCtx = (): EffectContext => ({
    source: makeSource(self),
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map<string, string>(),
  });
  harness.ctx = baseCtx();
  harness.subCtxFor = (subjectId: string) => {
    const c = baseCtx();
    c.trigger = { subjectPermanentId: subjectId };
    return c;
  };
  return harness;
}

/** Subscribe the card's [Your Turn] SubTrigger watchers through the REAL interpreter. */
async function installWatchers(h: Harness): Promise<void> {
  const module = getEffectModule("BT25-026")!;
  const effects = module.effectsForTiming(EffectTiming.None, h.ctx.source);
  // The [Your Turn] SubTrigger effects live in the continuous/static window (EffectTiming.None);
  // resolve every one so each SubTrigger watcher is installed.
  for (const e of effects) await e.resolve(h.ctx);
}

describe("BT25-026 — SubTrigger fire-time source-color gate", () => {
  beforeEach(() => {
    seq = 0;
  });

  it("installs play + digivolve watchers each gated on a red, your-turn subject", async () => {
    const h = makeHarness(0 as Seat);
    await installWatchers(h);
    const colorGated = h.installs.filter((i) => i.matches !== undefined);
    expect(colorGated.length).toBeGreaterThanOrEqual(2);
  });

  it("a RED triggering Digimon (your turn) => the gate passes and the digivolve fires", async () => {
    const h = makeHarness(0 as Seat);
    await installWatchers(h);
    const install = h.installs.find((i) => i.matches !== undefined)!;
    expect(install.matches!(h.subCtxFor("subj-red"))).toBe(true);
    await install.run(h.subCtxFor("subj-red"));
    expect(h.digivolveCalls).toBeGreaterThanOrEqual(1);
  });

  it("a NON-red triggering Digimon (your turn) => the gate blocks (digivolve never offered)", async () => {
    const h = makeHarness(0 as Seat);
    await installWatchers(h);
    const install = h.installs.find((i) => i.matches !== undefined)!;
    // FAILS-WHEN-REVERTED: drop the triggerSubjectHasColor conjunct and this blue subject matches.
    expect(install.matches!(h.subCtxFor("subj-blue"))).toBe(false);
  });

  it("a red subject on the OPPONENT's turn => the your-turn conjunct blocks the gate", async () => {
    const h = makeHarness(1 as Seat); // opponent's turn
    await installWatchers(h);
    const install = h.installs.find((i) => i.matches !== undefined)!;
    expect(install.matches!(h.subCtxFor("subj-red"))).toBe(false);
  });
});
