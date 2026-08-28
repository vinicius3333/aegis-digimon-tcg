import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type PlayerState,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-046.js";

// BT7-046 Beetlemon [When Digivolving]: Reveal the top 5 cards of your deck.
// Add 1 card with [Hybrid] in its traits and 1 [J.P. Shibayama] among them to
// your hand. Place the remaining cards at the bottom of your deck in any order.
//
// IR bugs found (runtime record):
//   1. A spurious `youHave { kind:[Digimon,Tamer], count:1 }` condition gates the
//      WhenDigivolving action. The documented behavior source has no such gate — the CanActivate
//      guard checks IsExistOnBattleArea + deck.Count >= 1 only. This causes the
//      RevealAdd body to be skipped whenever the owner's battleArea is empty.
//   2. Two spurious Return actions follow the RevealAdd, both targeting zone:"trash".
//      The card text (and documented behavior source) has no return-from-trash clause. The actions
//      are currently silent no-ops (candidatePermanents only walks battleArea and
//      zone:"trash" never matches), but the IR is structurally incorrect.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT7-046",
    set: "BT7",
    nameEn: "Beetlemon",
    kinds: ["Digimon"] as never,
    colors: ["Green"] as never,
    playCost: 5,
    dp: 6000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "INST#BT7046",
    cardId: "BT7-046",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function fakeCardInstance(cardId: string, instanceId: string): CardInstance {
  return { cardId, instanceId, ownerSeat: 0 as Seat } as never;
}

/**
 * Build a context whose deck contains `deckTop5` as the revealed slice.
 * `battleArea` is empty by default (the correct KB behavior needs no existing
 * permanents as a gate); `battleAreaFill` lets tests pre-populate it to work
 * around the runtime record's spurious condition gate.
 */
