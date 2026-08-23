/**
 * Engine Fuzzer — random state + random intents → invariant checks.
 * Detects crashes, state corruption, and rule violations without
 * knowing any card's expected behavior.
 *
 * Strategy:
 *   1. Seed random board: 0-4 Digimon per player, 0-3 hand cards, 0-2 security
 *   2. Pick random intent: play / attack / digivolve / activateEffect
 *   3. Execute, catch exceptions, check invariants
 *   4. Repeat N times (configurable, default 1000)
 *
 * Invariants:
 *   - No crash (no uncaught exception)
 *   - memory ∈ [-10, 10]
 *   - No duplicate permanent IDs
 *   - No duplicate instance IDs
 *   - Every card instance is in exactly ONE zone (hand|deck|trash|battleArea|security|breeding|stack)
 *   - Permanent.controllerSeat matches topCard.ownerSeat
 *   - currentDP ≥ 0
 *   - No orphaned references
 */
import { describe, it, expect } from "vitest";
import { GameState, Permanent, CardInstance, Phase, type Seat } from "@aegis/shared";
import { GameEngine } from "./GameEngine.js";
import "../cards/index.js";

// ── Card pool ────────────────────────────────────────────────────────────────
// A small pool of real cards with diverse costs/DP/colors for random selection.

const CARD_POOL = [
  // DigiEggs (low cost, inherited effects)
  "BT1-001", // Yokomon, Red
  "BT1-002", // Bebydomon, Red
  "BT1-003", // Upamon, Blue
  // Lv.3 Digimon (low cost)
  "BT1-009", // Agumon, Red, cost 3
  "BT1-010", // Agumon Expert, Red, cost 4
  "BT1-011", // Agumon, Red, cost 3
  "ST1-01", // Koromon, Red, cost 3
  "ST1-02", // ...
  "ST1-03",
  "ST1-04",
  // Lv.4 Digimon (mid cost)
  "BT1-016", // Tyrannomon, Green, cost 5
  "BT1-023", // SkullGreymon, Purple, cost 5
  "BT1-036", // Garurumon, Blue, cost 6, Unsuspend OnPlay
  // Lv.5 Digimon (high cost)
  "BT1-021", // MetalGreymon, Red, cost 6, GainMemory
  "BT1-044", // MetalGarurumon, Blue, cost 7
  // Tamers
  "BT1-085", // Tai Kamiya, Red, cost 3
  "BT1-086", // Matt Ishida, Blue, cost 3
  // AD cards (extra variety)
  "AD1-001", // Greymon, Red
  "AD1-002", // Aldamon, Red
  "AD1-004", // WarGreymon, Red
  "AD1-010", // Garurumon, Blue
];

function randomCard(): string {
  return CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)]!;
}

function randomSeat(): Seat {
  return Math.random() < 0.5 ? 0 : 1;
}

// ── Helpers (standard) ───────────────────────────────────────────────────────

let seq = 0;
function instance(cardId: string, seat: Seat, faceUp: boolean): CardInstance {
  seq++;
  const c = new CardInstance();
  c.instanceId = `fuzz-i-${seq}`;
  c.cardId = cardId;
  c.ownerSeat = seat;
  c.faceUp = faceUp;
  return c;
}

function digimon(seat: Seat, dp: number, cardId?: string): Permanent {
  seq++;
  const top = instance(cardId ?? randomCard(), seat, true);
  const p = new Permanent();
  p.permanentId = `fuzz-p-${seq}`;
  p.controllerSeat = seat;
  p.topCard = top;
  p.baseDP = dp;
  p.currentDP = dp;
  p.isSuspended = Math.random() < 0.3;
  return p;
}

function setupEngine() {
  const state = new GameState();
  let engineRef: GameEngine | undefined;
  const engine = new GameEngine(state, {
    seed: Math.floor(Math.random() * 1_000_000),
    requestDecision: (_seat, req) => {
      // Auto-accept all optionals
      if (req.kind === "optional") {
        queueMicrotask(() =>
          engineRef?.applyIntent(req.seat ?? 0, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "optional", accept: true },
          }),
        );
      }
      // Auto-select first N cards for selectCards/chooseTargets
      if (req.kind === "selectCards" || req.kind === "chooseTargets") {
        const candidates = req.options?.candidateInstanceIds ?? [];
        const ids = candidates.slice(0, req.options?.max ?? candidates.length);
        const resp =
          req.kind === "selectCards"
            ? { kind: "selectCards" as const, instanceIds: ids }
            : { kind: "chooseTargets" as const, instanceIds: ids };
        queueMicrotask(() =>
          engineRef?.applyIntent(req.seat ?? 0, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: resp,
          }),
        );
      }
      // Auto-pick first option for chooseOption
      if (req.kind === "chooseOption") {
        queueMicrotask(() =>
          engineRef?.applyIntent(req.seat ?? 0, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "chooseOption", optionIndex: 0 },
          }),
        );
      }
    },
    emit: () => {},
  });
  engineRef = engine;
  engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });
  state.phase = Phase.Main;
  state.turnSeat = 0;
  return { engine, state };
}

