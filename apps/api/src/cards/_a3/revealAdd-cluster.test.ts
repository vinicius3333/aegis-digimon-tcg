import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type GameState, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
  SubTriggerInstall,
} from "../../engine/effects/EffectContext.js";

// Import each registered revealAdd card module so it self-registers on the registry.
// ORC-02 cluster (Phase 9)
import "../BT1/BT1-048.js";
import "../BT12/BT12-045.js";
import "../BT16/BT16-082.js";
import "../BT5/BT5-046.js";
import "../BT5/BT5-049.js";
import "../BT6/BT6-005.js";
import "../BT7/BT7-009.js";
import "../EX2/EX2-030.js";
import "../ST15/ST15-04.js";
import "../ST4/ST4-03.js";
// 10.1-01 cluster (Phase 10.1 — revealSpan + per-condition-class fix)
import "../LM/LM-033.js";
import "../LM/LM-045.js";
import "../BT10/BT10-097.js";
import "../EX7/EX7-048.js";
import "../P/P-112.js";
import "../ST17/ST17-11.js";
import "../ST21/ST21-14.js";

// ---------------------------------------------------------------------------
// RevealAdd cluster A3 — the EXIT proof for the 10 ORC-02 revealAdd cards.
// ---------------------------------------------------------------------------
//
// Each card is driven through its REGISTERED module (getEffectModule, imported
// above so it self-registers) and the engine interpreter's runRevealAdd path —
// NOT a hand-built IR literal. This is the Pitfall-3 requirement: a recognizer
// regression must be observable through this test, so the test must execute the
// same IR the catalog ships.
//
// What is asserted per card:
//   (i)  reveal(seat, revealCount) is called with the card's revealCount.
//   (ii) the matching revealed instanceIds are added to hand (returnToHand).
//   (iii) the non-matching revealed cards go to the correct rest zone:
//          - ST15-04 -> TRASH (fx.trash)
//          - the other 9 (incl. BT16-082) -> deck BOTTOM (returnToDeck, toTop falsy)
//   For the three multi-add cards (BT1-048, BT5-049, EX2-030) the reveal stages
//   >= 2 matching cards and the test asserts ALL of them land in hand (the
//   count:"all" / ProcessForAll maxCount:-1 semantics — NOT just one).
//   For BT16-082 the test also asserts the optional Hatch tail runs (fx.hatch).
//
// FAILS-WHEN-REVERTED LEVER (the honesty contract — the oracle score is a proxy,
// never the exit):
//   The 09-01 fix widened the documented behavior->IR reveal recognizer so these 10 cards compile
//   to faithful `RevealAdd` IR. Reverting that recognizer widening (actions.mjs)
//   — or equivalently restoring the pre-09-01 IR — recompiles every one of these
//   cards to a bare `Return { filter:{ zone:"trash" }, to:"hand" }`. That IR routes
//   to the engine's Return action, which walks battleArea/trash and NEVER calls
//   reveal / returnToHand on a deck-top slice. With the recognizer reverted:
//     - the `reveal` assertions go RED (no reveal call is ever made), and
//     - the "matching instanceId added to hand" assertions go RED (returnToHand
//       is never called with the staged deck-top instanceIds).
//   To confirm locally: replace any one card's `RevealAdd` IR with the legacy
//   `Return { target:{ filter:{ zone:"trash" }, count:1 }, to:"hand" }` action and
//   re-run — that card's block turns RED. This test therefore proves the runtime
//   reveal+add+rest behavior, not merely the IR shape (which 09-01's runtime record
//   test already covers).

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function handedIds(rec: Recorder): string[] {
  return rec.calls.filter((c) => c.verb === "returnToHand").flatMap((c) => c.args[0] as string[]);
}
function deckBottomIds(rec: Recorder): string[] {
  return rec.calls
    .filter((c) => c.verb === "returnToDeck" && !(c.args[1] as { toTop?: boolean } | undefined)?.toTop)
    .flatMap((c) => c.args[0] as string[]);
}
function deckTopIds(rec: Recorder): string[] {
  return rec.calls
    .filter((c) => c.verb === "returnToDeck" && (c.args[1] as { toTop?: boolean } | undefined)?.toTop === true)
    .flatMap((c) => c.args[0] as string[]);
}
function trashedIds(rec: Recorder): string[] {
  return rec.calls.filter((c) => c.verb === "trash").flatMap((c) => c.args[0] as string[]);
}
function revealCalls(rec: Recorder): { verb: string; args: unknown[] }[] {
  return rec.calls.filter((c) => c.verb === "reveal");
}

