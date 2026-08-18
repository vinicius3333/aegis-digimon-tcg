import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type AttackTarget, type CardDefinition, type GameState, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT14-088.js";

// A3 for BT14-088 (Gennai, White Tamer):
//   [On Play] Reveal the top 5 cards of your deck. Add 1 level 3 Digimon card and 1
//   non-white Tamer card among them to the hand. Return the rest to the bottom of the deck.
//
// FAILS-WHEN-REVERTED: `ctx.fx.reveal` only flips cards face-up in place — it never moves
// anything. Before this fix, the selected level-3 Digimon and non-white Tamer were picked
// via `ask.selectCards` but never actually returned to hand: `ctx.fx.returnToHand` was never
// called, so the printed "Add ... to the hand" clause silently did nothing. The
// `isNonWhiteTamer` predicate also checked a non-existent `def.kind`/`def.cardKind` field
// (the real field is `def.kinds`), so it matched no Tamer at all, independent of the
// no-op bug.

const CARD_ID = "BT14-088";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? CARD_ID,
    set: "BT14",
    nameEn: over.nameEn ?? "Gennai",
    kinds: (over.kinds as never) ?? (["Tamer"] as never),
    colors: (over.colors as never) ?? (["White"] as never),
    playCost: over.playCost ?? 3,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "inst-gennai",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef(),
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

interface FxRecord {
  returnToHandCalls: string[][];
  returnToDeckCalls: string[][];
}

function makeContext(opts: {
  ownerDeck: { instanceId: string; cardId: string }[];
  definitions: Record<string, Partial<CardDefinition>>;
  record: FxRecord;
}): EffectContext {
  const { ownerDeck, definitions, record } = opts;

  const players = [
    { seat: 0 as Seat, battleArea: [], hand: [], trash: [], security: [], deck: ownerDeck },
    { seat: 1 as Seat, battleArea: [], hand: [], trash: [], security: [], deck: [] },
  ];
  const state = { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: () => undefined,
    definitionOf: (card: { cardId: string }) => {
      const over = definitions[card.cardId] ?? {};
      return fakeDef({ cardId: card.cardId, ...over });
    },
  };

  const fx = {
    reveal: async (_seat: Seat, n: number) =>
      ownerDeck.slice(0, n).map((c) => ({ instanceId: c.instanceId, cardId: c.cardId, ownerSeat: 0, faceUp: true })),
    returnToHand: async (ids: string[]) => {
      record.returnToHandCalls.push([...ids]);
      return [];
    },
    returnToDeck: async (ids: string[]) => {
      record.returnToDeckCalls.push([...ids]);
      return [];
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max ?? 1),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max ?? 1),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max ?? 1),
    chooseOption: async () => 0,
  };

  return { source: makeSource(), trigger: {}, game, fx, ask } as unknown as EffectContext;
}

describe("BT14-088 [On Play] reveal top 5 → add level 3 Digimon + non-white Tamer to hand", () => {
  it("moves the selected level 3 Digimon and non-white Tamer to hand, and the rest to the deck bottom", async () => {
    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();

    const effects = module!.effectsForTiming(EffectTiming.OnPlay, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);

    const deck = [
      { instanceId: "lv3-digimon", cardId: "BT1-010" }, // Agumon, level 3
      { instanceId: "nonwhite-tamer", cardId: "AD1-019" }, // non-white Tamer
      { instanceId: "filler-1", cardId: "AD1-001" },
      { instanceId: "filler-2", cardId: "AD1-002" },
      { instanceId: "filler-3", cardId: "AD1-003" },
    ];

    const record: FxRecord = { returnToHandCalls: [], returnToDeckCalls: [] };
    const ctx = makeContext({
      ownerDeck: deck,
      definitions: {
        "BT1-010": { kinds: [CardKind.Digimon] as never, dp: 3000, colors: ["Red"] as never, level: 3 } as never,
        "AD1-019": { kinds: [CardKind.Tamer] as never, colors: ["Blue"] as never },
        "AD1-001": { kinds: [CardKind.Digimon] as never, dp: 1000, colors: ["Red"] as never },
        "AD1-002": { kinds: [CardKind.Digimon] as never, dp: 1000, colors: ["Red"] as never },
        "AD1-003": { kinds: [CardKind.Digimon] as never, dp: 1000, colors: ["Red"] as never },
      },
      record,
    });

    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: without the fix, returnToHandCalls is empty — the selected
    // cards are computed but never moved anywhere.
    const movedToHand = record.returnToHandCalls.flat();
    expect(movedToHand).toContain("lv3-digimon");
    expect(movedToHand).toContain("nonwhite-tamer");

    const movedToDeck = record.returnToDeckCalls.flat();
    expect(movedToDeck).toContain("filler-1");
    expect(movedToDeck).toContain("filler-2");
    expect(movedToDeck).toContain("filler-3");
    expect(movedToDeck).not.toContain("lv3-digimon");
    expect(movedToDeck).not.toContain("nonwhite-tamer");
  });
});

// A3 for BT14-088's [Opponent's Turn] clause: "When your opponent's level 5 or higher
// Digimon attacks, by suspending this Tamer, you may move a Digimon from your breeding
// area to your battle area."
//
// FAILS-WHEN-REVERTED: the module had no EffectTiming.OnAllyAttack branch at all — the
// entire [Opponent's Turn] clause was unported (a distinct gap from the reveal-no-op bug
// covered above, which only affects this card's [On Play]).
describe("BT14-088 [Opponent's Turn] move a Digimon from breeding to battle when hit by a level 5+ attacker", () => {
  it("moves the breeding Digimon to the battle area and suspends this Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-088", as: "gennai" }],
          breeding: { card: "AD1-004", dp: 12000, as: "bred" }, // Red/Vaccine, DP > 0, level 6
        },
        1: { battleArea: [{ card: "AD1-004", dp: 12000, as: "attacker" }] }, // level 6 attacker
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;

    s.state.turnSeat = 1;
    s.state.memory = 0;

    const attacker = s.perm("attacker");
    const res = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" } satisfies AttackTarget,
    });
    expect(res).toEqual({ ok: true });

    const bredId = s.perm("bred").permanentId;
    await settle(() => p0.battleArea.some((p) => p.permanentId === bredId), 600);

    expect(p0.battleArea.some((p) => p.permanentId === bredId)).toBe(true);
    expect(p0.breeding).toBeUndefined();

    const gennai = s.perm("gennai");
    const gennaiInBattle = p0.battleArea.find((p) => p.permanentId === gennai.permanentId);
    expect(gennaiInBattle?.isSuspended).toBe(true);
  });

  it("does NOT trigger when the attacker is below level 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-088", as: "gennai" }],
          breeding: { card: "AD1-004", dp: 12000, as: "bred" },
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }] }, // level 3 attacker
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;

    s.state.turnSeat = 1;
    s.state.memory = 0;

    const attacker = s.perm("attacker");
    const res = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" } satisfies AttackTarget,
    });
    expect(res).toEqual({ ok: true });

    await settle(() => false, 300);

    expect(p0.breeding).toBeDefined();
    const gennai = s.perm("gennai");
    const gennaiInBattle = p0.battleArea.find((p) => p.permanentId === gennai.permanentId);
    expect(gennaiInBattle?.isSuspended).toBe(false);
  });
});
