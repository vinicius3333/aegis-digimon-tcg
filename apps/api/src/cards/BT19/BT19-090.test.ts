import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-090.js";

<<<<<<< HEAD
describe("BT19-090 Meteor Rock Soul", () => {
  it("compiles the two Main choices and the optional Security play", () => {
    const card = runtimeCompiledCard("BT19-090");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    const modal = card?.effects.find((entry) => entry.trigger === "Main")?.actions[0];
    expect(modal).toMatchObject({ kind: "Modal", choose: 1, options: [[{ kind: "PlayWithoutCost" }], [{ kind: "Attack", attackPlayer: true, mandatory: true, cost: { kind: "unsuspendNamed", targets: expect.any(Array) } }]] });
    const security = card?.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", from: ["underTamers"] }] });
=======
// A3 for BT19-090 (Meteor Rock Soul — Red Option):
//   [Main] modal: (A) play 1 [Xros Heart] Digimon (DP<=4000) from under your Tamer w/o cost; OR
//          (B) by unsuspending 1 [Shoutmon EX6] + 1 [ShootingStarmon], attack a player.
//   [Security] = branch A.
//

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT19-090",
    set: "BT19",
    nameEn: "Meteor Rock Soul",
    kinds: ["Option"] as never,
    colors: ["Red"] as never,
    playCost: 4,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

let seq = 0;
function makeInstance(cardId: string, seat: Seat): CardInstance {
  seq += 1;
  return { instanceId: `inst-${seq}`, cardId, ownerSeat: seat, faceUp: true } as unknown as CardInstance;
}

type PermSpec = {
  permanentId: string;
  cardId: string;
  controllerSeat: Seat;
  stack?: CardInstance[];
  isSuspended?: boolean;
};
function makePermanent(spec: PermSpec): Permanent {
  return {
    permanentId: spec.permanentId,
    controllerSeat: spec.controllerSeat,
    topCard: makeInstance(spec.cardId, spec.controllerSeat),
    stack: (spec.stack ?? []) as never,
    linked: [] as never,
    baseDP: 1000,
    currentDP: 1000,
    isSuspended: spec.isSuspended ?? false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(): CardSource {
  return {
    instanceId: "SELF-OPT",
    cardId: "BT19-090",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } as unknown as CardSource;
}

function makeContext(opts: {
  recorder: Recorder;
  source: CardSource;
  battleArea?: Permanent[];
  defs?: Map<string, Partial<CardDefinition>>;
  optionChoice?: number;
}): EffectContext {
  const rec = opts.recorder;
  const defs = opts.defs ?? new Map();
  const game: GameAccess = {
    state: { memory: 0, players: [], turnSeat: 0 as Seat } as never,
    player: (seat: Seat) =>
      ({
        seat,
        battleArea: (opts.battleArea ?? []).filter((p) => p.controllerSeat === seat),
        security: [],
        hand: [],
        deck: [],
        trash: [],
      }) as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => (opts.battleArea ?? []).find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => fakeDefinition({ ...defs.get(card.cardId), cardId: card.cardId }),
  };
  const fx = {
    playInstances: async (...args: unknown[]) => {
      rec.calls.push({ verb: "playInstances", args });
      return [];
    },
    unsuspend: (...args: unknown[]) => rec.calls.push({ verb: "unsuspend", args }),
    forceAttack: async (...args: unknown[]) => {
      rec.calls.push({ verb: "forceAttack", args });
    },
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => opts.optionChoice ?? 0,
  };
  return { source: opts.source, trigger: {}, game, fx, ask };
}

const digimonDef = (over: Partial<CardDefinition> = {}): Partial<CardDefinition> => ({
  kinds: ["Digimon"] as never,
  ...over,
});

describe("BT19-090 Meteor Rock Soul", () => {
  const module = getEffectModule("BT19-090");

  it("is registered on import", () => {
    expect(module).toBeDefined();
  });

  it("[Main] branch A plays a [Xros Heart] DP<=4000 Digimon from under a Tamer without cost", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const underCard = makeInstance("XROS", 0 as Seat);
    const tamer = makePermanent({
      permanentId: "TAMER",
      cardId: "TAMER-DEF",
      controllerSeat: 0 as Seat,
      stack: [underCard],
    });
    const defs = new Map<string, Partial<CardDefinition>>([
      ["TAMER-DEF", { kinds: ["Tamer"] as never }],
      ["XROS", digimonDef({ types: ["Xros Heart"] as never, dp: 4000 })],
    ]);
    const ctx = makeContext({ recorder, source, battleArea: [tamer], defs, optionChoice: 0 });
    const [effect] = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effect!.resolve(ctx);

    const play = recorder.calls.filter((c) => c.verb === "playInstances");
    expect(play).toHaveLength(1);
    expect(play[0]!.args[0] as string[]).toContain(underCard.instanceId);
    expect(play[0]!.args[1]).toMatchObject({ payCost: false });
  });

  it("[Main] branch A ignores a DP>4000 or non-[Xros Heart] under-card", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const big = makeInstance("BIG", 0 as Seat);
    const plain = makeInstance("PLAIN", 0 as Seat);
    const tamer = makePermanent({
      permanentId: "TAMER",
      cardId: "TAMER-DEF",
      controllerSeat: 0 as Seat,
      stack: [big, plain],
    });
    const defs = new Map<string, Partial<CardDefinition>>([
      ["TAMER-DEF", { kinds: ["Tamer"] as never }],
      ["BIG", digimonDef({ types: ["Xros Heart"] as never, dp: 5000 })],
      ["PLAIN", digimonDef({ types: [] as never, dp: 2000 })],
    ]);
    const ctx = makeContext({ recorder, source, battleArea: [tamer], defs, optionChoice: 0 });
    const [effect] = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effect!.resolve(ctx);
    expect(recorder.calls.filter((c) => c.verb === "playInstances")).toHaveLength(0);
  });

  it("[Main] branch B unsuspends 1 Shoutmon EX6 + 1 ShootingStarmon, then attacks with a Digimon", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const shoutmon = makePermanent({
      permanentId: "SHOUT",
      cardId: "SHOUT-DEF",
      controllerSeat: 0 as Seat,
      isSuspended: true,
    });
    const starmon = makePermanent({
      permanentId: "STAR",
      cardId: "STAR-DEF",
      controllerSeat: 0 as Seat,
      isSuspended: true,
    });
    const attacker = makePermanent({ permanentId: "ATK", cardId: "ATK-DEF", controllerSeat: 0 as Seat });
    const defs = new Map<string, Partial<CardDefinition>>([
      ["SHOUT-DEF", digimonDef({ nameEn: "Shoutmon EX6" })],
      ["STAR-DEF", digimonDef({ nameEn: "ShootingStarmon" })],
      ["ATK-DEF", digimonDef({ nameEn: "Some Attacker" })],
    ]);
    const ctx = makeContext({ recorder, source, battleArea: [shoutmon, starmon, attacker], defs, optionChoice: 1 });
    const [effect] = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effect!.resolve(ctx);

    const uns = recorder.calls.filter((c) => c.verb === "unsuspend");
    expect(uns).toHaveLength(1);
    expect(uns[0]!.args[0] as string[]).toEqual(expect.arrayContaining(["SHOUT", "STAR"]));
    const atk = recorder.calls.filter((c) => c.verb === "forceAttack");
    expect(atk).toHaveLength(1);
    // "1 of your Digimon" — any of the controller's Digimon (incl. the just-unsuspended ones).
    expect(["SHOUT", "STAR", "ATK"]).toContain(atk[0]!.args[0]);
  });

  it("[Main] branch B aborts when only one of the two required names is present (Q3159)", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const shoutmon = makePermanent({
      permanentId: "SHOUT",
      cardId: "SHOUT-DEF",
      controllerSeat: 0 as Seat,
      isSuspended: true,
    });
    const attacker = makePermanent({ permanentId: "ATK", cardId: "ATK-DEF", controllerSeat: 0 as Seat });
    const defs = new Map<string, Partial<CardDefinition>>([
      ["SHOUT-DEF", digimonDef({ nameEn: "Shoutmon EX6" })],
      ["ATK-DEF", digimonDef({ nameEn: "Some Attacker" })],
    ]);
    const ctx = makeContext({ recorder, source, battleArea: [shoutmon, attacker], defs, optionChoice: 1 });
    const [effect] = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effect!.resolve(ctx);

    expect(recorder.calls.filter((c) => c.verb === "unsuspend")).toHaveLength(0);
    expect(recorder.calls.filter((c) => c.verb === "forceAttack")).toHaveLength(0);
  });

  it("[Security] plays a [Xros Heart] Digimon from under a Tamer without cost", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const underCard = makeInstance("XROS", 0 as Seat);
    const tamer = makePermanent({
      permanentId: "TAMER",
      cardId: "TAMER-DEF",
      controllerSeat: 0 as Seat,
      stack: [underCard],
    });
    const defs = new Map<string, Partial<CardDefinition>>([
      ["TAMER-DEF", { kinds: ["Tamer"] as never }],
      ["XROS", digimonDef({ types: ["Xros Heart"] as never, dp: 3000 })],
    ]);
    const ctx = makeContext({ recorder, source, battleArea: [tamer], defs });
    const [effect] = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effect!.isSecurity).toBe(true);
    await effect!.resolve(ctx);
    expect(recorder.calls.filter((c) => c.verb === "playInstances")).toHaveLength(1);
>>>>>>> c9e6261c (Fix and verify BT19-095 card behavior)
  });
});
