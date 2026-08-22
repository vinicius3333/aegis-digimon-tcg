import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming, type CardInstance, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX4-030.js";

const module = getEffectModule("EX4-030")!;

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
  it("registers full residual-free IR", () => {
    expect(getEffectModule("EX4-030")).toBeDefined();
    expect(runtimeCompiledCard("EX4-030")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("uses one optional hand Option costing 5 or less when digivolving", () => {
    const effect = runtimeCompiledCard("EX4-030")?.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      filter: { kind: ["Option"], playCostLte: 5 },
      payCost: false,
      from: ["hand"],
      optional: true,
    });
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
    expect(nameCalls[0]!.args[3]).toBe(EffectDuration.Permanent);
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

  it("[When Digivolving] limits the optional use to Options costing 5 or less", () => {
    expect(runtimeCompiledCard("EX4-030")?.effects?.find((effect) => effect.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      filter: { kind: ["Option"], playCostLte: 5 },
      optional: true,
    });
  });

  it("[When Digivolving] remains optional when no eligible Option is available", () => {
    expect(runtimeCompiledCard("EX4-030")?.effects?.find((effect) => effect.trigger === "WhenDigivolving")?.actions?.[0]?.optional).toBe(true);
  });

  it("[whenOptionUsed watcher] only fires for Option costs of 2 or more", () => {
    expect(runtimeCompiledCard("EX4-030")?.effects?.find((effect) => effect.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOptionUsed",
      fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
    });
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