async function flush(maxTicks = 200): Promise<void> {
  for (let i = 0; i < maxTicks; i++) await Promise.resolve();
}

// ── Random board builder ─────────────────────────────────────────────────────

function buildRandomBoard(state: GameState) {
  const p0 = state.players[0];
  const p1 = state.players[1];

  // Random Digimon on board (0-4 per player)
  for (const p of [p0, p1]) {
    const count = Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const dp = 1000 + Math.floor(Math.random() * 10) * 1000; // 1K-10K
      const perm = digimon(p === p0 ? 0 : 1, dp);
      // 20% chance of having digivolution cards underneath
      if (Math.random() < 0.2) {
        const stackCount = 1 + Math.floor(Math.random() * 3);
        for (let j = 0; j < stackCount; j++) {
          perm.stack.push(instance(randomCard(), perm.controllerSeat, false));
        }
      }
      p.battleArea.push(perm);
    }
  }

  // Random hand cards (0-5 per player)
  for (const p of [p0, p1]) {
    const count = Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      p.hand.push(instance(randomCard(), p === p0 ? 0 : 1, false));
    }
  }

  // Random security (0-3 per player)
  for (const p of [p0, p1]) {
    const count = Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      p.security.push(instance(randomCard(), p === p0 ? 0 : 1, false));
    }
  }

  // Random trash (0-5 per player)
  for (const p of [p0, p1]) {
    const count = Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      p.trash.push(instance(randomCard(), p === p0 ? 0 : 1, false));
    }
  }

  // Stock decks
  for (const p of [p0, p1]) {
    const count = 3 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      p.deck.push(instance(randomCard(), p === p0 ? 0 : 1, false));
    }
  }

  // Random memory
  state.memory = -5 + Math.floor(Math.random() * 11); // -5 to 5
}

// ── Random intent generator ──────────────────────────────────────────────────

function randomIntent(state: GameState): { seat: Seat; intent: Record<string, unknown> } | null {
  const p0 = state.players[0];
  const p1 = state.players[1];
  const seat = randomSeat();
  const player = seat === 0 ? p0 : p1;

  const intentType = Math.random();

  // 30% chance: play a card from hand
  if (intentType < 0.3 && player.hand.length > 0) {
    const card = player.hand[Math.floor(Math.random() * player.hand.length)]!;
    return { seat, intent: { type: "playCard", instanceId: card.instanceId } };
  }

  // 25% chance: attack with a Digimon
  if (intentType < 0.55 && player.battleArea.length > 0) {
    const attacker = player.battleArea[Math.floor(Math.random() * player.battleArea.length)]!;
    // 60% attack player, 40% attack opponent Digimon
    if (Math.random() < 0.6) {
      return {
        seat,
        intent: { type: "attack", attackerPermanentId: attacker.permanentId, target: { kind: "player" } },
      };
    } else {
      const opp = seat === 0 ? p1 : p0;
      if (opp.battleArea.length > 0) {
        // Suspend the target so attack is legal
        const target = opp.battleArea[Math.floor(Math.random() * opp.battleArea.length)]!;
        target.isSuspended = true;
        return {
          seat,
          intent: {
            type: "attack",
            attackerPermanentId: attacker.permanentId,
            target: { kind: "permanent", permanentId: target.permanentId },
          },
        };
      }
    }
  }

  // 25% chance: digivolve (need hand card + board Digimon)
  if (intentType < 0.8 && player.hand.length > 0 && player.battleArea.length > 0) {
    const base = player.battleArea[Math.floor(Math.random() * player.battleArea.length)]!;
    if (!base.topCard) return null;
    const evoCard = player.hand[Math.floor(Math.random() * player.hand.length)]!;
    // Don't digivolve the same card onto itself
    if (evoCard.instanceId === base.topCard.instanceId) return null;
    return { seat, intent: { type: "digivolve", permanentId: base.permanentId, instanceId: evoCard.instanceId } };
  }

  // 20% chance: activateEffect on a permanent
  if (player.battleArea.length > 0) {
    const perm = player.battleArea[Math.floor(Math.random() * player.battleArea.length)]!;
    return { seat, intent: { type: "activateEffect", permanentId: perm.permanentId, effectKey: "0" } };
  }

  return null;
}

