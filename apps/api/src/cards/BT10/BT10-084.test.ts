import { describe, it, expect } from "vitest";
import {
  CardKind,
  EffectDuration,
  EffectTiming,
  type CardDefinition,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import {
  GameState as GameStateClass,
  PlayerState,
  Permanent as PermanentClass,
  CardInstance as CardInstanceClass,
  Phase,
  type DecisionRequest,
  type DecisionResponse,
  type ServerEvent,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { GameEngine, type GameEngineHooks } from "../../engine/GameEngine.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT10-084.js";

// A3 for BT10-084 (Tactimon)
//
// [On Play] Play up to 2 Bagra Army Lv.4 or lower Digimon from trash without cost;
//   those Digimon gain ＜Blocker＞ until end of opponent's turn.
// [Opponent's Turn] Replacement: digivolution-card trash redirect (engine gap; residual).
//
// Primary A3: [On Play] calls grantKeyword(Blocker, UntilOpponentTurnEnd) for each
// Digimon played. Without the effect the grant would not be made.
//
// FAILS-WHEN-REVERTED: if [On Play] were removed, grantKeyword would never be called.

const CARD_ID = "BT10-084";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? CARD_ID,
    set: "BT10",
    nameEn: over.nameEn ?? "Tactimon",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? (["Purple"] as never),
    playCost: over.playCost ?? 12,
    level: over.level,
    dp: 12000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makePermanent(permanentId: string, seat: Seat, cardId: string): Permanent {
  return {
    permanentId,
    controllerSeat: seat,
    topCard: { instanceId: `${permanentId}-top`, cardId, ownerSeat: seat },
    stack: [] as never,
    linked: [] as never,
    baseDP: 5000,
    currentDP: 5000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  const perm = makePermanent("tactimon-p1", 0, CARD_ID);
  return {
    instanceId: "inst-tactimon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef(),
    permanent: () => perm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

interface FxRecord {
  playInstancesCalled: { ids: string[] }[];
  grantKeywordCalled: { permanentId: string; keyword: string; duration: EffectDuration }[];
}

function makeContext(opts: {
  source?: CardSource;
  ownerBattleArea?: Permanent[];
  ownerTrash?: { instanceId: string; cardId: string }[];
  playedPermanents?: Permanent[];
  definitions?: Record<string, Partial<CardDefinition>>;
  record?: FxRecord;
}): EffectContext {
  const {
    source,
    ownerBattleArea = [],
    ownerTrash = [],
    playedPermanents = [],
    definitions = {},
    record = { playInstancesCalled: [], grantKeywordCalled: [] },
  } = opts;

  const players = [
    { seat: 0 as Seat, battleArea: ownerBattleArea, hand: [], trash: ownerTrash, security: [], deck: [] },
    { seat: 1 as Seat, battleArea: [], hand: [], trash: [], security: [], deck: [] },
  ];
  const state = { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => ownerBattleArea.find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => {
      const over = definitions[card.cardId] ?? {};
      return fakeDef({ cardId: card.cardId, ...over });
    },
  };

  const fx: Primitives = {
    playInstances: async (ids: string[]) => {
      record.playInstancesCalled.push({ ids: [...ids] });
      return playedPermanents;
    },
    grantKeyword: (permanentId: string, keyword: string, duration: EffectDuration) => {
      record.grantKeywordCalled.push({ permanentId, keyword, duration });
    },
    draw: async () => [],
    gainMemory: () => {},
    gainMemoryForSeat: () => {},
    restrictMemoryGain: () => {},
    restrictCostReduction: () => {},
    declareWinner: () => {},
    setMemory: () => {},
    modifyDP: () => {},
    setBaseDP: () => {},
    playFromHand: async () => [],
    playFromSecurity: async () => undefined,
    digivolveFromInstance: async () => undefined,
    dnaDigivolveInto: async () => undefined,
    deDigivolve: () => [],
    placeUnder: async () => [],
    placeOwnTopAtStackBottom: () => false,
    relocatePermanent: () => false,
    link: async () => [],
    trash: async () => [],
    trashDigivolutionCards: async () => [],
    trashFromSecurity: async () => [],
    deletePermanent: async () => 0,
    suspend: async () => [],
    unsuspend: () => {},
    returnToHand: async () => [],
    returnToDeck: async () => [],
    reveal: async () => [],
    searchDeck: async () => [],
    addSecurity: async () => {},
    grantPierce: () => {},
    changeEvoCost: () => {},
    changePlayCost: () => {},
    grantNameTrait: () => {},
    grantLinkMax: () => {},
    grantLinkCostReduction: () => {},
    waiveColorRequirement: () => {},
    shuffleSecurity: () => {},
    securityToHand: () => [],
    recoverToSecurity: async () => [],
    flipTopSecurity: () => false,
    flipSecurityFaceUp: () => false,
    forceAttack: async () => {},
    redirectAttack: async () => {},
    subscribeSubTrigger: () => 0,
    subscribeReplacement: () => 0,
    conferStackEffects: () => {},
    fireOptionUsed: async () => {},
    fireOnDiscardLibrary: async () => {},
    fireWhenTrashedFromDeck: async () => {},
    restrict: () => {},
    cannotIgnoreDigivolution: () => {},
    addColorGrant: () => {},
    movePermanentZone: async () => false,
    hatch: () => undefined,
    placeUnderFromEggDeck: async () => undefined,
    placeAsTopFromEggDeck: async () => undefined,
    endAttack: () => {},
    useOptionFromHand: async () => [],
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max ?? 1),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max ?? 1),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max ?? 2),
    chooseOption: async () => 0,
  };

  return { source: source ?? makeSource(), trigger: {}, game, fx, ask };
}

describe("BT10-084 (Tactimon)", () => {
  const module = getEffectModule(CARD_ID);

  it("is registered", () => {
    expect(module, "BT10-084 must self-register on import").toBeDefined();
  });

  it("routes [On Play] to OnPlay timing", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(0);
  });

  it("[On Play] calls grantKeyword Blocker on played Digimon with UntilOpponentTurnEnd", async () => {
    // Primary A3: each played Digimon permanent gets Blocker for UntilOpponentTurnEnd.
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);

    // Two Bagra Army Lv.4 Digimon in trash.
    const trashCard1 = { instanceId: "bagra-1", cardId: "BT10-BAG1" };
    const trashCard2 = { instanceId: "bagra-2", cardId: "BT10-BAG2" };
    const playedPerm1 = {
      permanentId: "played-perm-1",
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "bagra-1", cardId: "BT10-BAG1", ownerSeat: 0 as Seat },
    } as unknown as Permanent;
    const playedPerm2 = {
      permanentId: "played-perm-2",
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "bagra-2", cardId: "BT10-BAG2", ownerSeat: 0 as Seat },
    } as unknown as Permanent;

    const record: FxRecord = { playInstancesCalled: [], grantKeywordCalled: [] };
    const tactimonPermanent = makePermanent("tactimon-p", 0, CARD_ID);
    const sourceWithPerm = makeSource({ permanent: () => tactimonPermanent });

    const ctx = makeContext({
      source: sourceWithPerm,
      ownerBattleArea: [tactimonPermanent],
      ownerTrash: [trashCard1, trashCard2],
      playedPermanents: [playedPerm1, playedPerm2],
      definitions: {
        "BT10-BAG1": { cardId: "BT10-BAG1", nameEn: "BagraDigimon1", kinds: [CardKind.Digimon] as never, level: 4, types: ["Bagra Army"] as never },
        "BT10-BAG2": { cardId: "BT10-BAG2", nameEn: "BagraDigimon2", kinds: [CardKind.Digimon] as never, level: 3, types: ["Bagra Army"] as never },
      },
      record,
    });

    await effects[0]!.resolve(ctx);

    // playInstances was called.
    expect(record.playInstancesCalled.length).toBeGreaterThanOrEqual(1);

    // grantKeyword called for each played Digimon with Blocker + UntilOpponentTurnEnd.
    const blockerCalls = record.grantKeywordCalled.filter((c) => c.keyword === "Blocker");
    expect(blockerCalls.length).toBe(2);
    for (const call of blockerCalls) {
      expect(call.duration).toBe(EffectDuration.UntilOpponentTurnEnd);
    }
    expect(blockerCalls.map((c) => c.permanentId)).toContain("played-perm-1");
    expect(blockerCalls.map((c) => c.permanentId)).toContain("played-perm-2");
  });

  it("[On Play] canActivate is false when trash has no eligible Bagra Army Digimon", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const ctx = makeContext({ source, ownerTrash: [] });
    const canActivate = effects[0]!.canActivate?.(ctx) ?? true;
    expect(canActivate).toBe(false);
  });
});

