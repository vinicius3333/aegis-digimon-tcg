import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CompiledCard, type Seat } from "@aegis/shared";
import type { CardSource } from "./effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "./effects/EffectContext.js";
import { irCardModule } from "./effects/interpreter.js";


interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "X-SEARCH",
    set: "X",
    nameEn: "X",
    kinds: [],
    colors: [],
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#1",
    cardId: "X-SEARCH",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

function fakeContext(recorder: Recorder): EffectContext {
  const players = [
    { seat: 0, battleArea: [], security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];
  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: () => undefined,
    definitionOf: (card) => fakeDefinition({ cardId: card.cardId }),
    linkMax: () => 1,
  };
  const fx = {
    searchDeck: async (...a: unknown[]) => {
      recorder.calls.push({ verb: "searchDeck", args: a });
      return [];
    },
  } as unknown as Primitives;
  return {
    game,
    fx,
    source: fakeSource(),
    ask: {
      optional: async () => true,
      chooseTargets: async () => [],
      selectCards: async () => [],
      chooseOption: async () => 0,
    },
  } as unknown as EffectContext;
}

describe("Search IR-kind dispatch guard (07-03 — no faithful in-catalog vehicle)", () => {
  it("dispatches a Search action to ctx.fx.searchDeck (the branch is wired, not dead)", async () => {
    const compiled: CompiledCard = {
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Search",
              filter: { kind: ["Digimon"], levels: [4] },
              count: 1,
            } as never,
          ],
        },
      ],
    } as CompiledCard;

    const recorder: Recorder = { calls: [] };
    const source = fakeSource();
    const ctx = fakeContext(recorder);
    const effects = irCardModule("X-SEARCH", compiled).effectsForTiming(EffectTiming.OnPlay, source);
    expect(effects).toHaveLength(1);

    await effects[0]!.resolve(ctx);

    const searches = recorder.calls.filter((c) => c.verb === "searchDeck");
    expect(searches, "Search IR kind must dispatch searchDeck").toHaveLength(1);
  });
});