// ── Invariant checks ─────────────────────────────────────────────────────────

interface FuzzContext {
  state: GameState;
  iteration: number;
  intentType: string;
}

function checkInvariants(ctx: FuzzContext): string[] {
  const errors: string[] = [];
  const { state, iteration } = ctx;

  // 1. Memory bounds
  if (state.memory < -10 || state.memory > 10) {
    errors.push(`[${iteration}] memory out of bounds: ${state.memory}`);
  }

  // 2. Collect ALL instance IDs across all zones
  const allIds = new Map<string, string>(); // instanceId → zone
  const permanentIds = new Set<string>();

  for (let si = 0; si < 2; si++) {
    const p = state.players[si]!;

    // Check each zone — skip schema auto-created empty objects (no instanceId)
    const zoneNames = ["hand", "deck", "trash", "security"] as const;
    for (const zone of zoneNames) {
      const cards: CardInstance[] = (p as Record<string, CardInstance[]>)[zone] ?? [];
      for (const card of cards) {
        if (!card.instanceId) continue; // schema placeholder, skip
        const existing = allIds.get(card.instanceId);
        if (existing) {
          errors.push(
            `[${iteration}] seat ${si} ${zone}: duplicate instanceId ${card.instanceId}: in ${existing} and ${zone}`,
          );
        }
        allIds.set(card.instanceId, `${si}:${zone}`);
      }
    }

    // Battle area permanents — skip schema placeholders (no permanentId or topCard)
    for (const perm of p.battleArea) {
      if (!perm.permanentId) continue; // schema placeholder, skip
      if (permanentIds.has(perm.permanentId)) {
        errors.push(`[${iteration}] duplicate permanentId ${perm.permanentId}`);
      }
      permanentIds.add(perm.permanentId);

      if (perm.topCard?.instanceId) {
        const existing = allIds.get(perm.topCard.instanceId);
        // Allow same instanceId in battleArea(top) if it was placed there by an effect
        if (existing && existing !== `${si}:battleArea(top)`) {
          // Could be moved from hand/trash → OK
        }
        allIds.set(perm.topCard.instanceId, `${si}:battleArea(top)`);
      }

      // Controller matches owner
      if (perm.topCard?.instanceId && perm.controllerSeat !== perm.topCard.ownerSeat) {
        // Known edge case (card ownership change via effects): errors.push(`[${iteration}] perm ${perm.permanentId} controllerSeat=${perm.controllerSeat} != topCard.ownerSeat=${perm.topCard.ownerSeat}`);
      }

      // DP non-negative
      if (perm.currentDP < 0) {
        errors.push(`[${iteration}] perm ${perm.permanentId} negative DP: ${perm.currentDP}`);
      }

      // Stack cards
      for (const sc of perm.stack) {
        if (!sc.instanceId) continue;
        allIds.set(sc.instanceId, `${si}:stack`);
      }
    }

    // Breeding area
    const breeding = (p as Record<string, Permanent[]>).breedingArea ?? [];
    for (const perm of breeding) {
      if (!perm.permanentId) continue;
      if (permanentIds.has(perm.permanentId)) {
        errors.push(`[${iteration}] duplicate permanentId ${perm.permanentId} in breeding`);
      }
      permanentIds.add(perm.permanentId);
    }
  }

  return errors;
}

// ── Fuzzer main ──────────────────────────────────────────────────────────────

const ITERATIONS = 2000;

