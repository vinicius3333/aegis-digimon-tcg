import {
  EffectDuration,
  EffectTiming,
  getCardDefinition,
  getCompiledCard,
  type CardDefinition,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT2-097.js";

// A3 for BT2-097 (Lightning Paw — Yellow Option):
//   [Main] 3 of your opponent's level 3 Digimon get -4000 DP for the turn. (errata 2021-05-14)
//   [Security] Activate this card's [Main] effect.
//
// FAILS-WHEN-REVERTED: the inert legacy IR fallback produces no executable effect, so no modifyDP
// call is recorded for either timing. The hand-written module selects up to 3 opponent level-3
// Digimon and applies -4000 DP (UntilEachTurnEnd) to each, from both [Main] and [Security].

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT2-097",
    set: "BT2",
    nameEn: "Lightning Paw",
    kinds: ["Option"] as never,
    colors: ["Yellow"] as never,
    playCost: 4,
    dp: 0,
    level: undefined,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

type OppDigimon = { permanentId: string; level: number | undefined; isDigimon?: boolean };

function makeOpponentPermanent(d: OppDigimon): Permanent {
  return {
    permanentId: d.permanentId,
    controllerSeat: 1 as Seat,
    topCard: {
      instanceId: `${d.permanentId}-top`,
      cardId: `def-${d.permanentId}`,
      ownerSeat: 1 as Seat,
      faceUp: true,
    } as never,
    stack: [] as never,
    linked: [] as never,
    baseDP: 4000,
    currentDP: 4000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(): CardSource {
  return {
    instanceId: "opt-self",
    cardId: "BT2-097",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } as unknown as CardSource;
}

function makeContext(opts: { recorder: Recorder; source: CardSource; opponentDigimon: OppDigimon[] }): EffectContext {
  const rec = opts.recorder;
  const perms = opts.opponentDigimon.map(makeOpponentPermanent);
  const defByCardId = new Map<string, OppDigimon>();
  for (const d of opts.opponentDigimon) defByCardId.set(`def-${d.permanentId}`, d);

  const game: GameAccess = {
    state: { memory: 0, players: [], turnSeat: 0 as Seat } as never,
    player: (seat: Seat) =>
      ({
        seat,
        battleArea: seat === 1 ? perms : [],
        security: [],
        hand: [],
        deck: [],
        trash: [],
      }) as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => perms.find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => {
      const d = defByCardId.get(card.cardId);
      const kinds = (d?.isDigimon ?? true) ? (["Digimon"] as never) : (["Tamer"] as never);
      return fakeDefinition({ cardId: card.cardId, kinds, level: d?.level });
    },
  };

  const fx = {
    modifyDP: (...args: unknown[]) => {
      rec.calls.push({ verb: "modifyDP", args });
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source: opts.source, trigger: {}, game, fx, ask };
}

describe("BT2-097 Lightning Paw", () => {
  it("matches its official errata identity through a direct module import", () => {
    expect(module.cardId).toBe("BT2-097");
    expect(getCardDefinition("BT2-097")).toMatchObject({
      nameEn: "Lightning Paw",
      colors: ["Yellow"],
      playCost: 3,
      imageId: "BT2-097-Errata",
      effectText: expect.stringContaining("3 of your opponent’s level 3 Digimon"),
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
  });

  it("publishes the typed 3-target DP reduction with full coverage", () => {
    expect(getCompiledCard("BT2-097")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 3 },
              amount: -4000,
            },
          ],
        },
        { trigger: "Security", actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("is registered on import", () => {
    expect(module.cardId).toBe("BT2-097");
  });

  it("produces an OnUseOption [Main] effect and a SecuritySkill effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it("[Main] gives -4000 DP to up to 3 opponent level-3 Digimon (caps at 3 when more exist)", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      source,
      opponentDigimon: [
        { permanentId: "L3-A", level: 3 },
        { permanentId: "L3-B", level: 3 },
        { permanentId: "L3-C", level: 3 },
        { permanentId: "L3-D", level: 3 },
      ],
    });

    const [effect] = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(effect!.canActivate(ctx)).toBe(true);
    await effect!.resolve(ctx);

    const dpCalls = recorder.calls.filter((c) => c.verb === "modifyDP");
    expect(dpCalls).toHaveLength(3);
    for (const c of dpCalls) {
      expect(c.args[1]).toBe(-4000);
      expect(c.args[2]).toBe(EffectDuration.UntilEachTurnEnd);
    }
  });

  it("[Main] only targets level-3 Digimon (ignores other levels and non-Digimon)", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      source,
      opponentDigimon: [
        { permanentId: "L3-A", level: 3 },
        { permanentId: "L4-B", level: 4 },
        { permanentId: "Tamer-C", level: 3, isDigimon: false },
      ],
    });

    const [effect] = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effect!.resolve(ctx);

    const dpCalls = recorder.calls.filter((c) => c.verb === "modifyDP");
    expect(dpCalls).toHaveLength(1);
    expect(dpCalls[0]!.args[0]).toBe("L3-A");
  });

  it("[Main] canActivate is false with no eligible targets", () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      source,
      opponentDigimon: [{ permanentId: "L5-A", level: 5 }],
    });
    const [effect] = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(effect!.canActivate(ctx)).toBe(false);
  });

  it("[Security] activates the same [Main] effect (-4000 DP to opponent level-3 Digimon)", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      source,
      opponentDigimon: [
        { permanentId: "L3-A", level: 3 },
        { permanentId: "L3-B", level: 3 },
      ],
    });

    const [effect] = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effect!.isSecurity).toBe(true);
    await effect!.resolve(ctx);

    const dpCalls = recorder.calls.filter((c) => c.verb === "modifyDP");
    expect(dpCalls).toHaveLength(2);
    expect(dpCalls.every((c) => c.args[1] === -4000)).toBe(true);
  });

  it("uses the public Option flow and affects exactly 3 legal level-3 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-048", as: "yellowSource" }],
          hand: [{ card: "BT2-097", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 4000 },
            { card: "BT1-009", as: "second", dp: 4000 },
            { card: "BT1-009", as: "third", dp: 4000 },
            { card: "BT1-009", as: "fourth", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.trash.filter(({ cardId }) => cardId === "BT1-009")).toHaveLength(3);
  });
});
