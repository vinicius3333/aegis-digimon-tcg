import { describe, it, expect } from "vitest";
import { EffectTiming, type CardInstance, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
} from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { wouldDigivolveSelfReducersFor } from "../../engine/effects/interpreter/registration/reducers.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-112.js";

// A3 for BT8-112 (Imperialdramon: Paladin Mode):
//   [BeforePayCost] Optional: return 1 white Lv7 from trash to deck bottom → evo cost -4.
//   [When Digivolving] / [When Attacking] shared body:
//     Optional return 1 2-color divicard → trash ALL divi cards of 1 opp Digimon.
//     Then return ALL no-stack opponent Digimon to deck bottom.
//
// FAILS-WHEN-REVERTED: declarative effect has no BeforePayCost path, no
// trashDigivolutionCards, no multi-target returnToDeck.

const SELF_INST = "self-inst";
const SELF_PERM = "imp-perm";
const WHITE_LV7_CARD_ID = "BT8-WHITE-LV7";
const TWO_COLOR_CARD_ID = "BT8-TWO-COLOR";
const MONO_CARD_ID = "BT8-MONO";
const OPP_WITH_STACK_PERM = "opp-stack-perm";
const OPP_NO_STACK_PERM = "opp-no-stack-perm";

function card(instanceId: string, cardId: string, seat: Seat = 0): CardInstance {
  return { instanceId, cardId, ownerSeat: seat, faceUp: true } as CardInstance;
}

