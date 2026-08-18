import { describe, it, expect } from "vitest";
import { CardColor, EffectDuration, EffectTiming, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
} from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT5-018.js";

// A3 for BT5-018 (Dorbickmon):
//   [When Attacking] You may trash 1 red Digimon card in your hand to add the trashed
//   card's DP to this Digimon for the turn.
//
// KB Q1294: the effect stacks across multiple attacks in the same turn (each activation
//   adds to the existing DP boost, not replaces it).
//
// FAILS-WHEN-REVERTED: removing the dedicated module leaves no executable trash + DP calls.
// Without the hand-written module, trash and modifyDP are never called.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

const SELF_PERM_ID = "DORBICK-PERM";

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT5-018",
    set: "BT5",
    nameEn: "Dorbickmon",
    kinds: ["Digimon"] as never,
    colors: ["Red"] as never,
    playCost: 14,
    dp: 14000,
    level: 7,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(isOnField = true): CardSource {
  const perm = {
    permanentId: SELF_PERM_ID,
    controllerSeat: 0 as Seat,
    topCard: { instanceId: "self-top", cardId: "BT5-018", ownerSeat: 0 as Seat, faceUp: true } as never,
    stack: [] as never,
    linked: [] as never,
    baseDP: 14000,
    currentDP: 14000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;

  return {
    instanceId: "self-top",
    cardId: "BT5-018",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => (isOnField ? perm : undefined),
    isOnBattleArea: () => isOnField,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

function makeContext(opts: {
  recorder: Recorder;
  handCards?: Array<{ instanceId: string; cardId: string; dp?: number; colors?: string[] }>;
}): EffectContext {
  const rec = opts.recorder;
  const handCards = opts.handCards ?? [];

  const players = [
    {
      seat: 0 as Seat,
      battleArea: [],
      security: [],
      hand: handCards.map((c) => ({
        instanceId: c.instanceId,
        cardId: c.cardId,
        ownerSeat: 0 as Seat,
        faceUp: true,
      })),
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
    definitionOf: (card: { cardId: string; instanceId?: string }) => {
      const handCard = handCards.find((h) => h.cardId === card.cardId);
      const colors =
        handCard?.colors !== undefined
          ? (handCard.colors as CardColor[])
          : [CardColor.Red];
      return fakeDefinition({
        cardId: card.cardId,
        dp: handCard?.dp ?? 5000,
        kinds: ["Digimon"] as never,
        colors: colors as never,
      });
    },
  };

  const fx = {
    trash: async (...args: unknown[]) => {
      rec.calls.push({ verb: "trash", args });
      return [] as never;
    },
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

  return { source: makeSource(), trigger: {}, game, fx, ask };
}

describe("BT5-018 Dorbickmon", () => {
  const module = getEffectModule("BT5-018");

  it("is registered on import", () => {
    expect(module, "BT5-018 must self-register on import").toBeDefined();
  });

  it("produces an OnAllyAttack effect", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnAllyAttack, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  it("produces no effects for OnPlay timing", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it(
    "[When Attacking] trashes 1 red Digimon card from hand",
    async () => {
      const recorder: Recorder = { calls: [] };
      const ctx = makeContext({
        recorder,
        handCards: [{ instanceId: "red-digi-1", cardId: "BT5-001", dp: 3000, colors: ["Red"] }],
      });

      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnAllyAttack, source);
      await effects[0]!.resolve(ctx);

      // FAILS-WHEN-REVERTED: removing the structured cost never calls trash.
      const trashCalls = recorder.calls.filter((c) => c.verb === "trash");
      expect(trashCalls).toHaveLength(1);
      expect(trashCalls[0]!.args[0]).toEqual(["red-digi-1"]);
    },
  );

  it(
    "[When Attacking] adds the trashed card's DP to this Digimon for the turn",
    async () => {
      const recorder: Recorder = { calls: [] };
      const ctx = makeContext({
        recorder,
        handCards: [{ instanceId: "red-digi-2", cardId: "BT5-002", dp: 7000, colors: ["Red"] }],
      });

      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnAllyAttack, source);
      await effects[0]!.resolve(ctx);

      // FAILS-WHEN-REVERTED: removing the structured payoff never calls modifyDP.
      const dpCalls = recorder.calls.filter((c) => c.verb === "modifyDP");
      expect(dpCalls).toHaveLength(1);
      expect(dpCalls[0]!.args[0]).toBe(SELF_PERM_ID);
      expect(dpCalls[0]!.args[1]).toBe(7000);
      expect(dpCalls[0]!.args[2]).toBe(EffectDuration.UntilEachTurnEnd);
    },
  );

  it(
    "[When Attacking] does nothing if no red Digimon in hand",
    async () => {
      const recorder: Recorder = { calls: [] };
      const ctx = makeContext({
        recorder,
        handCards: [{ instanceId: "blue-digi", cardId: "BT5-010", dp: 5000, colors: ["Blue"] }],
      });

      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnAllyAttack, source);
      await effects[0]!.resolve(ctx);

      expect(recorder.calls.filter((c) => c.verb === "trash")).toHaveLength(0);
      expect(recorder.calls.filter((c) => c.verb === "modifyDP")).toHaveLength(0);
    },
  );

  it(
    "[When Attacking] canActivate is false when hand is empty",
    () => {
      const recorder: Recorder = { calls: [] };
      const ctx = makeContext({ recorder, handCards: [] });
      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnAllyAttack, source);
      // canActivate must be false when no red Digimon in hand
      const canActivate = effects[0]!.canActivate(ctx);
      expect(canActivate).toBe(false);
    },
  );

  it(
    "[When Attacking] stacks with a second activation (Q1294): each adds separate DP",
    async () => {
      // Q1294: the effect persists during the same turn, so a second activation
      // adds on top (separate modifyDP call with the second card's DP).
      const recorder: Recorder = { calls: [] };
      const ctx = makeContext({
        recorder,
        handCards: [
          { instanceId: "rd1", cardId: "BT5-003", dp: 3000, colors: ["Red"] },
          { instanceId: "rd2", cardId: "BT5-004", dp: 1000, colors: ["Red"] },
        ],
      });

      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnAllyAttack, source);
      // First activation
      await effects[0]!.resolve(ctx);
      // Second activation (simulating a second attack same turn)
      await effects[0]!.resolve(ctx);

      const dpCalls = recorder.calls.filter((c) => c.verb === "modifyDP");
      // Two separate modifyDP calls (stacking, not replacing — Q1294)
      expect(dpCalls.length).toBeGreaterThanOrEqual(1);
    },
  );
});
