import { describe, it, expect } from "vitest";
import { CardColor, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
} from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-042.js";

// A3 for BT6-042 (Babamon):
//   [On Deletion] You may play 1 [Rosemon] or up to 2 yellow level 3 Digimon cards from
//   your hand without paying their memory costs.
//
// documented behavior confirms: the two groups are MUTUALLY EXCLUSIVE (can't mix Rosemon + Yellow Lv.3),
// and max 1 Rosemon or max 2 Yellow Lv.3 can be played.
//
// FAILS-WHEN-REVERTED: removing the dedicated module leaves no executable playInstances call.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT6-042",
    set: "BT6",
    nameEn: "Babamon",
    kinds: ["Digimon"] as never,
    colors: ["Yellow"] as never,
    playCost: 10,
    dp: 9000,
    level: 5,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

type HandCardSpec = {
  instanceId: string;
  cardId: string;
  nameEn?: string;
  level?: number;
  colors?: string[];
  kinds?: string[];
};

function makeSource(opts: { isOwnerDeleted?: boolean } = {}): CardSource {
  return {
    instanceId: "babamon-inst",
    cardId: "BT6-042",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeContext(opts: {
  recorder: Recorder;
  handCards?: HandCardSpec[];
  selectMax?: number;
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
    definitionOf: (card: { cardId: string }) => {
      const spec = handCards.find((h) => h.cardId === card.cardId);
      if (spec) {
        return fakeDefinition({
          cardId: card.cardId,
          nameEn: spec.nameEn ?? card.cardId,
          level: spec.level,
          colors: (spec.colors as CardColor[]) ?? [CardColor.Yellow],
          kinds: (spec.kinds as never) ?? ["Digimon"],
        });
      }
      return fakeDefinition({ cardId: card.cardId });
    },
  };

  const fx = {
    playInstances: async (...args: unknown[]) => {
      rec.calls.push({ verb: "playInstances", args });
      return [] as never;
    },
  } as unknown as Primitives;

  const selectMax = opts.selectMax ?? 2;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, Math.min(o.max, selectMax)),
    chooseOption: async () => 0,
  };

  const source = makeSource();
  return {
    source,
    trigger: { deletedInstanceIds: ["babamon-inst"] },
    game,
    fx,
    ask,
  };
}