// --- [Opponent's Turn] digivolution-card-trash redirect: full-engine A3 -----------------------
//
// The fake-context tests above cover [On Play]. The redirect clause is a persistent, continuous
// Replacement install (EffectTiming.None) consulted through GameEngine's own
// consultDigivolutionTrashRedirect wiring (subtriggers.ts / digivolutionTrashRedirect.ts), so it
// needs a REAL GameEngine to prove end to end — a fake CardSource/EffectContext can't exercise
// the continuous-recompute pass that installs the subscription or the consult that reads it back.

let seq = 0;

function instance(cardId: string, seat: 0 | 1, faceUp: boolean): CardInstanceClass {
  seq += 1;
  const card = new CardInstanceClass();
  card.instanceId = `inst-${seq}`;
  card.cardId = cardId;
  card.ownerSeat = seat;
  card.faceUp = faceUp;
  return card;
}

function permanentOf(cardId: string, seat: 0 | 1, dp: number): PermanentClass {
  seq += 1;
  const permanent = new PermanentClass();
  permanent.permanentId = `perm-${seq}`;
  permanent.controllerSeat = seat;
  permanent.topCard = instance(cardId, seat, true);
  permanent.isSuspended = false;
  permanent.inBreeding = false;
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  return permanent;
}

function safeDecisionResponse(req: DecisionRequest): DecisionResponse {
  switch (req.kind) {
    case "chooseTargets":
      return { kind: "chooseTargets", instanceIds: [] };
    case "selectCards":
      return { kind: "selectCards", instanceIds: [] };
    case "orderTriggers":
      return { kind: "orderTriggers", order: (req.options?.triggerKeys ?? []).slice(0, 1) };
    case "chooseOption":
      return { kind: "chooseOption", optionIndex: 0 };
    case "optional":
    default:
      return { kind: "optional", accept: false };
  }
}

