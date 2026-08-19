import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  Phase,
  EffectTiming,
  type Seat,
  type DecisionRequest,
} from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "../../engine/GameEngine.js";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { module } from "./BT10-093.js";
import "./BT10-093.js";

// A3 for BT10-093 (Yuu Amano) — the cross-permanent + scaled play-cost reducer:
//   "[Your turn][Once per turn] When you would play 1 Lv.4+ [Bagra Army] Digimon, by placing up to 3
//    purple Digimon from under your Tamers in its digivolution cards, reduce its play cost by 2 for
//    each card placed." (Errata Q2024-Q2026.)
//
// The reducer lives on this TAMER and reduces the cost of a DIFFERENT card being played, scaling by
// the placed-card count — so the self-reducer machinery (keyed on the played card's own id) cannot
// cover it. The engine implements it as a hard-gated cross-permanent BeforePayCost reducer.
//
// FAILS-WHEN-REVERTED: remove the cross-permanent reducer and the Lv.4+ [Bagra Army] play costs full
// price and gains no digivolution cards. The level/trait gate is proven by a Lv.3 [Bagra Army] play
// that the reducer must ignore (full cost, no decision, no placement).

const YUU = "BT10-093"; // the reducer Tamer
const DAMEMON = "BT10-075"; // Lv.4 [Bagra Army] Digimon, playCost 5
const CHUUCHUUMON = "BT10-073"; // Lv.3 purple [Bagra Army] Digimon (a legal under-Tamer source)
const SHOUTMON_X4B = "BT10-012"; // purple Digimon (a legal under-Tamer source)

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

interface Harness {
  engine: GameEngine;
  state: GameState;
  optionalRequests: number;
  /** Max cards the harness selects per selectCards prompt (default: all offered). */
  selectLimit: number;
}

function setup(): Harness {
  const state = new GameState();
  const harness: Harness = {
    engine: undefined as never,
    state,
    optionalRequests: 0,
    selectLimit: Number.POSITIVE_INFINITY,
  };
  let engineRef: GameEngine | undefined;
  const hooks: GameEngineHooks = {
    seed: 1,
    requestDecision: (seat, req: DecisionRequest) => {
      if (req.kind === "optional") {
        harness.optionalRequests += 1;
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "optional", accept: true },
          }),
        );
      }
      if (req.kind === "selectCards") {
        const candidates = req.options?.candidateInstanceIds ?? [];
        const cap = Math.min(req.options?.max ?? candidates.length, harness.selectLimit);
        const ids = candidates.slice(0, cap);
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "selectCards", instanceIds: ids },
          }),
        );
      }
    },
    emit: () => {},
  };
  const engine = new GameEngine(state, hooks);
  engineRef = engine;
  harness.engine = engine;
  engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });
  state.phase = Phase.Main;
  state.turnSeat = 0;
  return harness;
}

/** A BT10-093 Tamer permanent on seat 0 with `underCardIds` sitting in its digivolution stack. */
function yuuTamerWith(state: GameState, underCardIds: string[]): { tamer: Permanent; under: CardInstance[] } {
  const tamer = new Permanent();
  tamer.permanentId = `tamer-${seq++}`;
  tamer.controllerSeat = 0;
  tamer.topCard = instance(YUU, 0);
  tamer.baseDP = 0;
  tamer.currentDP = 0;
  tamer.isSuspended = false;
  const under = underCardIds.map((id) => {
    const card = instance(id, 0);
    tamer.stack.push(card);
    return card;
  });
  (state.players[0] as PlayerState).battleArea.push(tamer);
  return { tamer, under };
}

async function settle(predicate: () => boolean, maxTicks = 400): Promise<void> {
  for (let i = 0; i < maxTicks && !predicate(); i++) await Promise.resolve();
}

