import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CompiledCard, type Permanent, type Seat } from "@aegis/shared";
import { irCardModule } from "./interpreter.js";
import { type DecisionApi, type EffectContext, type GameAccess, type Primitives } from "./EffectContext.js";
import type { CardSource } from "./CardSource.js";

/**
 * Behavioral coverage for the engine capabilities added for the 2026-06-16 runtime-effect batch
 * (5-lane wave). Each capability is exercised end-to-end through `irCardModule(...).resolve`,
 * so a revert of the interpreter branch fails the corresponding test.
 *
 *   - DeleteLevelBudget        (BT17-051): delete opponent Digimon whose LEVELS sum to <= budget,
 *                                          budget scaled +budgetAdd per `per` digivolution cards.
 *   - filter.hasLevel          (BT17-051): Lv.- (level 0/undefined) candidates excluded.
 *   - scaling digivolutionCardColors (BT18-018): multiplier = distinct colors under the source.
 *   - scaling usePaidCount     (BT17-041): multiplier = cards the cost actually suspended.
 *   - filter.digivolutionStackKind (BT17-090): only permanents with a Tamer card underneath.
 *   - filter.excludeCardsNamed (BT17-100): reject permanents with a named card underneath.
 *   - filter.digivolutionCards "hasNone" (BT17-064/100): only empty-stack permanents.
 *   - target.orFilters         (BT17-074): a candidate qualifies via the primary OR an alternative.
 */

interface DefShape {
  level?: number;
  colors?: string[];
  kinds?: string[];
}
const DEFS: Record<string, DefShape> = {
  // Argomon (BT17-051) battle-area level-budget delete candidates
  OPP_L2: { level: 2, kinds: ["Digimon"] },
  OPP_L3: { level: 3, kinds: ["Digimon"] },
  OPP_L0: { level: 0, kinds: ["Digimon"] }, // Lv.- (excluded by hasLevel)
  SRC: { level: 6, colors: ["Red"], kinds: ["Digimon"] },
  // colored digivolution-stack cards (for digivolutionCardColors)
  RED: { level: 3, colors: ["Red"], kinds: ["Digimon"] },
  BLUE: { level: 3, colors: ["Blue"], kinds: ["Digimon"] },
  GREEN: { level: 3, colors: ["Green"], kinds: ["Digimon"] },
  TAMER: { kinds: ["Tamer"] },
  DIGI: { level: 3, colors: ["Red"], kinds: ["Digimon"] },
  DOOM: { kinds: ["Option"] }, // "Doomsday Clock"
};
const NAMES: Record<string, string> = { DOOM: "Doomsday Clock" };

function def(cardId: string): CardDefinition {
  const d = DEFS[cardId] ?? {};
  return {
    cardId,
    set: "T",
    nameEn: NAMES[cardId] ?? cardId,
    kinds: (d.kinds ?? ["Digimon"]) as never,
    colors: (d.colors ?? []) as never,
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    level: d.level,
  };
}