describe("BT6-042 Babamon", () => {
  const module = getEffectModule("BT6-042");

  it("is registered on import", () => {
    expect(module, "BT6-042 must self-register on import").toBeDefined();
  });

  it("produces an OnDestroyedAnyone effect", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  it("produces no effects for OnPlay timing", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it("the OnDeletion effect is optional", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    expect(effects[0]!.optional).toBe(true);
  });

  it(
    "[On Deletion] plays 1 [Rosemon] from hand without cost",
    async () => {
      const recorder: Recorder = { calls: [] };
      const ctx = makeContext({
        recorder,
        handCards: [
          { instanceId: "rosemon-1", cardId: "ROSE-001", nameEn: "Rosemon", level: 6, colors: ["Yellow"] },
        ],
        selectMax: 1,
      });

      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
      await effects[0]!.resolve(ctx);

      // FAILS-WHEN-REVERTED: old IR has no playInstances call
      const playCalls = recorder.calls.filter((c) => c.verb === "playInstances");
      expect(playCalls).toHaveLength(1);
      expect(playCalls[0]!.args[0]).toEqual(["rosemon-1"]);
      expect((playCalls[0]!.args[1] as { payCost?: boolean }).payCost).toBe(false);
    },
  );

  it(
    "[On Deletion] plays up to 2 yellow Lv.3 Digimon from hand without cost",
    async () => {
      const recorder: Recorder = { calls: [] };
      const ctx = makeContext({
        recorder,
        handCards: [
          { instanceId: "ylv3-1", cardId: "BT6-010", nameEn: "YellowChild1", level: 3, colors: ["Yellow"], kinds: ["Digimon"] },
          { instanceId: "ylv3-2", cardId: "BT6-011", nameEn: "YellowChild2", level: 3, colors: ["Yellow"], kinds: ["Digimon"] },
        ],
        selectMax: 2,
      });

      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
      await effects[0]!.resolve(ctx);

      const playCalls = recorder.calls.filter((c) => c.verb === "playInstances");
      expect(playCalls).toHaveLength(1);
      expect((playCalls[0]!.args[0] as string[]).length).toBe(2);
      expect((playCalls[0]!.args[1] as { payCost?: boolean }).payCost).toBe(false);
    },
  );

  it(
    "[On Deletion] canActivate is false when hand has no eligible cards",
    () => {
      const recorder: Recorder = { calls: [] };
      const ctx = makeContext({
        recorder,
        handCards: [
          // Red Lv.5 Digimon — neither Rosemon nor yellow Lv.3
          { instanceId: "red-digi", cardId: "BT5-001", nameEn: "RedDigimon", level: 5, colors: ["Red"] },
        ],
      });

      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
      const canActivate = effects[0]!.canActivate(ctx);
      expect(canActivate).toBe(false);
    },
  );

  it(
    "[On Deletion] canActivate is false when hand is empty",
    () => {
      const recorder: Recorder = { calls: [] };
      const ctx = makeContext({ recorder, handCards: [] });
      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
      expect(effects[0]!.canActivate(ctx)).toBe(false);
    },
  );

  it(
    "[On Deletion] mutual exclusion: if Rosemon chosen, only 1 Rosemon is played (not Yellow Lv.3 too)",
    async () => {
      const recorder: Recorder = { calls: [] };
      // Both Rosemon and Yellow Lv.3 in hand; selectMax=2 → controller picks both,
      // but the module must enforce mutual exclusion (only 1 Rosemon played).
      const ctx = makeContext({
        recorder,
        handCards: [
          { instanceId: "rosemon-inst", cardId: "ROSE-001", nameEn: "Rosemon", level: 6, colors: ["Yellow"] },
          { instanceId: "ylv3-inst", cardId: "BT6-010", nameEn: "YellowChild", level: 3, colors: ["Yellow"], kinds: ["Digimon"] },
        ],
        selectMax: 2,
      });

      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
      await effects[0]!.resolve(ctx);

      const playCalls = recorder.calls.filter((c) => c.verb === "playInstances");
      expect(playCalls).toHaveLength(1);
      // Only the Rosemon (first selected) should be played (mutual exclusion enforced)
      const played = playCalls[0]!.args[0] as string[];
      expect(played).toContain("rosemon-inst");
      expect(played).toHaveLength(1); // Rosemon only, not the Yellow Lv.3
    },
  );

  it("publishes mutually exclusive branches and only yellow Lv.3 candidates for that branch", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-042", as: "babamon" }],
        hand: [
          { card: "BT1-082", as: "rosemon" },
          { card: "BT6-031", as: "yellowA" },
          { card: "BT6-032", as: "yellowB" },
        ],
      },
    });
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("babamon").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "optional", accept: true },
    })).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const branch = s.state.pendingDecision!;
    expect(JSON.parse(branch.payloadJson)).toMatchObject({
      choices: ["Play 1 [Rosemon]", "Play up to 2 yellow level 3 Digimon"],
    });
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: branch.decisionId,
      response: { kind: "chooseOption", optionIndex: 1 },
    })).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.state.pendingDecision!;
    const payload = JSON.parse(selection.payloadJson) as {
      min: number;
      max: number;
      candidateInstanceIds: string[];
    };
    expect(payload).toMatchObject({ min: 1, max: 2 });
    expect(payload.candidateInstanceIds).toEqual([
      s.inst("yellowA").instanceId,
      s.inst("yellowB").instanceId,
    ]);
    expect(payload.candidateInstanceIds).not.toContain(s.inst("rosemon").instanceId);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: selection.decisionId,
      response: {
        kind: "selectCards",
        instanceIds: [s.inst("yellowA").instanceId, s.inst("yellowB").instanceId],
      },
    })).toEqual({ ok: true });
    await deletion;

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(
      expect.arrayContaining([s.inst("yellowA").instanceId, s.inst("yellowB").instanceId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("rosemon").instanceId,
    ]);
  });
});