function makeContext(opts: {
  recorder: Recorder;
  deckTop5: CardInstance[];
  cardDefinitions?: Record<string, Partial<CardDefinition>>;
  battleAreaFill?: Array<{ permanentId: string; cardId: string }>;
}): EffectContext {
  const battleArea = (opts.battleAreaFill ?? []).map((p) => ({
    permanentId: p.permanentId,
    isSuspended: false,
    currentDP: 0,
    stack: [] as never[],
    topCard: fakeCardInstance(p.cardId, p.permanentId + "-top"),
  }));

  const players = [
    { seat: 0 as Seat, battleArea, security: [], hand: [], deck: [...opts.deckTop5], trash: [] },
    { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 3, players, turnSeat: 0 } as unknown as GameState;

  const definitionOverrides: Record<string, Partial<CardDefinition>> = opts.cardDefinitions ?? {};

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id: string) => battleArea.find((p) => p.permanentId === id) as never,
    definitionOf: (card: CardInstance): CardDefinition => {
      const over = definitionOverrides[card.cardId] ?? {};
      return fakeDefinition({ cardId: card.cardId, ...over });
    },
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return [] as never;
    };

  const fx = {
    reveal: async (_seat: Seat, n: number): Promise<CardInstance[]> => {
      opts.recorder.calls.push({ verb: "reveal", args: [_seat, n] });
      return opts.deckTop5.slice(0, n);
    },
    returnToHand: record("returnToHand"),
    returnToDeck: record("returnToDeck"),
    // Every other verb throws — accidental dispatch from a spurious action surfaces loudly.
    draw: (...a: unknown[]) => {
      throw new Error(`Unexpected draw(${JSON.stringify(a)})`);
    },
    gainMemory: (...a: unknown[]) => {
      throw new Error(`Unexpected gainMemory(${JSON.stringify(a)})`);
    },
    setMemory: (...a: unknown[]) => {
      throw new Error(`Unexpected setMemory(${JSON.stringify(a)})`);
    },
    trash: (...a: unknown[]) => {
      throw new Error(`Unexpected trash(${JSON.stringify(a)})`);
    },
    deletePermanent: (...a: unknown[]) => {
      throw new Error(`Unexpected deletePermanent(${JSON.stringify(a)})`);
    },
    suspend: (...a: unknown[]) => {
      throw new Error(`Unexpected suspend(${JSON.stringify(a)})`);
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

describe("BT7-046 Beetlemon [When Digivolving]", () => {
  const module = getEffectModule("BT7-046");

  it("digivolves onto a green Tamer and resolves both reveal picks through public game state", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-089", as: "jp" }],
          hand: [{ card: "BT7-046", as: "beetlemon" }],
          deck: [
            "BT7-007",
            { card: "BT7-047", as: "hybrid" },
            { card: "BT7-089", as: "searchedJp" },
            "BT7-012",
            "BT7-020",
            "BT7-048",
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const hybridId = s.inst("hybrid").instanceId;
    const jpId = s.inst("searchedJp").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jp").permanentId,
        instanceId: s.inst("beetlemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => [hybridId, jpId].every((id) => player.hand.some((card) => card.instanceId === id)));

    expect(s.state.memory).toBe(0);
    expect(s.perm("jp").topCard.cardId).toBe("BT7-046");
    expect(s.perm("jp").stack).toHaveLength(1);
    expect(player.hand.some((card) => card.instanceId === hybridId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === jpId)).toBe(true);
    expect(player.deck).toHaveLength(3);
  });

  it("registers on import", () => {
    expect(module, "BT7-046 must self-register on import").toBeDefined();
  });

  it("routes to WhenDigivolving and nothing else", () => {
    // The card has exactly one [When Digivolving] effect; no other timing window
    // should contribute an effect from this card.
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(0);
  });

  it(// Q1579 (2024-03-28): the effect fires unconditionally whenever Beetlemon
  // digivolves — there is no "only if you have a Digimon or Tamer" gate.
  //
  // The IR runtime record added a spurious `youHave { kind:[Digimon,Tamer], count:1 }`
  // condition, which causes the RevealAdd body to be skipped when the owner's
  // battleArea is empty. This test asserts the KB-correct behavior (reveal fires
  // even with an empty field); the override removed that condition.
  //
  // KB-correct behavior — now PASSES after the override removed the spurious youHave
  // gate and the two spurious Return actions.
  "reveals exactly 5 cards regardless of field state (Q1579: no youHave gate)", async () => {
    // Empty battleArea — the youHave condition evaluates to false and blocks the
    // RevealAdd action body under the current buggy IR.
    const deckCards = [
      fakeCardInstance("C1", "i1"),
      fakeCardInstance("C2", "i2"),
      fakeCardInstance("C3", "i3"),
      fakeCardInstance("C4", "i4"),
      fakeCardInstance("C5", "i5"),
    ];
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, deckTop5: deckCards });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const reveals = recorder.calls.filter((c) => c.verb === "reveal");
    // Must reveal exactly 5 — currently fails because youHave gate blocks execution.
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.args[1]).toBe(5);
  });

  it(// Q1579 (2024-03-28): "Even if you revealed only a card with [Hybrid] in its
  // traits or [J.P. Shibayama], you still add that card to your hand."
  // The two add specs are independent — a Hybrid card is added regardless of
  // whether J.P. Shibayama also appears among the revealed cards.
  //
  // Previously the same spurious youHave condition gate prevented the RevealAdd body
  // from running when battleArea was empty; the override removed it.
  //
  // KB-correct behavior — now PASSES after the override removed the spurious youHave
  // gate and the two spurious Return actions.
  "adds a Hybrid-trait card to hand when one is revealed (Q1579: independent add specs)", async () => {
    const hybridCard = fakeCardInstance("BT1-XXX", "i-hybrid");
    const plainCards = [
      fakeCardInstance("C1", "i1"),
      fakeCardInstance("C2", "i2"),
      fakeCardInstance("C3", "i3"),
      fakeCardInstance("C4", "i4"),
    ];
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      deckTop5: [hybridCard, ...plainCards],
      cardDefinitions: {
        "BT1-XXX": { nameEn: "Agunimon", types: ["Hybrid"], kinds: ["Digimon"] as never },
      },
    });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const handedIds = recorder.calls.filter((c) => c.verb === "returnToHand").flatMap((c) => c.args[0] as string[]);
    expect(handedIds).toContain("i-hybrid");
  });

  it(// Q1579 (2024-03-28): the two add specs are independent. J.P. Shibayama is added
  // to hand even without a Hybrid card in the reveal.
  //
  // Previously blocked by the spurious youHave condition gate (removed in the override).
  //
  // KB-correct behavior — now PASSES after the override removed the spurious youHave
  // gate and the two spurious Return actions.
  "adds J.P. Shibayama to hand when one is revealed (Q1579: independent add specs)", async () => {
    const jpCard = fakeCardInstance("BT7-087", "i-jp");
    const plainCards = [
      fakeCardInstance("C1", "i1"),
      fakeCardInstance("C2", "i2"),
      fakeCardInstance("C3", "i3"),
      fakeCardInstance("C4", "i4"),
    ];
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      deckTop5: [jpCard, ...plainCards],
      cardDefinitions: {
        "BT7-087": { nameEn: "J.P. Shibayama", kinds: ["Tamer"] as never },
      },
    });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const handedIds = recorder.calls.filter((c) => c.verb === "returnToHand").flatMap((c) => c.args[0] as string[]);
    expect(handedIds).toContain("i-jp");
  });

  it(// Card text: "Place the remaining cards at the bottom of your deck in any order."
  // Q1579 confirms structure: reveal 5, take matching ones, put the rest at the bottom.
  //
  // Previously blocked by the spurious youHave condition gate (removed in the override).
  //
  // KB-correct behavior — now PASSES after the override removed the spurious youHave
  // gate and the two spurious Return actions.
  "sends unreturned revealed cards to deck bottom (Q1579: remaining cards placement)", async () => {
    const hybridCard = fakeCardInstance("BT1-XXX", "i-hybrid");
    const jpCard = fakeCardInstance("BT7-087", "i-jp");
    const plainCards = [fakeCardInstance("C1", "i1"), fakeCardInstance("C2", "i2"), fakeCardInstance("C3", "i3")];
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      deckTop5: [hybridCard, jpCard, ...plainCards],
      cardDefinitions: {
        "BT1-XXX": { nameEn: "Agunimon", types: ["Hybrid"], kinds: ["Digimon"] as never },
        "BT7-087": { nameEn: "J.P. Shibayama", kinds: ["Tamer"] as never },
      },
    });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const deckReturns = recorder.calls.filter((c) => c.verb === "returnToDeck");
    expect(deckReturns.length).toBeGreaterThanOrEqual(1);
    const deckIds = deckReturns.flatMap((c) => c.args[0] as string[]);
    // The 3 plain cards go to deck bottom; Hybrid and J.P. Shibayama go to hand.
    for (const plain of plainCards) {
      expect(deckIds).toContain(plain.instanceId);
    }
    // Placement must be to the BOTTOM (toTop must be falsy).
    for (const call of deckReturns) {
      const opts = call.args[1] as { toTop?: boolean } | undefined;
      expect(opts?.toTop).toBeFalsy();
    }
  });

  it(// The IR's WhenDigivolving CardEffect contains 3 actions: RevealAdd + 2 spurious
  // Return actions. The card text (and documented behavior source) has only the RevealAdd clause.
  // The Return actions target zone:"trash" which is absent from the card text.
  //
  // This test asserts KB-correct IR shape (description must not mention "Return").
  // The description produced by describeEffect() for the buggy IR is:
  //   "[WhenDigivolving] RevealAdd, Return, Return"
  // The correct description is:
  //   "[WhenDigivolving] RevealAdd"
  //
  // KB-correct behavior — now PASSES after the override removed the spurious youHave
  // gate and the two spurious Return actions.
  "IR description contains only RevealAdd — no spurious Return actions (runtime record bug)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects).toHaveLength(1);
    // The `description` field is set by describeEffect() in the interpreter:
    // "[WhenDigivolving] <action-kinds>". A spurious Return leaves a "Return" token.
    const desc = (effects[0] as unknown as { description?: string }).description ?? "";
    expect(desc).not.toMatch(/Return/);
  });
});
