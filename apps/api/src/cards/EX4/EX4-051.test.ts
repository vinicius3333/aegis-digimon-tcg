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
import { compiled } from "./EX4-051.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

function card(cardId: string, ownerSeat: Seat): CardInstance {
  return { cardId, instanceId: `${cardId}-${ownerSeat}`, ownerSeat, faceUp: true } as CardInstance;
}

function definition(cardId: string): CardDefinition {
  return {
    cardId,
    set: "TEST",
    nameEn: cardId,
    kinds: [CardKind.Digimon],
    colors: ["Black"] as never,
    playCost: 5,
    dp: 1000,
    level: 5,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

describe("EX4-051 BlitzGreymon", () => {
  it("uses the compiled IR registration for all three When Digivolving modes", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0];
    expect(action).toMatchObject({
      kind: "Modal",
      options: [
        [
          {
            kind: "DeDigivolve",
            target: { count: 3, forceSelection: true },
            amount: 1,
            condition: { kind: "opponentHas", countMin: 3 },
          },
        ],
        [{ kind: "Digivolve", payCost: false, from: ["hand"] }],
        [{ kind: "DnaDigivolve", payCost: true, materials: [{ count: 1 }, { count: 1 }] }],
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["MetalGreymon"], cost: 3, isAlternate: true },
    ]);
  });

  it("can De-Digivolve up to three opposing Digimon through modal option one", async () => {
    const selfCard = card("EX4-051", 0);
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: selfCard,
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const opponents = ["A", "B", "C"].map(
      (id) =>
        ({
          permanentId: id,
          controllerSeat: 1,
          topCard: card(id, 1),
          stack: [],
          linked: [],
          isSuspended: false,
          inBreeding: false,
        }) as unknown as Permanent,
    );
    const players = [
      { battleArea: [self], security: [], hand: [], deck: [], trash: [] },
      { battleArea: opponents, security: [], hand: [], deck: [], trash: [] },
    ];
    const definitions = new Map<string, CardDefinition>([
      ["EX4-051", definition("EX4-051")],
      ...opponents.map((p) => [p.topCard!.cardId, definition(p.topCard!.cardId)] as const),
    ]);
    const calls: Array<[string, number]> = [];
    const targetRequests: Array<{ min: number; max: number }> = [];
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [self, ...opponents].find((permanent) => permanent.permanentId === id),
      definitionOf: (instance: CardInstance) => definitions.get(instance.cardId)!,
    } as unknown as GameAccess;
    const fx = {
      deDigivolve: (id: string, amount: number) => {
        calls.push([id, amount]);
      },
    } as unknown as Primitives;
    const ask: DecisionApi = {
      optional: async () => true,
      chooseOption: async () => 0,
      chooseTargets: async (_ctx, options) => {
        targetRequests.push({ min: options.min, max: options.max });
        return options.candidates.slice(0, options.max);
      },
      selectCards: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectPermanents: async (_ctx, options) => options.candidates.slice(0, options.max),
    };
    const source: CardSource = {
      instanceId: selfCard.instanceId,
      cardId: "EX4-051",
      ownerSeat: 0 as Seat,
      definition: definitions.get("EX4-051")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const effect = getEffectModule("EX4-051")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve(ctx);
    expect(calls).toEqual([
      ["A", 1],
      ["B", 1],
      ["C", 1],
    ]);
    expect(targetRequests).toEqual([{ min: 3, max: 3 }]);
  });

  it("does nothing when fewer than three opposing Digimon exist", async () => {
    const selfCard = card("EX4-051", 0);
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: selfCard,
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const opponents = ["A", "B"].map(
      (id) =>
        ({
          permanentId: id,
          controllerSeat: 1,
          topCard: card(id, 1),
          stack: [],
          linked: [],
          isSuspended: false,
          inBreeding: false,
        }) as unknown as Permanent,
    );
    const players = [
      { battleArea: [self], security: [], hand: [], deck: [], trash: [] },
      { battleArea: opponents, security: [], hand: [], deck: [], trash: [] },
    ];
    const definitions = new Map<string, CardDefinition>([
      ["EX4-051", definition("EX4-051")],
      ...opponents.map((p) => [p.topCard!.cardId, definition(p.topCard!.cardId)] as const),
    ]);
    const calls: string[] = [];
    const game = {
      state: { memory: 0, players, turnSeat: 0 as Seat },
      player: (seat: Seat) => players[seat],
      opponentOf: () => 1 as Seat,
      permanentById: (id: string) => [self, ...opponents].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => definitions.get(c.cardId)!,
    } as unknown as GameAccess;
    const source: CardSource = {
      instanceId: selfCard.instanceId,
      cardId: "EX4-051",
      ownerSeat: 0 as Seat,
      definition: definitions.get("EX4-051")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-051")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve({
      source,
      trigger: {},
      game,
      fx: { deDigivolve: (id: string) => calls.push(id) } as unknown as Primitives,
      ask: {
        chooseOption: async () => 0,
        chooseTargets: async () => [],
        selectCards: async () => [],
        selectPermanents: async () => [],
        optional: async () => true,
      },
    } as unknown as EffectContext);
    expect(calls).toEqual([]);
  });

  it("publicly De-Digivolves exactly three opposing Digimon through a real digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-021", as: "base" }],
          hand: [{ card: "EX4-051", as: "subject" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "first", under: [{ card: "BT1-009", as: "firstUnder" }] },
            { card: "BT1-020", as: "second", under: [{ card: "BT1-009", as: "secondUnder" }] },
            { card: "BT1-020", as: "third", under: [{ card: "BT1-009", as: "thirdUnder" }] },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 10;
    await s.ready();
    const trashedIds = ["first", "second", "third"].map((alias) => s.perm(alias).topCard!.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("subject").instanceId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard?.cardId === "EX4-051" && s.perm("first").stack.length === 0);

    expect(s.perm("base").topCard?.cardId).toBe("EX4-051");
    expect(["first", "second", "third"].map((alias) => s.perm(alias).stack.length)).toEqual([0, 0, 0]);
    expect(["first", "second", "third"].map((alias) => s.perm(alias).topCard?.cardId)).toEqual([
      "BT1-009",
      "BT1-009",
      "BT1-009",
    ]);
    expect(s.state.players[1]!.trash.map((entry) => entry.cardId)).toEqual(["BT1-020", "BT1-020", "BT1-020"]);
    expect(
      trashedIds.every((instanceId) => s.state.players[1]!.trash.some((entry) => entry.instanceId === instanceId)),
    ).toBe(true);
  });

  it("publicly skips mode one when fewer than three opposing Digimon are present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-021", as: "base" }],
          hand: [{ card: "EX4-051", as: "subject" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "first", under: [{ card: "BT1-009", as: "firstUnder" }] },
            { card: "BT1-020", as: "second", under: [{ card: "BT1-009", as: "secondUnder" }] },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("subject").instanceId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard?.cardId === "EX4-051");

    expect(["first", "second"].map((alias) => s.perm(alias).stack.length)).toEqual([1, 1]);
    expect(s.state.players[1]!.trash.filter((entry) => entry.cardId === "BT1-009")).toHaveLength(0);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-051");
    expect(s.state.players[0]!.hand.some((handCard) => handCard.instanceId === s.inst("subject").instanceId)).toBe(
      false,
    );
  });

  it("publicly resolves modal mode two by digivolving another Digimon into Garurumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-051", as: "subject" },
            { card: "BT1-029", as: "target" },
          ],
          hand: [{ card: "ST2-06", as: "garurumon" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [{ card: "BT1-009" }, { card: "BT1-013" }, { card: "BT1-015" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("subject"));
    await settle(() => s.perm("target").topCard?.cardId === "ST2-06");
    expect(s.perm("target").topCard?.cardId).toBe("ST2-06");
    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === s.inst("garurumon").instanceId)).toBe(false);
  });

  it("publicly resolves modal mode three through DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-051", as: "subject" },
            { card: "EX4-049", as: "partner" },
            { card: "BT1-029", as: "target" },
          ],
          hand: [
            { card: "EX4-060", as: "omnimon" },
            { card: "ST2-06", as: "garurumon" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [{ card: "BT1-009" }, { card: "BT1-013" }, { card: "BT1-015" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 2 },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("subject"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-060"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-060")).toBe(true);
    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === s.inst("omnimon").instanceId)).toBe(false);
  });

  it("publicly resolves the inherited Omnimon attack watcher and trashes one security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-073", as: "attacker", under: ["EX4-051"] }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT1-020", dp: 20000, suspended: true, as: "victim" },
            { card: "BT1-025", as: "tooHigh" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-010"],
        },
      },
      // Decline EX4-073's own optional attack effect so it does not trash the inherited card
      // before EX4-051's inherited watcher resolves in the same attack window.
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-020")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-025")).toBe(true);
  });

  it("does not fire the inherited watcher when the host is not Omnimon-named", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker", under: ["EX4-051"] }] },
      1: {
        battleArea: [{ card: "BT1-020", dp: 20000, suspended: true }],
        security: ["BT1-001", "BT1-002", "BT1-003", "BT1-010"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.state.players[1]!.battleArea[0]!.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.security).toHaveLength(4);
  });

  it("consumes the inherited watcher only once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-084", dp: 25000, as: "attacker", under: ["EX4-051"] }] },
        1: {
          battleArea: [{ card: "BT1-020", dp: 10000, suspended: true, as: "firstTarget" }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const attack = (targetPermanentId: string) =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: targetPermanentId },
      });
    expect(attack(s.perm("firstTarget").permanentId)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);
    const secondTarget = s.putOnBoard(1, { card: "BT1-020", dp: 10000, suspended: true, as: "secondTarget" });
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(attack(secondTarget.permanentId)).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length === 2);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });
  ex4CardBehaviorTests("EX4-051");
});