function perm(permanentId: string, seat: Seat, cardId: string, stackCardIds: string[] = []): Permanent {
  return {
    permanentId,
    controllerSeat: seat,
    topCard: { instanceId: `${permanentId}#i`, cardId, ownerSeat: seat, faceUp: true } as never,
    stack: stackCardIds.map((c, i) => ({
      instanceId: `${permanentId}#s${i}`,
      cardId: c,
      ownerSeat: seat,
      faceUp: false,
    })) as never,
    linked: [] as never,
    baseDP: 0,
    currentDP: 0,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

interface Sink {
  deleted: string[][];
  suspended: string[][];
  dp: { id: string; amount: number }[];
}

function makeCtx(opts: { source: CardSource; own?: Permanent[]; opponent?: Permanent[] }): {
  ctx: EffectContext;
  sink: Sink;
} {
  const sink: Sink = { deleted: [], suspended: [], dp: [] };
  const players = [
    { seat: 0, battleArea: opts.own ?? [], security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: opts.opponent ?? [], security: [], hand: [], deck: [], trash: [] },
  ];
  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0),
    permanentById: (id: string) =>
      [...players[0]!.battleArea, ...players[1]!.battleArea].find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => def(card.cardId),
    linkMax: () => 1,
  } as never;
  const fx = {
    deletePermanent: async (ids: string[]) => {
      sink.deleted.push(ids);
      return ids.length;
    },
    suspend: async (ids: string[]) => {
      sink.suspended.push(ids);
      return ids;
    },
    modifyDP: (id: string, amount: number) => {
      sink.dp.push({ id, amount });
    },
    trashFromDigivolution: async () => 0,
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  return {
    ctx: { source: opts.source, trigger: {}, game, fx, ask, selections: new Map() },
    sink,
  };
}

function source(cardId: string, p?: Permanent): CardSource {
  return {
    instanceId: "S#i",
    cardId,
    ownerSeat: 0 as Seat,
    definition: def(cardId),
    permanent: () => p,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } as never;
}

async function runMain(cardId: string, actions: unknown[], ctx: EffectContext, src: CardSource): Promise<void> {
  const card = { coverage: "full", residual: [], effects: [{ trigger: "Main", actions }] } as never as CompiledCard;
  const effects = irCardModule(cardId, card).effectsForTiming(EffectTiming.OnUseOption, src);
  await effects[0]!.resolve(ctx);
}

describe("DeleteLevelBudget (BT17-051) + filter.hasLevel", () => {
  it("deletes opponent Digimon whose levels sum to <= budget, scaled by digivolution cards", async () => {
    // Source has 2 [Argomon] digivolution cards => +1 to the base budget of 4 (per 2 => +1).
    // The two stack cards must match the scaling filter (name [SRC]) for the +1 to apply.
    const src = source("BT17-051", perm("SRC", 0 as Seat, "SRC", ["SRC", "SRC"]));
    const opponent = [
      perm("OPP_A", 1 as Seat, "OPP_L2"),
      perm("OPP_B", 1 as Seat, "OPP_L3"),
      perm("OPP_LL", 1 as Seat, "OPP_L0"), // Lv.- — must be excluded by hasLevel
    ];
    const { ctx, sink } = makeCtx({ source: src, own: [src.permanent()!], opponent });
    await runMain(
      "BT17-051",
      [
        {
          kind: "DeleteLevelBudget",
          filter: { controller: "opponent", kind: ["Digimon"], hasLevel: true },
          baseBudget: 4,
          upTo: true,
          scaling: {
            per: 2,
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["SRC"], match: "name" }] },
            unit: "digivolutionCards",
            budgetAdd: 1,
          },
        },
      ],
      ctx,
      src,
    );
    // Budget = 4 + floor(2/2)*1 = 5. Levels 2 + 3 = 5 fit; the Lv.- candidate is never offered.
    expect(sink.deleted.flat().sort()).toEqual(["OPP_A", "OPP_B"]);
    expect(sink.deleted.flat()).not.toContain("OPP_LL");
  });

  it("excludes a target whose level overflows the budget", async () => {
    const src = source("BT17-051", perm("SRC", 0 as Seat, "SRC", [])); // 0 digi cards => budget 4
    const opponent = [perm("OPP_A", 1 as Seat, "OPP_L2"), perm("OPP_B", 1 as Seat, "OPP_L3")];
    const { ctx, sink } = makeCtx({ source: src, own: [src.permanent()!], opponent });
    await runMain(
      "BT17-051b",
      [
        {
          kind: "DeleteLevelBudget",
          filter: { controller: "opponent", kind: ["Digimon"], hasLevel: true },
          baseBudget: 4,
          upTo: true,
        },
      ],
      ctx,
      src,
    );
    // Budget 4: only level 2 + ... level 3 would total 5 (> 4). Cheapest-first picks L2, then L3
    // overflows => excluded. Just L2 fits.
    expect(sink.deleted.flat()).toEqual(["OPP_A"]);
  });
});

describe("scaling unit digivolutionCardColors (BT18-018)", () => {
  it.each([true, false])("counts distinct colors only when source cards are face up (%s)", async (faceUp) => {
    // 3 distinct colors (Red, Blue, Green) among 4 digivolution cards => x3.
    const src = source("BT18-018", perm("SRC", 0 as Seat, "SRC", ["RED", "BLUE", "GREEN", "RED"]));
    for (const card of src.permanent()!.stack) card.faceUp = faceUp;
    const opponent = [perm("OPP_A", 1 as Seat, "OPP_L3")];
    const { ctx, sink } = makeCtx({ source: src, own: [src.permanent()!], opponent });
    await runMain(
      "BT18-018",
      [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -1000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: { isSelfRef: true, zone: "digivolutionCards" },
            unit: "digivolutionCardColors",
          },
        },
      ],
      ctx,
      src,
    );
    expect(sink.dp).toEqual(faceUp ? [{ id: "OPP_A", amount: -3000 }] : []);
  });
});