function makeSource(isOnField = true): CardSource {
  return {
    instanceId: SELF_INST,
    cardId: "BT8-112",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "BT8-112",
      set: "BT8",
      nameEn: "Imperialdramon Paladin Mode",
      kinds: ["Digimon"] as never,
      colors: ["White"] as never,
      playCost: 14,
      dp: 18000,
      level: 7,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () =>
      ({
        permanentId: SELF_PERM,
        controllerSeat: 0 as Seat,
        topCard: { instanceId: SELF_INST, cardId: "BT8-112", ownerSeat: 0 as Seat, faceUp: true } as never,
        stack: [card("divi-two-color", TWO_COLOR_CARD_ID, 0)] as CardInstance[],
        isSuspended: false,
        baseDP: 18000,
        currentDP: 18000,
      }) as never,
    isOnBattleArea: () => isOnField,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeCtx(
  source: CardSource,
  opts: {
    ownerTrash?: CardInstance[];
    diviStack?: CardInstance[];
    oppBattleArea?: { permanentId: string; stack: CardInstance[]; topCard: CardInstance }[];
    returnToDeckResult?: CardInstance[];
    trashDigivolutionCardsResult?: void;
    changeEvoCostCalled?: boolean;
  } = {},
): { ctx: EffectContext; recorder: { calls: { verb: string; args: unknown[] }[] } } {
  const {
    ownerTrash = [card("white-lv7-trash", WHITE_LV7_CARD_ID, 0)],
    diviStack = [card("divi-two-color", TWO_COLOR_CARD_ID, 0)],
    oppBattleArea = [
      {
        permanentId: OPP_WITH_STACK_PERM,
        topCard: card("opp-top-1", "OPP-DIGIMON", 1),
        stack: [card("opp-divi-1", MONO_CARD_ID, 1)],
      },
      {
        permanentId: OPP_NO_STACK_PERM,
        topCard: card("opp-top-2", "OPP-DIGIMON", 1),
        stack: [],
      },
    ],
  } = opts;

  const recorder: { calls: { verb: string; args: unknown[] }[] } = { calls: [] };

  const players = [
    {
      seat: 0 as Seat,
      hand: [],
      security: [],
      battleArea: [
        {
          permanentId: SELF_PERM,
          topCard: card(SELF_INST, "BT8-112", 0),
          isSuspended: false,
          stack: diviStack,
          baseDP: 18000,
          currentDP: 18000,
        },
      ],
      deck: [],
      trash: ownerTrash,
    },
    {
      seat: 1 as Seat,
      hand: [],
      security: [],
      battleArea: oppBattleArea,
      deck: [],
      trash: [],
    },
  ];

  const game: GameAccess = {
    state: { memory: 3, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => {
      for (const player of players) {
        const perm = player.battleArea.find((p: { permanentId: string }) => p.permanentId === id);
        if (perm !== undefined) return perm as never;
      }
      return undefined;
    },
    definitionOf: (c: { cardId: string }) => {
      if (c.cardId === WHITE_LV7_CARD_ID) {
        return {
          cardId: c.cardId,
          kinds: ["Digimon"],
          nameEn: "WhiteLv7",
          level: 7,
          playCost: 12,
          colors: ["White"],
        } as never;
      }
      if (c.cardId === TWO_COLOR_CARD_ID) {
        return {
          cardId: c.cardId,
          kinds: ["Digimon"],
          nameEn: "TwoColor",
          level: 5,
          playCost: 8,
          colors: ["White", "Blue"],
        } as never;
      }
      return {
        cardId: c.cardId,
        kinds: ["Digimon"],
        nameEn: "Test",
        level: 5,
        playCost: 7,
        colors: ["White"],
      } as never;
    },
  };

  const fx: Partial<Primitives> = {
    subscribeReplacement: (replacement) => {
      recorder.calls.push({ verb: "subscribeReplacement", args: [replacement] });
    },
    redirectDigivolutionTrashHosts: async (ids) => ids,
    returnToDeck: async (...args) => {
      recorder.calls.push({ verb: "returnToDeck", args });
      // Return the moved instance ids as CardInstance stubs so callers see a non-empty result
      const instanceIds = args[0] as string[];
      return instanceIds.map((id) => card(id, "MOVED", 0));
    },
    trashDigivolutionCards: async (...args) => {
      recorder.calls.push({ verb: "trashDigivolutionCards", args });
      return [];
    },
    changeEvoCost: (...args) => {
      recorder.calls.push({ verb: "changeEvoCost", args });
    },
  };

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  const ctx: EffectContext = {
    source,
    trigger: {},
    game,
    fx: fx as Primitives,
    ask,
  };

  return { ctx, recorder };
}

describe("BT8-112 Imperialdramon: Paladin Mode", () => {
  const module = getEffectModule("BT8-112");

  it("uses one cancellable card selection for its single optional cost reduction", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-032", as: "base" }],
        hand: [{ card: "BT8-112", as: "paladinMode" }],
        trash: [{ card: "BT5-112", as: "whiteLevelSeven" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("paladinMode").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);

    const optional = s.decisions.at(-1)!.req;
    expect(optional.kind).toBe("optional");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: optional.decisionId,
      response: { kind: "optional", accept: true },
    })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));

    const reduction = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    expect(reduction.kind).toBe("selectCards");
    expect(reduction.sourceCardId).toBe("BT8-112");
    expect(reduction.options?.min).toBe(0);
    expect(reduction.options?.max).toBe(1);
    expect(reduction.options?.candidateInstanceIds).toEqual([
      s.inst("whiteLevelSeven").instanceId,
    ]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);

    const whiteLevelSevenId = s.inst("whiteLevelSeven").instanceId;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: reduction.decisionId,
      response: { kind: "selectCards", instanceIds: [whiteLevelSevenId] },
    })).toEqual({ ok: true });
    await settle(() =>
      s.decisions.some(({ req }) =>
        req.decisionId !== reduction.decisionId && req.kind === "selectCards"
      )
    );

    const sourceReturn = s.decisions.find(({ req }) =>
      req.decisionId !== reduction.decisionId && req.kind === "selectCards"
    )!.req;
    expect(sourceReturn.kind).toBe("selectCards");
    expect(sourceReturn.sourceCardId).toBe("BT8-112");
    expect(sourceReturn.options?.candidateInstanceIds).toEqual([
      s.perm("base").stack[0]!.instanceId,
    ]);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: sourceReturn.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-112" && s.state.memory === 0);

    expect(s.state.players[0]!.deck.some((card) => card.instanceId === whiteLevelSevenId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
  });

  it("is registered on import", () => {
    expect(module, "BT8-112 must self-register").toBeDefined();
  });

  it("produces a BeforePayCost effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.BeforePayCost, source)).toHaveLength(1);
  });

  it("produces a WhenDigivolving effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });

  it("produces an own-attack (WhenAttacking) effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnUseAttack, source)).toHaveLength(1);
  });

  it("[BeforePayCost] installs a -4 reduction when a white Lv7 Digimon is in trash", async () => {
    // FAILS-WHEN-REVERTED: IR has no BeforePayCost path
    const source = makeSource();
    const { ctx, recorder } = makeCtx(source, {
      ownerTrash: [card("white-lv7-tr", WHITE_LV7_CARD_ID, 0)],
    });
    const effects = module!.effectsForTiming(EffectTiming.BeforePayCost, source);
    await effects[0]!.resolve(ctx);

    const reductions = recorder.calls.filter((c) => c.verb === "subscribeReplacement");
    expect(reductions).toHaveLength(1);
    expect((reductions[0]!.args[0] as { amount: number }).amount).toBe(4);
  });

  it("[BeforePayCost] is collected as a self reducer for the BT8-112 card", () => {
    const reducers = wouldDigivolveSelfReducersFor("BT8-112");
    expect(reducers).toHaveLength(1);
    expect(reducers[0]).toMatchObject({ amount: 4, cost: { kind: "return" } });
  });

  it("[BeforePayCost] does NOT call changeEvoCost when trash has no white Lv7", async () => {
    const source = makeSource();
    const { ctx, recorder } = makeCtx(source, {
      ownerTrash: [],
    });
    const effects = module!.effectsForTiming(EffectTiming.BeforePayCost, source);
    await effects[0]!.resolve(ctx);

    const reductions = recorder.calls.filter((c) => c.verb === "subscribeReplacement");
    expect(reductions).toHaveLength(1);
  });

  it("[When Digivolving] calls trashDigivolutionCards on opponent's Digimon with stack", async () => {
    // FAILS-WHEN-REVERTED: IR has no trashDigivolutionCards call
    const source = makeSource();
    const { ctx, recorder } = makeCtx(source, {
      diviStack: [card("divi-tc", TWO_COLOR_CARD_ID, 0)],
    });
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    const trashDiviCalls = recorder.calls.filter((c) => c.verb === "trashDigivolutionCards");
    expect(trashDiviCalls).toHaveLength(1);
    expect(trashDiviCalls[0]!.args[0]).toBe(OPP_WITH_STACK_PERM);
  });

  it("[When Digivolving] returns opponent's no-stack Digimon to deck via returnToDeck", async () => {
    // FAILS-WHEN-REVERTED: IR has no returnToDeck for no-stack permanents
    const source = makeSource();
    const { ctx, recorder } = makeCtx(source, {
      diviStack: [card("divi-tc2", TWO_COLOR_CARD_ID, 0)],
    });
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    // returnToDeck called for:
    // 1. The 2-color divicard (optional return from self's stack)
    // 2. The no-stack opponent Digimon
    const returnCalls = recorder.calls.filter((c) => c.verb === "returnToDeck");
    expect(returnCalls.length).toBeGreaterThanOrEqual(1);
    // At least one returnToDeck for the no-stack opponent
    const allReturnedIds = returnCalls.flatMap((c) => c.args[0] as string[]);
    // The no-stack opponent's topCard instanceId
    expect(allReturnedIds.some((id) => id === "opp-top-2")).toBe(true);
  });

  it("[When Attacking] also calls trashDigivolutionCards (same body as WD)", async () => {
    // FAILS-WHEN-REVERTED: IR WhenAttacking path missing this call
    const source = makeSource();
    const { ctx, recorder } = makeCtx(source, {
      diviStack: [card("divi-tc3", TWO_COLOR_CARD_ID, 0)],
    });
    const effects = module!.effectsForTiming(EffectTiming.OnUseAttack, source);
    await effects[0]!.resolve(ctx);

    const trashDiviCalls = recorder.calls.filter((c) => c.verb === "trashDigivolutionCards");
    expect(trashDiviCalls).toHaveLength(1);
  });

  it("finishes the ST9 DNA line by recycling Zwart Defeat and clearing stacked Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT8-032",
              as: "fighterMode",
              under: ["ST9-05", "ST9-04", "ST9-09"],
            },
          ],
          hand: [{ card: "BT8-112", as: "paladinMode" }],
          trash: [{ card: "BT5-112", as: "zwartDefeat" }],
          deck: ["BT1-028"],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "stackedTarget", under: ["BT1-010"] },
            { card: "BT1-009", as: "bareTarget" },
          ],
          deck: ["BT1-011"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    s.state.memory = 7;
    preferred.push(
      s.inst("zwartDefeat").instanceId,
      s.perm("stackedTarget").permanentId,
      s.perm("bareTarget").topCard.instanceId,
      s.perm("stackedTarget").topCard.instanceId,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("fighterMode").permanentId,
        instanceId: s.inst("paladinMode").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.perm("fighterMode").topCard.cardId === "BT8-112" &&
        s.state.players[1]!.battleArea.length === 0,
      5000,
    );

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT5-112")).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT5-112")).toBe(true);
    expect(s.perm("fighterMode").stack.map((card) => card.cardId)).not.toContain("ST9-05");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not recycle a white level 7 when Paladin Mode is played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-112", as: "paladinMode" }],
          trash: [{ card: "BT5-112", as: "zwartDefeat" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("paladinMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(-5);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT5-112")).toBe(true);
  });
});
