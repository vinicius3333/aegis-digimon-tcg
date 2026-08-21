import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming, type CardInstance, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX4-030.js";

// A3 for EX4-030 (Kuzuhamon):
//   [Static] Treated as also having [Sakuyamon] in its name.
//   [When Digivolving] Use 1 Option card with cost ≤5 from hand without cost.
//   [Your Turn][Once Per Turn] whenOptionUsed (cost ≥2) → play 1 Taomon or Lv.4-or-lower
//     Blue/Yellow Digimon from digivolution stack without cost.
//
const OPTION_3_ID = "BT1-OPTION-3";
const OPTION_7_ID = "BT1-OPTION-7";
const TAOMON_ID = "EX4-028";
const LV4_YELLOW_ID = "BT3-LV4-YELLOW";
const _OTHER_DIGIMON_ID = "BT1-OTHER";

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function card(instanceId: string, cardId: string, seat: Seat = 0): CardInstance {
  return { instanceId, cardId, ownerSeat: seat, faceUp: true } as CardInstance;
}

function makeSource(stack: CardInstance[] = []): CardSource {
  return {
    instanceId: "self-inst",
    cardId: "EX4-030",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "EX4-030",
      set: "EX4",
      nameEn: "Kuzuhamon",
      kinds: ["Digimon"] as never,
      colors: ["Yellow"] as never,
      playCost: 12,
      dp: 11000,
      level: 6,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () =>
      ({
        permanentId: "SELF-PERM",
        controllerSeat: 0 as Seat,
        topCard: { instanceId: "self-inst", cardId: "EX4-030", ownerSeat: 0 as Seat, faceUp: true } as never,
        stack,
        linked: [] as never,
        baseDP: 11000,
        currentDP: 11000,
        isSuspended: false,
        inBreeding: false,
      }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeCtx(
  recorder: Recorder,
  source: CardSource,
  opts: {
    ownerHand?: CardInstance[];
    usedOptionCost?: number;
  } = {},
): EffectContext {
  const { ownerHand = [], usedOptionCost } = opts;

  const players = [
    {
      seat: 0 as Seat,
      battleArea: [],
      security: [],
      hand: ownerHand,
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
    state: { memory: 3, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (c: { cardId: string }) => {
      if (c.cardId === OPTION_3_ID) {
        return { cardId: c.cardId, kinds: ["Option"], nameEn: "Option3", playCost: 3 } as never;
      }
      if (c.cardId === OPTION_7_ID) {
        return { cardId: c.cardId, kinds: ["Option"], nameEn: "Option7", playCost: 7 } as never;
      }
      if (c.cardId === TAOMON_ID) {
        return {
          cardId: c.cardId,
          kinds: ["Digimon"],
          nameEn: "Taomon",
          level: 5,
          playCost: 7,
          colors: ["Yellow"],
        } as never;
      }
      if (c.cardId === LV4_YELLOW_ID) {
        return {
          cardId: c.cardId,
          kinds: ["Digimon"],
          nameEn: "SomeYellowLv4",
          level: 4,
          playCost: 4,
          colors: ["Yellow"],
        } as never;
      }
      return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "Other", level: 5, playCost: 5 } as never;
    },
  };

  const fx = {
    grantNameTrait: (...args: unknown[]) => {
      recorder.calls.push({ verb: "grantNameTrait", args });
    },
    useOptionFromHand: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "useOptionFromHand", args });
      return [];
    },
    playInstances: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "playInstances", args });
      return [];
    },
    subscribeSubTrigger: (...args: unknown[]) => {
      recorder.calls.push({ verb: "subscribeSubTrigger", args });
      return 0;
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source, trigger: { usedOptionCost }, game, fx, ask };
}

