import { describe, it, expect } from "vitest";
import {
  DECK_BOTTOM,
  EffectTiming,
  getCardDefinition,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT5/BT5-091.js";
import "../BT11/BT11-006.js";
import "../BT13/BT13-007.js";
import "../BT18/BT18-096.js";
import "../EX1/EX1-071.js";
import "./BT7-085.js";
import { compiled } from "./BT7-112.js";

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT7-112",
    set: "BT7",
    nameEn: "Susanoomon",
    kinds: ["Digimon"] as never,
    colors: ["White"] as never,
    playCost: 15,
    dp: 15000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakeInstance(instanceId: string, cardId: string, ownerSeat: Seat): CardInstance {
  return { instanceId, cardId, ownerSeat } as unknown as CardInstance;
}

function makeOpponentDigimon(permanentId: string, controllerSeat: Seat = 1 as Seat): Permanent {
  return {
    permanentId,
    controllerSeat,
    topCard: fakeInstance(`${permanentId}-top`, "BT1-001", controllerSeat),
    stack: [],
    linked: [],
    baseDP: 5000,
    currentDP: 5000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(opts: { isOnBattleArea?: boolean } = {}): CardSource {
  return {
    instanceId: "INST#BT7-112",
    cardId: "BT7-112",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => opts.isOnBattleArea ?? true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeContext(opts: { recorder: Recorder; opponentDigimon?: Permanent[] }): EffectContext {
  const players = [
    { seat: 0, battleArea: [], security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: opts.opponentDigimon ?? [], security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 0, players, turnSeat: 0 } as unknown as GameState;
  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id) => {
      for (const p of players) {
        const found = (p.battleArea as Permanent[]).find((x) => x.permanentId === id);
        if (found) return found;
      }
      return undefined;
    },
    definitionOf: (card) => fakeDefinition({ cardId: card.cardId }),
  };
  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return undefined as never;
    };
  const fx = {
    deletePermanent: record("deletePermanent"),
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  return { source: makeSource({ isOnBattleArea: true }), trigger: {}, game, fx, ask };
}

describe("BT7-112 (Susanoomon)", () => {
  const module = getEffectModule("BT7-112");

  it("is registered", () => {
    expect(module, "BT7-112 must self-register on import").toBeDefined();
  });

  it("encodes the hand-only Tamer alternate digivolution placement path", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      {
        cost: 7,
        isAlternate: true,
        baseIsTamer: true,
        sourceZones: ["hand"],
        placementCost: {
          count: 10,
          from: ["hand", "trash"],
          kinds: ["Tamer"],
          traits: ["Hybrid"],
        },
      },
    ]);
  });

  it("routes [When Digivolving] delete to WhenDigivolving, not to OnPlay", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it("[When Digivolving] deletes 1 opponent Digimon when one is available", async () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    const deleteEffect = effects.find((e) => e.description.includes("Delete"));
    expect(deleteEffect, "WhenDigivolving Delete effect must exist").toBeDefined();
    const recorder: Recorder = { calls: [] };
    const opponentDigimon = [makeOpponentDigimon("PERM#OPP-1")];
    const ctx = makeContext({ recorder, opponentDigimon });
    await deleteEffect!.resolve(ctx);
    const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0]!.args[0] as string[]).toContain("PERM#OPP-1");
  });

  it("[When Digivolving] deletes exactly 1 (not 2) when opponent has multiple Digimon", async () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    const deleteEffect = effects.find((e) => e.description.includes("Delete"));
    expect(deleteEffect).toBeDefined();
    const recorder: Recorder = { calls: [] };
    const opponentDigimon = [makeOpponentDigimon("PERM#OPP-1"), makeOpponentDigimon("PERM#OPP-2")];
    const ctx = makeContext({ recorder, opponentDigimon });
    await deleteEffect!.resolve(ctx);
    const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0]!.args[0] as string[]).toHaveLength(1);
  });

  it("[Static] first clause should be an alternate digivolution path, not a cost reduction", async () => {
    const source = makeSource();
    const noneEffects = module!.effectsForTiming(EffectTiming.None, source);
    const hasReplacementAtNone = noneEffects.some((e) => e.description.toLowerCase().includes("replacement"));
    expect(hasReplacementAtNone).toBe(false);
  });

  it("uses five hand and five trash Hybrids to evolve a Tamer and check three security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [{ card: "BT7-112", as: "susanoomon" }, "BT4-011", "BT4-025", "BT7-021", "BT7-038", "BT7-046"],
          trash: ["BT4-011", "BT4-025", "BT7-021", "BT7-038", "BT7-046"],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT2-047", as: "deleted" }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      {
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("susanoomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("takuya").topCard.cardId === "BT7-112" && s.state.players[1]!.battleArea.length === 0,
      5000,
    );

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(10);
    expect(observe(s.engine).keywordAmount(s.perm("takuya"), "SecurityAttack")).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("takuya").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

describe("BT7-112 Susanoomon — KB Q&A rulings", () => {
  const TAMER_BASE = "BT7-085";
  const HYBRIDS = ["BT4-011", "BT4-025", "BT7-021", "BT7-038", "BT7-046"];
  const TAMER_CARDS = ["BT7-085", "BT7-086", "BT7-087", "BT7-088", "BT7-089"];
  const PLAIN_DIGIMON = "AD1-001";
  const LEVEL_6_DIGIMON = "BT1-080";
  const DRAWN_BONUS = "BT1-001";

  type Material = { hand?: string[]; trash?: string[]; base?: string; deck?: string[] };

  function susanoomonBoard(material: Material) {
    const s = setupEngine({
      0: {
        battleArea: [{ card: material.base ?? TAMER_BASE, as: "base" }],
        hand: [{ card: "BT7-112", as: "susanoomon" }, ...(material.hand ?? [])],
        trash: material.trash ?? [],
        deck: material.deck ?? [DRAWN_BONUS],
      },
    });
    s.state.memory = 10;
    return s;
  }

  function pendingPlacement(s: ReturnType<typeof susanoomonBoard>) {
    return s.decisions.find(
      (d) => d.req.kind === "selectCards" && d.req.options?.min === 10 && d.req.options?.max === 10,
    );
  }

  async function respondPlacement(s: ReturnType<typeof susanoomonBoard>, pick: (candidates: string[]) => string[]) {
    await settle(() => pendingPlacement(s) !== undefined);
    const request = pendingPlacement(s)!;
    const chosen = pick(request.req.options?.candidateInstanceIds ?? []);
    const result = s.engine.applyIntent(request.seat, {
      type: "respondDecision",
      decisionId: request.req.decisionId,
      response: { kind: "selectCards", instanceIds: chosen },
    });
    return { request, chosen, result };
  }

  async function answerPlacement(s: ReturnType<typeof susanoomonBoard>, pick: (candidates: string[]) => string[]) {
    const { request, chosen, result } = await respondPlacement(s, pick);
    expect(result).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT7-112", 400);
    return { request, chosen };
  }

  function declareOntoBase(s: ReturnType<typeof susanoomonBoard>, extra: Record<string, unknown> = {}) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("susanoomon").instanceId,
      ...extra,
    });
  }

  it("pays the placement right after the declaration, then digivolves onto a Tamer treated as a level 6 Digimon (Q1680)", async () => {
    const s = susanoomonBoard({ hand: HYBRIDS, trash: HYBRIDS });
    const player = s.state.players[0]!;
    const tamerTop = s.perm("base").topCard.instanceId;

    expect(declareOntoBase(s)).toEqual({ ok: true });
    await settle(() => pendingPlacement(s) !== undefined);

    expect(player.hand.some((c) => c.cardId === "BT7-112")).toBe(true);
    expect(s.perm("base").topCard.cardId).toBe(TAMER_BASE);

    await answerPlacement(s, (candidates) => candidates.slice(0, 10));

    const evolved = s.perm("base");
    expect(evolved.topCard.cardId).toBe("BT7-112");
    expect(evolved.stack.map((c) => c.instanceId)).toContain(tamerTop);
    expect(s.state.memory).toBe(3);

    const omnimonBoard = susanoomonBoard({ hand: ["BT1-084", ...HYBRIDS], trash: HYBRIDS });
    const omnimon = omnimonBoard.state.players[0]!.hand.find((c) => c.cardId === "BT1-084")!;
    expect(
      omnimonBoard.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: omnimonBoard.perm("base").permanentId,
        instanceId: omnimon.instanceId,
      }).ok,
    ).toBe(false);
  });

  it("cannot declare the digivolution without a card on the field to digivolve, and a started payment always ends in the digivolution (Q1681)", async () => {
    const noBase = susanoomonBoard({ base: PLAIN_DIGIMON, hand: HYBRIDS, trash: HYBRIDS });
    const noBasePlayer = noBase.state.players[0]!;
    expect(declareOntoBase(noBase, { useAlternateCost: true }).ok).toBe(false);
    expect(pendingPlacement(noBase)).toBeUndefined();
    expect(noBasePlayer.hand).toHaveLength(6);
    expect(noBasePlayer.trash).toHaveLength(5);
    expect(noBasePlayer.deck).toHaveLength(1);

    const s = susanoomonBoard({ hand: HYBRIDS, trash: HYBRIDS });
    expect(declareOntoBase(s, { useAlternateCost: true })).toEqual({ ok: true });
    await settle(() => pendingPlacement(s) !== undefined);
    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(false);

    const decline = await respondPlacement(s, () => []);
    expect(decline.result.ok).toBe(false);
    expect(pendingPlacement(s)).toBeDefined();
    expect(s.perm("base").topCard.cardId).toBe(TAMER_BASE);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT7-112")).toBe(true);

    const { request } = await answerPlacement(s, (candidates) => candidates.slice(0, 10));
    expect(request.req.options?.min).toBe(10);
    expect(s.perm("base").topCard.cardId).toBe("BT7-112");
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT7-112")).toBe(false);
  });

  it("returns 5 cards from hand and 5 cards from trash together as the 10 cards (Q1682)", async () => {
    const s = susanoomonBoard({ hand: [...HYBRIDS, "BT4-011"], trash: [...HYBRIDS, "BT4-025"] });
    const player = s.state.players[0]!;
    const handIds = new Set(player.hand.map((c) => c.instanceId));
    const trashIds = new Set(player.trash.map((c) => c.instanceId));

    expect(declareOntoBase(s)).toEqual({ ok: true });
    const { chosen } = await answerPlacement(s, (candidates) => [
      ...candidates.filter((id) => handIds.has(id)).slice(0, 5),
      ...candidates.filter((id) => trashIds.has(id)).slice(0, 5),
    ]);

    expect(chosen.filter((id) => handIds.has(id))).toHaveLength(5);
    expect(chosen.filter((id) => trashIds.has(id))).toHaveLength(5);
    expect(s.perm("base").topCard.cardId).toBe("BT7-112");
    expect(player.deck.slice(-10).map((c) => c.instanceId)).toEqual(chosen);
    expect(player.hand.filter((c) => c.cardId !== DRAWN_BONUS)).toHaveLength(1);
    expect(player.trash).toHaveLength(1);
  });

  it("accepts 5 Tamer cards and 5 [Hybrid] trait cards as the 10 cards (Q1683)", async () => {
    const s = susanoomonBoard({ hand: [...TAMER_CARDS, PLAIN_DIGIMON], trash: HYBRIDS });
    const player = s.state.players[0]!;
    const tamerIds = new Set(player.hand.filter((c) => TAMER_CARDS.includes(c.cardId)).map((c) => c.instanceId));
    const hybridIds = new Set(player.trash.map((c) => c.instanceId));
    const plainId = player.hand.find((c) => c.cardId === PLAIN_DIGIMON)!.instanceId;

    expect(declareOntoBase(s)).toEqual({ ok: true });
    const { request, chosen } = await answerPlacement(s, (candidates) => candidates.slice(0, 10));

    expect(request.req.options?.candidateInstanceIds).not.toContain(plainId);
    expect(chosen.filter((id) => tamerIds.has(id))).toHaveLength(5);
    expect(chosen.filter((id) => hybridIds.has(id))).toHaveLength(5);
    expect(s.perm("base").topCard.cardId).toBe("BT7-112");
    expect(player.deck.slice(-10).map((c) => c.instanceId)).toEqual(chosen);
    expect(player.hand.filter((c) => c.cardId !== DRAWN_BONUS).map((c) => c.instanceId)).toEqual([plainId]);
  });

  it("cannot digivolve onto a Tamer by returning only 9 cards (Q1684)", async () => {
    const nine = susanoomonBoard({ hand: [...HYBRIDS, PLAIN_DIGIMON], trash: HYBRIDS.slice(0, 4) });
    const player = nine.state.players[0]!;
    expect(declareOntoBase(nine, { useAlternateCost: true }).ok).toBe(false);
    expect(pendingPlacement(nine)).toBeUndefined();
    expect(nine.perm("base").topCard.cardId).toBe(TAMER_BASE);
    expect(player.hand).toHaveLength(7);
    expect(player.trash).toHaveLength(4);
    expect(player.deck).toHaveLength(1);
    expect(nine.state.memory).toBe(10);

    const ten = susanoomonBoard({ hand: [...HYBRIDS, PLAIN_DIGIMON], trash: HYBRIDS });
    const tenPlayer = ten.state.players[0]!;
    expect(declareOntoBase(ten, { useAlternateCost: true })).toEqual({ ok: true });

    const shortPick = await respondPlacement(ten, (candidates) => candidates.slice(0, 9));
    expect(shortPick.chosen).toHaveLength(9);
    expect(shortPick.result.ok).toBe(false);
    expect(pendingPlacement(ten)).toBeDefined();
    expect(ten.perm("base").topCard.cardId).toBe(TAMER_BASE);
    expect(tenPlayer.trash).toHaveLength(5);
    expect(tenPlayer.deck).toHaveLength(1);

    await answerPlacement(ten, (candidates) => candidates.slice(0, 10));
    expect(ten.perm("base").topCard.cardId).toBe("BT7-112");
    expect(tenPlayer.deck).toHaveLength(10);
  });

  it("can pay the 10-card placement and still digivolve from a level 6 Digimon (Q1685)", async () => {
    const s = susanoomonBoard({ base: LEVEL_6_DIGIMON, hand: HYBRIDS, trash: HYBRIDS });
    const player = s.state.players[0]!;

    expect(declareOntoBase(s, { alternateRequirementIndex: 0 })).toEqual({ ok: true });
    const { chosen } = await answerPlacement(s, (candidates) => candidates.slice(0, 10));

    expect(s.perm("base").topCard.cardId).toBe("BT7-112");
    expect(s.perm("base").stack.some((c) => c.cardId === LEVEL_6_DIGIMON)).toBe(true);
    expect(player.deck.slice(-10).map((c) => c.instanceId)).toEqual(chosen);
    expect(s.state.memory).toBe(3);
  });

  const RED_LEVEL_6 = "BT1-025";
  const RED_HAND_DIGIMON = "BT1-020";
  const YELLOW_HYBRID_DIGIMON = "BT7-038";

  function lordOfDevastationBoard(options: {
    trashHybrids: string[];
    extraBattleArea?: { card: string; as: string }[];
  }) {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER_BASE, as: "base" },
            { card: YELLOW_HYBRID_DIGIMON, as: "colorSource" },
            ...(options.extraBattleArea ?? []),
          ],
          hand: [{ card: "BT18-096", as: "lord" }, { card: "BT7-112", as: "susanoomon" }, ...HYBRIDS],
          trash: options.trashHybrids,
          deck: [DRAWN_BONUS],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    s.state.memory = 10;
    return { s, preferInstanceIds };
  }

  async function playLord(s: ReturnType<typeof lordOfDevastationBoard>["s"]) {
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "BT18-096"));
  }

  it("lets Lord of Devastation and Rebirth digivolve a Tamer into Susanoomon only when the 10-card placement is paid (Q1686)", async () => {
    const { s } = lordOfDevastationBoard({ trashHybrids: HYBRIDS });
    const player = s.state.players[0]!;
    const takuyaCard = s.perm("base").topCard.instanceId;
    await playLord(s);
    await settle(() => s.perm("base").topCard.cardId === "BT7-112");

    expect(s.perm("base").topCard.cardId).toBe("BT7-112");
    expect(s.perm("base").stack.map((c) => c.instanceId)).toContain(takuyaCard);
    expect(player.deck).toHaveLength(10);
    expect(player.deck.slice(-10).every((c) => HYBRIDS.includes(c.cardId))).toBe(true);
    expect(player.trash.map((c) => c.cardId)).toEqual(["BT18-096"]);
    expect(s.state.memory).toBe(4);

    const short = lordOfDevastationBoard({ trashHybrids: HYBRIDS.slice(0, 4) });
    const shortPlayer = short.s.state.players[0]!;
    await playLord(short.s);

    expect(short.s.perm("base").topCard.cardId).toBe(TAMER_BASE);
    expect(shortPlayer.hand.some((c) => c.cardId === "BT7-112")).toBe(true);
    expect(shortPlayer.hand.filter((c) => HYBRIDS.includes(c.cardId))).toHaveLength(5);
    expect(shortPlayer.trash.filter((c) => HYBRIDS.includes(c.cardId))).toHaveLength(4);
    expect(shortPlayer.deck).toHaveLength(1);
  });

  it("digivolves only the Digimon chosen with Lord of Devastation and Rebirth, never switching to a Tamer (Q1687)", async () => {
    const { s, preferInstanceIds } = lordOfDevastationBoard({
      trashHybrids: HYBRIDS,
      extraBattleArea: [{ card: RED_LEVEL_6, as: "warGreymon" }],
    });
    preferInstanceIds.push(s.perm("warGreymon").permanentId, s.perm("warGreymon").topCard.instanceId);
    const takuyaCard = s.perm("base").topCard.instanceId;
    await playLord(s);
    await settle(() => s.perm("warGreymon").topCard.cardId === "BT7-112");

    const targetPrompt = s.decisions.find((d) => d.req.kind === "chooseTargets" && d.req.sourceCardId === "BT18-096");
    expect(targetPrompt?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("base").permanentId, s.perm("warGreymon").permanentId]),
    );
    expect(s.perm("warGreymon").topCard.cardId).toBe("BT7-112");
    expect(s.perm("warGreymon").stack.map((c) => c.cardId)).toContain(RED_LEVEL_6);
    expect(s.perm("base").topCard.instanceId).toBe(takuyaCard);
    expect(s.perm("base").stack).toHaveLength(0);
  });

  function winRateBoard(base: string) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER_BASE, as: "takuya" },
            ...(base === TAMER_BASE ? [] : [{ card: base, as: "digimon" }]),
          ],
          hand: [
            { card: "EX1-071", as: "winRate" },
            { card: "BT7-112", as: "susanoomon" },
            { card: RED_HAND_DIGIMON, as: "sameColorHand" },
          ],
          trash: [...HYBRIDS, ...HYBRIDS],
          deck: [DRAWN_BONUS],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    return s;
  }

  async function digivolveAfterWinRate(s: ReturnType<typeof winRateBoard>, baseAlias: string) {
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("winRate").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "EX1-071"));
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm(baseAlias).permanentId,
        instanceId: s.inst("susanoomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm(baseAlias).topCard.cardId === "BT7-112");
    return before - s.state.memory;
  }

  // Q1690 (2026-06-19) supersedes Q1688's last sentence: a Tamer digivolving as if it is a
  // Digimon is a Digimon that would digivolve, so Win Rate: 60%! reduces that digivolution.
  it("pays Susanoomon's placement first and then applies Win Rate: 60%! to a Tamer base (Q1688, Q1690)", async () => {
    const onTamer = winRateBoard(TAMER_BASE);
    const paidOnTamer = await digivolveAfterWinRate(onTamer, "takuya");
    const tamerPlayer = onTamer.state.players[0]!;

    expect(onTamer.perm("takuya").topCard.cardId).toBe("BT7-112");
    expect(paidOnTamer).toBe(3);
    expect(tamerPlayer.deck).toHaveLength(10);
    expect(tamerPlayer.deck.slice(-10).every((c) => HYBRIDS.includes(c.cardId))).toBe(true);
    expect(tamerPlayer.trash.some((c) => c.instanceId === onTamer.inst("sameColorHand").instanceId)).toBe(true);

    const onDigimon = winRateBoard(RED_LEVEL_6);
    const paidOnDigimon = await digivolveAfterWinRate(onDigimon, "digimon");

    expect(paidOnDigimon).toBe(3);
    expect(
      onDigimon.state.players[0]!.trash.some((c) => c.instanceId === onDigimon.inst("sameColorHand").instanceId),
    ).toBe(true);
  });

  async function susanoomonOnTamer(enteredThisTurn: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAMER_BASE, as: "base", enteredThisTurn }],
          hand: [{ card: "BT7-112", as: "susanoomon" }, ...HYBRIDS],
          trash: HYBRIDS,
          deck: [DRAWN_BONUS],
        },
        1: { security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(declareOntoBase(s)).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT7-112");
    return s;
  }

  function attackPlayer(s: Awaited<ReturnType<typeof susanoomonOnTamer>>) {
    return s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("base").permanentId,
      target: { kind: "player" },
    });
  }

  it("cannot attack the turn it digivolves from a Tamer played that same turn (Q1689)", async () => {
    const freshTamer = await susanoomonOnTamer(true);
    expect(freshTamer.perm("base").topCard.cardId).toBe("BT7-112");
    expect(attackPlayer(freshTamer).ok).toBe(false);
    expect(freshTamer.perm("base").isSuspended).toBe(false);

    const establishedTamer = await susanoomonOnTamer(false);
    expect(attackPlayer(establishedTamer)).toEqual({ ok: true });
  });

  it("treats the digivolving Tamer as a Digimon for digivolve triggers and for can't-digivolve effects (Q1690)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER_BASE, as: "base" },
            { card: "BT5-091", as: "takumi" },
          ],
          hand: [{ card: "BT7-112", as: "susanoomon" }, ...HYBRIDS],
          trash: HYBRIDS,
          deck: [DRAWN_BONUS, "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(declareOntoBase(s)).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT7-112" && s.perm("takumi").isSuspended);

    expect(s.perm("takumi").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(expect.arrayContaining([DRAWN_BONUS, "BT1-002"]));

    const locked = setupEngine({
      0: {
        battleArea: [{ card: TAMER_BASE, as: "base" }],
        breeding: { card: "BT13-007", as: "kingDrasil" },
        hand: [{ card: "BT7-112", as: "susanoomon" }, ...HYBRIDS],
        trash: HYBRIDS,
        deck: [DRAWN_BONUS],
      },
    });
    locked.state.memory = 10;
    await locked.ready();

    expect(declareOntoBase(locked).ok).toBe(false);
    expect(locked.perm("base").topCard.cardId).toBe(TAMER_BASE);
    expect(locked.state.players[0]!.deck).toHaveLength(1);
  });

  it("reveals every card returned to the deck bottom for the placement to the opponent (Q1691)", async () => {
    const s = susanoomonBoard({ hand: HYBRIDS, trash: HYBRIDS });
    const player = s.state.players[0]!;
    const cardIdOf = new Map([...player.hand, ...player.trash].map((c) => [c.instanceId, c.cardId]));

    expect(declareOntoBase(s)).toEqual({ ok: true });
    const { chosen } = await answerPlacement(s, (candidates) => candidates.slice(0, 10));
    expect(chosen.filter((id) => player.deck.some((c) => c.instanceId === id))).toHaveLength(10);

    const namedToOpponent = s.events.flatMap((event) => {
      if (event.kind === "cardRevealed" && event.seat === 0) return [event.cardId];
      if (event.kind === "cardsMoved" && event.to === DECK_BOTTOM && event.seat === 0) return event.cardIds ?? [];
      return [];
    });
    const returnedCardIds = chosen.map((id) => cardIdOf.get(id)!);
    for (const cardId of new Set(returnedCardIds)) {
      expect(namedToOpponent.filter((named) => named === cardId).length).toBeGreaterThanOrEqual(
        returnedCardIds.filter((returned) => returned === cardId).length,
      );
    }
  });

  async function digivolvedOntoTamer(material: Material = {}) {
    const s = susanoomonBoard({ hand: HYBRIDS, trash: HYBRIDS, ...material });
    await s.ready();
    expect(declareOntoBase(s)).toEqual({ ok: true });
    await answerPlacement(s, (candidates) => candidates.slice(0, 10));
    return s;
  }

  it("performs the digivolution bonus draw when a Tamer digivolves into Susanoomon (Q1692)", async () => {
    const s = await digivolvedOntoTamer({ deck: [DRAWN_BONUS, "BT1-002"] });
    const player = s.state.players[0]!;

    expect(s.perm("base").topCard.cardId).toBe("BT7-112");
    expect(player.hand.map((c) => c.cardId)).toEqual([DRAWN_BONUS]);
    expect(player.deck.map((c) => c.cardId)).not.toContain(DRAWN_BONUS);
    expect(player.deck.map((c) => c.cardId)).toContain("BT1-002");
    expect(player.deck).toHaveLength(11);
  });

  it("does not activate a trashed-from-hand-by-effect inherited effect when Susanoomon leaves the hand by the rules (Q2048)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: TAMER_BASE, as: "base" },
          { card: "BT11-075", as: "tsunomonHost", under: ["BT11-006"] },
        ],
        hand: [
          { card: "BT7-112", as: "susanoomon" },
          { card: "BT7-112", as: "spareSusanoomon" },
          ...HYBRIDS,
          { card: PLAIN_DIGIMON, as: "discard" },
        ],
        trash: HYBRIDS,
        deck: [DRAWN_BONUS],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const player = s.state.players[0]!;
    const hostDp = s.perm("tsunomonHost").currentDP;

    expect(declareOntoBase(s)).toEqual({ ok: true });
    await answerPlacement(s, (candidates) => candidates.slice(0, 10));
    expect(s.perm("tsunomonHost").currentDP).toBe(hostDp);

    const spare = s.inst("spareSusanoomon");
    player.hand.splice(
      player.hand.findIndex((c) => c.instanceId === spare.instanceId),
      1,
    );
    player.trash.push(spare);
    await advance(s.engine).fireSubTrigger("whenTrashedFromHand", {
      handTrashedSeat: 0,
      trashedFromHandCardId: "BT7-112",
      trashedFromHandInstanceId: spare.instanceId,
    });
    expect(s.perm("tsunomonHost").currentDP).toBe(hostDp);

    await advance(s.engine).verb.trash([s.inst("discard").instanceId]);
    await settle(() => s.perm("tsunomonHost").currentDP === hostDp + 1000);
    expect(s.perm("tsunomonHost").currentDP).toBe(hostDp + 1000);
  });

  it("keeps the Tamer under Susanoomon as a digivolution card that is trashed when the Digimon leaves the field (Q6533)", async () => {
    const s = await digivolvedOntoTamer();
    const player = s.state.players[0]!;
    const susanoomon = s.perm("base");
    const tamerCard = susanoomon.stack.find((c) => c.cardId === TAMER_BASE)!;
    expect(tamerCard).toBeDefined();

    await advance(s.engine).verb.deletePermanent([susanoomon.permanentId]);
    await settle(() => player.battleArea.length === 0);

    expect(player.battleArea).toHaveLength(0);
    expect(player.trash.map((c) => c.instanceId)).toEqual(
      expect.arrayContaining([tamerCard.instanceId, s.inst("susanoomon").instanceId]),
    );
    expect(player.hand.some((c) => c.instanceId === tamerCard.instanceId)).toBe(false);
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6534)", async () => {
    const s = await digivolvedOntoTamer();
    const player = s.state.players[0]!;
    const tamerCard = s.perm("base").stack.find((c) => c.cardId === TAMER_BASE)!;
    const takuyaSecurityEffects = (events: typeof s.events) =>
      events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === TAMER_BASE);

    const eventsBefore = s.events.length;
    await advance(s.engine).fireForPermanent(EffectTiming.SecuritySkill, s.perm("base"));

    expect(takuyaSecurityEffects(s.events.slice(eventsBefore))).toHaveLength(0);
    expect(player.battleArea).toHaveLength(1);
    expect(s.perm("base").topCard.cardId).toBe("BT7-112");
    expect(s.perm("base").stack.map((c) => c.instanceId)).toContain(tamerCard.instanceId);

    const control = setupEngine({ 0: { security: [{ card: TAMER_BASE, as: "securityTakuya" }] } });
    await control.ready();
    await advance(control.engine).fireForInstance(EffectTiming.SecuritySkill, control.inst("securityTakuya"));
    await settle(() => control.state.players[0]!.battleArea.length === 1);
    expect(takuyaSecurityEffects(control.events)).toHaveLength(1);
    expect(control.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual([TAMER_BASE]);
  });

  it("gains the inherited effects of a Tamer in its digivolution cards (Q6535)", async () => {
    const s = await digivolvedOntoTamer();
    const printedDp = getCardDefinition("BT7-112")!.dp!;

    expect(s.perm("base").currentDP).toBe(printedDp + 2000);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(3);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("base").currentDP).toBe(printedDp);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(2);
  });
});
