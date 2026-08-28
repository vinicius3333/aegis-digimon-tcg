import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import "../cards/index.js";
import type { CardSource } from "./CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "./EffectContext.js";
import { irCardModule } from "./interpreter.js";
import { definitionOf } from "../cards/cardData.js";

/**
 * Effect-driven digivolve (e.g. BT24-009 Shamanmon's inherited "this [Demon] or [Titan]
 * Digimon may digivolve into [Titamon] or a [Titan] card in the trash") must only offer
 * digivolution targets whose requirement the base satisfies — a Lv.6 base cannot digivolve
 * into a Lv.4 [Titan] just because the `into` filter matches its trait.
 */
describe("runDigivolve candidate legality", () => {
  function permanent(cardId: string, permanentId = "BASE#1"): Permanent {
    return {
      permanentId,
      controllerSeat: 0 as Seat,
      topCard: { instanceId: `${cardId}#top`, cardId, ownerSeat: 0, faceUp: true } as never,
      stack: [] as never,
      linked: [] as never,
      baseDP: 12000,
      currentDP: 12000,
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
  }

  async function runTrashDigivolve(
    baseCardId: string,
    trashCardIds: string[],
    actionOverride: Record<string, unknown> = { payCost: true, reduceCost: 1 },
  ) {
    const recorded: { permanentId: string; intoInstanceId: string }[] = [];
    const base = permanent(baseCardId);
    const players = [
      {
        seat: 0,
        battleArea: [base],
        security: [],
        hand: [],
        deck: [],
        trash: trashCardIds.map((id) => ({ instanceId: `${id}#trash`, cardId: id, ownerSeat: 0, faceUp: true })),
      },
      { seat: 1, battleArea: [], security: [], hand: [], deck: [], trash: [] },
    ];
    const game: GameAccess = {
      state: { memory: 10, players, turnSeat: 0 } as never,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s) => (s === 0 ? 1 : 0),
      permanentById: (id) => (id === base.permanentId ? base : undefined),
      definitionOf: (card) => definitionOf(card.cardId) as CardDefinition,
      linkMax: () => 1,
    };
    const fx = {
      digivolveFromInstance: async (permanentId: string, intoInstanceId: string) => {
        recorded.push({ permanentId, intoInstanceId });
        return undefined;
      },
    } as unknown as Primitives;
    const ask = {
      selectCards: async (_ctx: unknown, opts: { candidates: string[]; max: number }) =>
        opts.candidates.slice(0, opts.max),
    };
    const source: CardSource = {
      instanceId: "INST#1",
      cardId: baseCardId,
      ownerSeat: 0 as Seat,
      definition: definitionOf(baseCardId) as CardDefinition,
      permanent: () => base as never,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    } as CardSource;
    const ctx = {
      game,
      fx,
      ask,
      source,
      ownerSeat: 0 as Seat,
    } as unknown as EffectContext;

    const module = irCardModule("Z-DIGI", {
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { controllerDefault: "mine", kind: ["Digimon"] }, count: 1 },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Titan"], match: "trait" }],
              },
              from: ["trash"],
              payCost: true,
              ...actionOverride,
            },
          ],
        },
      ],
    });
    for (const e of module.effectsForTiming(EffectTiming.OnPlay, source)) await e.resolve(ctx);
    return recorded;
  }

  /**
   * A base with nothing legal to digivolve into must not even be offered as a digivolve
   * target — picking it burns the (optional, often once-per-turn) effect for nothing.
   * Two bases, only one of which has a legal `into`, must resolve without a prompt.
   */
  it("only offers bases that have a legal card to digivolve into", async () => {
    const prompts: string[][] = [];
    const recorded: { permanentId: string; intoInstanceId: string }[] = [];
    // P-209 Titamon (Lv.6) can digivolve into BT24-081 (Lv.7 [Titan], requires Lv.6);
    // BT24-013 Fugamon (Lv.4) cannot.
    const bases = [permanent("P-209", "LEGAL#1"), permanent("BT24-013", "ILLEGAL#1")];
    const players = [
      {
        seat: 0,
        battleArea: bases,
        security: [],
        hand: [],
        deck: [],
        trash: [{ instanceId: "BT24-081#trash", cardId: "BT24-081", ownerSeat: 0, faceUp: true }],
      },
      { seat: 1, battleArea: [], security: [], hand: [], deck: [], trash: [] },
    ];
    const game: GameAccess = {
      state: { memory: 10, players, turnSeat: 0 } as never,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s) => (s === 0 ? 1 : 0),
      permanentById: (id) => bases.find((b) => b.permanentId === id),
      definitionOf: (card) => definitionOf(card.cardId) as CardDefinition,
      linkMax: () => 1,
    };
    const source: CardSource = {
      instanceId: "INST#1",
      cardId: "P-209",
      ownerSeat: 0 as Seat,
      definition: definitionOf("P-209") as CardDefinition,
      permanent: () => bases[0] as never,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    } as CardSource;
    const ctx = {
      game,
      fx: {
        digivolveFromInstance: async (permanentId: string, intoInstanceId: string) => {
          recorded.push({ permanentId, intoInstanceId });
          return undefined;
        },
      } as unknown as Primitives,
      ask: {
        chooseTargets: async (_c: unknown, opts: { candidates: string[]; max: number }) => {
          prompts.push(opts.candidates);
          return opts.candidates.slice(0, opts.max);
        },
        selectCards: async (_c: unknown, opts: { candidates: string[]; max: number }) =>
          opts.candidates.slice(0, opts.max),
      },
      source,
      ownerSeat: 0 as Seat,
    } as unknown as EffectContext;

    const module = irCardModule("Z-DIGI-POOL", {
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { controllerDefault: "mine", kind: ["Digimon"] }, count: 1 },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Titan"], match: "trait" }],
              },
              from: ["trash"],
              payCost: true,
            },
          ],
        },
      ],
    });
    for (const e of module.effectsForTiming(EffectTiming.OnPlay, source)) await e.resolve(ctx);

    // FAILS-WHEN-REVERTED: without the base pre-filter both bases are candidates, so the
    // controller is prompted and can pick ILLEGAL#1 — which then digivolves into nothing.
    expect(prompts).toEqual([]);
    expect(recorded).toEqual([{ permanentId: "LEGAL#1", intoInstanceId: "BT24-081#trash" }]);
  });

  it("does not offer a Lv.4 [Titan] target to a Lv.6 base", async () => {
    // P-209 Titamon Lv.6 base; trash holds BT24-013 Fugamon (Lv.4 [Titan]).
    const recorded = await runTrashDigivolve("P-209", ["BT24-013"]);
    expect(recorded).toHaveLength(0);
  });

  it("offers a legal-level [Titan] target (BT24-081 Lv.7 requires Lv.6)", async () => {
    const recorded = await runTrashDigivolve("P-209", ["BT24-013", "BT24-081"]);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]!.intoInstanceId).toBe("BT24-081#trash");
  });

  it("ignoreRequirements offers an off-level target (the filter is waived)", async () => {
    const recorded = await runTrashDigivolve("P-209", ["BT24-013"], {
      payCost: true,
      costOverride: 3,
      ignoreRequirements: true,
    });
    expect(recorded).toHaveLength(1);
    expect(recorded[0]!.intoInstanceId).toBe("BT24-013#trash");
  });

  it("legacy numeric payCost still enforces requirements (no ignore flag)", async () => {
    // payCost:N normalizes to a cost override but does NOT waive the requirement on its own.
    const recorded = await runTrashDigivolve("P-209", ["BT24-013"], { payCost: 3 });
    expect(recorded).toHaveLength(0);
  });
});
