import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  CardKind,
  CardColor,
  GameState,
  PlayerState,
  CardInstance,
  type Seat,
} from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "../index.js";

// A3 for BT16-080 (Shroudmon) — [On Deletion] Recovery-to-3 loop.
//
// [On Deletion]: ＜Recovery +1 (Deck)＞ until you have 3 cards in your security stack.
// KB Q2667: if you have 2 or fewer security at activation, repeat Recovery +1 until
// you have 3. If you already have 3+, do nothing.
//
// FAILS-WHEN-REVERTED: the loop exits at security.length < 3. Without the while loop
// the module would fire a single Recovery +1 (raising 0 → 1) and stop — the expected
// count of 3 would not be reached.

const SHROUDMON = "BT16-080";
const FILLER = "BT1-001"; // Koromon — a valid card id present in cards.json

let seq = 0;
function instance(cardId: string, seat: Seat): CardInstance {
  seq += 1;
  const c = new CardInstance();
  c.instanceId = `inst-${seq}`;
  c.cardId = cardId;
  c.ownerSeat = seat;
  c.faceUp = true;
  return c;
}

// ── registration smoke tests ──────────────────────────────────────────────────

describe("BT16-080 Shroudmon — registration and structure", () => {
  const source: CardSource = {
    instanceId: "INST#shroudmon",
    cardId: SHROUDMON,
    ownerSeat: 0 as Seat,
    definition: {
      cardId: SHROUDMON,
      set: "BT16",
      nameEn: "Shroudmon",
      kinds: [CardKind.Digimon],
      colors: [CardColor.Black],
      playCost: 12,
      dp: 12000,
      level: 6,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: (c) => c === CardColor.Black,
  };

  it("is registered after import", () => {
    expect(getEffectModule(SHROUDMON)).toBeDefined();
  });

  it("has the correct cardId", () => {
    expect(getEffectModule(SHROUDMON)!.cardId).toBe(SHROUDMON);
  });

  it("exposes 1 effect at WhenDigivolving", () => {
    expect(getEffectModule(SHROUDMON)!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });

  it("exposes 1 effect at OnEndAttack (EndOfAttack)", () => {
    expect(getEffectModule(SHROUDMON)!.effectsForTiming(EffectTiming.OnEndAttack, source)).toHaveLength(1);
  });

  it("WhenDigivolving and OnEndAttack share the same effectKey (shared once-per-turn)", () => {
    const wdEffects = getEffectModule(SHROUDMON)!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    const eoaEffects = getEffectModule(SHROUDMON)!.effectsForTiming(EffectTiming.OnEndAttack, source);
    expect(wdEffects[0]!.effectKey).toBe(eoaEffects[0]!.effectKey);
  });

  it("exposes 1 effect at EffectTiming.None (leave prevention static)", () => {
    expect(getEffectModule(SHROUDMON)!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });

  it("exposes 1 effect at OnDestroyedAnyone (recovery loop)", () => {
    expect(getEffectModule(SHROUDMON)!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)).toHaveLength(1);
  });

  it("returns no effects at OnPlay", () => {
    expect(getEffectModule(SHROUDMON)!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });
});

// ── helpers for unit-level effect resolution ─────────────────────────────────

/**
 * A board with `deckCount` deck cards and `securityCount` security cards on seat 0 — the
 * starting point each [On Deletion] recovery-loop case perturbs. The effect itself is
 * resolved directly against a hand-built `EffectContext` below (see `makeOnDeletionCtx`),
 * not through a real intent, so only the starting `GameState` comes from the Board Spec.
 */
function makeBoard(deckCount: number, securityCount: number): { state: GameState; p0: PlayerState } {
  const s = setupEngine({
    0: {
      deck: Array.from({ length: deckCount }, () => FILLER),
      security: Array.from({ length: securityCount }, () => FILLER),
    },
  });
  return { state: s.state, p0: s.state.players[0] as PlayerState };
}

function makeSource(instanceId: string): CardSource {
  return {
    instanceId,
    cardId: SHROUDMON,
    ownerSeat: 0 as Seat,
    definition: {
      cardId: SHROUDMON,
      set: "BT16",
      nameEn: "Shroudmon",
      kinds: [CardKind.Digimon],
      colors: [CardColor.Black],
      playCost: 12,
      dp: 12000,
      level: 6,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: (c) => c === CardColor.Black,
  };
}

/**
 * Build a minimal fake EffectContext for the [On Deletion] recovery loop.
 * The fx.recoverToSecurity implementation directly mutates `state.players[0].security`
 * so assertions on p0.security.length are authoritative.
 */
function makeOnDeletionCtx(
  state: GameState,
  source: CardSource,
  deletedInstanceId: string,
  recoveryCalls: string[],
): unknown {
  const _p0 = state.players[0] as PlayerState;
  return {
    source,
    trigger: { deletedInstanceIds: [deletedInstanceId] },
    game: {
      state,
      player: (seat: Seat) => state.players[seat] as PlayerState,
      opponentOf: (seat: Seat): Seat => (seat === 0 ? 1 : 0),
      permanentById: () => undefined,
      definitionOf: () => source.definition!,
    },
    fx: {
      recoverToSecurity: async (seat: Seat, n: number): Promise<CardInstance[]> => {
        recoveryCalls.push("recoverToSecurity");
        const player = state.players[seat] as PlayerState;
        const cap = 5;
        const toMove = Math.min(n, Math.max(0, cap - player.security.length));
        const moved: CardInstance[] = [];
        for (let i = 0; i < toMove; i++) {
          const card = player.deck.shift();
          if (card === undefined) break;
          card.faceUp = false;
          player.security.unshift(card);
          moved.push(card);
        }
        return moved;
      },
    },
    ask: {
      optional: async () => true,
      chooseTargets: async (_ctx: unknown, o: { candidates: string[]; max: number }) =>
        o.candidates.slice(0, o.max),
      selectCards: async (_ctx: unknown, o: { candidates: string[]; max: number }) =>
        o.candidates.slice(0, o.max),
      chooseOption: async () => 0,
    },
  };
}

// ── A3 behavioral tests — FAILS-WHEN-REVERTED ─────────────────────────────────

describe("BT16-080 [On Deletion] Recovery-to-3 loop (FAILS-WHEN-REVERTED)", () => {
  it("with 0 security and 5 deck cards: loops 3 times to reach security=3", async () => {
    const { state, p0 } = makeBoard(5, 0);
    expect(p0.security.length).toBe(0);

    const deletedCard = instance(SHROUDMON, 0);
    const source = makeSource(deletedCard.instanceId);
    const calls: string[] = [];
    const ctx = makeOnDeletionCtx(state, source, deletedCard.instanceId, calls);

    const module = getEffectModule(SHROUDMON)!;
    const effects = module.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.canTrigger(ctx as never)).toBe(true);

    await effects[0]!.resolve(ctx as never);

    // FAILS-WHEN-REVERTED: without the while loop only 1 recovery fires (0→1, not 3).
    expect(p0.security.length).toBe(3);
    expect(calls).toHaveLength(3);
  });

  it("with 2 security and 5 deck cards: loops once to reach security=3", async () => {
    const { state, p0 } = makeBoard(5, 2);
    expect(p0.security.length).toBe(2);

    const deletedCard = instance(SHROUDMON, 0);
    const source = makeSource(deletedCard.instanceId);
    const calls: string[] = [];
    const ctx = makeOnDeletionCtx(state, source, deletedCard.instanceId, calls);

    const module = getEffectModule(SHROUDMON)!;
    const effects = module.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);

    await effects[0]!.resolve(ctx as never);

    expect(p0.security.length).toBe(3);
    expect(calls).toHaveLength(1);
  });

  it("with 3 security already: does NOT call recoverToSecurity (no-op per KB Q2667)", async () => {
    const { state, p0 } = makeBoard(3, 3);

    const deletedCard = instance(SHROUDMON, 0);
    const source = makeSource(deletedCard.instanceId);
    const calls: string[] = [];
    const ctx = makeOnDeletionCtx(state, source, deletedCard.instanceId, calls);

    const module = getEffectModule(SHROUDMON)!;
    const effects = module.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);

    await effects[0]!.resolve(ctx as never);

    expect(p0.security.length).toBe(3);
    expect(calls).toHaveLength(0);
  });

  it("stops when deck runs out even if security < 3", async () => {
    // Only 1 card in deck, starting at 0 security — can reach at most 1.
    const { state, p0 } = makeBoard(1, 0);
    expect(p0.security.length).toBe(0);

    const deletedCard = instance(SHROUDMON, 0);
    const source = makeSource(deletedCard.instanceId);
    const calls: string[] = [];
    const ctx = makeOnDeletionCtx(state, source, deletedCard.instanceId, calls);

    const module = getEffectModule(SHROUDMON)!;
    const effects = module.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);

    await effects[0]!.resolve(ctx as never);

    // Deck ran out — cannot reach 3 but shouldn't infinite-loop.
    expect(p0.security.length).toBe(1);
    // Called twice: once succeeded (moved 1), once returned [] (deck empty) → stopped.
    expect(calls).toHaveLength(2);
  });
});
