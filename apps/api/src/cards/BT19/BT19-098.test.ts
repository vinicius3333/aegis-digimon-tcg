import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type Permanent, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT19-098.js";

// A3 for BT19-098 (King Device — Purple Option). Covers every hand-written clause:
//   [None] ignore-color waiver / [OnDestroyed] place [Device] from trash /
//   [Main] place [Device] from trash + place self / [Security] place from hand + add self to hand.
//

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT19-098",
    set: "BT19",
    nameEn: "King Device",
    kinds: ["Option"] as never,
    colors: ["Purple"] as never,
    playCost: 3,
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

const SELF_INSTANCE = "SELF-OPT";

function makeSource(): CardSource {
  return {
    instanceId: SELF_INSTANCE,
    cardId: "BT19-098",
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
  hand?: CardInstance[];
  trash?: CardInstance[];
  battleArea?: Permanent[];
  defs?: Map<string, Partial<CardDefinition>>;
  trigger?: EffectContext["trigger"];
}): EffectContext {
  const rec = opts.recorder;
  const defs = opts.defs ?? new Map();
  const game: GameAccess = {
    state: { memory: 0, players: [], turnSeat: 0 as Seat } as never,
    player: (seat: Seat) =>
      ({
        seat,
        battleArea: seat === 0 ? (opts.battleArea ?? []) : [],
        security: [],
        hand: seat === 0 ? (opts.hand ?? []) : [],
        deck: [],
        trash: seat === 0 ? (opts.trash ?? []) : [],
      }) as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (card: { cardId: string }) => fakeDefinition({ ...defs.get(card.cardId), cardId: card.cardId }),
  };
  const fx = {
    waiveColorRequirement: (...args: unknown[]) => rec.calls.push({ verb: "waiveColorRequirement", args }),
    placeOptionAsPermanent: async (...args: unknown[]) => {
      rec.calls.push({ verb: "placeOptionAsPermanent", args });
      return undefined;
    },
    returnToHand: async (...args: unknown[]) => {
      rec.calls.push({ verb: "returnToHand", args });
      return [];
    },
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  return { source: opts.source, trigger: opts.trigger ?? {}, game, fx, ask };
}

const deviceDef: Partial<CardDefinition> = { kinds: ["Option"] as never, types: ["Device"] as never, playCost: 2 };

describe("BT19-098 King Device", () => {
  const module = getEffectModule("BT19-098");

  it("is registered on import", () => {
    expect(module).toBeDefined();
  });

  it("[None] waives color requirement only while no [King Device] is in play", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, source });
    const [effect] = module!.effectsForTiming(EffectTiming.None, source);
    expect(effect!.canTrigger(ctx)).toBe(true);
    await effect!.resolve(ctx);
    expect(recorder.calls.filter((c) => c.verb === "waiveColorRequirement")).toHaveLength(1);

    const compiled = runtimeCompiledCard("BT19-098");
    expect(compiled?.effects[0]?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHaveNone", filter: { nameOrTrait: [{ tokens: ["King Device"], match: "name" }] } },
    });
  });

  it("uses the effect-trash watcher, not generic deletion", () => {
    const compiled = runtimeCompiledCard("BT19-098")!;
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedByEffect",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
        },
      ],
    });
  });

  it("returns a qualifying Device when King Device is effect-trashed from the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-088", as: "purpleSource" }],
          hand: [{ card: "BT19-098", as: "king" }],
          trash: ["BT19-095"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT19-098"));
    const king = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT19-098");
    expect(king).toBeDefined();
    await advance(s.engine).verb.deletePermanent([king!.permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT19-095"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT19-095")).toBe(true);
  });

  it("[Main] places 1 [Device] cost<=3 Option from trash, then places THIS card", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const dev = makeInstance("DEV2", 0 as Seat);
    const defs = new Map<string, Partial<CardDefinition>>([["DEV2", deviceDef]]);
    const ctx = makeContext({ recorder, source, trash: [dev], defs });
    const [effect] = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effect!.resolve(ctx);

    const place = recorder.calls.filter((c) => c.verb === "placeOptionAsPermanent");
    expect(place).toHaveLength(2);
    expect(place[0]!.args[0]).toBe(dev.instanceId); // device from trash first
    expect(place[1]!.args[0]).toBe(SELF_INSTANCE); // then this card
  });

  it("[Main] still places THIS card even with no Device in trash", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, source, trash: [] });
    const [effect] = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effect!.resolve(ctx);
    const place = recorder.calls.filter((c) => c.verb === "placeOptionAsPermanent");
    expect(place).toHaveLength(1);
    expect(place[0]!.args[0]).toBe(SELF_INSTANCE);
  });

  it("[Security] places a [Device] Option from hand, then adds this card to hand", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const dev = makeInstance("DEVH", 0 as Seat);
    const defs = new Map<string, Partial<CardDefinition>>([["DEVH", deviceDef]]);
    const ctx = makeContext({ recorder, source, hand: [dev], defs });
    const [effect] = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effect!.isSecurity).toBe(true);
    await effect!.resolve(ctx);

    const place = recorder.calls.filter((c) => c.verb === "placeOptionAsPermanent");
    expect(place).toHaveLength(1);
    expect(place[0]!.args[0]).toBe(dev.instanceId);
    const ret = recorder.calls.filter((c) => c.verb === "returnToHand");
    expect(ret).toHaveLength(1);
    expect(ret[0]!.args[0] as string[]).toContain(SELF_INSTANCE);

    const compiled = runtimeCompiledCard("BT19-098");
    expect(compiled?.effects.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({
      target: { optional: true },
    });
  });
});
