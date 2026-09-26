import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import {
  CardKind,
  EffectTiming,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { compiled } from "./EX4-049.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";

function instance(cardId: string, ownerSeat: Seat): CardInstance {
  return { cardId, instanceId: `${cardId}-${ownerSeat}`, ownerSeat, faceUp: true } as CardInstance;
}

function definition(cardId: string, playCost: number): CardDefinition {
  return {
    cardId,
    set: "TEST",
    nameEn: cardId,
    kinds: [CardKind.Digimon],
    colors: ["Black"] as never,
    playCost,
    dp: 1000,
    level: 5,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

describe("EX4-049 CresGarurumon", () => {
  it("requires the exact WereGarurumon name for its alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toMatchObject([{ namesExact: ["WereGarurumon"], cost: 3 }]);
  });

  it("returns distinct selected opposing Digimon with combined play cost up to six to deck bottom", async () => {
    const selfCard = instance("EX4-049", 0);
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: selfCard,
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const first = {
      permanentId: "first",
      controllerSeat: 1,
      topCard: instance("FIRST", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const second = {
      permanentId: "second",
      controllerSeat: 1,
      topCard: instance("SECOND", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const players = [
      { battleArea: [self], security: [], hand: [], deck: [], trash: [] },
      { battleArea: [first, second], security: [], hand: [], deck: [], trash: [] },
    ];
    const definitions = new Map<string, CardDefinition>([
      ["EX4-049", definition("EX4-049", 12)],
      ["FIRST", definition("FIRST", 3)],
      ["SECOND", definition("SECOND", 3)],
    ]);
    const returned: string[][] = [];
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [self, first, second].find((permanent) => permanent.permanentId === id),
      definitionOf: (card: CardInstance) => definitions.get(card.cardId)!,
    } as unknown as GameAccess;
    const fx = {
      returnToDeck: async (ids: string[]) => {
        returned.push(ids);
        return ids;
      },
    } as unknown as Primitives;
    const ask: DecisionApi = {
      optional: async () => true,
      chooseOption: async () => 0,
      chooseTargets: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectCards: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectPermanents: async (_ctx, options) => options.candidates.slice(0, options.max),
    };
    const source: CardSource = {
      instanceId: selfCard.instanceId,
      cardId: "EX4-049",
      ownerSeat: 0 as Seat,
      definition: definitions.get("EX4-049")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const effect = getEffectModule("EX4-049")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve(ctx);
    expect(returned).toEqual([[first.topCard!.instanceId, second.topCard!.instanceId]]);
  });

  it("digivolves another Digimon into a level-six-or-lower Greymon without paying", async () => {
    const selfCard = instance("EX4-049", 0);
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: selfCard,
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const target = {
      permanentId: "target",
      controllerSeat: 0,
      topCard: instance("BASE", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const handCard = instance("GREYMON", 0);
    const players = [
      { battleArea: [self, target], security: [], hand: [handCard], deck: [], trash: [] },
      { battleArea: [], security: [], hand: [], deck: [], trash: [] },
    ];
    const defs = new Map<string, CardDefinition>([
      ["EX4-049", definition("EX4-049", 12)],
      ["BASE", definition("BASE", 3)],
      ["GREYMON", { ...definition("GREYMON", 8), nameEn: "WarGreymon", level: 6 }],
    ]);
    const calls: unknown[][] = [];
    const game = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: () => 1 as Seat,
      permanentById: (id: string) => [self, target].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    } as unknown as GameAccess;
    const source: CardSource = {
      instanceId: selfCard.instanceId,
      cardId: "EX4-049",
      ownerSeat: 0 as Seat,
      definition: defs.get("EX4-049")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-049")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve({
      source,
      trigger: {},
      game,
      fx: { digivolveFromInstance: async (...args: unknown[]) => calls.push(args) } as unknown as Primitives,
      ask: {
        optional: async () => true,
        chooseOption: async () => 1,
        chooseTargets: async () => ["target"],
        selectCards: async () => [handCard.instanceId],
        selectPermanents: async () => [],
      },
    } as unknown as EffectContext);
    expect(calls[0]?.slice(0, 2)).toEqual(["target", handCard.instanceId]);
    expect(calls[0]?.[2]).toMatchObject({ payCost: false, ignoreRequirements: true });
  });

  it("only returns level-five-or-lower opposing Digimon for the inherited Omnimon effect", async () => {
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: instance("OMNIMON", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const low = {
      permanentId: "low",
      controllerSeat: 1,
      topCard: instance("LOW", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const high = {
      permanentId: "high",
      controllerSeat: 1,
      topCard: instance("HIGH", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const players = [
      { battleArea: [self], security: [], hand: [], deck: [], trash: [] },
      { battleArea: [low, high], security: [], hand: [], deck: [], trash: [] },
    ];
    const defs = new Map<string, CardDefinition>([
      ["OMNIMON", { ...definition("OMNIMON", 12), nameEn: "Omnimon Alter-S", level: 7 }],
      ["LOW", { ...definition("LOW", 5), nameEn: "WarGreymon", level: 5 }],
      ["HIGH", { ...definition("HIGH", 7), nameEn: "MetalGarurumon", level: 6 }],
    ]);
    const returned: string[][] = [];
    const game = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: () => 1 as Seat,
      permanentById: (id: string) => [self, low, high].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    } as unknown as GameAccess;
    const source: CardSource = {
      instanceId: self.topCard!.instanceId,
      cardId: "EX4-049",
      ownerSeat: 0 as Seat,
      definition: defs.get("OMNIMON")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-049")!.effectsForTiming(EffectTiming.OnUseAttack, source)[0]!;
    await effect.resolve({
      source,
      trigger: {},
      game,
      fx: {
        returnToDeck: async (ids: string[]) => {
          returned.push(ids);
          return ids;
        },
      } as unknown as Primitives,
      ask: {
        optional: async () => true,
        chooseOption: async () => 0,
        chooseTargets: async () => ["low"],
        selectCards: async () => [],
        selectPermanents: async () => [],
      },
    } as unknown as EffectContext);
    expect(returned).toEqual([[low.topCard!.instanceId]]);
  });

  it("publicly attacks with Omnimon and returns only the opposing level-five Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-060", as: "omnimon", under: ["EX4-046", "EX4-049"] }],
        deck: ["BT1-009"],
      },
      1: {
        battleArea: [
          { card: "EX4-046", as: "levelFive" },
          { card: "EX4-051", as: "levelSix" },
        ],
        deck: ["BT1-012", "BT1-013"],
        security: ["EX4-046", "EX4-046"],
      },
    });
    await s.ready();
    const levelFiveInstanceId = s.inst("levelFive").instanceId;
    const levelFivePermanentId = s.perm("levelFive").permanentId;
    const levelSixPermanentId = s.perm("levelSix").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omnimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("omnimon").isSuspended &&
        s.state.players[1]!.battleArea.every((perm) => perm.permanentId !== levelFivePermanentId),
    );

    expect(s.perm("omnimon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toEqual([levelSixPermanentId]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-012", "BT1-013", "EX4-046"]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(levelFiveInstanceId);
  });

  it("returns only one opposing Digimon across two Omnimon attacks in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-060", as: "omnimon", under: ["EX4-046", "EX4-049"] },
            { card: "BT1-009", as: "spareAttacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "EX4-046", as: "firstTarget" },
            { card: "EX4-046", as: "secondTarget" },
          ],
          deck: ["BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const attackerId = s.perm("omnimon").permanentId;
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    const firstTargetInstanceId = s.inst("firstTarget").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("omnimon").isSuspended &&
        s.state.players[1]!.battleArea.every((perm) => perm.permanentId !== firstTargetId),
    );
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.deck.slice(-1).map((entry) => entry.instanceId)).toEqual([firstTargetInstanceId]);

    // The card has no unsuspend effect of its own; the production verb opens the second attack window.
    await advance(s.engine).verb.unsuspend([attackerId]);
    expect(s.perm("omnimon").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("omnimon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === secondTargetId)).toBe(true);
    expect(s.state.players[1]!.deck.map((entry) => entry.cardId)).toEqual(["BT1-012", "BT1-013", "EX4-046"]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("does not publicly trigger the inherited return when the attacking Digimon lacks Omnimon in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-051", as: "blitzGreymon", under: ["EX4-046", "EX4-049"] }],
        deck: ["BT1-009"],
      },
      1: {
        battleArea: [
          { card: "EX4-046", as: "levelFive" },
          { card: "EX4-051", as: "levelSix" },
        ],
        deck: ["BT1-012", "BT1-013"],
        security: ["EX4-046", "EX4-046"],
      },
    });
    await s.ready();
    const levelFivePermanentId = s.perm("levelFive").permanentId;
    const levelSixPermanentId = s.perm("levelSix").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blitzGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blitzGreymon").isSuspended);

    expect(s.perm("blitzGreymon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toEqual([
      levelFivePermanentId,
      levelSixPermanentId,
    ]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-012", "BT1-013"]);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-049");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("publicly returns opponent Digimon within the six-cost budget after legal evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-046", as: "base" }],
          hand: [{ card: "EX4-049", as: "subject" }],
          deck: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "costThreeA" },
            { card: "BT1-011", as: "costThreeB" },
            { card: "EX4-046", as: "overBudget" },
          ],
          deck: ["BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, autoAcceptOptional: true, preferOptionIndex: 0 },
    );
    s.state.memory = 10;
    const returnedIds = [s.inst("costThreeA").instanceId, s.inst("costThreeB").instanceId];
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("subject").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "EX4-049" &&
        s.state.players[1]!.battleArea.every((permanent) => !returnedIds.includes(permanent.topCard?.instanceId ?? "")),
    );
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX4-046"]);
    expect(s.perm("base").topCard?.cardId).toBe("EX4-049");
    expect(s.state.memory).toBe(7);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.inst("overBudget").instanceId,
    ]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-012", "BT1-010", "BT1-011"]);
    expect(s.state.players[1]!.deck.slice(-2).map((card) => card.instanceId)).toEqual(returnedIds);
  });

  it("publicly resolves modal mode two by digivolving another Digimon into Greymon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-046", as: "subjectBase" },
            { card: "BT1-010", as: "target" },
          ],
          hand: [
            { card: "EX4-049", as: "subject" },
            { card: "BT1-015", as: "greymon" },
          ],
          security: ["BT1-009", "BT1-013", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-009" }, { card: "BT1-013" }, { card: "BT1-015" }],
          security: ["BT1-009", "BT1-013", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("subjectBase").permanentId,
        instanceId: s.inst("subject").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT1-015");
    expect(s.perm("target").topCard?.cardId).toBe("BT1-015");
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.perm("subjectBase").topCard?.cardId).toBe("EX4-049");
    expect(s.perm("subjectBase").stack.map((card) => card.cardId)).toEqual(["EX4-046"]);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === s.inst("greymon").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("publicly resolves modal mode three through DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-051", as: "partner" },
            { card: "EX4-046", as: "subjectBase" },
          ],
          hand: [
            { card: "EX4-049", as: "subject" },
            { card: "EX4-060", as: "omnimon" },
          ],
          security: ["BT1-009", "BT1-013", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-009" }, { card: "BT1-013" }, { card: "BT1-015" }],
          security: ["BT1-009", "BT1-013", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("subjectBase").permanentId,
        instanceId: s.inst("subject").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("subjectBase").topCard?.instanceId === s.inst("subject").instanceId);
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("omnimon").instanceId),
    );
    const dnaResult = s.state.players[0]!.battleArea.find(
      (perm) => perm.topCard?.instanceId === s.inst("omnimon").instanceId,
    )!;
    expect(dnaResult.stack.map((card) => card.cardId)).toEqual(["EX4-051", "EX4-046", "EX4-049"]);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === s.inst("omnimon").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  ex4CardBehaviorTests("EX4-049");
});
