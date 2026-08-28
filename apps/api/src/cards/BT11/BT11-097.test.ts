import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, getCardDefinition, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "../BT2/BT2-010.js";
import "./BT11-097.js";
import { compiled } from "./BT11-097.js";

// A3 for BT11-097 (Crimson Flare):
//   [Main] Delete 1 of your opponent's Digimon with 8000 DP or less.
//
// FAILS-WHEN-REVERTED: the declarative effect record handled the Delete clause but the
// generated "activate [On Deletion] effect" fallback was inert. The hand-written module's
// [Main] DELETE step is the observable: `deletePermanent` is called with the chosen
// permanent. Without this module, the timing guard for EffectTiming.OnPlay would
// yield zero effects (the IR registered under `OptionSkill` which doesn't exist).

function fakeDef(cardId: string, kind: CardKind = CardKind.Digimon): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: [kind],
    colors: ["Red"] as never,
    playCost: 4,
    dp: kind === CardKind.Digimon ? 4000 : 0,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

type FakePerm = {
  permanentId: string;
  controllerSeat: Seat;
  topCard: { cardId: string; instanceId: string; ownerSeat: Seat; faceUp: boolean };
  stack: never[];
  linked: never[];
  baseDP: number;
  currentDP: number;
  isSuspended: boolean;
  inBreeding: boolean;
};

function fakePerm(id: string, dp: number, seat: Seat): FakePerm {
  return {
    permanentId: id,
    controllerSeat: seat,
    topCard: { cardId: `card-${id}`, instanceId: `top-${id}`, ownerSeat: seat, faceUp: true },
    stack: [],
    linked: [],
    baseDP: dp,
    currentDP: dp,
    isSuspended: false,
    inBreeding: false,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "inst-097",
    cardId: "BT11-097",
    ownerSeat: 0 as Seat,
    definition: fakeDef("BT11-097", CardKind.Option),
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeCtx(opts: { deletedIds: string[]; oppBattleArea: FakePerm[] }): EffectContext {
  const { deletedIds, oppBattleArea } = opts;

  const players = [
    { battleArea: [] as FakePerm[], security: [], hand: [], deck: [], trash: [] },
    { battleArea: oppBattleArea, security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (card: { cardId: string }) => fakeDef(card.cardId),
  };

  const fx = {
    deletePermanent: async (ids: string[], _cause?: string) => {
      deletedIds.push(...ids);
      return ids.length;
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async (_ctx, _msg) => true,
    chooseTargets: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectPermanents: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectCards: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    chooseOption: async (_ctx, _choices) => 0,
  };

  return {
    source: makeSource(),
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map(),
  } as unknown as EffectContext;
}

describe("BT11-097 Crimson Flare [Main]", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-097")).toMatchObject({ cardId: "BT11-097", colors: ["Red"], kinds: ["Option"], playCost: 5 });
    const mainActions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions;
    expect(mainActions).toMatchObject([{ kind: "Delete" }, { kind: "ActivateEffect", effectType: "OnDeletion" }]);
    expect(mainActions?.[1]).not.toHaveProperty("optional");
    expect(compiled.effects).toMatchObject([{ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] }]);
  });

  it("activates a red Vaccine Digimon's On Deletion effect without deleting it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-085", as: "redTamer" },
            { card: "BT2-010", as: "biyomon" },
          ],
          hand: [{ card: "BT11-097", as: "crimsonFlare" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("crimsonFlare").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 6 &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    );

    expect(s.state.memory).toBe(6); // pay 5, then Biyomon's [On Deletion] gains 1
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("biyomon").permanentId,
    );
  });

  it("does not activate the On Deletion rider without a red Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-010", as: "biyomon" }],
          hand: [{ card: "BT11-097", as: "crimsonFlare" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("crimsonFlare").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(5);
    expect(
      s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("biyomon").permanentId),
    ).toBe(true);
  });

  it("calls deletePermanent on the chosen opponent Digimon with ≤8000 DP", async () => {
    const deletedIds: string[] = [];
    const oppDigimon = fakePerm("opp-a", 8000, 1 as Seat);
    const ctx = makeCtx({ deletedIds, oppBattleArea: [oppDigimon] });

    const mod = getEffectModule("BT11-097");
    expect(mod).toBeDefined();

    const effects = mod!.effectsForTiming(EffectTiming.OnUseOption, makeSource());
    expect(effects.length).toBeGreaterThan(0);

    for (const eff of effects) {
      if (eff.canTrigger?.(ctx) !== false) {
        await eff.resolve(ctx);
      }
    }

    // FAILS-WHEN-REVERTED: IR's Main action was Delete but under OptionSkill timing which
    // doesn't exist — yielding 0 effects at OnPlay. This assertion requires deletePermanent
    // to have been called.
    expect(deletedIds).toContain(oppDigimon.permanentId);
  });

  it("does NOT target opponent Digimon with > 8000 DP", async () => {
    const deletedIds: string[] = [];
    // 9000 DP — above the 8000 threshold
    const oppDigimon = fakePerm("opp-high", 9000, 1 as Seat);
    const ctx = makeCtx({ deletedIds, oppBattleArea: [oppDigimon] });

    const mod = getEffectModule("BT11-097");
    const effects = mod!.effectsForTiming(EffectTiming.OnPlay, makeSource());

    for (const eff of effects) {
      if (eff.canTrigger?.(ctx) !== false) {
        await eff.resolve(ctx);
      }
    }

    // 9000 DP Digimon is not a valid target; nothing should be deleted.
    expect(deletedIds).toHaveLength(0);
  });

  it("[Security] has effects at SecuritySkill timing", () => {
    const mod = getEffectModule("BT11-097");
    const effects = mod!.effectsForTiming(EffectTiming.SecuritySkill, makeSource());
    expect(effects.length).toBeGreaterThan(0);
    expect(effects[0]!.isSecurity).toBe(true);
  });
});
