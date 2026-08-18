import { describe, it, expect } from "vitest";
import { EffectTiming, type CompiledCard, type Seat } from "@aegis/shared";
import { irCardModule } from "../../engine/effects/interpreter.js";
import "./LM-050.js";

function makeRecorder() {
  const calls: { verb: string; args: unknown[] }[] = [];
  return {
    calls,
    record:
      (verb: string) =>
      (...args: unknown[]) => {
        calls.push({ verb, args });
        return undefined as never;
      },
  };
}

function makeSource(instanceId = "INST#1", cardId = "LM-050") {
  return {
    instanceId,
    cardId,
    ownerSeat: 0 as Seat,
    definition: { cardId, kinds: ["Option"], colors: ["Purple"], playCost: 3, dp: 0, evoCosts: [], maxCountInDeck: 4 } as never,
    permanent: () => undefined as never,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeContext(
  recorder: ReturnType<typeof makeRecorder>,
  source: ReturnType<typeof makeSource>,
  opts: {
    battleArea?: unknown[];
    definitionOf?: (card: { cardId: string }) => unknown;
  } = {},
) {
  const placed: string[] = [];
  const battleArea = opts.battleArea ?? [];
  const playerState = { seat: 0 as Seat, battleArea, security: [] as unknown[], hand: [] as unknown[], deck: [] as unknown[], trash: [] as unknown[] };
  const definitionOf = opts.definitionOf ?? ((card: { cardId: string }) => ({ cardId: card.cardId, kinds: ["Digimon"], colors: [], playCost: 0, dp: 0, evoCosts: [], maxCountInDeck: 4 }));
  return {
    source,
    trigger: {},
    game: {
      state: { memory: 3, players: [playerState], turnSeat: 0 } as never,
      player: (_seat?: Seat) => playerState as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      permanentById: () => undefined,
      definitionOf: (card: { cardId: string }) => definitionOf(card) as never,
      linkMax: () => 1,
    },
    fx: {
      draw: recorder.record("draw"),
      gainMemory: recorder.record("gainMemory"),
      gainMemoryForSeat: recorder.record("gainMemoryForSeat"),
      restrictMemoryGain: recorder.record("restrictMemoryGain"),
      restrictCostReduction: recorder.record("restrictCostReduction"),
      restrictPlay: recorder.record("restrictPlay"),
      disableSecurityEffect: recorder.record("disableSecurityEffect"),
      disableTimingEffect: recorder.record("disableTimingEffect"),
      declareWinner: recorder.record("declareWinner"),
      setMemory: recorder.record("setMemory"),
      modifyDP: recorder.record("modifyDP"),
      setBaseDP: recorder.record("setBaseDP"),
      playFromHand: async (...a: unknown[]) => { recorder.calls.push({ verb: "playFromHand", args: a }); return []; },
      playFromSecurity: async (...a: unknown[]) => { recorder.calls.push({ verb: "playFromSecurity", args: a }); return undefined; },
      playInstances: async (...a: unknown[]) => { recorder.calls.push({ verb: "playInstances", args: a }); return []; },
      digivolveFromInstance: async (...a: unknown[]) => { recorder.calls.push({ verb: "digivolveFromInstance", args: a }); return undefined; },
      dnaDigivolveInto: async (...a: unknown[]) => { recorder.calls.push({ verb: "dnaDigivolveInto", args: a }); return undefined; },
      appFuseInto: async (...a: unknown[]) => { recorder.calls.push({ verb: "appFuseInto", args: a }); return undefined; },
      deDigivolve: recorder.record("deDigivolve"),
      placeOwnTopAtStackBottom: recorder.record("placeOwnTopAtStackBottom"),
      placeUnder: async (...a: unknown[]) => { recorder.calls.push({ verb: "placeUnder", args: a }); return []; },
      hatch: recorder.record("hatch"),
      placeUnderFromEggDeck: async (...a: unknown[]) => { recorder.calls.push({ verb: "placeUnderFromEggDeck", args: a }); return undefined; },
      placeAsTopFromEggDeck: async (...a: unknown[]) => { recorder.calls.push({ verb: "placeAsTopFromEggDeck", args: a }); return undefined; },
      link: async (...a: unknown[]) => { recorder.calls.push({ verb: "link", args: a }); return []; },
      trash: async (...a: unknown[]) => { recorder.calls.push({ verb: "trash", args: a }); return []; },
      trashDigivolutionCards: async (...a: unknown[]) => { recorder.calls.push({ verb: "trashDigivolutionCards", args: a }); return []; },
      fireOptionUsed: async (...a: unknown[]) => { recorder.calls.push({ verb: "fireOptionUsed", args: a }); },
      useOptionFromHand: async (...a: unknown[]) => { recorder.calls.push({ verb: "useOptionFromHand", args: a }); return []; },
      trashFromSecurity: async (...a: unknown[]) => { recorder.calls.push({ verb: "trashFromSecurity", args: a }); return []; },
      deletePermanent: async (...a: unknown[]) => { recorder.calls.push({ verb: "deletePermanent", args: a }); return 0; },
      suspend: async (...a: unknown[]) => {
        recorder.calls.push({ verb: "suspend", args: a });
        return a[0] as string[];
      },
      unsuspend: recorder.record("unsuspend"),
      returnToHand: async (...a: unknown[]) => { recorder.calls.push({ verb: "returnToHand", args: a }); return []; },
      returnToDeck: async (...a: unknown[]) => { recorder.calls.push({ verb: "returnToDeck", args: a }); return []; },
      reveal: async (...a: unknown[]) => { recorder.calls.push({ verb: "reveal", args: a }); return []; },
      searchDeck: async (...a: unknown[]) => { recorder.calls.push({ verb: "searchDeck", args: a }); return []; },
      addSecurity: recorder.record("addSecurity"),
      grantPierce: recorder.record("grantPierce"),
      changeEvoCost: recorder.record("changeEvoCost"),
      changePlayCost: recorder.record("changePlayCost"),
      restrict: recorder.record("restrict"),
      grantNameTrait: recorder.record("grantNameTrait"),
      grantKeyword: recorder.record("grantKeyword"),
      grantLinkMax: recorder.record("grantLinkMax"),
      grantLinkCostReduction: recorder.record("grantLinkCostReduction"),
      cannotIgnoreDigivolution: recorder.record("cannotIgnoreDigivolution"),
      grantedKeywords: () => [],
      addColorGrant: recorder.record("addColorGrant"),
      waiveColorRequirement: recorder.record("waiveColorRequirement"),
      shuffleSecurity: recorder.record("shuffleSecurity"),
      securityToHand: (...a: unknown[]) => { recorder.calls.push({ verb: "securityToHand", args: a }); return []; },
      recoverToSecurity: async (...a: unknown[]) => { recorder.calls.push({ verb: "recoverToSecurity", args: a }); return []; },
      flipTopSecurity: (...a: unknown[]) => { recorder.calls.push({ verb: "flipTopSecurity", args: a }); return true; },
      flipSecurityFaceUp: (...a: unknown[]) => { recorder.calls.push({ verb: "flipSecurityFaceUp", args: a }); return true; },
      forceAttack: async (...a: unknown[]) => { recorder.calls.push({ verb: "forceAttack", args: a }); },
      redirectAttack: async (...a: unknown[]) => { recorder.calls.push({ verb: "redirectAttack", args: a }); },
      grantCanAttackUnsuspended: recorder.record("grantCanAttackUnsuspended"),
      endAttack: recorder.record("endAttack"),
      subscribeSubTrigger: (sub: unknown) => { recorder.calls.push({ verb: "subscribeSubTrigger", args: [sub] }); return 0; },
      subscribeReplacement: (sub: unknown) => { recorder.calls.push({ verb: "subscribeReplacement", args: [sub] }); return 0; },
      relocatePermanent: recorder.record("relocatePermanent"),
      movePermanentZone: async (...a: unknown[]) => { recorder.calls.push({ verb: "movePermanentZone", args: a }); return true; },
      conferStackEffects: recorder.record("conferStackEffects"),
      playToken: async (...a: unknown[]) => { recorder.calls.push({ verb: "playToken", args: a }); return undefined; },
      modifySecurityDp: recorder.record("modifySecurityDp"),
      fireOnDiscardLibrary: async (...a: unknown[]) => { recorder.calls.push({ verb: "fireOnDiscardLibrary", args: a }); },
      fireWhenTrashedFromDeck: async (...a: unknown[]) => { recorder.calls.push({ verb: "fireWhenTrashedFromDeck", args: a }); },
      placeOptionAsPermanent: async (id: string) => {
        placed.push(id);
        recorder.calls.push({ verb: "placeOptionAsPermanent", args: [id] });
      },
    },
    ask: {
      optional: async () => true,
      chooseTargets: async (_ctx: unknown, o: { candidates: string[]; max: number }) => o.candidates.slice(0, o.max),
      selectCards: async (_ctx: unknown, o: { candidates: string[]; max: number }) => o.candidates.slice(0, o.max),
      chooseOption: async () => 0,
    },
    selections: new Map<string, string>(),
    _placed: placed,
  };
}

const COMPILED: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      condition: {
        kind: "youHave",
        filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon", "Tamer"], colors: ["Red"] },
        raw: "you have a Red Digimon or Tamer in the battle area",
      },
      actions: [{ kind: "WaiveColorRequirement", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, color: "red" }],
    },
    {
      trigger: "Main",
      actions: [
        { kind: "RevealAdd", revealCount: 3, add: [{ filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Red", "Purple"] }, count: 1, to: "hand" }], rest: "deckBottom" },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    { trigger: "Main", actions: [{ kind: "GainMemory", amount: 2 }], keywords: [{ keyword: "Delay", raw: "＜Delay＞" }] },
    { trigger: "Security", actions: [{ kind: "PlaceInBattleAreaSelf" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

describe("LM-050 Magenta Memory Boost! — hand-corrected IR", () => {
  it("Security effect has isSecurity flag and resolves to placeOptionAsPermanent", async () => {
    const module = irCardModule("LM-050", COMPILED);
    const source = makeSource("INST#LM050", "LM-050");

    const effects = module.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effects.some((e) => e.isSecurity)).toBe(true);

    const secEffect = effects.find((e) => e.isSecurity)!;
    const recorder = makeRecorder();
    const ctx = makeContext(recorder, source);

    await secEffect.resolve(ctx as never);

    // Fails-when-reverted: old AUTO-GENERATED Security had empty actions — placeOptionAsPermanent never fired.
    expect(recorder.calls.some((c) => c.verb === "placeOptionAsPermanent")).toBe(true);
    expect(ctx._placed).toContain("INST#LM050");
  });

  it("Static WaiveColorRequirement only calls waiveColorRequirement when owner has Red in play", async () => {
    const module = irCardModule("LM-050", COMPILED);
    const source = makeSource("INST#LM050", "LM-050");

    const effects = module.effectsForTiming(EffectTiming.None, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
    const staticEffect = effects[0]!;

    // No Red Digimon: waiver must NOT fire.
    const blueDigi = {
      permanentId: "blue-digi", controllerSeat: 0,
      topCard: { instanceId: "bd1", cardId: "BT1-027", ownerSeat: 0, faceUp: true },
      stack: [], linked: [], baseDP: 0, currentDP: 0, isSuspended: false, inBreeding: false,
    };
    const recorderNoRed = makeRecorder();
    const ctxNoRed = makeContext(recorderNoRed, source, {
      battleArea: [blueDigi],
      definitionOf: (card) => ({ cardId: card.cardId, kinds: ["Digimon"], colors: card.cardId === "BT1-027" ? ["Blue"] : [], playCost: 0, dp: 0, evoCosts: [], maxCountInDeck: 4 }),
    });
    await staticEffect.resolve(ctxNoRed as never);
    expect(recorderNoRed.calls.some((c) => c.verb === "waiveColorRequirement")).toBe(false);

    // With a Red Digimon: waiver MUST fire.
    const redDigi = {
      permanentId: "red-digi", controllerSeat: 0,
      topCard: { instanceId: "rd1", cardId: "BT1-009", ownerSeat: 0, faceUp: true },
      stack: [], linked: [], baseDP: 0, currentDP: 0, isSuspended: false, inBreeding: false,
    };
    const recorderWithRed = makeRecorder();
    const ctxWithRed = makeContext(recorderWithRed, source, {
      battleArea: [redDigi],
      definitionOf: (card) => ({ cardId: card.cardId, kinds: ["Digimon"], colors: card.cardId === "BT1-009" ? ["Red"] : [], playCost: 0, dp: 0, evoCosts: [], maxCountInDeck: 4 }),
    });
    await staticEffect.resolve(ctxWithRed as never);
    expect(recorderWithRed.calls.some((c) => c.verb === "waiveColorRequirement")).toBe(true);
  });
});