describe("BT10-093 cross-permanent scaled play-cost reducer", () => {
  it("placing 2 purple Digimon under the played Lv.4 [Bagra Army] cuts cost by 4 and stacks them", async () => {
    const h = setup();
    const p0 = h.state.players[0] as PlayerState;
    const { tamer, under } = yuuTamerWith(h.state, [CHUUCHUUMON, SHOUTMON_X4B]);

    const damemon = instance(DAMEMON, 0); // playCost 5
    p0.hand.push(damemon);
    h.state.memory = 5;

    const res = h.engine.applyIntent(0, { type: "playCard", instanceId: damemon.instanceId });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === DAMEMON));
    const perm = p0.battleArea.find((p) => p.topCard?.cardId === DAMEMON);
    expect(perm).toBeDefined();

    // Both purple Digimon are now this Digimon's digivolution cards...
    for (const card of under) {
      expect(perm!.stack.some((c) => c.instanceId === card.instanceId)).toBe(true);
      // ...and no longer under the Tamer.
      expect(tamer.stack.some((c) => c.instanceId === card.instanceId)).toBe(false);
    }
    // Cost 5 reduced by 2 per card placed (2 cards => -4) => pay 1, memory 5 -> 4.
    expect(h.state.memory).toBe(4);
  });

  it("ignores a Lv.3 [Bagra Army] play: no reduction, no decision, no placement (gate proof)", async () => {
    const h = setup();
    const p0 = h.state.players[0] as PlayerState;
    const { tamer } = yuuTamerWith(h.state, [SHOUTMON_X4B]);

    const chuu = instance(CHUUCHUUMON, 0); // Lv.3 [Bagra Army], playCost 4 — below the Lv.4 gate
    p0.hand.push(chuu);
    h.state.memory = 4;

    const res = h.engine.applyIntent(0, { type: "playCard", instanceId: chuu.instanceId });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === CHUUCHUUMON));
    const perm = p0.battleArea.find((p) => p.topCard?.cardId === CHUUCHUUMON);
    expect(perm).toBeDefined();

    // The reducer never engaged: no optional prompt, the under-Tamer source untouched, full cost paid.
    expect(h.optionalRequests).toBe(0);
    expect(tamer.stack.length).toBe(1);
    expect(perm!.stack.length).toBe(0);
    expect(h.state.memory).toBe(0); // 4 - 4 (full cost), no -2 reduction
  });

  it("is once per turn: the second Lv.4 [Bagra Army] play earns no reduction", async () => {
    const h = setup();
    h.selectLimit = 1; // first play places ONE card, leaving sources under the Tamer for the second
    const p0 = h.state.players[0] as PlayerState;
    const { tamer } = yuuTamerWith(h.state, [CHUUCHUUMON, SHOUTMON_X4B]);

    const first = instance(DAMEMON, 0);
    const second = instance(DAMEMON, 0);
    p0.hand.push(first, second);
    h.state.memory = 12;

    h.engine.applyIntent(0, { type: "playCard", instanceId: first.instanceId });
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.instanceId === first.instanceId));
    // First play: placed 1 (reduce 2) => cost 3, memory 12 -> 9. One source still under the Tamer.
    expect(h.state.memory).toBe(9);
    expect(tamer.stack.length).toBe(1);
    expect(h.optionalRequests).toBe(1);

    h.engine.applyIntent(0, { type: "playCard", instanceId: second.instanceId });
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.instanceId === second.instanceId));

    // Once-per-turn budget already spent: the second play is NOT prompted (even though a source
    // remains) and pays full cost 5, memory 9 -> 4. Without the per-turn gate it would prompt again
    // and reduce — so optionalRequests stays 1 and the last source is untouched.
    expect(h.optionalRequests).toBe(1);
    expect(tamer.stack.length).toBe(1);
    expect(h.state.memory).toBe(4);
  });
});

/**
 * A3 — BT10-093's OTHER clause: "[All Turns][Once Per Turn] When a purple card is placed
 * under this Tamer, Draw 1 and gain 1 memory." "[All Turns]" means this can fire on
 * EITHER player's turn, so the memory must be credited to BT10-093's own controller
 * (`source.ownerSeat`), never to whichever seat happens to be `state.turnSeat` when the
 * card is placed.
 *
 * FAILS-WHEN-REVERTED: reverting `subCtx.fx.gainMemoryForSeat(source.ownerSeat, 1)` back
 * to `subCtx.fx.gainMemory(1)` flips the memory assertions below (the OPPONENT, seat 1 —
 * who is turnSeat in this scenario — would gain the memory instead of BT10-093's owner).
 */
describe("BT10-093 [All Turns] purple-card-placed memory credits its OWNER, not turnSeat", () => {
  function primitivesOf(h: Harness): Primitives {
    return (h.engine as unknown as { primitives: Primitives }).primitives;
  }

  it("a purple card placed under this Tamer on the OPPONENT's turn still credits BT10-093's owner", async () => {
    const h = setup();
    const p0 = h.state.players[0] as PlayerState;
    const { tamer } = yuuTamerWith(h.state, []);

    // It is seat 1's (the opponent's) turn.
    h.state.turnSeat = 1;
    await h.engine.recomputeContinuousEffects(); // installs the [All Turns] watcher

    // memoryFor mirrors MemoryGauge.memoryFor: state.memory is signed relative to
    // turnSeat, so a seat's own-perspective value must be read accounting for whose
    // turn it is -- reading the raw sign of state.memory would silently pass for
    // whichever seat happens to be turnSeat, which is exactly the bug under test.
    const memoryFor = (seat: 0 | 1): number => (seat === h.state.turnSeat ? h.state.memory : -h.state.memory) || 0; // normalize -0 -> 0
    expect(memoryFor(0)).toBe(0);
    expect(memoryFor(1)).toBe(0);

    const purpleCard = instance(SHOUTMON_X4B, 0); // a purple Digimon card
    p0.hand.push(purpleCard);
    await primitivesOf(h).placeUnder(tamer.permanentId, [purpleCard.instanceId]);

    await settle(() => tamer.stack.some((c) => c.instanceId === purpleCard.instanceId));
    await settle(() => memoryFor(0) !== 0 || memoryFor(1) !== 0, 50);

    // The card actually landed under the Tamer (the SubTrigger's own condition was met).
    expect(tamer.stack.some((c) => c.instanceId === purpleCard.instanceId)).toBe(true);

    // BT10-093's controller (seat 0) gains the memory -- not seat 1, even though seat 1
    // is turnSeat when the card is placed.
    expect(memoryFor(0)).toBe(1);
    expect(memoryFor(1)).toBe(-1);
  });
});

describe("BT10-093 Security", () => {
  it("plays itself without cost from Security", () => {
    const effect = module.effectsForTiming(EffectTiming.SecuritySkill, {} as any)[0];
    expect(effect).toMatchObject({ isSecurity: true, optional: false });
  });
});