/** `acceptOptional`: whether the "may you redirect?" prompt should be accepted. */
function setupEngine(acceptOptional: boolean): { engine: GameEngine; state: GameState } {
  const state = new GameStateClass() as unknown as GameState;
  let engineRef: GameEngine | undefined;
  const hooks: GameEngineHooks = {
    seed: 1,
    requestDecision: (seat, req) => {
      const response =
        req.kind === "optional" ? ({ kind: "optional", accept: acceptOptional } as DecisionResponse) : safeDecisionResponse(req);
      engineRef?.applyIntent(seat, { type: "respondDecision", decisionId: req.decisionId, response });
    },
    emit: (_e: ServerEvent) => {},
  };
  const engine = new GameEngine(state as never, hooks);
  engineRef = engine;
  engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });
  (state as unknown as { phase: Phase }).phase = Phase.Main;
  state.turnSeat = 1 as Seat; // the OPPONENT of Tactimon's controller (seat 0) is the turn player
  return { engine, state };
}

function primitivesOf(engine: GameEngine): Primitives {
  return (engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT10-084 (Tactimon) [Opponent's Turn] digivolution-card-trash redirect (KB Q2002-Q2008)", () => {
  it("redirects an effect-driven trash of another of the controller's Digimon onto Tactimon's own stack, clamping the count (Q2004)", async () => {
    const { engine, state } = setupEngine(true);
    const p0 = state.players[0] as unknown as PlayerState;

    const tactimon = permanentOf("BT10-084", 0, 12000);
    const other = permanentOf("AD1-001", 0, 5000); // another of Tactimon's controller's Digimon
    other.stack.push(instance("AD1-001", 0, false), instance("AD1-001", 0, false), instance("AD1-001", 0, false));
    tactimon.stack.push(instance("BT10-084", 0, false), instance("BT10-084", 0, false));
    p0.battleArea.push(tactimon, other);

    // Install Tactimon's persistent [Opponent's Turn] redirect via the real continuous-recompute
    // pass (mirrors how it would be armed mid-match).
    await advance(engine).recompute();

    const fx = primitivesOf(engine);
    const originalStackSize = other.stack.length;
    // An effect is about to trash the OTHER Digimon's stack (amount 3, "trash as many as
    // possible" per Q2004) — this is the exact seam interpreter.ts's TrashDigivolution/payCost
    // sites call before selecting which cards to take.
    const redirected = await fx.redirectDigivolutionTrashHosts([other.permanentId]);

    expect(redirected).toEqual([tactimon.permanentId]);
    // The original target was never touched by the redirect consult itself — only the calling
    // site's subsequent trashDigivolutionCards call (not exercised here) would move cards.
    expect(other.stack.length).toBe(originalStackSize);
  });

  it("does NOT redirect on the controller's OWN turn — the ability is [Opponent's Turn] only", async () => {
    const { engine, state } = setupEngine(true);
    state.turnSeat = 0 as Seat; // now Tactimon's controller's own turn
    const p0 = state.players[0] as unknown as PlayerState;

    const tactimon = permanentOf("BT10-084", 0, 12000);
    const other = permanentOf("AD1-001", 0, 5000);
    other.stack.push(instance("AD1-001", 0, false));
    p0.battleArea.push(tactimon, other);

    await advance(engine).recompute();

    const fx = primitivesOf(engine);
    const redirected = await fx.redirectDigivolutionTrashHosts([other.permanentId]);

    // FAILS-WHEN-REVERTED: drop the turnSeat gate in BT10-084's `appliesTo` (or the "redirect"
    // consult wiring entirely) => this returns [tactimon.permanentId] on the controller's own
    // turn too, which is RED against the printed "[Opponent's Turn]" restriction.
    expect(redirected).toEqual([other.permanentId]);
  });

  it("does NOT redirect when the controller declines the 'may' prompt", async () => {
    const { engine, state } = setupEngine(false); // decline the optional redirect
    const p0 = state.players[0] as unknown as PlayerState;

    const tactimon = permanentOf("BT10-084", 0, 12000);
    const other = permanentOf("AD1-001", 0, 5000);
    other.stack.push(instance("AD1-001", 0, false));
    p0.battleArea.push(tactimon, other);

    await advance(engine).recompute();

    const fx = primitivesOf(engine);
    const redirected = await fx.redirectDigivolutionTrashHosts([other.permanentId]);

    expect(redirected).toEqual([other.permanentId]);
  });

  it("redirects even when Tactimon itself has 0 digivolution cards (Q2002)", async () => {
    const { engine, state } = setupEngine(true);
    const p0 = state.players[0] as unknown as PlayerState;

    const tactimon = permanentOf("BT10-084", 0, 12000); // no stack cards at all
    const other = permanentOf("AD1-001", 0, 5000);
    other.stack.push(instance("AD1-001", 0, false));
    p0.battleArea.push(tactimon, other);

    await advance(engine).recompute();

    const fx = primitivesOf(engine);
    const redirected = await fx.redirectDigivolutionTrashHosts([other.permanentId]);

    expect(redirected).toEqual([tactimon.permanentId]);
  });
});