describe("EX4-030 Kuzuhamon", () => {
  const module = getEffectModule("EX4-030");

  it("is registered on import", () => {
    expect(module).toBeDefined();
  });

  it("produces 2 None effects (name grant + watcher install)", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(2);
  });

  it("produces 1 WhenDigivolving effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });

  it("[Static] grants Sakuyamon name trait while on battle area", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source);

    const effects = module!.effectsForTiming(EffectTiming.None, source);
    // The first effect is the name grant
    await effects[0]!.resolve(ctx);

    const nameCalls = recorder.calls.filter((c) => c.verb === "grantNameTrait");
    expect(nameCalls).toHaveLength(1);
    expect(nameCalls[0]!.args[1]).toBe("name");
    expect(nameCalls[0]!.args[2]).toContain("Sakuyamon");
    expect(nameCalls[0]!.args[3]).toBe(EffectDuration.UntilEachTurnEnd);
  });

  it("[Static] installs whenOptionUsed watcher via subscribeSubTrigger", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source);

    const effects = module!.effectsForTiming(EffectTiming.None, source);
    // The second effect installs the watcher
    await effects[1]!.resolve(ctx);

    const watcherCalls = recorder.calls.filter((c) => c.verb === "subscribeSubTrigger");
    expect(watcherCalls).toHaveLength(1);
    expect((watcherCalls[0]!.args[0] as { event: string }).event).toBe("whenOptionUsed");
  });

  it("[When Digivolving] uses Option ≤5 from hand without cost", async () => {
    const recorder: Recorder = { calls: [] };
    const optionCard = card("opt-3", OPTION_3_ID, 0);
    const source = makeSource();
    const ctx = makeCtx(recorder, source, { ownerHand: [optionCard] });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects[0]!.canActivate(ctx)).toBe(true);
    await effects[0]!.resolve(ctx);

    const useCalls = recorder.calls.filter((c) => c.verb === "useOptionFromHand");
    expect(useCalls).toHaveLength(1);
    // args[0] is the ctx passed through to useOptionFromHand; the instanceId is args[1].
    expect(useCalls[0]!.args[1]).toBe("opt-3");
  });

  it("[When Digivolving] canActivate is false when no eligible Option in hand", () => {
    const recorder: Recorder = { calls: [] };
    const expensiveOption = card("opt-7", OPTION_7_ID, 0); // cost 7, too expensive
    const source = makeSource();
    const ctx = makeCtx(recorder, source, { ownerHand: [expensiveOption] });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects[0]!.canActivate(ctx)).toBe(false);
  });

  it("[When Digivolving] canActivate is false when hand is empty", () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source, { ownerHand: [] });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects[0]!.canActivate(ctx)).toBe(false);
  });

  it("[whenOptionUsed watcher] plays Taomon from digivolution stack when option cost ≥2", async () => {
    const recorder: Recorder = { calls: [] };
    const taomonCard = card("taomon-1", TAOMON_ID, 0);
    const source = makeSource([taomonCard]);
    const ctx = makeCtx(recorder, source, { usedOptionCost: 3 });

    // Directly call the watcher's run function to verify behavior
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    await effects[1]!.resolve(ctx); // installs the watcher

    // The subscribeSubTrigger call captures the watcher; extract and invoke it
    const subTriggerCall = recorder.calls.find((c) => c.verb === "subscribeSubTrigger");
    const install = subTriggerCall!.args[0] as {
      run: (ctx: EffectContext) => Promise<void>;
      matches: (ctx: EffectContext) => boolean;
    };

    expect(install.matches(ctx)).toBe(true);
    await install.run(ctx);

    const playCalls = recorder.calls.filter((c) => c.verb === "playInstances");
    expect(playCalls).toHaveLength(1);
    expect((playCalls[0]!.args[0] as string[]).includes("taomon-1")).toBe(true);
    expect((playCalls[0]!.args[1] as { payCost: boolean }).payCost).toBe(false);
  });

  it("[whenOptionUsed watcher] matches returns false when option cost < 2", () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source, { usedOptionCost: 1 });

    const effects = module!.effectsForTiming(EffectTiming.None, source);
    effects[1]!.resolve(ctx); // installs the watcher (sync enough for the test)

    const subTriggerCall = recorder.calls.find((c) => c.verb === "subscribeSubTrigger");
    const install = subTriggerCall!.args[0] as { matches: (ctx: EffectContext) => boolean };
    expect(install.matches(ctx)).toBe(false);
  });
});