describe("scaling usePaidCount (BT17-041)", () => {
  it("scales by the number of cards the suspend cost actually paid", async () => {
    const src = source("BT17-041", perm("SRC", 0 as Seat, "SRC"));
    // One yellow Tamer available to suspend; the upTo-2 cost suspends 1 => scale 1.
    const myTamer = perm("MY_TAMER", 0 as Seat, "TAMER");
    const opponent = [perm("OPP_A", 1 as Seat, "OPP_L3")];
    const { ctx, sink } = makeCtx({ source: src, own: [src.permanent()!, myTamer], opponent });
    await runMain(
      "BT17-041",
      [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -5000,
          duration: "forTheTurn",
          cost: {
            kind: "suspend",
            target: { filter: { controller: "mine", kind: ["Tamer"] }, count: 2, upTo: true },
          },
          scaling: { per: 1, usePaidCount: true, unit: "cards" },
        },
      ],
      ctx,
      src,
    );
    expect(sink.suspended.flat()).toEqual(["MY_TAMER"]);
    expect(sink.dp).toEqual([{ id: "OPP_A", amount: -5000 }]); // 1 suspended * -5000
  });
});

describe("filter.digivolutionStackKind (BT17-090)", () => {
  it("matches only a Digimon with a Tamer card in its digivolution stack", async () => {
    const src = source("BT17-090", perm("SRC", 0 as Seat, "SRC"));
    const withTamer = perm("WITH_TAMER", 0 as Seat, "DIGI", ["TAMER"]);
    const withoutTamer = perm("NO_TAMER", 0 as Seat, "DIGI", ["RED"]);
    const { ctx, sink } = makeCtx({ source: src, own: [src.permanent()!, withTamer, withoutTamer] });
    await runMain(
      "BT17-090",
      [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"], digivolutionStackKind: ["Tamer"] }, count: "all" },
          amount: 1000,
          duration: "forTheTurn",
        },
      ],
      ctx,
      src,
    );
    const touched = sink.dp.map((d) => d.id);
    expect(touched).toContain("WITH_TAMER");
    expect(touched).not.toContain("NO_TAMER");
    expect(touched).not.toContain("SRC");
  });
});

describe("filter.excludeCardsNamed + digivolutionCards hasNone (BT17-100)", () => {
  it("rejects a permanent that has the named card underneath", async () => {
    const src = source("BT17-100", perm("SRC", 0 as Seat, "SRC"));
    const clean = perm("CLEAN", 0 as Seat, "DIGI", []); // empty stack
    const tainted = perm("TAINTED", 0 as Seat, "DIGI", ["DOOM"]); // has Doomsday Clock
    const { ctx, sink } = makeCtx({ source: src, own: [src.permanent()!, clean, tainted] });
    await runMain(
      "BT17-100",
      [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              digivolutionCards: "hasNone",
              excludeCardsNamed: ["Doomsday Clock"],
            },
            count: "all",
          },
          amount: 1000,
          duration: "forTheTurn",
        },
      ],
      ctx,
      src,
    );
    const touched = sink.dp.map((d) => d.id);
    expect(touched).toContain("CLEAN");
    expect(touched).not.toContain("TAINTED");
  });
});

describe("target.orFilters union (BT17-074)", () => {
  it("matches a candidate via the primary OR an alternative filter", async () => {
    const src = source("BT17-074", perm("SRC", 0 as Seat, "SRC"));
    const tamer = perm("MY_TAMER", 0 as Seat, "TAMER"); // matches primary (Tamer)
    const digi = perm("MY_DIGI", 0 as Seat, "DIGI"); // matches orFilters alternative (Digimon)
    const { ctx, sink } = makeCtx({ source: src, own: [src.permanent()!, tamer, digi] });
    await runMain(
      "BT17-074",
      [
        {
          kind: "ModifyDP",
          target: {
            filter: { controller: "mine", kind: ["Tamer"] },
            orFilters: [{ controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DIGI"], match: "name" }] }],
            count: "all",
          },
          amount: 1000,
          duration: "forTheTurn",
        },
      ],
      ctx,
      src,
    );
    const touched = sink.dp.map((d) => d.id);
    expect(touched).toContain("MY_TAMER");
    expect(touched).toContain("MY_DIGI");
  });
});
