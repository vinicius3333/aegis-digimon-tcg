import { describe, it, expect } from "vitest";
import { EffectTiming, type CardInstance, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT6/BT6-112.js";
import "../ST3/ST3-16.js";
import "./BT7-040.js";
import "./BT7-100.js";

const RASENMON_ID = "BT7-RASENMON";
const OTHER_DIGIMON_ID = "BT7-OTHER";
const SELF_INST = "self-inst";

function card(instanceId: string, cardId: string, seat: Seat = 0): CardInstance {
  return { instanceId, cardId, ownerSeat: seat, faceUp: true } as CardInstance;
}

function makeSource(inHand = true): CardSource {
  return {
    instanceId: SELF_INST,
    cardId: "BT7-100",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "BT7-100",
      set: "BT7",
      nameEn: "Qualialise Blast",
      kinds: ["Option"] as never,
      colors: ["Yellow"] as never,
      playCost: 3,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () => undefined as never,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
    _inHand: inHand,
  } as unknown as CardSource;
}

function makeCtx(
  opts: {
    securityCount?: number;
    rasenmonPermanentId?: string;
    opponentDigimonPermanentId?: string;
    inHand?: boolean;
  } = {},
): { ctx: EffectContext; recorder: { calls: { verb: string; args: unknown[] }[] } } {
  const { securityCount = 3, rasenmonPermanentId, opponentDigimonPermanentId, inHand = true } = opts;

  const recorder: { calls: { verb: string; args: unknown[] }[] } = { calls: [] };

  const selfCard = card(SELF_INST, "BT7-100", 0);

  const ownerBattleArea = rasenmonPermanentId
    ? [
        {
          permanentId: rasenmonPermanentId,
          controllerSeat: 0 as Seat,
          topCard: card("rasenmon-top", RASENMON_ID, 0),
          isSuspended: false,
          stack: [] as CardInstance[],
          baseDP: 6000,
          currentDP: 6000,
        },
      ]
    : [];

  const opponentBattleArea = opponentDigimonPermanentId
    ? [
        {
          permanentId: opponentDigimonPermanentId,
          controllerSeat: 1 as Seat,
          topCard: card("opp-top", OTHER_DIGIMON_ID, 1),
          isSuspended: false,
          stack: [] as CardInstance[],
          baseDP: 5000,
          currentDP: 5000,
        },
      ]
    : [];

  const source = makeSource(inHand);

  const players = [
    {
      seat: 0 as Seat,
      hand: inHand ? [selfCard] : [],
      security: Array.from({ length: securityCount }, (_, i) => card(`sec-${i}`, "BT7-OTHER-SEC", 0)),
      battleArea: ownerBattleArea,
      deck: [],
      trash: [],
    },
    {
      seat: 1 as Seat,
      hand: [],
      security: [],
      battleArea: opponentBattleArea,
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
      if (c.cardId === RASENMON_ID) {
        return {
          cardId: c.cardId,
          kinds: ["Digimon"],
          nameEn: "Rasenmon",
          level: 6,
          playCost: 9,
          colors: ["Yellow"],
        } as never;
      }
      return {
        cardId: c.cardId,
        kinds: ["Digimon"],
        nameEn: "Other",
        level: 5,
        playCost: 7,
        colors: ["Yellow"],
      } as never;
    },
  };

  const fx: Partial<Primitives> = {
    changePlayCost: (...args) => {
      recorder.calls.push({ verb: "changePlayCost", args });
    },
    returnToHand: async (...args) => {
      recorder.calls.push({ verb: "returnToHand", args });
      return [];
    },
    modifyDP: (...args) => {
      recorder.calls.push({ verb: "modifyDP", args });
    },
    grantKeyword: (...args) => {
      recorder.calls.push({ verb: "grantKeyword", args });
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

describe("BT7-100 Qualialise Blast", () => {
  const module = getEffectModule("BT7-100");

  it("uses exact matching for the bracket-only Rasenmon name", () => {
    expect(runtimeCompiledCard("BT7-100")?.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        {},
        {
          kind: "GainKeyword",
          target: {
            filter: { nameOrTrait: [{ tokens: ["Rasenmon"], match: "nameExact" }] },
          },
        },
      ],
    });
  });

  it("is registered on import", () => {
    expect(module, "BT7-100 must self-register").toBeDefined();
  });

  it("produces a None (static) effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });

  it("produces a SecuritySkill effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("produces an OnUseOption (Main) effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
  });

  it("[Static] changePlayCost sets fixed cost to security count", async () => {
    const { ctx, recorder } = makeCtx({ securityCount: 3, inHand: true });
    const source = makeSource(true);
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(ctx);

    const changePlayCostCalls = recorder.calls.filter((c) => c.verb === "changePlayCost");
    expect(changePlayCostCalls).toHaveLength(1);
    expect(changePlayCostCalls[0]!.args[1]).toBe(3);
  });

  it("[Static] sets the cost to zero when the owner's security stack is empty", async () => {
    const { ctx, recorder } = makeCtx({ securityCount: 0, inHand: true });
    const source = makeSource(true);
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(ctx);

    const changePlayCostCalls = recorder.calls.filter((c) => c.verb === "changePlayCost");
    expect(changePlayCostCalls).toHaveLength(1);
    expect(changePlayCostCalls[0]!.args[1]).toBe(0);
  });

  it("[Security] adds this card to owner's hand via returnToHand", async () => {
    const { ctx, recorder } = makeCtx();
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    await effects[0]!.resolve(ctx);

    const returnCalls = recorder.calls.filter((c) => c.verb === "returnToHand");
    expect(returnCalls).toHaveLength(1);
    expect((returnCalls[0]!.args[0] as string[]).includes(SELF_INST)).toBe(true);
  });

  it("[Main] calls modifyDP -3000 on opponent Digimon", async () => {
    const { ctx, recorder } = makeCtx({ opponentDigimonPermanentId: "opp-perm-1" });
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx);

    const dpCalls = recorder.calls.filter((c) => c.verb === "modifyDP");
    expect(dpCalls).toHaveLength(1);
    expect(dpCalls[0]!.args[1]).toBe(-3000);
  });

  it("[Main] calls grantKeyword SecurityAttack +1 on Rasenmon when present", async () => {
    const { ctx, recorder } = makeCtx({
      opponentDigimonPermanentId: "opp-perm-2",
      rasenmonPermanentId: "rasenmon-perm-1",
    });
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx);

    const keywordCalls = recorder.calls.filter((c) => c.verb === "grantKeyword");
    expect(keywordCalls).toHaveLength(1);
    expect(keywordCalls[0]!.args[1]).toBe("SecurityAttack");
    expect(keywordCalls[0]!.args[3]).toBe(1);
  });

  it("[Main] does not grant SecurityAttack when no Rasenmon on field", async () => {
    const { ctx, recorder } = makeCtx({ opponentDigimonPermanentId: "opp-perm-3" });
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx);

    const keywordCalls = recorder.calls.filter((c) => c.verb === "grantKeyword");
    expect(keywordCalls).toHaveLength(0);
  });
});

