import { describe, it, expect } from "vitest";
import {
  CardInstance,
  CardKind,
  GameState,
  Permanent,
  Phase,
  PlayerState,
  type DigivolutionRequirement,
  type Seat,
} from "@aegis/shared";
import { MemoryGauge } from "../../engine/MemoryGauge.js";
import {
  applyDigivolve,
  memoryDepsFromGauge,
  validateDigivolve,
  type DigivolveDeps,
  type DigivolveIntent,
} from "../../engine/actions/digivolve.js";
import { cardHasTrait, definitionOf, matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import "./BT7-112.js"; // side-effect: registers the alternate digivolution requirement

// BT7-112 (Susanoomon) alternate digivolution path:
//   "You may digivolve this card from your hand onto one of your Tamers as if the Tamer is
//    a level 6 Digimon by placing 10 Tamer cards and/or cards with [Hybrid] in their traits
//    from your hand and/or trash at the bottom of your deck in any order."
//
// Real fixtures from cards.json:
//   BT7-112  Susanoomon — White Lv.6 Digimon (the evolving card)
//   BT7-089  — a Tamer (legal alternate base; also placement material via kind Tamer)
//   AD1-002  Aldamon — Digimon with the [Hybrid] trait (placement material via trait)
//   AD1-001  Greymon — a plain Digimon (NOT a legal alternate base; NOT placement material)
const SUSANOOMON = "BT7-112";
const TAMER = "BT7-089";
const HYBRID = "AD1-002";
const PLAIN_DIGIMON = "AD1-001";
const ALT_COST = 7;
const PLACEMENT_COUNT = 10;

let counter = 0;
function instance(cardId: string, ownerSeat: Seat): CardInstance {
  const ci = new CardInstance();
  ci.instanceId = `i${counter++}`;
  ci.cardId = cardId;
  ci.ownerSeat = ownerSeat;
  ci.faceUp = true;
  return ci;
}

function permanentOf(top: CardInstance, seat: Seat): Permanent {
  const p = new Permanent();
  p.permanentId = `p${counter++}`;
  p.controllerSeat = seat;
  p.topCard = top;
  p.baseDP = 0;
  p.currentDP = 0;
  p.isSuspended = false;
  return p;
}

/** seat 0 = turn player, Main phase; a Tamer base permanent; BT7-112 in hand; a deck for the +1 draw. */
function makeState(opts: { handMaterial?: string[]; trashMaterial?: string[]; memory?: number }): {
  state: GameState;
  gauge: MemoryGauge;
  permanent: Permanent;
  evolver: CardInstance;
} {
  const state = new GameState();
  state.phase = Phase.Main;
  state.turnSeat = 0;
  state.memory = opts.memory ?? 10;

  const p0 = new PlayerState();
  p0.seat = 0;
  const p1 = new PlayerState();
  p1.seat = 1;
  state.players.push(p0, p1);

  const baseTop = instance(TAMER, 0);
  const permanent = permanentOf(baseTop, 0);
  p0.battleArea.push(permanent);

  const evolver = instance(SUSANOOMON, 0);
  p0.hand.push(evolver);

  for (const cardId of opts.handMaterial ?? []) p0.hand.push(instance(cardId, 0));
  for (const cardId of opts.trashMaterial ?? []) p0.trash.push(instance(cardId, 0));

  p0.deck.push(instance(PLAIN_DIGIMON, 0));

  return { state, gauge: new MemoryGauge(state), permanent, evolver };
}

/**
 * The placement-cost matcher + payer, mirroring GameEngine.placementCostCards /
 * payAlternatePlacement minus the interactive card selection (the real engine prompts the
 * player for WHICH cards to place and their bottom-deck order — KB Q1691; this deterministic
 * stand-in is its timeout fallback).
 */
function placementDeps(): Pick<DigivolveDeps, "alternatePlacementPayable" | "payAlternatePlacement"> {
  const matching = (state: GameState, seat: Seat, req: DigivolutionRequirement): CardInstance[] => {
    const spec = req.placementCost;
    if (spec === undefined) return [];
    const player = state.players[seat]!;
    const wantedKinds = (spec.kinds ?? []).map((k) => CardKind[k]);
    const matches = (cardId: string): boolean => {
      const def = definitionOf(cardId);
      if (wantedKinds.some((k) => def.kinds.includes(k))) return true;
      return (spec.traits ?? []).some((t) => cardHasTrait(def, t));
    };
    const out: CardInstance[] = [];
    for (const zone of spec.from) {
      const cards = zone === "hand" ? player.hand : player.trash;
      for (const c of cards) if (matches(c.cardId)) out.push(c);
    }
    return out;
  };
  return {
    alternatePlacementPayable: (state, seat, req) =>
      matching(state, seat, req).length >= (req.placementCost?.count ?? 0),
    payAlternatePlacement: async (state, seat, req) => {
      const need = req.placementCost?.count ?? 0;
      const cards = matching(state, seat, req);
      if (cards.length < need) return false;
      const ids = new Set(cards.slice(0, need).map((c) => c.instanceId));
      const player = state.players[seat]!;
      const pulled: CardInstance[] = [];
      for (const zone of ["hand", "trash"] as const) {
        const arr = zone === "hand" ? player.hand : player.trash;
        for (let i = arr.length - 1; i >= 0; i--) {
          if (ids.has(arr[i]!.instanceId)) pulled.push(arr.splice(i, 1)[0]!);
        }
      }
      for (const card of pulled) player.deck.push(card); // deck bottom
      return true;
    },
  };
}

function deps(gauge: MemoryGauge): DigivolveDeps & { fired: Permanent[] } {
  const mem = memoryDepsFromGauge(gauge);
  const fired: Permanent[] = [];
  return {
    maxAffordable: mem.maxAffordable,
    payMemory: mem.payMemory,
    draw: async (state, seat, n) => {
      const player = state.players[seat]!;
      const out: CardInstance[] = [];
      for (let i = 0; i < n; i++) {
        const top = player.deck.shift();
        if (!top) break;
        player.hand.push(top);
        out.push(top);
      }
      return out;
    },
    fireWhenDigivolving: async (_state, _seat, permanent) => {
      fired.push(permanent);
    },
    fired,
    ...placementDeps(),
  };
}

const intent = (permanentId: string, instanceId: string): DigivolveIntent => ({
  type: "digivolve",
  permanentId,
  instanceId,
});

describe("BT7-112 alternate digivolution requirement (cardData)", () => {
  it("matches a Tamer base for cost 7", () => {
    const req = matchingAlternateDigivolutionRequirement(SUSANOOMON, TAMER);
    expect(req).toBeDefined();
    expect(req!.cost).toBe(ALT_COST);
    expect(req!.baseIsTamer).toBe(true);
    expect(req!.placementCost?.count).toBe(PLACEMENT_COUNT);
  });

  it("does NOT match a non-Tamer (Digimon) base", () => {
    // The gateless generated requirement is replaced by the Tamer-gated override, so a
    // Digimon base no longer matches the alternate path.
    expect(matchingAlternateDigivolutionRequirement(SUSANOOMON, PLAIN_DIGIMON)).toBeUndefined();
  });
});

describe("BT7-112 alternate digivolution onto a Tamer (digivolve action)", () => {
  it("rejects when fewer than 10 [Hybrid]/Tamer cards are available to place", () => {
    const { state, gauge, permanent, evolver } = makeState({
      handMaterial: Array(5).fill(HYBRID),
      trashMaterial: Array(4).fill(TAMER), // 9 total < 10
    });
    const check = validateDigivolve(state, 0, intent(permanent.permanentId, evolver.instanceId), deps(gauge));
    expect(check).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("does not count non-matching cards toward the placement cost", () => {
    const { state, gauge, permanent, evolver } = makeState({
      handMaterial: Array(9).fill(HYBRID).concat(Array(5).fill(PLAIN_DIGIMON)), // 9 matching + 5 noise
    });
    const check = validateDigivolve(state, 0, intent(permanent.permanentId, evolver.instanceId), deps(gauge));
    expect(check).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("accepts when 10 matching cards are available, using the alternate cost (7)", () => {
    const { state, gauge, permanent, evolver } = makeState({
      handMaterial: Array(6).fill(HYBRID),
      trashMaterial: Array(4).fill(TAMER), // 10 total
    });
    const check = validateDigivolve(state, 0, intent(permanent.permanentId, evolver.instanceId), deps(gauge));
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(check.usedAlternate).toBe(true);
      expect(check.cost).toBe(ALT_COST);
      expect(check.evoCost).toBeUndefined();
    }
  });

  it("pays the placement cost (10 cards to deck bottom) and digivolves onto the Tamer", async () => {
    const { state, gauge, permanent, evolver } = makeState({
      handMaterial: Array(6).fill(HYBRID),
      trashMaterial: Array(4).fill(TAMER),
      memory: 10,
    });
    const player = state.players[0]!;
    const deckBefore = player.deck.length;
    const handMatchingBefore = player.hand.filter((c) => c.cardId === HYBRID).length;
    expect(handMatchingBefore).toBe(6);

    const result = await applyDigivolve(state, 0, intent(permanent.permanentId, evolver.instanceId), deps(gauge));
    expect(result.ok).toBe(true);

    // The Tamer permanent is now topped by Susanoomon (the evolving card stacked on).
    expect(permanent.topCard!.cardId).toBe(SUSANOOMON);
    expect(permanent.stack.some((c) => c.cardId === TAMER)).toBe(true);

    // 10 placement cards left hand+trash; the deck grew by 10 (bottom) minus the 1 drawn on
    // digivolve. Net deck delta: +10 placed - 1 drawn = +9.
    expect(player.deck.length).toBe(deckBefore + PLACEMENT_COUNT - 1);
    expect(player.hand.filter((c) => c.cardId === HYBRID).length).toBe(0);
    expect(player.trash.filter((c) => c.cardId === TAMER).length).toBe(0);
  });
});