function fakeDefinition(cardId: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: ["Digimon"] as never,
    colors: ["Red"] as never,
    playCost: 3,
    dp: 3000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakeCardInstance(cardId: string, instanceId: string): CardInstance {
  return { cardId, instanceId, ownerSeat: 0 as Seat } as never;
}

/**
 * A source permanent for the card under test. `digivolutionStack` populates the
 * source's digivolution-cards stack so a Digi-Burst trash cost (BT5-046) is payable.
 */
function makeSource(cardId: string, opts: { digivolutionStack?: CardInstance[] } = {}): CardSource {
  const stack = opts.digivolutionStack ?? [];
  const permanent = stack.length
    ? () => ({
        permanentId: `PERM#${cardId}`,
        isSuspended: false,
        currentDP: 0,
        stack,
        topCard: fakeCardInstance(cardId, `PERM#${cardId}-top`),
      })
    : () => undefined;
  return {
    instanceId: `INST#${cardId}`,
    cardId,
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(cardId),
    permanent: permanent as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeContext(opts: {
  cardId: string;
  recorder: Recorder;
  deckTop: CardInstance[];
  cardDefinitions?: Record<string, Partial<CardDefinition>>;
  digivolutionStack?: CardInstance[];
  installed?: SubTriggerInstall[];
}): EffectContext {
  // `eggDeck` is read by the Hatch action's legality check (BT16-082's optional tail), so both
  // seats carry one egg — a player with an empty egg deck cannot hatch at all.
  const players = [
    {
      seat: 0 as Seat,
      battleArea: [],
      security: [],
      hand: [],
      deck: [...opts.deckTop],
      trash: [],
      eggDeck: [fakeCardInstance("DIGIEGG", "egg-top")],
    },
    { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [], eggDeck: [] },
  ];
  const state = { memory: 3, players, turnSeat: 0 } as unknown as GameState;

  const definitionOverrides = opts.cardDefinitions ?? {};

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: () => undefined as never,
    definitionOf: (card: CardInstance): CardDefinition =>
      fakeDefinition(card.cardId, definitionOverrides[card.cardId] ?? {}),
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return [] as never;
    };

  const fx = {
    reveal: async (seat: Seat, n: number): Promise<CardInstance[]> => {
      opts.recorder.calls.push({ verb: "reveal", args: [seat, n] });
      return opts.deckTop.slice(0, n);
    },
    returnToHand: record("returnToHand"),
    returnToDeck: record("returnToDeck"),
    trash: record("trash"),
    // BT5-046's <Digi-Burst 1> cost trashes a digivolution-stack card via the dedicated
    // trashDigivolutionCards seam (not the flat `trash` primitive), so stack-trash watchers
    // fire correctly (see subTriggerSeams.test.ts). Recorded, not asserted on by these cases.
    // The engine treats the returned ids as the cards that actually moved (a Digi-Burst cost is
    // unpaid when fewer come back), so the mock echoes what it was asked to trash.
    trashDigivolutionCards: async (permanentId: string, instanceIds: string[], options?: unknown) => {
      opts.recorder.calls.push({ verb: "trashDigivolutionCards", args: [permanentId, instanceIds, options] });
      return instanceIds;
    },
    redirectDigivolutionTrashHosts: async (hostPermanentIds: string[]) => {
      opts.recorder.calls.push({ verb: "redirectDigivolutionTrashHosts", args: [hostPermanentIds] });
      return hostPermanentIds;
    },
    hatch: record("hatch"),
    // BT16-082's [Your Turn] clause is gated behind a "whenMovedFromBreeding" SubTrigger
    // (KB Q2668-Q2671 confirm it only fires on that event, not unconditionally every turn).
    // Record the install so the test can fire the watcher directly, same convention as
    // other SubTrigger-driven card tests (see BT23-069.test.ts installWatcher()).
    subscribeSubTrigger: (sub: SubTriggerInstall): number => {
      (opts.installed ?? []).push(sub);
      return (opts.installed ?? []).length;
    },
    // Anything unexpected surfaces loudly.
    draw: (...a: unknown[]) => {
      throw new Error(`Unexpected draw(${JSON.stringify(a)})`);
    },
    gainMemory: (...a: unknown[]) => {
      throw new Error(`Unexpected gainMemory(${JSON.stringify(a)})`);
    },
    deletePermanent: (...a: unknown[]) => {
      throw new Error(`Unexpected deletePermanent(${JSON.stringify(a)})`);
    },
    suspend: (...a: unknown[]) => {
      throw new Error(`Unexpected suspend(${JSON.stringify(a)})`);
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    // Optional gates (BT16-082 may-hatch, optional costs) are accepted.
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source: makeSource(opts.cardId, { digivolutionStack: opts.digivolutionStack }), trigger: {}, game, fx, ask };
}

async function resolveCard(
  cardId: string,
  timing: EffectTiming,
  ctx: EffectContext,
  index = 0,
): Promise<void> {
  const module = getEffectModule(cardId);
  expect(module, `${cardId} must self-register on import`).toBeDefined();
  const source = ctx.source as CardSource;
  // Handwritten [On Play] modules register on the board-wide companion window the engine fires
  // alongside OnPlay (see engine/effects/builders.ts `onPlay`), so read both before failing.
  const effects =
    module!.effectsForTiming(timing, source).length > 0 || timing !== EffectTiming.OnPlay
      ? module!.effectsForTiming(timing, source)
      : module!.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source);
  expect(effects.length, `${cardId} must expose an effect at ${String(timing)}`).toBeGreaterThanOrEqual(1);
  await effects[index]!.resolve(ctx);
}

// ---------------------------------------------------------------------------
// Single-add ProcessForAll cards: reveal N, add matching to hand, rest -> deck bottom.
// ---------------------------------------------------------------------------

describe("RevealAdd cluster A3 — single-add ProcessForAll cards (rest -> deck bottom)", () => {
  interface SingleCase {
    cardId: string;
    timing: EffectTiming;
    revealCount: number;
    // The matching card's definition override.
    match: { instanceId: string; cardId: string; def: Partial<CardDefinition> };
    // Non-matching filler instanceIds (definitions deliberately do not match).
    fillerIds: string[];
    extra?: { digivolutionStack?: CardInstance[] };
  }

  const cases: SingleCase[] = [
    {
      cardId: "ST4-03",
      timing: EffectTiming.OnPlay,
      revealCount: 1,
      match: { instanceId: "st4-match", cardId: "GREEN-DIGI", def: { kinds: ["Digimon"] as never, colors: ["Green"] as never } },
      fillerIds: [],
    },
    {
      cardId: "BT12-045",
      timing: EffectTiming.OnPlay,
      revealCount: 1,
      match: { instanceId: "bt12-match", cardId: "GREEN-DIGI", def: { kinds: ["Digimon"] as never, colors: ["Green"] as never } },
      fillerIds: [],
    },
    {
      cardId: "BT5-046",
      timing: EffectTiming.OnUseOption, // [Main] -> OnUseOption
      revealCount: 1,
      match: { instanceId: "bt5046-match", cardId: "GREEN-DIGI", def: { kinds: ["Digimon"] as never, colors: ["Green"] as never } },
      fillerIds: [],
      // <Digi-Burst 1>: the RevealAdd carries a trash cost paid from this Digimon's
      // digivolution stack — supply one so the cost is payable and the reveal fires.
      extra: { digivolutionStack: [fakeCardInstance("DIGIEGG", "burst-card")] },
    },
    {
      cardId: "BT6-005",
      timing: EffectTiming.OnDestroyedAnyone, // [On Deletion]
      revealCount: 1,
      match: { instanceId: "bt6-match", cardId: "BLACK-DIGI", def: { kinds: ["Digimon"] as never, colors: ["Black"] as never } },
      fillerIds: [],
    },
    {
      cardId: "BT7-009",
      timing: EffectTiming.OnUseAttack, // [When Attacking]
      revealCount: 5,
      match: { instanceId: "bt7-match", cardId: "SISTERMON", def: { nameEn: "Sistermon Blanc" } },
      fillerIds: ["bt7-f1", "bt7-f2", "bt7-f3", "bt7-f4"],
    },
  ];

  for (const tc of cases) {
    it(`${tc.cardId}: reveals ${tc.revealCount}, adds the matching card to hand, rest -> deck bottom`, async () => {
      const recorder: Recorder = { calls: [] };
      const matchInst = fakeCardInstance(tc.match.cardId, tc.match.instanceId);
      const fillers = tc.fillerIds.map((id) => fakeCardInstance("FILLER", id));
      // Pad the reveal slice to revealCount with non-matching fillers when needed.
      const slice = [matchInst, ...fillers];
      while (slice.length < tc.revealCount) slice.push(fakeCardInstance("FILLER", `${tc.cardId}-pad-${slice.length}`));

      const ctx = makeContext({
        cardId: tc.cardId,
        recorder,
        deckTop: slice,
        cardDefinitions: {
          [tc.match.cardId]: tc.match.def,
          FILLER: { kinds: ["Option"] as never, colors: ["White"] as never, nameEn: "Filler" },
        },
        digivolutionStack: tc.extra?.digivolutionStack,
      });

      await resolveCard(tc.cardId, tc.timing, ctx);

      // (i) reveal called with the card's revealCount
      const reveals = revealCalls(recorder);
      expect(reveals).toHaveLength(1);
      expect(reveals[0]!.args[1]).toBe(tc.revealCount);

      // (ii) matching card added to hand
      expect(handedIds(recorder)).toContain(tc.match.instanceId);

      // (iii) non-matching revealed cards go to deck bottom (toTop falsy)
      const bottom = deckBottomIds(recorder);
      for (const f of fillers) expect(bottom).toContain(f.instanceId);
      // The match must NOT be sent to the deck.
      expect(bottom).not.toContain(tc.match.instanceId);
      // Nothing is trashed for these 9.
      expect(trashedIds(recorder)).not.toContain(tc.match.instanceId);
    });
  }
});

// ---------------------------------------------------------------------------
// Multi-add (count:"all") cards: reveal includes >= 2 matching; ALL must be added.
// ---------------------------------------------------------------------------

describe("RevealAdd cluster A3 — multi-add count:\"all\" cards", () => {
  interface MultiCase {
    cardId: string;
    revealCount: number;
    matchDef: Partial<CardDefinition>;
    matchCardId: string;
  }

  const cases: MultiCase[] = [
    {
      cardId: "BT1-048",
      revealCount: 4,
      matchCardId: "YELLOW-TAMER",
      matchDef: { kinds: ["Tamer"] as never, colors: ["Yellow"] as never },
    },
    {
      cardId: "BT5-049",
      revealCount: 3,
      matchCardId: "ANY-DIGI",
      matchDef: {
        kinds: ["Digimon"] as never,
        colors: ["Blue"] as never,
        effectText: "＜Digisorption＞",
      },
    },
    {
      cardId: "EX2-030",
      revealCount: 4,
      matchCardId: "BLACK-TAMER",
      matchDef: { kinds: ["Tamer"] as never, colors: ["Black"] as never },
    },
  ];

  for (const tc of cases) {
    it(`${tc.cardId}: reveals ${tc.revealCount}, adds ALL matching (>=2) to hand (count:all proof)`, async () => {
      const recorder: Recorder = { calls: [] };
      const m1 = fakeCardInstance(tc.matchCardId, `${tc.cardId}-m1`);
      const m2 = fakeCardInstance(tc.matchCardId, `${tc.cardId}-m2`);
      const fillers = [
        fakeCardInstance("FILLER", `${tc.cardId}-f1`),
        fakeCardInstance("FILLER", `${tc.cardId}-f2`),
      ];
      const slice = [m1, m2, ...fillers].slice(0, tc.revealCount);

      const ctx = makeContext({
        cardId: tc.cardId,
        recorder,
        deckTop: slice,
        cardDefinitions: {
          [tc.matchCardId]: tc.matchDef,
          FILLER: { kinds: ["Option"] as never, colors: ["White"] as never, nameEn: "Filler" },
        },
      });

      await resolveCard(tc.cardId, EffectTiming.OnPlay, ctx);

      const reveals = revealCalls(recorder);
      expect(reveals).toHaveLength(1);
      expect(reveals[0]!.args[1]).toBe(tc.revealCount);

      // count:"all" — BOTH matching cards must be in hand, not just one.
      const handed = handedIds(recorder);
      expect(handed).toContain(`${tc.cardId}-m1`);
      expect(handed).toContain(`${tc.cardId}-m2`);

      // Fillers within the reveal slice go to deck bottom.
      const bottom = deckBottomIds(recorder);
      for (const f of fillers.slice(0, Math.max(0, tc.revealCount - 2))) {
        expect(bottom).toContain(f.instanceId);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// ST15-04: divergent rest disposition — the non-matching revealed card -> TRASH.
// ---------------------------------------------------------------------------

describe("RevealAdd cluster A3 — ST15-04 (rest -> trash)", () => {
  it("reveals 1, adds a Black card to hand, and sends the non-matching revealed card to TRASH", async () => {
    const recorder: Recorder = { calls: [] };
    const blackCard = fakeCardInstance("BLACK-CARD", "st15-black");
    const nonMatch = fakeCardInstance("NONBLACK", "st15-nonmatch");

    // Case A — the revealed card matches (Black): goes to hand, nothing trashed.
    {
      const ctx = makeContext({
        cardId: "ST15-04",
        recorder,
        deckTop: [blackCard],
        cardDefinitions: { "BLACK-CARD": { colors: ["Black"] as never, kinds: ["Digimon"] as never } },
      });
      await resolveCard("ST15-04", EffectTiming.OnPlay, ctx);
      expect(revealCalls(recorder)).toHaveLength(1);
      expect(revealCalls(recorder)[0]!.args[1]).toBe(1);
      expect(handedIds(recorder)).toContain("st15-black");
    }

    // Case B — the revealed card does NOT match: the rest disposition sends it to TRASH,
    // NOT to the deck bottom (the divergence the A3 must lock in).
    const recorderB: Recorder = { calls: [] };
    const ctxB = makeContext({
      cardId: "ST15-04",
      recorder: recorderB,
      deckTop: [nonMatch],
      cardDefinitions: { NONBLACK: { colors: ["Red"] as never, kinds: ["Digimon"] as never } },
    });
    await resolveCard("ST15-04", EffectTiming.OnPlay, ctxB);
    expect(revealCalls(recorderB)).toHaveLength(1);
    expect(trashedIds(recorderB)).toContain("st15-nonmatch");
    // It must NOT have gone to the deck bottom.
    expect(deckBottomIds(recorderB)).not.toContain("st15-nonmatch");
    expect(handedIds(recorderB)).not.toContain("st15-nonmatch");
  });
});

// ---------------------------------------------------------------------------
// 10.1-01 cluster: LM-set + BT10-097 + EX7-048 + P-112 + ST17-11 + ST21-14.
// ---------------------------------------------------------------------------
//
// These cards were fixed by the revealSpan 1400→3500 widening (BT10-097 only
// needed a larger span for its second rule implementation's mode/to to be
// parsed) and by the per-condition-class extraction in actions.mjs (EX7-048
// to:"play", P-112 per-condition to:"hand"). All LM-set cards are structurally
// identical to LM-033 (reveal 3, add 1 Red/Black Digimon to hand, rest deck bottom).
// FAILS-WHEN-REVERTED: reverting the revealSpan to 1400 (or reverting the
// per-condition-class fix) causes the BT10-097 Kiriha Aonuma `to` to become
// "hand" and EX7-048's `to` to become "hand", making `playInstances` never called
// (returning the card to hand instead of playing it) — those assertions go RED.

// ---------------------------------------------------------------------------
// LM-033: representative of the 15 LM-set reveal-add option cards.
// ---------------------------------------------------------------------------

describe("RevealAdd cluster A3 — LM-033 (reveal 3, add 1 Red/Black Digimon to hand, Phase 10.1-01)", () => {
  it("reveals 3, adds a Red/Black Digimon to hand, rest -> deck bottom", async () => {
    const recorder: Recorder = { calls: [] };
    const matchCard = fakeCardInstance("RED-DIGI", "lm033-match");
    const fillers = [
      fakeCardInstance("GREEN-OPT", "lm033-f1"),
      fakeCardInstance("GREEN-OPT", "lm033-f2"),
    ];

    const ctx = makeContext({
      cardId: "LM-033",
      recorder,
      deckTop: [matchCard, ...fillers],
      cardDefinitions: {
        "RED-DIGI": { kinds: ["Digimon"] as never, colors: ["Red"] as never },
        "GREEN-OPT": { kinds: ["Option"] as never, colors: ["Green"] as never, nameEn: "Filler" },
      },
    });

    await resolveCard("LM-033", EffectTiming.OnUseOption, ctx);

    const reveals = revealCalls(recorder);
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.args[1]).toBe(3);
    expect(handedIds(recorder)).toContain("lm033-match");
    const bottom = deckBottomIds(recorder);
    for (const f of fillers) expect(bottom).toContain(f.instanceId);
    expect(bottom).not.toContain("lm033-match");
  });
});

// ---------------------------------------------------------------------------
// ST17-11: two-add (Green Digimon + Green Tamer), both to hand.
// ---------------------------------------------------------------------------

describe("RevealAdd cluster A3 — ST17-11 (reveal 3, add 1 Green Digimon + 1 Green Tamer, Phase 10.1-01)", () => {
  it("reveals 3, adds a Green Digimon and a Green Tamer to hand, rest -> deck bottom", async () => {
    const recorder: Recorder = { calls: [] };
    const digimon = fakeCardInstance("GREEN-DIGI-2", "st17-digi");
    const tamer = fakeCardInstance("GREEN-TAMER", "st17-tamer");
    const filler = fakeCardInstance("PURPLE-OPT", "st17-f1");

    const ctx = makeContext({
      cardId: "ST17-11",
      recorder,
      deckTop: [digimon, tamer, filler],
      cardDefinitions: {
        "GREEN-DIGI-2": { kinds: ["Digimon"] as never, colors: ["Green"] as never },
        "GREEN-TAMER": { kinds: ["Tamer"] as never, colors: ["Green"] as never },
        "PURPLE-OPT": { kinds: ["Option"] as never, colors: ["Purple"] as never, nameEn: "Filler" },
      },
    });

    await resolveCard("ST17-11", EffectTiming.OnUseOption, ctx);

    const reveals = revealCalls(recorder);
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.args[1]).toBe(3);
    const handed = handedIds(recorder);
    expect(handed).toContain("st17-digi");
    expect(handed).toContain("st17-tamer");
    expect(deckBottomIds(recorder)).toContain("st17-f1");
    expect(deckBottomIds(recorder)).not.toContain("st17-digi");
    expect(deckBottomIds(recorder)).not.toContain("st17-tamer");
  });
});

// ---------------------------------------------------------------------------
// ST21-14: single-add ADVENTURE trait, to hand.
// ---------------------------------------------------------------------------

describe("RevealAdd cluster A3 — ST21-14 (reveal 3, add 1 ADVENTURE Digimon to hand, Phase 10.1-01)", () => {
  it("reveals 3, adds an ADVENTURE trait card to hand, rest -> deck bottom", async () => {
    const recorder: Recorder = { calls: [] };
    const matchCard = fakeCardInstance("ADV-CARD", "st21-adv");
    const fillers = [
      fakeCardInstance("PLAIN-CARD", "st21-f1"),
      fakeCardInstance("PLAIN-CARD", "st21-f2"),
    ];

    const ctx = makeContext({
      cardId: "ST21-14",
      recorder,
      deckTop: [matchCard, ...fillers],
      cardDefinitions: {
        "ADV-CARD": { kinds: ["Digimon"] as never, colors: ["Purple"] as never, types: ["Adventure"] },
        "PLAIN-CARD": { kinds: ["Digimon"] as never, colors: ["Red"] as never },
      },
    });

    await resolveCard("ST21-14", EffectTiming.OnUseOption, ctx);

    const reveals = revealCalls(recorder);
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.args[1]).toBe(3);
    expect(handedIds(recorder)).toContain("st21-adv");
    const bottom = deckBottomIds(recorder);
    for (const f of fillers) expect(bottom).toContain(f.instanceId);
    expect(bottom).not.toContain("st21-adv");
  });
});

// ---------------------------------------------------------------------------
// EX7-048: single-add [Three Musketeers] trait Option card, to PLAY (not hand).
// This is the fails-when-reverted discriminator for the per-condition-class fix:
// reverting the fix causes EX7-048 to emit to:"hand" and playInstances is never
// called — only returnToHand is called, and the playInstances assertion goes RED.
// ---------------------------------------------------------------------------

describe("RevealAdd cluster A3 — EX7-048 (reveal 6, add 1 Three Musketeers Option to PLAY, Phase 10.1-01)", () => {
  it("reveals 6, calls returnToHand then playInstances for the matched card (to:play path), rest -> chosen deck end", async () => {
    const playInstancesCalls: unknown[][] = [];
    const recorder: Recorder = { calls: [] };
    const matchCard = fakeCardInstance("THREEMUSKE-OPT", "ex7048-match");
    const fillers = Array.from({ length: 5 }, (_, i) => fakeCardInstance("FILLER", `ex7048-f${i}`));

    const baseCtx = makeContext({
      cardId: "EX7-048",
      recorder,
      deckTop: [matchCard, ...fillers],
      cardDefinitions: {
        "THREEMUSKE-OPT": { kinds: ["Option"] as never, colors: ["Black"] as never, types: ["Three Musketeers"] },
        FILLER: { kinds: ["Digimon"] as never, colors: ["Red"] as never, nameEn: "Filler" },
      },
    });

    // Extend the fx mock to support playInstances (needed for to:"play" disposition).
    const ctx: typeof baseCtx = {
      ...baseCtx,
      fx: {
        ...baseCtx.fx,
        playInstances: async (ids: string[], _opts: unknown) => {
          playInstancesCalls.push(ids);
          return [] as never;
        },
      } as never,
    };

    await resolveCard("EX7-048", EffectTiming.OnPlay, ctx);

    const reveals = revealCalls(recorder);
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.args[1]).toBe(6);

    // The matched card must be returned to hand first (runRevealAdd calls returnToHand
    // then playInstances for the to:"play" disposition — NOT only returnToHand).
    expect(handedIds(recorder)).toContain("ex7048-match");

    // Then played from hand (free) — this is the discriminating assertion.
    expect(playInstancesCalls.length).toBeGreaterThanOrEqual(1);
    expect(playInstancesCalls.some((ids) => (ids as string[]).includes("ex7048-match"))).toBe(true);

    // "Return the rest to the top or bottom of the deck" — the mock's chooseOption picks
    // option 0 ("Top of deck"), so the non-matching revealed cards go to the deck TOP.
    const top = deckTopIds(recorder);
    for (const f of fillers) expect(top).toContain(f.instanceId);
  });
});

// ---------------------------------------------------------------------------
// P-112: two-add (Eosmon name + Menoa Bellucci name), both to hand.
// Tests that per-condition-class correctly assigns to:"hand" to BOTH conditions
// ---------------------------------------------------------------------------

describe("RevealAdd cluster A3 — P-112 (reveal 3, add 1 Eosmon + 1 Menoa Bellucci to hand, Phase 10.1-01)", () => {
  it("reveals 3, adds 1 Eosmon and 1 Menoa Bellucci to hand (NOT play), rest -> deck bottom", async () => {
    const recorder: Recorder = { calls: [] };
    const eosmon = fakeCardInstance("EOSMON-CARD", "p112-eosmon");
    const menoa = fakeCardInstance("MENOA-CARD", "p112-menoa");
    const filler = fakeCardInstance("PLAIN-DIGI", "p112-filler");

    // P-112 has a condition: "if you have 1+ Eosmon Digimon in play".
    // Inject a battle-area Eosmon permanent so the condition passes.
    const eosmonOnField = fakeCardInstance("EOSMON-CARD", "p112-eosmon-field");
    const eosmonPermanent = {
      permanentId: "PERM#eosmon-field",
      isSuspended: false,
      currentDP: 3000,
      stack: [eosmonOnField],
      topCard: eosmonOnField,
    };

    const ctx = makeContext({
      cardId: "P-112",
      recorder,
      deckTop: [eosmon, menoa, filler],
      cardDefinitions: {
        "EOSMON-CARD": { kinds: ["Digimon"] as never, colors: ["White"] as never, nameEn: "Eosmon" },
        "MENOA-CARD": { kinds: ["Tamer"] as never, colors: ["Yellow"] as never, nameEn: "Menoa Bellucci" },
        "PLAIN-DIGI": { kinds: ["Digimon"] as never, colors: ["Red"] as never, nameEn: "OtherCard" },
      },
    });

    // Inject the Eosmon permanent into seat 0's battle area so the condition evaluates.
    (ctx.game.player(0 as never) as { battleArea: unknown[] }).battleArea.push(eosmonPermanent);

    await resolveCard("P-112", EffectTiming.OnPlay, ctx);

    const reveals = revealCalls(recorder);
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.args[1]).toBe(3);

    // Both must land in hand — not played (P-112 fix: both conditions are AddHand).
    const handed = handedIds(recorder);
    expect(handed).toContain("p112-eosmon");
    expect(handed).toContain("p112-menoa");
    expect(deckBottomIds(recorder)).toContain("p112-filler");
  });
});

// ---------------------------------------------------------------------------
// BT10-097: two-add — Blue Flare trait count:2 to:hand + Kiriha Aonuma count:1 to:play.
// The Kiriha Aonuma to:play is the discriminating assertion for the revealSpan fix:
// reverting to 1400 causes the second condition's mode/coroutineRef to be cut off,
// defaulting to to:"hand", and the playInstances assertion goes RED.
// ---------------------------------------------------------------------------

describe("RevealAdd cluster A3 — BT10-097 (reveal 6: Blue Flare x2 to hand + Kiriha Aonuma x1 to play, Phase 10.1-01)", () => {
  it("reveals 6, adds 2 Blue Flare to hand and 1 Kiriha Aonuma to PLAY, rest -> deck bottom", async () => {
    const playInstancesCalls: unknown[][] = [];
    const recorder: Recorder = { calls: [] };
    const bf1 = fakeCardInstance("BLUE-FLARE-1", "bt10097-bf1");
    const bf2 = fakeCardInstance("BLUE-FLARE-2", "bt10097-bf2");
    const kiriha = fakeCardInstance("KIRIHA-CARD", "bt10097-kiriha");
    const fillers = Array.from({ length: 3 }, (_, i) => fakeCardInstance("FILLER", `bt10097-f${i}`));

    const baseCtx = makeContext({
      cardId: "BT10-097",
      recorder,
      deckTop: [bf1, bf2, kiriha, ...fillers],
      cardDefinitions: {
        "BLUE-FLARE-1": { kinds: ["Digimon"] as never, colors: ["Blue"] as never, types: ["Blue Flare"] },
        "BLUE-FLARE-2": { kinds: ["Digimon"] as never, colors: ["Blue"] as never, types: ["Blue Flare"] },
        "KIRIHA-CARD": { kinds: ["Tamer"] as never, colors: ["Blue"] as never, nameEn: "Kiriha Aonuma" },
        FILLER: { kinds: ["Option"] as never, colors: ["Purple"] as never, nameEn: "Filler" },
      },
    });

    // Extend the fx mock to support playInstances.
    const ctx: typeof baseCtx = {
      ...baseCtx,
      fx: {
        ...baseCtx.fx,
        playInstances: async (ids: string[], _opts: unknown) => {
          playInstancesCalls.push(ids);
          return [] as never;
        },
      } as never,
    };

    await resolveCard("BT10-097", EffectTiming.OnUseOption, ctx);

    const reveals = revealCalls(recorder);
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.args[1]).toBe(6);

    // Blue Flare x2 -> hand.
    const handed = handedIds(recorder);
    expect(handed).toContain("bt10097-bf1");
    expect(handed).toContain("bt10097-bf2");

    // Kiriha Aonuma -> play (returnToHand then playInstances — the discriminating assertion).
    expect(handed).toContain("bt10097-kiriha");
    expect(playInstancesCalls.length).toBeGreaterThanOrEqual(1);
    expect(playInstancesCalls.some((ids) => (ids as string[]).includes("bt10097-kiriha"))).toBe(true);

    // Fillers -> deck bottom.
    const bottom = deckBottomIds(recorder);
    for (const f of fillers) expect(bottom).toContain(f.instanceId);
  });
});

// ---------------------------------------------------------------------------
// BT16-082: RevealDeckTopCardsAndSelect (add 1) + optional Hatch tail.
// ---------------------------------------------------------------------------

describe("RevealAdd cluster A3 — BT16-082 (reveal 3, add 1 Digimon/Tamer, then optional Hatch)", () => {
  it("reveals 3, adds a Digimon or Tamer to hand, rest -> deck bottom, and runs the optional Hatch", async () => {
    const recorder: Recorder = { calls: [] };
    const match = fakeCardInstance("PICK", "bt16-pick");
    const fillers = [
      fakeCardInstance("FILLER", "bt16-f1"),
      fakeCardInstance("FILLER", "bt16-f2"),
    ];
    const installed: SubTriggerInstall[] = [];
    const ctx = makeContext({
      cardId: "BT16-082",
      recorder,
      deckTop: [match, ...fillers],
      cardDefinitions: {
        PICK: { kinds: ["Tamer"] as never, colors: ["Purple"] as never },
        FILLER: { kinds: ["Option"] as never, colors: ["White"] as never, nameEn: "Filler" },
      },
      installed,
    });

    // [Your Turn] -> EffectTiming.None installs a "whenMovedFromBreeding" SubTrigger watcher
    // (cards.json: "When one of your Digimon moves from the breeding area to the battle
    // area..."; KB Q2668-Q2671 confirm the effect is gated on that event, not unconditional
    // every turn). Fire the installed watcher to simulate the move.
    await resolveCard("BT16-082", EffectTiming.None, ctx);
    const watcher = installed.find((s) => s.event === "whenMovedFromBreeding");
    expect(watcher, "BT16-082 must install a whenMovedFromBreeding watcher").toBeDefined();
    await watcher!.run(ctx);

    // Reveal-add half.
    const reveals = revealCalls(recorder);
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.args[1]).toBe(3);
    expect(handedIds(recorder)).toContain("bt16-pick");
    const bottom = deckBottomIds(recorder);
    for (const f of fillers) expect(bottom).toContain(f.instanceId);

    // Optional Hatch tail ran (fx.hatch invoked for the owner seat).
    const hatches = recorder.calls.filter((c) => c.verb === "hatch");
    expect(hatches).toHaveLength(1);
    expect(hatches[0]!.args[0]).toBe(0);
  });
});