describe("BT7-100 [Security] — real combat", () => {
  it("moves the checked option to its owner's hand instead of trash", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT7-100", as: "qualialiseBlast" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 5000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const securityInstanceId = s.inst("qualialiseBlast").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === securityInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === securityInstanceId)).toBe(false);
  });
});

describe("BT7-100 Qualialise Blast — KB Q&A rulings", () => {
  type Setup = ReturnType<typeof setupEngine>;
  const handHas = (s: Setup, instanceId: string) =>
    s.state.players[0]!.hand.some((handCard) => handCard.instanceId === instanceId);
  const trashHas = (s: Setup, seat: 0 | 1, instanceId: string) =>
    s.state.players[seat]!.trash.some((trashCard) => trashCard.instanceId === instanceId);

  async function useFromHand(s: Setup, alias: string) {
    await s.ready();
    const instanceId = s.inst(alias).instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId })).toEqual({ ok: true });
    await settle(() => trashHas(s, 0, instanceId));
    await settle();
  }

  it("is not a memory-cost-7 Option for BeelStarmon even when 7 security cards would make it cost 7 (Q1501)", async () => {
    const playBeelStarmonWith = async (optionCardId: string) => {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT6-112", as: "beelstarmon" },
              { card: optionCardId, as: "option" },
            ],
            battleArea: ["BT2-087"],
            security: 7,
          },
          1: { battleArea: [{ card: "BT7-051", as: "target" }] },
        },
        { autoSelectCards: true, declineDigiXros: true },
      );
      const targetInstanceId = s.perm("target").topCard.instanceId;
      s.state.memory = 12;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelstarmon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-112"));
      await settle();
      return { s, targetInstanceId };
    };

    const qualialise = await playBeelStarmonWith("BT7-100");
    expect(handHas(qualialise.s, qualialise.s.inst("option").instanceId)).toBe(true);
    expect(qualialise.s.perm("target").currentDP).toBe(8000);

    const sevenHeavens = await playBeelStarmonWith("ST3-16");
    expect(trashHas(sevenHeavens.s, 0, sevenHeavens.s.inst("option").instanceId)).toBe(true);
    expect(trashHas(sevenHeavens.s, 1, sevenHeavens.targetInstanceId)).toBe(true);
  });

  it("costs 0 memory to use when your security stack is empty (Q1667)", async () => {
    const useWithSecurity = async (security: number) => {
      const s = setupEngine({
        0: { hand: [{ card: "BT7-100", as: "blast" }], battleArea: ["BT2-087"], security },
        1: { battleArea: [{ card: "BT7-051", as: "target" }] },
      });
      s.state.memory = 3;
      await useFromHand(s, "blast");
      return s;
    };

    const emptySecurity = await useWithSecurity(0);
    expect(emptySecurity.state.memory).toBe(3);
    expect(emptySecurity.perm("target").currentDP).toBe(5000);

    const twoSecurity = await useWithSecurity(2);
    expect(twoSecurity.state.memory).toBe(1);
  });

  it("does not give Security Attack +1 to a Rasenmon played after the Option resolved (Q1668)", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT7-100", as: "blast" },
          { card: "BT7-040", as: "rasenmon" },
        ],
        battleArea: ["BT2-087"],
        security: 3,
      },
      1: { battleArea: [{ card: "BT7-051", as: "target" }] },
    });
    s.state.memory = 3;
    await useFromHand(s, "blast");
    expect(s.perm("target").currentDP).toBe(5000);

    s.state.memory = 11;
    const rasenmonInstanceId = s.inst("rasenmon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: rasenmonInstanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === rasenmonInstanceId),
    );
    const lateRasenmon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === rasenmonInstanceId,
    )!;
    expect(observe(s.engine).keywordAmount(lateRasenmon, "SecurityAttack")).toBe(0);

    const control = setupEngine({
      0: {
        hand: [{ card: "BT7-100", as: "blast" }],
        battleArea: [{ card: "BT7-040", as: "rasenmon" }],
        security: 3,
      },
      1: { battleArea: ["BT7-051"] },
    });
    control.state.memory = 3;
    await useFromHand(control, "blast");
    expect(observe(control.engine).keywordAmount(control.perm("rasenmon"), "SecurityAttack")).toBe(1);
  });
});
