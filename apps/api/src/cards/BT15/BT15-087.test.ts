import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import "./BT15-087.js";

/**
 * A3 for BT15-087 (Shuu Yulin) — Red/Blue Tamer.
 *
 * Clauses under test:
 *   [Security]          → EffectTiming.SecuritySkill (1 effect)
 *   [Start of Your Turn]→ EffectTiming.OnStartTurn (1 effect)
 *   [Main] MindLink     → EffectTiming.OnDeclaration (1 effect)
 *   [All Turns] inh.    → EffectTiming.None / isInherited (1 effect, grantKeyword TeamWork+Reboot)
 *   [End of All Turns] inh. → EffectTiming.OnEndTurn / isInherited (1 effect, play Shuu Yulin)
 *
 */

interface Call {
  verb: string;
  args: unknown[];
}

const CARD_ID = "BT15-087";

function makeSource(permanentId = "PERM#shuu"): CardSource {
  return {
    instanceId: `INST#${CARD_ID}`,
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: {
      cardId: CARD_ID,
      set: "BT15",
      nameEn: "Shuu Yulin",
      kinds: ["Tamer"],
      colors: ["Red", "Blue"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
    } as never,
    permanent: () =>
      ({
        permanentId,
        controllerSeat: 0 as Seat,
        topCard: { instanceId: `INST#${CARD_ID}`, cardId: CARD_ID, ownerSeat: 0 as Seat },
        isSuspended: false,
        stack: [],
      }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeContext(
  recorder: { calls: Call[] },
  source: CardSource,
  overrides?: Partial<{
    memory: number;
    isOnBattleArea: boolean;
    isOwnersTurn: boolean;
  }>,
) {
  const fx = new Proxy({} as Primitives, {
    get:
      (_, verb: string) =>
      (...args: unknown[]) => {
        recorder.calls.push({ verb, args });
        if (verb === "playInstances") return Promise.resolve([]);
        if (verb === "trash") return Promise.resolve([]);
        if (verb === "deletePermanent") return Promise.resolve(0);
        if (verb === "draw") return Promise.resolve([]);
      },
  });

  const state = { memory: overrides?.memory ?? 0 };
  const src: CardSource = {
    ...source,
    isOnBattleArea: () => overrides?.isOnBattleArea ?? source.isOnBattleArea(),
    isOwnersTurn: () => overrides?.isOwnersTurn ?? source.isOwnersTurn(),
  };

  return {
    source: src,
    trigger: {},
    game: {
      state,
      player: () => ({ battleArea: [], hand: [] }) as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      permanentById: () => undefined,
      definitionOf: () => ({ kinds: ["Digimon"], nameEn: "", types: [], forms: [], attributes: [] }) as never,
      linkMax: () => 1,
      linkCostReduction: () => 0,
    } as never,
    fx,
    ask: {
      optional: async () => true,
      chooseTargets: async (_ctx: unknown, opts: { candidates: string[]; max: number }) =>
        opts.candidates.slice(0, opts.max),
      selectCards: async (_ctx: unknown, opts: { candidates: string[]; max: number }) =>
        opts.candidates.slice(0, opts.max),
      chooseOption: async () => 0,
    } as never,
  };
}

describe("BT15-087 Shuu Yulin — full effect structure + keyword grant behavior", () => {
  const module = getEffectModule(CARD_ID);

  it("is registered", () => {
    expect(module, `${CARD_ID} must self-register on import`).toBeDefined();
  });

  it("returns exactly 1 effect at SecuritySkill", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("returns exactly 1 effect at OnStartTurn", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(1);
  });

  it("returns exactly 1 effect at OnDeclaration (MindLink)", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnDeclaration, source)).toHaveLength(1);
  });

  it("returns exactly 1 effect at None (inherited TeamWork+Reboot)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.isInherited).toBe(true);
  });

  it("returns exactly 1 effect at OnEndTurn (inherited play Shuu Yulin)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnEndTurn, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.isInherited).toBe(true);
  });

  it("returns no effects at other timings", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)).toHaveLength(0);
  });

  it("None inherited effect grants TeamWork to host when host has X Antibody trait", async () => {
    const source = makeSource("PERM#host");
    const recorder: { calls: Call[] } = { calls: [] };

    // The host Digimon has X Antibody trait.
    const hostPermId = "PERM#host";
    const hostPerm = {
      permanentId: hostPermId,
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "INST#digimon", cardId: "BT1-001", ownerSeat: 0 as Seat },
      isSuspended: false,
      stack: [],
    };

    const sourceWithHost: CardSource = {
      ...source,
      permanent: () => hostPerm as never,
    };

    const fx = new Proxy({} as Primitives, {
      get:
        (_, verb: string) =>
        (...args: unknown[]) => {
          recorder.calls.push({ verb, args });
        },
    });

    const ctx = {
      source: sourceWithHost,
      trigger: {},
      game: {
        state: { memory: 3 },
        player: () => ({ battleArea: [hostPerm] }) as never,
        opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
        permanentById: (id: string) => (id === hostPermId ? hostPerm : undefined),
        // Card definition for the host has X Antibody in its types.
        definitionOf: () =>
          ({
            kinds: ["Digimon"],
            nameEn: "WarGreymon X",
            types: ["X Antibody"],
            forms: [],
            attributes: [],
          }) as never,
        linkMax: () => 1,
        linkCostReduction: () => 0,
      } as never,
      fx,
      ask: {} as never,
    };

    const effects = module!.effectsForTiming(EffectTiming.None, sourceWithHost);
    expect(effects).toHaveLength(1);
    await effects[0]!.resolve(ctx as never);

    const teamworkCall = recorder.calls.find((c) => c.verb === "grantKeyword" && c.args[1] === "TeamWork");
    expect(teamworkCall, "grantKeyword(TeamWork) must be called for X Antibody host").toBeDefined();
    expect(teamworkCall!.args[0]).toBe(hostPermId);
    expect(teamworkCall!.args[2]).toBe(EffectDuration.UntilEachTurnEnd);
  });

  it("None inherited effect grants Reboot to host when host has DigiPolice trait", async () => {
    const source = makeSource("PERM#host2");
    const recorder: { calls: Call[] } = { calls: [] };

    const hostPermId = "PERM#host2";
    const hostPerm = {
      permanentId: hostPermId,
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "INST#dp", cardId: "BT1-002", ownerSeat: 0 as Seat },
      isSuspended: false,
      stack: [],
    };

    const sourceWithHost: CardSource = {
      ...source,
      permanent: () => hostPerm as never,
    };

    const fx = new Proxy({} as Primitives, {
      get:
        (_, verb: string) =>
        (...args: unknown[]) => {
          recorder.calls.push({ verb, args });
        },
    });

    const ctx = {
      source: sourceWithHost,
      trigger: {},
      game: {
        state: { memory: 3 },
        player: () => ({ battleArea: [hostPerm] }) as never,
        opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
        permanentById: (id: string) => (id === hostPermId ? hostPerm : undefined),
        definitionOf: () =>
          ({
            kinds: ["Digimon"],
            nameEn: "ShineGreymon",
            types: ["DigiPolice"],
            forms: [],
            attributes: [],
          }) as never,
        linkMax: () => 1,
        linkCostReduction: () => 0,
      } as never,
      fx,
      ask: {} as never,
    };

    const effects = module!.effectsForTiming(EffectTiming.None, sourceWithHost);
    await effects[0]!.resolve(ctx as never);

    const rebootCall = recorder.calls.find((c) => c.verb === "grantKeyword" && c.args[1] === "Reboot");
    expect(rebootCall, "grantKeyword(Reboot) must be called for DigiPolice host").toBeDefined();
    expect(rebootCall!.args[0]).toBe(hostPermId);
    expect(rebootCall!.args[2]).toBe(EffectDuration.UntilEachTurnEnd);
  });

  it("None inherited effect does NOT grant keywords when host lacks X Antibody and DigiPolice", async () => {
    const source = makeSource("PERM#plain");
    const recorder: { calls: Call[] } = { calls: [] };

    const hostPerm = {
      permanentId: "PERM#plain",
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "INST#plain", cardId: "BT1-003", ownerSeat: 0 as Seat },
      isSuspended: false,
      stack: [],
    };

    const sourceWithHost: CardSource = {
      ...source,
      permanent: () => hostPerm as never,
    };

    const fx = new Proxy({} as Primitives, {
      get:
        (_, verb: string) =>
        (...args: unknown[]) => {
          recorder.calls.push({ verb, args });
        },
    });

    const ctx = {
      source: sourceWithHost,
      trigger: {},
      game: {
        state: {},
        permanentById: () => hostPerm,
        definitionOf: () =>
          ({
            kinds: ["Digimon"],
            nameEn: "Agumon",
            types: ["Dinosaur"],
            forms: [],
            attributes: [],
          }) as never,
        linkMax: () => 1,
        linkCostReduction: () => 0,
      } as never,
      fx,
      ask: {} as never,
    };

    const effects = module!.effectsForTiming(EffectTiming.None, sourceWithHost);
    await effects[0]!.resolve(ctx as never);

    const kwCalls = recorder.calls.filter((c) => c.verb === "grantKeyword");
    expect(kwCalls).toHaveLength(0);
  });

  it("[Start of Your Turn] calls setMemory(3) when memory <= 2", async () => {
    const source = makeSource();
    const recorder: { calls: Call[] } = { calls: [] };
    const ctx = makeContext(recorder, source, { memory: 1 });

    const effects = module!.effectsForTiming(EffectTiming.OnStartTurn, source);
    expect(effects).toHaveLength(1);
    await effects[0]!.resolve(ctx as never);

    const setMemCall = recorder.calls.find((c) => c.verb === "setMemory");
    expect(setMemCall, "setMemory must be called when memory <= 2").toBeDefined();
    expect(setMemCall!.args[0]).toBe(3);
  });

  it("[Start of Your Turn] does NOT call setMemory when memory > 2", async () => {
    const source = makeSource();
    const recorder: { calls: Call[] } = { calls: [] };
    const ctx = makeContext(recorder, source, { memory: 5 });

    const effects = module!.effectsForTiming(EffectTiming.OnStartTurn, source);
    await effects[0]!.resolve(ctx as never);

    const setMemCall = recorder.calls.find((c) => c.verb === "setMemory");
    expect(setMemCall, "setMemory must NOT be called when memory > 2").toBeUndefined();
  });

  it("[End of All Turns] inherited calls playInstances for a Shuu Yulin in stack", async () => {
    const recorder: { calls: Call[] } = { calls: [] };

    const shuuInstanceId = "INST#shuu-in-stack";
    const host = {
      permanentId: "PERM#host3",
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "INST#warg", cardId: "BT1-010", ownerSeat: 0 as Seat },
      isSuspended: false,
      stack: [{ instanceId: shuuInstanceId, cardId: "BT15-087", ownerSeat: 0 as Seat, faceUp: true }],
    };

    const source: CardSource = {
      instanceId: "INST#shuu-stack-card",
      cardId: CARD_ID,
      ownerSeat: 0 as Seat,
      definition: { cardId: CARD_ID, nameEn: "Shuu Yulin", kinds: ["Tamer"] } as never,
      permanent: () => host as never,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    };

    const fx = new Proxy({} as Primitives, {
      get:
        (_, verb: string) =>
        (...args: unknown[]) => {
          recorder.calls.push({ verb, args });
          if (verb === "playInstances") return Promise.resolve([]);
        },
    });

    const ctx = {
      source,
      trigger: {},
      game: {
        state: {},
        player: () => ({}) as never,
        opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
        definitionOf: (c: { cardId: string }) => {
          if (c.cardId === "BT15-087") {
            return { kinds: ["Tamer"], nameEn: "Shuu Yulin" } as never;
          }
          return { kinds: ["Digimon"], nameEn: "WarGreymon" } as never;
        },
        linkMax: () => 1,
        linkCostReduction: () => 0,
      } as never,
      fx,
      ask: {
        optional: async () => true,
        selectCards: async (_ctx: unknown, opts: { candidates: string[]; max: number }) =>
          opts.candidates.slice(0, opts.max),
      } as never,
    };

    const effects = module!.effectsForTiming(EffectTiming.OnEndTurn, source);
    expect(effects[0]!.isInherited).toBe(true);
    await effects[0]!.resolve(ctx as never);

    const playCall = recorder.calls.find((c) => c.verb === "playInstances");
    expect(playCall, "playInstances must be called for Shuu Yulin in stack").toBeDefined();
    const instanceIds = playCall!.args[0] as string[];
    expect(instanceIds).toContain(shuuInstanceId);
  });

  it("[End of All Turns] inherited does NOT call playInstances when no Shuu Yulin in stack", async () => {
    const recorder: { calls: Call[] } = { calls: [] };

    const host = {
      permanentId: "PERM#host4",
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "INST#warg2", cardId: "BT1-010", ownerSeat: 0 as Seat },
      isSuspended: false,
      stack: [],
    };

    const source: CardSource = {
      instanceId: "INST#shuu2",
      cardId: CARD_ID,
      ownerSeat: 0 as Seat,
      definition: { cardId: CARD_ID, nameEn: "Shuu Yulin", kinds: ["Tamer"] } as never,
      permanent: () => host as never,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    };

    const fx = new Proxy({} as Primitives, {
      get:
        (_, verb: string) =>
        (...args: unknown[]) => {
          recorder.calls.push({ verb, args });
        },
    });

    const ctx = {
      source,
      trigger: {},
      game: {
        state: {},
        definitionOf: () => ({ kinds: ["Digimon"], nameEn: "Agumon" }) as never,
        linkMax: () => 1,
        linkCostReduction: () => 0,
      } as never,
      fx,
      ask: {
        optional: async () => true,
        selectCards: async (_ctx: unknown, opts: { candidates: string[]; max: number }) =>
          opts.candidates.slice(0, opts.max),
      } as never,
    };

    const effects = module!.effectsForTiming(EffectTiming.OnEndTurn, source);
    await effects[0]!.resolve(ctx as never);

    const playCall = recorder.calls.find((c) => c.verb === "playInstances");
    expect(playCall, "playInstances must NOT be called when no Shuu Yulin in stack").toBeUndefined();
  });
});
