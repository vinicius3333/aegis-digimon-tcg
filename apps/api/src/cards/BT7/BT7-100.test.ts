import { describe, it, expect } from "vitest";
import { EffectTiming, type CardInstance, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-100.js";

// A3 for BT7-100 (Qualialise Blast):
//   [Static] play cost = owner's security stack count.
//   [Security] add this card to its owner's hand.
//   [Main] -3000 DP to 1 opponent Digimon; +1 SecurityAttack to 1 own Rasenmon.
//
// FAILS-WHEN-REVERTED: the old declarative effect record omitted the
// security-count cost mechanic; the [Main] + SecurityAttack body is also absent.

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
    // FAILS-WHEN-REVERTED: the old declarative effect record makes no changePlayCost call
    const { ctx, recorder } = makeCtx({ securityCount: 3, inHand: true });
    const source = makeSource(true);
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(ctx);

    const changePlayCostCalls = recorder.calls.filter((c) => c.verb === "changePlayCost");
    expect(changePlayCostCalls).toHaveLength(1);
    // The second arg is the cost value (security count = 3)
    expect(changePlayCostCalls[0]!.args[1]).toBe(3);
  });

  it("[Static] sets the cost to zero when the owner's security stack is empty", async () => {
    // FAILS-WHEN-REVERTED: an invented floor of 1 makes this zero-security case cost 1.
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
    // FAILS-WHEN-REVERTED: IR has no modifyDP call
    const { ctx, recorder } = makeCtx({ opponentDigimonPermanentId: "opp-perm-1" });
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx);

    const dpCalls = recorder.calls.filter((c) => c.verb === "modifyDP");
    expect(dpCalls).toHaveLength(1);
    expect(dpCalls[0]!.args[1]).toBe(-3000);
  });

  it("[Main] calls grantKeyword SecurityAttack +1 on Rasenmon when present", async () => {
    // FAILS-WHEN-REVERTED: IR has no grantKeyword call
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