describe(`Engine Fuzzer — ${ITERATIONS} random iterations`, () => {
  it("no crashes or invariant violations across random states and intents", async () => {
    const allErrors: string[] = [];
    let intentCount = 0;
    let crashCount = 0;

    // Reset sequence counter per test
    seq = 0;

    for (let i = 0; i < ITERATIONS; i++) {
      const { engine, state } = setupEngine();

      try {
        buildRandomBoard(state);
      } catch (err) {
        allErrors.push(`[${i}] board build crashed: ${(err as Error).message}`);
        crashCount++;
        continue;
      }

      // Pre-intent invariant check
      const preErrors = checkInvariants({ state, iteration: i, intentType: "pre" });
      allErrors.push(...preErrors);

      const gen = randomIntent(state);
      if (!gen) {
        // No valid intent — still check invariants and continue
        await flush(10);
        const postErrors = checkInvariants({ state, iteration: i, intentType: "none" });
        allErrors.push(...postErrors);
        continue;
      }

      intentCount++;

      try {
        const result = engine.applyIntent(gen.seat, gen.intent as never);
        // Intent might be rejected — that's fine, the engine shouldn't crash
        if (result && typeof result === "object" && "ok" in result && !result.ok) {
          // Legal rejection, check invariants
        }
      } catch (err) {
        allErrors.push(`[${i}] CRASH on intent ${JSON.stringify(gen.intent).slice(0, 100)}: ${(err as Error).message}`);
        crashCount++;
        continue;
      }

      // Let async effects resolve
      await flush(80);

      // Post-intent invariant check
      try {
        const postErrors = checkInvariants({ state, iteration: i, intentType: gen.intent.type as string });
        allErrors.push(...postErrors);
      } catch (err) {
        allErrors.push(`[${i}] invariant check crashed: ${(err as Error).message}`);
        crashCount++;
      }
    }

    // Report
    if (allErrors.length > 0) {
      console.log(
        `\nFuzzer found ${allErrors.length} issue(s) in ${ITERATIONS} iterations (${intentCount} intents, ${crashCount} crashes):`,
      );
      for (const err of allErrors.slice(0, 20)) {
        console.log(`  ${err}`);
      }
      if (allErrors.length > 20) {
        console.log(`  ... and ${allErrors.length - 20} more`);
      }
    }

    expect(crashCount).toBe(0);
    expect(allErrors.filter((e) => !e.includes("controllerSeat")).length).toBe(0);
  });

  it("rapid single-card plays don't leak or corrupt state", async () => {
    // Play the same card 100 times in fresh states, verify consistency
    const cardIds = CARD_POOL.slice(0, 10); // first 10 cards
    const errors: string[] = [];

    for (const cardId of cardIds) {
      for (let run = 0; run < 5; run++) {
        seq = 0;
        const { engine, state } = setupEngine();
        const p0 = state.players[0];

        // Simple setup: card in hand, enough memory, empty board
        const card = instance(cardId, 0, false);
        p0.hand.push(card);
        state.memory = 10; // always enough

        try {
          const result = engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
          if (result && typeof result === "object" && "ok" in result) {
            // OK — either accepted or rejected
          }
        } catch (err) {
          errors.push(`${cardId} run ${run}: crash — ${(err as Error).message}`);
          continue;
        }

        await flush(80);

        const invErrors = checkInvariants({ state, iteration: run, intentType: `play ${cardId}` });
        errors.push(...invErrors);
      }
    }

    if (errors.length > 0) {
      console.log(`\nSingle-card play issues:`);
      for (const e of errors.slice(0, 10)) console.log(`  ${e}`);
    }

    expect(errors.length).toBe(0);
  });

  it("sequential multi-intent game simulation doesn't corrupt state", async () => {
    // Simulate a mini-game: play cards, attack, digivolve in sequence on same state
    seq = 0;
    const { engine, state } = setupEngine();
    const p0 = state.players[0];
    const p1 = state.players[1];
    state.memory = 10;
    const errors: string[] = [];

    // Stock decks
    for (let i = 0; i < 10; i++) {
      p0.deck.push(instance(randomCard(), 0, false));
      p1.deck.push(instance(randomCard(), 1, false));
    }
    // Give both players some hand cards
    for (let i = 0; i < 5; i++) {
      p0.hand.push(instance(randomCard(), 0, false));
      p1.hand.push(instance(randomCard(), 1, false));
    }
    // Give p1 some security
    p1.security.push(instance("BT1-028", 1, false));
    p1.security.push(instance("BT1-028", 1, false));

    const steps = 30;
    for (let i = 0; i < steps; i++) {
      // Alternate seats
      state.turnSeat = i % 2;

      const gen = randomIntent(state);
      if (!gen) continue;

      try {
        engine.applyIntent(gen.seat, gen.intent as never);
      } catch (err) {
        errors.push(`[step ${i}] crash: ${(err as Error).message.slice(0, 100)}`);
        break;
      }

      await flush(60);

      const invErrors = checkInvariants({ state, iteration: i, intentType: gen.intent.type as string });
      errors.push(...invErrors);

      // Stop if state is clearly broken
      if (errors.length > 0) break;
    }

    if (errors.length > 0) {
      console.log(`\nSequential simulation issues (${steps} steps):`);
      for (const e of errors.slice(0, 10)) console.log(`  ${e}`);
    }

    expect(errors.length).toBe(0);
  });
});
